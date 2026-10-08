# HearthVale v0.1 Phase 8 — Pre-Release Integration Audit

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Audited 2026-10-07. Target: the current, already-modified HearthVale working tree with its sibling LWE-Core, using Node v24.19.0 and the production browser modules served on loopback. No release packaging, UI polish, commit, push, or new feature work was performed.

## 1. Executive summary

**READY FOR FINAL POLISH.** No gameplay RELEASE BLOCKER or HIGH defect was reproduced. Both existing production campaigns reach their respective endings, with deterministic save continuation. The audit found stale automated checks left behind by Phase 3, 4, 6, and 7 behavior changes. These were repaired in the test harness only; no Shell, Core, Content, Story, or production UI behavior was changed. Final verification: **408 Shell tests, 73 Core tests, 104 overlapping focused tests, and 498 browser check groups passed**.

The baseline full suite was **407 passed / 1 failed / 408 total**. The failure incorrectly required an accuracy/DC roll for a safe Scroll cast. Five browser harnesses also contained outdated fixture or presentation assumptions. Their baseline failures are retained below rather than treated as gameplay regressions.

This is confidence in the current browser vertical slice, not a certification of a packaged Android build. The supported legacy checkpoints were exercised; every historical or externally corrupted save was not exhaustively enumerated. Legacy learned magic remains an explicit compatibility limitation.

## 2. Issues found

### RELEASE BLOCKER

None reproduced.

### HIGH

None reproduced.

### MEDIUM

**P8-01 — Scroll integration regression test still requires the old DC roll. FIXED.**

- Reproduction: run `npm test`, or `node --test tests/phase2-combat.test.js`. The Advantage test casts an equipped Force Scroll within WIS capacity.
- Expected: automatic spell effect, no safe-cast check, one Scroll consumed, encounter Strain incremented, and exactly one offensive response.
- Actual baseline: production resolves correctly, but the test dereferences `lastResult.check.dc` when `check` is null. Baseline focused run: 103/104 passed; baseline full run: 407/408 passed.
- Systems: combat/Scroll integration verification. This is a false test failure, not a runtime crash.
- Changed: `tests/phase2-combat.test.js`. The test now distinguishes the legacy learned spell DC from Scroll safe capacity, and verifies consumption and encounter Strain.

**P8-02 — Browser verification harnesses no longer match accepted production behavior. FIXED.**

| Reproduction | Baseline actual | Expected check | File changed |
| --- | --- | --- | --- |
| Run Phase 1 browser checks | Stops with “Legacy rescue result or Poison missing” after five completed groups, although rescue and POISONED are visible | Require the accepted uppercase status label and retain the rescue/status assertions | `tests/browser/phase1-browser.js` |
| Run Phase 2.1 browser checks | Stops before gameplay with “Expected JSON-serializable data”; Bow fixture includes `durability: undefined` | Omit DUR for the accepted ammunition-only Bow | `tests/browser/phase2-browser.js` |
| Continue the Phase 2.1 harness after fixture correction | Old Advantage wording and Normal Mode learned-Spells navigation conflict with Phase 7; equipped Scroll action is sought on Weapons | Verify immediate offensive action wording, gate learned magic behind Dev Mode, and cast legacy equipped Scroll through Items | `tests/browser/phase2-browser.js` |
| Run M6C1 browser checks | Stops after 51 completed measurement groups with “Missing pit-tab spells” | Verify absence of Normal Mode legacy Spells and measure combat Items | `tests/browser/m6c1-browser.js` |
| Run M6C3 combined checks | Stops after six measurements with “Missing arrive”; later also assumes Normal Mode Spells | Verify automatic arrival at Mira, and inspect legacy spells only in Dev Mode | `tests/browser/m6c3-browser.js` |
| Run M6D final smoke | Stops after two measurements with “Missing arrive” | Verify automatic arrival at Mira | `tests/browser/m6d-browser.js` |

Affected systems: browser integration coverage, fixture serialization, arrival, poison presentation, magic navigation, and combat action presentation. All were pre-existing harness mismatches. Each is now fixed and the six browser runners pass. The assertions were updated to accepted rules, without making production conform to obsolete tests.

### LOW

