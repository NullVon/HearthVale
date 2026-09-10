import { bootstrapContent } from '../fixtures/bootstrap-fixture.js';
import { createActor } from './actors.js';
import { makeHelpSituation } from './situations.js';
import { createPit } from './pit.js';

export function createWorld(definition = bootstrapContent) {
  const { location, actors, opportunities = [], additionalLocations = [] } = definition;
  const people = actors.map(actor => createActor(actor, actor.location ?? location.id));
  if (people.filter(actor => actor.actor.controller === 'Human').length !== 1) {
    throw new Error('A HearthVale world requires exactly one Player Controller');
  }
  const player = people.find(actor => actor.actor.controller === 'Human').id;
  if (definition.pit && [definition.pit.id, location.id, ...additionalLocations.map(place => place.id), ...people.map(actor => actor.id)]
    .includes(definition.pit.discovery?.id)) throw new Error('Pit discovery ID must not collide with an existing Entity');
  for (const opportunity of opportunities) {
    makeHelpSituation(opportunity, player);
    if (!people.some(actor => actor.id === opportunity.beneficiary)) throw new Error('Help beneficiary must be an Actor');
  }
  return {
    entities: [
      { id: location.id, type: 'hearthvale.location', lifecycle: 'active', data: { name: location.name, persistence: 'permanent' } },
      ...additionalLocations.map(place => ({ id: place.id, type: 'hearthvale.location', data: { name: place.name, persistence: 'permanent' } })),
      ...people,
      ...(definition.pit ? [createPit(definition.pit, location.id)] : []),
    ],
    globals: {
      hearthvale: {
        schemaVersion: 1, initialized: false, calendar: { day: 1, week: 1, chapter: 1, generation: 1 },
        progression: { phase: 'active' }, opportunityDefinitions: structuredClone(opportunities),
      },
      hearthvaleWeekly: { persistence: 'ephemeral', week: 1, reconciliations: 0 },
    },
  };
}
