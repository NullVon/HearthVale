import { createHearthValeRuntime } from './index.js';
import { BEGIN_DAY_END, FINISH_DAY_END, autonomousActors } from './progression.js';
import { activeExpedition } from './pit.js';

// Thin command adapter: Core remains the only simulation and persistence engine.
export function createHearthValeGame(options = {}) {
  let runtime = createHearthValeRuntime(options);
  const world = () => runtime.snapshot().world;
  const playerId = () => Object.values(world().entities).find(actor => actor.actor?.controller === 'Human' && actor.lifecycle === 'active').id;
  function scene(attempts, offscreen = false) {
    const current = world();
    const checkpoint = runtime.save();
    try {
      runtime.startScene({ kind: offscreen ? 'hearthvale.day-decisions' : 'hearthvale.action' });
      for (const attempt of attempts) runtime.submit(attempt);
      const result = runtime.resolveScene({ offscreenBudget: offscreen ? autonomousActors(current).length : 0 });
      if (result.phase !== 'stabilized') throw new Error('Command exceeded its causal budget');
      return result;
    } catch (error) {
      // A malformed command must not strand presentation in an open Core Scene.
      // Restore this uncompleted command's checkpoint through Core's public API.
      runtime = createHearthValeRuntime({ saved: checkpoint });
      throw error;
    }
  }
  function beginDayEnd() {
    if (activeExpedition(world())) throw new Error('Return from the Pit before ending the Day');
    const current = world().globals.hearthvale;
    if ((current.progression?.phase ?? 'active') !== 'active') throw new Error('Day is already closing');
    return scene([{ actor: playerId(), type: BEGIN_DAY_END, params: { day: current.calendar.day } }], true);
  }
  function finishDayEnd() {
    const current = world();
    if (current.globals.hearthvale.progression?.phase !== 'closing') throw new Error('Day is not closing');
    if (!autonomousActors(current).every(actor => actor.data.daily?.decidedDay === current.globals.hearthvale.calendar.day)) {
      throw new Error('Daily decisions must finish before calendar advancement');
    }
    return scene([{ actor: playerId(), type: FINISH_DAY_END, params: { day: current.globals.hearthvale.calendar.day } }]);
  }
  const reads = Object.fromEntries(['snapshot', 'entity', 'view', 'available', 'history', 'trace', 'why', 'save']
    .map(name => [name, (...args) => runtime[name](...args)]));
  return Object.freeze({
    perform: input => {
      if ((world().globals.hearthvale.progression?.phase ?? 'active') !== 'active') throw new Error('Finish Day completion before player Actions');
      if ([BEGIN_DAY_END, FINISH_DAY_END].includes(input.type)) throw new Error('Use the explicit Day commands');
      return scene([{ ...input, actor: playerId() }]);
    },
    beginDayEnd,
    finishDayEnd,
    endDay: () => {
      if ((world().globals.hearthvale.progression?.phase ?? 'active') === 'active') beginDayEnd();
      else if (!autonomousActors(world()).every(actor => actor.data.daily?.decidedDay === world().globals.hearthvale.calendar.day)) scene([], true);
      return finishDayEnd();
    },
    ...reads,
    // Public shared source for recognized discoveries only, not an objective-world dump.
    sharedDiscoveries: () => runtime.snapshot().world.globals.hearthvaleDiscoveries ?? Object.freeze({}),
  });
}
