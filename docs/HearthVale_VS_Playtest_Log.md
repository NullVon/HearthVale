# HearthVale Vertical Slice Playtest Log

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


**Started:** 2026-09-26
**Purpose:** Running record of playtest observations, bugs, blockers, tuning concerns, design candidates, and confirmed strengths discovered while testing the HearthVale vertical slice.

## Working Rule
- This file is the source-of-truth log for the current VS playtest.
- Observations may be recorded before a final decision is made.
- Items marked **Critical** or **Blocker** may prevent continued testing.
- Items marked **Maybe Change** are candidates, not approved redesigns.
- Broader redesigns should wait until the playtest has exposed the surrounding systems.
- **These observations require design review before implementation.**

## Critical / Blockers

### Return Encounter deadlock with no equipment
**Status:** Confirmed blocker.
- Player exhausted/broke all usable weapons.
- Player fled toward the Pit entrance and triggered a Return Encounter.
- Return Encounters disable Retreat.
- No Unarmed Strike exists.
- No Pass / Wait / End Turn action exists.
- Only legal action became changing range between NEAR and FAR.
- Result: indefinite combat deadlock; player cannot win, lose naturally, retreat, or progress.
- Current run had to be abandoned/restarted because of this.

**Required safeguard candidates:**
- Add an always-available low-power Unarmed Strike.
- Add a universal Pass / Brace / End Turn option.
- Ensure every reachable combat state has at least one path that advances resolution.
- Explicitly test no-weapon/no-spell/no-item states in normal and Return Encounters.
## Bugs / State-Flow Issues

### New Game repeats the same three starting Actors
**Status:** Suspected bug or deterministic development placeholder.
- Multiple New Games appear to present the same three candidates.
- Intended behavior is three newly generated starting Actors.

### Unexpected HP restoration on return/defeat
**Status:** Needs investigation.
- Run sequence: F1R3 Wolf -> successful flee -> return toward entrance -> Beetle ambush.
- Beetle was defeated with the player at 1/14 HP.
- On reaching the surface, HP became 7/14.
- 7 HP is exactly half of 14 Max HP.
- Later UI confirmed a defeat/return flow can restore to 7 HP.
- Need to distinguish intended Heart-loss recovery from unintended surface-return healing.

### Stale expedition/combat summary persists
**Status:** Confirmed UI/state issue.
- On the following day, the Pit still displayed the prior expedition's final combat/return summary.
- Old Mandible Snap, d20 result, damage, Heart-loss, and return text remained visible as if current.
- Temporary expedition/combat state should be cleared or moved to explicit history.

### Scar acquisition is not surfaced
**Status:** Confirmed discoverability issue.
- Character gained **Poison Trauma**.
- No immediate notification announced the new Scar.
- Scar was only discovered manually under Character -> Traits -> Scars.

### Auron/newbie-protection event is delayed and inconsistent
**Status:** Needs redesign/review.
- Player lost Hearts before any timely Auron interaction was shown.
- UI later displayed: "Auron rescued Mara from final-Heart loss (3 -> 2 Hearts). Training with Auron unlocked."
- By then the player HUD showed only 1 Heart.
- Message described an older state rather than the player's current state.
## UI / UX Issues

### Surface UI is too bright
**Status:** Maybe Change.
- The light surface palette is visually harsher than the darker Pit/combat presentation.
- Review overall contrast and visual continuity.

### Combat actions require scrolling
**Status:** Confirmed mobile UX issue.
- Essential turn actions can fall below the phone viewport.
- Player should not need to scroll simply to attack, move, retreat, or finish a turn.

### Equipment tiles should be the attack controls
**Status:** Preferred redesign candidate.
- Current UI shows four equipment tiles and then separate duplicate "Attack: [weapon]" buttons.
- Proposed direction: tap the equipped Sword/Hammer/etc. tile itself to attack.
- Empty equipment tiles remain inactive.
- Removes redundant vertical UI and reduces scrolling.

### Standalone Round Outcome screen
**Status:** Strong removal candidate.
- Screen offers no meaningful choice beyond "Next round."
- It adds a mandatory tap without gameplay.
- Prefer displaying round resolution inline and immediately returning control.

### Two non-decision screens after Stagger
**Status:** Confirmed flow problem.
- If the opponent is Staggered, the usual defense-response screen can contain no meaningful action.
- It then leads into the non-interactive Round Outcome screen.
- Result: two consecutive screens where the player cannot make a decision.

### Training screen hides current XP
**Status:** Confirmed UX issue.
- Training buttons show XP/AP costs but not the player's current XP pool.
- When a screen asks the player to spend a resource, the current amount should be visible there.
## Combat / Balance / Pacing

