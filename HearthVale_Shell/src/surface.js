import { createRuntime } from './core.js';
import { createSurfaceWorld, openingProcess, surfaceState } from './surface-world.js';
import { surfaceActions } from './surface-actions.js';
import { expeditionActions, expeditionChoices } from './expedition-actions.js';
import { validateExpeditionState } from './expedition-lifecycle.js';
import { serviceActions,serviceChoices,serviceArrivalEvents } from './service-actions.js';
import { validateServices } from './economy.js';
import { situationDayEvents } from './living-situations.js';
import { informationPerceptions, rumorEvents } from './information.js';
import { weeklyEvents, weeklyConsequences } from './weekly.js';
import { deathEvents } from './death.js';
import { successionEvents,validateSuccession } from './surface-succession.js';
import { completionReason,completionEvent,demoComplete } from './completion.js';
import { sleepEffects } from './surface-day.js';

const actions = { ...surfaceActions, ...expeditionActions,...serviceActions };

export function createSurfaceShell(openingIntent) {
  return {
    actions: { ...actions,
      ...Object.fromEntries(['Take', 'Give', 'Communicate', 'Interact', 'Wait'].map(type => [type, { eligible: () => false }])),
    },
    perceive: informationPerceptions,
    consequences: weeklyConsequences,
    worldProcesses: ({ world }, { rng }) => {
      if(demoComplete(world))return [];
      if(openingIntent?.type==='completion-finalize')return completionEvent(world,openingIntent.reason);
      if(openingIntent?.type==='completion-death-boundary')return [{type:'hearthvale.final-day-boundary',effects:
        sleepEffects(world,world.entities[surfaceState(world).playerId],rng,{rest:false})}];
      if(openingIntent?.type.startsWith('succession-'))return successionEvents(world,rng,openingIntent);
      const deaths=deathEvents(world);
      return deaths.length?deaths:[...openingProcess(world, rng, openingIntent),...serviceArrivalEvents(world),...situationDayEvents(world,rng),...rumorEvents(world,rng),...weeklyEvents(world)];
    },
  };
}

export function validateSurfaceSave(runtime) {
  const world = runtime.snapshot().world, state = surfaceState(world);
  validateExpeditionState(world);
  validateServices(world);
  validateSuccession(world);
  if (state?.save_schema_version !== 1 || !state.initialized
    || !['history', 'candidates', 'arrival', 'mira', 'mira-reply', 'surface'].includes(state.stage)) {
    throw new Error('Unsupported or incomplete Surface save');
  }
  const humans = Object.values(world.entities).filter(e => e.actor?.controller === 'Human');
  if (state.playerId ? humans.length !== 1 || humans[0].id !== state.playerId
    || !world.entities[state.couldHaveId]?.actor || state.candidates.length !== 0
    : humans.length !== 0 || state.candidates.length !== 3) throw new Error('Invalid Surface Actor selection');
}

// Thin adapter. Core owns all state, atomic effects, PRNG, and save serialization.
export function createSurfaceGame({ seed = 1, saved } = {}) {
  let runtime = saved === undefined ? createRuntime({ ...createSurfaceWorld(), seed, shell: createSurfaceShell() })
    : createRuntime({ saved, shell: createSurfaceShell() });
  if (saved === undefined) {
    runtime.startScene({ kind: 'hearthvale.surface-bootstrap' });
    runtime.resolveScene({ offscreenBudget: 0 });
  }
  validateSurfaceSave(runtime);
  function resolve(intent, attempt) {
    if(demoComplete(runtime.snapshot().world))throw new Error('Action unavailable: the demo is complete');
    const checkpoint = runtime.save();
    const before=runtime.snapshot().world;
    try {
      function settle(nextIntent,nextAttempt) {
        runtime = createRuntime({ saved: runtime.save(), shell: createSurfaceShell(nextIntent) });
        runtime.startScene({ kind: 'hearthvale.surface' });
        if(nextAttempt)runtime.submit(nextAttempt);
        const result=runtime.resolveScene({offscreenBudget:0});
        if(result.phase!=='stabilized')throw new Error('Surface command exceeded its causal budget');
        return result;
      }
      const result=settle(intent,attempt);
      // One synchronous public command owns these bounded Core scenes. No UI or
      // save can observe an intermediate cursor; any failure restores checkpoint.
      // Death archives first, then closes the final Day without rest/revival.
      let after=runtime.snapshot().world;
      const s=surfaceState(after),actor=after.entities[s.playerId];
      if(s.calendar.day===40&&actor?.data.death&&actor.data.lifeRecord){
        settle({type:'completion-death-boundary'});
        settle(); // Normal Situation generation, Information and Week-8 history.
        after=runtime.snapshot().world;
      }
      const reason=completionReason(before,after);
      if(reason)settle({type:'completion-finalize',reason});
      validateSurfaceSave(runtime);
      runtime = createRuntime({ saved: runtime.save(), shell: createSurfaceShell() });
      return result;
    } catch (error) {
      runtime = createRuntime({ saved: checkpoint, shell: createSurfaceShell() });
      throw error;
    }
  }
  return Object.freeze({
    snapshot: () => runtime.snapshot(), save: () => runtime.save(),
    expeditionChoices: () => expeditionChoices(runtime.snapshot().world),
    serviceChoices: () => serviceChoices(runtime.snapshot().world),
    // Legacy pending M2/M3 saves remain exact on load; explicitly resume their
    // adjudication without submitting an ordinary gameplay action.
    adjudicateDeath: () => {
      const world=runtime.snapshot().world,s=surfaceState(world);
      if(demoComplete(world))return null;
      return deathEvents(world).length || s.calendar.day===40&&world.entities[s.playerId]?.data.death
        ? resolve(undefined) : null;
    },
    openingNext: () => resolve({ type: 'opening-next' }),
    choose: id => resolve({ type: 'choose', id }),
    beginSuccession: () => resolve({type:'succession-begin'}),
    chooseSuccessor: id => resolve({type:'succession-choose',id}),
    perform: (type, params = {}) => {
      const world = runtime.snapshot().world;
      const attempt = { actor: surfaceState(world).playerId, type, params, targets: [] };
      if (!actions[type]?.eligible({ world, attempt })) throw new Error('Surface action is unavailable');
      return resolve(undefined, attempt);
    },
  });
}
