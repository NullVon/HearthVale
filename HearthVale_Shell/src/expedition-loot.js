import { expeditionCatalog, byId } from '../../HearthVale_Content/expedition.js';
import { pick, weighted } from './expedition-generation.js';
import { hasTrait } from './expedition-checks.js';

export function baselineReward(rng) {
  const roll = rng.next();
  return roll < 0.6 ? { resource: 'essence', quantity: 1 }
    : roll < 0.9 ? { resource: 'arrows', quantity: rng.next() < 0.5 ? 1 : 2 } : null;
}
export function offerLoot(ctx, templateId, quantity = 1) {
  const definition = byId('items', templateId), actor = ctx.actor;
  if (['material', 'valuable'].includes(definition.category)) {
    actor.data.holdings ??= { materials: {}, valuables: {} };
    const store = actor.data.holdings[definition.category === 'material' ? 'materials' : 'valuables'];
    store[templateId] = (store[templateId] ?? 0) + quantity;
    return { item: templateId, quantity, destination: 'holdings' };
  }
  const inventory = actor.data.inventory;
  const stack = definition.stackable && inventory.bag.find(item => item?.templateId === templateId);
  if (stack) { stack.quantity += quantity; return { item: templateId, quantity, destination: 'bag' }; }
  const item = { id: `${actor.id}_item_${inventory.nextItemInstance++}`, templateId, quantity,
    ...(definition.maxDurability ? { durability: definition.maxDurability } : {}) };
  const slot = inventory.bag.indexOf(null);
  if (slot >= 0) inventory.bag[slot] = item;
  else ctx.expedition.pendingLoot.push(item);
  return { item: templateId, quantity, destination: slot >= 0 ? 'bag' : 'pending' };
}
export function settleLoot(ctx, { lootId, choice, bag }) {
  const item = ctx.expedition.pendingLoot[0];
  if (!item || item.id !== lootId) throw new Error('Loot choice is stale');
  if (choice === 'replace') ctx.actor.data.inventory.bag[bag] = item;
  else if (choice !== 'leave') throw new Error('Unknown loot choice');
  ctx.expedition.pendingLoot.shift();
  return { text: choice === 'leave' ? `Left ${byId('items', item.templateId).label}.` : `Kept ${byId('items', item.templateId).label}; replaced Bag slot ${bag + 1}.` };
}
export function treasureReward(ctx, rng) {
  const roll = rng.next();
  if (roll < 0.25) return offerLoot(ctx, 'item_hp_potion_basic');
  if (roll < 0.5) return offerLoot(ctx, pick(expeditionCatalog.items.filter(item=>item.category==='valuable' && item.id!=='item_m2_keepsake'),rng).id);
  if (roll >= 0.8) return null;
  const kind = roll < 0.65 ? 'scroll' : 'tome', spell = pick(expeditionCatalog.spells, rng);
  return offerLoot(ctx, `item_${kind}_${spell.id.slice(6)}`);
}
export function awardRoom(ctx, room, rng) {
  if (room.resolved) throw new Error('Room already resolved');
  const rewards = [];
  if (room.family !== 'empty') {
    const reward = baselineReward(rng);
    if (reward) { ctx.actor.data.attributes.resources[reward.resource] += reward.quantity; rewards.push(reward); }
  }
  if (room.family === 'resource') {
    const material = weighted([{ id: 'moonleaf', weight: 40 }, { id: 'bitterroot', weight: 30 },
      { id: 'bigshroom', weight: 20 }, { id: 'iron_ore', weight: 10 }], rng).id;
    rewards.push(offerLoot(ctx, `item_${material}`, rng.next() < 0.75 ? 1 : 2));
  }
  if (room.family === 'treasure') {
    const reward = treasureReward(ctx, rng); if (reward) rewards.push(reward);
    if (hasTrait(ctx.actor, 'lucky_bastard') && rng.next() < 0.25) {
      const extra = treasureReward(ctx, rng); if (extra) rewards.push(extra);
    }
  }
  room.resolved = true;
  room.rewards = rewards;
  return rewards;
}
export function awardEnemy(ctx, enemyId, rng) {
  const definition = byId('enemies', enemyId), rewards = [{ resource: 'xp', quantity: definition.xp }];
  ctx.actor.data.attributes.resources.xp += definition.xp;
  for (const entry of definition.harvest) if (rng.next() < entry.chance / 100) rewards.push(offerLoot(ctx, entry.item, 1));
  return rewards;
}