**P8-03 — Top-level release verification counts are historical. NOT FIXED.**

- Reproduction: read the V1 Vertical Slice section of `README.md` after running the current suite.
- Expected: distinguish historical M6 acceptance totals from current Phase 8 verification evidence.
- Actual: the README prominently says “HearthVale tests: 304 passed” and “Combined verified baseline: 377”; the current Shell suite contains 408 tests. Those numbers describe an earlier milestone.
- Systems: release handoff/documentation; no gameplay impact.
- Files changed: none. This audit document supplies current evidence; update the overview during final release documentation/polish.

**P8-05 — Audit evidence copy matched Node's test discovery pattern. FIXED (audit-induced).**

- Reproduction: run `npm test` while the preserved copy is named `phase8-validation/before/phase2-combat.test.js`.
- Expected: execute only the actual suite.
- Actual: all 408 real tests passed, but the relocated copy was discovered as a 409th test file and failed on its relative imports.
- Systems: audit evidence/test discovery only. This failure was introduced by the audit, unlike P8-01/P8-02.
- Fix/files: renamed the copy to `phase8-validation/before/phase2-combat.test.js.txt`, preserving its contents. No production or test behavior changed. The clean full-suite rerun verifies the correction.

### DEFER

**P8-04 — Legacy learned magic is advertised more broadly than Normal combat exposes. NOT FIXED.**

- Reproduction: select a generated candidate with a starting learned spell, inspect Inventory → Spells, or learn a Tome between combats; enter Normal Mode combat.
- Expected for a later unified presentation: clearly explain which legacy spells are usable and where, alongside the Scroll system.
- Actual: starting cards and inventory expose learned spell slots and Tomes; Normal combat exposes Weapons/Items, while legacy learned combat casting requires Dev Mode. Exploration learned Heal/Unlock/Teleport and the old Essence/expedition-Strain path remain available where eligible. The HUD emphasizes encounter Scroll Strain.
- Systems: compatibility hooks, magic discoverability, terminology. This is deliberate Phase 7 behavior, not a breach of its acceptance rules.
- Files changed: none. Removing, unifying, or changing these hooks would require a design decision outside this audit. Do not silently migrate away old spells or change their economy.

Visual styling, art replacement, typography preferences, new magic progression, post-demo play, mentee/child succession, and broader town redesign remain outside scope. No additional feature was implemented.

## 3. Fixes performed

Only six test/harness files were edited: the Phase 2 Node test and the five browser files listed above. Pre-edit copies are retained under `phase8-validation/before/`, including files that were already untracked or modified when this audit began. These local copies define the audit delta independently of Git HEAD.

The fixes qualify as localized audit repairs because accepted gameplay was already functioning and stale fixtures/assertions prevented verification of it. The Bow fixture now uses a JSON-valid accepted item representation; the other changes align assertions and navigation with accepted Phase 4/6/7 behavior. No balance choice, new mechanic, state-machine rewrite, save migration, or production change was needed.

The additional P8-05 rename corrects audit evidence placement, with the original file content preserved. No copied test should retain an executable test-discovery filename under the repository.

Verification: rerun the 104-test focused selection, the complete automated suite, all six existing automated browser runners, JavaScript syntax checks, and `git diff --check`. Results are in section 6.

## 4. Architecture and major flows verified

Core owns transactional effects, PRNG and serialization. `createSurfaceGame` restores the same runtime, checkpoints each command, settles bounded automatic/death/completion scenes, validates, and rolls back on failure. Surface/day/service modules own town behavior. Expedition choices supply both UI actions and authoritative eligibility; combat/lifecycle share victory, poison and defeat boundaries. Browser `surface.js` owns presentation-only panels and Dev Mode, resumes legacy forced flow before rendering, and maintains separate automatic/manual save slots.

