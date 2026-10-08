# Phase 3 — Pit Economy / Durability / Controlled RNG handoff

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented on the current working tree. Existing Phase 2.1 and post-Phase-2.1 changes, including Bow definitions, were preserved. No reset, stash, revert, commit, push, APK build or packaging was performed. Phase 4 was not started.

## Implementation

- Hidden persistent 30-card family deck: Combat 8, Resource 6, Treasure 6, Hazard 4, Event 3, Empty 2, Discovery 1.
- Treasure after the Phase 3.1 human-playtest correction: Basic HP Potion 15%, Valuable 40%, Basic Weapon 20%, Scroll 15%, Tome 10%. No Nothing result. Basic weapons are selected evenly among Sword, Hammer and Bow.
- Found Sword has 12 DUR; Hammer has 10 DUR; Bow and Crystal Bow have no DUR. Existing melee values remain unchanged; the Phase 3.2 Beetle exception is documented below.
- Legacy Bow durability no longer blocks attacks, participates in wear/destruction, or appears as active durability in inventory/shop UI. Every Bow attack still spends exactly one Arrow, including a miss; zero ammunition leaves the Bow equipped. Adding Arrows restores usability. Bows cannot Block.
- Loot results show Bag/Collectables destinations, material/Valuable sell value, and replacement-weapon opportunities. Existing full-Bag choices remain. Purchases, holding sales and material turn-ins report their concrete results without extra screens.
- Basic prices remain Sword 30G, Bow 35G, Hammer 40G. Existing authored stock, replenishment, Shield/Chest access, Valuables and material values are retained. Bare Hands remains the fallback.

## Deck and placement details

`hv_pit_1.data.roomDeck` stores the remaining family IDs in order. Fisher–Yates shuffling uses the Core resolving RNG, with 29 draws per new deck. Drawing removes the first currently eligible card, leaving blocked cards in their original relative order. Only an absent or exhausted deck is initialized/shuffled, and only during actual generation.

All production entry, descent, retreat/regeneration and shortcut paths pass the same Pit state. Return does not erase it. Cards are consumed when rooms are generated, including rooms subsequently abandoned, rather than when rooms are visited. Shortcut entry no longer generates and discards an unused Floor 1.

Ordinary floors retain 3–4 rooms, at most two Combat rooms, and unique exact encounters. Enemy selection retains authored weights. Floor 10 consumes neither deck cards nor generation RNG. The existing authored Sunken Square retains its placement eligibility and occupies a floor slot outside ordinary random draws; it no longer overwrites a room whose card was already consumed.

Two implementation decisions deserve explicit review:

1. The deck replaces the old cross-floor three-identical-family suppression and end-of-floor consecutive-Discovery restriction. Their old assertions were removed. Clustering is permitted; the locked floor-size, Combat cap and encounter-uniqueness constraints remain. No new pity counters, weapon guarantees, no-consecutive-Combat rule or fairness meters were added.
2. If every remaining card is blocked by floor constraints, generation fills the required slot with an unused existing Empty encounter, without consuming/discarding a card or refilling the deck. For example, a deck containing only Combat cards cannot fill a four-room floor while respecting the two-Combat cap. This minimal fallback satisfies both invariants. Consequently, actual Empty rooms can exceed the two Empty cards in a cycle. No extra fallback state/counter is stored.

Normal Mode does not expose deck contents, shuffle information or draw machinery.

## Economy assessment

The original focused sample used 40 Core seeds and showed that gross useful-item value could meet the target while still overstating actual replacement buying power. Human playtesting confirmed that problem.

After the Phase 3.1 Treasure rebalance, the same 40-seed supply-only sample reports both broader useful value and immediately liquid sell value:

- After two complete floors: mean **32.8G useful value** and **26.6G liquid sell value**.
- After three complete floors: mean **48.6G useful value** and **38.3G liquid sell value**; liquid median **35G**, range **10–83G**.

