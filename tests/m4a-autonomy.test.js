import test from 'node:test';
import assert from 'node:assert/strict';
import { autonomousChoices, dayAutonomyEffects } from '../HearthVale_Shell/src/day-autonomy.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { surfaceFixture, configure, service } from './helpers/m3-fixture.js';

const worldOf = game => game.snapshot().world;
const rookOf = world => world.entities.hv_actor_2;
function setup() {
  return surfaceFixture((world, player) => {
    player.primaryLocation = 'loc_inn';
    const rook = rookOf(world);
    rook.primaryLocation = 'loc_shop';
    rook.data.holdings = { materials: { item_moonleaf: 3, item_bitterroot: 3 }, valuables: { item_town_medal: 3 } };
  });
}
function resolve(world, samples = [0, 0]) {
  let index = 0;
  const state = economyState(world);
  const effects = dayAutonomyEffects(world, state, { next: () => samples[index++ % samples.length] });
  return { state, effects, draws: index };
}
const sleep = game => game.perform('surface.sleep', { confirmed: true, day: worldOf(game).globals.hearthvaleSurface.calendar.day });
const memories = result => result.effects.filter(e => e.key === 'memories');

test('M4A zero is valid even with eligible opportunities; empty days consume no RNG', () => {
  const world = worldOf(setup());
  assert.equal(resolve(world, [0.99]).effects.length, 0);
  const empty = structuredClone(world);
  rookOf(empty).data.holdings = {};
  assert.equal(resolve(empty).draws, 0);
});

test('M4A at most one meaningful accomplishment per Actor per Day, including multiple eligible Actors', () => {
  const world = structuredClone(worldOf(setup()));
  const other = world.entities[world.globals.hearthvaleSurface.couldHaveId];
  other.primaryLocation = 'loc_shop';
  other.data.holdings = structuredClone(rookOf(world).data.holdings);
  const result = resolve(world);
  assert.equal(memories(result).length, 2);
  for (const effect of memories(result)) assert.equal(effect.value.length, 1);
  assert.equal(new Set(result.state.materialRecords.map(r => r.item)).size, 2);
  assert.equal(result.state.knownMaterials.length, 2);
});

test('M4A player, on-screen, dead, incapacitated, wrong-location, missing-provider and irrelevant-goal Actors are ineligible', () => {
  const base = worldOf(setup());
  const mutations = [
    (w,a) => { a.actor.controller = 'Human'; },
    (w,a) => { w.globals.hearthvaleSurface.playerId = a.id; },
    (w,a) => { w.entities[w.globals.hearthvaleSurface.playerId].primaryLocation = a.primaryLocation; },
    (w,a) => { a.lifecycle = 'dead'; },
    (w,a) => { a.data.attributes.resources.hp = 0; },
    (w,a) => { a.data.attributes.resources.hearts = 0; },
    (w,a) => { a.primaryLocation = 'loc_guild'; },
    w => { w.entities.hv_actor_4.lifecycle = 'dead'; },
    (w,a) => { a.data.mainGoal = 'Keep the Inn going'; },
    (w,a) => { a.data.holdings = {}; },
  ];
  for (const mutate of mutations) {
    const world = structuredClone(base), actor = rookOf(world); mutate(world, actor);
    assert.deepEqual(autonomousChoices(world, actor, economyState(world)), []);
  }
  const state = economyState(base); state.knownMaterials = ['item_moonleaf', 'item_bitterroot'];
  assert.ok(autonomousChoices(base, rookOf(base), state).every(c => c.op !== 'turn-in'));
});

