import { byId } from '../../HearthVale_Content/expedition.js';
import { generateFloor, floorTail, currentRoom, pick } from './expedition-generation.js';
import { startCombat } from './expedition-combat.js';
import { noncombatCheck, tickPoison } from './expedition-checks.js';
import { awardEnemy, awardRoom } from './expedition-loot.js';
import { spendSurfaceAp } from './surface-day.js';
import { derivedActorValues } from './surface-candidates.js';
import { resources } from './expedition-equipment.js';
import { routeFloor } from './expedition-discovery.js';
import { playerGuardianVictory } from './guardian.js';
import { recordHeartLoss } from './death.js';

export function validateExpeditionState(world) {
  const pit = world.entities.hv_pit_1?.data, expedition = pit?.expedition;
  if (!expedition) return; // M1 snapshots have no expedition fields to migrate.
  const actor = world.entities[expedition.actor], floor = expedition.floor;
  const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
  const invalid = () => { throw new Error('Invalid expedition snapshot'); };
  if (expedition.active !== true || actor?.id !== world.globals.hearthvaleSurface.playerId || actor.primaryLocation !== 'hv_pit_1'
    || !integer(expedition.strain) || !integer(expedition.deepestFloor, 1) || expedition.deepestFloor > 10
    || !integer(floor?.number, 1) || floor.number > 10 || !integer(floor.attempt, 1)
    || !Array.isArray(floor.rooms) || !Array.isArray(floor.prefixTail) || !Array.isArray(expedition.pendingLoot)
    || !integer(expedition.roomIndex, -1) || expedition.roomIndex >= floor.rooms.length) invalid();
  if (floor.number < 10 && (floor.rooms.length < 3 || floor.rooms.length > 4
    || floor.rooms.filter(r => r.family === 'combat').length > 2
    || new Set(floor.rooms.map(r => r.encounter)).size !== floor.rooms.length)) invalid();
  if (floor.number === 10 && (floor.rooms.length !== 1 || floor.rooms[0].family !== 'fixed')) invalid();
  const tail = [...floor.prefixTail];
  for (const room of floor.rooms) {
    if (typeof room.resolved !== 'boolean' || !['combat','resource','hazard','treasure','event','empty','discovery','fixed'].includes(room.family)) invalid();
    if (tail.at(-1) === room.family && tail.at(-2) === room.family) invalid();
    tail.push(room.family);
  }
  if (!['hp','hearts','ap','arrows','essence','gold','xp'].every(key => integer(resources(actor)[key]))) invalid();
  const combat = expedition.combat;
  if (combat && (!byId('enemies', combat.enemy?.templateId) || !integer(combat.enemy.hp)
    || !['attack','incoming','cancelled','round-result'].includes(combat.phase)
    || !['NEAR','FAR'].includes(combat.range) || !['room','return'].includes(combat.kind)
    || !combat.committed || !['NEAR','FAR'].includes(combat.committed.range)
    || !['damage','impact','stability','dodgeDC'].every(key => Number.isFinite(combat.committed[key]) && combat.committed[key] >= 0)
    || !Array.isArray(combat.committed.onHit) || !integer(combat.barrier) || !integer(combat.round, 1))) invalid();
}

export function enterExpedition(ctx, rng, shortcut = false) {
  ctx.actor.data.attributes = spendSurfaceAp(ctx.actor, 1).value;
  resources(ctx.actor).essence = 0;
  ctx.actor.data.statuses ??= {};
  const sequence = (ctx.pit.expeditionSequence ?? 0) + 1;
  ctx.pit.expeditionSequence = sequence;
  ctx.expedition = ctx.pit.expedition = { id: `hv_expedition_${sequence}`, active: true, actor: ctx.actor.id,
    floor: generateFloor(1, 1, [], rng), roomIndex: -1, deepestFloor: 1, strain: 0,
    combat: null, pendingLoot: [], returnPending: false, luckyRerollUsed: false, nextEnemyInstance: 1,
    lastResult: { text: 'Entered Stratum 1 — Swallowed HearthVale Ruins. Expedition cost: 1 AP.' } };
  ctx.actor.primaryLocation = ctx.pitId;
  if(shortcut) {
    ctx.expedition.floor=routeFloor(ctx,ctx.pit.sunkenSquare.floor,1,[],rng);
    ctx.expedition.deepestFloor=ctx.expedition.floor.number;
  }
  ctx.actor.data.deepestPitFloor=Math.max(ctx.actor.data.deepestPitFloor??0,ctx.expedition.deepestFloor);
}