### F1R2 Cave Beetle took 14 rounds
**Status:** Major tuning watch item.
- Encounter occurred with starter/no-upgrade conditions.
- Too early to decide whether this was statistical variance or systemic pacing.
- Revisit after broader playtest data.

### Binary d20 hit/miss may be causing dead turns
**Status:** Design candidate; not approved yet.
- Current combat can produce repeated turns where the player's chosen attack accomplishes nothing.
- Candidate direction: attacks connect by default and the d20 determines degree of success.
- Example concept: glancing / normal / strong / critical result bands.
- Damage could remain Weapon DMG minus DEF with a minimum result.
- Keep d20 flavor while reducing "press attack -> nothing happens" turns.

### Stagger may need an active reward
**Status:** Design candidate.
- Current value is primarily "enemy does not damage you for a turn."
- Candidate: special Counterattack / Press the Advantage option.
- Broader reaction-system candidate for enemy phase:
  - Dodge
  - Block with equipment
  - Attack/Counterattack with equipment, trading defense for offense

### Encounter frequency vs encounter duration
**Status:** Major pacing concern.
- D3F1R1 Slime followed immediately by D3F1R2 Wolf.
- Earlier runs also produced back-to-back combat.
- If fights remain long, encounters likely need more spacing.
- If encounter density remains high, common fights need to resolve much faster.
- Final decision should consider economy and durability at the same time.

### Poison timing observed
**Status:** Behavior observed; verify against intended rules.
- Poison does not appear to damage on ordinary room changes.
- Poison damages when changing floors.
- Poison damages during combat turns.
- UI later stated: "-1 HP after each round or noncombat Room," which may conflict with observed behavior.
## Economy / Progression

### Durability consumption is outpacing reliable income
**Status:** First major progression roadblock.
- Frequent combat burns weapon DUR and can destroy gear.
- Player has not discovered a stable early-game source of gold.
- Few/no meaningful valuables had appeared before gold depletion.
- Gold fell to 0 while equipment was exhausted.
- This directly contributed to the no-equipment combat blocker.
- Review together: encounter density, fight length, DUR loss, treasure rate, gear prices, and gold income.

### Material turn-ins have unclear effects
**Status:** Confirmed feedback/discoverability issue.
- Moonleaf turned in at shop; no clearly noticed change in wares.
- Beetleshell turned in at shop; no clearly noticed change in wares.
- Bigshroom turned in at shop; no clearly noticed change in wares.
- Verify what each material actually unlocks.
- If inventory changes, explicitly communicate the unlock/change.
- If a material does not affect current wares, avoid implying otherwise.

### Poison cure is unclear to the player
**Status:** Confirmed discoverability problem.
- Player became poisoned after D2F1R2 Spider.
- No obvious in-game explanation of how poison is cured.
- Relationship, if any, between Moonleaf/shop unlocks and antidotes was unclear.

### Auron training timing
**Status:** Leading redesign candidate.
- Current flow can leave the player at 1 Heart before training becomes meaningfully available.
- Preferred candidate:
  - First Heart loss: Auron notices/intervenes narratively and unlocks training.
  - Final Heart would be lost: Auron performs the actual newbie-protection rescue.
- This gives the player runway to learn and improve before succession/death pressure becomes immediate.
## Room Generation / RNG Distribution

### Strong room-type streaks observed
**Status:** Watch item becoming a pattern.
Observed sequences include:
- Back-to-back combat rooms.
- D3F1R3-R4 and D3F2R1-R2: four empty rooms in a row.
- After retreating to Floor 2 start: three treasure rooms in a row.
- Consider light anti-streak/distribution smoothing while preserving randomness.
- Do not decide final limits until more runs are observed.

## Playtest Chronology

### Initial UI pass
- Surface UI judged too bright.
- Combat attacks/actions required scrolling.
- Four equipment squares felt like they should be buttons themselves.
- Standalone attack buttons below equipment felt redundant.
- Round Outcome screen judged unnecessary because only "Next round" was available.

### Early New Game observation
- New Game repeatedly appeared to offer the same three starting Actors.

### Day 1 / Floor 1
- F1R2: Cave Beetle encounter took 14 rounds.
- F1R3: Wolf encountered; player fled successfully.
- Return toward entrance triggered Beetle ambush.
- Beetle defeated with 1 HP remaining.
- Sword was lost/broken during the sequence.
- Returning to surface resulted in 7 HP.

### Day 2
- Prior expedition summary still visible on Pit screen.
- D2F1R2: Spider defeated relatively easily; player became poisoned.
- D2F2R2: Wolf encounter while poisoned.
- D2F2R3: Spider immediately after Wolf.
- Stagger produced a defense screen with no meaningful action, followed by Round Outcome.
- Player later died from poison during Spider fight and respawned at floor start with 7/14 HP.
- Player still appeared poisoned after that defeat.
- Poison Trauma Scar existed but had not been announced.
- Player had 1 Heart and still had not received timely Auron/training messaging.
- On return to surface/Pit, delayed Auron rescue/training message finally appeared.

