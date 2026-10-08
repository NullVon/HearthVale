# HearthVale v0.1 Manual Playtest Build 2

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Completed October 7, 2026. This build implements the superseding learned-magic design and the four requested playtest revisions. It starts no new development phase.

## APK

- Output: `artifacts\HearthVale-v0.1-Playtest-2.apk`
- Built with the existing `npm run android:apk` pipeline: mobile bundle, Capacitor Android sync, Gradle `assembleDebug`.
- Gradle: **BUILD SUCCESSFUL**, 93 actionable tasks, 27 executed and 66 up-to-date.
- Size: **4,604,375 bytes**.
- SHA-256: `13BDD474951BEB34B32E3C13D5A8E67C5ED47EB6BCDABE6F23414D5D8532DBEB`.
- This is a debug APK. No production signing configuration was created.
- The packaged assets contain the corrected learned Strain implementation, learned-magic onboarding, top/bottom inset variables, and `SystemBars.insetsHandling: "css"`. They contain no obsolete “Using Scroll magic builds Strain” tutorial.

## Interrupted work and reconciliation

The working tree was already dirty with legitimate Phase 1–9 work. Its diff/status and the interrupted attempt's pre-edit source hashes were inspected before continuing. No reset or checkout was used, and older Phase work and handoffs were preserved.

The interrupted attempt had changed eight existing files: `surface-candidates.js`, `surface-world.js`, Shell `surface.js`, Content `validation.js`, UI `surface-views.js`, UI `surface.css`, UI `surface.js`, and `m1-surface.test.js`. It also changed `capacitor.config.json` and added a Scroll onboarding module and `playtest2.test.js`.

The valid starter, validation, badge, and inset work was retained and checked. The incorrect Scroll tutorial was replaced with learned-magic onboarding; its Shell acknowledgement and persistent flag were renamed accordingly. The task-created `HearthVale_UI/scroll-onboarding.js` was removed and replaced by `magic-onboarding.js`. Old partial `scrollIntroductionSeen` flags do not suppress the correct learned introduction. Tests were revised to verify the superseding design.

The Phase 7 Scroll pressure implementation itself was then moved into a neutral learned-magic module. A preliminary full run exposed an extra starter-selection RNG draw shifting an existing integration replay. Selection was corrected to use the already-generated ages without drawing again. The failing integration assertion was preserved and passes in the final full run.

## Final casting behavior

### Learned spells

Existing public action eligibility checks spell ownership, combat phase/target availability, and ordinary Essence affordability. A valid action pays the existing learned-spell cost and resolves its original effect, then increments `combat.spellStrain` and applies pressure. It consumes the existing combat action and uses the existing enemy-turn, interruption, victory, and defeat flow.

The first WIS casts in an encounter are safe. Excess casts use DC 8, then DC 11, then DC 14; subsequent DC stays 14. These are existing mental WIS checks. Failure costs exactly 1 Sanity; success costs none. Overcast does not cancel the spell effect. The spell's separate existing accuracy check can still miss. Result data keeps accuracy and Overcast checks separate.

Fireball, Force, Heal, and Barrier retain their learned effects, targeting, accuracy, Impact, healing, and barrier behavior. In particular, existing learned Fireball retains its accuracy check and flat 5 damage. No spells were added.

### Essence was preserved

The existing `paySpell` code and cost rules were not edited. Learned spells continue paying:

`spell.cost + max(0, expedition.strain - INT)`

The older `expedition.strain` counter remains solely for that accepted Essence surcharge and increments as before. It is not another Overcast system. Encounter Overcast has one state, `combat.spellStrain`. Costs, Essence collection, starting Essence, and expedition resource initialization were not rebalanced. The starter begins with ordinary 0 Essence and must obtain Essence under the existing rules.

### Scrolls

A valid owned combat Scroll resolves its existing generic effect, consumes exactly one item, and consumes its existing combat action. Enemy continuation, Impact, interruption, and victory resolution remain intact. Scrolls do not increment or reset learned Strain, do not perform a WIS Overcast check, and cannot lose Sanity from Overcast. They do not pay learned Essence costs.

