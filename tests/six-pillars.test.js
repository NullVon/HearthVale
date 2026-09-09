import test from 'node:test';
import assert from 'node:assert/strict';
import { createHearthValeGame, createHearthValeRuntime } from '../HearthVale_Shell/src/index.js';
import { HELP } from '../HearthVale_Shell/src/actions.js';
import { supportRelationId } from '../HearthVale_Shell/src/situations.js';
import { BEGIN_DAY_END, FINISH_DAY_END, PROGRESS_GOAL } from '../HearthVale_Shell/src/progression.js';
import { availableActions, choices, desires } from '../HearthVale_Shell/src/autonomy.js';
import { sixPillarFixture, demoIds as ids } from '../HearthVale_Shell/fixtures/six-pillar-fixture.js';

function fixture(weights = { goal: 1, help: 1, idle: 1 }, opportunity = {}) {
  const definition = sixPillarFixture();
  definition.actors[1].decisionWeights = weights;
  Object.assign(definition.opportunities[0], opportunity);
  return definition;
}
const world = game => game.snapshot().world;
const calendar = game => world(game).globals.hearthvale.calendar;
const events = (game, type) => game.history().filter(record => record.event?.type === type);
const help = game => game.perform({ type: HELP, situation: ids.situation });
function resolve(runtime, attempts = [], offscreenBudget = 0) {
  runtime.startScene();
  attempts.forEach(attempt => runtime.submit(attempt));
  return runtime.resolveScene({ offscreenBudget });
}

test('Situation is created by a Shell Event/Consequence and player awareness has a valid direct path', () => {
  const game = createHearthValeGame({ definition: sixPillarFixture() });
  const situation = game.entity(ids.situation);
  assert.equal(situation.lifecycle, 'active');
  assert.equal(situation.data.persistence, 'ephemeral');
  assert.deepEqual(situation.data.priority, { status: 'protected', durationDays: 2, untilDay: 3, lastAutonomousWeek: null });
  const created = events(game, 'hearthvale.opportunity-created')[0];
  assert.equal(created.event.causes.length, 1);
  const creation = game.history().find(record => record.consequence?.operation.type === 'create');
  assert.equal(creation.consequence.event, created.id);
  assert.equal(creation.consequence.status, 'applied');
  const awareness = game.view(ids.player).find(record => record.claim.key === 'help-request');
  assert.equal(awareness.claim.subject, ids.situation);
  assert.equal(game.entity(awareness.claim.source.event).event.type, 'situation.opportunity');
  assert.deepEqual(awareness.claim.value, { beneficiary: ids.autonomous });
  assert.equal(Object.hasOwn(awareness.claim.value, 'requiredContributions'), false);
});

test('shared Action path updates progress, AP, Information, support and terminal state within one Day', () => {
  const game = createHearthValeGame({ definition: sixPillarFixture() });
  help(game);
  assert.equal(game.entity(ids.situation).data.progress, 1);
  assert.equal(game.entity(ids.situation).lifecycle, 'active');
  const relation = supportRelationId(ids.player, ids.autonomous);
  assert.equal(world(game).relations[relation].data.supportContributions, 1);
  assert.equal(game.view(ids.player).find(record => record.claim.key === `support-for:${ids.autonomous}`).claim.value, 1);
  assert.equal(game.available(ids.player).some(action => action.type === HELP), true);
  help(game); // Revalidates against the first Action's completed Consequences.
  assert.equal(game.entity(ids.situation).data.progress, 2);
  assert.equal(game.entity(ids.situation).lifecycle, 'resolved');
  assert.equal(world(game).relations[relation].data.supportContributions, 2);
  assert.equal(calendar(game).day, 1);
  assert.equal(game.entity(ids.player).data.attributes.resources.ap, 2);
  assert.equal(game.entity(ids.autonomous).data.daily, undefined);
  const contributions = events(game, 'hearthvale.help-contributed');
  assert.deepEqual(contributions.map(record => record.event.data.progress), [1, 2]);
  for (const event of contributions) {
    assert.equal(game.entity(event.event.attempt).attempt.type, HELP);
    assert.ok(game.history().some(record => record.consequence?.event === event.id && record.consequence.status === 'applied'));
  }
  const why = game.why(ids.situation, 'lifecycle');
  assert.equal(why.origin, 'consequence');
  assert.ok(why.nodes.some(record => record.event?.type === 'hearthvale.help-contributed'));
  assert.equal(events(game, 'situation.changed')[0].event.data.path, 'help-complete');
  assert.equal(createHearthValeGame({ saved: game.save() }).save(), game.save());
  const before = game.entity(ids.player);
  help(game); // A resolved circumstance is no longer eligible.
  assert.equal(events(game, 'action.failed').length, 1);
  assert.deepEqual(game.entity(ids.player), before);
});

