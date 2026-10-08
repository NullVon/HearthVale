# Phase 7 — Initial Spells System

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented 2026-10-04 in the existing working tree. The current Phase 7 request is authoritative; the older Phase 5 magic overhaul is not being implemented wholesale.

## Implementation

Scrolls now cast directly from the combat **Items** tab, using the existing Bag and item instances. They cannot be newly equipped as weapons. Old saves containing equipped Scrolls remain loadable and those Scrolls are usable from Items through a compatibility action. No item conversion, new ownership system, preparation, spellbook, mana, or inventory migration was introduced.

The existing Scroll item points to its existing spell definition. `scroll-magic.js` handles supported effects, read-only eligibility/pressure previews, and WIS resolution. `castCombatScroll` integrates those results with the existing combat continuation, Impact/Stagger/Knockdown, and victory/defeat boundaries. Adding another damage Scroll using the existing effect tags does not require another Fireball-specific combat path.

Supported combat Scrolls: **Fireball, Force, Heal, Barrier**. Force retains Impact 3 and zero damage; Heal restores up to its authored 8 HP; Barrier retains its authored 3-point, current-round protection. Existing exploration-only Unlock and Teleport remain unavailable during combat; their existing exploration behavior now also accepts Bag Scrolls. No new spells, drops, prices, or spell crafting were added.

## Exact rules

- **Fireball damage:** `max(0, 5 + Actor base INT)`. More generally, each authored `effect_damage` contributes `max(0, effect.value + INT)`. Impact, healing, and Barrier retain their authored magnitudes.
- **Hit resolution:** offensive combat Scroll effects apply automatically. No accuracy, DEX/Speed Dodge, hit quality, or ordinary enemy Defense subtraction. A later failed WIS check does not undo the spell.
- **Strain:** each valid combat Scroll adds one to `combat.scrollStrain`, after applying its effect. All supported combat Scrolls share the count. No Essence is spent.
- **Safe capacity:** the first `WIS` Scroll casts in an encounter require no Overcast roll. INT does not affect this capacity.
- **WIS check:** `1d20 + base WIS + existing mental-scope bonuses >= DC`. Strong-Willed therefore supplies its existing +2. This uses the existing `check()` utility, not physical Dodge or hit quality, and does not use the noncombat Lucky Bastard reroll wrapper.
- **DC escalation:** for the new count minus WIS, excess +1 uses DC 8, +2 uses DC 11, and +3 or more uses DC 14. The cap remains 14; pressure does not reset between rounds or casts.
- **Overcast failure:** lose exactly 1 Sanity through the existing Sanity helper. Success loses none. The spell effect and one-item consumption still occur. Sanity reaching zero follows existing death/succession adjudication; Hearts and Auron do not substitute for it. If both the enemy and Sanity reach zero, existing Sanity-death precedence applies before ordinary victory rewards.
- **Lifetime:** new Combat instances start at zero, including ordinary rooms, Return Encounters, and Guardian combat. Round changes retain the count. Victory, Return, defeat, or Retreat ends/discards that Combat instance; the next encounter starts at zero. No long-term exhaustion.

The older `docs/Phase5_Magic_Overhaul_Design_Brief.md`, section 5B, supplied the compatible WIS-safe-capacity and failed-check **1 Sanity** consequence. Its learned-cast economy, expedition-wide count, Scroll exemption from Overcast, and DC 17/20 tiers conflict with the current request and were not adopted for this Scroll path.

## Action flow and consumption

The authoritative action list checks ownership, positive integer quantity, phase, target, and supported effects before dispatch. New Bag actions include the item instance ID, preventing stale input from targeting a replacement stack. Invalid actions fail before consuming items or changing saved state.

A valid combat Scroll resolves effects, existing Impact interruption, Strain/WIS consequences, exactly one item consumption, and the existing post-attack continuation within the same Core transaction. Wasteful cannot consume a second Scroll; its behavior for other consumables is unchanged. Empty Scroll stacks become null. Exceptions roll back through the existing game transaction.

Ordinary casting consumes the normal action. A surviving enemy proceeds to its normal incoming action and player reaction choices. Fireball does not request a defense against the spell itself. Force may interrupt through the existing Impact rules. Offensive Scrolls can spend an already-earned Advantage/Counterattack response; supportive Scrolls cannot. A response grants no additional free turn. Spell kills use existing immediate victory and rewards once, without an extra round-end Poison tick.

## Save compatibility and legacy hooks

The existing serializer persists quantities, Sanity, result text, RNG, combat phase, and the optional encounter count. Validation rejects negative/noninteger counts. Old combat saves without `scrollStrain` load exactly; the new path treats missing pressure as zero and materializes it on casting. Loading performs no new random draw or consumption.

The existing expedition-level `strain`, learned spell slots, Tome learning, Essence, and legacy `pit.cast` implementation are retained as compatibility hooks, as requested for pre-existing partial systems. They were not redesigned or expanded. They do not fund or control the new Scroll path. Normal combat navigation exposes Weapons and Items; the pre-existing learned-spell tab remains available in Dev Mode, and existing out-of-combat legacy facilities remain intact. Those legacy learned casts retain their old rules and are not the Phase 7 Scroll implementation. No new separate Spell inventory was built.

