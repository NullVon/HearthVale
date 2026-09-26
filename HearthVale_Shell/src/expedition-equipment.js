import { byId } from '../../HearthVale_Content/expedition.js';
import { hasTrait } from './expedition-checks.js';
import { derivedActorValues } from './surface-candidates.js';

export const definitionOf = item => item ? byId('items', item.templateId) : null;
export const resources = actor => actor.data.attributes.resources;
export function spellCost(actor, expedition, spell) {
  return spell.cost + Math.max(0, expedition.strain - actor.data.attributes.baseStats.INT);
}
export function paySpell(actor, expedition, spell) {
  const cost = spellCost(actor, expedition, spell);
  if (resources(actor).essence < cost) throw new Error('Insufficient Essence');
  resources(actor).essence -= cost;
  expedition.strain++;
  return cost;
}
export function wear(actor, slot, amount, rng) {
  const item = actor.data.inventory.equipped[slot];
  if (!item || item.durability === undefined) return null;
  const prevented = hasTrait(actor, 'sturdy_hands') && rng.next() < 0.5 ? 1 : 0;
  const loss = Math.max(0, amount - prevented);
  item.durability = Math.max(0, item.durability - loss);
  const destroyed = item.durability === 0;
  if (destroyed) actor.data.inventory.equipped[slot] = null;
  return { item: item.templateId, loss, prevented, destroyed };
}
export function consume(actor, container, slot, rng) {
  const item = actor.data.inventory[container][slot];
  const definition = definitionOf(item);
  const desired = definition.stackable && definition.wastefulEligible && hasTrait(actor, 'wasteful') && rng.next() < 0.2 ? 2 : 1;
  const spent = Math.min(item.quantity, desired);
  item.quantity -= spent;
  if (!item.quantity) actor.data.inventory[container][slot] = null;
  return spent;
}
export function canUseBag(actor, slot) {
  const definition = definitionOf(actor.data.inventory.bag[slot]);
  if (definition?.category !== 'consumable') return false;
  return definition.effects.some(effect => effect.tag === 'effect_heal' && resources(actor).hp < derivedActorValues(actor).maxHp
    || effect.tag === 'effect_expedition_hp' && actor.primaryLocation === 'hv_pit_1' && !actor.data.expeditionHp
    || effect.tag === 'effect_cure' && actor.data.statuses?.poison);
}
export function useBag(actor, slot, rng) {
  const definition = definitionOf(actor.data.inventory.bag[slot]);
  if (!canUseBag(actor, slot)) throw new Error('Consumable is unavailable');
  const spent = consume(actor, 'bag', slot, rng);
  for (const effect of definition.effects) {
    if (effect.tag === 'effect_heal') resources(actor).hp = Math.min(derivedActorValues(actor).maxHp, resources(actor).hp + effect.value);
    if (effect.tag === 'effect_cure') delete actor.data.statuses.poison;
    if (effect.tag === 'effect_expedition_hp') actor.data.expeditionHp=effect.value;
  }
  return { text: `${definition.label} used (${spent} consumed).`, item: definition.id, spent };
}
export function swap(actor, equipped, bag) {
  const inventory = actor.data.inventory;
  const item = inventory.bag[bag], definition = definitionOf(item);
  if (item && !['weapon', 'shield', 'scroll'].includes(definition.category)) throw new Error('Item cannot be equipped');
  if (!item && !inventory.equipped[equipped]) throw new Error('Both slots are empty');
  [inventory.equipped[equipped], inventory.bag[bag]] = [item, inventory.equipped[equipped]];
}
export function learn(actor, bag, slot) {
  const item = actor.data.inventory.bag[bag], definition = definitionOf(item);
  if (definition?.category !== 'tome' || actor.data.inventory.spells.includes(definition.spell)) throw new Error('Tome cannot be learned');
  const replaced = actor.data.inventory.spells[slot];
  actor.data.inventory.spells[slot] = definition.spell;
  actor.data.inventory.bag[bag] = null;
  return { text: `Learned ${byId('spells', definition.spell).label}.`, replaced };
}
