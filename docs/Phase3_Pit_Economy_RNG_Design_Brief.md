# HearthVale Vertical Slice — Phase 3 Pit Economy, Durability & Controlled RNG

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Phase 3.1 tuning applied after human playtest; awaiting replacement-economy recheck**
Purpose: preserve the approved Pit economy/replacement loop while deliberately avoiding extra economy and RNG subsystems before playtesting proves they are needed.

## Phase 3 Goal

Treat Pit pacing, durability, loot, economy, shop recovery, and room generation as one connected ecosystem.

Desired loop:

> **fight -> earn value/resources -> wear equipment -> return -> sell/shop/train -> next expedition**

Avoid:

> **fight -> break everything -> broke -> doomed**

Core philosophy:

> **Gear is expendable. Treasure is frequent. Replacement opportunities are common. The Pit pays for continued adventuring.**

The Pit should feel random in order, but controlled in overall supply.

> **The order is random. The overall supply is controlled.**
## 1. Enemy Pacing Targets

Do not lock exact enemy HP/Defense until Phase 2.1 combat has been human-playtested.

Target successful-player-attack counts for ordinary early fights:

- **Slime:** about 2–3 successful attacks
- **Cave Beetle:** about 3–4 successful attacks
- **Venom Spider:** about 2–3 successful attacks
- **Pit Hound:** about 4–5 successful attacks
- **Frenzied Adventurer:** about 4–5 successful attacks
- **Ruin Brute:** clearly longer than an ordinary encounter, but not a 20-round damage sponge; exact target TBD after Phase 2.1 playtest

Enemy identity should come from a small number of strong properties rather than large movesets:

- Slime -> baseline/simple enemy
- Cave Beetle -> armored
- Venom Spider -> fast/poisonous
- Pit Hound -> fast/aggressive/mobile
- Frenzied Adventurer -> rounded humanoid threat with varied attacks
- Ruin Brute -> heavy-impact endurance threat

### Deferred tuning after Phase 2.1 playtest

Add exact:
- enemy HP,
- enemy Defense,
- any Phase 2.1 stat/Speed adjustments needed to hit the pacing targets,
- guardian duration target if the new combat math makes the Ruin Brute too short or too long.
## 2. Durability Philosophy

HearthVale should follow the Path of Adventure-style direction discussed during playtest:

> **Weapons may break often, but opportunities to replace them should also appear often.**

Do not solve durability pressure by making weapons nearly permanent.

### Basic weapon durability — Phase 3 baseline

Keep the original melee durability values after the Phase 2.1 pacing simplification:

- Sword: **12 DUR**
- Hammer: **10 DUR**
- Bow: **no DUR**

Do **not** raise Sword/Hammer to 18 DUR by default.

The Bow's attrition system is ammunition instead of durability:
- each Bow attack consumes **1 Arrow**,
- the Bow does not lose DUR,
- at 0 Arrows the Bow remains equipped and intact but cannot attack,
- replenishing Arrows makes it usable again.

This rule also applies to upgraded/crafted Bows unless a later design explicitly creates a different ranged-weapon resource model.

Found melee weapons arrive at their full authored DUR. Found Bows have no DUR value.

Variable found melee condition is **out of scope for the VS** unless later playtesting demonstrates a concrete need. Found melee weapons remain full DUR for this slice.

### Destruction

> **0 DUR = a DUR-bearing item is destroyed.**

This applies to melee weapons and other authored DUR-bearing equipment.

Bows do not participate in durability destruction; running out of Arrows makes a Bow temporarily unusable, not broken or unequipped.

No broken-but-retained inventory state.
No repair system in the VS.
No automatic recovery of destroyed DUR-bearing equipment.

Block wear from Phase 2.1 remains meaningful and contributes to the expendable-gear loop.
## 3. Recovery Paths

A player should have three distinct equipment-recovery paths:

1. **Find a weapon in the Pit**
   - cheapest and most exciting,
   - opportunistic rather than guaranteed on a specific floor.

2. **Sell expedition value and buy a basic replacement**
   - reliable recovery path,
   - intended safety net when loot RNG does not hand the player the weapon they want.

3. **Bare Hands**
   - emergency mechanical fallback,
   - prevents weaponless combat softlocks,
   - not intended to replace the equipment economy.

The shop should not be the primary source of replacement gear. The Pit should generate enough value and equipment opportunities that adventuring itself sustains further adventuring.

## 4. Basic Shop Safety Net

For the VS, the General Shop should predictably maintain access to baseline replacement equipment.

At minimum:
- basic Sword,
- basic Hammer,
- basic Bow.

Basic Shield and Chest Armor should also remain predictably recoverable rather than being made dependent on rare randomized stock.

Existing limited, used, or crafted stock may remain where already authored, but Phase 3 should **not expand the shop into a new simulation layer**.

Do not add new rotating-stock logic, merchant rarity systems, repair, item-quality tiers, or other shop machinery merely to make the economy feel deeper.

