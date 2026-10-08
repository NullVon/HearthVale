# Phase 2.1 Combat Simplification handoff

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented directly on the existing Phase 1 / 1.1 / 1.2 / Phase 2 working tree. No reset, stash, restoration, commit or push. Later-phase briefs were not changed.

## Player-visible changes

- Combat has no distance state, movement action, range restrictions or range UI. Sword, Hammer, Bow and Bare Hands are available subject to their ordinary equipment/ammunition requirements. Bare Hands remains the universal Defense-bypassing fallback.
- Each enemy uses the exact unified move weights in the approved brief. Pounce and Rock Throw remain attacks; Close is absent from new combat.
- Knockdown forces 0% Dodge against the next offensive action targeting that Actor. It does not skip a turn. That action consumes the old vulnerability; any new Knockdown caused by the action remains for a subsequent action.
- Normal Stagger/Knockdown still cancels the enemy commitment and grants one Advantage action. Advantage and Counterattack both permit weapons, Bare Hands, offensive learned spells and offensive equipped Scrolls; neither permits support spells, consumables, swaps, retreat or other inventory actions.
- Counterattack now means accepting the incoming hit first. If the player survives, the saved `counterattack` phase presents one offensive response. Block stays on equipment tiles; Counterattack is a clear incoming defense choice because the response is selected afterward.
- Immediate actions cannot award further immediate actions. Knockdown can persist after a response, but never deletes the next offense.
- Force remains 0 Damage / 3 Impact, with no push. Existing pre-Phase-5 accuracy, spell costs and Strain remain intact. Knockdown is consumed by an offensive spell even if its separate existing accuracy check misses; no new spell Dodge or auto-hit mechanic was introduced.

## State machine and round completion

Ordinary offense leads to incoming defense or Advantage. Dodge/Block completes the incoming action and round. Counterattack resolves the incoming action once, then pauses at the offensive response choice; Poison ticks at the existing round-completion boundary after that response. Lethal incoming damage settles defeat without a response. A killing response retains the existing immediate-victory policy, rewards once, and does not add an end-round Poison tick.

The saved `counterIncoming` result preserves incoming damage/status evidence for the combined inline result. It is consumed by the response; it is never used to reapply incoming effects. No additional defense, Continue or round-outcome screen is introduced.

## Save compatibility

No save-version bump. Loading stays byte-exact and does not draw RNG. Compatibility mapping happens through an ordinary authorized Core action, with read-only previews exposing the mapped choices beforehand.

- Old combat and committed-move range/movement fields remain tolerated and untouched, but are never read for legality, selection, damage or movement. Legacy Pounce/Rock Throw commitments retain their damage/effects and use the new range-independent behavior.
- Old Close commitments finish harmlessly as nonoffensive actions. Incoming Close resumes through the existing automatic compatibility flow, completes its round once and then selects one new unified commitment.
- Old enemy Knockdown flags become vulnerability. An already-committed `move_recover` becomes a harmless legacy commitment plus one enemy vulnerability. `legacyRecoveryMapped` prevents re-creating that vulnerability if the legacy commitment remains while an ordinary free support action is used.
- Old `skippedAttack` incoming saves expose the ordinary attack that the old rule had skipped, retain player vulnerability, then consume the legacy marker on the next action. No new enemy commitment is rolled for that mapping.
- Old Advantage and cancelled Force Scroll attack saves retain exactly one Advantage action. Former FAR/no-weapon cases now offer Bare Hands rather than auto-passing.
- Old `cancelled` and already-paid `round-result` saves retain the Phase 1 resume path; paid Poison/round effects are not applied twice.
- A saved Counterattack response resumes exactly after the incoming hit, with no duplicate RNG, damage, Poison, durability wear or rewards.

## Range compatibility retained

`HearthVale_Content/schema.js` retains optional legacy item/move `range`, spell `ranges`, move `movement`, and enemy `near`/`far` fields so old authored data shapes can be tolerated. Current production definitions omit all of them and require one `moves` pool. Existing save objects are not scrubbed. Compatibility code recognizes the old Close/recovery IDs, but does not execute positioning. Tests deliberately retain old range fields to verify that they are inert.

## Ambiguities and scope

No unresolved design ambiguity. The Phase 2.1 brief supersedes the three Phase 2 edge-case interpretations: it explicitly preserves Bare Hands bypass, defines both immediate offensive-action pools, and removes the FAR follow-up problem. Legacy turn-denial states are mapped as documented above. Enemy HP/Defense/damage, Dodge bands, durability maxima, economy, loot, room generation, Sanity and general magic balance were not rebalanced.

## Exact files changed in Phase 2.1

- `HearthVale_Content/encounters.js`
- `HearthVale_Content/expedition.js`
- `HearthVale_Content/schema.js`
- `HearthVale_Content/surface.js`
- `HearthVale_Content/validation.js`
- `HearthVale_Shell/src/expedition-actions.js`
- `HearthVale_Shell/src/expedition-checks.js`
- `HearthVale_Shell/src/expedition-combat.js`
- `HearthVale_Shell/src/expedition-lifecycle.js`
- `HearthVale_UI/expedition-views.js`
- `HearthVale_UI/service-views.js`
- `tests/browser/phase2-browser.js`
- `tests/browser/phase2.html`
- `tests/fixtures/v1-content.js`
- `tests/m2-combat.test.js`
- `tests/m3-content.test.js`
- `tests/m6b1-production-campaign.test.js`
- `tests/m6c1-ui.test.js`
- `tests/phase1-flow.test.js`
- `tests/phase2-combat.test.js`
- `tests/phase21-combat.test.js` (new)
- `tests/v1-validation.test.js`
- `docs/Phase2_1_Combat_Handoff.md` (new)

Other existing working-tree modifications belong to previous work and were preserved.

## Verification

- Focused Phase 2 / 2.1 / Phase 1 / content / validation: **157 passed, 0 failed**.
- Additional M6C1 UI regression: **4 passed, 0 failed**.
- Production campaign: **passed**, seed 33, all ten floors, three Hearts retained, 66 earned XP, nine exact reload checkpoints. The route uses production actions and favors a visible high Dodge chance rather than the removed range movement.
- Phase 2.1 browser harness: **6 passed**, including 390px layout and exact saved response continuation.
- Phase 1 browser regressions: **6 passed** (12 browser checks total).
- `git diff --check`: **clean**, including the final handoff check.
- Full `npm test`: **360 passed, 0 failed, 0 skipped**, exit 0 (273.6 seconds). An earlier run identified an obsolete UI assertion requiring FAR text. It now asserts range absence while retaining Bow Speed/restriction coverage.

Final self-review checked the single Poison boundary, response-phase persistence, no repeated incoming resolution, immediate-action recursion prevention, inert legacy range fields, exact move weights, and Normal/Dev presentation separation. All requested Phase 2.1 mechanics are implemented. No commit or push was made.

## Human playtest

Compare all three weapons without repositioning. Try player and enemy Knockdown, including a follow-up that re-applies it. Save after accepting Counterattack but before choosing its weapon/spell/Scroll response. Confirm the incoming hit is not repeated after load and only one response occurs. Check low-HP lethal Counterattack and no-equipment Return encounters. Stop for maintainer review before Phase 3.
