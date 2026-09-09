// Placeholder content for the foundation proof; no legacy material is migrated.
export const bootstrapContent = {
  location: { id: 'HV_TOWN_SQUARE', name: 'HearthVale Town Square' },
  actors: [
    {
      id: 'HV_ROWAN', name: 'Rowan', controller: 'Human',
      baseStats: { resolve: 1 }, traits: ['curious'], mainGoal: 'find-a-place-in-town',
    },
    {
      id: 'HV_ELLIS', name: 'Ellis', controller: 'Autonomous',
      baseStats: { resolve: 2 }, traits: ['patient'], mainGoal: 'care-for-the-town',
    },
  ],
};
