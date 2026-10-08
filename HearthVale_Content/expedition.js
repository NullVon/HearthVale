import { surfaceCatalog } from './surface.js';
import { validateCatalog } from './validation.js';
import { addEquipment } from './equipment.js';
import { addEncounters } from './encounters.js';
import { addPitEvents } from './pit-events.js';
import { addSanityContent } from './sanity.js';
import { addDialogue } from './dialogue.js';

// Deliberately limited M2 encounter set. Values for creatures/spells/materials
// come from Content sections 10–12; room prose/keepsakes are M2 fixtures.
const catalog = structuredClone(surfaceCatalog);
catalog.tags.push(...['poison', 'cure', 'unlock', 'return'].map(name => ({ id: `effect_${name}`, label: name, domain: 'effect' })));
catalog.spells.push(
  { id: 'spell_unlock', label: 'Unlock', cost: 4, target: 'lock', effects: [{ tag: 'effect_unlock', value: 1 }], explorationOnly: true, startingEligible: false },
  { id: 'spell_teleport', label: 'Teleport', cost: 8, target: 'return', effects: [{ tag: 'effect_return', value: 1 }], explorationOnly: false, startingEligible: false },
);
catalog.items.push(
  ...[['moonleaf', 3], ['bitterroot', 3], ['bigshroom', 5], ['iron_ore', 8], ['slime_core', 4], ['beetle_shell', 5], ['venom_gland', 8]]
    .map(([name, sellValue]) => ({ id: `item_${name}`, label: name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), category: 'material', sellValue, stackable: true, effects: [], contexts: [] })),
  { id: 'item_m2_keepsake', label: 'Worn Keepsake', category: 'valuable', sellValue: 5, stackable: true, effects: [], contexts: [] },
  ...[['antidote', 'Antidote'], ['cleanse_tonic', 'Cleanse Tonic']].map(([name, label]) => ({ id: `item_${name}`, label,
    category: 'consumable', price: 0, stackable: true, freeAction: true, wastefulEligible: true,
    effects: [{ tag: 'effect_cure', value: 1 }], contexts: ['surface', 'exploration', 'combat'] })),
  ...catalog.spells.flatMap(spell => ['scroll', 'tome'].map(category => ({ id: `item_${category}_${spell.id.slice(6)}`,
    label: `${spell.label} ${category === 'scroll' ? 'Scroll' : 'Tome'}`, category, spell: spell.id, stackable: category === 'scroll', effects: [],
    contexts: category === 'scroll' ? ['exploration', 'combat'] : ['exploration'],
    ...(category === 'scroll' ? { freeAction: false, wastefulEligible: false } : {}),
  }))),
);
const move = (id, label, damage, impact, dodgeDC, stability, onHit = []) =>
  ({ id, label, damage, impact, dodgeDC, stability, onHit,
    speed: ({ move_body_slam: -1, move_mandible_snap: 1, move_shell_ram: -1, move_venom_bite: 1 })[id] ?? 0,
    ...(damage || impact || onHit.length ? { qualityStat: ['move_venom_bite', 'move_lunging_bite'].includes(id) ? 'DEX' : 'STR' } : {}) });
catalog.moves = [
  move('move_slime_bash', 'Slime Bash', 2, 1, 8, 1),
  move('move_body_slam', 'Body Slam', 3, 1, 8, 1),
  move('move_mandible_snap', 'Mandible Snap', 3, 1, 11, 2),
  move('move_shell_ram', 'Shell Ram', 4, 2, 8, 3),
  move('move_venom_bite', 'Venom Bite', 2, 0, 11, 1, [{ tag: 'effect_poison', value: 1 }]),
  move('move_lunging_bite', 'Lunging Bite', 3, 1, 14, 1),
];
const selection = pairs => ({ kind: 'exclusive', entries: pairs.map(([target, weight]) => ({ target, weight })) });
catalog.enemies = [
  ['slime', 'Slime', 6, 0, 8, 2, 'slime_core', 55, [['move_slime_bash', 70], ['move_body_slam', 30]]],
  ['cave_beetle', 'Cave Beetle', 8, 1, 11, 3, 'beetle_shell', 50, [['move_mandible_snap', 65], ['move_shell_ram', 35]]],
  ['venom_spider', 'Venom Spider', 6, 0, 11, 4, 'venom_gland', 30, [['move_venom_bite', 70], ['move_lunging_bite', 30]]],
].map(([id, label, hp, defense, attackDC, xp, material, chance, moves]) => ({ id: `enemy_${id}`, label, hp, defense, attackDC, xp,
  combatStats: ({ slime: { STR: 2, DEX: 1 }, cave_beetle: { STR: 3, DEX: 2 }, venom_spider: { STR: 1, DEX: 4 } })[id],
  harvest: [{ item: `item_${material}`, chance, quantity: 1 }], moves: selection(moves), guardian: false }));
