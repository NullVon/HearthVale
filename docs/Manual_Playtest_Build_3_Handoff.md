# HearthVale v0.1 Manual Playtest Build 3

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


October 7, 2026. This narrow revision restores the requested Essence economy and expedition-wide Overcast rules from `docs/Phase5_Magic_Overhaul_Design_Brief.md`. It supersedes the cost/reset/DC descriptions in the Playtest 2 handoff without starting another phase.

## Learned casting

Before a learned cast:

`Effective Cost Tier = max(0, Learned Cast Count - INT + 1)`

`Essence Cost = 2 ^ Effective Cost Tier`

The minimum is 1 Essence. All learned spells use this shared formula. Legacy spell-definition costs such as Fireball 4, Force 3, Heal 4, and Barrier 3 remain in the untouched content definitions for compatibility but **no longer control learned casting or its UI**. Affordability, action labels, spell tiles, and the next-cost HUD all use the shared formula.

Verified sequences:

| INT | First six learned-cast costs |
| --- | --- |
| 1 | 1, 2, 4, 8, 16, 32 |
| 2 | 1, 1, 2, 4, 8, 16 |
| 3 | 1, 1, 1, 2, 4, 8 |
| 4 | 1, 1, 1, 1, 2, 4 |

The existing saved `expedition.strain` field is now the single authoritative Learned Cast Count. This preserves compatibility: that field already counted learned casts throughout an expedition, including exploration casting. The duplicate encounter-local `combat.spellStrain` is no longer initialized or used. Obsolete `combat.spellStrain` and `combat.scrollStrain` fields are removed on a valid resumed combat action; loading old saves alone remains exact. Existing validation continues accepting valid legacy fields and rejecting negative counts.

A valid learned cast pays the shared pre-cast cost, resolves the existing effect, then increments the expedition count and evaluates Overcast. Existing spell output, accuracy, targeting, Impact, healing, barrier behavior, combat actions, and enemy continuation are preserved.

If the new count is at most WIS, no Overcast check occurs. Above WIS, the normal mental WIS check uses:

| Count above WIS | DC |
| --- | --- |
| 1 | 8 |
| 2 | 11 |
| 3 | 14 |
| 4 | 17 |
| 5 or more | 20 |

Failure loses exactly 1 Sanity; success loses none. Failure never cancels the resolved spell. Existing zero-Sanity death handling remains in use.

Exploration learned Heal, Unlock, and Teleport also use this shared count, cost, and risk. For learned Teleport, Overcast resolves before return discards expedition state; a lethal Overcast reaches the existing death boundary with expedition context intact.

## Reset timing and Scrolls

Expedition entry still initializes Essence and Learned Cast Count to 0. Victory, a new room combat, Return Encounter, retreat, and floor regeneration do not reset learned pressure. Active counts survive exact save/reload and deterministic continuation. Expedition return/end discards the count along with the expedition and sets unused Essence to 0. No Essence supply/drop rule was changed.

Scrolls still cost 0 Essence, never increase or reset Learned Cast Count, never perform an Overcast check, and never lose Sanity from Overcast. Their authored effects and combat action usage are unchanged. Combat Scrolls consume exactly one item as before. The exploration Scroll path now also consumes exactly one, bypassing the generic Wasteful consumable helper, consistent with the locked Scroll rule.

## Interface and tutorial

Normal Mode shows next learned-spell Essence cost and whether the next cast is safe or risks Overcast, including its WIS DC where relevant. It does not show a separate Strain/Learned Cast Count meter. Dev Mode may show the internal count and cost formula. Normal result prose no longer reports a numeric Strain count. All encounter-reset wording was corrected to expedition-return wording.

The existing one-time learned-magic introduction remains at Inventory → Spells or combat Spells access with a learned combat spell. Scroll ownership alone does not trigger it. Acknowledgement still persists `hearthvaleSurface.magicIntroductionSeen`; existing acknowledgements remain respected through save/load. The title is now **Essence & Overcast**.

Exact explanation:

> Learned magic draws on Essence. Repeated casting during an expedition becomes increasingly expensive, and your WIS determines how long you can cast safely. Push beyond your limit and you risk Overcasting; a failed Overcast costs 1 Sanity, though the spell still takes effect. Casting pressure resets when you return from the expedition. Scrolls cost no Essence and avoid Overcast, but are consumed when used.

No formulas or DC table appear in the introduction.

## Starter and preserved scope

Playtest 2 starter generation and validation were not changed: three generated people, exactly one learned Fireball/Bow-only starter, 10 arrows, normal Chest Armor, one normal HP Potion, normal resources including 0 starting Essence; the other two retain normal two-weapon packages with no starting spell. Name, age, stats, traits, and Hearts remain generated normally. No extra Essence was granted.

