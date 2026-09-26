import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, validateCandidate, ContentValidationError } from '../HearthVale_Content/validation.js';
import { validCatalog, validCandidate, fixtureResolvers as resolvers } from './fixtures/v1-content.js';

test('representative V1 catalogs and generated profile pass without mutating input', () => {
  const c = validCatalog(), p = validCandidate(), before = structuredClone({ c, p });
  validateCatalog(c, { resolvers }); validateCandidate(p, c, { resolvers });
  assert.deepEqual({ c, p }, before);
});
test('Auron is an authored 15-point exception; Rook retains his authored 15 Arrows', () => {
  const c = validCatalog();
  assert.equal(Object.values(c.actors[0].stats).reduce((a, b) => a + b), 15);
  assert.equal(c.actors[1].loadout.arrows, 15);
  validateCatalog(c, { resolvers });
});
test('independent 55/50/45/30 percentages are valid without summing to 100', () => {
  const c = validCatalog(); assert.equal(c.probabilities.reduce((s, p) => s + p.chance, 0), 180);
  validateCatalog(c, { resolvers });
  c.probabilities[0].chance = 0; c.probabilities[1].chance = 100; validateCatalog(c, { resolvers });
});
test('no Bow requires zero Arrows and an empty starting spell result is valid', () => {
  const p = validCandidate(); p.loadout.weapons = ['item_sword', 'item_hammer']; p.loadout.arrows = 0; p.loadout.spells = [];
  validateCandidate(p, validCatalog(), { resolvers });
});

const invalidCatalogs = [
  ['duplicate IDs', c => c.items.push(structuredClone(c.items[0])), /duplicate ID/],
  ['cross-catalog duplicates', c => { c.texts[0].id = c.items[0].id; }, /duplicate ID/],
  ['nested choice duplicate', c => c.events[0].choices.push(structuredClone(c.events[0].choices[0])), /duplicate ID/],
  ['missing reference', c => { c.actors[0].location = 'loc_missing'; }, /missing reference/],
  ['wrong reference type', c => { c.actors[0].location = 'item_bow'; }, /target locations/],
  ['unknown fields', c => { c.items[0].damge = 3; }, /unknown field/],
  ['missing equipment stat', c => { delete c.items[0].damage; }, /required for weapon/],
  ['invalid item price', c => { c.items[0].price = -1; }, /numeric/],
  ['invalid spell cost', c => { c.spells[0].cost = NaN; }, /numeric/],
  ['invalid Trait effect', c => { c.traits[0].effects[0].tag = 'effect_missing'; }, /missing reference/],
  ['invalid Actor stat', c => { c.actors[0].stats.STR = 0; }, /numeric/],
  ['invalid enemy HP', c => { c.enemies[0].hp = 0; }, /numeric/],
  ['invalid enemy move DC', c => { c.moves[0].dodgeDC = 99; }, /expected one of/],
  ['incompatible enemy move range', c => { c.moves[0].range = 'FAR'; }, /incompatible range/],
  ['FAR deadlock', c => { c.moves[2].movement = 'none'; }, /FAR behavior/],
  ['invalid hazard stat', c => { c.hazards[0].primary.stat = 'SPEED'; }, /expected one of/],
  ['missing event target', c => { c.events[0].choices[0].targets = ['missing']; }, /missing reference/],
  ['missing objective target', c => { c.situations[0].objectives[0].target = 'missing'; }, /missing reference/],
  ['missing resolver', c => { c.situations[0].resolver = 'missing'; }, /missing callable resolver/],
  ['no Situation eligibility', c => { c.situations[0].eligibility = []; }, /at least 1/],
  ['no Situation terminal path', c => { c.situations[0].paths = []; }, /at least 1/],
  ['invalid dialogue state tag', c => { c.dialogues[0].requires = ['missing']; }, /missing reference/],
  ['wrong dialogue tag domain', c => { c.dialogues[0].requires = ['info_discovery']; }, /belong to state/],
  ['unknown fact in dialogue', c => { c.dialogues[0].knowledge[0].state = 'Unknown'; }, /expected one of/],
  ['unguarded factual reaction', c => { c.dialogues[0].knowledge = []; }, /knowledge guards/],
  ['contradictory dialogue tags', c => { c.dialogues[0].forbids = ['state_discovered']; }, /overlap/],
  ['wrong dialogue voice', c => { c.dialogues[0].voice = 'voice_mira'; }, /voice does not match/],
  ['missing record subject', c => { c.records[0].subject = 'missing'; }, /missing reference/],
  ['wrong credit reference', c => { c.records[0].creditedActor = 'loc_inn'; }, /target actors/],
  ['missing meaningful credit', c => { delete c.records[0].creditedActor; }, /explicit Actor/],
  ['bad exclusive total', c => { c.tables[0].entries[0].weight = 29; }, /total 100/],
  ['bad enemy move weights', c => { c.enemies[0].near.entries[0].weight = 69; }, /total 100/],
  ['negative independent chance', c => { c.probabilities[0].chance = -1; }, /numeric/],
  ['over-100 harvest chance', c => { c.enemies[0].harvest[0].chance = 101; }, /numeric/],
  ['bad Lucky Bastard rarity', c => { c.traits.at(-1).perDrawChance = 2; }, /1% per draw/],
  ['unsafe ID', c => { c.items[0].id = '__proto__'; }, /invalid stable ID/],
  ['playable later Stratum', c => { c.locations.at(-1).stratum = 2; }, /Stratum 2/],
  ['service removal without fallback', c => { c.situations[0].removesServiceActor = 'actor_mira'; }, /consequence/],
];
for (const [name, mutate, message] of invalidCatalogs) test(`rejects ${name}`, () => {
  const c = validCatalog(); mutate(c);
  assert.throws(() => validateCatalog(c, { resolvers }), e => e instanceof ContentValidationError && message.test(e.message) && e.errors.every(x => x.path));
});

