import { schemas } from '../../HearthVale_Content/schema.js';

// Representative M0 data from Content/Story, not a production catalog or
// gameplay implementation. Explicit no-op handlers exist only for link tests.
export const fixtureResolvers = Object.freeze({ resolver_search: () => [], resolver_supply: () => [] });
export function validCatalog() {
  const c = { schemaVersion: 1, ...Object.fromEntries(Object.keys(schemas).map(key => [key, []])) };
  c.tags = [
    ['state_shortage', 'state'], ['state_eligible', 'state'], ['state_discovered', 'state'],
    ['info_discovery', 'information'], ['objective_deliver', 'objective'],
    ...['heal', 'damage', 'impact', 'defense', 'unlock', 'return', 'max_hp', 'con_physical_resilience_check', 'mental', 'charm', 'luck', 'quick', 'profit', 'curiosity', 'training'].map(n => [`effect_${n}`, 'effect']),
    ...['auron', 'rook', 'mira', 'tavi', 'lina', 'garrick'].map(n => [`voice_${n}`, 'voice']),
    ...['combat', 'resource', 'hazard', 'treasure', 'event', 'empty', 'discovery'].map(n => [`room_${n}`, 'room-family']),
  ].map(([id, domain]) => ({ id, label: id, domain }));
  c.texts = [
    ['text_family', 'A dining room survived almost intact. Three plates remain on the table. One is much smaller than the others.'],
    ['text_search', 'Most of what remains is worthless. Something beneath one of the chairs catches your eye.'],
    ['text_shortage', "Moonleaf's going faster than I can get it."],
    ['text_discovery', "We've confirmed it. The Sunken Square is officially on the Guild map."],
  ].map(([id, text]) => ({ id, label: id, text }));
  c.traits = [
    ['hardy', 'Hardy', 'max_hp', 2], ['strong_willed', 'Strong-Willed', 'mental', 2],
    ['charming', 'Charming', 'charm', 2], ['quick', 'Quick', 'quick', 2],
    ['greedy', 'Greedy', 'profit', 70], ['curious', 'Curious', 'curiosity', 70],
    ['fast_learner', 'Fast Learner', 'training', 1], ['lucky', 'Lucky', 'luck', 1],
    ['lucky_bastard', 'Lucky Bastard', 'luck', 1],
  ].map(([name, label, tag, value]) => ({ id: `trait_${name}`, label, innate: true,
    incompatible: name === 'lucky' ? ['trait_lucky_bastard'] : name === 'lucky_bastard' ? ['trait_lucky'] : [],
    effects: [{ tag: `effect_${tag}`, value }, ...(name === 'hardy'
      ? [{ tag: 'effect_con_physical_resilience_check', value: 2 }] : [])], probabilities: [],
    ...(name === 'lucky_bastard' ? { perDrawChance: 1 } : {}),
  }));
  c.items = [
    ...[['sword', 30, 3, 1, 12, 1, 'STR', 'NEAR'], ['hammer', 40, 4, 0, 10, 2, 'STR', 'NEAR'], ['bow', 35, 3, 0, 12, 0, 'DEX', 'FAR']]
      .map(([name, price, damage, defense, maxDurability, impact, accuracy, range]) => ({
        id: `item_${name}`, label: name, category: 'weapon', price, damage, defense, maxDurability, impact, accuracy, range,
        tier: 1, stackable: false, canDefend: name !== 'bow', wear: name === 'bow' ? 'every-shot' : 'successful-hit',
        ...(name === 'bow' ? { ammo: 'item_arrows' } : {}), effects: [], contexts: ['combat'],
      })),
    { id: 'item_chest_armor', label: 'Chest Armor', category: 'armor', price: 75, stackable: false, defense: 2, armorSlot: 'chest', effects: [], contexts: ['combat'] },
    { id: 'item_shield', label: 'Shield', category: 'shield', price: 50, stackable: false, defense: 3, maxDurability: 15, canDefend: true, wear: 'connected-defense', effects: [], contexts: ['combat'] },
    { id: 'item_hp_potion_basic', label: 'Basic HP Potion', category: 'consumable', price: 10, stackable: true, freeAction: true, wastefulEligible: true,
      effects: [{ tag: 'effect_heal', value: 8 }], contexts: ['surface', 'exploration', 'combat'] },
    { id: 'item_arrows', label: 'Arrows', category: 'ammo', price: 1, stackable: true, effects: [], contexts: ['combat'] },
    ...[['slime_core', 4], ['beetle_shell', 5], ['beast_fang', 6], ['venom_gland', 8], ['moonleaf', 3]]
      .map(([name, sellValue]) => ({ id: `item_${name}`, label: name, category: 'material', sellValue, stackable: true, effects: [], contexts: [] })),
  ];
  c.spells = [
    ['fireball', 4, 'enemy', 'damage', 5], ['force', 3, 'enemy', 'impact', 3],
    ['heal', 4, 'self', 'heal', 8], ['barrier', 3, 'self', 'defense', 3],
    ['unlock', 4, 'lock', 'unlock', 1], ['teleport', 8, 'return', 'return', 1],
  ].map(([name, cost, target, tag, value], i) => ({ id: `spell_${name}`, label: name, cost, target,
    ranges: target === 'enemy' ? ['NEAR', 'FAR'] : [], ...(target === 'enemy' ? { accuracy: 'INT' } : {}),
    effects: [{ tag: `effect_${tag}`, value }], explorationOnly: i > 3, startingEligible: i < 4 }));
  c.moves = [
    { id: 'move_slime_bash', label: 'Slime Bash', range: 'NEAR', damage: 2, impact: 1, dodgeDC: 8, stability: 1, movement: 'none', onHit: [] },
    { id: 'move_body_slam', label: 'Body Slam', range: 'NEAR', damage: 3, impact: 1, dodgeDC: 8, stability: 1, movement: 'none', onHit: [] },
    { id: 'move_close', label: 'Move to NEAR', range: 'FAR', damage: 0, impact: 0, dodgeDC: 8, stability: 0, movement: 'NEAR', onHit: [] },
  ];
  c.enemies = [{ id: 'enemy_slime', label: 'Slime', hp: 6, defense: 0, attackDC: 8, xp: 2, guardian: false,
    harvest: [{ item: 'item_slime_core', chance: 55, quantity: 1 }],
    near: { kind: 'exclusive', entries: [{ target: 'move_slime_bash', weight: 70 }, { target: 'move_body_slam', weight: 30 }] },
    far: { kind: 'exclusive', entries: [{ target: 'move_close', weight: 100 }] } }];
  c.hazards = [{ id: 'hazard_collapsed_floor', label: 'Collapsed Floor', primary: { stat: 'DEX', dc: 11 },
    advantageFrom: [], failure: [{ tag: 'effect_damage', value: 3 }], text: 'text_family' }];
  c.events = [{ id: 'evt_family_table', label: 'The Family Table', opening: 'text_family', outputs: [],
    choices: [{ id: 'choice_family_search', label: 'Search', requires: [], targets: [], resolver: 'resolver_search', effects: [], text: 'text_search' }] }];
  c.locations = [
    ...[['inn', 'mira'], ['shop', 'tavi'], ['guild', 'lina'], ['town_hall', 'garrick']].map(([name, actor]) => ({
      id: `loc_${name}`, label: name, kind: 'surface', stratum: 0, serviceActor: `actor_${actor}`, playable: true })),
    { id: 'loc_pit_entrance', label: 'Pit Entrance', kind: 'pit', stratum: 1, playable: true },
    { id: 'loc_sunken_square', label: 'The Sunken Square', kind: 'named', stratum: 1, playable: true },
  ];
  c.actors = [
    ['auron', [4, 2, 3, 1, 3, 2], ['hardy', 'strong_willed'], 'guild', 'Protect newer adventurers'],
    ['rook', [2, 4, 2, 1, 1, 2], ['quick', 'greedy'], 'guild', 'Make money through the Pit'],
    ['mira', [1, 2, 2, 2, 3, 2], ['hardy', 'charming'], 'inn', 'Keep the Inn going'],
    ['tavi', [1, 2, 2, 3, 2, 2], ['curious', 'fast_learner'], 'shop', 'Understand what comes out of the Pit'],
    ['lina', [1, 2, 2, 2, 2, 3], ['charming', 'strong_willed'], 'guild', 'Keep Guild work moving'],
    ['garrick', [1, 1, 2, 2, 3, 3], ['greedy', 'strong_willed'], 'town_hall', 'Grow HearthVale'],
  ].map(([name, values, traits, location, goal]) => ({ id: `actor_${name}`, label: name, role: goal, goal,
    stats: Object.fromEntries(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((s, i) => [s, values[i]])), hearts: 3,
    traits: traits.map(n => `trait_${n}`), controller: 'Autonomous', location: `loc_${location}`, voice: `voice_${name}`,
    authoredExceptions: name === 'auron' ? ['stat-budget', 'starting-loadout'] : ['starting-loadout'],
    loadout: { weapons: name === 'auron' ? ['item_sword', 'item_hammer'] : name === 'rook' ? ['item_sword', 'item_bow'] : [],
      armor: ['auron', 'rook'].includes(name) ? ['item_chest_armor'] : [],
      items: name === 'auron' ? [{ item: 'item_shield', quantity: 1 }, { item: 'item_hp_potion_basic', quantity: 2 }]
        : name === 'rook' ? [{ item: 'item_hp_potion_basic', quantity: 1 }] : [],
      arrows: name === 'rook' ? 15 : 0, gold: name === 'auron' ? 60 : name === 'rook' ? 45 : 0, spells: [], spellSlots: 4 },
  }));
  c.situations = [{ id: 'sit_moonleaf_shortage', label: 'Moonleaf Shortage', trigger: ['state_shortage'],
    lifetime: 'Short', scope: 'public', knownText: 'text_shortage',
    objectives: [{ id: 'objective_moonleaf', kind: 'objective_deliver', target: 'item_moonleaf', quantity: 1 }],
    resolver: 'resolver_supply', eligibleActors: ['actor_rook'], eligibility: ['state_eligible'],
    paths: [{ id: 'path_supply', outcome: 'resolved', effects: [], text: 'text_shortage' }], rewards: { gold: 5, xp: 1 } }];
  c.dialogues = [{ id: 'dialogue_lina_square', label: 'Square confirmed', actor: 'actor_lina', voice: 'voice_lina',
    priority: 'history', requires: ['state_discovered'], forbids: [],
    knowledge: [{ subject: 'loc_sunken_square', tag: 'info_discovery', state: 'Known' }],
    text: 'text_discovery', once: false, pool: 'lina_discovery' }];
  c.records = [{ id: 'record_square_fixture', label: 'Discovery record fixture', family: 'discovery', subject: 'loc_sunken_square',
    creditMeaningful: true, creditedActor: 'actor_rook', day: 8, visibility: 'institutional',
    knowledge: [{ subject: 'loc_sunken_square', tag: 'info_discovery', state: 'Known' }], text: 'text_discovery' }];
  c.tables = [{ id: 'table_rooms', label: 'Room family', kind: 'exclusive',
    entries: ['combat', 'resource', 'hazard', 'treasure', 'event', 'empty', 'discovery'].map((name, i) => ({ target: `room_${name}`, weight: [30, 20, 15, 10, 10, 10, 5][i] })) }];
  c.probabilities = [['slime_core', 55], ['beetle_shell', 50], ['beast_fang', 45], ['venom_gland', 30]]
    .map(([name, chance]) => ({ id: `chance_${name}`, label: name, kind: 'independent', subject: `item_${name}`, chance }));
  return c;
}

export function validCandidate() {
  return { id: 'candidate_fixture_1', label: 'Kaia', age: 23, hearts: 3,
    stats: { STR: 3, DEX: 2, CON: 3, INT: 1, WIS: 2, CHA: 1 }, traits: ['trait_hardy', 'trait_charming'],
    loadout: { weapons: ['item_sword', 'item_bow'], armor: ['item_chest_armor'],
      items: [{ item: 'item_hp_potion_basic', quantity: 1 }], arrows: 10, gold: 45, spells: ['spell_heal'], spellSlots: 4 } };
}
