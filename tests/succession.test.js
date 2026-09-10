import test from 'node:test';
import assert from 'node:assert/strict';
import { createHearthValeGame, createHearthValeRuntime } from '../HearthVale_Shell/src/index.js';
import { successionFixture, successionIds as ids } from '../HearthVale_Shell/fixtures/succession-fixture.js';
import { COMPLETE_SUCCESSION } from '../HearthVale_Shell/src/succession.js';
import { ENTER_PIT, ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT } from '../HearthVale_Shell/src/pit.js';
import { pitIds } from '../HearthVale_Shell/fixtures/pit-fixture.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';

const game = years => createHearthValeGame({ definition: successionFixture({ years }), seed: 42 });
const events = (g, type) => g.history().filter(e => e.event?.type === type);
const transfer = g => { const saves = g.beginSuccession(ids.autonomous); g.completeSuccession(); return saves; };
const discover = g => [ENTER_PIT, ADVANCE_PIT, ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT].forEach(type => g.perform({ type, targets: [pitIds.pit] }));

test('eligibility and explicit preparation select only an eligible existing Actor', () => {
  const g = game(0);
  assert.deepEqual(g.successionOptions(), [{ actor: ids.autonomous, eligible: true, years: 0 }]);
  const before = g.save();
  for (const id of [ids.ineligible, ids.player, 'missing']) assert.throws(() => g.beginSuccession(id), /ineligible/);
  assert.equal(g.save(), before);
  assert.throws(() => g.completeSuccession(), /No prepared/);
  g.beginSuccession(ids.autonomous);
  assert.throws(() => g.perform({ type: 'Wait' }), /prepared succession/);
  assert.throws(() => g.endDay(), /prepared succession/);
  assert.throws(() => g.beginSuccession(ids.autonomous), /ineligible/);
  assert.equal(g.entity(ids.player).actor.controller, 'Human');
});

test('immediate transfer preserves both complete Actor records except controllers and has causal WHY', () => {
  const g = game(0);
  const a = structuredClone(g.entity(ids.player)), b = structuredClone(g.entity(ids.autonomous));
  transfer(g);
  a.actor.controller = 'Autonomous'; b.actor.controller = 'Human';
  assert.deepEqual(g.entity(ids.player), a); assert.deepEqual(g.entity(ids.autonomous), b);
  const why = g.why(ids.autonomous, 'actor.controller').nodes;
  assert.ok(why.some(e => e.consequence?.operation.type === 'controller-transfer'));
  assert.ok(why.some(e => e.event?.type === 'hearthvale.succeeded'));
  assert.ok(why.some(e => e.event?.type === 'hearthvale.succession-prepared'));
  assert.equal(events(g, 'hearthvale.history-compressed').length, 0);
  const c = g.snapshot().world.globals.hearthvale.calendar;
  assert.deepEqual(c, { day: 1, week: 1, chapter: 2, generation: 2 });
});

test('personal and public Situations persist; only explicitly marked role recipients change', () => {
  const g = game(0);
  const personal = g.entity(ids.personal), publicState = g.entity(ids.public);
  const role = structuredClone(g.entity(ids.role));
  transfer(g);
  assert.deepEqual(g.entity(ids.personal), personal);
  assert.equal(g.entity(ids.personal).data.owner, ids.player);
  assert.deepEqual(g.entity(ids.public), publicState);
  role.situation.opportunity.actor = ids.autonomous;
  assert.deepEqual(g.entity(ids.role), role);
  assert.deepEqual(g.history().find(e => e.consequence?.operation.type === 'controller-transfer').consequence.operation.opportunities, [ids.role]);
});

test('world, relationship, private information, Pit discovery and valid ephemeral state survive', () => {
  let g = game(0); discover(g);
  // Seed representative causal state through the public Core API, never rewrite saves.
  const runtime = createRuntime({ saved: g.save(), shell: { surfaceOpportunity: () => false, worldProcesses: () => [{ type: 'continuity.fixture', effects: [
    { type: 'relation', relation: { id: 'relation_test', from: ids.player, to: ids.autonomous, data: { support: 2 } } },
    { type: 'learn', actor: ids.player, claim: { subject: ids.living, key: 'private_test', value: 9 } },
  ] }] } });
  runtime.startScene(); runtime.resolveScene();
  g = createHearthValeGame({ saved: runtime.save() });
  const before = g.snapshot().world;
  const views = [ids.player, ids.autonomous].map(id => g.view(id));
  transfer(g);
  for (const [id, entity] of Object.entries(before.entities)) {
    if ([ids.player, ids.autonomous, ids.role].includes(id)) continue;
    assert.deepEqual(g.entity(id), entity, id);
  }
  assert.deepEqual(g.snapshot().world.relations, before.relations);
  assert.deepEqual([ids.player, ids.autonomous].map(id => g.view(id)), views);
  assert.deepEqual(g.sharedDiscoveries(), before.globals.hearthvaleDiscoveries);
  assert.deepEqual(g.snapshot().world.globals.hearthvaleWeekly, before.globals.hearthvaleWeekly);
});

