# HearthVale Vertical Slice Revision Plan

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


**Created:** 2026-09-28
**Purpose:** Convert the VS playtest findings and three-game reference study into a prioritized revision plan.

## Revision Goal
The current Vertical Slice successfully exposed where HearthVale works conceptually and where actual play becomes slow, unclear, unfair, or impossible.

This revision is **not** an attempt to build the finished game.

The VS should become:
- impossible to softlock through normal play,
- faster and cleaner to operate,
- fair without becoming easy,
- economically recoverable,
- representative of HearthVale's intended Sanity and magic identity,
- and stable enough to complete repeated playtests through death and succession.

## Reference Roles
- **Path of Adventure:** combat + UI.
- **Grim Quest:** Sanity + town + setting + richness.
- **Shattered Pixel Dungeon:** mechanics + invisible fairness + procedural safeguards + code reference.

HearthVale remains a **text-based, Actor-driven, succession-based Living World Engine game**.

# Phase 1 — Remove Run-Breaking States

## No-equipment combat softlock
**Required blocker fix.**

Add an always-available **Unarmed / Bare Hands** attack.

It should be inferior to proper equipment, but the player must always be capable of advancing combat.

Also strongly consider a universal **Brace / Wait / End Turn** action so every combat state has a non-equipment action that advances time.

Core rule:

> **Every reachable combat state must contain at least one action that advances resolution.**

Explicitly test:
- no weapons,
- no spells,
- no usable items,
- normal encounters,
- Return Encounters,
- NEAR and FAR positions.

## Heart-loss recovery
Leading direction:

> **Losing a Heart ends the expedition and returns the Actor to the Pit entrance / safe expedition boundary.**

Heart loss is already meaningful punishment. Do not respawn a depleted Actor deep in the Pit and then force another dangerous escape attempt.

This directly addresses the death-spiral pattern found during playtesting.

## State-flow bugs to investigate
- Repeated identical three New Game Actors.
- Unexplained half-HP restoration.
- Stale previous-expedition summaries.
- Delayed/inconsistent Auron rescue messages.
- Temporary poison/combat/expedition state persisting where it should not.

These are bugs/state issues rather than balance questions.

# Phase 2 — Simplify the Combat Experience

## One-screen combat
The normal combat loop should fit on one portrait phone screen without scrolling for essential actions.

Priority information/actions should remain visible:
- Actor and enemy state,
- equipment/actions,
- defense/reaction options,
- retreat when legal,
- active statuses.

Long explanations belong behind tap/select details rather than occupying the combat viewport.

## Equipment becomes the attack button
Remove duplicate controls such as:
- **Attack: Sword**
- **Attack: Hammer**

when the equipped Sword/Hammer tile can perform that action directly.

Tap the equipped item itself to attack with it.

Empty slot = inactive slot.

Bare Hands remains separately available as the fallback action.

## Remove non-meaningful action screens
Any screen that asks the player to click/tap without making a meaningful decision should be removed from the normal player flow.

Examples include:
- standalone **Round Outcome**,
- empty defense phases,
- intermediate confirmation screens whose only function is **Continue / Next Round**,
- development/testing screens that expose state but do not provide gameplay choice.

Preferred behavior:
> **Action -> result inline -> next meaningful choice.**

If a screen is useful for debugging, instrumentation, or inspecting internal state, place it behind **Dev Mode / Debug Mode** instead of making normal players traverse it.

This should become a general VS UX rule:

> **Normal mode shows decisions. Dev mode may show machinery.**

The exact Dev Mode implementation can be lightweight for now; the immediate goal is to stop development/debug presentation from becoming player-facing friction.

## Defense / Counterattack / Stagger Review
The original HearthVale handoff already contains a **locked Counterattack and Stagger model**, so this revision must review and deliberately update those rules rather than accidentally layering a second system on top.

