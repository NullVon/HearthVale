import { byId } from '../../HearthVale_Content/expedition.js';
import { weighted } from './expedition-generation.js';
import { check, hasTrait, applyPoison } from './expedition-checks.js';
import { definitionOf, resources, wear, paySpell, consume } from './expedition-equipment.js';
import { derivedActorValues } from './surface-candidates.js';
import { witnessHound } from './information.js';

const offensive = move => move.damage > 0 || move.impact > 0 || move.onHit.length > 0;
export function prepareRound(ctx, rng) {
  const combat = ctx.expedition.combat, definition = byId('enemies', combat.enemy.templateId);
  combat.barrier = 0;
  combat.moveCancelled = false;
  if (combat.enemyKnockdown) {
    combat.committed = { id: 'move_recover', label: 'Recover footing', range: combat.range, damage: 0, impact: 0,
      dodgeDC: 8, stability: 0, movement: 'none', onHit: [], offensive: false, damageType: 'physical' };
    combat.enemyKnockdown = false;
  } else {
    const selected = weighted(definition[combat.range.toLowerCase()].entries, rng);
    const move = byId('moves', selected.target);
    combat.committed = { ...structuredClone(move), offensive: offensive(move), damageType: move.damageType ?? 'physical' };
  }
  combat.phase = combat.playerKnockdown ? 'incoming' : 'attack';
  combat.skippedAttack = combat.playerKnockdown;
  combat.playerKnockdown = false;
}

export function startCombat(ctx, enemyId, kind, rng) {
  const definition = byId('enemies', enemyId), expedition = ctx.expedition;
  expedition.combat = { enemy: { id: `${expedition.id}_enemy_${expedition.nextEnemyInstance++}`, templateId: enemyId, hp: definition.hp },
    kind, range: 'NEAR', round: 1, phase: 'attack', committed: null, barrier: 0,
    enemyKnockdown: false, playerKnockdown: false, skippedAttack: false, lastMove: null };
  ctx.pit.knownEnemies ??= [];
  witnessHound(ctx, enemyId);
  if (!ctx.pit.knownEnemies.includes(enemyId)) ctx.pit.knownEnemies.push(enemyId);
  prepareRound(ctx, rng);
  expedition.lastResult = { text: `${definition.label} prepares ${expedition.combat.committed.label}.` };
}

export function interruptMove(combat, impact) {
  if (impact <= 0 || !combat.committed.offensive || impact < combat.committed.stability) return null;
  const knockdown = impact >= combat.committed.stability + 2;
  combat.enemyKnockdown ||= knockdown;
  combat.moveCancelled = true;
  combat.phase = 'cancelled';
  return knockdown ? 'Knockdown' : 'Stagger';
}

function afterAttack(ctx, result, free = false) {
  const combat = ctx.expedition.combat;
  if (combat.enemy.hp <= 0) ctx.victory = true;
  else combat.phase = free ? 'attack' : combat.moveCancelled ? 'cancelled' : 'incoming';
  ctx.expedition.lastResult = result;
}

export function attackWeapon(ctx, slot, rng) {
  const combat = ctx.expedition.combat, actor = ctx.actor, item = actor.data.inventory.equipped[slot];
  const weapon = definitionOf(item), enemy = byId('enemies', combat.enemy.templateId);
  const roll = check(actor, { stat: weapon.accuracy, dc: enemy.attackDC }, rng);
  const bow = !!weapon.ammo;
  if (bow) resources(actor).arrows--;
  const damage = roll.success ? Math.max(0, weapon.damage - enemy.defense) : 0;
  const impact = roll.success ? weapon.impact + (!bow && hasTrait(actor, 'heavy_handed') ? 1 : 0) : 0;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
  const wearResult = bow || roll.success ? wear(actor, slot, bow ? 1 : 1 + Number(hasTrait(actor, 'heavy_handed')), rng) : null;
  const interrupt = roll.success ? interruptMove(combat, impact) : null;
  afterAttack(ctx, { text: `${weapon.label}: ${roll.success ? `${damage} damage` : 'Miss'}${interrupt ? `; ${interrupt} cancels ${combat.committed.label}` : ''}.`,
    check: roll, damage, impact, interrupt, wear: wearResult });
}

