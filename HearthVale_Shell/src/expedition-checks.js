import { constitutionCheckBonus } from './actors.js';
import { surfaceCatalog } from '../../HearthVale_Content/surface.js';
import { diceCheck } from './core.js';

export const hasTrait = (actor, id) => actor.data.attributes.traits.includes(`trait_${id}`);

// Read-only previews and resolution share exactly the same relative-DEX bands.
export function dodgeChance(defenderDEX, attackerDEX, speed = 0, knockedDown = false) {
  const difference = defenderDEX - (attackerDEX + speed);
  return { defenderDEX, attackerDEX, speed, difference, chance: knockedDown ? 0 : Math.min(3, Math.max(0, difference)) * 25,
    ...(knockedDown ? { knockedDown: true } : {}) };
}

export function rollDodge(defenderDEX, attackerDEX, speed, rng, knockedDown = false) {
  const preview = dodgeChance(defenderDEX, attackerDEX, speed, knockedDown);
  // A guaranteed connection needs no random draw.
  const roll = preview.chance ? rng.next() : null;
  return { ...preview, roll, success: roll !== null && roll < preview.chance / 100 };
}

export function hitQuality(stat, value, damage, rng) {
  const result = diceCheck({ expression: '1d20', target: 10, modifier: value, rng });
  const quality = result.total >= 20 ? 'Critical' : result.total >= 10 ? 'Normal' : 'Glancing';
  const multiplier = { Glancing: 0.5, Normal: 1, Critical: 1.5 }[quality];
  return { rolls: result.rolls, die: result.keptRolls[0], stat, value, total: result.total,
    quality, multiplier, rawDamage: Math.ceil(damage * multiplier) };
}
export function traitBonus(actor, scope) {
  let bonus = 0;
  if (['resilience', 'biological'].includes(scope)) bonus += constitutionCheckBonus(actor.data.attributes.traits.flatMap(id =>
    surfaceCatalog.traits.find(t => t.id === id)?.effects ?? []), { physicalResilience: true });
  if (scope === 'escape' && hasTrait(actor, 'quick')) bonus += 2;
  if (scope === 'biological' && hasTrait(actor, 'tough_stomach')) bonus += 2;
  if (['fear', 'mental', 'fire'].includes(scope) && hasTrait(actor, 'strong_willed')) bonus += 2;
  if (scope === 'fear') bonus += (hasTrait(actor, 'fearless') ? 2 : 0) - (hasTrait(actor, 'cowardly') ? 2 : 0);
  if (scope === 'fire' && hasTrait(actor, 'pyrophobic')) bonus -= 2;
  if(['cooperation','warmth','trust','impression'].includes(scope)) bonus+=2*Number(hasTrait(actor,'charming'))-2*Number(hasTrait(actor,'off_putting'));
  if(scope==='intimidate'&&hasTrait(actor,'off_putting'))bonus+=2;
  return bonus;
}

// The caller supplies Core's scoped capability. No critical overrides or
// stacking advantage; the saved result includes every die and modifier.
export function check(actor, { stat, dc, scope = '', advantage = false, disadvantage = false }, rng) {
  if (!rng || typeof rng.next !== 'function') throw new Error('A resolving Core RNG is required');
  if (scope === 'luck') {
    advantage ||= hasTrait(actor, 'lucky') || hasTrait(actor, 'lucky_bastard');
    disadvantage ||= hasTrait(actor, 'unlucky');
  }
  const value = actor.data.attributes.baseStats[stat], bonus = traitBonus(actor, scope);
  const result = diceCheck({ expression: '1d20', target: dc, modifier: value + bonus, rng,
    candidates: !!advantage !== !!disadvantage ? 2 : 1, keep: advantage && !disadvantage ? 'highest' : 'lowest' });
  return { rolls: result.rolls, die: result.keptRolls[0], stat, value, bonus, total: result.total, dc, success: result.passed };
}

export function noncombatCheck(ctx, specification, rng) {
  const first = check(ctx.actor, specification, rng);
  if (!first.success && hasTrait(ctx.actor, 'lucky_bastard') && !ctx.expedition.luckyRerollUsed) {
    ctx.expedition.luckyRerollUsed = true;
    const second = check(ctx.actor, specification, rng);
    return { ...(second.total > first.total ? second : first), reroll: { first, second } };
  }
  return first;
}

export function applyPoison(actor, rng) {
  actor.data.statuses ??= {};
  if (actor.data.statuses.poison) return 'Poison is already active; it does not stack.';
  if (hasTrait(actor, 'tough_stomach') && rng.next() < 0.5) return 'Tough Stomach resisted Poison.';
  actor.data.statuses.poison = true;
  return 'Poison applied.';
}
export function tickPoison(actor) {
  if (!actor.data.statuses?.poison) return false;
  actor.data.attributes.resources.hp = Math.max(0, actor.data.attributes.resources.hp - 1);
  return true;
}
