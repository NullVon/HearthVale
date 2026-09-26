import { schemas, candidateSchema, STATS } from './schema.js';

export class ContentValidationError extends Error {
  constructor(errors) {
    super(`Invalid HearthVale data:\n${errors.map(e => `${e.path}: ${e.message}`).join('\n')}`);
    this.name = 'ContentValidationError';
    this.errors = errors;
  }
}
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const stableId = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(v)
  && !['constructor', 'prototype', '__proto__'].includes(v);

function context(catalog, resolvers) {
  const errors = [], index = new Map(), ids = new Set(), references = [];
  const error = (path, message) => errors.push({ path, message });
  function register(id, path, group, value) {
    if (!stableId(id)) { error(path, 'invalid stable ID'); return; }
    if (ids.has(id)) error(path, `duplicate ID ${id}`);
    ids.add(id);
    if (group && !index.has(id)) index.set(id, { group, value });
  }
  function walk(value, rule, path) {
    if (value === undefined && rule.optional) return;
    switch (rule.type) {
      case 'string': if (typeof value !== 'string' || !value.trim()) error(path, 'expected nonempty text'); break;
      case 'boolean': if (typeof value !== 'boolean') error(path, 'expected boolean'); break;
      case 'number': case 'integer':
        if (!Number.isFinite(value) || (rule.type === 'integer' && !Number.isSafeInteger(value))
          || value < (rule.min ?? -Infinity) || value > (rule.max ?? Infinity)) error(path, 'invalid numeric value');
        break;
      case 'enum': if (!rule.values.includes(value)) error(path, `expected one of ${rule.values.join(', ')}`); break;
      case 'ref': references.push({ value, rule, path }); break;
      case 'resolver':
        if (!stableId(value) || !Object.hasOwn(resolvers, value) || typeof resolvers[value] !== 'function')
          error(path, `missing callable resolver ${String(value)}`);
        break;
      case 'array':
        if (!Array.isArray(value)) { error(path, 'expected array'); break; }
        if (value.length < rule.min) error(path, `requires at least ${rule.min} entries`);
        for (let i = 0; i < value.length; i++) walk(value[i], rule.items, `${path}[${i}]`);
        break;
      case 'object':
        if (!plain(value)) { error(path, 'expected plain object'); break; }
        for (const key of Object.keys(value)) if (!Object.hasOwn(rule.fields, key)) error(`${path}.${key}`, 'unknown field');
        for (const [key, field] of Object.entries(rule.fields)) walk(value[key], field, `${path}.${key}`);
        break;
    }
  }
  function resolveReferences() {
    for (const { value, rule, path } of references) {
      const found = index.get(value);
      if (!stableId(value) || !found) error(path, `missing reference ${String(value)}`);
      else if (rule.group !== '*' && found.group !== rule.group) error(path, `reference must target ${rule.group}`);
      else if (rule.domain && found.value.domain !== rule.domain) error(path, `tag must belong to ${rule.domain}`);
    }
  }
  if (!plain(catalog)) { error('catalog', 'expected plain object'); return { errors }; }
  if (!plain(resolvers)) { error('resolvers', 'expected callable registry'); return { errors }; }
  for (const key of Object.keys(catalog)) if (key !== 'schemaVersion' && !Object.hasOwn(schemas, key)) error(key, 'unknown catalog');
  if (catalog.schemaVersion !== 1) error('schemaVersion', 'unsupported content schema version');
  for (const [group, schema] of Object.entries(schemas)) {
    const values = catalog[group];
    if (values === undefined && ['recipes', 'vendors'].includes(group)) continue;
    if (!Array.isArray(values)) { error(group, 'expected catalog array'); continue; }
    values.forEach((value, i) => {
      const path = `${group}[${i}]`;
      register(value?.id, `${path}.id`, group, value);
      walk(value, schema, path);
      for (const key of ['choices', 'objectives', 'paths']) if (Array.isArray(value?.[key]))
        value[key].forEach((entry, n) => register(entry?.id, `${path}.${key}[${n}].id`, `${group}.${key}`, entry));
    });
  }
  return { errors, error, index, register, walk, resolveReferences };
}

