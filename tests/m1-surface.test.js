import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame, createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { instantiateSurfaceActor, derivedActorValues } from '../HearthVale_Shell/src/surface-candidates.js';
import { spendSurfaceAp } from '../HearthVale_Shell/src/surface-day.js';
import { surfaceCatalog } from '../HearthVale_Content/surface.js';
import { validateCandidate, validateCatalog } from '../HearthVale_Content/validation.js';
import { character, inventory, candidateCards, hud, surfaceLocation } from '../HearthVale_UI/surface-views.js';

const world = game => game.snapshot().world;
const state = game => world(game).globals.hearthvaleSurface;
const player = game => world(game).entities[state(game).playerId];
function selection(seed = 817) {
  const game = createSurfaceGame({ seed });
  for (let i = 0; i < 5; i++) game.openingNext();
  return game;
}
function playable(seed = 817, response = 'heading') {
  const game = selection(seed);
  game.choose(state(game).candidates[0].id);
  game.perform('surface.arrive'); game.perform('surface.answer-mira', { response }); game.perform('surface.finish-mira');
  return game;
}
function fixture(saved, action, params = {}) {
  const base = createSurfaceShell();
  const runtime = createRuntime({ saved, shell: { ...base, actions: { ...base.actions,
    'fixture.spend-injury': { resolve: ({ world, attempt }) => {
      const actor = world.entities[attempt.actor];
      const effect = spendSurfaceAp(actor, attempt.params.cost);
      effect.value.resources.hp = 1; effect.value.resources.sanity = 2;
      return { effects: [effect] };
    } },
    'fixture.draw': { resolve: (_, { rng }) => ({ effects: [
      { type: 'global', key: 'fixtureDraws', value: Array.from({ length: 8 }, () => rng.next()) },
    ] }) },
  } } });
  runtime.startScene(); runtime.submit({ actor: state(runtime).playerId, type: action, params });
  runtime.resolveScene({ offscreenBudget: 0 });
  return runtime;
}

test('M1 A01 bootstrap: Year 1 Day 1, six significant Actors, high-level Pit, no Gen-0 or player before selection', () => {
  const game = createSurfaceGame();
  assert.deepEqual(state(game).calendar, { year: 1, day: 1, week: 1 });
  const actors = Object.values(world(game).entities).filter(e => e.actor);
  assert.equal(actors.length, 6);
  assert.deepEqual(actors.map(a => a.data.identity.name), ['Auron','Rook','Mira','Tavi','Lina','Garrick']);
  assert.ok(actors.every(a => a.actor.controller === 'Autonomous'));
  assert.equal(state(game).candidates.length, 3);
  assert.equal(state(game).save_schema_version, 1);
  const pit = world(game).entities.hv_pit_1.data;
  assert.deepEqual(pit.strata[0], { number: 1, exists: true, proceduralFloors: [1,9],
    guardian: { templateId: 'enemy_ruin_brute', floor: 10, alive: true }, sunkenSquareDiscovered: false });
  assert.deepEqual(pit.strata[1], { number: 2, locked: true, playable: false });
  assert.equal(Object.values(world(game).entities).filter(e => e.type === 'hearthvale.location').length, 6);
});

test('M1 A01 all three candidates are valid and visible; each selection retains exactly one unchanged rejected package', () => {
  for (let selected = 0; selected < 3; selected++) {
    const game = selection(), candidates = structuredClone(state(game).candidates);
    const markup = candidateCards(candidates);
    assert.equal((markup.match(/<article /g) ?? []).length, 3);
    for (const candidate of candidates) {
      validateCandidate(candidate, surfaceCatalog);
      assert.ok(markup.includes(candidate.label));
    }
    game.choose(candidates[selected].id);
    const retained = candidates.find(c => c.id !== candidates[selected].id);
    assert.deepEqual(world(game).entities[retained.id], {
      type: 'entity', data: {}, lifecycle: 'active', primaryLocation: null, container: null,
      ...instantiateSurfaceActor(retained),
    });
    assert.equal(player(game).actor.controller, 'Human');
    assert.equal(player(game).id, candidates[selected].id);
    assert.equal(state(game).couldHaveId, retained.id);
    const discarded = candidates.find(c => c.id !== retained.id && c.id !== candidates[selected].id);
    assert.equal(world(game).entities[discarded.id], undefined);
    assert.equal(Object.values(world(game).entities).filter(e => e.actor).length, 8);
    const before = game.save();
    assert.throws(() => game.choose(retained.id), /unavailable/);
    assert.equal(game.save(), before);
  }
});

