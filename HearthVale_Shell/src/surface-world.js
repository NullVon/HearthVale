import { surfaceCatalog } from '../../HearthVale_Content/surface.js';
import { generateCandidates, instantiateSurfaceActor } from './surface-candidates.js';
import { openingCards } from '../../HearthVale_Story/surface.js';

export const surfaceState = world => world.globals.hearthvaleSurface;
export function createSurfaceWorld() {
  return {
    entities: [
      { id: 'loc_surface', type: 'hearthvale.location', data: { name: 'HearthVale', persistence: 'permanent' } },
      ...surfaceCatalog.locations.map(place => ({ id: place.id, type: 'hearthvale.location',
        data: { name: place.label, persistence: 'permanent' } })),
      ...surfaceCatalog.actors.map((profile, index) => instantiateSurfaceActor(profile,
        { id: `hv_actor_${index + 1}`, location: profile.location })),
      { id: 'hv_pit_1', type: 'hearthvale.pit', primaryLocation: 'loc_pit_entrance', data: {
        persistence: 'permanent', strata: [{ number: 1, exists: true, proceduralFloors: [1, 9],
          guardian: { templateId: 'enemy_ruin_brute', floor: 10, alive: true }, sunkenSquareDiscovered: false },
        { number: 2, locked: true, playable: false }],
      } },
    ],
    globals: { hearthvaleSurface: { save_schema_version: 1, initialized: false,
      calendar: { year: 1, day: 1, week: 1 }, stage: 'history', openingCard: 0,
      candidates: [], playerId: null, couldHaveId: null, nextActorInstance: 7,
      openingComplete: false, miraComplete: false, miraResponse: null,
    } },
  };
}

// Pre-player intentions have no fictional Actor. Core world-process events
// create the initial cohort and resolve selection without a tutorial Actor.
export function openingProcess(world, rng, intent) {
  const state = surfaceState(world);
  const update = value => [{ type: 'global', key: 'hearthvaleSurface', value }];
  if (!state.initialized) return [{ type: 'hearthvale.surface-created', effects: update({ ...state,
    initialized: true, candidates: generateCandidates(rng, state.nextActorInstance,
      Object.values(world.entities).filter(e => e.actor).map(e => e.data.identity.name)),
    nextActorInstance: state.nextActorInstance + 3,
  }) }];
  if (!intent) return [];
  if (intent.type === 'opening-next' && state.stage === 'history') {
    const last = state.openingCard === openingCards.length - 1;
    return [{ type: 'hearthvale.opening-progressed', effects: update({ ...state,
      openingCard: last ? state.openingCard : state.openingCard + 1,
      stage: last ? 'candidates' : 'history', openingComplete: last,
    }) }];
  }
  if (intent.type === 'choose' && state.stage === 'candidates') {
    const selected = state.candidates.find(candidate => candidate.id === intent.id);
    if (!selected) throw new Error('Unknown candidate');
    // No extra roll or modification of the retained rejected profile.
    const retained = state.candidates.find(candidate => candidate.id !== selected.id);
    return [{ type: 'hearthvale.player-selected', data: { player: selected.id, couldHave: retained.id }, effects: [
      { type: 'create', entity: instantiateSurfaceActor(selected, { controller: 'Human' }) },
      { type: 'data', entity: selected.id, key:'generation', value:1 },
      { type: 'data', entity: selected.id, key:'arrived', value:structuredClone(state.calendar) },
      { type: 'create', entity: instantiateSurfaceActor(retained) },
      ...update({ ...state, stage: 'arrival', candidates: [], playerId: selected.id, couldHaveId: retained.id }),
    ] }];
  }
  throw new Error('Opening intention is unavailable');
}