### Original handoff behavior
- **Counterattack** is an aggressive defensive option.
- If the counterattack kills or Staggers the enemy, the incoming enemy action is cancelled.
- Otherwise the enemy attack lands in full and the player gets no second Block/Dodge.
- **Stagger** currently only cancels the **current incoming action**.
- Stagger currently grants no extra turn or lingering stun.
- **Knockdown** is separate and consumes the target's next offensive action.

### Revised direction
The enemy-response phase should offer meaningful choices such as:
- **Dodge** — attempt to avoid the incoming attack.
- **Block** — mitigate the incoming attack with equipment.
- **Counterattack** — accept the enemy's attack instead of defending, then make one retaliatory attack.

Counterattack is the aggressive risk/reward choice:
> **Eat the damage to attack again.**

If the enemy is already **Staggered**, its current incoming action is cancelled. In that case the Counterattack slot becomes **Press the Advantage / Free Attack**:
> **The enemy cannot act, so the player gets the retaliatory attack without first taking damage.**

The retaliatory/free attack is a single follow-up attack. It must **not** start another enemy-response cycle or create recursive Counterattack chains.

### Required mechanics review before implementation
Before changing code:
- verify how the current VS actually implements Stagger, Counterattack, Impact, and enemy-phase cancellation,
- compare that implementation against the older locked handoff rules,
- deliberately revise the authoritative rule rather than preserving contradictory versions,
- preserve the distinction between **Stagger** (current incoming action cancelled) and **Knockdown** (next offensive action lost).

This means the older handoff sections covering Counterattack and Stagger will likely need to be reopened/updated once the final revised combat rule is approved.

# Phase 3 — Replace the Current Hit/Miss Structure

The reference study gives strong support for moving away from opaque binary d20/DC combat.

## Proposed HearthVale structure

### Step 1 — Dodge
Compare:
**Attacker DEX vs Defender DEX**

Use simple, readable dodge bands.

Current candidate:
- roughly within +/-2 -> **0% Dodge**
- meaningful advantage -> **25%**
- larger advantage -> **50%**
- extreme advantage -> **75%**
- avoid ordinary **100% Dodge**

This keeps fast enemies meaningfully evasive without making routine combat a sequence of misses.

### Step 2 — Hit quality
If the attack is not dodged, a small roll may determine:
- Glancing,
- Normal,
- Critical.

Exact die size and thresholds remain open.

This preserves randomness without making entire turns routinely accomplish nothing.

## Separate defensive concepts
Keep these mechanically distinct:

**DEX / Dodge** -> does the attack connect?

**Defense / Armor** -> how much damage does a connecting attack cause?

# Phase 4 — Rebalance Enemy Pacing

The Floor 1 Cave Beetle taking 14 rounds showed that the current combination of hit rate, HP, Defense, encounter density, and durability is not working.

Do not balance encounter frequency separately from encounter length.

They interact with:
- HP loss,
- durability,
- poison,
- Gold,
- replacement equipment,
- expedition length.

Common early enemies should resolve quickly enough that multiple encounters in one expedition do not become exhausting.

Enemy identity should come from a **small number of strong properties**, not giant movesets.

Possible identity language:
- Beetle -> armored,
- Spider -> poisonous,
- Wolf -> fast/mobile,
- Slime -> one distinctive defensive property.

A basic enemy is allowed to simply be basic.

# Phase 5 — Rebuild the Durability / Economy Loop

The playtest exposed a structural problem:

> **Combat consumes equipment faster than the game reliably enables replacement.**

If HearthVale keeps destructive durability, the economy must support destructive durability.

## Increase sellable dungeon value
Enemies and expedition content should create more opportunities to bring value home.

Possible forms:
- materials,
- valuables,
- creature parts,
- occasional direct Gold,
- other sale goods.

Combat should feed back into future expedition viability.

## Reliable basic shop recovery
The shop can still have randomized interesting stock.

But baseline replacement equipment should be predictably obtainable if equipment is routinely breakable.

Principle:

> **Reliable essentials, randomized interesting options.**

Rare, enchanted, upgraded, or unusual equipment can rotate.

Baseline recovery gear should not be hostage to RNG.