The accepted generic Scroll effects are unchanged, including Fireball's `5 + INT` damage. This preserves the existing effect distinction between the older learned path and the Phase 7 generic Scroll path; no damage unification or retuning was introduced. Wasteful still does not consume extra Scrolls.

### State and old saves

New encounters initialize `combat.spellStrain` to 0. Ending combat removes the encounter state, and the next encounter starts at 0. Active learned Strain survives save/reload and deterministic replay.

Validation accepts optional nonnegative `spellStrain` and legacy `scrollStrain`. Loading an old save alone remains exact and consumes no RNG. On a valid resumed combat action, missing `spellStrain` initializes to 0 and legacy `scrollStrain` is removed. A historical Scroll cast count is deliberately not converted into learned-magic risk. Existing saves with neither field also work. Invalid negative values remain rejected.

## Guaranteed starter

New Game still generates three people through the unchanged ordinary generator. The magic package index is the sum of those generated ages modulo three. This selects from already-randomized people without consuming another RNG draw or shifting later world generation.

Exactly one receives:

- Bow as the only normal starting weapon, with **10 arrows**.
- One normal Chest Armor, one Basic HP Potion, and **45 Gold**.
- Learned **Fireball** in the existing learned-spell slots.
- Ordinary Hearts, HP, Sanity, Essence, and other starting resources; no compensation.

The other two retain their generated two-distinct-weapon packages and corresponding ordinary arrow rules; their starting learned-spell slots are empty. Names, ages, stats, traits, and Hearts still come from the normal generator. INT and WIS are not forced. Candidate cards identify the “Learned Fireball + Bow starter.” Succession still uses the ordinary candidate generator.

Validation recognizes an ordinary two-distinct Tier-1 weapon package and the explicit Bow-only plus exactly one learned Fireball package. Both still require the proper arrows, Chest Armor, HP Potion, Gold, valid stats, traits, and spell eligibility. Arbitrary one-weapon packages and malformed magic packages remain invalid. The ordinary generator's existing optional starting-spell compatibility remains valid outside the special opening cohort.

## Onboarding and interface

The first visit to Inventory → Spells or the combat Spells interface with at least one learned combat spell shows one inline information panel with a “Got it” button. Scroll ownership alone does not trigger it. Learned spells are accessible in Normal Mode; legal casts use the existing combat actions.

Exact player-facing introduction:

> Using learned magic builds Strain. Your WIS determines how much magic you can safely cast during an encounter. Push beyond that limit and you risk Overcast. A failed Overcast costs 1 Sanity, though the spell still takes effect. Strain clears when the encounter ends. Scrolls cast a spell without building Strain, but the Scroll is consumed.

Acknowledgement sets `hearthvaleSurface.magicIntroductionSeen` in saved world state. It changes no Actor resources, AP, time, combat state, or RNG. Repeated acknowledgement is a no-op. The flag survives autosave and manual save/load, so subsequent encounters do not interrupt the player again.

Normal guidance now distinguishes reusable learned spells using Essence and Strain from consumable Scrolls avoiding Strain/Overcast. The active learned interface shows capacity and next-cast risk. Raw check formulas/DC values remain Dev Mode details. No basic tutorial gives the DC ladder.

## Android safe area

Capacitor 8.5.2's built-in SystemBars support is configured for visible system bars and CSS inset handling. Its platform system-bar/display-cutout insets populate the `--safe-area-inset-*` variables. Shared layout uses those variables, with CSS `env(safe-area-inset-*)` fallback for browsers, for top and side padding, the sticky HUD position, bottom content padding, and bottom utility controls. There is no Pixel-specific margin or hardcoded production inset.

The existing viewport and browser responsive layout remain in use. The top fix preserves bottom navigation/gesture clearance. Native support also provides its documented fallback handling for older WebViews.

Browser checks covered Surface, Character, Inventory, Guild/Training, Pit, combat, Items, learned Spells, and demo completion at widths 320, 390, 430, and 1100, with ordinary and 200% text, with and without simulated top/bottom/side system insets. Screenshots confirm readable top headers/HUD and bottom controls. **No physical Android device or emulator run was performed, and the APK was not installed.** Actual handset inset behavior remains a manual-playtest verification item.