## Player feedback

Combat Items lists usable Scrolls and consumables with quantities. Carried noncombat items, Tomes, exploration-only Scrolls, and Valuables remain visibly unavailable. Legacy equipped Scroll actions are also in Items. Result text names the Scroll, damage/effect, automatic hit, Strain, safe/WIS-check outcome, Sanity loss if any, one-item consumption, and remaining stack quantity.

The Items explanation states INT damage scaling, WIS safe capacity, next-cast Overcast warning, and encounter reset. The expedition HUD shows current encounter Scroll Strain. Dev Mode adds WIS dice/modifier/DC and spell/INT/cast-count diagnostics. Normal Mode does not show those raw checks. Existing physical combat, Phase 5 receipts/save messaging, and Phase 6 notification/arrival behavior remain intact.

## Exact files changed in this task

1. `HearthVale_Content/expedition.js` — Scroll action/consumption metadata; drop weights unchanged.
2. `HearthVale_Shell/src/scroll-magic.js` — new small shared effect/pressure module.
3. `HearthVale_Shell/src/expedition-combat.js` — encounter count and Scroll combat integration.
4. `HearthVale_Shell/src/expedition-actions.js` — Bag/legacy Scroll eligibility and dispatch.
5. `HearthVale_Shell/src/expedition-equipment.js` — disallow new Scroll equipment swaps.
6. `HearthVale_Shell/src/service-actions.js` — disallow new surface Scroll equip offers.
7. `HearthVale_Shell/src/expedition-lifecycle.js` — validate optional encounter count.
8. `HearthVale_Shell/src/expedition-rooms.js` — existing exploration Scroll path accepts Bag container.
9. `HearthVale_UI/expedition-views.js` — Items actions, unavailable items, pressure/results/Dev feedback.
10. `tests/phase7-scroll-magic.test.js` — ten focused Scroll tests.
11. `tests/m2-combat.test.js` — replace obsolete equipped/free/DC8 Scroll assumptions.
12. `tests/phase21-combat.test.js` — assert encounter pressure on immediate Scroll responses.
13. `docs/Phase7_Initial_Spells_Handoff.md` — this handoff.

Pre-task hashes confirm only the ten existing files listed above changed; other accepted working-tree files were preserved. New additions are the module, focused tests, and this handoff. Task-specific changes were reviewed against copies of the pre-edit working tree.

## Verification

**179 distinct focused/adjacent tests passed across the following selections.** Initial new-test fixture/label errors and the obsolete free-Scroll assertion were corrected before the final Scroll/combat run.

- `node --test tests/phase7-scroll-magic.test.js tests/m2-combat.test.js tests/phase21-combat.test.js` — final: **41 passed, 0 failed**.
- `tests/phase1-flow.test.js`, `tests/phase4-status-sanity.test.js`, `tests/phase5-training-clarity.test.js`, `tests/m5a-death.test.js`, `tests/m2-expedition.test.js` — **56 passed** in the expanded adjacent run. This included the existing single-expedition nine-floor test, not a full production campaign.
- `tests/m6c1-ui.test.js`, `tests/phase6-world-flow.test.js` — **12 passed**.
- `node --test --test-name-pattern='full catalogs|all recipes|learned Unlock|Crystal Bow|Turn-In|full Bag' tests/m3-content.test.js` — **6 passed**.
- `node --test tests/v1-validation.test.js` — **64 passed**.
- `git diff --check` — **passed** (existing LF/CRLF conversion advisories only).

Focused coverage includes Items access and disabled entries, auto-hit without accuracy RNG, INT scaling, WIS/Trait/DC rules, failed Overcast, Wasteful/exact consumption, invalid and stale actions, normal enemy response and Poison boundaries, victory/reward replay protection, encounter resets, legacy missing pressure, exact deterministic reload, authored support/Force effects, immediate-action restrictions, and zero-Sanity precedence. No full `npm test`, production campaign, exhaustive browser pass, or APK build was performed.

## Playtest and deferred work

1. Carry Fireball Scrolls in the Bag, enter combat, and select Items. Confirm no equipment or learned spell is required; unusable items remain visible.
2. Compare INT 1 and INT 4: Fireball should deal 6 and 9 damage respectively, independent of enemy physical Defense/Dodge.
3. With WIS 2, cast twice safely, then observe DC 8, 11, and 14 in Dev Mode on successive Overcasts. Failure should cost one Sanity while still applying the spell and consuming one Scroll.
4. Save during combat, reload, and verify pressure/quantity and the next enemy action continue exactly. Start another encounter and confirm pressure resets.
5. Check Force interruption, Heal, Barrier, a last-Scroll kill, full Bag/noncombat entries, and a legacy equipped Scroll.

No unrelated blocking defect was discovered. The legacy learned-magic hooks remain a deliberate compatibility limitation, not a completed final magic system. Future unification/removal of those hooks, new spells, magic progression, and broader UI polish are deferred.

**No next-phase work was started. No commit or push was performed.**
