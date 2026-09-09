import test from 'node:test';
import assert from 'node:assert/strict';
import { createHearthValeRuntime } from '../src/shell/index.js';
import { createActor } from '../src/shell/actors.js';

test('Shell loads through Core and resolves its initial Scene through Event and Consequence', () => {
  const runtime = createHearthValeRuntime();
  const state = runtime.snapshot();
  assert.equal(state.boundary, 1);
  assert.equal(state.scene, null);
  assert.equal(state.checkpoint, true);
  assert.equal(state.world.globals.hearthvale.initialized, true);
  const event = runtime.history().find(record => record.event?.type === 'hearthvale.world-started');
  assert.ok(event);
  const effect = runtime.history().find(record => record.consequence?.operation.type === 'global');
  assert.equal(effect.consequence.event, event.id);
  assert.equal(effect.consequence.status, 'applied');
  assert.equal(effect.consequence.changes[0].before.initialized, false);
  assert.equal(effect.consequence.changes[0].after.initialized, true);
});

test('all people share one Actor model with exactly one Player Controller', () => {
  const state = createHearthValeRuntime().snapshot();
  const actors = Object.values(state.world.entities).filter(entity => entity.actor);
  assert.equal(actors.length, 2);
  assert.equal(actors.filter(actor => actor.actor.controller === 'Human').length, 1);
  assert.equal(actors.filter(actor => actor.actor.controller === 'Autonomous').length, 1);
  for (const actor of actors) {
    assert.equal(actor.type, 'hearthvale.actor');
    assert.equal(actor.lifecycle, 'active');
    assert.equal(actor.data.persistence, 'living');
    assert.ok(actor.data.identity.name);
    assert.equal(typeof actor.data.mainGoal, 'string');
    assert.ok(Array.isArray(actor.data.attributes.traits));
    assert.equal(actor.data.attributes.resources.maxAp, 4);
    assert.equal(actor.data.attributes.resources.maxSanity, 5);
    assert.ok(state.world.entities[actor.primaryLocation]);
  }
});

test('Shell attributes are extensible and maxima are baselines, not fixed caps', () => {
  const actor = createActor({
    id: 'HV_TEST', name: 'Test', controller: 'Autonomous', mainGoal: 'learn',
    baseStats: { resolve: 0, craft: 7 }, traits: [],
    resources: { ap: 6, maxAp: 6, sanity: 8, maxSanity: 8 },
  }, 'HV_TOWN_SQUARE');
  assert.equal(actor.data.attributes.baseStats.craft, 7);
  assert.equal(actor.data.attributes.resources.maxAp, 6);
  assert.throws(() => createActor({ name: 'Test', controller: 'Human', mainGoal: [] }), /one Main Goal/);
});

test('bootstrap knowledge has a legitimate source and reveals only each Actor own location', () => {
  const runtime = createHearthValeRuntime();
  for (const id of ['HV_ROWAN', 'HV_ELLIS']) {
    const claims = runtime.view(id);
    assert.equal(claims.length, 1);
    assert.equal(claims[0].claim.subject, id);
    assert.equal(claims[0].claim.key, 'primaryLocation');
    assert.equal(claims[0].claim.value, runtime.entity(id).primaryLocation);
    assert.equal(claims[0].claim.source.kind, 'perceived');
    assert.equal(runtime.entity(claims[0].claim.source.event).event.type, 'hearthvale.world-started');
  }
});

test('a normal Core Scene neither spends AP nor advances calendar or autonomous activity', () => {
  const runtime = createHearthValeRuntime();
  const before = runtime.snapshot();
  assert.deepEqual(runtime.available('HV_ROWAN').map(action => action.type), ['Wait']);
  runtime.startScene({ kind: 'hearthvale.bootstrap-check' });
  runtime.submit({ actor: 'HV_ROWAN', type: 'Wait' });
  runtime.resolveScene();
  assert.deepEqual(runtime.snapshot().world.globals, before.world.globals);
  assert.deepEqual(runtime.entity('HV_ROWAN'), before.world.entities.HV_ROWAN);
  assert.deepEqual(runtime.entity('HV_ELLIS'), before.world.entities.HV_ELLIS);
  assert.equal(runtime.history().filter(record => record.attempt).length, 1);
  assert.equal(runtime.history().filter(record => record.event?.type === 'hearthvale.world-started').length, 1);
});

test('save restores the exact checkpoint and hooks without repeating bootstrap', () => {
  const original = createHearthValeRuntime({ seed: 123 });
  const saved = original.save();
  const restored = createHearthValeRuntime({ saved });
  assert.equal(restored.save(), saved);
  assert.deepEqual(restored.snapshot(), original.snapshot());
  for (const runtime of [original, restored]) {
    runtime.startScene();
    runtime.submit({ actor: 'HV_ROWAN', type: 'Wait' });
    runtime.resolveScene();
  }
  assert.equal(restored.save(), original.save());
});

test('active Scenes cannot be saved and incompatible Shell schemas are rejected', () => {
  const runtime = createHearthValeRuntime();
  const envelope = JSON.parse(runtime.save());
  envelope.state.world.globals.hearthvale.schemaVersion = 2;
  assert.throws(() => createHearthValeRuntime({ saved: JSON.stringify(envelope) }), /Unsupported HearthVale/);
  runtime.startScene();
  assert.throws(() => runtime.save(), /stable checkpoint/);
});

test('runtime state is immutable and separate worlds do not share mutable state', () => {
  const first = createHearthValeRuntime();
  const second = createHearthValeRuntime();
  const saved = second.save();
  assert.throws(() => { first.entity('HV_ROWAN').data.attributes.resources.ap = 999; }, TypeError);
  first.startScene();
  first.submit({ actor: 'HV_ROWAN', type: 'Wait' });
  first.resolveScene();
  assert.equal(second.save(), saved);
  assert.equal(second.snapshot().boundary, 1);
});
