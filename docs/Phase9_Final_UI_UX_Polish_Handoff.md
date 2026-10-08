# HearthVale v0.1 Phase 9 — Final UI / UX Polish

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Date: 2026-10-07

**READY FOR MANUAL RELEASE PLAYTEST**

## Summary

The existing vertical interface now uses a consistent parchment town palette and dark Pit palette, shared cards and controls, clearer resource hierarchy, and larger touch targets. Combat choices precede prior outcomes; New Game and succession share compact comparison cards. Secondary references use disclosures while important outcomes remain visible.

This phase changed presentation only. No new mechanics, content, art pipeline, developer tooling, release build, packaging, commit, push, or next-phase manual playtest was performed. Earlier working-tree changes were preserved.

## Exact files changed in Phase 9

Paths below are relative to the HearthVale project directory, `HearthVale`.

| File | Purpose |
| --- | --- |
| `HearthVale_UI/surface.css` | Shared visual system, compact HUD, touch controls, responsive grids, focus and diagnostic styling |
| `HearthVale_UI/surface-views.js` | Control emphasis, resource grouping, candidate comparisons, town navigation |
| `HearthVale_UI/expedition-views.js` | Combat/Defense hierarchy, recent outcomes, Items effects and Scroll pressure |
| `HearthVale_UI/service-views.js` | Training costs, shop funds, inventory guidance, compact receipts |
| `HearthVale_UI/surface.js` | Title/Continue/manual-load explanation and presentation-only Dev Mode attribute |
| `HearthVale_UI/index.html` | Safe-area viewport declaration |
| `tests/phase9-ui.test.js` | Four presentation/action-contract regression tests |
| `tests/build-phase9-browser-fixtures.js` | Existing Core-effect fixture workflow for magic and Heart-loss samples |
| `tests/browser/phase9-fixtures.js` | Generated test-only saves; never imported by production |
| `tests/browser/phase9-browser.js` | Responsive presentation and four real Scroll-use checks |
| `tests/browser/phase9.html` | Small browser runner/checkpoint selector using the existing workflow |
| `docs/Phase9_Final_UI_UX_Polish_Handoff.md` | This handoff |

Auxiliary evidence is under `phase9-validation/`: pre-edit UI copies in `before/`, `before-source-hashes.json`, `changed-production-files.txt`, `initial-focused.log`, `phase9-contract-tests.log`, `final-focused.log`, `full-tests.log`, `diff-check.log`, `final-diff-check.log`, seven `browser-*.log` result files, and screenshots listed below. These are audit artifacts, not production assets. Existing Phase 8 artifacts and older dirty files are outside this phase's change list.

## Screen-by-screen changes