test('hidden Situation does not become global knowledge and protection starts on actual awareness', () => {
  const definition = fixture({ goal: 0, help: 1, idle: 0 }, { requiredContributions: 1 });
  definition.additionalLocations = [{ id: 'location_remote_test', name: 'Remote test location' }];
  definition.actors[1].location = 'location_remote_test';
  const game = createHearthValeGame({ definition });
  assert.equal(game.view(ids.player).some(record => record.claim.subject === ids.situation), false);
  assert.equal(game.available(ids.player).some(action => action.type === HELP), false);
  help(game);
  assert.equal(events(game, 'action.failed').length, 1);
  for (let i = 0; i < 3; i++) game.endDay();
  assert.equal(game.entity(ids.situation).lifecycle, 'active');
  assert.equal(game.entity(ids.situation).data.priority.status, 'awaiting-awareness');
  assert.equal(game.entity(ids.situation).data.progress, 0);
  game.perform({ type: 'Move', params: { location: 'location_remote_test' } });
  assert.equal(game.view(ids.player).some(record => record.claim.key === 'help-request'), true);
  assert.equal(game.entity(ids.situation).data.priority.untilDay, 6); // Two Days from first disclosure on Day 4.
});

test('zero stats do not gate Help; zero AP denies paid Help but permits free Actions until explicit Day end', () => {
  const definition = fixture({ goal: 1, help: 0, idle: 0 }, { requiredContributions: 10, priorityDays: 10 });
  definition.actors[1].resources = { ap: 0, maxAp: 4, sanity: 5, maxSanity: 5 };
  const game = createHearthValeGame({ definition });
  for (let i = 0; i < 4; i++) help(game);
  assert.equal(game.entity(ids.player).data.attributes.resources.ap, 0);
  help(game);
  assert.equal(events(game, 'action.failed').length, 1);
  assert.equal(game.entity(ids.situation).data.progress, 4);
  for (let i = 0; i < 3; i++) game.perform({ type: 'Wait' });
  assert.equal(calendar(game).day, 1);
  assert.equal(game.entity(ids.situation).data.priority.untilDay, 11);
  assert.equal(game.entity(ids.autonomous).data.daily, undefined);
  game.endDay();
  assert.equal(calendar(game).day, 2);
  assert.equal(game.entity(ids.player).data.attributes.resources.ap, 4);
  assert.equal(game.entity(ids.autonomous).data.attributes.resources.ap, 0);
  assert.equal(game.entity(ids.autonomous).data.daily.accomplishments, 1);
});

test('autonomous help cannot resolve a protected Situation, and expiry ends protection without failure', () => {
  const game = createHearthValeGame({ definition: fixture({ goal: 0, help: 1, idle: 0 }) });
  game.endDay(); // Day 1: first non-final contribution allowed.
  assert.equal(game.entity(ids.situation).data.progress, 1);
  assert.equal(game.entity(ids.situation).lifecycle, 'active');
  assert.equal(game.entity(ids.autonomous).data.daily.accomplishments, 1);
  game.endDay(); // Day 2: protected final contribution denied; idle fallback.
  assert.equal(game.entity(ids.situation).data.progress, 1);
  assert.equal(calendar(game).day, 3);
  assert.equal(game.entity(ids.situation).data.priority.status, 'ended');
  assert.equal(game.entity(ids.situation).lifecycle, 'active');
  assert.equal(events(game, 'hearthvale.priority-ended').length, 1);
  assert.equal(events(game, 'hearthvale.day-idle').length, 1);
  game.endDay(); // Day 3: can now finish, despite contributing earlier this Week.
  assert.equal(game.entity(ids.situation).lifecycle, 'resolved');
  assert.equal(events(game, 'hearthvale.help-contributed').at(-1).event.actor, ids.autonomous);
});

