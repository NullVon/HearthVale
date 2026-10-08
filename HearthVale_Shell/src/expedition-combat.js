import { byId } from '../../HearthVale_Content/expedition.js';
import { weighted } from './expedition-generation.js';
import { hasTrait, applyPoison, rollDodge, hitQuality } from './expedition-checks.js';
import { definitionOf, resources, wear, paySpell } from './expedition-equipment.js';
import { derivedActorValues } from './surface-candidates.js';
import { witnessHound } from './information.js';
import { canCastCombatScroll,scrollSpell,applyScrollEffects } from './scroll-magic.js';
import { migrateSpellStrain,resolveSpellPressure } from './magic-pressure.js';
import { explorationSpell } from './expedition-rooms.js';

const offensive = move => move.damage > 0 || move.impact > 0 || move.onHit.length > 0;
// Old free Force Scroll saves retained an Attack phase after cancellation.
// That remaining attack is the single Advantage choice; do not award it twice.
export const combatPhase = combat => combat.phase === 'attack' && combat.moveCancelled ? 'advantage'
  : combat.phase === 'incoming' && combat.skippedAttack ? 'attack' : combat.phase;
export const immediateAction = combat => ['advantage', 'counterattack'].includes(combatPhase(combat));
export const enemyKnockedDown = combat => !!combat.enemyKnockdown || combat.committed.id === 'move_recover' && !combat.legacyRecoveryMapped;
export const playerKnockedDown = combat => !!combat.playerKnockdown || !!combat.skippedAttack;
// Map old turn-denial saves only at an authorized action, never during load.
export function resumeCombat(combat) {
  migrateSpellStrain(combat);
  const phase = combatPhase(combat);
  combat.enemyKnockdown = enemyKnockedDown(combat);
  if (combat.committed.id === 'move_recover') combat.legacyRecoveryMapped = true;
  combat.playerKnockdown = playerKnockedDown(combat);
  if (combat.skippedAttack) delete combat.skippedAttack;
  combat.phase = phase;
}
// Legacy commitments keep their damage/effects; range metadata is ignored. Only absent Phase 2
// metadata comes from their stable authored move identity; loading uses no RNG.
export function combatMove(move) {
  const authored = byId('moves', move.id);
  return { ...move, label: move.id === 'move_close' ? 'Legacy nonoffensive commitment' : authored?.label ?? move.label, speed: move.speed ?? authored?.speed ?? 0,
    qualityStat: move.qualityStat ?? authored?.qualityStat ?? 'STR' };
}

export function canAttackWith(actor, combat, item) {
  const weapon = definitionOf(item);
  return weapon?.category === 'weapon' && (!weapon.maxDurability || item.durability === undefined || item.durability > 0)
    && (!weapon.ammo || resources(actor).arrows > 0);
}

export function prepareRound(ctx, rng) {
  const combat = ctx.expedition.combat, definition = byId('enemies', combat.enemy.templateId);
  // Barrier waits for an offensive resolution, even across cancelled rounds.
  combat.moveCancelled = false;
  const selected = weighted(definition.moves.entries, rng);
  const move = byId('moves', selected.target);
  combat.committed = { ...structuredClone(move), offensive: offensive(move), damageType: move.damageType ?? 'physical' };
  combat.phase = 'attack';
}

export function startCombat(ctx, enemyId, kind, rng) {
  const definition = byId('enemies', enemyId), expedition = ctx.expedition;
  expedition.combat = { enemy: { id: `${expedition.id}_enemy_${expedition.nextEnemyInstance++}`, templateId: enemyId, hp: definition.hp },
    kind, round: 1, phase: 'attack', committed: null, barrier: 0,
    enemyKnockdown: false, playerKnockdown: false, lastMove: null };
  if (!definition.subjective) {
    ctx.pit.knownEnemies ??= [];
    witnessHound(ctx, enemyId);
    if (!ctx.pit.knownEnemies.includes(enemyId)) ctx.pit.knownEnemies.push(enemyId);
  }
  prepareRound(ctx, rng);
  expedition.lastResult = { text: `${definition.label} prepares ${expedition.combat.committed.label}.` };
}

export function interruptMove(combat, impact, followup = false) {
  if (impact <= 0 || !combat.committed.offensive || impact < combat.committed.stability) return null;
  const knockdown = impact >= combat.committed.stability + 2;
  combat.enemyKnockdown ||= knockdown;
  // A follow-up cannot cancel an already resolved action or earn another attack.
  if (followup) return knockdown ? 'Knockdown' : null;
  combat.moveCancelled = true;
  combat.phase = 'advantage';
  combat.interrupt = knockdown ? 'Knockdown' : 'Stagger';
  return knockdown ? 'Knockdown' : 'Stagger';
}

