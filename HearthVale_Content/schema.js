// V1 data contracts. No resolver functions, generated outcomes or UI live here.
export const STATS = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
const number = { type: 'number', min: 0 };
const integer = { type: 'integer', min: 0 };
const positive = { type: 'integer', min: 1 };
const text = { type: 'string' };
const boolean = { type: 'boolean' };
const optional = rule => ({ ...rule, optional: true });
const oneOf = (...values) => ({ type: 'enum', values });
const array = (items, min = 0) => ({ type: 'array', items, min });
const object = fields => ({ type: 'object', fields });
const ref = (group = '*', domain) => ({ type: 'ref', group, domain });
const tag = domain => ref('tags', domain);
const percentage = { type: 'number', min: 0, max: 100 };
const stat = oneOf(...STATS);
const check = object({ stat, dc: oneOf(8, 11, 14, 17), scope: optional(text) });
// Effects can be penalties (for example Frail's -2 Max HP); prices and
// resource quantities retain their nonnegative contracts.
const effect = object({ tag: tag('effect'), value: { type: 'number' }, target: optional(ref()) });
const effects = array(effect);
const refs = group => array(ref(group));
const knowledge = array(object({ subject: ref(), tag: tag('information'), state: oneOf('Rumor', 'Known') }));
const weightedEntry = object({ target: ref(), weight: percentage });
const selection = object({ kind: oneOf('exclusive'), entries: array(weightedEntry, 1) });
const stats = object(Object.fromEntries(STATS.map(key => [key, positive])));
const loadout = object({ weapons: refs('items'), armor: refs('items'),
  items: array(object({ item: ref('items'), quantity: positive })), arrows: integer, gold: integer,
  spells: refs('spells'), spellSlots: oneOf(4) });
const record = fields => object({ id: text, label: text, ...fields });

export const schemas = Object.freeze({
  tags: record({ domain: oneOf('state', 'information', 'voice', 'effect', 'objective', 'room-family') }),
  texts: record({ text }),
  traits: record({ innate: boolean, incompatible: refs('traits'), effects,
    probabilities: array(object({ tag: tag('effect'), chance: percentage })),
    perDrawChance: optional(percentage) }),
  items: record({ category: oneOf('weapon', 'shield', 'armor', 'consumable', 'ammo', 'material', 'valuable', 'scroll', 'tome'),
    price: optional(number), sellValue: optional(number), tier: optional(positive), stackable: boolean,
    damage: optional(number), defense: optional(number), maxDurability: optional(positive), impact: optional(number),
    range: optional(oneOf('NEAR', 'FAR')), accuracy: optional(stat), canDefend: optional(boolean),
    ammo: optional(ref('items')), wear: optional(oneOf('successful-hit', 'every-shot', 'connected-defense', 'none')),
    armorSlot: optional(oneOf('head', 'chest', 'hands', 'accessory')),
    spell: optional(ref('spells')), effects, contexts: array(oneOf('surface', 'exploration', 'combat')),
    freeAction: optional(boolean), wastefulEligible: optional(boolean) }),
  spells: record({ cost: positive, target: oneOf('self', 'enemy', 'lock', 'return'),
    ranges: array(oneOf('NEAR', 'FAR')), accuracy: optional(stat), effects,
    explorationOnly: boolean, startingEligible: boolean }),
  moves: record({ range: oneOf('NEAR', 'FAR'), damage: number, impact: number,
    damageType: optional(oneOf('physical', 'spell')),
    dodgeDC: oneOf(8, 11, 14, 17), stability: integer, movement: oneOf('none', 'NEAR', 'FAR'),
    onHit: effects }),
  enemies: record({ hp: positive, defense: number, attackDC: oneOf(8, 11, 14, 17), xp: integer,
    harvest: array(object({ item: ref('items'), chance: percentage, quantity: oneOf(1) })),
    near: selection, far: selection, guardian: boolean }),
  hazards: record({ primary: check, alternate: optional(check),
    advantageFrom: refs('*'), failure: effects, text: ref('texts'), fire: optional(boolean), triggered: optional(check), reward: optional(boolean) }),
  events: record({ opening: ref('texts'), choices: array(object({ id: text, label: text,
    requires: array(tag('state')), targets: refs('*'), check: optional(check),
    resolver: optional({ type: 'resolver' }), effects, failure: optional(effects), text: ref('texts') }), 1), outputs: refs('*') }),
  recipes: record({ materials: array(object({ item: ref('items'), quantity: positive }), 1), gold: integer,
    output: ref('items'), quantity: positive, service: oneOf('shop', 'blacksmith') }),
  vendors: record({ location: ref('locations'), stock: array(object({ item: ref('items'), target: positive, floor: integer })) }),
  situations: record({ trigger: array(tag('state'), 1), lifetime: oneOf('Immediate', 'Short', 'Long'),
    scope: oneOf('public', 'personal'), knownText: ref('texts'), rumorText: optional(ref('texts')),
    objectives: array(object({ id: text, kind: tag('objective'), target: ref(), quantity: positive }), 1),
    resolver: { type: 'resolver' }, eligibleActors: refs('actors'),
    eligibility: array(tag('state'), 1), paths: array(object({ id: text,
      outcome: oneOf('resolved', 'expired', 'transformed'), effects, text: ref('texts') }), 1),
    rewards: object({ gold: integer, xp: integer }),
    removesServiceActor: optional(ref('actors')), serviceConsequence: optional(ref('texts')) }),
  locations: record({ kind: oneOf('surface', 'pit', 'named'), stratum: integer,
    serviceActor: optional(ref('actors')), playable: boolean }),
  actors: record({ role: text, stats, hearts: positive, traits: refs('traits'), goal: text,
    controller: oneOf('Human', 'Autonomous'), location: ref('locations'), voice: tag('voice'),
    loadout, authoredExceptions: array(oneOf('stat-budget', 'starting-loadout')) }),
  dialogues: record({ actor: ref('actors'), voice: tag('voice'),
    priority: oneOf('immediate', 'situation', 'history', 'relationship', 'service', 'neutral'),
    requires: array(tag('state')), forbids: array(tag('state')), knowledge,
    text: ref('texts'), once: boolean, pool: text }),
  records: record({ family: oneOf('guild', 'town', 'discovery', 'actor', 'life'),
    subject: ref(), creditMeaningful: boolean, creditedActor: optional(ref('actors')),
    day: positive, visibility: oneOf('personal', 'institutional', 'public'), knowledge,
    text: ref('texts') }),
  tables: record({ kind: oneOf('exclusive'), entries: array(weightedEntry, 1) }),
  probabilities: record({ kind: oneOf('independent'), subject: ref(), chance: percentage }),
});

// A generated candidate is a separate contract, never inferred from controller
// or an authored Actor's name. Its ID is a runtime instance ID.
export const candidateSchema = record({ age: { type: 'integer', min: 18, max: 30 },
  stats, hearts: oneOf(3), traits: refs('traits'), loadout });
