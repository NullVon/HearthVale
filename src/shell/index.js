import { createRuntime } from './core.js';
import { createWorld } from './world.js';

export function createHearthValeShell() {
  return Object.freeze({
    worldProcesses: ({ world }) => world.globals.hearthvale.initialized ? [] : [{
      type: 'hearthvale.world-started',
      data: { significance: 'historical' },
      effects: [{
        type: 'global', key: 'hearthvale',
        value: { ...world.globals.hearthvale, initialized: true },
      }],
    }],
    // Direct experience of one's starting location, never a global knowledge copy.
    perceive: ({ event, world }) => event.event.type === 'hearthvale.world-started'
      ? Object.values(world.entities).filter(entity => entity.actor).map(actor => ({
        actor: actor.id,
        claim: { subject: actor.id, key: 'primaryLocation', value: actor.primaryLocation },
      })) : [],
    available: ({ actor }) => [{ actor: actor.id, type: 'Wait' }],
    // Daily autonomy is a later milestone; ordinary bootstrap Scenes grant none.
    offscreenActors: () => [],
    choices: () => [],
  });
}

export function createHearthValeRuntime({ seed = 1, saved } = {}) {
  const shell = createHearthValeShell();
  if (saved !== undefined) {
    const runtime = createRuntime({ saved, shell });
    const world = runtime.snapshot().world;
    if (world.globals.hearthvale?.schemaVersion !== 1 || world.globals.hearthvale.initialized !== true) {
      throw new Error('Unsupported HearthVale world schema or incomplete bootstrap');
    }
    const people = Object.values(world.entities).filter(entity => entity.actor && entity.lifecycle === 'active');
    if (people.filter(actor => actor.actor.controller === 'Human').length !== 1) {
      throw new Error('A HearthVale world requires exactly one Player Controller');
    }
    return runtime;
  }
  const runtime = createRuntime({ ...createWorld(), shell, seed });
  runtime.startScene({ kind: 'hearthvale.bootstrap' });
  runtime.resolveScene({ offscreenBudget: 0 });
  return runtime;
}
