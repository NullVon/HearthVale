import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveConstitutionValues, constitutionCheckBonus } from '../HearthVale_Shell/src/actors.js';
import { validateCatalog } from '../HearthVale_Content/validation.js';
import { validCatalog, fixtureResolvers as resolvers } from './fixtures/v1-content.js';

test('Hardy grants direct HP and scoped resilience checks without modifying authored CON', () => {
  const catalog = validCatalog(); validateCatalog(catalog, { resolvers });
  const effects = catalog.traits.find(t => t.id === 'trait_hardy').effects;
  for (const [id, con, hp] of [['actor_auron', 3, 18], ['actor_mira', 2, 16]]) {
    const actor = catalog.actors.find(a => a.id === id), before = structuredClone(actor);
    assert.deepEqual(deriveConstitutionValues(actor.stats.CON, effects), { effectiveCon: con, maxHp: hp, naturalArmor: 1 });
    assert.equal(constitutionCheckBonus(effects, { physicalResilience: true }), 2);
    assert.equal(constitutionCheckBonus(effects), 0);
    assert.deepEqual(actor, before);
  }
});

test('resilience bonus cannot enter derived HP, Natural Armor or general CON consumers', () => {
  const effects = validCatalog().traits.find(t => t.id === 'trait_hardy').effects;
  for (const con of [1, 2, 3, 4, 6]) {
    const plain = deriveConstitutionValues(con), hardy = deriveConstitutionValues(con, effects);
    assert.equal(hardy.maxHp - plain.maxHp, 2);
    assert.equal(hardy.naturalArmor, plain.naturalArmor);
    // Training/prerequisites consume the same effective CON, never a check total.
    assert.equal(hardy.effectiveCon, plain.effectiveCon);
    assert.equal(hardy.effectiveCon >= 4, con >= 4);
    assert.equal(constitutionCheckBonus(effects, { physicalResilience: false }), 0);
  }
  const checkOnly = effects.filter(e => e.tag === 'effect_con_physical_resilience_check');
  assert.deepEqual(deriveConstitutionValues(3, checkOnly), deriveConstitutionValues(3));
});

test('Hardy validation rejects missing, doubled, broad or extra stat effects', () => {
  const invalid = [
    [{ tag: 'effect_max_hp', value: 2 }],
    [{ tag: 'effect_max_hp', value: 6 }, { tag: 'effect_con_physical_resilience_check', value: 2 }],
    [{ tag: 'effect_max_hp', value: 2 }, { tag: 'effect_general_con', value: 2 }],
    [{ tag: 'effect_max_hp', value: 2 }, { tag: 'effect_con_physical_resilience_check', value: 4 }],
    [{ tag: 'effect_max_hp', value: 2 }, { tag: 'effect_con_physical_resilience_check', value: 2 }, { tag: 'effect_general_con', value: 2 }],
  ];
  for (const effects of invalid) {
    const c = validCatalog();
    c.tags.push({ id: 'effect_general_con', label: 'Invalid Hardy stat modifier fixture', domain: 'effect' });
    c.traits.find(t => t.id === 'trait_hardy').effects = effects;
    assert.throws(() => validateCatalog(c, { resolvers }), /Hardy requires.*no general CON modifier/);
  }
});