export function forward(ctx, rng) {
  const expedition = ctx.expedition;
  if (expedition.roomIndex === expedition.floor.rooms.length - 1) {
    expedition.floor = routeFloor(ctx,expedition.floor.number + 1, 1, floorTail(expedition.floor), rng);
    expedition.deepestFloor = Math.max(expedition.deepestFloor, expedition.floor.number);
    ctx.pit.deepestReachedFloor=Math.max(ctx.pit.deepestReachedFloor??1,expedition.deepestFloor);
    ctx.actor.data.deepestPitFloor=Math.max(ctx.actor.data.deepestPitFloor??0,expedition.deepestFloor);
    expedition.roomIndex = -1;
  } else expedition.roomIndex++;
  const room = currentRoom(expedition);
  if(room?.encounter==='event_injured_adventurer' && ctx.world) {
    const person=Object.values(ctx.world.entities).find(a=>a.actor&&a.id!==ctx.actor.id&&a.lifecycle==='active'&&a.primaryLocation===ctx.pitId
      && !['actor_mira','actor_tavi','actor_lina','actor_garrick'].includes(a.data.templateId)
      && resources(a).hp>0&&resources(a).hp<derivedActorValues(a).maxHp);
    if(person)room.actorId=person.id;
  }
  expedition.lastResult = { text: room ? room.title : `Reached the start of Floor ${expedition.floor.number}.` };
  if (room?.family === 'combat') startCombat(ctx, room.encounter, 'room', rng);
}

export function regenerateFloor(ctx, rng) {
  const old = ctx.expedition.floor;
  ctx.expedition.floor = routeFloor(ctx,old.number, old.attempt + 1, old.prefixTail, rng);
  ctx.expedition.roomIndex = -1;
  ctx.expedition.combat = null;
}

export function retreat(ctx, rng) {
  regenerateFloor(ctx, rng);
  ctx.expedition.lastResult = { text: 'Retreated to a newly generated start of this Floor. No Heart loss or Return Encounter.' };
}

export function completeReturn(ctx, reason = 'return') {
  const expedition = ctx.expedition;
  resources(ctx.actor).essence = 0;
  ctx.actor.data.expeditionHp=0;
  resources(ctx.actor).hp=Math.min(resources(ctx.actor).hp,derivedActorValues(ctx.actor).maxHp);
  if (ctx.actor.data.statuses) delete ctx.actor.data.statuses.poison;
  ctx.actor.primaryLocation = 'loc_pit_entrance';
  ctx.pit.lastExpedition = { id: expedition.id, reason, deepestFloor: expedition.deepestFloor, day: ctx.day };
  ctx.pit.lastResult = { ...expedition.lastResult, actor:ctx.actor.id, text: `${expedition.lastResult.text} Expedition ended. Essence and Strain discarded; Poison cleared.` };
  ctx.pit.expedition = null;
}

export function requestReturn(ctx, rng) {
  const depth = ctx.expedition.deepestFloor, dc = depth <= 3 ? 8 : depth <= 6 ? 11 : 14;
  const result = noncombatCheck(ctx, { stat: 'WIS', dc, scope: 'return' }, rng);
  const known = (ctx.pit.knownEnemies ?? []).filter(id => byId('enemies', id) && !byId('enemies', id).guardian);
  ctx.expedition.returnCheck = result;
  if (result.success || !known.length) {
    ctx.expedition.lastResult = { text: result.success ? 'The Return route is safe.' : 'No known eligible enemy intercepts the Return.', check: result };
    completeReturn(ctx);
  } else {
    startCombat(ctx, pick(known, rng), 'return', rng);
    ctx.expedition.lastResult = { text: 'Return Encounter: the way out is blocked. Retreat is unavailable.', check: result };
  }
}