test('routing refresh gives old player one autonomous turn and directs player input only to successor, including reload', () => {
  const g = game(0); transfer(g);
  const loaded = createHearthValeGame({ saved: g.save() });
  for (const run of [g, loaded]) {
    run.perform({ actor: ids.player, type: 'Wait' });
    assert.equal(run.history().filter(e => e.attempt).at(-1).attempt.actor, ids.autonomous);
    run.beginDayEnd();
    assert.equal(run.entity(ids.player).data.daily.accomplishments, 1);
    assert.equal(run.entity(ids.autonomous).data.daily, undefined);
    const closing = createHearthValeGame({ saved: run.save() }); closing.endDay();
    assert.equal(closing.entity(ids.player).data.daily.accomplishments, 1);
    run.finishDayEnd(); run.endDay();
    assert.equal(run.entity(ids.player).data.daily.accomplishments, 2);
    assert.equal(run.entity(ids.autonomous).data.daily, undefined);
  }
  assert.equal(loaded.save(), g.save());
});

test('pre-succession and prepared saves remain deliberately loadable; post-save resumes without replay or implicit undo', () => {
  const g = game(0); const before = g.save();
  const { preSuccessionSave, preparedSave } = g.beginSuccession(ids.autonomous);
  assert.equal(preSuccessionSave, before);
  const prepared = createHearthValeGame({ saved: preparedSave });
  assert.equal(prepared.save(), preparedSave);
  prepared.completeSuccession(); g.completeSuccession();
  assert.equal(prepared.save(), g.save());
  const post = createHearthValeGame({ saved: g.save() });
  assert.equal(post.save(), g.save());
  assert.throws(() => post.completeSuccession(), /No prepared/);
  assert.throws(() => post.perform({ type: 'unknown' }), /Unknown Action/);
  assert.equal(post.entity(ids.autonomous).actor.controller, 'Human');
  post.perform({ type: 'Wait' });
  assert.equal(events(post, 'hearthvale.succeeded').length, 1);
  const prior = createHearthValeGame({ saved: preSuccessionSave });
  assert.equal(prior.save(), before); assert.equal(prior.entity(ids.player).actor.controller, 'Human');
});

test('multi-year compression changes representative Living State in bounded Scenes with retained causal history', () => {
  for (const years of [3, 20]) {
    const g = game(years); discover(g);
    const prior = g.save(), boundary = g.snapshot().boundary;
    const named = g.entity(pitIds.namedLocation), views = g.view(ids.player);
    transfer(g);
    assert.equal(g.snapshot().boundary, boundary + 2);
    assert.equal(g.entity(ids.player).data.ageYears, 30 + years);
    assert.equal(g.entity(ids.autonomous).data.ageYears, 20 + years);
    assert.equal(g.entity(ids.living).data.value, 10 + years * 2);
    assert.equal(g.snapshot().world.globals.hearthvale.calendar.day, 1 + years * 40);
    assert.equal(g.snapshot().world.globals.hearthvale.calendar.chapter, 2);
    assert.equal(events(g, 'hearthvale.day-ended').length, 0);
    assert.equal(events(g, 'hearthvale.week-reconciled').length, 0);
    assert.equal(events(g, 'hearthvale.goal-progressed').length, 0);
    assert.equal(events(g, 'hearthvale.history-compressed').length, 1);
    assert.ok(g.why(ids.autonomous, 'actor.controller').nodes.some(e => e.event?.type === 'hearthvale.history-compressed'));
    assert.ok(g.why(ids.living, 'data.value').nodes.some(e => e.event?.type === 'hearthvale.history-compressed'));
    assert.deepEqual(g.entity(pitIds.namedLocation), named); assert.deepEqual(g.view(ids.player), views);
    const restored = createHearthValeGame({ saved: g.save() });
    assert.equal(restored.save(), g.save());
    restored.endDay(); assert.equal(restored.entity(ids.player).data.daily.accomplishments, 1);
    assert.equal(createHearthValeGame({ saved: prior }).entity(ids.player).data.ageYears, 30);
  }
});

test('succession cannot bypass Pit timing, Day completion or explicit preparation', () => {
  const g = game(0); g.perform({ type: ENTER_PIT, targets: [pitIds.pit] });
  assert.throws(() => g.beginSuccession(ids.autonomous), /ineligible/);
  g.perform({ type: EXIT_PIT, targets: [pitIds.pit] }); g.beginDayEnd();
  assert.throws(() => g.beginSuccession(ids.autonomous), /ineligible/);
  g.finishDayEnd();
  const r = createHearthValeRuntime({ saved: g.save() });
  r.startScene(); r.submit({ actor: ids.player, type: COMPLETE_SUCCESSION }); r.resolveScene();
  assert.equal(r.entity(ids.player).actor.controller, 'Human');
  assert.equal(events(r, 'action.failed').length, 1);
});

test('unclassified important recipients block succession instead of silently transferring personal opportunities', () => {
  const definition = successionFixture();
  definition.opportunities = [{ id: 'unclassified_test', beneficiary: ids.ineligible, requiredContributions: 2, priorityDays: 2 }];
  const g = createHearthValeGame({ definition });
  const before = g.save();
  assert.deepEqual(g.successionOptions(), []);
  assert.throws(() => g.beginSuccession(ids.autonomous), /routing/);
  assert.equal(g.save(), before);
});
