import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createHearthValeRuntime, createHearthValeShell, createHearthValeGame } from '../HearthVale_Shell/src/index.js';
import { sixPillarFixture, demoIds } from '../HearthVale_Shell/fixtures/six-pillar-fixture.js';

// Diagnostic action exists only in this fixture, never in production routes.
function fixture({ seed = 817, saved } = {}) {
  const initial = saved ?? createHearthValeRuntime({ seed, definition: sixPillarFixture() }).save();
  const base = createHearthValeShell();
  const shell = { ...base, actions: { ...base.actions, 'fixture.sample': {
    resolve: (_, { rng }) => ({ effects: [{ type: 'global', key: 'fixtureSamples',
      value: Array.from({ length: 8 }, () => rng.next()) }] }),
  } } };
  return createRuntime({ saved: initial, shell });
}
function draw(runtime) {
  runtime.startScene({ kind: 'fixture.rng' });
  runtime.submit({ actor: demoIds.player, type: 'fixture.sample' });
  runtime.resolveScene({ offscreenBudget: 0 });
  return runtime.snapshot().world.globals.fixtureSamples;
}

test('HearthVale seed injection repeats fixture outcomes through Core resolution', () => {
  const a = fixture({ seed: 42 }), b = fixture({ seed: 42 });
  for (let i = 0; i < 4; i++) assert.deepEqual(draw(a), draw(b));
  assert.equal(a.save(), b.save());
});

test('HearthVale save/load restores exact future RNG through the existing game save API', () => {
  const original = fixture(); draw(original); draw(original); draw(original);
  // Round-trip through the real game adapter; loading does not replay bootstrap
  // or consume randomness. Re-supply the diagnostic hook only for the test.
  const saved = createHearthValeGame({ saved: original.save() }).save();
  assert.equal(saved, original.save());
  const future = Array.from({ length: 6 }, () => draw(original));
  for (let i = 0; i < 3; i++) {
    const game = createHearthValeGame({ saved });
    assert.equal(game.save(), saved);
    const restored = fixture({ saved: game.save() });
    assert.deepEqual(Array.from({ length: 6 }, () => draw(restored)), future);
    assert.equal(restored.save(), original.save());
  }
});

test('normal HearthVale day choices and M0 hook draws use one saved RNG stream', () => {
  const a = createHearthValeGame({ definition: sixPillarFixture(), seed: 31 });
  a.endDay();
  const saved = a.save();
  const first = fixture({ saved }); draw(first);
  const after = createHearthValeGame({ saved: first.save() }); after.endDay();
  const replay = fixture({ saved }); draw(replay);
  const replayGame = createHearthValeGame({ saved: replay.save() }); replayGame.endDay();
  assert.equal(after.save(), replayGame.save());
});