| Screen | Presentation changes |
| --- | --- |
| Title / Continue / Load | Clear primary New Game action; helper distinguishes the latest automatic checkpoint from the manual save. Existing save behavior unchanged. |
| New Game | Name, age, HP/Hearts/Sanity, six compact stat cells, trait names, loadout and a named Choose button. Full trait explanations and learned-magic guidance remain in a disclosure. Empty lifetime-history sections removed from fresh candidate comparisons. Three generated candidates and selection IDs unchanged. |
| Surface | Two-column destination controls, full-width Pit destination, concise no-AP movement guidance, compact current residents. Automatic arrival preserved. |
| Guild / Auron / Training | Shared receipt panel; clear Guardian Adventurer introduction; bordered Training panel groups the accepted 1 AP + 2 XP cost, current resources, progress and eligibility. Named Train actions receive primary emphasis. Unlock messaging and unobtrusive “Progress saved.” preserved. |
| Mira / Inn | Shared typography, residents and recent-activity treatment; Sleep remains the primary action. Dialogue, Sanity guidance and service behavior unchanged. |
| Shops / supplies | Gold balance and no-AP transaction guidance grouped above stock; Buy disclosure opens by default. Availability, protected stock, quantities, prices and supply receipts retained. Sale/confirmation controls receive caution styling. |
| Inventory | Selected tabs remain explicit. Action controls precede detailed item references; carried effects use a disclosure. Scroll effect and eligible exploration-use guidance distinguish Scroll Items from learned spell slots. Existing equipment, use, learn and discard payloads retained. |
| Pit / encounter | Floor/room and expedition resources condensed; primary room actions precede prior results and equipment references. Forward and entry actions emphasized. Existing routes, costs and Return warnings retained. |
| Physical combat | Enemy HP emphasized; committed move stays above the choice panel; Bare Hands and clickable weapon tiles precede recent outcomes. Durability, arrows, range-dependent information, knockdown and other accepted visible states retained. Redundant empty status text removed. No round-outcome intermediary introduced. |
| Defense | Dodge and Counterattack grouped in a two-column grid above equipment. Block remains on equipped tiles with durability. Helper explains incoming damage before Counterattack and physical-contact wear. Rules and availability unchanged. |
| Items / magic | Scroll quantities and effects appear together. A pressure panel describes the next cast, WIS safe casts, one action/item and reset boundary; Overcast guidance uses player prose. Ineligible exploration Scrolls have explicit guidance. Raw DC/check math remains gated to Dev Mode. |
| Pit/day results | Shared recent-outcome panel and readable reward list; primary next action stays above secondary references. Day-ending and lifetime summaries retain their meaningful headings and information. |
| Heart loss | Existing significant return result and Training-unlock heading retained. New styling keeps the explanation, restored HP, lost Heart, cleared Poison and expedition reset readable. No rule changes. |
| Sanity / hallucinations | Sanity stays a distinct labeled HUD resource. Mira text and subjective hallucination rendering/content are unchanged. No event label, hidden threshold or new disclosure was introduced. |
| Succession | Same compact cards and named choices as New Game. Existing death gate, three random candidates and transfer behavior unchanged; no Child/Mentee features. |
| Demo completion | Shared spacing and control hierarchy, clear completion heading and preserved history/thank-you copy. Terminal gameplay-control exclusion unchanged. |
| Dev Mode | Dashed diagnostic panels and top boundary distinguish check math from gameplay. Existing phase labels and useful diagnostics retained; Normal Mode gating unchanged. |

## Mobile and accessibility improvements

Buttons and disclosure summaries have a 48px minimum height. Selected controls include text plus a thicker border; caution controls use dashed borders; unavailable controls retain disabled semantics and explanatory text. Keyboard focus has a visible outline. Primary resource values use tabular numerals and HP, Hearts and Sanity are separately labeled.

The three-resource HUD and compact expedition bar reduce top-of-screen crowding. Current combat decisions precede history. At 390px, the automated check verifies the first combat action is above the bottom utility bar without scrolling. Town destinations use a grid; equipment uses two columns at common phone widths and one at 320px. Candidate stats use three compact columns. Long names and control labels wrap.

Utility controls include safe-area padding. Short-height and enlarged-text layouts allow bars to flow naturally. Tested widths are 320, 390, 430 and 1100px, including enlarged and independent 200% text. Checked screens have no horizontal document overflow or clipped/small controls. Longer bag, Training, result and history screens intentionally retain scrolling.

## Text and terminology

- Standardized secondary feedback headings to “Recent outcome” and “Recent activity.”
- Added “What do you do?” / “How do you defend?” for Normal Mode choices.
- Added concise Scroll effect, next-cast and exploration-eligibility guidance; Fireball prose preserves base damage plus INT without a developer formula block.
- Explained automatic Continue versus manual Load, and learned spells versus combat Scroll Items.
- Preserved Hearts, Sanity, Training, Guild, Guardian Adventurer, Pit, Scroll, Strain and Overcast; narrative voice and dialogue outcomes were not rewritten.

## Gameplay preservation

SHA-256 comparisons against the start-of-phase source snapshot identify exactly the six UI production files above. Every pre-existing Shell/src, Content and Story file retains its starting hash. Core was not edited. The comparison is recorded in `phase9-validation/changed-production-files.txt`.

Presentation tests compare emitted combat payloads with the exact legal choices across all four combat phases, both panels and all four selected swap slots. They assert reachability, no duplicate active actions, unchanged saves and read-only rendering. Existing integration tests verify combat, durability, Poison, Sanity, Heart loss, economy, progression, Training, succession and completion. No intentional gameplay or balance changes were made and no gameplay fixes were required.

## Verification

