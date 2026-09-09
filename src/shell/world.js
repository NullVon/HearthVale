import { bootstrapContent } from '../content/bootstrap.js';
import { createActor } from './actors.js';

export function createWorld() {
  const { location, actors } = bootstrapContent;
  const people = actors.map(actor => createActor(actor, location.id));
  if (people.filter(actor => actor.actor.controller === 'Human').length !== 1) {
    throw new Error('A HearthVale world requires exactly one Player Controller');
  }
  return {
    entities: [
      { id: location.id, type: 'hearthvale.location', lifecycle: 'active', data: { name: location.name, persistence: 'permanent' } },
      ...people,
    ],
    globals: {
      hearthvale: { schemaVersion: 1, initialized: false, calendar: { day: 1, week: 1, chapter: 1, generation: 1 } },
    },
  };
}