test('M1 generation across 300 deterministic seeds respects stat, Trait, name, equipment and spell constraints', () => {
  let spells = 0, rare = 0;
  const spellCounts = Object.fromEntries(surfaceCatalog.spells.map(s => [s.id, 0]));
  const combinations = new Set(), traitIds = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const game = createSurfaceGame({ seed });
    const candidates = state(game).candidates;
    assert.equal(new Set(candidates.map(c => c.label)).size, 3);
    for (const candidate of candidates) {
      validateCandidate(candidate, surfaceCatalog);
      combinations.add(candidate.loadout.weapons.join(','));
      candidate.traits.forEach(id => traitIds.add(id));
      rare += Number(candidate.traits.includes('trait_lucky_bastard'));
      if (candidate.loadout.spells.length) { spells++; spellCounts[candidate.loadout.spells[0]]++; }
      const actor = instantiateSurfaceActor(candidate), r = actor.data.attributes.resources;
      assert.equal(r.essence, 0); assert.equal(r.ap, 4); assert.equal(r.sanity, 5);
      assert.equal(actor.data.inventory.equipped.length, 4); assert.equal(actor.data.inventory.bag.length, 8);
      assert.equal(actor.data.inventory.spells.length, 4);
      assert.equal(r.hp, derivedActorValues(actor).maxHp);
    }
  }
  assert.equal(combinations.size, 3); assert.equal(traitIds.size, 23);
  assert.ok(spells > 220 && spells < 320, `spell sample ${spells}/900`);
  for (const count of Object.values(spellCounts)) assert.ok(count > 40 && count < 100);
  assert.ok(rare > 3 && rare < 35, `rare sample ${rare}/1800 draws`);
});

test('M1 production Hardy and Frail signed effects cancel HP without changing CON or Natural Armor', () => {
  validateCatalog(surfaceCatalog);
  const profile = structuredClone(state(createSurfaceGame()).candidates[0]);
  profile.traits = ['trait_hardy','trait_frail'];
  validateCandidate(profile, surfaceCatalog);
  const actor = instantiateSurfaceActor(profile), con = profile.stats.CON;
  assert.deepEqual(derivedActorValues(actor), { effectiveCon: con, maxHp: 10 + 2 * con, naturalArmor: Math.floor(con / 2) });
  const invalid = structuredClone(surfaceCatalog); invalid.traits[1].effects[0].value = -Infinity;
  assert.throws(() => validateCatalog(invalid), /Invalid HearthVale data/);
});

test('M1 A02 opening order and Mira-only mandatory exchange gate Surface control once', () => {
  for (const response of ['heading','later','looking']) {
    const game = createSurfaceGame();
    assert.throws(() => game.choose(state(game).candidates[0].id), /unavailable/);
    for (let i = 0; i < 5; i++) { assert.equal(state(game).openingCard, i); game.openingNext(); }
    assert.equal(state(game).openingComplete, true);
    game.choose(state(game).candidates[0].id);
    assert.equal(player(game).primaryLocation, 'loc_inn');
    assert.throws(() => game.perform('Move', { location: 'loc_guild' }), /unavailable/);
    game.perform('surface.arrive');
    assert.throws(() => game.perform('surface.answer-mira', { response: 'invented' }), /unavailable/);
    game.perform('surface.answer-mira', { response });
    const replySave = game.save();
    assert.equal(createSurfaceGame({ saved: replySave }).save(), replySave);
    game.perform('surface.finish-mira');
    assert.equal(state(game).miraComplete, true);
    assert.equal(state(game).miraResponse, response);
    assert.throws(() => game.perform('surface.arrive'), /unavailable/);
    assert.equal(Object.keys(world(game).relations).length, 0);
    assert.equal(Object.values(world(game).entities).filter(e => /memory|relationship/i.test(e.type)).length, 0);
    assert.ok(Object.values(world(game).entities).filter(e => e.actor).every(a => a.data.daily === undefined));
  }
});

test('M1 movement and read-only Character/Inventory cost no AP, time or RNG; five destinations and local Actors render', () => {
  const game = playable();
  const calendar = state(game).calendar, r = player(game).data.attributes.resources, rng = game.snapshot().random;
  for (const location of surfaceCatalog.locations) {
    game.perform('Move', { location: location.id });
    const before = game.save();
    const page = surfaceLocation(world(game), player(game));
    assert.ok(page.includes('Leave'));
    assert.ok(!page.includes('disabled'));
    const char = character(player(game)), inv = inventory(player(game));
    assert.ok(char.includes('Natural Armor') && char.includes('Scars'));
    assert.ok(inv.includes(`Bag · ${player(game).data.inventory.bag.filter(Boolean).length}/8 slots`) && inv.includes('Spell Slots · 4 slots'));
    hud(player(game), state(game).calendar);
    assert.equal(game.save(), before);
    assert.deepEqual(player(game).data.attributes.resources, r);
    assert.deepEqual(state(game).calendar, calendar);
    assert.equal(game.snapshot().random, rng);
  }
  game.perform('Move', { location: 'loc_surface' });
  assert.equal((surfaceLocation(world(game), player(game)).match(/data-command="move"/g) ?? []).length, 5);
});

