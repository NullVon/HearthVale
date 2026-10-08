# HearthVale v0.1 legacy runtime audit — 2026-10-08

Scope: focused cleanup of the existing Phase 1–9/Playtest 3 working tree. No redesign, tuning, multi-item selling, APK, commit, push, or subsequent phase. Pre-edit copies and test logs are in `legacy-audit-validation/`; copies use `.txt` extensions so Node does not discover historical tests.

## Confirmed obsolete live behavior removed

| Path | Finding and correction |
| --- | --- |
| Learned combat offense | `castCombatSpell` still called `check(INT, enemy.attackDC)`, gated damage/Impact on success, and emitted `Miss`. This directly reproduced the screenshot. Removed the accuracy branch for all enemy-targeted learned spells, rather than filtering Fireball's message. Fireball/Force now auto-hit with no accuracy/Dodge/quality RNG, including immediate responses. Existing learned damage 5 / Force Impact 3 and Scroll INT scaling are unchanged. |
| Named discovery | Sunken Square manually marked its room resolved without `awardRoom`. It now receives the shared +1 Essence alongside its existing finite discovery loot, even when that loot is exhausted. |
| Manifestation room | Hollow Double manually suppressed room rewards. Its Combat room now receives +1 Essence and the separate 50% 1–2 Arrow roll. Enemy rewards remain 5 XP/+1 Sanity, with no materials, valuables, Gold or objective creature knowledge. This follows the later all-non-empty-room supply rule; room supply is not a per-enemy drop. |
| Generated result state | Removed the unused duplicate `lastResult.spellStrain` emitted by combat/exploration learned casts. The sole cost/Overcast count remains expedition-wide. Historical results load unchanged. |
| Normal prose | Replaced “No Strain”/“without Strain” Scroll feedback with zero Essence/no Overcast wording. Shop comparisons now say STR/DEX **quality**, rather than obsolete conventional accuracy. |

## Rule map and retained compatibility

- **Cost/count/Overcast:** `expedition-equipment.js` uses `2 ** max(0, expedition.strain - INT + 1)`. `magic-pressure.js` increments once after the effect, checks WIS at DC 8/11/14/17/20 cap, and loses exactly 1 Sanity on failure. `expedition.strain` is the persisted Learned Cast Count under the Playtest 3 contract, not an additional Strain mechanic. Retaining that serialized key avoids rewriting active saves. Combat entry, victory, retreat, Return Encounter, and floor changes do not reset it; expedition end discards it and Essence. No authored per-spell cost controls current casting.
- **Scrolls:** combat `scroll-magic.js` applies automatic effects with no learned cost/count/Overcast. Exactly one item and the applicable normal/immediate action are spent. Exploration bypass likewise consumes one, even with Wasteful. Equipped Scrolls remain usable only for old saves; new swaps/equipment offers exclude them. The exported learned-cast wrapper's optional equipped-Scroll argument remains an adapter to the same current Scroll resolver, not the old free-Scroll implementation.
- **Room supply:** `awardRoom` already guarantees non-empty Essence, adds the Resource-room Essence, and rolls Combat-room Arrows independently. `awardEnemy` gives XP/harvest only. No random Essence-or-Arrows-or-nothing baseline remains. Existing authored event item/Gold/Arrow effects remain distinct; no special Event Essence was added.
- **Combat state:** unified move pools have no range legality; saved ranges and old `attackDC`/`dodgeDC`/spell `accuracy`/cost content metadata do not control current attacks. `combatPhase`/`resumeCombat` intentionally map old free-Force cancellation and skipped-turn Knockdown states into one current offensive response/vulnerability. `combatMove` supplies missing stable move metadata without RNG. Old committed Close-to-NEAR resolves nonoffensively and cannot move the player or bypass an attack.
- **Interstitials:** `round-result` remains a short internal completion marker, consumed by `finishExpeditionAction` in the same action. `cancelled`/`pit.combat-next` and nonoffensive-defense choices remain for legacy resume. `surface.resumeFlow` settles them through Core commands before UI presentation. Legacy round results have already paid Poison; resume does not pay it twice. New combat exposes no standalone outcome/Continue screen.
- **Obsolete pressure fields:** optional `combat.spellStrain`/`scrollStrain` remain validated for exact old-save loading, then are deleted by `resumeCombat` on authorized actions. They never affect current costs, WIS, Scroll effects or Normal Mode. New combat does not initialize them.
- **Poison/returns/death:** one completion boundary ticks Poison once per completed non-victory round/noncombat room. Immediate victory does not tick. Ordinary and Return-Encounter Heart loss use full HP/clear Poison; successful Return/Return victory/Teleport preserve Poison. Final Heart uses the separate pending Core death/Auron boundary; Sanity death takes precedence over victory and cannot be rescued. Death/succession compatibility remains idempotent; fresh successors do not inherit expedition state. No conflicting duplicate lifecycle branch was found.
- **Equipment:** relative DEX/Speed Dodge and physical hit quality are current rules, not legacy systems to remove. Contact melee wear, post-quality raw-damage Block wear, Heavy-Handed/Sturdy Hands, Counterattack incoming-first timing, non-chaining immediate actions, one-use Knockdown vulnerability, and Bare Hands' Defense bypass remain current. Bow uses one Arrow per shot, no DUR or Block; tolerated old zero-DUR Bow fields do not disable it. No values changed.
- **Legacy incoming magic:** no current authored enemy move uses spell damage. The enemy-defense resolver's existing `damageType === 'spell'` physical-defense/wear bypass remains for supported saved commitments and synthetic regression fixtures. Its legacy enemy hit-quality pipeline was not generalized into a new enemy magic system; it cannot be selected by current enemy pools. This differs from the current player spell paths, which now never use hit quality.