| Flow | Status | Evidence and notes |
| --- | --- | --- |
| New Game | PASS | Three valid generated packages, selected Human Actor, unchanged rejected Could-Have, valid starting loadout, randomized browser starts, initial checkpoint and Continue behavior. No new defect found. |
| Surface loop | PASS | All five destinations, Guild, Training, Mira/Talk, Inn, shared shop stock, material requests, ready-order notices, supply receipts, route explanation. Normal arrival bypasses the old intermediary; Dev diagnostics remain. |
| Rest/day loop | PASS | Confirmed Inn sleep advances once, restores HP/AP, preserves Sanity and Poison, processes world/economy/weekly boundaries; daily Talk recovery uses Actor-local year/day. Chapter campaign completes forty distinct boundaries. |
| Pit | PASS | Existing production nine-floor expedition and campaign routes cover rooms, rewards, full-Bag decisions, retreats, Return interception and weaponless Return. No forced-round screen loop or no-weapon softlock reproduced. |
| Physical combat | PASS | Bare Hands, Bow/ammo, contact DUR wear/destruction, Dodge/quality, armor, Block, Counterattack, Stagger/Knockdown, poison timing and immediate victory. Offensive responses do not chain extra actions. |
| Magic | PASS WITH NOTES | Phase 7 tests cover all four Scrolls, automatic hit/5+INT, WIS safe casts, DC 8/11/14 cap, failed Overcast, exact consumption, enemy continuation, spell kill, poison, support/Impact and deterministic reload. Browser suite exercises legacy equipped Force through Items; no dedicated four-Scroll browser runner exists. Legacy learned path remains P8-04. |
| Sanity/hallucinations | PASS | Bands, Mira guidance, daily recovery, ordinary pressure, hallucination deck selection/save persistence and subjective knowledge boundaries; Hollow Double appearance/rewards; Overcast at zero Sanity uses death precedence even on a spell kill. |
| Heart loss | PASS | Ordinary/Return loss restores full HP and clears Poison; first unlock/arrival messaging persists without repetition. Final-Heart Auron rescue retains its accepted half-HP/Poison rules and distinct rescue history. |
| Training | PASS WITH NOTES | Locked before unlock; persistent Guild access, AP/XP cost/eligibility, progress/stat gain and save receipt; reload persistence. Auron must be alive/available at Guild; his death does not create a replacement trainer. |
| Inventory/economy | PASS | Instance quantities, holdings, bag/gear swaps, potion/Antidote/Scroll consumption, ammunition, Tome learning, used gear, orders, protected stock and sale/purchase persistence. No reproduced duplication or negative quantity through legal actions. |
| Death/succession | PASS | Terminal Hearts/Sanity, no normal actions during takeover, three random successors, single controller transfer, fresh personal state, retained world/archives/Could-Have/calendar and exact reload. No new defect found. |
| Brute completion | PASS | Production campaign plus M6A and browser ending transitions: first personal clear settles rewards/history once, shared ending blocks gameplay and survives save/reload. |
| Forty-day completion | PASS | Production campaign plus M6A and browser tests: Day 40 remains playable before boundary, week 8 settles once, public calendar freezes at 40, final-day death archives without successor. Brute-on-Day-40 precedence is tested. |
| Save/reload | PASS WITH NOTES | Current and representative legacy checkpoints replay deterministically. Serialization is generic rather than a manual whitelist, so late-phase Actor/Pit fields persist. See section 5 for limits. |
| Dev Mode | PASS | Defaults OFF; toggle/panels do not mutate gameplay checkpoint. Raw combat/check math and legacy spell tab are gated. Normal player decision values remain visible. Arrival and empty-tab diagnostics are covered by Phase 6 tests. |

Content/reference validation and malformed-content rejection run in the full suite, including unique IDs, item/spell/Actor/location references, effects, room/deck constraints and routes. No broken production reference was reproduced. Legacy proof adapters (`game.js`, `pit.js`, `succession.js`) remain separate from the browser surface/succession flow; they were not replaced or expanded.

## 5. Save compatibility

