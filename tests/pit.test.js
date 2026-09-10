import test from 'node:test';
import assert from 'node:assert/strict';
import { createHearthValeGame, createHearthValeRuntime } from '../HearthVale_Shell/src/index.js';
import { ENTER_PIT, ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT, reconstructPitEffects } from '../HearthVale_Shell/src/pit.js';
import { BEGIN_DAY_END, PROGRESS_GOAL } from '../HearthVale_Shell/src/progression.js';
import { pitFixture, pitIds } from '../HearthVale_Shell/fixtures/pit-fixture.js';
import { demoIds as ids } from '../HearthVale_Shell/fixtures/six-pillar-fixture.js';
import { reconstructAtTestBoundary, RECONSTRUCT_TEST } from './helpers/pit-reconstruction.js';

const game = (definition = pitFixture()) => createHearthValeGame({ definition, seed: 1234 });
const state = run => run.snapshot().world;
const ap = run => run.entity(ids.player).data.attributes.resources.ap;
const pit = run => run.entity(pitIds.pit);
const events = (run, type) => run.history().filter(record => record.event?.type === type);
const act = (run, type) => run.perform({ type, targets: [pitIds.pit] });
function reachDiscovery(run) {
  act(run, ENTER_PIT);
  act(run, ADVANCE_PIT);
  act(run, ADVANCE_PIT);
}
function resolve(runtime, attempts = [], offscreenBudget = 0) {
  runtime.startScene();
  attempts.forEach(attempt => runtime.submit(attempt));
  return runtime.resolveScene({ offscreenBudget });
}

test('Pit persists in Core World State and entry spends exactly one AP through a causal Action', () => {
  const run = game();
  assert.equal(pit(run).data.persistence, 'permanent');
  assert.equal(pit(run).data.expedition, null);
  assert.equal(ap(run), 4);
  assert.ok(run.available(ids.player).some(action => action.type === ENTER_PIT));
  act(run, ENTER_PIT);
  assert.equal(ap(run), 3);
  assert.equal(pit(run).data.expedition.active, true);
  assert.equal(pit(run).data.expedition.actor, ids.player);
  assert.equal(run.entity(ids.player).primaryLocation, pitIds.pit);
  assert.equal(pit(run).data.expedition.steps, 0);
  const entered = events(run, 'hearthvale.pit-entered')[0];
  assert.equal(run.entity(entered.event.attempt).attempt.type, ENTER_PIT);
  assert.ok(run.why(ids.player, 'data.attributes').nodes.some(record => record.id === entered.id));
  assert.equal(run.entity(pit(run).data.procedural.current).data.discovered, false);
  act(run, ENTER_PIT); // Cannot start or pay for a second expedition while inside.
  assert.equal(ap(run), 3);
  assert.equal(events(run, 'hearthvale.pit-entered').length, 1);
  assert.equal(events(run, 'action.failed').length, 1);
});

test('multiple internal Scenes resolve local causality immediately without more AP or broader time/activity', () => {
  const run = game();
  const beforeCalendar = state(run).globals.hearthvale.calendar;
  const autonomousBefore = run.entity(ids.autonomous);
  const rng = run.snapshot().random;
  act(run, ENTER_PIT);
  const boundary = run.snapshot().boundary;
  for (let step = 1; step <= 4; step++) {
    act(run, ADVANCE_PIT);
    assert.equal(pit(run).data.expedition.steps, step);
    assert.equal(ap(run), 3);
    assert.equal(run.view(ids.player).find(record => record.claim.key === 'pit-local-progress').claim.value.steps, step);
    assert.equal(run.snapshot().boundary, boundary + step);
    assert.deepEqual(state(run).globals.hearthvale.calendar, beforeCalendar);
    assert.deepEqual(run.entity(ids.autonomous), autonomousBefore);
  }
  assert.equal(events(run, 'hearthvale.pit-step').length, 4);
  assert.equal(events(run, 'hearthvale.day-ended').length, 0);
  assert.equal(events(run, 'hearthvale.pit-return-reconciled').length, 0);
  assert.equal(run.snapshot().random, rng);
  assert.equal(run.snapshot().scene, null);
  assert.equal(run.snapshot().checkpoint, true);
});

