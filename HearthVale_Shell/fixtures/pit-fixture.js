import { sixPillarFixture } from './six-pillar-fixture.js';

export const pitIds = Object.freeze({ pit: 'pit_test', namedLocation: 'named_location_test' });

export function pitFixture() {
  const definition = sixPillarFixture();
  definition.opportunities = [];
  definition.actors[1].decisionWeights = { goal: 1, help: 0, idle: 0 };
  definition.pit = {
    id: pitIds.pit,
    discovery: { id: pitIds.namedLocation, name: 'Named location test', afterSteps: 2 },
  };
  return definition;
}