function semantics(catalog, ctx) {
  const { error, index } = ctx;
  const get = id => index.get(id)?.value;
  const list = value => Array.isArray(value) ? value : [];
  const unique = (values, path) => { if (new Set(values).size !== values.length) error(path, 'duplicate references'); };
  function traits(values, path) {
    values = list(values); unique(values, path);
    if (values.length !== 2) error(path, 'requires exactly 2 starting Innate Traits');
    for (const id of values) {
      const trait = get(id);
      if (trait && !trait.innate) error(path, `${id} is not an Innate Trait`);
      for (const other of list(trait?.incompatible)) if (values.includes(other)) error(path, `incompatible Traits ${id} and ${other}`);
    }
    // The explicit V1 invariant survives accidentally erased incompatibility metadata.
    if (values.includes('trait_lucky') && values.includes('trait_lucky_bastard')) error(path, 'Lucky and Lucky Bastard are incompatible');
  }
  function loadout(value, path) {
    if (!plain(value)) return;
    unique(list(value.weapons), `${path}.weapons`); unique(list(value.armor), `${path}.armor`);
    unique(list(value.spells), `${path}.spells`);
    if (list(value.spells).length > 4) error(`${path}.spells`, 'at most 4 spells');
    for (const id of list(value.weapons)) if (get(id) && get(id).category !== 'weapon') error(`${path}.weapons`, 'requires weapons');
    for (const id of list(value.armor)) if (get(id) && get(id).category !== 'armor') error(`${path}.armor`, 'requires armor');
  }
  function weighted(table, path, group) {
    const entries = list(table?.entries);
    if (!entries.length) return; // Shape validation reports missing/empty entries.
    const total = entries.reduce((sum, e) => sum + (e?.weight ?? NaN), 0);
    // Percentage precision: tolerate floating-point representation noise only.
    if (!Number.isFinite(total) || Math.abs(total - 100) > Number.EPSILON * 100 * entries.length)
      error(path, `exclusive weights must total 100%, got ${total}`);
    unique(entries.map(e => e?.target), path);
    for (const entry of entries) if (group && index.get(entry?.target)?.group !== group) error(path, `selection requires ${group}`);
  }
  for (const group of Object.keys(schemas)) list(catalog[group]).forEach((v, i) => {
    if (!plain(v)) return;
    const path = `${group}[${i}]`;
    if(group==='recipes'){
      for(const ingredient of list(v.materials))if(get(ingredient.item)?.category!=='material')error(path,'recipe ingredients must be materials');
      if(v.service==='shop'&&get(v.output)?.category!=='consumable')error(path,'shop recipes require consumable outputs');
    }
    if(group==='vendors'){
      unique(list(v.stock).map(s=>s.item),path);
      for(const stock of list(v.stock))if(stock.floor>stock.target)error(path,'protected floor exceeds stock target');
    }
    if(group==='events')for(const choice of list(v.choices))if(!choice.resolver){
      const allowed=['effect_treasure','effect_item','effect_arrows','effect_gold','effect_combat','effect_rumor','effect_observation','effect_social'];
      for(const effect of [...list(choice.effects),...list(choice.failure)]) {
        if(!allowed.includes(effect.tag))error(path,'unsupported declarative Event consequence');
        if(effect.tag==='effect_item'&&index.get(effect.target)?.group!=='items')error(path,'item consequence requires an item');
        if(effect.tag==='effect_combat'&&index.get(effect.target)?.group!=='enemies')error(path,'combat consequence requires an enemy');
      }
    }
    if (group === 'traits') {
      if (v.id === 'trait_hardy') {
        // Hardy has two separate scopes. A check bonus is never a CON stat
        // modifier and cannot feed HP, armor, training or prerequisites.
        const hardyEffects = list(v.effects);
        const expected = ['effect_max_hp', 'effect_con_physical_resilience_check'];
        if (hardyEffects.length !== 2 || expected.some(tag =>
          hardyEffects.filter(e => e?.tag === tag && e.value === 2 && e.target === undefined).length !== 1))
          error(`${path}.effects`, 'Hardy requires +2 direct Max HP and +2 physical-resilience CON checks only; no general CON modifier');
      }
      unique(list(v.incompatible), `${path}.incompatible`);
      if (list(v.incompatible).includes(v.id)) error(path, 'Trait cannot be incompatible with itself');
      if (v.id === 'trait_lucky_bastard' && v.perDrawChance !== 1) error(path, 'Lucky Bastard requires 1% per draw');
    }
    if (group === 'items') {
      const requireFields = fields => fields.forEach(f => { if (v[f] === undefined) error(`${path}.${f}`, `required for ${v.category}`); });
      if (v.price === undefined && v.sellValue === undefined && !['scroll', 'tome'].includes(v.category)) error(path, 'requires price or direct sell value');
      if (v.category === 'weapon') requireFields(['tier', 'damage', 'defense', 'maxDurability', 'impact', 'range', 'accuracy', 'canDefend', 'wear']);
      if (v.category === 'shield') requireFields(['defense', 'maxDurability', 'canDefend', 'wear']);
      if (v.category === 'armor') requireFields(['defense', 'armorSlot']);
      if (['scroll', 'tome'].includes(v.category)) requireFields(['spell']);
      if (['consumable', 'scroll'].includes(v.category)) requireFields(['freeAction', 'wastefulEligible']);
      if (v.category === 'consumable' && !list(v.effects).length) error(path, 'consumable requires effect');
      if (v.ammo && get(v.ammo)?.category !== 'ammo') error(path, 'ammo reference must target ammunition');
      if (v.id === 'item_bow' && (v.canDefend !== false || v.wear !== 'every-shot' || !v.ammo || v.range !== 'FAR')) error(path, 'Bow requires FAR, ammunition, every-shot wear and cannot defend');
    }
    if (group === 'spells') {
      if (!list(v.effects).length) error(path, 'spell requires effect');
      if (v.explorationOnly && v.startingEligible) error(path, 'exploration spells cannot be starting spells');
    }
    if (group === 'enemies') {
      for (const range of ['near', 'far']) {
        weighted(v[range], `${path}.${range}`, 'moves');
        for (const entry of list(v[range]?.entries)) {
          const move = get(entry?.target);
          if (move && move.range !== range.toUpperCase()) error(`${path}.${range}`, 'move has incompatible range');
        }
      }
      if (!list(v.far?.entries).some(e => e?.weight > 0 && (get(e.target)?.damage > 0 || get(e.target)?.movement === 'NEAR')))
        error(`${path}.far`, 'FAR behavior must attack or close distance');
      for (const harvest of list(v.harvest)) if (get(harvest?.item)?.category !== 'material') error(`${path}.harvest`, 'harvest must target material');
    }
    if (group === 'actors') { traits(v.traits, `${path}.traits`); loadout(v.loadout, `${path}.loadout`); }
    if (group === 'dialogues') {
      for (const id of list(v.requires)) if (list(v.forbids).includes(id)) error(path, 'required and forbidden state tags overlap');
      if (get(v.actor)?.voice !== v.voice) error(path, 'dialogue voice does not match Actor');
      if (['immediate', 'situation', 'history'].includes(v.priority) && !list(v.knowledge).length) error(path, 'factual reactions require explicit knowledge guards');
    }
    if (group === 'records' && v.creditMeaningful && !v.creditedActor) error(path, 'meaningful credit requires an explicit Actor reference');
    if (group === 'situations' && v.removesServiceActor && !v.serviceConsequence) error(path, 'authored service removal requires explicit consequence/fallback');
    if (group === 'locations' && v.playable && v.stratum > 1) error(path, 'V1 cannot enter playable Stratum 2+');
    if (group === 'tables') weighted(v, path);
  });
  return { traits, loadout };
}