test('recognized discovery punches through immediately into permanent state, causal history and shared knowledge only', () => {
  const run = game();
  const npcView = run.view(ids.autonomous);
  reachDiscovery(run);
  const beforeCalendar = state(run).globals.hearthvale.calendar;
  act(run, DISCOVER_PIT);
  const named = run.entity(pitIds.namedLocation);
  assert.equal(named.data.persistence, 'permanent');
  assert.equal(named.data.recognized, true);
  assert.equal(pit(run).data.expedition.active, true);
  assert.equal(run.entity(ids.player).primaryLocation, named.id);
  assert.deepEqual(run.sharedDiscoveries(), {
    [named.id]: { location: named.id, pit: pitIds.pit, name: 'Named location test' },
  });
  assert.ok(run.view(ids.player).some(record => record.claim.subject === named.id && record.claim.key === 'recognized-discovery'));
  assert.deepEqual(run.view(ids.autonomous), npcView); // Shared public record is not global Actor-memory synchronization.
  assert.equal(Object.values(run.sharedDiscoveries()).some(record => 'steps' in record || 'actor' in record), false);
  assert.equal(Object.hasOwn(run.sharedDiscoveries(), pit(run).data.procedural.current), false);
  assert.equal(ap(run), 3);
  assert.deepEqual(state(run).globals.hearthvale.calendar, beforeCalendar);
  assert.equal(run.entity(ids.autonomous).data.daily, undefined);
  const discovery = events(run, 'hearthvale.pit-discovered')[0];
  assert.equal(discovery.event.actor, ids.player);
  assert.equal(discovery.event.data.significance, 'historical');
  const trace = run.why(named.id, 'data.persistence').nodes;
  assert.ok(trace.some(record => record.id === discovery.id));
  assert.ok(trace.some(record => record.attempt?.type === DISCOVER_PIT));
  act(run, ADVANCE_PIT);
  assert.equal(pit(run).data.expedition.steps, 3);
  assert.equal(ap(run), 3);
  assert.throws(() => { run.sharedDiscoveries()[named.id].name = 'changed'; }, TypeError);
});

test('discovery requires local experience and a repeated discovery cannot duplicate history', () => {
  const run = game();
  act(run, DISCOVER_PIT);
  act(run, ENTER_PIT);
  act(run, DISCOVER_PIT);
  assert.equal(events(run, 'hearthvale.pit-discovered').length, 0);
  act(run, ADVANCE_PIT); act(run, ADVANCE_PIT); act(run, DISCOVER_PIT);
  act(run, DISCOVER_PIT);
  assert.equal(events(run, 'hearthvale.pit-discovered').length, 1);
  assert.equal(events(run, 'action.failed').length, 3);
  assert.equal(ap(run), 3);
});

test('Day-end, autonomous attempts and universal Move cannot bypass an active expedition', () => {
  const run = game();
  act(run, ENTER_PIT);
  const saved = run.save();
  assert.throws(() => run.endDay(), /Return from the Pit/);
  assert.equal(run.save(), saved);
  const runtime = createHearthValeRuntime({ saved });
  resolve(runtime, [
    { actor: ids.player, type: BEGIN_DAY_END, params: { day: 1 } },
    { actor: ids.autonomous, type: PROGRESS_GOAL },
    { actor: ids.player, type: 'Move', params: { location: ids.location } },
  ], 100);
  assert.equal(events(runtime, 'action.failed').length, 3);
  assert.equal(runtime.entity(ids.autonomous).data.daily, undefined);
  assert.equal(runtime.entity(ids.player).primaryLocation, pitIds.pit);
  assert.equal(pit(runtime).data.expedition.active, true);
  assert.equal(state(runtime).globals.hearthvale.calendar.day, 1);
  assert.equal(runtime.snapshot().random, run.snapshot().random);
});