test('player alone can finish while protection remains active', () => {
  const game = createHearthValeGame({ definition: fixture({ goal: 0, help: 1, idle: 0 }) });
  game.endDay();
  help(game);
  assert.equal(calendar(game).day, 2);
  assert.equal(game.entity(ids.situation).lifecycle, 'resolved');
  assert.equal(game.entity(ids.situation).data.priority.status, 'protected');
  assert.equal(events(game, 'hearthvale.help-contributed').at(-1).event.actor, ids.player);
});

test('protection denies a first autonomous contribution when it would be final, independently of weekly allowance', () => {
  const game = createHearthValeGame({ definition: fixture({ goal: 0, help: 1, idle: 0 }, { requiredContributions: 1 }) });
  game.endDay();
  assert.equal(game.entity(ids.situation).data.priority.lastAutonomousWeek, null);
  assert.equal(game.entity(ids.situation).data.progress, 0);
  assert.equal(game.entity(ids.autonomous).data.daily.accomplishments, 0);
  help(game);
  assert.equal(game.entity(ids.situation).lifecycle, 'resolved');
});

test('the weekly autonomous contribution allowance belongs to the Situation, not each Actor', () => {
  const definition = fixture({ goal: 0, help: 1, idle: 0 }, { requiredContributions: 20, priorityDays: 20 });
  const helper = 'actor_helper_test';
  definition.actors.push({ ...definition.actors[1], id: helper, name: 'Second autonomous test Actor', mainGoal: 'goal_helper_test' });
  const runtime = createHearthValeRuntime({ definition });
  const claim = runtime.view(ids.autonomous).find(record => record.claim.key === 'help-request');
  resolve(runtime, [{ actor: ids.autonomous, type: 'Communicate', targets: [helper], evidence: [claim.id], params: { claim: {
    subject: ids.situation, key: 'help-request', value: claim.claim.value,
  } } }]);
  const helperClaim = runtime.view(helper).find(record => record.claim.subject === ids.situation);
  assert.equal(helperClaim.claim.source.kind, 'communicated');
  assert.ok(helperClaim.claim.lineage.includes(claim.id));
  let game = createHearthValeGame({ saved: runtime.save() });
  game.endDay();
  game = createHearthValeGame({ saved: game.save() }); // Weekly allowance must survive restoration.
  for (let i = 0; i < 4; i++) game.endDay();
  assert.equal(game.entity(ids.situation).data.progress, 1);
  assert.equal(game.entity(helper).data.daily.accomplishments, 0);
  assert.equal(calendar(game).day, 6);
  assert.equal(calendar(game).week, 2);
  assert.equal(events(game, 'hearthvale.week-reconciled').length, 1);
  assert.deepEqual(world(game).globals.hearthvaleWeekly, { persistence: 'ephemeral', week: 2, reconciliations: 1 });
  assert.equal(events(game, 'hearthvale.help-contributed').length, 1); // No bonus Week turn.
  game.endDay();
  assert.equal(game.entity(ids.situation).data.progress, 2);
  assert.equal(game.entity(ids.situation).data.priority.lastAutonomousWeek, 2);
  assert.equal(game.entity(helper).data.daily.accomplishments, 0);
});