### Day 3
- D3F1R1: Slime.
- D3F1R2: Wolf.
- D3F1R3-R4 and D3F2R1-R2: four empty rooms.
- Player reached 0 gold and exhausted usable equipment.
- In normal combat, no offensive action and no Pass existed.
- Player could only change range or retreat.
- After retreating to Floor start, three treasure rooms appeared consecutively.
- Returning toward Pit entrance triggered a Cave Beetle Return Encounter with no weapons.
- Retreat unavailable; only NEAR/FAR movement remained.
- Run ended in confirmed deadlock/softlock.
## Succession Test Plan
Current run could not reach natural succession because it ended in the combat deadlock.

On the next viable character death, verify:
- Exact death trigger at final Heart loss / zero Hearts.
- Succession presentation and clarity.
- Whether three successor candidates are newly generated.
- What carries over to the successor:
  - Gold
  - Equipment/inventory
  - Shop/material unlocks
  - Auron/training unlock
  - World state
  - History/life record
  - Scars (should belong to the prior Actor unless rules say otherwise)
- Whether training remains unlocked for the new Actor.
- Whether any temporary poison/combat/expedition state leaks into the successor.

## 2026-09-30 — Phase 3 APK Playtest

### Knockdown persistence is mechanically correct but unclear
**Status:** Presentation fix approved and applied in Phase 3.1.
- Player Knockdown remained visible after the player acted.
- This looked like a skipped-turn/recovery bug.
- Locked clarification: player turn is not skipped; Knockdown means 0% Dodge against the next enemy offensive action, then it clears.
- UI/result wording now states this explicitly.

### Tomes looked unusable
**Status:** UX fix approved and applied in Phase 3.1.
- Two Tomes were found, but Inventory made them appear like gear that should be equipped.
- Existing mechanics already learn a Tome into a spell slot rather than equip it.
- Inventory and expedition Bag now state: Tomes are learned, not equipped, and point to the Learn action between combats.

### Replacement economy still feels poor
**Status:** Phase 3.1 tuning applied; requires another human check.
- Two consecutive Days reached roughly Floor 3 without enough practical Gold recovery to comfortably replace a destroyed Sword.
- The earlier automated 25–40G-equivalent target overstated practical liquidity because it counted useful items at purchase-equivalent value.
- Treasure changed from Potion 25 / Valuable 25 / Weapon 20 / Scroll 15 / Tome 15 to:
  - Potion 15%
  - Valuable 40%
  - Weapon 20%
  - Scroll 15%
  - Tome 10%
- Sword/Hammer DUR and weapon prices remain unchanged for now.
- Future economy checks should distinguish immediately sellable/liquid value from broader useful-item value.

## Inspiration / Systems to Review Later
- **Path of Adventure** — added to the combat inspiration/reference pool.
- Grim Quest
- Shattered Pixel Dungeon
- A Dark Room
- Dicey Dungeons
- Into the Breach
- D&D-style d20 combat as the current comparison point

## Deferred Until We Review Everything Together
These are intentionally not final decisions yet:
- Replacing binary d20 hit/miss.
- Degree-of-success combat.
- Enemy-phase reaction system.
- Counterattack on Stagger.
- Encounter-rate changes.
- Anti-streak room generation.
- Economy/DUR rebalance.
- Auron/newbie-protection redesign.
- Broader UI restyling.

## Current Highest-Priority Findings
1. **BLOCKER:** no-equipment Return Encounter can deadlock the game.
2. **Critical fallback need:** player needs at least one universal way to act/advance combat with no equipment.
3. **Progression roadblock:** early gold/gear/DUR economy can collapse before the player has a stable recovery path.
4. **Combat pacing:** frequent encounters + potentially long fights compound resource drain and friction.
5. **State/feedback clarity:** Auron events, Scars, poison cure, material unlocks, and stale summaries are not communicated cleanly.

## Phase 3.2 Beetle pacing correction — 2026-09-30

- Human Phase 3.1 playtesting found Cave Beetle could take approximately 10 rounds. The canonical 10 HP / 2 DEF did not match the intended 3–4 successful attacks.
- Applied **8 HP / 1 DEF** to preserve its ordinary armored-enemy identity while reducing fight duration. Human confirmation of practical pacing remains pending.
- Block wear was reviewed but deliberately left at the current **1/2/3 DUR** rule; retain it on the playtest watchlist.
- Room-deck composition and anti-streak behavior were reviewed but deliberately left unchanged. Noncombat streaks remain legal.
- No other enemy stats, combat formulas or Phase 3.1 Treasure/economy systems were changed. Phase 4 was not started.