## Material feedback
If Moonleaf, Beetleshell, Bigshroom, or other turn-ins change the shop, tell the player exactly what changed.

Example:
> **New stock unlocked: Antidote**

# Phase 6 — Controlled Pit Randomness

Current independent room rolls produced sequences such as:
**combat -> combat -> empty -> empty -> empty -> empty -> treasure -> treasure -> treasure**

That is technically random but creates poor pacing.

## Replace fully independent room rolls with controlled randomness
Use a lightweight weighted-bag, deck, or rotating-queue approach for room families such as:
- Combat,
- Treasure,
- Empty,
- Event,
- Hazard,
- Discovery.

The generator should remember:
- what appeared recently,
- what has not appeared in a while,
- whether rewards have been unusually scarce,
- whether combat has been unusually dense.

The exact room remains unpredictable.

The pacing layer simply prevents absurd streaks.

Core principle:

> **Randomize variety and abundance, not basic viability.**

## Invisible economic safeguards
Consider hidden minimum opportunity guarantees over an expedition/floor for:
- sellable value,
- replacement resources,
- healing/cures,
- other necessities appropriate to the generated content.

The player does not need to know these safeguards exist.

# Phase 7 — Status Effects and Information

Poison exposed both a rules problem and a communication problem.

The player needs to know:
- what status they have,
- what it does,
- when it triggers,
- how long it lasts,
- how it can be treated.

Because HearthVale is text-based, prefer **compact text first, explanation on demand**.

Example:
**POISONED (4)**

Selecting it can show:
- effect,
- trigger timing,
- remaining duration,
- cure information.

The actual poison timing must also match its description.

Apply the same model to future statuses.

# Phase 8 — Sanity Becomes a Real HearthVale System

This is the largest direct Grim Quest adoption.

Sanity should not function only as:
**number decreases -> eventually 0 -> death**.

Approved conceptual direction:

> **Lower Sanity -> hallucinations + information distortion + debuffs + occasional manifestations/events that may not occur to a sane Actor.**

## VS scope
Do **not** build the full finished-game Sanity system now.

Build enough to prove the concept.

Possible broad bands:
- Stable,
- Disturbed,
- Impaired,
- Severe,
- **0 = Death**.

VS examples can include:
- altered scene text,
- mild information distortion,
- temporary mechanical debuff,
- one or more hallucination/manifestation events.

The goal is to demonstrate:
> **Sanity changes how the Actor experiences the world.**

Exact thresholds and effect pools need a dedicated design pass.

# Phase 9 — Spell Overhaul

Do this after DEX/combat rules settle because spells should interact with the final combat model.

Preserve HearthVale-specific foundations unless later testing disproves them:
- Essence,
- Strain,
- Scrolls,
- Tomes.

Resolve the current documentation drift between the older exponential Essence model and the current explicit Strain implementation before final balance.

## Spell design rule
Every spell should have a recognizable reason to cast it.

Avoid a list that is mostly:
- Fire = X damage,
- Ice = X+1 damage,
- Lightning = X+2 damage.

Spells should manipulate HearthVale's actual systems.

Potential roles:
- bypass/reduce Dodge,
- bypass/reduce Defense,
- alter DEX,
- change NEAR/FAR range,
- cause/exploit Stagger,
- defend,
- heal,
- cleanse,
- restore/protect Sanity,
- create setup/payoff,
- escape,
- unlock,
- manipulate exploration obstacles.

## Force
Force especially deserves redesign consideration.

Possible identity:
> **movement / NEAR-FAR manipulation / Impact / interruption / Stagger setup**

rather than only Impact +3.

Fireball can remain a straightforward damage baseline; not every spell needs to be exotic.

# Phase 10 — Feedback and Discoverability

Several playtest problems were partly communication failures.

Improve feedback for:
- new Scars,
- material/shop unlocks,
- Poison and cures,
- Auron interventions,
- training unlock,
- current XP on the Training screen,
- Heart loss,
- major status changes.

General rule:

> **If something important changed the Actor or world, the player should notice.**