test('raw repeated submissions and off-screen retries cannot exceed one accomplishment per Actor per Day', () => {
  const runtime = createHearthValeRuntime({ definition: fixture({ goal: 1, help: 0, idle: 0 }) });
  resolve(runtime, [{ actor: ids.player, type: BEGIN_DAY_END, params: { day: 1 } }]);
  resolve(runtime, [
    { actor: ids.autonomous, type: PROGRESS_GOAL },
    { actor: ids.autonomous, type: PROGRESS_GOAL },
  ], 100);
  assert.equal(runtime.entity(ids.autonomous).data.daily.accomplishments, 1);
  assert.equal(events(runtime, 'action.failed').length, 1);
  const restored = createHearthValeRuntime({ saved: runtime.save() });
  const rng = restored.snapshot().random;
  resolve(restored, [{ actor: ids.autonomous, type: HELP, situation: ids.situation }], 100);
  assert.equal(restored.entity(ids.autonomous).data.daily.accomplishments, 1);
  assert.equal(restored.entity(ids.situation).data.progress, 0);
  assert.equal(restored.snapshot().random, rng);
});

test('daily work is denied during ordinary Scenes and early/stale Day completion is denied', () => {
  const runtime = createHearthValeRuntime({ definition: sixPillarFixture() });
  resolve(runtime, [{ actor: ids.autonomous, type: PROGRESS_GOAL }], 10);
  assert.equal(runtime.entity(ids.autonomous).data.daily, undefined);
  resolve(runtime, [{ actor: ids.player, type: BEGIN_DAY_END, params: { day: 1 } }]);
  resolve(runtime, [{ actor: ids.player, type: FINISH_DAY_END, params: { day: 1 } }]);
  assert.equal(calendar(runtime).day, 1);
  resolve(runtime, [], 10);
  resolve(runtime, [{ actor: ids.player, type: FINISH_DAY_END, params: { day: 1 } }]);
  assert.equal(calendar(runtime).day, 2);
  resolve(runtime, [{ actor: ids.player, type: BEGIN_DAY_END, params: { day: 1 } }]);
  assert.equal(world(runtime).globals.hearthvale.progression.phase, 'active');
  assert.equal(calendar(runtime).day, 2);
  assert.equal(events(runtime, 'action.failed').length, 3);
});

test('idle and all-zero weights remain valid without a meaningful accomplishment', () => {
  for (const weights of [{ goal: 0, help: 0, idle: 1 }, { goal: 0, help: 0, idle: 0 }]) {
    const game = createHearthValeGame({ definition: fixture(weights) });
    game.endDay();
    assert.equal(game.entity(ids.autonomous).data.daily.accomplishments, 0);
    assert.equal(game.entity(ids.autonomous).data.daily.decidedDay, 1);
    assert.equal(game.entity(ids.autonomous).data.goalProgress, undefined);
    assert.equal(events(game, 'hearthvale.day-idle')[0].event.data.meaningful, false);
    assert.equal(game.entity(ids.situation).data.progress, 0);
  }
});

test('Core seeded weights produce both goal progress and idle rather than always pursuing the Main Goal', () => {
  let accomplished = 0;
  for (let i = 1; i <= 24; i++) {
    const game = createHearthValeGame({ definition: fixture({ goal: 1, help: 0, idle: 1 }), seed: Math.imul(i, 2654435761) >>> 0 });
    game.endDay();
    accomplished += game.entity(ids.autonomous).data.daily.accomplishments;
  }
  assert.ok(accomplished > 0 && accomplished < 24, `Expected both outcomes, got ${accomplished} accomplishments`);
});

test('autonomous decision hooks operate with only local Actor context and aware claims', () => {
  const actor = { id: ids.autonomous, controller: 'Autonomous', data: { mainGoal: 'goal_test', decisionWeights: { goal: 1, help: 1, idle: 1 } } };
  const local = { actor, view: [] };
  const available = availableActions(local);
  assert.equal(available.some(action => action.type === HELP), false);
  assert.ok(desires(local).some(desire => desire.id === actor.data.mainGoal));
  assert.ok(choices({ actor, availableActions: available }).every(choice => choice.attempt.actor === ids.autonomous));
});