test('exit closes the expedition and reconciles return; daily autonomy resumes only through explicit Day completion', () => {
  const run = game();
  reachDiscovery(run); act(run, DISCOVER_PIT);
  act(run, EXIT_PIT);
  assert.equal(pit(run).data.expedition.active, false);
  assert.equal(pit(run).data.pendingReturn, null);
  assert.equal(pit(run).data.lastReturn.expedition, pit(run).data.expedition.id);
  assert.equal(run.entity(ids.player).primaryLocation, ids.location);
  assert.equal(ap(run), 3);
  assert.equal(state(run).globals.hearthvale.calendar.day, 1);
  assert.equal(run.entity(ids.autonomous).data.daily, undefined);
  const reconciliation = events(run, 'hearthvale.pit-return-reconciled')[0];
  assert.ok(reconciliation.event.causes.length);
  assert.ok(run.trace(reconciliation.id).some(record => record.event?.type === 'hearthvale.pit-exited'));
  act(run, EXIT_PIT);
  run.perform({ type: 'Wait' });
  assert.equal(events(run, 'hearthvale.pit-return-reconciled').length, 1);
  assert.equal(ap(run), 3);
  run.endDay();
  assert.equal(state(run).globals.hearthvale.calendar.day, 2);
  assert.equal(run.entity(ids.autonomous).data.daily.accomplishments, 1);
  assert.equal(ap(run), 4);
});

test('entry at zero AP is denied, while an expedition entered with the last AP remains usable and return is free', () => {
  const definition = pitFixture();
  definition.actors[0].resources = { ap: 1, maxAp: 4, sanity: 5, maxSanity: 5 };
  const run = game(definition);
  assert.equal(ap(run), 1);
  reachDiscovery(run); act(run, DISCOVER_PIT); act(run, ADVANCE_PIT); act(run, EXIT_PIT);
  assert.equal(ap(run), 0);
  assert.equal(state(run).globals.hearthvale.calendar.day, 1);
  act(run, ENTER_PIT);
  assert.equal(events(run, 'hearthvale.pit-entered').length, 1);
  assert.equal(pit(run).data.expedition.active, false);
  const zero = pitFixture(); zero.actors[0].resources = { ap: 0, maxAp: 4, sanity: 5, maxSanity: 5 };
  const blocked = game(zero); act(blocked, ENTER_PIT);
  assert.equal(pit(blocked).data.expedition, null);
  assert.equal(pit(blocked).data.procedural.current, null);
  assert.equal(ap(blocked), 0);
});

test('active-expedition saves restore exact local state and resume deterministic discovery without a reroll', () => {
  const original = game();
  act(original, ENTER_PIT); act(original, ADVANCE_PIT);
  const beforeDiscovery = original.save();
  const restored = createHearthValeGame({ saved: beforeDiscovery });
  assert.equal(restored.save(), beforeDiscovery);
  assert.equal(pit(restored).data.expedition.active, true);
  assert.equal(pit(restored).data.expedition.steps, 1);
  assert.equal(ap(restored), 3);
  for (const run of [original, restored]) { act(run, ADVANCE_PIT); act(run, DISCOVER_PIT); }
  assert.equal(restored.save(), original.save());
  const discoveredSave = restored.save();
  const again = createHearthValeGame({ saved: discoveredSave });
  assert.equal(again.save(), discoveredSave);
  assert.equal(events(again, 'hearthvale.pit-discovered').length, 1);
  for (const run of [restored, again]) { act(run, ADVANCE_PIT); act(run, EXIT_PIT); }
  assert.equal(again.save(), restored.save());
  assert.equal(createHearthValeGame({ saved: again.save() }).save(), again.save());
});