# Phase 11 — Auron / Newbie Protection

Current leading redesign:

## First Heart loss
Auron notices/intervenes narratively.

Training becomes available.

This gives the player time to learn and improve before final-Heart pressure becomes immediate.

## Final Heart would be lost during newbie protection
Auron performs the actual rescue.

The dramatic intervention should happen when the actual final-Heart danger occurs, not be reported late as stale state.

Exact newbie-protection limits still need review.

# Phase 12 — Succession Test

Once the revised VS stops collapsing before natural death, complete the original succession test.

Verify:
- exact final-Heart death trigger,
- succession presentation,
- three newly generated successor candidates,
- Gold persistence rules,
- equipment/inventory persistence rules,
- shop/material unlock persistence,
- Auron/training persistence,
- world-state persistence,
- history/life record,
- Scar ownership,
- no poison/combat/expedition-state leakage.

Succession is one of HearthVale's defining systems, so the VS is not fully validated until this path is tested end-to-end.

# Post-VS / Finished-Game Pile

These findings are valuable but should **not** expand the current VS:
- dynamic town events while the player is away,
- deeper LWE-driven surface changes,
- richer tavern/shop/social atmosphere,
- character backgrounds,
- meaningful noncombat tradeoff rooms,
- larger noncombat event vocabulary,
- broader surface economy/jobs/requests,
- thematic Pit floor conditions,
- advanced hazard/counter rooms,

- richer low-Sanity manifestations,
- more sophisticated enemy/world behavior,
- deeper risk/reward room design.

These belong to finished HearthVale, not to an endlessly expanding Vertical Slice.

# Core Design Principles From the Reference Pass

> **Punish mistakes, not participation.**

Failure can cost Hearts, progress, equipment, resources, or opportunity. It should not trap the player in an unrecoverable state.

> **Make every mechanic readable and purposeful.**

Especially in a text-based game, enemy, spell, stat, status, and consequence identities should be understandable without exposing every internal calculation.

> **Never let randomness remove the player's ability to make a meaningful choice.**

Randomness can decide what opportunity appears. It should not decide whether the player is allowed to continue playing.

> **The player does not need to see the fairness machinery.**

Decks, guarantees, pacing controls, pity systems, counter availability, and similar safeguards can remain invisible beneath the text.

# Recommended Implementation Order

1. Stability/blockers.
2. Combat UI/flow and removal of non-meaningful screens.
3. DEX/combat math.
4. Enemy pacing.
5. Durability/economy.
6. Controlled RNG.
7. Status presentation/rules.
8. Sanity VS proof.
9. Spell overhaul.
10. Feedback/Auron cleanup.
11. Full succession playtest.

# Completion Standard

The revised Vertical Slice should be considered ready for another serious playtest when:
- no legal reachable state can softlock combat,
- ordinary combat does not require scrolling for core actions,
- non-meaningful action screens are removed from player mode or hidden in Dev Mode,
- the player can understand active statuses and major state changes,
- early equipment/economy collapse has a recovery path,
- Pit generation no longer produces obviously miserable streaks unchecked,
- Heart loss resolves into a safe, understandable recovery state,
- Sanity demonstrates at least a small sample of meaningful consequences,
- the spell system is coherent with the revised combat rules,
- succession can be reached and tested naturally.

After that playtest, remaining issues can be separated into:
- must-fix before demo packaging,
- polish,
- post-VS / finished-game work.

## Summary
The revision has four major jobs:

1. **Make the VS impossible to trap:** Bare Hands, safe Heart-loss recovery, state fixes.
2. **Make it pleasant to operate:** one-screen combat, meaningful decisions only, unnecessary screens removed or moved behind Dev Mode.
3. **Make the Pit fair beneath the randomness:** controlled room pacing, viable economy, dependable essentials, fair access to counters.
4. **Make HearthVale's identity visible:** real Sanity consequences, purposeful spells, and succession tested end-to-end.

The VS should prove HearthVale, not try to finish HearthVale.