This remains a synthetic supply sample, not guaranteed cash or net expedition profit. It excludes equipment wear, survival costs and event/hazard bonus rewards. Human playtesting remains authoritative for whether a player can actually replace a lost melee weapon without the economy feeling punishing.

## Save compatibility

No save-version bump or load-time random draws. Legacy saves without a deck load byte-exact and retain their already-generated rooms; the deck begins at the next actual generation. Empty saved decks remain empty through load and Return until generation needs a card. Saved deck validation checks known families and maximum counts, including when no expedition is active.

Legacy Bow instance `durability` fields are retained as inert compatibility data. Authored `maxDurability` determines participation in durability checks, wear, pricing and display. Existing ammunition spending already bypassed Bow wear and was preserved. DUR-bearing equipment still destroys at zero; no repair or broken-retained state was added.

Resolved rooms and pending loot retain the existing transactional save flow. Tests compare exact continuation saves, ensure resolved Treasure cannot be collected twice, and verify generation does not occur during collection/reload.

## Files changed by this Phase 3 pass

- `HearthVale_Content/expedition.js` — deck composition and compatible catalog percentage view.
- `HearthVale_Shell/src/expedition-generation.js` — shuffle/draw, validation and placement.
- `HearthVale_Shell/src/expedition-lifecycle.js` — persistent entry state, shortcut generation, deck validation.
- `HearthVale_Shell/src/expedition-discovery.js` — shared deck and authored Square integration.
- `HearthVale_Shell/src/expedition-loot.js` — exact Treasure table and basic weapon finds.
- `HearthVale_Shell/src/expedition-combat.js` — ignore legacy Bow DUR for attack eligibility.
- `HearthVale_Shell/src/expedition-equipment.js` — wear requires authored DUR.
- `HearthVale_Shell/src/expedition-actions.js` — ammunition-based Bow action labels.
- `HearthVale_Shell/src/autonomous-pit.js` — usable-weapon check accepts ammunition-ready no-DUR Bows.
- `HearthVale_Shell/src/economy.js` — transaction feedback and no legacy Bow DUR in used offers.
- `HearthVale_UI/expedition-views.js` — loot destination/value/replacement feedback.
- `HearthVale_UI/surface-views.js`, `HearthVale_UI/service-views.js` — suppress inert legacy Bow DUR.
- `tests/phase3-pit-economy.test.js` — new focused coverage.
- `tests/m2-expedition.test.js`, `tests/m3-content.test.js` — update superseded generation/Treasure expectations; preserve other working-tree edits.
- `docs/Phase3_Pit_Economy_RNG_Handoff.md` — this handoff.

Other files visible in the working-tree diff were already modified before this task. In particular, the current Bow/Crystal Bow definitions and original Sword/Hammer maxima were preserved, not recreated.

## Tests run

Final focused results: **42 passed, 0 failed**.

```text
node --test tests/phase3-pit-economy.test.js
10 passed

node --test tests/phase21-combat.test.js
16 passed

node --test --test-name-pattern='A07|A08|A09|full Bag' tests/m2-expedition.test.js
6 passed

node --test --test-name-pattern='full catalogs|A05|A06|Turn-In|all recipes|full Bag|Sunken Square|lost unresolved|production routes|Crystal Bow' tests/m3-content.test.js
10 passed

git diff --check
Clean
```

Coverage includes exact composition, exhaustion, blocked-card preservation, persistent order through save/Return/re-entry/retreat, legacy initialization, shortcut generation, floor constraints, exact Treasure probabilities, full weapon condition, legacy/current Bow behavior, destruction, sales/shop recovery, loot replay prevention and Normal Mode feedback. Existing Phase 2.1 tests cover range independence, unified move pools, Knockdown, Advantage, Counterattack and exact immediate-action continuation.

The existing generator-only tests inspect generated floor data across 200 seeds; they do not play campaigns. No production campaign, full `npm test`, browser suite or APK build was run. Full `npm test` remains for the separate user-requested verification pass.

## Phase 3.1 playtest corrections

