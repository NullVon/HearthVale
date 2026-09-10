import { createHearthValeRuntime } from './index.js';
import { BEGIN_DAY_END, FINISH_DAY_END, autonomousActors } from './progression.js';
import { activeExpedition } from './pit.js';
import { PREPARE_SUCCESSION, COMPLETE_SUCCESSION, pendingSuccession, successorOptions } from './succession.js';

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
      // Refresh immutable routing after control changes, using only public checkpoints.
      const roster = state => Object.values(state.entities).filter(e => e.actor && e.lifecycle === 'active')
        .map(e => [e.id, e.actor.controller]);
      if (JSON.stringify(roster(current)) !== JSON.stringify(roster(world()))) {
        runtime = createHearthValeRuntime({ saved: runtime.save() });
      }
      return result;
    } catch (error) {
      // A malformed command must not strand presentation in an open Core Scene.
      // Restore this uncompleted command's checkpoint through Core's public API.
      runtime = createHearthValeRuntime({ saved: checkpoint });
      throw error;
    }
  }
  function beginDayEnd() {
    if (pendingSuccession(world())) throw new Error('Complete prepared succession before ending the Day');
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
      if (pendingSuccession(world())) throw new Error('Complete prepared succession before player Actions');
      if ((world().globals.hearthvale.progression?.phase ?? 'active') !== 'active') throw new Error('Finish Day completion before player Actions');
      if ([PREPARE_SUCCESSION, COMPLETE_SUCCESSION].includes(input.type)) throw new Error('Use the explicit succession commands');
      if ([BEGIN_DAY_END, FINISH_DAY_END].includes(input.type)) throw new Error('Use the explicit Day commands');
      return scene([{ ...input, actor: playerId() }]);
    },
    beginDayEnd,
    successionOptions: () => successorOptions(world(), playerId()).filter(candidate => runtime.view(playerId())
      .some(c => c.claim.subject === candidate.actor && c.claim.key === 'succession-option')),
    beginSuccession: successor => {
      const from = playerId();
      if (!successorOptions(world(), from).some(c => c.actor === successor)
        || !runtime.view(from).some(c => c.claim.subject === successor && c.claim.key === 'succession-option')) {
        throw new Error('Successor is ineligible or succession timing/routing is not valid');
      }
      const preSuccessionSave = runtime.save();
      scene([{ actor: from, type: PREPARE_SUCCESSION, targets: [successor] }]);
      return Object.freeze({ preSuccessionSave, preparedSave: runtime.save() });
    },
    completeSuccession: () => {
      if (!pendingSuccession(world())) throw new Error('No prepared succession');
      const result = scene([{ actor: playerId(), type: COMPLETE_SUCCESSION }]);
      if (pendingSuccession(world())) throw new Error('Prepared succession is no longer valid');
      return result;
    },
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
