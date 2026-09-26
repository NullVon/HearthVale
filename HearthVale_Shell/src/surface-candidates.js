import { STATS } from '../../HearthVale_Content/schema.js';
import { validateCandidate } from '../../HearthVale_Content/validation.js';
import { surfaceCatalog, candidateNames } from '../../HearthVale_Content/surface.js';
import { createActor, deriveConstitutionValues, baselineResources } from './actors.js';

const pick = (pool, rng) => pool[Math.floor(rng.next() * pool.length)];

// Called only inside a resolving Core hook; the RNG never escapes resolution.
export function generateCandidates(rng, firstInstance = 7, usedNames = []) {
  const names = candidateNames.filter(name => !usedNames.includes(name));
  return Array.from({ length: 3 }, (_, index) => {
    const stats = Object.fromEntries(STATS.map(stat => [stat, 1]));
    for (let point = 0; point < 6; point++) {
      const eligible = STATS.filter(stat => stats[stat] < 3 || (stats[stat] === 3 && !Object.values(stats).includes(4)));
      stats[pick(eligible, rng)]++;
    }
    const traits = [];
    for (let draw = 0; draw < 2; draw++) {
      const eligible = surfaceCatalog.traits.filter(trait => !traits.includes(trait.id)
        && !trait.incompatible.some(id => traits.includes(id)));
      const rare = eligible.find(trait => trait.id === 'trait_lucky_bastard');
      traits.push(rare && rng.next() < rare.perDrawChance / 100 ? rare.id
        : pick(eligible.filter(trait => trait.id !== 'trait_lucky_bastard'), rng).id);
    }
    const weapons = ['item_sword', 'item_hammer', 'item_bow'];
    weapons.splice(Math.floor(rng.next() * weapons.length), 1);
    const label = pick(names, rng); names.splice(names.indexOf(label), 1);
    const candidate = {
      id: `hv_actor_${firstInstance + index}`, label, age: 18 + Math.floor(rng.next() * 13), hearts: 3, stats, traits,
      loadout: { weapons, armor: ['item_chest_armor'], items: [{ item: 'item_hp_potion_basic', quantity: 1 }],
        arrows: weapons.includes('item_bow') ? 10 : 0, gold: 45,
        spells: rng.next() < 0.3 ? [pick(surfaceCatalog.spells.filter(spell => spell.startingEligible), rng).id] : [], spellSlots: 4 },
    };
    return validateCandidate(candidate, surfaceCatalog);
  });
}

export function derivedActorValues(actor) {
  const { baseStats, traits } = actor.data.attributes;
  const values=deriveConstitutionValues(baseStats.CON, traits.flatMap(id => surfaceCatalog.traits.find(t => t.id === id).effects));
  return {...values,maxHp:values.maxHp+(actor.data.expeditionHp??0)};
}

// Templates/profiles are converted once. Inventory instances are stored only
// in these slots, not duplicated in a second starting-loadout resource model.
export function instantiateSurfaceActor(profile, { id = profile.id, controller = 'Autonomous', location = 'loc_inn' } = {}) {
  const actor = createActor({ id, name: profile.label, controller, baseStats: profile.stats, traits: profile.traits,
    mainGoal: profile.goal ?? 'Find a place in HearthVale' }, location);
  actor.data.identity = { name: profile.label, ...(profile.age === undefined ? {} : { age: profile.age }) };
  if (id !== profile.id) actor.data.templateId = profile.id;
  const { maxHp } = derivedActorValues(actor);
  actor.data.attributes.resources = { ...baselineResources, hearts: profile.hearts, hp: maxHp,
    gold: profile.loadout.gold, arrows: profile.loadout.arrows, xp: 0, essence: 0 };
  let sequence = 0;
  const item = (templateId, quantity = 1) => {
    const definition = surfaceCatalog.items.find(i => i.id === templateId);
    return { id: `${id}_item_${++sequence}`, templateId, quantity,
      ...(definition.maxDurability ? { durability: definition.maxDurability } : {}) };
  };
  const slots = (values, size) => [...values, ...Array(size - values.length).fill(null)];
  actor.data.inventory = {
    equipped: slots(profile.loadout.weapons.map(id => item(id)), 4),
    bag: slots(profile.loadout.items.map(entry => item(entry.item, entry.quantity)), 8),
    chest: profile.loadout.armor.length ? item(profile.loadout.armor[0]) : null,
    spells: slots(profile.loadout.spells, 4), nextItemInstance: sequence + 1,
  };
  actor.data.scars = [];
  return actor;
}