Human playtesting after the initial Phase 3 handoff found three concrete issues:

- Replacement economy still felt poor despite the automated G-equivalent sample. The Treasure table is now **Potion 15% / Valuable 40% / Weapon 20% / Scroll 15% / Tome 10%**. Weapon prices and Sword/Hammer durability remain unchanged.
- Tomes were mechanically learnable but the UI made them look like ordinary Bag gear. Inventory and expedition Bag copy now state that **Tomes are learned, not equipped**, and direct the player to the existing Learn action between combats.
- Player Knockdown behavior was mechanically correct but unclear. UI/result text now states that the player's turn is **not skipped**; Dodge is 0% against the next enemy offensive action, then Knockdown clears.

The next economy check should distinguish **immediately sellable/liquid value** from broader useful-item or purchase-value equivalence.

## Deliberately deferred

Human tuning of the replacement loop; full campaign and browser regression; Phase 4 statuses/Sanity; Phase 5 magic; Phase 6 feedback; Auron/Scar messaging; unrelated polish. Phase 3.2 changes only Cave Beetle pacing. Current enemy HP/DEF are 6/0, 8/1, 6/0, 8/0, 12/1 and 24/2 in the locked enemy order.

## Human playtest guidance

1. Play short outings ending around Floors 2–3. Record starting/remaining melee DUR, Arrows, potions used, gear found, actual sale proceeds and replacement purchases. Distinguish useful-item value from cash.
2. Break a Sword or Hammer, Return, sell Collectables and buy replacement equipment. Also try Bare Hands when no purchase is affordable.
3. Fire the final Arrow, confirm the Bow stays equipped, then replenish ammunition and fire again. Repeat with a legacy zero-DUR Bow save and Crystal Bow if available.
4. Save before collecting Treasure and after collection; reload each and confirm identical continuation with no duplicate items. Check the existing full-Bag choice as well.
5. Make repeated short Returns/re-entries and a retreat. Expect continued deck consumption, not a fresh distribution. Assess whether the occasional constraint-driven Empty filler is noticeable or harmful.
6. Check whether gross supply above 40G on some three-floor outings becomes excessive in actual play, and whether the low end still permits recovery. Prefer adjusting existing value supply if melee replacement proves harsh.

Stop here for review and human playtesting. Phase 4 was not started.

## Phase 3.2 Beetle pacing correction

Human Phase 3.1 playtesting found Cave Beetle could take approximately 10 rounds at **10 HP / 2 DEF**, missing the intended 3–4 successful-attack pacing. Canonical Beetle is now **8 HP / 1 DEF**, preserving its ordinary armored-enemy identity. Human confirmation of the resulting fight length remains pending.

Files changed in this patch:
- `HearthVale_Content/expedition.js` — Beetle HP/Defense only.
- `tests/phase3-pit-economy.test.js` — canonical 8/1 assertion.
- `tests/phase2-combat.test.js` — zero-damage Glancing-hit regression uses the existing DEF-2 Ruin Brute, retaining its original damage/Impact/wear assertions. The independent Beetle HP-10 spell fixture remains untouched.
- `docs/Phase3_Pit_Economy_RNG_Design_Brief.md`, `docs/Phase3_Pit_Economy_RNG_Handoff.md`, `docs/HearthVale_VS_Playtest_Log.md` — focused correction and playtest record.

Verification: `node --test tests/phase3-pit-economy.test.js tests/m2-combat.test.js tests/phase2-combat.test.js` — **57 passed, 0 failed**. `git diff --check` — clean. No full suite, production/browser campaign or Android build was run.

Block wear and room-deck behavior were reviewed and intentionally untouched. The current **1/2/3 DUR Block-wear** rule stays on the human-playtest watchlist. The 30-card composition, current anti-streak behavior and legal noncombat streaks remain unchanged. Phase 3.1 Treasure/economy and Tome behavior are preserved. No other enemy stats or combat formulas changed. Phase 4 was not started. No commit or push.
