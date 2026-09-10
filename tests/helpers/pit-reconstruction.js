// Test-only scheduling of the Shell lifecycle operation. No production Chapter command.
import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createHearthValeShell } from '../../HearthVale_Shell/src/index.js';
import { activeExpedition, reconstructPitEffects } from '../../HearthVale_Shell/src/pit.js';

export const RECONSTRUCT_TEST = 'pit_reconstruction_test';

export function reconstructAtTestBoundary(saved, pitId) {
  const world = createRuntime({ saved }).snapshot().world;
  const actors = Object.values(world.entities).filter(entity => entity.actor && entity.lifecycle === 'active');
  const shell = createHearthValeShell({ autonomousIds: actors.filter(actor => actor.actor.controller === 'Autonomous').map(actor => actor.id) });
  const runtime = createRuntime({ saved, shell: {
    ...shell,
    actions: { ...shell.actions, [RECONSTRUCT_TEST]: {
      eligible: ({ world, attempt }) => !activeExpedition(world)
        && world.entities[attempt.actor].actor.controller === 'Human'
        && world.globals.hearthvale.progression.phase === 'active',
      resolve: ({ world, attempt }) => ({ type: 'hearthvale.pit-reconstructed', data: { pit: attempt.targets[0], boundary: 'test-only' },
        effects: reconstructPitEffects(world, attempt.targets[0]) }),
    } },
  } });
  runtime.startScene({ kind: 'test-only-pit-reconstruction' });
  runtime.submit({ actor: actors.find(actor => actor.actor.controller === 'Human').id, type: RECONSTRUCT_TEST, targets: [pitId] });
  runtime.resolveScene({ offscreenBudget: 0 });
  return runtime.save();
}