export function validateCatalog(catalog, { resolvers = {} } = {}) {
  const ctx = context(catalog, resolvers);
  if (ctx.index) { semantics(catalog, ctx); ctx.resolveReferences(); }
  if (ctx.errors.length) throw new ContentValidationError(ctx.errors);
  return catalog;
}

export function validateCandidate(candidate, catalog, options = {}) {
  validateCatalog(catalog, options);
  const ctx = context(catalog, options.resolvers ?? {});
  const helpers = semantics(catalog, ctx);
  ctx.walk(candidate, candidateSchema, 'candidate');
  ctx.register(candidate?.id, 'candidate.id', 'candidates', candidate);
  if (plain(candidate)) {
    helpers.traits(candidate.traits, 'candidate.traits');
    helpers.loadout(candidate.loadout, 'candidate.loadout');
    const values = STATS.map(key => candidate.stats?.[key]);
    if (values.reduce((sum, v) => sum + v, 0) !== 12) ctx.error('candidate.stats', 'generated stats must total exactly 12');
    if (values.some(v => !Number.isInteger(v) || v < 1 || v > 4)) ctx.error('candidate.stats', 'generated stats must each be 1–4');
    if (values.filter(v => v === 4).length > 1) ctx.error('candidate.stats', 'at most one generated stat may start at 4');
    const loadout = candidate.loadout;
    if (plain(loadout)) {
      const weapons = Array.isArray(loadout.weapons) ? loadout.weapons : [];
      if (weapons.length !== 2 || new Set(weapons).size !== 2) ctx.error('candidate.loadout.weapons', 'requires exactly 2 different Tier-1 weapons');
      if (weapons.some(id => !['item_sword', 'item_hammer', 'item_bow'].includes(id) || ctx.index.get(id)?.value.tier !== 1))
        ctx.error('candidate.loadout.weapons', 'starting weapons must be Tier-1 Sword, Hammer or Bow');
      if (loadout.arrows !== (weapons.includes('item_bow') ? 10 : 0)) ctx.error('candidate.loadout.arrows', 'Bow requires 10 Arrows; no Bow requires 0');
      if (JSON.stringify(loadout.armor) !== JSON.stringify(['item_chest_armor'])) ctx.error('candidate.loadout.armor', 'requires 1 Chest Armor');
      if (!Array.isArray(loadout.items) || loadout.items.length !== 1 || loadout.items[0]?.item !== 'item_hp_potion_basic' || loadout.items[0]?.quantity !== 1)
        ctx.error('candidate.loadout.items', 'requires 1 Basic HP Potion');
      if (loadout.gold !== 45) ctx.error('candidate.loadout.gold', 'requires 45 Gold');
      if (!Array.isArray(loadout.spells) || loadout.spells.length > 1 || loadout.spells.some(id => !ctx.index.get(id)?.value.startingEligible))
        ctx.error('candidate.loadout.spells', 'requires zero or one starting-eligible spell');
    }
  }
  ctx.resolveReferences();
  if (ctx.errors.length) throw new ContentValidationError(ctx.errors);
  return candidate;
}
