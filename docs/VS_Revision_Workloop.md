# VS Revision Workloop

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


**Purpose:** Define the discussion -> implementation -> playtest loop for revising the HearthVale Vertical Slice after the research phase.

## Working Method
For each revision phase:

1. **Inspect the current HearthVale implementation.**
   - Verify what the VS actually does.
   - Check for drift between current code and older locked design documents.
2. **Discuss the design.**
   - Resolve edge cases.
   - Decide the revised VS rule.
3. **Lock the decision for the revised VS.**
4. **Update the authoritative design/revision documentation.**
5. **Prepare a focused implementation brief.**
6. **Review the implementation against the agreed design.**
7. **Playtest the implemented chunk.**
8. **Fix regressions/bugs before moving to the next dependent system.**

Do not redesign the entire game at once and attempt one giant rewrite.

# Phase 1 — Stability + Player Flow

## Discussion / inspection
Confirm:
- Bare Hands behavior.
- Whether Brace / Wait is also required.
- Heart-loss safe-return behavior.
- Which existing screens are genuine player screens.
- Which screens are development/debug instrumentation.
- What belongs behind Dev Mode.

Inventory the current screen/state flow instead of guessing.

## Implementation
- Add no-equipment combat fallback.
- Eliminate Return Encounter softlock.
- Implement safe Heart-loss return.
- Fix New Game candidate repetition if confirmed.
- Clear stale expedition/combat state.
- Remove unnecessary non-decision screens.
- Move useful debug-only screens behind Dev Mode.
- Make equipment tiles direct combat actions where appropriate.

## Playtest checkpoint
Try to break the game deliberately:
- empty inventory,
- broken weapons,
- flee,
- Return Encounter,
- Heart loss,
- Poison,
- surface return,
- repeated New Game.

**Goal:** normal play always progresses and player-facing screens contain meaningful decisions.

# Phase 2 — Combat Rules

This is the largest design-discussion phase.

## 2A — DEX / Dodge
Lock:
- exact DEX-difference bands,
- buffer range,
- 25 / 50 / 75% thresholds,
- ordinary Dodge cap,
- any exceptional 100% cases.

## 2B — Hit quality
Decide:
- whether Glancing / Normal / Critical stays,
- what roll determines it,
- damage modifiers,
- whether weapons modify those outcomes.

## 2C — Enemy response
Review the old mechanics beside the current implementation.

Resolve:
- Dodge,
- Block,
- Counterattack,
- Stagger,
- Impact,
- Stability,
- Knockdown.
Current revision direction:
- Dodge = avoid the attack.
- Block = mitigate the attack.
- Counterattack = accept the hit, then attack back.
- Staggered enemy = incoming action cancelled, allowing Press the Advantage / free follow-up attack.

## 2D — Combat UI
Only after the mechanics are locked, decide exactly what the text-based combat screen presents.

## Implementation
Prepare one focused combat-system brief containing the final authoritative rules.

Replace obsolete rules rather than layering new combat logic on top of contradictory old behavior.

## Playtest checkpoint
Test:
- similar DEX,
- large DEX advantage/disadvantage,
- armored enemy,
- Stagger,
- Block,
- Counterattack,
- weapon break,
- Bare Hands.

**Goal:** combat is readable, reasonably fast, and every defensive choice has a clear purpose.

# Phase 3 — Enemy Pacing + Durability + Economy + Pit RNG

Treat these as one connected ecosystem.

## Discussion
Establish targets:
- normal early-fight duration,
- reasonable encounter count per expedition,
- expected durability consumption,
- expected expedition value,
- baseline recoverable shop gear,
- what remains random,
- what minimum opportunities the Pit quietly guarantees.

Design controlled room distribution using a lightweight weighted bag/deck/queue approach rather than fully independent rolls.

## Implementation
Tune together:
**enemy HP/Defense -> encounter density -> durability -> loot/value -> shop baseline -> room distribution**

Do not patch them independently.

## Playtest checkpoint
Run a natural multi-day playthrough.

Desired loop:
**fight -> earn value/resources -> wear equipment -> return -> sell/shop/train -> next expedition**

Avoid:
**fight -> break everything -> broke -> doomed**

# Phase 4 — Statuses + Sanity

## Status discussion
Lock:
- Poison trigger timing,
- duration model,
- cure behavior,
- compact status presentation,
- details-on-demand.

Build one reusable status model before expanding the list.

## Sanity discussion
Design only the VS proof:
- Sanity bands,
- sample mechanical effects,
- sample information/text distortion,
- sample hallucination/manifestation events.

## Implementation
Implement reusable status presentation first, then the limited Sanity demonstration.

## Playtest checkpoint
Deliberately lower Sanity and verify that the decline is felt without staring at the number.

# Phase 5 — Magic Overhaul

Do this only after revised combat rules are stable.

## Discussion
Resolve:
- old exponential Essence model vs current explicit Strain model,
- final casting-pressure rule,
- each VS spell's unique purpose.

For every spell ask:
> **Why would I choose this spell instead of another action?**

Design around real HearthVale axes:
- Dodge,
- Defense,
- DEX,
- NEAR/FAR range,
- Stagger,
- statuses,
- healing,
- Sanity,
- escape,
- exploration utility.

Force should be reviewed against the final range/Stagger system.

## Implementation
Implementation begins only after the spell list, costs, and rules are locked.

## Playtest checkpoint
Test both spell-heavy and spell-light Actors and deliberately push Strain.

# Phase 6 — Feedback + Auron + Progression Clarity

## Discussion
Lock:
- first Heart-loss Auron event,
- final-Heart newbie rescue,
- training unlock timing,
- Scar announcements,
- material/shop unlock messages,
- XP visibility,
- important Actor/world change notifications.

## Implementation
Mostly presentation, event timing, and state clarity.

## Playtest checkpoint
Ask:
> **Can the player understand why their Actor or world changed without opening developer screens?**

# Phase 7 — Succession

## Discussion
Confirm persistence rules:
- Gold,
- equipment/inventory,
- shop/material unlocks,
- training,
- world state,
- Actor history,
- Scars,
- successor generation.

Most of this should be verification, not invention.

## Implementation
Fix whatever prevents the designed succession flow from working.

## End-to-end playtest
Start a fresh Actor.

Play normally.

Eventually die.

Choose a successor.

Continue playing.

The VS is not truly validated until the full loop works.

# Phase 8 — Demo Polish + Packaging

Only after the complete vertical slice works.

Then:
- playtest again,
- fix remaining kinks,
- finalize Dev Mode contents,
- polish presentation,
- package the demo.

Target outputs:
- browser build,
- Android app,
- Windows executable,
- appropriate macOS package,
- GitHub release/source.

Packaging should package HearthVale, not trigger another redesign cycle.

# Keep the Post-VS Pile Closed
Do not expand the VS with:
- dynamic town events,
- deeper LWE surface simulation,
- character backgrounds,
- expanded jobs/economy,
- large noncombat event pools,
- thematic Pit conditions,
- huge Sanity manifestation pools,
unless the VS specifically requires one of them.

# Immediate Next Step

Start with **Phase 1 — Stability + Player Flow**.

First inspect the current VS implementation and current screen/state flow.

Then:
1. identify what already exists,
2. identify what conflicts with the revision plan,
3. lock the few remaining Phase 1 decisions,
4. produce a focused implementation brief,
5. implement,
6. playtest before touching combat math.

This keeps design ahead of implementation and prevents implementers from having to guess what HearthVale is supposed to do.