const invalidCandidates = [
  ['wrong total', p => { p.stats.STR = 2; }, /total exactly 12/],
  ['stat below range', p => { p.stats.INT = 0; }, /1–4/],
  ['stat above range', p => { p.stats.STR = 5; }, /1–4/],
  ['fractional stat', p => { p.stats.STR = 2.5; }, /1–4/],
  ['multiple starting fours', p => { p.stats = { STR: 4, DEX: 4, CON: 1, INT: 1, WIS: 1, CHA: 1 }; }, /at most one/],
  ['missing stat', p => { delete p.stats.CHA; }, /1–4/],
  ['duplicate weapons', p => { p.loadout.weapons = ['item_sword', 'item_sword']; }, /different Tier-1/],
  ['wrong weapon tier', (p, c) => { c.items[0].tier = 2; }, /Tier-1/],
  ['shield as weapon', p => { p.loadout.weapons[0] = 'item_shield'; }, /requires weapons/],
  ['Bow without arrows', p => { p.loadout.arrows = 0; }, /Bow requires 10/],
  ['arrows without Bow', p => { p.loadout.weapons = ['item_sword', 'item_hammer']; }, /no Bow requires 0/],
  ['too few Traits', p => { p.traits.pop(); }, /exactly 2/],
  ['duplicate Traits', p => { p.traits = ['trait_hardy', 'trait_hardy']; }, /duplicate references/],
  ['Lucky plus Lucky Bastard', p => { p.traits = ['trait_lucky', 'trait_lucky_bastard']; }, /incompatible/],
  ['metadata incompatibility', (p, c) => { c.traits[0].incompatible = ['trait_charming']; }, /incompatible/],
  ['non-Innate Trait', (p, c) => { c.traits[0].innate = false; }, /not an Innate/],
  ['discovery-only starting spell', p => { p.loadout.spells = ['spell_teleport']; }, /starting-eligible/],
  ['missing armor', p => { p.loadout.armor = []; }, /Chest Armor/],
  ['missing potion', p => { p.loadout.items = []; }, /Basic HP Potion/],
  ['wrong Gold', p => { p.loadout.gold = 99; }, /45 Gold/],
];
for (const [name, mutate, message] of invalidCandidates) test(`candidate rejects ${name}`, () => {
  const p = validCandidate(), c = validCatalog(); mutate(p, c);
  assert.throws(() => validateCandidate(p, c, { resolvers }), message);
});

test('contradictory different Traits are allowed unless explicitly incompatible', () => {
  const c = validCatalog(), p = validCandidate();
  c.traits.push({ ...structuredClone(c.traits[0]), id: 'trait_frail', label: 'Frail' });
  p.traits = ['trait_hardy', 'trait_frail']; validateCandidate(p, c, { resolvers });
});
test('malformed root and missing catalog fail with diagnostic paths', () => {
  assert.throws(() => validateCatalog(null), ContentValidationError);
  assert.throws(() => validateCatalog({ schemaVersion: 1 }), ContentValidationError);
});