test('a foreign evidence claim cannot authorize an otherwise visible Situation action', () => {
  const runtime = createHearthValeRuntime({ definition: sixPillarFixture() });
  const foreign = runtime.view(ids.autonomous).find(record => record.claim.key === 'help-request');
  resolve(runtime, [{ actor: ids.player, type: HELP, situation: ids.situation, evidence: [foreign.id] }]);
  assert.equal(events(runtime, 'action.failed').length, 1);
  assert.equal(runtime.entity(ids.situation).data.progress, 0);
  assert.equal(runtime.entity(ids.player).data.attributes.resources.ap, 4);
});

test('exact save restoration includes active Situation, claims, support, calendar, temporary state and deterministic continuation', () => {
  const game = createHearthValeGame({ definition: fixture({ goal: 1, help: 0, idle: 1 }, { requiredContributions: 20, priorityDays: 20 }), seed: 98765 });
  help(game);
  for (let i = 0; i < 5; i++) game.endDay();
  const saved = game.save();
  const restored = createHearthValeGame({ saved, definition: sixPillarFixture(), seed: 0 });
  assert.equal(restored.save(), saved);
  assert.deepEqual(restored.snapshot(), game.snapshot());
  assert.equal(restored.entity(ids.situation).lifecycle, 'active');
  assert.equal(restored.entity(ids.situation).data.requiredContributions, 20);
  assert.equal(world(restored).globals.hearthvaleWeekly.reconciliations, 1);
  assert.equal(world(restored).relations[supportRelationId(ids.player, ids.autonomous)].data.supportContributions, 1);
  for (let i = 0; i < 3; i++) {
    game.endDay(); restored.endDay();
    assert.equal(restored.save(), game.save());
  }
});

test('save during the completed decision Scene resumes Day completion without rerolling or duplicating activity', () => {
  for (const weights of [{ goal: 1, help: 0, idle: 0 }, { goal: 0, help: 0, idle: 1 }]) {
    const game = createHearthValeGame({ definition: fixture(weights) });
    game.beginDayEnd();
    const saved = game.save();
    const restored = createHearthValeGame({ saved });
    assert.equal(restored.save(), saved);
    assert.throws(() => restored.beginDayEnd(), /already closing/);
    game.finishDayEnd(); restored.endDay();
    assert.equal(restored.save(), game.save());
    assert.equal(events(restored, 'hearthvale.goal-progressed').length + events(restored, 'hearthvale.day-idle').length, 1);
  }
});

test('fixture definitions can change IDs and values without changing Shell rules', () => {
  const definition = sixPillarFixture();
  definition.location.id = 'other_location_test';
  definition.actors[0].id = 'other_player_test';
  definition.actors[1].id = 'other_autonomous_test';
  definition.opportunities[0] = { id: 'other_situation_test', beneficiary: 'other_autonomous_test', requiredContributions: 1, priorityDays: 3 };
  const game = createHearthValeGame({ definition });
  game.perform({ type: HELP, situation: 'other_situation_test', actor: 'other_autonomous_test' });
  assert.equal(game.entity('other_situation_test').lifecycle, 'resolved');
  assert.equal(events(game, 'hearthvale.help-contributed')[0].event.actor, 'other_player_test');
  definition.opportunities[0].requiredContributions = 0;
  assert.throws(() => createHearthValeGame({ definition }), /positive contribution/);
  definition.opportunities[0].requiredContributions = 1;
  definition.actors[1].decisionWeights.goal = -1;
  assert.throws(() => createHearthValeGame({ definition }), /Invalid decision weights/);
});

test('malformed player commands leave the prior checkpoint usable and player input cannot interleave Day completion', () => {
  const game = createHearthValeGame({ definition: sixPillarFixture() });
  const saved = game.save();
  assert.throws(() => game.perform({ type: 'not-an-action' }), /Unknown Action/);
  assert.equal(game.save(), saved);
  assert.throws(() => game.perform({ type: HELP, situation: 'missing-situation' }), /Unknown Entity/);
  assert.equal(game.save(), saved);
  help(game);
  assert.equal(game.entity(ids.situation).data.progress, 1);
  game.beginDayEnd();
  assert.throws(() => game.perform({ type: 'Wait' }), /Finish Day completion/);
  game.finishDayEnd();
  assert.equal(calendar(game).day, 2);
});
