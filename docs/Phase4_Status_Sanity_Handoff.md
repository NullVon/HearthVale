# Phase 4 — Status + Sanity handoff

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented on the existing working tree, preserving Phase 3.2. No reset, stash, revert, commit, push, APK build, full test suite or production/browser campaign. Phase 5 was not started.

## Implementation

### Poison and status presentation

`HearthVale_Story/statuses.js` holds presentation-only Name, Effect, Timing, Persistence and Removal fields. `statusView()` renders a native expandable `POISONED` detail in the ordinary HUD. Expedition summaries retain compact status text. No status simulator, new tick scheduler, modal or additional Continue step was added.

Poison still does not stack, retains Tough Stomach resistance, and is prevented by successful Dodge on an on-hit source. Its existing completed-round/resolved-noncombat boundary is unchanged, including no tick after immediate enemy death. Tick receipts now say **POISONED — 1 HP lost.** Antidote/Cleanse Tonic receipts explicitly confirm the cure.

`completeReturn()` now preserves Poison by default. Successful Return, Return-Encounter victory and Teleport preserve it. Ordinary Heart-loss return explicitly requests clearing and restores HP as before. Final-Heart rescue/death and Sanity death retain their separate existing semantics; their code was not rewritten.

### Antidote

General Shop baseline stock now includes Antidote at **8G / target 4 / protected floor 1**. Existing replenishment cadence, crafting recipe and Cleanse Tonic alternative remain. All other shop stock, prices and Phase 3 Treasure/material/Valuable values are unchanged.

Legacy service saves without `item_antidote` stock remain valid. The existing read-only `economyState()` projection supplies 4 only when that field is absent; the next ordinary transaction stores it. Existing zero/low stock is not reset. Loading performs no stock mutation or RNG draw.

### Sanity and Talk

Sanity remains max 5. Labels are Stable, Uneasy, Fraying, Unstable, Breaking and Broken. The HUD omits the Stable suffix at maximum and shows the appropriate band below maximum. Bands 4/3 introduce no stat/check penalty. A small resource-change helper produces cause, delta and resulting Sanity/band receipts for new losses/recovery and existing Pyrophobic fire loss.

The first completed ordinary player-initiated Talk below maximum restores 1 Sanity. `actor.data.sanityTalkRecovery = {year, day}` records use across all NPCs. Talk at maximum leaves the opportunity available; `firstOnly` introductions neither grant nor consume it. Legacy `talkCount` is ignored and not incremented. Frail's obsolete recovery clause is removed without a replacement perk. Sleep code remains unchanged: HP recovery, no Sanity recovery.

Mira's existing Day-1 closing guidance now includes natural dialogue plus explicit ordinary-Talk/Sanity and sleep instructions, alongside the existing town guidance.

### Events and ordinary Sanity pressure

Added exactly two subjective Events:

- **The Body:** WIS/mental DC 11; failure loses 1 Sanity.
- **The Wrong Reflection:** safe Look Away, or Look Closer at WIS/mental DC 14; failure loses 1 Sanity.

At Sanity 2/1, floor generation selects Event templates from this pool using the existing template-selection draw. The already-drawn family remains Event; the deck card is consumed normally. No second transition roll, hallucination counter, pending interstitial or parallel resolver exists. Existing exact-encounter uniqueness and blocked-card handling apply to the two-template pool.

Added ordinary **Horrific Remains** (Event, WIS/mental DC 11) and **Whispering Depths** (Hazard, WIS/mental DC 14). Both lose 1 Sanity on failure and none on success. Hazard checks now honor their explicitly authored scope before the existing inferred scope, allowing Strong-Willed's unchanged +2 mental bonus to apply. Existing Pyrophobic mechanics remain, with clearer result text.

Subjective Events skip `pit.eventHistory`. Their authored effects create no observations, rumors, permanent discoveries or Information. The Actor retains only the personal memory **“Experienced a hallucination in the Pit.”**, not hallucinated content asserted as fact. Existing personal-memory/life-record/information paths do not turn this into institutional or successor knowledge.

### Hollow Double

The first ordinary Combat room actually entered at Sanity 1 becomes **The Hollow Double**. Appearance sets `expedition.manifestationAppeared = true` immediately. Retreat/regeneration preserves this flag; new expedition state naturally starts without it. Noncombat rooms, Event-triggered fights, Return Encounters and the Floor 10 Guardian are not replaced. No appearance probability roll was added.

- HP 14, Defense 1, STR 3, DEX 3.
- Quick Strike: Damage 3, Impact 1, Speed +1, DEX quality, 60%.
- Heavy Blow: Damage 5, Impact 2, Speed −1, STR quality, 40%.
- Ordinary HP damage, no on-hit Sanity effect.
- Victory gives exactly **5 XP and +1 Sanity** with the authored victory flavor and explicit Sanity receipt.
- No creature drops, Gold, Valuables or ordinary room baseline Essence/Arrows. The room is marked resolved once at victory.

The optional authored `subjective` flag excludes it from the ordinary encounter pool and bypasses only the permanent enemy-knowledge side effects of `startCombat()`. It never enters `knownEnemies`, Hound evidence or institutional Information. Return selection also excludes subjective enemies. Combat damage, Dodge, quality, Block wear, Stagger, Knockdown and Counterattack code remains unchanged.

## Implementation decisions / ambiguities