## Authority and unresolved discrepancies

Authority for this cleanup is the current request, Phase 2.1, the current Phase 5 magic brief, and Playtest 3's later count/cost/DC/Scroll and room-economy corrections. Earlier Phase 7 encounter Scroll pressure and Playtest 2 accuracy/count/reset descriptions are historical and superseded for these mechanics. The Master Handoff §31.5/31.7 now clarifies that precedence and room supply; historical handoffs were not rewritten.

Barrier and Teleport were subsequently resolved on 2026-10-08 under the owner's explicit Phase 5 authority. See [Magic Barrier/Teleport alignment handoff](Magic_Barrier_Teleport_Alignment_Handoff.md). The original audit's other findings and test results below remain historical records of that audit.

- **Barrier — resolved:** Phase 5 wins over Phase 7's current-round preservation and later references to existing behavior. Barrier now reduces HP damage by 3 with no Stability bonus and lasts until the next enemy offensive action resolves, including Dodge or full absorption. Round preparation does not expire it.
- **Teleport — resolved:** Phase 5 wins over Phase 7's exploration-only restriction for Teleport. Learned and Scroll Teleport now work in normal combat and exploration, bypass Return Encounter, and stop the pending enemy action. Existing learned cost/count/Overcast ordering, Scroll bypass, and extraction status semantics remain unchanged. Unlock remains exploration-only.
- Phase 5 lists Slow, but Phase 7's accepted supported library remains Fireball/Force/Heal/Barrier plus exploration Unlock/Teleport. Slow is absent, not a leftover executable path; adding it would be a feature.
- Master Handoff retains older broad offensive-magic/INT language and historical miss/range examples. The updated current VS reliability section overrides ordinary accuracy; historical examples are not current gameplay authority. Learned Fireball's flat 5 versus Scroll's 5+INT is explicitly preserved by later playtest handoffs and is not rebalanced here.

## Files changed in this audit only

Production: `HearthVale_Shell/src/expedition-combat.js`, `expedition-rooms.js`, `expedition-lifecycle.js`; `HearthVale_UI/expedition-views.js`, `service-views.js`.

Tests: new `tests/legacy-runtime-audit.test.js`; updated `tests/playtest2-magic.test.js`, `playtest3-magic-economy.test.js`, `phase7-scroll-magic.test.js`, `phase21-combat.test.js`, `phase2-combat.test.js`, `phase4-status-sanity.test.js`, `phase1-flow.test.js`; browser `tests/browser/playtest2-browser.js` now explicitly asserts no learned accuracy/Dodge/quality/miss and no Normal Strain wording.

Docs: `docs/HearthVale_Master_Design_Handoff.md` and this handoff. All unrelated existing uncommitted work was retained; pre-edit copies distinguish this audit from earlier dirty-tree work.

## Verification

All final verification runs passed:

- Focused combat/magic/expedition/status/flow/Phase 9 selection: **144 passed**, 0 failed (`focused-final.log`).
- UI/adjacent selection, including the added shop-comparison regression: **24 passed**, 0 failed (`ui-adjacent.log`).
- Full HearthVale suite: **445 passed**, 0 failed, **344.117 seconds**, including both production completion campaigns (`full-final.log`). The added shop-comparison assertion and final removal of unused result counters were subsequently covered by the final magic/audit selection: **39 passed**, 0 failed (`final-magic.log`).
- LWE-Core full suite: **73 passed**, 0 failed (`core.log`).
- Actual browser harnesses via production controls: magic/responsive **147**, Phase 2.1 combat **6**, Phase 9 presentation **105**, Phase 1 lifecycle/legacy resume **6**; **264 groups passed**. Browser saves were restored by each harness. Added magic assertions verify automatic hit, absent accuracy/Dodge/quality, and absent Normal Strain text. Summary: `browser-results.md`.
- Changed JavaScript syntax checks and `git diff --check`: passed. LF/CRLF advisories are existing repository settings, not whitespace failures.

The initial new regression run reproduced **10 failures out of 11 tests** before the fixes (`reproduction.log`). Updated older assertions remove expectations of an accuracy RNG draw/check, no Hollow room supply, and no possible room Arrow reward after Bare Hands victory. No physical hit/quality, damage or reward probability was weakened to make tests pass. An initial full run also discovered the audit's pre-edit `.test.js` copies; these were renamed to `.txt` before the successful full run. Production code was not changed to accommodate those discovery errors.