| Check | Exact result |
| --- | --- |
| Initial focused run | 80 passed, 0 failed, 0 skipped; 20,244.9123ms |
| Final focused run | 84 passed, 0 failed, 0 skipped; 20,379.2443ms |
| Full `npm test` (`node --test`) | 412 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 295,971.7275ms |
| Production Brute campaign (included above) | PASS: New Game through personal Brute completion and exact save continuation; 115,246.7098ms |
| Production Day 40 campaign (included above) | PASS: rescue, death, fresh succession and forty ordinary Day boundaries; 129,332.9306ms |
| Browser M6C1 | 159 groups passed |
| Browser M6C2 | 107 groups passed |
| Browser M6C3 | 189 groups passed |
| Browser M6D | 31 groups passed |
| Browser Phase 1 | 6 groups passed |
| Browser Phase 2.1 | 6 groups passed |
| Browser Phase 9 | 105 groups passed |
| Browser total | **603 check groups passed** (498 existing + 105 new) |
| JavaScript syntax | All eight changed/new JavaScript files passed `node --check` |
| `git diff --check` | PASS, exit 0; no whitespace errors |

The final focused command runs `m1-surface`, `m6c1-ui`, `m6c2-ui`, `m6c3-ui`, `phase1-flow`, `phase3-pit-economy`, `phase4-status-sanity`, `phase5-training-clarity`, `phase6-world-flow`, `phase7-scroll-magic` and `phase9-ui` tests. These counts overlap the full suite; they are not additive. Core's separate 73-test Phase 8 result was not rerun as a separate command in Phase 9.

The initial new contract test had a coverage error: it expected swap payloads for all equipped slots while rendering only selected slot zero. The test was corrected to exercise all four selections; no production behavior was changed to satisfy it. The corrected four tests pass in both the focused and full runs. Initial failure evidence is retained.

New browser checks cover 32 screen/width combinations at ordinary, enlarged and 200% text (96 groups), eight checks for Fireball/Force/Heal/Barrier use and continuation, and one combat hierarchy check. They confirm one Scroll consumed, one action, correct damage/healing/Barrier/Strain, exact save/load and one Poison tick at the ordinary boundary. Existing runners also verify equipment clicks, Defense, Training, navigation, focus restoration, succession and both terminal endings, with no captured game warnings/errors in the runners that capture them. Browser runners restore their prior save slots.

### Visual review

Direct production-page screenshots at 390 × 844 were saved and visually reviewed under `phase9-validation/screenshots/`:

`title.jpg`, `new-game.jpg`, `surface.jpg`, `guild.jpg`, `training.jpg`, `shop.jpg`, `inventory.jpg`, `pit.jpg`, `combat.jpg`, `defense.jpg`, `items-magic.jpg`, `result-summary.jpg`, `heart-loss.jpg`, `succession.jpg`, `demo-completion.jpg`, `mira.jpg`, `dev-mode.jpg` and `magic-weapons.jpg`.

Samples cover every requested visual-review category. Some screenshots intentionally show a scrolled panel with persistent utilities. The Magic checkpoint uses controlled prerequisite values, including enemy HP above its authored maximum, to support repeated casts; that value is fixture setup, not a production content change. Initial harness-crop attempts were replaced by direct mobile screenshots for the delivered samples. No clipping, overlapping panels or illegible controls were found in the inspected samples.

## Remaining concerns and deferred work

- **RELEASE BLOCKER / HIGH / MEDIUM:** None reproduced in this phase's automated or visual checks.
- **LOW:** The disabled Bow during Defense includes the existing generic ammunition/condition hint alongside the more specific “Cannot Block.” The specific restriction remains visible; the redundant generic hint could be refined later.
- **LOW:** Long inventories, candidate lists and life records still scroll. Choices and summaries are grouped, but this phase does not force every screen onto a single phone viewport.
- **LOW:** Validation uses the local browser, not a physical Android/iOS device. Native safe-area behavior, on-screen keyboard behavior and real finger ergonomics remain for the authorized next manual-validation phase. No native package was built.
- **LOW (inherited):** Historical README acceptance counts were left unchanged; use this handoff for current verification totals.
- **DEFER:** New art/portraits, animation infrastructure, a frontend rewrite, new developer tools, additional accessibility settings, new spells/routes/Actors, Child/Mentee succession and any mechanics/balance changes remain outside Phase 9.

## Recommendation

**READY FOR MANUAL RELEASE PLAYTEST.** The polished working tree is ready for the next separately authorized manual validation phase. Phase 9 ends here; no packaging, release actions, commit or push were performed.
