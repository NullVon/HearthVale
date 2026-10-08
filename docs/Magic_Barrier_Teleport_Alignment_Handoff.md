# HearthVale v0.1 Barrier / Teleport alignment — 2026-10-08

Scope: only the two discrepancies reported in the legacy audit. The owner's explicit instruction selects `Phase5_Magic_Overhaul_Design_Brief.md` as authority. Slow remains deferred. No rebalance, other spell/economy/status changes, multi-item selling, APK, commit or push.

## Corrections

- Barrier no longer adds Stability or resets during round preparation. Its existing 3-point HP mitigation applies to physical and magical offense with Dodge, Block and Counterattack. It clears once the next enemy offensive action resolves, including successful Dodge or full absorption, before a Counterattack response. Cancelled/nonoffensive actions retain it. Impact, Block wear and damage values are unchanged.
- Learned and Scroll Teleport are available in exploration and the normal combat action phase. Both combat paths reuse the existing exploration extraction resolver, preserving effect → learned Overcast → surviving extraction ordering. Extraction immediately ends the expedition, bypasses the Return route and prevents pending enemy offense. Lethal Overcast retains expedition context for the existing death boundary. Support spells remain unavailable as Advantage/Counterattack responses.
- Barrier's HUD and effect descriptions now state the next-offensive-action lifetime; equipment prose explicitly states no Stability bonus.

## Compatibility and scope

No serialized keys or schema versions changed. Existing positive `combat.barrier` loads exactly and is consumed under the corrected action lifetime. Current and legacy Barrier saves (including obsolete range/pressure metadata) round-trip and replay consistently. The old equipped-Scroll adapter remains supported and delegates to the same Scroll resolver; new inventory rules are unchanged. Teleport retains current extraction cleanup/status semantics, including preserved Poison and removal of expedition-only resources/HP bonuses. Learned count remains serialized as `expedition.strain` and is discarded at expedition end. No cost/count/Overcast or Scroll-pressure implementation was changed.

The Master Handoff now explicitly supersedes Phase 7's preserved current-round Barrier and exploration-only Teleport restrictions. The Phase 5 brief already states the target and was not rewritten. The legacy audit marks these two discrepancies resolved; its historical results and other findings remain intact. No unresolved contradiction remains for these two mechanics under the supplied authority.

## Exact files changed by this correction

Production:
- `HearthVale_Content/expedition.js`
- `HearthVale_Shell/src/expedition-combat.js`
- `HearthVale_Shell/src/scroll-magic.js`
- `HearthVale_Story/expedition.js`
- `HearthVale_UI/expedition-views.js`

Tests:
- New `tests/magic-alignment.test.js`
- `tests/m2-combat.test.js`
- `tests/phase7-scroll-magic.test.js`
- `tests/m6c3-ui.test.js`
- `tests/playtest2.test.js`
- New `tests/browser/magic-alignment.html`
- New `tests/browser/magic-alignment-browser.js`

Docs:
- `docs/Legacy_Runtime_Audit_Handoff.md`
- `docs/HearthVale_Master_Design_Handoff.md`
- This handoff

Existing unrelated dirty-tree changes were preserved. `magic-alignment-validation/` contains pre-edit copies (`.txt`, excluded from Node test discovery), initial status and verification logs. `expedition-actions.js` was inspected/backed up but not changed by this correction.

## Verification

- Focused magic/combat/lifecycle/UI selection: **127 passed, 0 failed** (`focused.log`), including **16 new alignment tests**.
- Production browser controls: **7 alignment groups** and **6 adjacent Phase 2.1 combat groups passed**, including active Barrier reload, cancelled-round carry, learned safe/Overcast Teleport, Scroll Teleport, status preservation and extraction reload.
- Adjacent magic/responsive browser harness: **147 groups passed** (learned Fireball, Scroll bypass, tutorial/save reload, four widths, 200% text and simulated system insets). Total browser coverage: **160 groups passed**.
- Changed JavaScript syntax checks passed. `git diff --check` passed; repository LF/CRLF advisories are not whitespace errors.
- Full suite: **462 tests, 461 passed, 1 failed**, **318.245 seconds** (`full.log`), including both production completion campaigns. The sole failure was a stale onboarding assertion classifying learned Teleport as exploration-only. It now checks Unlock's exclusion and Teleport's inclusion. Final rerun of that entire test file plus the alignment tests: **21 passed, 0 failed** (`final-adjacent.log`). No production changes followed the full run; the full suite was not repeated after this test-only correction.
- Initial focused failures were stale Stability/lifetime assertions plus a HUD test targeting the wrong renderer. Browser fixture failures were missing Block equipment and a stale pre-action autosave read; fixture/assertion corrections required no additional production changes.