function afterAttack(ctx, result, free = false, followup = false) {
  const combat = ctx.expedition.combat;
  const incoming = combat.counterIncoming;
  delete combat.counterIncoming;
  if (combat.enemy.hp <= 0) ctx.victory = true;
  else if (followup) {
    combat.phase = 'round-result';
    combat.lastMove = combat.moveCancelled ? `${combat.committed.label} (cancelled)` : combat.lastMove;
    ctx.roundCompleted = true;
  } else combat.phase = combat.moveCancelled ? 'advantage' : free ? 'attack' : 'incoming';
  ctx.expedition.lastResult = incoming ? { ...incoming, retaliation: result, text: `${incoming.text} Counterattack — ${result.text}` } : result;
}

export function attackWeapon(ctx, slot, rng, retaliation = false) {
  const combat = ctx.expedition.combat, actor = ctx.actor, item = actor.data.inventory.equipped[slot];
  const weapon = definitionOf(item), enemy = byId('enemies', combat.enemy.templateId);
  const followup = retaliation || immediateAction(combat);
  const dodge = rollDodge(enemy.combatStats.DEX, actor.data.attributes.baseStats.DEX, weapon.speed, rng, enemyKnockedDown(combat));
  combat.enemyKnockdown = false;
  const quality = dodge.success ? null : hitQuality(weapon.qualityStat, actor.data.attributes.baseStats[weapon.qualityStat], weapon.damage, rng);
  const bow = !!weapon.ammo;
  if (bow) resources(actor).arrows--;
  const damage = quality ? Math.max(0, quality.rawDamage - enemy.defense) : 0;
  const impact = quality ? weapon.impact + (!bow && hasTrait(actor, 'heavy_handed') ? 1 : 0) : 0;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
  const wearResult = bow ? null : quality ? wear(actor, slot, 1 + Number(hasTrait(actor, 'heavy_handed')), rng) : null;
  const interrupt = quality ? interruptMove(combat, impact, followup) : null;
  afterAttack(ctx, { text: `${weapon.label}: ${quality ? `${quality.quality}, ${damage} damage` : 'Dodged'}${interrupt ? followup ? '; Knockdown: next offensive action faces 0% Dodge' : `; ${interrupt} cancels ${combat.committed.label}` : ''}.`,
    quality, dodge, damage, impact, interrupt, wear: wearResult }, false, followup);
}

// Preserve Phase 1's Defense bypass: even a Critical 1-base-damage punch
// otherwise cannot hurt Defense 2 enemies in a weaponless Return Encounter.
export function attackUnarmed(ctx, rng, retaliation = false) {
  const combat = ctx.expedition.combat;
  const followup = retaliation || immediateAction(combat);
  const enemy = byId('enemies', combat.enemy.templateId), stats = ctx.actor.data.attributes.baseStats;
  const dodge = rollDodge(enemy.combatStats.DEX, stats.DEX, 0, rng, enemyKnockedDown(combat));
  combat.enemyKnockdown = false;
  const quality = dodge.success ? null : hitQuality('STR', stats.STR, 1, rng);
  const damage = quality?.rawDamage ?? 0;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
  afterAttack(ctx, { text: `Bare Hands: ${quality ? `${quality.quality}, ${damage} damage` : 'Dodged'}.`, quality, dodge, damage, impact: 0 }, false, followup);
}

export function castCombatSpell(ctx, spellId, rng, scrollSlot = null) {
  if(scrollSlot!==null)return castCombatScroll(ctx,'equipped',scrollSlot,rng);
  // Reuse extraction's effect -> Overcast -> return ordering in both contexts.
  if(spellId==='spell_teleport')return explorationSpell(ctx,spellId,rng);
  const spell = byId('spells', spellId), combat = ctx.expedition.combat, actor = ctx.actor;
  const followup = immediateAction(combat);
  const cost = paySpell(actor, ctx.expedition, spell);
  let damage = 0, impact = 0, interrupt = null;
  if (spell.target === 'enemy') {
    // Phase 5 default: ordinary magic connects automatically. Legacy accuracy
    // metadata is not an authored exception and must never invoke weapon rolls.
    combat.enemyKnockdown = false;
    damage = spell.effects.find(e => e.tag === 'effect_damage')?.value ?? 0;
    impact = spell.effects.find(e => e.tag === 'effect_impact')?.value ?? 0;
    combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
    interrupt = interruptMove(combat, impact, followup);
  } else if (spell.id === 'spell_heal') resources(actor).hp = Math.min(derivedActorValues(actor).maxHp, resources(actor).hp + 8);
  else if (spell.id === 'spell_barrier') combat.barrier = 3;
  const pressure=resolveSpellPressure(actor,ctx.expedition,rng);
  afterAttack(ctx, { text: `${spell.label}: ${spell.target === 'enemy' ? `${damage} damage; ${impact} Impact — automatic hit` : 'applied'}${interrupt ? followup ? '; Knockdown: next offensive action faces 0% Dodge' : `; ${interrupt} cancels ${combat.committed.label}` : ''}. ${pressure.text}`,
    check: null, overcast:pressure.check, damage, impact, interrupt, cost }, false, followup && spell.target === 'enemy');
}