## Verification

| Check | Final result |
| --- | --- |
| Focused and adjacent tests, including unchanged integration replay | **210 passed, 0 failed** |
| Full automated suite, including both completion campaigns | **427 passed, 0 failed**, 292.215 seconds |
| Existing browser suites | **603 passed** |
| New Playtest 2 browser groups | **147 passed** |
| Total browser groups | **750 passed** |
| Changed/new JavaScript syntax checks | **27 passed** |
| `git diff --check` | **Passed** |
| Android debug build | **Succeeded** |

The new focused tests cover WIS-safe casts and the entire capped DC ladder, Overcast success/failure and resolved effects, all existing learned combat spells, existing Essence surcharges, invalid public actions, Scroll no-check/no-Sanity/no-Strain behavior, interleaved paths, exact consumption/action flow, victory, active-state replay, encounter reset, old-save migration, starter package shapes and RNG continuity, learned-only tutorial triggering, acknowledgement, and persisted seen state.

Evidence lives in `playtest2-validation/`: `final-focused-tests.log`, `final-full-tests.log`, eight `browser-*.log` files, `final-syntax-check.log`, `diff-check.log`, `android-build.log`, baseline/change inventory, and `screenshots/`. Preliminary logs are retained as investigation evidence; the final logs above are authoritative.

## Exact source/test files changed for this revision

These paths are relative to the HearthVale directory. They describe this revision, not all earlier dirty-tree work.

Existing production files:

- `HearthVale_Content/validation.js`
- `HearthVale_Shell/src/expedition-combat.js`
- `HearthVale_Shell/src/expedition-lifecycle.js`
- `HearthVale_Shell/src/scroll-magic.js` (pre-existing untracked Phase 7 file)
- `HearthVale_Shell/src/surface-candidates.js`
- `HearthVale_Shell/src/surface-world.js`
- `HearthVale_Shell/src/surface.js`
- `HearthVale_UI/expedition-views.js`
- `HearthVale_UI/surface-views.js`
- `HearthVale_UI/surface.css`
- `HearthVale_UI/surface.js`
- `capacitor.config.json`

New production files:

- `HearthVale_Shell/src/magic-pressure.js`
- `HearthVale_UI/magic-onboarding.js`

Existing tests updated:

- `tests/m1-surface.test.js`
- `tests/m2-combat.test.js`
- `tests/phase2-combat.test.js`
- `tests/phase21-combat.test.js`
- `tests/phase7-scroll-magic.test.js`
- `tests/phase9-ui.test.js`
- `tests/browser/m6c1-browser.js`
- `tests/browser/m6c3-browser.js`
- `tests/browser/phase2-browser.js`
- `tests/browser/phase9-browser.js`

New tests and handoff:

- `tests/playtest2.test.js`
- `tests/playtest2-magic.test.js`
- `tests/build-playtest2-browser-fixtures.js`
- `tests/browser/playtest2-browser.js`
- `tests/browser/playtest2-fixtures.js` (generated test checkpoints)
- `tests/browser/playtest2.html`
- `docs/Manual_Playtest_Build_2_Handoff.md`

The pipeline refreshed ignored generated `www/` assets, Android synchronized assets/configuration, and debug build outputs. The named APK is a copy of `android/app/build/outputs/apk/debug/app-debug.apk`. Validation logs/screenshots are supporting artifacts; no build-pipeline source was edited.

## Scope confirmation

**Scrolls do not cause Strain. Learned spells do cause Strain.** No Bow balance, difficulty, enemy statistics, physical combat formulas, weapon durability, potion strength/quantity, spell costs, Essence balance, starting stat generation, Sanity thresholds, Pit-generation balance, economy/drop balance, Training, XP/AP, or day progression was changed. No unrelated Phase 9 UI was redesigned. The resource-heavy floor possibility, “0 Days completed,” ending-history filtering, and Auron's Hearts history entry were left alone.

Hashes confirm equipment/Bow definitions, enemy definitions, old spell-cost code, Pit generation, loot, economy, and Training files are identical to the pre-attempt source baseline. Legitimate pre-existing changes in those files remain intact.

**No commit was made. No push was performed. No next phase was started.**
