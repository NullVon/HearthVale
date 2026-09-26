export const baselineResources = Object.freeze({ ap: 4, maxAp: 4, sanity: 5, maxSanity: 5 });

// Pure V1 formula boundary for validated authored effects. Check modifiers
// never change the supplied effective CON (or the Actor's stored base stats).
export function deriveConstitutionValues(effectiveCon, effects = []) {
  if (!Number.isSafeInteger(effectiveCon) || effectiveCon < 1) throw new Error('Invalid effective CON');
  const directHp = effects.filter(effect => effect.tag === 'effect_max_hp').reduce((sum, effect) => sum + effect.value, 0);
  return { effectiveCon, maxHp: 10 + 2 * effectiveCon + directHp, naturalArmor: Math.floor(effectiveCon / 2) };
}

export function constitutionCheckBonus(effects = [], { physicalResilience = false } = {}) {
  return physicalResilience ? effects.filter(effect => effect.tag === 'effect_con_physical_resilience_check')
    .reduce((sum, effect) => sum + effect.value, 0) : 0;
}

export function createActor({ id, name, controller, baseStats, traits, mainGoal, resources = baselineResources, decisionWeights = { goal: 0, help: 0, idle: 1 } }, location) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Actor identity requires a name');
  if (!['Human', 'Autonomous'].includes(controller)) throw new Error('Invalid HearthVale controller');
  if (typeof mainGoal !== 'string' || !mainGoal.trim()) throw new Error('Actor requires exactly one Main Goal');
  if (!baseStats || typeof baseStats !== 'object' || Array.isArray(baseStats)
    || !Object.values(baseStats).every(Number.isFinite)) throw new Error('Actor base stats must be finite numeric values');
  if (!Array.isArray(traits) || !traits.every(t => typeof t === 'string' && t.trim())) throw new Error('Actor traits must be names');
  if (!resources || !['ap', 'maxAp', 'sanity', 'maxSanity'].every(key => Number.isFinite(resources[key]) && resources[key] >= 0)
    || resources.ap > resources.maxAp || resources.sanity > resources.maxSanity) throw new Error('Invalid Actor resources');
  if (!['goal', 'help', 'idle'].every(key => Number.isFinite(decisionWeights?.[key]) && decisionWeights[key] >= 0)
    || !Number.isFinite(decisionWeights.goal + decisionWeights.help + decisionWeights.idle)) throw new Error('Invalid decision weights');
  if (['hearthvale.help-desire', 'hearthvale.idle-desire'].includes(mainGoal)) throw new Error('Main Goal uses a reserved desire ID');
  return {
    id, type: 'hearthvale.actor', lifecycle: 'active', primaryLocation: location,
    actor: { controller },
    data: {
      persistence: 'living', identity: { name }, mainGoal,
      attributes: structuredClone({ baseStats, traits, resources }),
      decisionWeights: structuredClone(decisionWeights),
    },
  };
}