No unrelated balance changes were made. Bow, Brute/enemy balance, spell damage/effects, physical combat, Pit generation/resource weights, drops, ordinary economy, durability, Potions, Training, XP/AP, Sanity thresholds, day progression, Android safe-area implementation, unrelated Phase 9 UI, “0 Days completed,” and ending history entries remain untouched. Baseline hashes verify the corresponding content, generation, loot, economy, Training, starter/validation, CSS, and viewport files are unchanged.

## Post-build manual-playtest reward correction — 2026-10-07

A surgical working-tree correction was applied after the Playtest 3 APK was built:
- every resolved non-empty room now grants **+1 Essence guaranteed**;
- Resource rooms grant **+1 additional Essence**;
- resolved Combat rooms separately have a **50% chance to grant 1–2 Arrows**;
- the Arrow roll does not replace the guaranteed Essence and is room-based, not per enemy.

This aligns implementation with the locked Phase 5 magic economy plus the subsequent manual-playtest Arrow decision. No replacement APK was built for this correction; it is present in the working tree for later builds.

## Verification

- Focused/adjacent automated tests: **158 passed, 0 failed**.
- Initial focused regression run: **91 passed, 0 failed**.
- Full suite: **434 passed, 0 failed**, including both completion campaigns; **315.850 seconds**.
- Revised magic/responsive browser suite: **147 passed**.
- Adjacent Phase 9 presentation browser suite: **105 passed**.
- Adjacent Phase 2.1 combat browser suite: **6 passed**.
- Total browser groups: **258 passed**, including portrait/desktop widths, enlarged/200% text, simulated system insets, learned cost/action/save flow, tutorial acknowledgement/reload, Scroll bypass, and normal combat continuation.
- Syntax checks: **20 changed/new JavaScript files passed**.
- `git diff --check`: **passed, exit 0**.

The new `playtest3-magic-economy.test.js` proves the INT 1–4 sequences, ignored legacy spell costs, shared first cost for all existing combat spells, persistence across victory/new encounters/retreat/reload, return and next-entry resets, the full capped Overcast ladder, resolved effects on failed checks, exploration learned/Scroll distinction, lethal extraction ordering, next-cost UI, hidden count, and corrected tutorial. Existing tests retain the starter/randomness, success/failure Sanity, effects/action boundaries, Scroll victory, and one-time save behavior checks.

Evidence: `playtest3-validation/focused-tests.log`, `full-tests.log`, `browser-magic.log`, `browser-phase9.log`, `browser-phase2.log`, `syntax-check.log`, `diff-check.log`, baseline/change inventory, and `screenshots/`. Screenshots show test-only controlled prerequisites, not altered production starting resources. No physical Android install/device run was performed for this correction.

## Exact files changed in this correction

All paths below are relative to `HearthVale`. Older dirty-tree Phase work was preserved.

Production:

- `HearthVale_Shell/src/expedition-equipment.js`
- `HearthVale_Shell/src/magic-pressure.js`
- `HearthVale_Shell/src/expedition-combat.js`
- `HearthVale_Shell/src/expedition-rooms.js`
- `HearthVale_Shell/src/expedition-lifecycle.js`
- `HearthVale_UI/expedition-views.js`
- `HearthVale_UI/surface-views.js`
- `HearthVale_UI/magic-onboarding.js`

Tests/checkpoints:

- `tests/m2-combat.test.js`
- `tests/phase2-combat.test.js`
- `tests/phase21-combat.test.js`
- `tests/phase7-scroll-magic.test.js`
- `tests/phase9-ui.test.js`
- `tests/playtest2.test.js`
- `tests/playtest2-magic.test.js`
- `tests/playtest3-magic-economy.test.js` (new)
- `tests/build-playtest2-browser-fixtures.js`
- `tests/browser/playtest2-fixtures.js` (regenerated controlled checkpoints)
- `tests/browser/playtest2-browser.js`
- `tests/browser/phase9-browser.js`

Handoff:

- `docs/Manual_Playtest_Build_3_Handoff.md` (new)

Validation logs/scripts/screenshots and generated mobile/Android build outputs are supporting artifacts. No build-pipeline or Capacitor configuration source was changed.

## Debug APK

- Output: `artifacts\HearthVale-v0.1-Playtest-3.apk`.
- Existing `npm run android:apk` pipeline completed mobile bundling, Capacitor sync, and Gradle `assembleDebug`: **BUILD SUCCESSFUL**, 93 actionable tasks (27 executed, 66 up-to-date).
- Size: **4,604,862 bytes**.
- SHA-256: `A4BBFB551A684A7F9828039A6935F928420781CEB4BF6435E87B34CE370F0FC9`.
- The named copy matches the fresh `android/app/build/outputs/apk/debug/app-debug.apk` exactly. Packaged HTML, CSS, JavaScript, and source map match the current generated bundle by SHA-256. The APK contains the shared exponential formula, DC 8/11/14/17/20 ladder, corrected expedition-return tutorial, and no obsolete numeric Strain HUD.
- Playtest 2's named APK was preserved with its original SHA-256. No production signing configuration was created.
- Build log: `playtest3-validation/android-build.log`.

**No commit. No push. No next phase.**