The point is not infinite gear; the point is that a player with enough Gold should be able to deliberately recover from bad equipment luck.

If melee replacement pressure is too harsh, prefer increasing **Gold/Valuable availability or sellable value** before inflating melee durability. The intended solution is a healthier replacement economy, not nearly permanent melee weapons.

Current basic weapon prices are a useful starting reference and are not automatically changed by this design:
- Sword: 30G
- Bow: 35G
- Hammer: 40G

Exact prices/stock floors may be adjusted only if Phase 3 playtesting shows the target economy cannot support replacement.

## 5. Expedition Value Target

A normal successful outing reaching roughly Floors 2–3 should commonly accumulate about:

> **25–40G worth of replacement/sellable value**

This is **not** required to be 25–40 raw Gold.

Value may come from:
- valuables,
- creature materials,
- resource materials,
- direct Gold where authored,
- a weapon that removes the need to purchase a replacement,
- other sale goods.

The target exists so a player who uses and breaks equipment can usually remain within striking distance of another basic weapon.

Combat and exploration should feed back into future expedition viability.
## 6. Persistent Hidden Room Deck

Replace independent room-family percentage rolls with a lightweight draw-without-replacement room-family deck.

### Initial 30-card composition

| Room Family | Cards | Approx. Share |
| --- | ---: | ---: |
| Combat | 8 | 27% |
| Resource | 6 | 20% |
| Treasure | 6 | 20% |
| Hazard | 4 | 13% |
| Event | 3 | 10% |
| Empty | 2 | 7% |
| Discovery | 1 | 3% |
| **Total** | **30** | **100%** |

Why 30:
- a full nine-floor ordinary descent is roughly 27–36 generated rooms,
- one deck therefore represents roughly one Stratum-scale supply cycle,
- exact room order remains unpredictable while the broad mix is controlled.

The deck is shuffled with the deterministic Core RNG and drawn without replacement.
### Persistence

The room-family deck should be Pit-level persistent state, not recreated every floor.

It should:
- persist across floors,
- persist across short expeditions/returns,
- be saved/reloaded with the world,
- refill and reshuffle only when exhausted.

This prevents repeatedly starting a fresh distribution by doing short runs.

### Existing floor constraints remain useful

Retain:
- **3–4 rooms per ordinary floor**,
- **maximum 2 combat rooms per floor**,
- no duplicate exact encounter/template on the same floor where the current generator already prevents it,
- Floor 10 fixed guardian structure remains outside the ordinary deck.

If a remaining card is temporarily ineligible because of a floor-local constraint, do not discard it. Draw/select from currently eligible remaining cards and preserve the ineligible card for a later room.

Implementation must not corrupt deck counts when applying floor-local eligibility rules.
## 7. What Controlled RNG Should and Should Not Do

The room deck is the VS fairness mechanism.

Do **not** stack additional hidden fairness systems on top of it unless human playtesting demonstrates a specific viability failure.

Do **not** initially add:
- a hard one-combat-per-floor rule,
- a hard "Combat can never follow Combat" rule,
- a weapon pity counter,
- a mandatory Treasure-by-Floor-X rule,
- multiple overlapping hidden guarantees before playtesting shows they are necessary.

Combat clustering is allowed.
Peaceful stretches are allowed.
The system should prevent absurd long-run distributions naturally by exhausting cards from the finite deck.

If human playtesting still produces equipment/resource droughts that threaten viability, first tune the existing deck composition, treasure table, or reliable shop safety net. Add a new pity/guarantee mechanic only if those existing systems cannot solve the demonstrated problem.

Principles:

> **Randomize abundance, not viability.**

> **The player does not need to see the fairness machinery.**
## 8. Treasure Frequency and Reward Table

Treasure rises from the old 10% room-family weight to about **20% of the controlled deck**.

A room called Treasure should always contain an actual reward.

### Initial Treasure reward distribution

| Result | Chance |
| --- | ---: |
| Basic HP Potion | **15%** |
| Valuable | **40%** |
| Basic Weapon | **20%** |
| Scroll | **15%** |
| Tome | **10%** |
| Nothing | **0%** |

### Phase 3.1 human-playtest correction

The first Phase 3 APK showed that gross "G-equivalent" supply overstated practical recovery. Potions, Scrolls and Tomes can be useful without giving the player spendable Gold for a destroyed melee weapon.

For the replacement economy, prioritize **actual liquid/sellable value** over theoretical purchase-value equivalence. The Treasure table above therefore shifts toward Valuables while preserving the existing weapon-find rate.

Do not lower basic weapon prices or raise Sword/Hammer DUR yet. First test whether the higher Valuable share makes replacement purchases realistically reachable after Floors 2–3.

This replaces the current 20% "nothing" outcome.

### Weapon result

For Phase 3:
- weapon finds are basic weapons,
- found Sword/Hammer condition is full authored DUR,
- a found Bow has no DUR and uses Arrows as its attrition resource,
- basic weapon Treasure selects **Sword/Hammer/Bow evenly**.