test('M1 A03 fixture spends AP; confirmed Inn sleep heals, preserves Sanity, resets AP and advances once', () => {
  const start = playable();
  const injured = fixture(start.save(), 'fixture.spend-injury', { cost: 4 });
  const game = createSurfaceGame({ saved: injured.save() });
  assert.equal(player(game).data.attributes.resources.ap, 0);
  assert.throws(() => fixture(game.save(), 'fixture.spend-injury', { cost: 1 }), /AP/);
  const before = game.save(), retained = world(game).entities[state(game).couldHaveId];
  assert.throws(() => game.perform('surface.sleep', { day: 1, confirmed: false }), /unavailable/);
  assert.equal(game.save(), before);
  game.perform('surface.sleep', { day: 1, confirmed: true });
  const r = player(game).data.attributes.resources;
  assert.equal(r.hp, derivedActorValues(player(game)).maxHp); assert.equal(r.sanity, 2); assert.equal(r.ap, 4);
  assert.deepEqual(state(game).calendar, { year: 1, day: 2, week: 1 });
  assert.deepEqual(world(game).entities[state(game).couldHaveId], retained);
  const after = game.save();
  assert.throws(() => game.perform('surface.sleep', { day: 1, confirmed: true }), /unavailable/);
  assert.equal(game.save(), after);
  assert.equal(Object.values(world(game).entities).filter(e => e.event?.type === 'hearthvale.surface-day-ended').length, 1);
  assert.equal(createSurfaceGame({ saved: after }).save(), after);
});

test('M1 sleep requires Inn; fifth Day updates calendar and M4E reconciles once without routine daily simulation', () => {
  const game = playable(); game.perform('Move', { location: 'loc_guild' });
  assert.throws(() => game.perform('surface.sleep', { day: 1, confirmed: true }), /unavailable/);
  game.perform('Move', { location: 'loc_inn' });
  for (let day = 1; day <= 5; day++) game.perform('surface.sleep', { day, confirmed: true });
  assert.deepEqual(state(game).calendar, { year: 1, day: 6, week: 2 });
  assert.equal(world(game).globals.hearthvaleWeekly.lastCompletedDay, 5);
  assert.equal(world(game).globals.hearthvaleWeekly.snapshots.length, 1);
  assert.ok(Object.values(world(game).entities).filter(e => e.actor).every(a => a.data.daily === undefined));
});

test('M1 exact snapshot reload at every opening stage, Surface destination and Day 2; same future Core PRNG', () => {
  const game = createSurfaceGame({ seed: 31087 });
  const checkpoints = [game.save()];
  for (let i = 0; i < 5; i++) { game.openingNext(); checkpoints.push(game.save()); }
  game.choose(state(game).candidates[2].id); checkpoints.push(game.save());
  game.perform('surface.arrive'); checkpoints.push(game.save());
  game.perform('surface.answer-mira', { response: 'looking' }); checkpoints.push(game.save());
  game.perform('surface.finish-mira'); checkpoints.push(game.save());
  for (const location of surfaceCatalog.locations) { game.perform('Move', { location: location.id }); checkpoints.push(game.save()); }
  game.perform('Move', { location: 'loc_inn' }); game.perform('surface.sleep', { day: 1, confirmed: true }); checkpoints.push(game.save());
  for (const saved of checkpoints) for (let repeat = 0; repeat < 3; repeat++) {
    const loaded = createSurfaceGame({ saved });
    assert.equal(loaded.save(), saved);
    assert.deepEqual(loaded.snapshot(), createRuntime({ saved }).snapshot());
  }
  const future = fixture(game.save(), 'fixture.draw');
  for (let repeat = 0; repeat < 3; repeat++) {
    const loaded = createSurfaceGame({ saved: game.save() });
    assert.equal(fixture(loaded.save(), 'fixture.draw').save(), future.save());
  }
  // Loading a preselection checkpoint neither regenerates nor rerolls selection.
  const a = createSurfaceGame({ saved: checkpoints[5] }), b = createSurfaceGame({ saved: checkpoints[5] });
  a.choose(state(a).candidates[1].id); b.choose(state(b).candidates[1].id);
  assert.equal(a.save(), b.save());
});

test('M1 invalid commands and foreign saves fail without modifying the checkpoint', () => {
  const game = playable(), before = game.save();
  for (const command of ['hearthvale.enter-pit','hearthvale.begin-day-end','Take','Wait','surface.finish-mira']) {
    assert.throws(() => game.perform(command), /unavailable/); assert.equal(game.save(), before);
  }
  assert.throws(() => game.perform('Move', { location: 'hv_pit_1' }), /unavailable/);
  assert.equal(game.save(), before);
  assert.throws(() => createSurfaceGame({ saved: createRuntime().save() }), /Surface save/);
  assert.throws(() => createSurfaceGame({ saved: 'invalid' }));
});

test('M1 loaded identity text is escaped in read-only views', () => {
  const actor = structuredClone(player(playable()));
  actor.data.identity.name = '<img src=x onerror=alert(1)>';
  const html = character(actor);
  assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img'));
});