export function handleDefeat(ctx, rng, cause) {
  const r = resources(ctx.actor), returning = ctx.expedition.combat?.kind === 'return';
  const outcome = ctx.expedition.lastResult;
  if (r.hearts <= 1) {
    // Preserve the threatened Heart until the Core death world-process settles
    // rescue or death after this action's effects, in the same transaction.
    ctx.pit.pendingFinalHeart = { actor: ctx.actor.id, expedition: ctx.expedition.id, cause,
      returning, day: ctx.day, floor: ctx.expedition.floor.number };
    ctx.expedition.lastResult = { ...outcome, text: `${outcome.text} Your last Heart is at risk. The expedition has ended; the outcome is pending.` };
    completeReturn(ctx, 'final-heart-pending');
    return;
  }
  r.hearts--;
  recordHeartLoss(ctx.actor,{cause,day:ctx.day,year:ctx.year??1,floor:ctx.expedition.floor.number,
    expedition:ctx.expedition.id},r.hearts+1,r.hearts);
  r.hp = Math.ceil(derivedActorValues(ctx.actor).maxHp / 2);
  if (returning) {
    ctx.expedition.lastResult = { ...outcome, text: `${outcome.text} Defeated during Return: lost 1 Heart; restored to ${r.hp} HP and reached the entrance.` };
    completeReturn(ctx, 'return-defeat');
  } else {
    regenerateFloor(ctx, rng);
    ctx.expedition.lastResult = { ...outcome, text: `${outcome.text} Defeated by ${cause}: lost 1 Heart; restored to ${r.hp} HP at the regenerated Floor start. Spent resources remain spent.` };
  }
}

// One post-resolution boundary for lethal damage, Poison and victory. UI cannot
// call reward/defeat phases independently or repeat a completed challenge.
export function finishExpeditionAction(ctx, rng) {
  if (!ctx.pit.expedition) return;
  if(resources(ctx.actor).sanity<=0){
    ctx.pit.pendingDeath={actor:ctx.actor.id,cause:'sanity',day:ctx.day,expedition:ctx.expedition.id,
      floor:ctx.expedition.floor.number,hp:resources(ctx.actor).hp,hearts:resources(ctx.actor).hearts};
    ctx.expedition.lastResult.text+=' Sanity reached zero. The death outcome is pending.';
    completeReturn(ctx,'sanity-death-pending');return;
  }
  if (ctx.victory) {
    const evidence = ctx.pit.houndEvidence?.[ctx.expedition.combat.enemy.id];
    if (evidence) evidence.status = 'defeated';
    const combat = ctx.expedition.combat, previous = ctx.expedition.lastResult;
    const rewards = awardEnemy(ctx, combat.enemy.templateId, rng);
    if (combat.kind === 'room' && !currentRoom(ctx.expedition).resolved) rewards.push(...awardRoom(ctx, currentRoom(ctx.expedition), rng));
    if(combat.enemy.templateId==='enemy_ruin_brute') {
      playerGuardianVictory(ctx);
    }
    ctx.expedition.combat = null;
    ctx.expedition.lastResult = { ...previous, text: `Victory. ${previous.text}`, rewards };
    if (combat.kind === 'return') ctx.expedition.returnPending = true;
    // Enemy HP zero ends combat immediately, before an end-round Poison tick.
  } else {
    if (resources(ctx.actor).hp > 0 && (ctx.roundCompleted || ctx.noncombatCompleted) && tickPoison(ctx.actor)) {
      ctx.expedition.lastResult.poisonDamage = 1;
      ctx.expedition.lastResult.text += ' Poison: 1 HP lost.';
    }
    if (resources(ctx.actor).hp <= 0) handleDefeat(ctx, rng, ctx.expedition.lastResult.poisonDamage ? 'Poison' : ctx.expedition.combat ? 'combat' : 'hazard');
  }
  if (ctx.pit.expedition && ctx.expedition.returnPending && !ctx.expedition.pendingLoot.length) completeReturn(ctx, 'return-victory');
}
