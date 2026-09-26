import { activeExpedition } from './pit.js';
import { byId } from '../../HearthVale_Content/expedition.js';
import { currentRoom } from './expedition-generation.js';
import { derivedActorValues } from './surface-candidates.js';
import { definitionOf, resources, spellCost, canUseBag, useBag, swap, learn } from './expedition-equipment.js';
import { enterExpedition, forward, retreat, requestReturn, finishExpeditionAction } from './expedition-lifecycle.js';
import { attackWeapon, castCombatSpell, movePlayer, defend, nextCombatPhase } from './expedition-combat.js';
import { resolveRoom, explorationSpell } from './expedition-rooms.js';
import { settleLoot } from './expedition-loot.js';
import { eventChoices } from './expedition-events.js';
import { startCombat } from './expedition-combat.js';
import { squareEntityEffects, squareInformation } from './expedition-discovery.js';
import { knowledgeState } from './information.js';

function usableSpell(actor, expedition, spell, scroll = false) {
  if (!spell || (!scroll && resources(actor).essence < spellCost(actor, expedition, spell))) return false;
  const combat = expedition.combat;
  if (combat) return combat.phase === 'attack' && !spell.explorationOnly
    && (spell.id !== 'spell_heal' || resources(actor).hp < derivedActorValues(actor).maxHp)
    && (spell.id !== 'spell_barrier' || !combat.barrier);
  if (spell.id === 'spell_heal') return resources(actor).hp < derivedActorValues(actor).maxHp;
  if (spell.id === 'spell_teleport') return true;
  const room = currentRoom(expedition);
  return spell.id === 'spell_unlock' && ['m2_locked_coffer','event_locked_bedroom'].includes(room?.encounter) && !room.resolved;
}