export function castCombatSpell(ctx, spellId, rng, scrollSlot = null) {
  const spell = byId('spells', spellId), combat = ctx.expedition.combat, actor = ctx.actor;
  const scroll = scrollSlot !== null;
  const cost = scroll ? 0 : paySpell(actor, ctx.expedition, spell);
  if (scroll) consume(actor, 'equipped', scrollSlot, rng);
  let roll = null, damage = 0, impact = 0, interrupt = null;
  if (spell.target === 'enemy') {
    roll = check(actor, { stat: spell.accuracy, dc: scroll ? 8 : byId('enemies', combat.enemy.templateId).attackDC }, rng);
    if (roll.success) {
      damage = spell.effects.find(e => e.tag === 'effect_damage')?.value ?? 0;
      impact = spell.effects.find(e => e.tag === 'effect_impact')?.value ?? 0;
      combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
      interrupt = interruptMove(combat, impact);
    }
  } else if (spell.id === 'spell_heal') resources(actor).hp = Math.min(derivedActorValues(actor).maxHp, resources(actor).hp + 8);
  else if (spell.id === 'spell_barrier') combat.barrier = 3;
  afterAttack(ctx, { text: `${spell.label}${scroll ? ' Scroll' : ''}: ${roll ? roll.success ? `${damage} damage; ${impact} Impact` : 'Miss' : 'applied'}${interrupt ? `; ${interrupt} cancels ${combat.committed.label}` : ''}.`,
    check: roll, damage, impact, interrupt, cost }, scroll);
}

export function movePlayer(ctx) {
  const combat = ctx.expedition.combat;
  combat.range = combat.range === 'NEAR' ? 'FAR' : 'NEAR';
  combat.phase = combat.moveCancelled ? 'cancelled' : 'incoming';
  ctx.expedition.lastResult = { text: `Moved to ${combat.range}. The enemy's committed move is unchanged.` };
}

export function defenseValues(actor, combat, mode, item = null) {
  const natural = derivedActorValues(actor).naturalArmor, armor = definitionOf(actor.data.inventory.chest)?.defense ?? 0;
  const equipped = definitionOf(item)?.defense ?? 0, barrier = combat.barrier;
  const spell = combat.committed.damageType === 'spell';
  const defense = mode === 'dodge' ? (spell ? 0 : natural) + barrier
    : (spell ? 0 : natural + armor) + equipped + barrier;
  const stability = actor.data.attributes.baseStats.CON + barrier + (mode === 'dodge' ? 0 : armor + equipped);
  return { defense, stability };
}

export function defend(ctx, mode, slot, rng) {
  const combat = ctx.expedition.combat, move = combat.committed, actor = ctx.actor;
  // Range validity is checked against the committed origin before combined movement.
  const connectsAtRange = combat.range === move.range;
  if (move.movement !== 'none') combat.range = move.movement;
  let roll = null, damage = 0, defense = 0, stability = 0, wearResult = null, poison = null, knockdown = false;
  if (move.offensive && connectsAtRange) {
    if (mode === 'dodge') roll = check(actor, { stat: 'DEX', dc: move.dodgeDC, scope: 'dodge' }, rng);
    if (!roll?.success) {
      ({ defense, stability } = defenseValues(actor, combat, mode, mode === 'block' ? actor.data.inventory.equipped[slot] : null));
      damage = Math.max(0, move.damage - defense);
      resources(actor).hp = Math.max(0, resources(actor).hp - damage);
      knockdown = move.impact >= stability;
      combat.playerKnockdown = knockdown;
      if (mode === 'block') wearResult = wear(actor, slot, 1, rng);
      if (move.onHit.some(effect => effect.tag === 'effect_poison')) poison = applyPoison(actor, rng);
    }
  }
  combat.lastMove = move.label;
  combat.phase = 'round-result';
  ctx.roundCompleted = true;
  ctx.expedition.lastResult = {
    text: `${move.label}: ${!move.offensive ? 'movement/recovery completed' : !connectsAtRange ? 'out of range' : roll?.success ? 'Dodged' : `${damage} damage`}${knockdown ? '; you are Knocked Down and lose your next Attack phase' : ''}${poison ? `; ${poison}` : ''}.`,
    check: roll, damage, defense, stability, knockdown, wear: wearResult,
  };
}

export function nextCombatPhase(ctx, rng) {
  const combat = ctx.expedition.combat;
  if (combat.phase === 'cancelled') {
    combat.lastMove = `${combat.committed.label} (cancelled)`;
    combat.phase = 'round-result';
    ctx.roundCompleted = true;
    ctx.expedition.lastResult = { text: `${combat.committed.label} was cancelled. The round ends.` };
  } else {
    combat.round++;
    prepareRound(ctx, rng);
    ctx.expedition.lastResult = { text: combat.skippedAttack ? `Knockdown skips your Attack phase. Defend against ${combat.committed.label}.`
      : `Round ${combat.round}: ${combat.committed.label} committed.` };
  }
}