- **Event timing:** existing floors generate their entire room list up front. The Sanity band at generation determines their Event pool; stored rooms are not rewritten when Sanity later changes mid-floor. This follows the brief's “when the deck produces an Event room” timing and preserves single-draw deterministic selection. The Hollow Double intentionally checks Sanity at actual room entry, as explicitly required. Human playtesting should check whether this difference is understandable.
- **Required move metadata:** the brief did not specify Hollow move Stability. Quick Strike uses 1 and Heavy Blow 2, following existing light/heavy move conventions. Required legacy DC metadata is 11; Phase 2.1 combat does not use it for accuracy/Dodge. No existing move metadata changed.
- **Hallucination room baseline:** the existing ordinary Event-room baseline reward flow remains; subjective authored content itself awards no imaginary items. Hollow Double victory explicitly suppresses baseline loot to honor its exact reward restriction.

## Save / legacy compatibility

No save-version bump or load-time migration RNG. Existing Core transactions save status/resource changes, Actor Year/Day recovery marker, manifestation flag, generated room template and resolution state together. An absent legacy marker/flag means unused. Old `talkCount` is tolerated but inert. Legacy Antidote stock compatibility is described above.

Exact-save continuation tests cover normal room/Poison resolution, Talk recovery, saved hallucination generation and resolution, Hollow appearance/Retreat/victory and zero-Sanity death. Zero Sanity still adjudicates death before a recovery action can occur, without substituting Hearts or allowing Auron rescue.

## Files changed in this pass

New:

- `HearthVale_Content/sanity.js`
- `HearthVale_Shell/src/sanity.js`
- `HearthVale_Story/statuses.js`
- `tests/phase4-status-sanity.test.js`
- `docs/Phase4_Status_Sanity_Handoff.md`

Existing production files:

- `HearthVale_Content/equipment.js`, `expedition.js`, `schema.js`, `validation.js`
- `HearthVale_Shell/src/economy.js`, `social.js`
- `HearthVale_Shell/src/expedition-generation.js`, `expedition-discovery.js`, `expedition-lifecycle.js`
- `HearthVale_Shell/src/expedition-events.js`, `expedition-rooms.js`, `expedition-equipment.js`, `expedition-combat.js`
- `HearthVale_Story/surface.js`
- `HearthVale_UI/surface-views.js`, `expedition-views.js`

Adjacent test expectations:

- `tests/m2-expedition.test.js` — intentional Return Poison persistence.
- `tests/m3-content.test.js` — new content counts and subjective history; daily Talk wording.
- `tests/phase1-flow.test.js`, `tests/phase2-combat.test.js`, `tests/phase21-combat.test.js` — Poison receipt wording and ordinary-enemy assertions separate from the new subjective enemy.
- `tests/phase3-pit-economy.test.js` — original six-enemy baseline assertion excludes the separately tested Hollow Double.

All other pre-existing working-tree changes were preserved. A before-task file snapshot was used to inspect this pass independently of the larger uncommitted diff.

## Focused verification

**113 distinct focused/adjacent tests passed; no unresolved failures.**

```text
node --test tests/phase4-status-sanity.test.js tests/phase2-combat.test.js tests/phase21-combat.test.js tests/phase3-pit-economy.test.js
71 passed, 0 failed

node --test tests/phase4-status-sanity.test.js tests/m3-content.test.js tests/m5a-death.test.js tests/phase1-flow.test.js tests/phase2-combat.test.js
Initial run: 83 passed, 1 stale Poison-text assertion failed.
All 22 M3 content, 10 M5A death and 9 Phase 1 tests passed.
The stale assertion was updated; the affected Phase 2 file passed in the 71-test run above.

node --test --test-name-pattern='Return endings' tests/m2-expedition.test.js
1 passed, 0 failed

git diff --check
Clean
```

The new Phase 4 file has 13 focused cases covering the requested mechanics and exact reload behavior. The existing content test includes generator-only route checks; no production campaign was played. No full `npm test`, exhaustive browser checks or Android build was run.

Self-review confirmed unchanged ordinary enemy stats (including Beetle 8/1), weapon/DUR definitions, combat math/Block wear, Treasure table, deck composition/streak policy, sleep and death code. The combat module's only production change is the subjective knowledge guard. Phase 3 deck state is still persistent and deterministic.

## Deferred and human playtest

Phase 5 magic, Phase 6 feedback/polish, Auron/Scar messaging, balance retuning, broad verification and APK packaging remain deferred.

1. Become Poisoned, Return or Teleport, and inspect the expandable POISONED details in town. Buy an 8G Antidote, cure and verify the receipt. Separately confirm ordinary Heart loss clears Poison while final-Heart handling remains distinct.
2. Below max Sanity, Talk to one NPC and then another that day. Only the first ordinary Talk should restore 1. Sleep: HP returns, Sanity stays. Talk the next day for another point. Also Talk at max, lose Sanity later that day, then Talk again.
3. Read Mira's new guidance in the existing opening. Check the Uneasy/Fraying labels without looking for hidden penalties.
4. Generate a floor at Sanity 2 and resolve both hallucinations. Look Away must be safe. Check the result receipts and confirm Guild/Town records contain no hallucinated body/reflection facts.
5. At Sanity 1, enter an ordinary Combat room. Save at Hollow appearance and reload. Retreat once; that expedition must not produce another Hollow. On a separate outing, defeat it and verify 5 XP, +1 Sanity, no loot and no victory Poison tick.
6. Fail a mental check at Sanity 1 and confirm the existing death/succession path runs immediately despite remaining Hearts/Auron availability.
7. Observe the generation-time Event selection versus entry-time Hollow selection described above. Report any confusion before changing the generation rules.

Stop here for review and human playtesting. **Phase 5 was not started.**