// Shared read-only legal-intention list. The adapter and UI use the same list;
// eligibility consumes no RNG and reveals no unvisited Room or enemy Stability.
export function expeditionChoices(world) {
  const state = world.globals.hearthvaleSurface, actor = world.entities[state?.playerId], pit = world.entities.hv_pit_1;
  if (world.globals.hearthvaleCompletion?.completed || state?.stage !== 'surface' || !actor || actor.lifecycle!=='active'||actor.data.death
    ||resources(actor).hearts<=0||resources(actor).sanity<=0||pit?.data.pendingFinalHeart || pit?.data.pendingDeath) return [];
  const choices = [], add = (type, label, params = {}, group = 'exploration') => choices.push({ type, label, params, group });
  const expedition = activeExpedition(world)?.data.expedition;
  if (!expedition) {
    if (actor.primaryLocation === 'loc_pit_entrance' && resources(actor).ap >= 1 && resources(actor).hp > 0)
      { add('pit.enter', 'Enter Stratum 1 — 1 AP');
        if(pit.data.sunkenSquare?.known && knowledgeState(world,actor.id,pit.id,'discovery-loc_sunken_square')==='Known') add('pit.enter','Enter via Sunken Square — 1 AP',{shortcut:true}); }
    return choices;
  }
  if (expedition.actor !== actor.id || actor.primaryLocation !== pit.id || resources(actor).hp <= 0) return [];
  const inventory = actor.data.inventory, combat = expedition.combat, room = currentRoom(expedition);
  if (expedition.pendingLoot.length) {
    const item = expedition.pendingLoot[0];
    add('pit.loot', `Leave ${definitionOf(item).label}`, { lootId: item.id, choice: 'leave' }, 'loot');
    inventory.bag.forEach((existing, bag) => add('pit.loot', `Keep ${definitionOf(item).label}; replace Bag ${bag + 1}: ${definitionOf(existing)?.label ?? 'Empty'}`,
      { lootId: item.id, choice: 'replace', bag }, 'loot'));
    return choices;
  }
  if (combat) {
    if (combat.phase === 'incoming') {
      if (!combat.committed.offensive || combat.committed.range !== combat.range) add('pit.defend', 'Resolve committed enemy move', { mode: 'none' }, 'defense');
      else {
        add('pit.defend', 'Dodge', { mode: 'dodge' }, 'defense');
        inventory.equipped.forEach((item, slot) => {
          if (definitionOf(item)?.canDefend && item.durability > 0) add('pit.defend', `Block with ${definitionOf(item).label}`, { mode: 'block', slot }, 'defense');
        });
      }
      return choices;
    }
    if (['cancelled', 'round-result'].includes(combat.phase)) {
      add('pit.combat-next', combat.phase === 'cancelled' ? 'Resolve cancelled round' : 'Next round', {}, 'combat');
      return choices;
    }
    inventory.equipped.forEach((item, slot) => {
      const definition = definitionOf(item);
      if (definition?.category === 'weapon' && item.durability > 0 && definition.range === combat.range
        && (!definition.ammo || resources(actor).arrows > 0)) add('pit.attack', `Attack: ${definition.label} (DUR ${item.durability})`, { slot }, 'weapons');
    });
    add('pit.move', `Move to ${combat.range === 'NEAR' ? 'FAR' : 'NEAR'}`, {}, 'combat');
    if (combat.kind === 'room') add('pit.retreat', 'Retreat to Floor start', {}, 'combat');
  } else {
    if(room?.family==='fixed' && pit.data.strata[0].guardian.alive) add('pit.guardian','Face the Ruin Brute');
    if (expedition.roomIndex < 0 || room?.resolved && expedition.floor.number < 10) add('pit.forward', expedition.lastResult?.discovery?'Continue':'Forward');
    if (room && !room.resolved && room.family !== 'combat') {
      if(byId('events',room.encounter)) {
        for(const choice of eventChoices({actor},room)) add('pit.resolve-room',choice.label,{approach:choice.id});
      } else if (room.family === 'hazard') {
        const hazard = byId('hazards', room.encounter);
        for (const approach of ['primary', 'alternate']) if (hazard[approach]) add('pit.resolve-room',
          `${approach === 'primary' ? 'Attempt' : 'Alternate approach'}: ${hazard[approach].stat} vs DC ${hazard[approach].dc}`, { approach });
      } else {
        add('pit.resolve-room', room.encounter === 'm2_locked_coffer' ? 'Pick the lock: DEX vs DC 11' : ({empty:'Continue through the empty Room',resource:'Gather resources',treasure:'Collect treasure',discovery:'Investigate discovery'}[room.family]??'Inspect and resolve'), { approach: 'inspect' });
        if (room.encounter === 'm2_locked_coffer') add('pit.resolve-room', 'Leave the coffer unopened', { approach: 'leave' });
      }
    }
    add('pit.return', 'Return to entrance', {}, 'return');
  }
  // Only the Player Attack phase or out-of-combat exploration reaches here.
  inventory.bag.forEach((item, slot) => {
    if (canUseBag(actor, slot)) add('pit.use', `Use ${definitionOf(item).label} ×${item.quantity} (free)`, { slot }, 'bag');
    if (!combat && definitionOf(item)?.category === 'tome' && !inventory.spells.includes(definitionOf(item).spell)) {
      const empty = inventory.spells.indexOf(null);
      (empty >= 0 ? [empty] : [0, 1, 2, 3]).forEach(spellSlot => add('pit.learn', `Learn ${byId('spells', definitionOf(item).spell).label}${empty >= 0 ? '' : `; replace ${byId('spells', inventory.spells[spellSlot]).label}`}`, { bag: slot, slot: spellSlot }, 'bag'));
    }
  });
  inventory.spells.forEach((id, slot) => {
    const spell = byId('spells', id);
    if (usableSpell(actor, expedition, spell)) add('pit.cast', `${spell.label} — ${spellCost(actor, expedition, spell)} Essence`, { slot }, 'spells');
  });
  inventory.equipped.forEach((item, slot) => {
    const definition = definitionOf(item), spell = definition?.category === 'scroll' ? byId('spells', definition.spell) : null;
    if (usableSpell(actor, expedition, spell, true)) add('pit.scroll', `Use ${definition.label} (free)`, { slot }, 'weapons');
    inventory.bag.forEach((bagItem, bag) => {
      if ((bagItem || item) && (!bagItem || ['weapon', 'shield', 'scroll'].includes(definitionOf(bagItem).category)))
        add('pit.swap', `Equipped ${slot + 1} ↔ Bag ${bag + 1}: ${definitionOf(bagItem)?.label ?? 'Empty'}`,
          { equipped: slot, bag }, 'swap');
    });
  });
  return choices;
}