export function castCombatScroll(ctx,container,slot,rng) {
  const actor=ctx.actor,combat=ctx.expedition.combat;
  const item=['bag','equipped'].includes(container)?actor.data.inventory[container][slot]:null;
  if(!canCastCombatScroll(actor,combat,item,combat&&combatPhase(combat)))throw new Error('Scroll is unavailable');
  if(scrollSpell(item).id==='spell_teleport')return explorationSpell(ctx,'spell_teleport',rng,slot,container);
  const spell=scrollSpell(item),label=definitionOf(item).label,followup=immediateAction(combat);
  const result=applyScrollEffects(actor,combat,spell);
  if(spell.target==='enemy')combat.enemyKnockdown=false;
  const interrupt=interruptMove(combat,result.impact,followup);
  // Scrolls always spend exactly one, independent of consumable Wasteful rules.
  item.quantity--;const remaining=item.quantity;
  if(!remaining)actor.data.inventory[container][slot]=null;
  afterAttack(ctx,{...result,interrupt,check:null,
    spell:spell.id,scroll:item.templateId,spent:1,remaining,int:actor.data.attributes.baseStats.INT,
    text:`${label}: ${result.text}.${interrupt?` ${interrupt}${followup?'.':` cancels ${combat.committed.label}.`}`:''} 1 scroll consumed; ${remaining} remain in this stack. No Essence cost or Overcast.`},false,followup);
}

export function defenseValues(actor, combat, mode, item = null) {
  const natural = derivedActorValues(actor).naturalArmor, armor = definitionOf(actor.data.inventory.chest)?.defense ?? 0;
  const equipped = mode === 'block' ? definitionOf(item)?.defense ?? 0 : 0, barrier = combat.barrier;
  const spell = combat.committed.damageType === 'spell';
  const defense = (spell ? 0 : natural + armor + equipped) + barrier;
  // Barrier mitigates HP only; it never changes Impact, Stability or Block wear.
  const stability = actor.data.attributes.baseStats.CON + (mode === 'dodge' ? 0 : armor + equipped);
  return { defense, stability };
}

export function defend(ctx, mode, slot, rng) {
  const combat = ctx.expedition.combat, move = combatMove(combat.committed), actor = ctx.actor;
  let dodge = null, quality = null, damage = 0, defense = 0, stability = 0, wearResult = null, poison = null, knockdown = false;
  if (move.offensive) {
    const stats = byId('enemies', combat.enemy.templateId).combatStats;
    if (mode === 'dodge') dodge = rollDodge(actor.data.attributes.baseStats.DEX, stats.DEX, move.speed, rng, playerKnockedDown(combat));
    combat.playerKnockdown = false;
    if (!dodge?.success) {
      quality = hitQuality(move.qualityStat, stats[move.qualityStat], move.damage, rng);
      ({ defense, stability } = defenseValues(actor, combat, mode, mode === 'block' ? actor.data.inventory.equipped[slot] : null));
      damage = Math.max(0, quality.rawDamage - defense);
      resources(actor).hp = Math.max(0, resources(actor).hp - damage);
      knockdown = move.impact >= stability;
      combat.playerKnockdown = knockdown;
      if (mode === 'block' && move.damageType !== 'spell') {
        const block = definitionOf(actor.data.inventory.equipped[slot]);
        const amount = quality.rawDamage > block.maxDurability ? 3 : quality.rawDamage > block.defense ? 2 : 1;
        wearResult = wear(actor, slot, amount, rng);
      }
      if (move.onHit.some(effect => effect.tag === 'effect_poison')) poison = applyPoison(actor, rng);
    }
    // The offensive action has resolved, including a Dodge or zero HP damage.
    // Clear before a surviving Counterattack; nonoffensive legacy moves retain it.
    combat.barrier = 0;
  }
  combat.lastMove = move.label;
  combat.phase = 'round-result';
  ctx.roundCompleted = true;
  ctx.expedition.lastResult = {
    text: `${move.label}: ${!move.offensive ? 'legacy nonoffensive action completed' : dodge?.success ? 'Dodged' : `${quality.quality}, ${damage} damage`}${knockdown ? '; KNOCKED DOWN — your next turn is not skipped; Dodge is 0% against the next enemy offensive action, then Knockdown clears' : ''}${poison ? `; ${poison}` : ''}.`,
    dodge, quality, damage, defense, stability, knockdown, wear: wearResult,
  };
  if (mode === 'counter' && resources(actor).hp > 0) {
    combat.counterIncoming = ctx.expedition.lastResult;
    combat.phase = 'counterattack';
    ctx.roundCompleted = false;
  }
}

export function nextCombatPhase(ctx, rng) {
  const combat = ctx.expedition.combat;
  if (combat.phase === 'cancelled') {
    combat.lastMove = `${combat.committed.label} (cancelled)`;
    combat.phase = 'round-result';
    ctx.roundCompleted = true;
    ctx.expedition.lastResult = { ...ctx.expedition.lastResult,
      text: `${ctx.expedition.lastResult.text} ${combat.committed.label} was cancelled. The round ends.` };
  } else {
    combat.round++;
    prepareRound(ctx, rng);
  }
}