catalog.texts.push(...['collapsed_floor', 'falling_debris', 'spore_pocket'].map(id => ({ id: `text_m2_${id}`, label: id, text: id.replaceAll('_', ' ') })));
catalog.hazards = [
  { id: 'hazard_collapsed_floor', label: 'Collapsed Floor', primary: { stat: 'DEX', dc: 11 }, advantageFrom: [], failure: [{ tag: 'effect_damage', value: 3 }], text: 'text_m2_collapsed_floor' },
  { id: 'hazard_falling_debris', label: 'Falling Debris', primary: { stat: 'DEX', dc: 14 }, alternate: { stat: 'STR', dc: 11 }, advantageFrom: [], failure: [{ tag: 'effect_damage', value: 3 }], text: 'text_m2_falling_debris' },
  { id: 'hazard_spore_pocket', label: 'Spore Pocket', primary: { stat: 'CON', dc: 11 }, advantageFrom: [], failure: [{ tag: 'effect_poison', value: 1 }], text: 'text_m2_spore_pocket' },
];
// Card counts, not independent roll percentages. Catalog retains a percentage
// view for its existing exclusive-table schema; generation consumes the deck.
const familyDefinition = [
  { id: 'combat', weight: 8 }, { id: 'resource', weight: 6 }, { id: 'treasure', weight: 6 },
  { id: 'hazard', weight: 4 }, { id: 'event', weight: 3 }, { id: 'empty', weight: 2 }, { id: 'discovery', weight: 1 },
];
catalog.tags.push(...familyDefinition.map(family => ({ id: `room_family_${family.id}`, label: family.id, domain: 'room-family' })));
catalog.tables.push({ id: 'table_m2_room_families', label: 'M2 Room families', kind: 'exclusive',
  entries: familyDefinition.map(family => ({ target: `room_family_${family.id}`, weight: family.weight / 30 * 100 })) });
catalog.tags.push(...['expedition_hp','treasure','item','rumor','arrows','observation','social','gold','combat'].map(name=>({id:`effect_${name}`,label:name,domain:'effect'})));
addEquipment(catalog);
addEncounters(catalog);
addPitEvents(catalog);
addDialogue(catalog);
addSanityContent(catalog);
validateCatalog(catalog);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const expeditionCatalog = freeze(catalog);
export const byId = (family, id) => expeditionCatalog[family].find(entry => entry.id === id);

export const familyWeights = freeze(familyDefinition);
export const roomPool = freeze([
  ...catalog.enemies.filter(enemy=>!enemy.guardian&&!enemy.subjective).map(enemy => ({ id: `room_${enemy.id}`, family: 'combat', encounter: enemy.id, title: enemy.label })),
  ...catalog.hazards.map(hazard => ({ id: `room_${hazard.id}`, family: 'hazard', encounter: hazard.id, title: hazard.label })),
  ...catalog.events.map(event=>({id:`room_${event.id}`,family:'event',encounter:event.id,title:event.label})),
  ...[
    ['resource', 'overgrown_courtyard', 'Overgrown Courtyard'], ['resource', 'cracked_garden', 'Cracked Garden'],
    ['treasure', 'buried_shelf', 'Buried Shelf'], ['treasure', 'abandoned_pack', 'Abandoned Pack'],
    ['empty', 'quiet_passage', 'Quiet Passage'], ['empty', 'bare_foundations', 'Bare Foundations'],
    ['discovery', 'old_well', 'Old Well'], ['discovery', 'town_marker', 'Town Marker'],
  ].map(([family, id, title]) => ({ id: `room_m2_${id}`, family, encounter: `m2_${id}`, title })),
]);
// Catalog references use M0 validation above; these procedural templates also
// require distinct stable identities and supported families.
if (new Set(roomPool.map(r => r.id)).size !== roomPool.length || roomPool.some(r => !/^[a-z0-9_]+$/.test(r.id)
  || !familyWeights.some(f => f.id === r.family)
  || (r.family === 'combat' && !byId('enemies', r.encounter))
  || (r.family === 'hazard' && !byId('hazards', r.encounter)))) throw new Error('Invalid M2 room pool');