Do not add higher-tier/crafted gear to this generic Treasure result without a separate design decision.
## 9. Relationship Between Treasure and Weapon Supply

At 20% Treasure rooms and 20% Weapon results inside Treasure, the initial model produces a weapon on roughly 4% of ordinary room draws before other authored equipment events are considered.

This is an initial playtest rate, not a permanent guarantee.

The desired experience is:
- sometimes find a replacement before needing the shop,
- sometimes find a weapon the player does not currently prefer,
- sometimes return with sale value and deliberately buy a replacement,
- never become permanently trapped because Bare Hands remains available.

If this rate still creates long weapon droughts during natural play, tune the supply after observing real runs rather than preemptively stacking pity systems.

## 10. Resource / Valuable Feedback

Expedition rewards need clear player-facing feedback when acquired and when converted into value.

Existing material turn-ins and sales should not feel like invisible state changes.

Phase 3 implementation should make it obvious:
- what was found,
- where it went,
- what it is worth when sold where appropriate,
- when a material turn-in unlocked/discovered something,
- what Gold or replacement opportunity the player gained from returning with loot.

Do not add large new narrative systems here; this is readability/feedback for the economy already present.
## 11. Scope Guardrail — Deep Through Interaction, Not More Systems

Phase 3 should deepen the existing expedition loop by making its current systems support one another:

> **fight -> gear wears -> find value -> return -> sell/replace -> descend again**

Do not add a new mechanic when tuning an existing part of this loop can solve the problem.

The hidden room deck is acceptable complexity because it is invisible fairness machinery; the player should experience variety and recoverability, not manage another meter or subsystem.

## 12. Systems That Must Remain Separate

Phase 3 must not accidentally absorb later-phase work.

Do not redesign here:
- Sanity consequences,
- Poison/status architecture beyond compatibility,
- spell economy or spell identities,
- Auron/training,
- succession,
- broad surface-world simulation,
- final visual polish.

Phase 2.1 combat rules are treated as the combat foundation. Phase 3 tunes the ecosystem around them after the Phase 2.1 human playtest.

## 13. Phase 3 Playtest Questions

After implementation, test natural multi-floor and multi-day play rather than only isolated unit cases.

Measure:
- actual attacks required per enemy,
- fights per floor / per expedition,
- weapon DUR consumed per fight and per outing,
- frequency of weapon breakage,
- frequency of replacement finds,
- sellable value brought home by Floors 2–3,
- time/Gold required to recover from a broken weapon,
- Treasure frequency and usefulness,
- whether the 30-card deck feels varied rather than patterned,
- whether short repeated expeditions can exploit/reset the distribution,
- whether any legal state approaches the old "broke -> doomed" spiral.
## 14. Open Tuning Block — Fill After Phase 2.1 Playtest

Before this document becomes the implementation brief, fill in:

### Enemy numbers
- Slime HP / Defense:
- Cave Beetle HP / Defense: **8 / 1** (Phase 3.2 human-playtest correction).
- Venom Spider HP / Defense:
- Pit Hound HP / Defense:
- Frenzied Adventurer HP / Defense:
- Ruin Brute HP / Defense:

### Equipment/economy
- Confirm Sword 12 DUR / Hammer 10 DUR feel appropriate under faster Phase 2.1 combat:
- Confirm Bow uses Arrows only and has no DUR:
- Confirm basic Shield/Chest stock floor:
- Confirm basic weapon prices or revised prices:
- Confirm whether Gold/Valuable supply makes melee replacement affordable:
- Confirm weapon-find Sword/Hammer/Bow distribution:
- Confirm whether any upgraded/crafted **melee** weapon DUR changes are needed in Phase 3:

### Controlled RNG
- Confirm 30-card room-family composition after Phase 2.1 playtest:
- Confirm whether any minimal pity/guarantee is actually needed:
- Confirm deck reset/refill semantics after direct save/load testing:

### Economy target
- Confirm whether 25–40G-equivalent by Floors 2–3 feels sustainable without becoming overly generous.

Only after these tuning values are filled should this document be converted into the focused implementation brief.

### Phase 3.2 Beetle pacing correction — 2026-09-30

Human Phase 3.1 playtesting found Cave Beetle fights could take approximately 10 rounds. Its 10 HP / 2 DEF did not match the intended 3–4 successful-attack pacing. Canonical Cave Beetle is now **8 HP / 1 DEF**, preserving its ordinary armored-enemy identity. Combat math and all other enemy stats remain unchanged.

Block wear and room-deck behavior were reviewed and deliberately left unchanged: the current 1/2/3 DUR Block-wear rule remains on the human-playtest watchlist; the 30-card composition and existing anti-streak behavior remain intact, and noncombat streaks remain legal. Phase 3.1 Treasure/economy tuning is preserved. Phase 4 has not started.
