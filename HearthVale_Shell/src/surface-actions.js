import { surfaceCatalog } from '../../HearthVale_Content/surface.js';
import { miraResponses } from '../../HearthVale_Story/surface.js';
import { surfaceState } from './surface-world.js';
import { sleepEffects } from './surface-day.js';
import { activeExpedition } from './pit.js';

const stateEffect = (world, changes) => ({ type: 'global', key: 'hearthvaleSurface', value: { ...surfaceState(world), ...changes } });
const atStage = stage => ({ world, attempt }) => surfaceState(world).stage === stage
  && !world.globals.hearthvaleCompletion?.completed
  && world.entities[attempt.actor]?.lifecycle==='active'&&!world.entities[attempt.actor]?.data.death
  && world.entities[attempt.actor].data.attributes.resources.hearts>0&&world.entities[attempt.actor].data.attributes.resources.sanity>0
  && surfaceState(world).playerId === attempt.actor && !activeExpedition(world)
  && !world.entities.hv_pit_1?.data.pendingFinalHeart && !world.entities.hv_pit_1?.data.pendingDeath;
const player = (world, attempt) => world.entities[attempt.actor];

export const surfaceActions = {
  'surface.arrive': {
    eligible: atStage('arrival'),
    resolve: ({ world }) => ({ type: 'hearthvale.inn-arrival', effects: [stateEffect(world, { stage: 'mira' })] }),
  },
  'surface.answer-mira': {
    eligible: context => atStage('mira')(context) && miraResponses.some(r => r.id === context.attempt.params.response),
    resolve: ({ world, attempt }) => ({ type: 'hearthvale.mira-answered', effects: [
      stateEffect(world, { stage: 'mira-reply', miraResponse: attempt.params.response }),
    ] }),
  },
  'surface.finish-mira': {
    eligible: atStage('mira-reply'),
    resolve: ({ world }) => ({ type: 'hearthvale.mira-met', effects: [
      stateEffect(world, { stage: 'surface', miraComplete: true }),
    ] }),
  },
  Move: {
    eligible: context => atStage('surface')(context) && ['loc_surface', ...surfaceCatalog.locations.map(l => l.id)]
      .includes(context.attempt.params.location),
  },
  'surface.sleep': {
    eligible: context => atStage('surface')(context) && player(context.world, context.attempt).primaryLocation === 'loc_inn'
      && context.attempt.params.confirmed === true
      && context.attempt.params.day === surfaceState(context.world).calendar.day,
    resolve: ({ world, attempt }, { rng }) => ({ type: 'hearthvale.surface-day-ended', data: { completedDay: attempt.params.day },
      effects: sleepEffects(world, player(world, attempt), rng) }),
  },
};