test('reconstruction replaces undiscovered ephemeral space but preserves the named discovery, shared record and provenance', () => {
  let run = game();
  reachDiscovery(run); act(run, DISCOVER_PIT);
  const oldId = pit(run).data.procedural.current;
  assert.equal(run.entity(oldId).data.persistence, 'ephemeral');
  assert.equal(run.entity(oldId).data.discovered, false);
  assert.throws(() => reconstructPitEffects(state(run), pitIds.pit), /completed return/);
  const denied = createHearthValeGame({ saved: reconstructAtTestBoundary(run.save(), pitIds.pit) });
  assert.equal(pit(denied).data.procedural.current, oldId);
  assert.equal(events(denied, 'action.failed').length, 1);
  act(run, EXIT_PIT);
  const namedBefore = run.entity(pitIds.namedLocation);
  const sharedBefore = run.sharedDiscoveries();
  const historyBefore = run.why(pitIds.namedLocation, 'data.persistence');
  const calendarBefore = state(run).globals.hearthvale.calendar;
  const reconstructedSave = reconstructAtTestBoundary(run.save(), pitIds.pit);
  run = createHearthValeGame({ saved: reconstructedSave });
  assert.equal(run.save(), reconstructedSave);
  assert.notEqual(pit(run).data.procedural.current, oldId);
  assert.equal(run.entity(oldId).lifecycle, 'retired'); // Preserve Core historical references, not active procedural use.
  assert.equal(run.entity(pit(run).data.procedural.current).lifecycle, 'active');
  assert.deepEqual(run.entity(pitIds.namedLocation), namedBefore);
  assert.deepEqual(run.sharedDiscoveries(), sharedBefore);
  assert.deepEqual(run.why(pitIds.namedLocation, 'data.persistence'), historyBefore);
  assert.equal(events(run, 'hearthvale.pit-discovered').length, 1);
  assert.deepEqual(state(run).globals.hearthvale.calendar, calendarBefore);
  assert.equal(ap(run), 3);
  assert.equal(run.entity(ids.autonomous).data.daily, undefined);
  assert.equal(events(run, 'hearthvale.pit-reconstructed').length, 1);
});

test('return and re-entry preserve the Pit and procedural layer without granting a free route or another discovery', () => {
  const run = game();
  run.perform({ type: 'Move', params: { location: pitIds.pit } });
  assert.equal(run.entity(ids.player).primaryLocation, ids.location);
  assert.equal(ap(run), 4);
  reachDiscovery(run); act(run, DISCOVER_PIT); act(run, EXIT_PIT);
  const proceduralBefore = pit(run).data.procedural;
  run.perform({ type: 'Move', params: { location: pitIds.namedLocation } });
  assert.equal(run.entity(ids.player).primaryLocation, ids.location);
  assert.equal(ap(run), 3);
  act(run, ENTER_PIT);
  assert.equal(ap(run), 2);
  assert.equal(pit(run).data.expeditionSequence, 2);
  assert.equal(pit(run).data.expedition.steps, 0);
  assert.equal(run.entity(ids.player).primaryLocation, pitIds.pit);
  assert.deepEqual(pit(run).data.procedural, proceduralBefore);
  assert.equal(run.available(ids.player).some(action => action.type === DISCOVER_PIT), false);
  act(run, ADVANCE_PIT); act(run, ADVANCE_PIT); act(run, DISCOVER_PIT);
  assert.equal(events(run, 'hearthvale.pit-discovered').length, 1);
});

test('reconstruction is a test-only scheduled boundary, not a production player command or full Chapter system', () => {
  const run = game();
  const saved = run.save();
  assert.throws(() => run.perform({ type: RECONSTRUCT_TEST, targets: [pitIds.pit] }), /Unknown Action/);
  assert.equal(run.save(), saved);
  const reconstructed = createHearthValeGame({ saved: reconstructAtTestBoundary(saved, pitIds.pit) });
  assert.equal(pit(reconstructed).data.procedural.revision, 1);
  assert.equal(pit(reconstructed).data.expedition, null); // Eligible reconstruction does not require a visit.
  assert.equal(state(reconstructed).globals.hearthvale.calendar.chapter, 1);
  assert.deepEqual(reconstructed.sharedDiscoveries(), {});
});

test('Pit fixture identity and local discovery threshold are replaceable data', () => {
  const definition = pitFixture();
  definition.pit = { id: 'other_pit_test', discovery: { id: 'other_named_test', name: 'Other test name', afterSteps: 1 } };
  const run = game(definition);
  for (const type of [ENTER_PIT, ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT]) run.perform({ type, targets: ['other_pit_test'] });
  assert.equal(run.entity('other_named_test').data.name, 'Other test name');
  assert.equal(ap(run), 3);
  definition.pit.discovery.afterSteps = 0;
  assert.throws(() => game(definition), /positive local step/);
  definition.pit.discovery.afterSteps = 1;
  definition.pit.discovery.id = ids.player;
  assert.throws(() => game(definition), /must not collide/);
});
