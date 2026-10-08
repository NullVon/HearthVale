# HearthVale v0.1 multi-select selling — 2026-10-08

Scope: shop selling QoL only. Existing unrelated working-tree work was preserved. No price/balance/content change, commit, push, APK or subsequent feature.

## Behavior

Sell rows toggle item-type selection with visible/accessible pressed state; they no longer dispatch an immediate sale. Multiple types can be selected. One Sell button sells all currently sellable quantities of those selected types, credits the combined Gold once, then clears selection. Empty Sell is disabled. The Sell disclosure and other shop disclosure states, window/main scroll position, and keyboard focus stay in the shop after selection/sale. Selection is UI-only and resets on loading, starting a game, changing actor or leaving the Shop.

One explicit `service.act` / `sell-bulk` operation validates the complete selected type list against current shop/service eligibility before mutation. Duplicate, empty, malformed, unavailable and stale types reject the whole operation. Core publishes the cloned actor and service state in one transaction; it does not replay individual sale actions.

`sellEntries` shares existing sell eligibility and unit pricing with the old service choices. Selecting a type includes all its sellable Bag/equipped/chest instances and Collectables; unsellable instances remain untouched. Gear with different conditions retains each instance's original durability-based price. Existing vendor stock replenishment, used gear identity/DUR/age and valuable sale memories are preserved for the entire sold quantity. No material discovery or AP cost is added.

Save shape/version is unchanged. Completed sales autosave through the existing surface flow and reload exactly. Old single-item service operations remain callable for existing simulation/campaign integrations; production Sell rows do not expose them. Buy, formal Turn-In and unrelated mechanics are unchanged.

## Files changed

Production:
- `HearthVale_Shell/src/economy.js`
- `HearthVale_Shell/src/service-actions.js`
- `HearthVale_UI/service-views.js`
- `HearthVale_UI/surface.js`

Added tests:
- `tests/bulk-sale.test.js`
- `tests/browser/bulk-sale.html`
- `tests/browser/bulk-sale-browser.js`

Documentation: this handoff. Baseline copies, initial status and verification logs are in `bulk-sale-validation/`; backup sources use `.txt` so Node does not discover historical tests.

## Verification

- Focused economy/services/UI/adjacent selection: **52 passed, 0 failed** (`focused-final.log`). Four new automated tests cover full quantities and prices, unselected data, single Gold credit, condition-specific used gear, stock replenishment, valuables, atomic rejection, eligibility and exact save/replay.
- Actual production browser controls: **6 new selling groups passed** in normal/large text, including multiple selection/deselection, no immediate sale, disabled empty Sell, exact payout/state, selection clearing, retained tab/scroll/focus and browser reload/departure reset.
- Existing M6C1 production UI browser harness: **159 checks passed**, including Shop/used gear, narrow/desktop widths, ordinary/large/200% text and save/load/navigation. Total browser coverage: **165 groups/checks passed**.
- Changed JavaScript syntax and `git diff --check` passed. LF/CRLF advisories reflect repository settings.
- Full HearthVale suite: **466 passed, 0 failed**, **284.918 seconds** (`full.log`), including both production completion campaigns and the previous correction's updated Teleport onboarding assertion. This supplies the requested clean full-suite run after the prior 461/462 result.
- Final bulk-sale regression rerun, including sparse/malformed selection rejection: **4 passed, 0 failed** (`final-bulk.log`). Final browser selling rerun also passed all **6 groups** after checking retained Buy disclosure state and keyboard focus.

The initial focused run's only failure expected Cleanse Tonic to enter vendor stock, which it never did under the existing rules. The assertion now verifies that no new stock category appears; a separate stocked-potion stack assertion verifies full-quantity replenishment. No production price or stock rule was changed to satisfy it.
