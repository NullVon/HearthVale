# HearthVale V1 M0 contracts

## Authored data validation

Use `HearthVale_Content/validation.js` to call `validateCatalog(catalog, { resolvers })` before installing authored data into a V1 runtime. Use `validateCandidate(profile, catalog, { resolvers })` for generated candidate output before presentation/selection. Neither function changes input. Invalid data throws ContentValidationError with an aggregated list of field paths and reasons.

`schema.js` defines plain, strict version-1 schemas for tags, texts, Traits, items/equipment, spells, enemy moves/enemies, hazards, Pit Events, Situations, locations, authored Actors, dialogue, records, exclusive tables and independent probabilities. All catalog arrays are explicit (empty is allowed for incremental authoring). Unknown fields and unknown catalog families fail rather than silently ignoring misspellings. New fields/families require explicit schema additions.

References are typed: an Actor location must resolve to a location, credit to an Actor, ammo to ammunition, and state/voice/Information tags to the correct tag domain. Nested choice/objective/path IDs are globally unique too. Display labels and prose are never used as lookup keys. Resolver IDs must resolve to callable handlers in the consuming Shell registry, not merely to strings that claim implementation exists. Test no-op handlers remain confined to tests/fixtures.

Authored IDs follow the brief's examples (`actor_auron`, `item_bow`, `loc_inn`); validation accepts Core-compatible stable strings and rejects reserved prototype keys. Runtime candidate/record identities are instances; production creation must allocate them using persisted sequences and validate them against existing runtime IDs as well as authored templates. Core remains responsible for runtime Entity collision/reference checks. Templates and runtime instances must not be conflated by display name.

Generated candidates have exactly six integer stats, total 12, range 1–4, at most one 4; two different Innate Traits; explicit incompatibility checks; two different Tier-1 Sword/Hammer/Bow weapons; 10 Arrows iff Bow; Chest Armor, one Basic HP Potion, 45 Gold, three Hearts, age 18–30, four spell slots and zero/one starting-eligible spell. Authored Actors use their own positive-stat schema and declarative exception metadata. Auron's 15-point profile and Rook's 15 Arrows do not go through generated-candidate restrictions. Contradictory Traits remain allowed unless explicitly incompatible; Lucky and Lucky Bastard always conflict.

Exclusive tables declare `kind: 'exclusive'` and percentage weights totaling 100. Only machine floating-point representation noise is tolerated. Independent probabilities declare `kind: 'independent'` and each chance must be 0–100; no sum rule applies. Harvest and Trait proc fields likewise validate independently. Core relative desire weights are unaffected. Lucky Bastard's per-draw rarity is 1%; selection algorithms are later work.

Enemy NEAR and FAR selection tables are separate, typed and range-checked; a positive-weight FAR action must attack or close distance. Public Situations require eligibility and terminal paths. Meaningful record credit is explicit. Factual dialogue reactions require knowledge guards and cannot require Unknown as knowledge. This validates authored structure; later Story resolver tests must prove actual per-holder knowledge enforcement and truthful prose selection. Schema validation cannot prove arbitrary prose true or validate a handler's behavior.

`tests/fixtures/v1-content.js` is representative M0 data, covering every schema family, with all six authored Actor profiles and six spells. It is not the full production Content/Story catalog; fixture outcomes, hazard prose links and Situation wiring are deliberately test-only. Complete V1 catalog wiring belongs to M3. No fixture handler is imported by production code.

## RNG and save ownership

Core owns the PRNG and its existing saved uint32 state. Resolving Shell hooks receive a scoped second argument `{ rng }`; call `rng.next()` there and return generic effects. See LWE-Core/docs/deterministic-rng.md. There is no HearthVale PRNG instance or parallel save envelope. Later candidate generation should occur in a resolving bootstrap Scene; persist generated profiles and selection state once. UI re-render/load must not generate fresh candidates.

Existing HearthVale schema version 1 and Core save format version 1 remain intact. Re-supply Shell hooks when loading; they are code, not saved data. The M0 fixture verifies original save -> real createHearthValeGame load/save -> restored future draws, repeatedly, with byte-identical resulting saves. Core additionally verifies failure rollback and expired-capability protection.

## Approved V1 rulings for later runtime integration

* Strain belongs only to an active expedition. Start at 0; discard when the expedition ends, including normal Return, Teleport's safe immediate Return, final death, or defeat that ends the expedition. No Surface Strain exists. Ordinary defeat/Retreat that regenerates the current Floor while continuing the expedition retains Strain and spent resources. Do not mistake Floor regeneration for expedition termination.
* Create Could-Have-Been-You only at initial Year 1 selection. Preserve exactly one rejected candidate's identity and complete state; never regenerate it. That Actor continues across later successions if alive. Later unselected candidates are discarded and produce no further Could-Have Actors.
* Mira, Tavi, Lina and Garrick remain ordinary Actors. Later unscripted lethal/service-removing selection must exclude these required service Actors. There is no generic immortality flag or substitute-service framework. An explicitly authored removal must define its service consequence/fallback; the Situation schema requires that reference.

These rulings are documented here rather than implementing production expedition, succession or autonomy behavior during M0. Existing pre-V1 proof fixtures remain intact and are not authorized V1 routes.

## Resolved Hardy ruling and M1 entry

The authoritative Hardy ruling is encoded and tested: +2 direct Max HP, plus +2 CON only for physical-resilience checks. The latter never modifies base/effective CON, derived Max HP, Natural Armor, training, prerequisites or other general CON calculations. The validator requires two distinct effect tags and rejects generic CON bonuses or doubled HP. The pure formula helpers in actors.js keep derived values separate from constitutionCheckBonus; no M1 loop was added.

Auron retains CON 3 and Natural Armor 1, with Max HP 18. Mira retains CON 2 and Natural Armor 1, with Max HP 16. Mechanics sections 5/10 and Implementation Brief sections 2/11/20 explicitly supersede old HP table values that omit Hardy's direct bonus. Content's section 8 Hardy entry already agrees and is unchanged under the user's conditional editing instruction. UI/UX section 9's explicit CON-3 Hardy example was corrected from Max HP 16 to 18; Story is unchanged. tests/hardy.test.js locks the ruling and absence of stat mutation.

After explicit M0 approval, add a V1 bootstrap/application entry beside the proof runtime, loading validated data and creating candidate profiles through the scoped Core RNG. Use existing Core effects, Information and snapshots. Keep historical cards and candidate rendering in Story/UI; do not expose the existing voluntary-succession or multi-year-compression proof as a V1 route. Do not begin M1 before approval.