- **Current saves:** exact reload and future RNG equality verified at opening, surface, combat/reactions, poisoned states, purchases/orders, training, heart loss, death, successor choice/selection and both endings. Combat committed move, Scroll quantity and `scrollStrain` persist. Encounter pressure resets only when a new Combat starts.
- **Legacy saves:** representative M1/M2/M3/M5 checkpoints, missing room deck, missing Antidote stock, missing Scroll pressure, zero-DUR ammunition weapons, equipped Scrolls, obsolete combat phases and pending survival/death were exercised. Loading the API itself remains exact; browser resume performs accepted forced transitions through Core commands and checkpoints those transitions.
- **Migration:** no new migration or schema change was made. Optional fields materialize only on the relevant accepted action; no load-time random draw or item consumption was introduced.
- **Succession:** world changes, economy and institutional history survive; equipment, personal XP/training/claims/statuses come from the fresh successor package. No private receipt is reassigned to the new Actor.
- **Unrecoverable cases:** none found among supported tested saves. Unsupported schema, malformed state/RNG and foreign saves are rejected rather than guessed into a new state. Browser saves remain local to their origin; blocked/quota-limited storage reports that the action completed but could not be saved. No promise of recovery from arbitrary corruption or transfer between browser/APK origins is made.

## 6. Test results

All commands run in HearthVale unless stated otherwise. Logs are retained in the repository as `phase8-*.log`; browser totals are summarized in `phase8-validation/browser-results.md`.

| Check | Baseline | Final |
| --- | --- | --- |
| `npm test` (complete Shell suite) | 408 total: 407 passed, 1 failed, 0 skipped | 408 passed, 0 failed, 0 skipped; exit 0, 274776.9468 ms; `phase8-clean-full-tests.log` |
| First post-fix `npm test` attempt | Not applicable | 409 discovered: all 408 real tests passed; 1 audit-copy import failure (P8-05); clean rerun required |
| `node --test tests/phase1-flow.test.js tests/phase2-combat.test.js tests/phase21-combat.test.js tests/phase3-pit-economy.test.js tests/phase4-status-sanity.test.js tests/phase5-training-clarity.test.js tests/phase6-world-flow.test.js tests/phase7-scroll-magic.test.js` | 104 total: 103 passed, 1 failed | 104 passed, 0 failed, 0 skipped |
| Adjacent integration suites | Included in complete Shell run | M1–M6, persistence, combat, content and UI projection suites included in complete run; not counted as additional independent tests |
| Existing production campaigns | M6B1 and M6B2 both passed | Both passed in the clean full run (2/2); included in the 408 count |
| Sibling LWE-Core: `node --test` | 73 passed, 0 failed | Same run; no Core edits |
| Phase 1 browser | FAIL: stale Poison wording | PASS — 6 groups |
| Phase 2.1 browser | FAIL: non-JSON Bow fixture | PASS — 6 groups |
| M6C1 browser | FAIL: missing Normal legacy Spells tab | PASS — 159 groups |
| M6C2 browser | PASS | PASS — 107 groups |
| M6C3 browser | FAIL: obsolete arrival click | PASS — 189 groups |
| M6D browser | FAIL: obsolete arrival click | PASS — 31 groups |
| `node --check` over Shell/Content/Story/UI/browser JS | Not separately run before edits | 86 files, 0 failures; final M6D edit also checked |
| `git diff --check` | PASS | PASS (exit 0); existing LF/CRLF advisories only |

Browser runners total **498 successful check groups**; these are harness groups, not 498 Node tests. They use production UI controls and restore both prior browser save slots in `finally`. The fixture-only M3/M4/M5 pages are checkpoint launchers rather than additional automated runners; related assertions are in Node suites. Responsive checks include 320/390/1100px frames and enlarged/200% text as supported by each runner.

No lint/type script is configured in `package.json`; none was installed. Content validation runs in the existing suites. No new simulation framework was introduced. Both existing long production campaigns were practical and executed.

Pre-existing failures are P8-01/P8-02; P8-05 was introduced and corrected during this audit. No production failure was introduced. No observed failure was classified as flaky or dismissed as known. Harness corrections preserve gameplay assertions and deterministic-save checks.

## 7. Final recommendation

**Proceed to final UI/polish.** Clarify compatibility-only learned magic in that pass and refresh release documentation. Do not change its rules or save format incidentally. Preserve the corrected harnesses as the regression baseline.

Existing ignored `www/` assets are from the earlier local build and lack `castCombatScroll`/`scrollStrain`. They are not the audited browser source and must not be copied as the final release payload. The existing `android:sync` script invokes `build:mobile` to regenerate them during the later packaging phase. No build or APK/platform verification was performed here.

The audit does not begin that next work. No release artifact was built, and no commit or push was performed.