test('M4A authored Greedy/Curious preferences are 70/30 only among eligible alternatives', () => {
  const world = structuredClone(worldOf(setup())), actor = rookOf(world);
  const share = traits => {
    actor.data.attributes.traits = traits;
    const choices = autonomousChoices(world, actor, economyState(world));
    return choices.filter(c => c.op === 'turn-in').reduce((s,c) => s+c.weight,0) / choices.reduce((s,c) => s+c.weight,0);
  };
  assert.equal(share(['trait_curious']), 0.7);
  assert.equal(share(['trait_greedy']), 0.3);
  assert.equal(share(['trait_curious','trait_greedy']), 0.5);
  for (const trait of ['trait_careful','trait_reckless','trait_fearless','trait_cowardly']) assert.equal(share([trait]), 0.5);
  actor.data.attributes.traits = ['trait_curious'];
  assert.equal(memories(resolve(world, [0, 0.6]))[0].value[0].kind, 'turn-in');
  actor.data.attributes.traits = ['trait_greedy'];
  assert.equal(memories(resolve(world, [0, 0.6]))[0].value[0].kind, 'sell-holding');
  assert.equal(memories(resolve(world, [0.9])).length, 0);
});

test('M4A actual Actor/date/material credit and private knowledge use Core effects without mutating input', () => {
  const world = worldOf(setup()), before = JSON.stringify(world);
  const result = resolve(world);
  assert.equal(JSON.stringify(world), before);
  const record = result.state.materialRecords[0];
  assert.equal(record.actor, rookOf(world).id);
  assert.equal(record.day, world.globals.hearthvaleSurface.calendar.day);
  assert.equal(record.year, 1);
  assert.deepEqual(memories(result)[0].value[0], record);
  assert.equal(result.effects.find(e => e.type === 'learn').actor, record.actor);
  assert.equal(result.effects.find(e => e.key === 'holdings').value.materials[record.item], 2);
  assert.equal(result.state.lastResult, economyState(world).lastResult);
});

test('M4A significant sale grants actual seller gold, records it and leaves life resources untouched', () => {
  const world = worldOf(setup()), actor = rookOf(world);
  const result = resolve(world, [0, 0.99]);
  const record = memories(result)[0].value[0];
  assert.equal(record.kind, 'sell-holding');
  const attributes = result.effects.find(e => e.key === 'attributes').value;
  assert.equal(attributes.resources.gold, actor.data.attributes.resources.gold + record.gold);
  for (const key of ['sanity','hearts','hp','ap']) assert.equal(attributes.resources[key], actor.data.attributes.resources[key]);
  assert.equal(result.effects.some(e => e.type === 'learn'), false);
});

test('M4A same-seed multi-Day replay and save/reload on both sides of a boundary preserve exact continuation', () => {
  const a = setup(), b = setup();
  assert.equal(a.save(), b.save());
  let reload = createSurfaceGame({ saved: a.save() });
  for (let day = 0; day < 20; day++) {
    const oldCount = rookOf(worldOf(a)).data.memories?.length ?? 0;
    sleep(a); sleep(b); sleep(reload);
    assert.equal(a.save(), b.save()); assert.equal(a.save(), reload.save());
    const count = rookOf(worldOf(a)).data.memories?.length ?? 0;
    assert.ok(count - oldCount <= 1);
    reload = createSurfaceGame({ saved: reload.save() });
  }
  const world = worldOf(a), rook = rookOf(world);
  assert.ok(rook.data.memories.length > 0 && rook.data.memories.length < 20);
  assert.ok(rook.data.memories.every(m => m.actor === rook.id));
  assert.equal(world.entities[world.globals.hearthvaleSurface.playerId].data.memories, undefined);
  assert.ok(Object.values(world.entities).some(e => e.claim?.actor === rook.id && e.claim.key.startsWith('material-')));
  const saved = a.save();
  assert.throws(() => a.perform('surface.sleep', { confirmed: true, day: 1 }), /unavailable/);
  assert.equal(a.save(), saved);
});

test('M4A player Turn-In shares discovery/history consequences with autonomy', () => {
  let game = setup();
  game = configure(game, world => {
    const actor = world.entities[world.globals.hearthvaleSurface.playerId];
    actor.primaryLocation = 'loc_shop';
    actor.data.holdings = { materials: { item_moonleaf: 1 } };
  });
  service(game, 'turn-in', p => p.item === 'item_moonleaf');
  const world = worldOf(game), actor = world.entities[world.globals.hearthvaleSurface.playerId];
  assert.deepEqual(world.globals.hearthvaleServices.materialRecords[0], actor.data.memories[0]);
  assert.equal(actor.data.memories[0].actor, actor.id);
});
