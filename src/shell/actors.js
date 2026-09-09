export const baselineResources = Object.freeze({ ap: 4, maxAp: 4, sanity: 5, maxSanity: 5 });

export function createActor({ id, name, controller, baseStats, traits, mainGoal, resources = baselineResources }, location) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Actor identity requires a name');
  if (!['Human', 'Autonomous'].includes(controller)) throw new Error('Invalid HearthVale controller');
  if (typeof mainGoal !== 'string' || !mainGoal.trim()) throw new Error('Actor requires exactly one Main Goal');
  if (!baseStats || typeof baseStats !== 'object' || Array.isArray(baseStats)
    || !Object.values(baseStats).every(Number.isFinite)) throw new Error('Actor base stats must be finite numeric values');
  if (!Array.isArray(traits) || !traits.every(t => typeof t === 'string' && t.trim())) throw new Error('Actor traits must be names');
  if (!resources || !['ap', 'maxAp', 'sanity', 'maxSanity'].every(key => Number.isFinite(resources[key]) && resources[key] >= 0)
    || resources.ap > resources.maxAp || resources.sanity > resources.maxSanity) throw new Error('Invalid Actor resources');
  return {
    id, type: 'hearthvale.actor', lifecycle: 'active', primaryLocation: location,
    actor: { controller },
    data: {
      persistence: 'living', identity: { name }, mainGoal,
      attributes: structuredClone({ baseStats, traits, resources }),
    },
  };
}
