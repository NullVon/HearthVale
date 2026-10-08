# Phase 5 — Training / Auron Narrative Clarity

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented against the current working tree on 2026-10-04. The user's attached **Training / Auron Narrative Clarity** request governs this task; the older `Phase5_Magic_Overhaul_Design_Brief.md` does not. Existing accepted Phase 1–4 work was preserved. No Phase 6 work, commit, push, full campaign, full suite, or APK build was performed.

## Player flow

The first ordinary Heart loss still returns the player safely to the Pit Entrance at full HP, clears Poison, and retains the existing Heart-loss/Scar handling. It now sets the existing Training unlock flag immediately, retaining the pending Guild introduction. The return result has a prominent **Training with Auron unlocked** heading and explains Auron's role as Guardian Adventurer, his help preparing for another descent, the **Leave → Guild → Training with Auron** route, and the unchanged **1 AP + 2 XP** cost. Later losses do not unlock or announce it again.

Training remains in the Guild, with its existing living/present Auron requirement. The town destination label permanently adds **Training with Auron** after unlock. Guild dialogue explains why Auron offers preparation after the first loss; two existing service-dialogue lines establish his Guardian Adventurer role without adding a dialogue tree. The ordinary-loss wording does not claim that Auron spent a Heart or performed the separate final-Heart rescue. That rescue and death handling remain unchanged.

An integration test found that the old Guild arrival flow returned immediately after Auron's introduction, leaving Lina's automatic first meeting to overwrite the next training receipt. Both arrival introductions now finish in the same transaction. Their existing firstOnly behavior remains: no daily Sanity recovery is granted or consumed.

## Training and XP

- The Guild displays current XP and AP alongside the unchanged session cost.
- Session buttons explain progress as sessions toward +1 in the selected stat.
- One shared, read-only availability query supplies legal training choices and UI reasons: insufficient XP/AP, unavailable Auron, or no remaining eligible sessions today.
- Receipts report 2 XP and 1 AP spent, remaining XP/AP, and either session progress or the completed stat increase and new Level.
- Daily offerings, per-stat daily use, stat cap, Trait-adjusted requirements, costs, and Level/stat mechanics are unchanged.

## Saving and compatibility

The existing `game.save()` → `localStorage.setItem()` pipeline, autosave/manual slot keys, and save format remain in use. A small UI helper wraps that same write and emits **Progress saved.** only after success. Confirmation is requested for the first Heart loss, newly unlocked/introduced Training, successful training, and explicit manual Save. Ordinary actions still autosave silently. Failed writes retain the existing warning and never report success; in-memory progress remains playable.

Transient before/after UI checkpoints are not stored and introduce no second save system. Existing service flags and actor training data persist normally; only the optional return-result `trainingUnlocked` presentation flag is new. Old saves with pending Guild introductions or already-unlocked Training remain compatible. Loading requires no new migration or random draws. Exact save/reload and non-repeated training/unlock behavior are tested.

## Exact files changed by this task

Other dirty files belong to the existing working tree and were not recreated or reverted.

| File | Change |
| --- | --- |
| `HearthVale_Content/dialogue.js` | Two Auron service lines |
| `HearthVale_Shell/src/expedition-lifecycle.js` | Immediate first-loss unlock and return explanation |
| `HearthVale_Shell/src/training.js` | Shared availability presentation; progression receipts |
| `HearthVale_Shell/src/service-actions.js` | Complete Guild arrival introductions together |
| `HearthVale_UI/expedition-views.js` | Prominent unlock result heading |
| `HearthVale_UI/service-views.js` | Guardian dialogue, XP/AP and eligibility presentation |
| `HearthVale_UI/surface-views.js` | Persistent Guild destination label |
| `HearthVale_UI/surface.js` | Existing save pipeline integration and important-event confirmation |
| `HearthVale_UI/save-feedback.js` | New small save-feedback helper |
| `tests/phase1-flow.test.js` | Updated first-loss timing/message expectations |
| `tests/m5a-death.test.js` | Updated first-loss unlock expectation; retained death/rescue assertions |
| `tests/phase5-training-clarity.test.js` | Six focused tests, including actual UI dispatch with minimal DOM/storage doubles |
| `docs/Phase5_Training_Auron_Clarity_Handoff.md` | This handoff |

## Focused verification

62 distinct focused/adjacent tests passed across these runs:

| Command | Result |
| --- | --- |
| `node --test tests/phase5-training-clarity.test.js tests/phase1-flow.test.js tests/m5a-death.test.js tests/phase4-status-sanity.test.js` | 38 passed, 0 failed |
| `node --test tests/phase5-training-clarity.test.js tests/phase4-status-sanity.test.js tests/phase21-combat.test.js tests/m6c1-ui.test.js` | All 16 combat and 4 UI regression tests passed. The initial new UI test exposed the receipt-overwrite issue described above; the corrected Phase 5 test subsequently passed in the 38-test run. |
| `node --test --test-name-pattern='training' tests/m3-content.test.js` | 1 passed, 0 failed |
| `node --test --test-name-pattern='deck survives\|Treasure table\|valuable/material' tests/phase3-pit-economy.test.js` | 3 passed, 0 failed; use regex pipes without backslashes in the shell command |
| `git diff --check` | Passed; Git reports existing LF/CRLF conversion advisories, not whitespace errors |

The new tests cover pre-unlock gating, first loss and subsequent loss, persistent navigation, reload, legacy pending introductions, unchanged costs, partial/completed training, eligibility explanations, quiet ordinary autosaves, manual saves, real UI-dispatch save integration, and storage failure. The UI integration test exercises the actual `surface.js` handler with the real game/save serializer; it is not a browser layout test.

Reviewed the complete task-specific diff against copies of the pre-edit working-tree files, including files already dirty, plus the overall working-tree change list. No changes to combat formulas, weapon/DUR rules, Phase 3.2 balance/deck/economy, Sanity thresholds, hallucination selection, Hollow Double entry/Stability, or magic mechanics were made.

## Decisions and deferred work

- Unlock state now records entitlement at the first Heart loss instead of waiting for the Guild visit; actual sessions still require the same location, provider, and resources. Old pending saves retain the existing Guild unlock path.
- Existing world-level Training flags and succession behavior were retained; no actor-local unlock redesign was attempted.
- Auron's introduction remains readable for the rest of its original in-game Day using the existing presentation rule. Re-reading it does not unlock again or produce another save notification.
- No unrelated bug was changed. The discovered receipt overwrite was fixed because it directly prevented this phase's required success feedback.
- Broad browser/layout checks, campaign verification, full `npm test`, APK packaging, older magic-overhaul plans, and Phase 6 are deferred.

## Human playtest

1. Start before the first Heart loss and confirm the Guild offers no training. Lose one Heart in an ordinary Pit encounter; verify safe return/full HP, the prominent explanation, directions, and **Progress saved.**
2. Choose Leave, then the Guild destination labeled with Training. Check Auron's concise introduction, current XP/AP, and the 1 AP + 2 XP cost. With insufficient resources, check the reason is accurate.
3. Train immediately on the first Guild visit. Verify Lina's introduction does not replace the training result. Confirm XP/AP decrease, progress toward the stat, and save confirmation. Complete a stat's ladder to see the stat/Level receipt.
4. Return to title and Continue; verify the unlock, training progress, resources, and daily eligibility persist. Lose another Heart and confirm no second unlock announcement.
5. Move around town and inspect panels: no routine save-message spam. Use manual Save and reload its separate slot. If browser storage is deliberately blocked, verify the failure warning replaces confirmation; do this with disposable test progress.