function resolveIntention(ctx, type, params, rng) {
  switch (type) {
    case 'pit.enter': enterExpedition(ctx, rng,params.shortcut); break;
    case 'pit.guardian': startCombat(ctx,'enemy_ruin_brute','room',rng); break;
    case 'pit.forward': forward(ctx, rng); break;
    case 'pit.resolve-room': resolveRoom(ctx, params.approach, rng); break;
    case 'pit.return': requestReturn(ctx, rng); break;
    case 'pit.retreat': retreat(ctx, rng); break;
    case 'pit.attack': attackWeapon(ctx, params.slot, rng); break;
    case 'pit.move': movePlayer(ctx); break;
    case 'pit.defend': defend(ctx, params.mode, params.slot, rng); break;
    case 'pit.combat-next': nextCombatPhase(ctx, rng); break;
    case 'pit.cast': case 'pit.scroll': {
      const scroll = type === 'pit.scroll', inventory = ctx.actor.data.inventory;
      const id = scroll ? definitionOf(inventory.equipped[params.slot]).spell : inventory.spells[params.slot];
      const cast = ctx.expedition.combat ? castCombatSpell : explorationSpell;
      cast(ctx, id, rng, scroll ? params.slot : null); break;
    }
    case 'pit.use': ctx.expedition.lastResult = useBag(ctx.actor, params.slot, rng); break;
    case 'pit.learn': ctx.expedition.lastResult = learn(ctx.actor, params.bag, params.slot); break;
    case 'pit.swap':
      swap(ctx.actor, params.equipped, params.bag);
      if (ctx.expedition.combat) ctx.expedition.combat.phase = ctx.expedition.combat.moveCancelled ? 'cancelled' : 'incoming';
      ctx.expedition.lastResult = { text: 'Swapped one Equipped/Bag slot.' }; break;
    case 'pit.loot': ctx.expedition.lastResult = settleLoot(ctx, params); break;
    default: throw new Error('Unknown expedition intention');
  }
}

const sameParams = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);
const types = ['enter','guardian','forward','resolve-room','return','retreat','attack','move','defend','combat-next','cast','scroll','use','learn','swap','loot'];
export const expeditionActions = Object.fromEntries(types.map(name => {
  const type = `pit.${name}`;
  return [type, {
    eligible: ({ world, attempt }) => attempt.actor === world.globals.hearthvaleSurface.playerId
      && expeditionChoices(world).some(choice => choice.type === type && sameParams(choice.params, attempt.params)),
    resolve: ({ world, attempt }, { rng }) => {
      const originalActor = world.entities[attempt.actor], originalPit = world.entities.hv_pit_1;
      const actor = structuredClone(originalActor), pit = structuredClone(originalPit.data);
      const ctx = { world,actor, pit, pitId: originalPit.id, expedition: pit.expedition, day: world.globals.hearthvaleSurface.calendar.day,year:world.globals.hearthvaleSurface.calendar.year };
      resolveIntention(ctx, type, attempt.params, rng);
      finishExpeditionAction(ctx, rng);
      const effects = [];
      effects.push(...squareEntityEffects(world,pit));
      if(type==='pit.resolve-room'&&ctx.expedition?.lastResult.discovery)effects.push({type:'learn',actor:actor.id,
        claim:{subject:originalPit.id,key:'discovery-loc_sunken_square',value:squareInformation(pit)}});
      for (const [entity, before, after] of [[actor.id, originalActor.data, actor.data], [originalPit.id, originalPit.data, pit]])
        for (const key of Object.keys(after)) if (JSON.stringify(after[key]) !== JSON.stringify(before[key]))
          effects.push({ type: 'data', entity, key, value: after[key] });
      if (actor.primaryLocation !== originalActor.primaryLocation) effects.push({ type: 'move', entity: actor.id, location: actor.primaryLocation });
      for (const id of pit.knownEnemies ?? []) if (!(originalPit.data.knownEnemies ?? []).includes(id)) effects.push({ type: 'learn', actor: actor.id,
        claim: { subject: originalPit.id, key: `known-enemy-${id}`, value: id } });
      for (const [id, discovery] of Object.entries(pit.discoveries ?? {})) if (id!=='loc_sunken_square'&&!originalPit.data.discoveries?.[id]) effects.push({ type: 'learn', actor: actor.id,
        claim: { subject: originalPit.id, key: `discovery-${id}`, value: {...discovery,tag:'info_discovery'} } });
      for(const rumor of (actor.data.rumors??[]).slice(originalActor.data.rumors?.length??0))effects.push({type:'learn',actor:actor.id,claim:{subject:originalPit.id,key:`rumor-${rumor.subject}`,value:{...rumor,templateId:rumor.subject},certainty:'uncertain'}});
      return { type: `hearthvale.${type}`, data: { expedition: ctx.expedition?.id ?? null }, effects };
    },
  }];
}));
