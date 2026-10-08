# HearthVale Vertical Slice — Phase 2.1 Combat Simplification Revision Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Approved for implementation**

Owner: **Implementation followed by maintainer review and playtesting**

Scope: Phase 2.1 only. Build directly on the completed Phase 2 combat implementation. Preserve all Phase 1/1.1/1.2 work and all unrelated later-phase design documents.

## Goal

Simplify HearthVale combat by removing the underused NEAR/FAR distance layer and replacing the current Knockdown turn-denial rule with a cleaner vulnerability rule.

The revision should preserve the useful Phase 2 combat work:
- relative DEX/Speed Dodge,
- Glancing / Normal / Critical hit quality,
- Block durability,
- Counterattack timing,
- Stagger / Press the Advantage,
- deterministic save/load,
- Normal Mode vs Dev Mode presentation.

Core design direction:

> **Combat should be about actions, stats, resources, defense, interruption, and equipment — not abstract positioning.**

---

# 2.1A — Remove NEAR/FAR from V1 Combat

Remove the NEAR/FAR combat-distance system from new V1 combat.

This includes:
- no persistent combat `range` state for new combat,
- no Move to NEAR / Move to FAR player action,
- no weapon legality based on NEAR/FAR,
- no spell legality based on NEAR/FAR,
- no enemy move legality based on NEAR/FAR,
- no range display in normal combat UI,
- no separate NEAR/FAR enemy move tables for new combat,
- no "out of range" combat resolution,
- no "no legal FAR follow-up" special case.

Do not keep range as hidden gameplay machinery merely because old schemas/saves contain it.

Legacy saves may retain old range fields for compatibility, but new combat should not depend on them.

## Weapon implications

### Sword
Keep:
- STR quality,
- Damage 3,
- Speed 0,
- Impact 1,
- can Block.

### Hammer
Keep:
- STR quality,
- Damage 4,
- Speed -1,
- Impact 2,
- can Block.

### Bow
Keep the Bow. Do **not** invent a replacement perk in Phase 2.1.

Its current identity becomes:
- DEX quality,
- Damage 3,
- Speed +1,
- ammo-dependent,
- cannot Block,
- Impact 0.

The Bow should be usable in ordinary combat regardless of former NEAR/FAR state.

### Bare Hands
Bare Hands remains the universal offensive fallback:
- always legal in combat,
- Damage 1,
- Speed 0,
- STR quality,
- ordinary Defense bypass preserved from Phase 1,
- no DUR/ammo.

---

# 2.1B — Enemy Move Pools

Replace separate NEAR/FAR move-selection tables with one unified move pool per enemy.

Preserve authored move identity where useful.

Initial unified weights:

### Slime
Use its existing ordinary attack mix:
- Slime Bash 70%
- Body Slam 30%

### Cave Beetle
Use:
- Mandible Snap 65%
- Shell Ram 35%

### Venom Spider
Use:
- Venom Bite 70%
- Lunging Bite 30%

### Pit Hound
Use:
- Hound Bite 50%
- Hound Maul 30%
- Pounce 20%

Pounce remains a distinct attack, but no longer changes range.

### Frenzied Adventurer
Use:
- Wild Slash 50%
- Reckless Swing 25%
- Rock Throw 25%

Rock Throw remains a distinct attack, but no longer requires FAR.

### Ruin Brute
Use:
- Basic Swing 70%
- Heavy Swing 30%

The old `Close to NEAR` move should not appear in new combat.

Legacy saves already committed to `Close to NEAR` must resume harmlessly without duplicate RNG, damage, Poison, wear, or softlock.

---

# 2.1C — Force

Remove Force's range-push behavior.

Phase 5 design identity becomes:

> **Force — 0 Damage, 3 Impact.**

Keep:
- automatic hit under the approved Phase 5 direction when that overhaul is implemented,
- Stability / Stagger / Knockdown interaction,
- authored noncombat obstacle utility.

Remove:
- NEAR -> FAR push,
- any range legality,
- range-dependent follow-up behavior.

For current pre-Phase-5 compatibility, do not invent unrelated magic balance changes.

---

# 2.1D — Stagger

Stagger remains:

> **STAGGERED — the enemy's currently committed offensive action is cancelled. Press the Advantage.**

Rules:
- current committed enemy offense is cancelled,
- player receives exactly one Press the Advantage offensive action,
- that action cannot generate another immediate action,
- after it resolves, combat advances normally.

Do not add a separate Continue / Round Outcome screen.

---

# 2.1E — Knockdown Redesign

Remove the current rule where Knockdown causes the target to lose its next offensive action / Attack phase.

New universal rule:

> **KNOCKED DOWN — the next offensive action targeting this Actor has 0% Dodge. Then Knockdown clears.**

Knockdown still includes Stagger's immediate effect when it is caused by the player's ordinary attack:
- cancel the currently committed enemy offensive action,
- grant Press the Advantage.

Then add the vulnerability:
- the next offensive action targeting the Knocked Down Actor has Dodge forced to 0%,
- after that offensive action resolves, Knockdown clears.

Do not also delete a future turn.

Do not add a separate critical-hit bonus in Phase 2.1.

## Timing examples

### Ordinary attack causes Knockdown

Hammer attacks enemy -> Knockdown:
- enemy's committed attack is cancelled,
- player gains Press the Advantage,
- enemy is Knocked Down,
- the Advantage offensive action targets a Knocked Down enemy,
- enemy Dodge is 0% for that action,
- Knockdown clears after that action resolves.

### Advantage attack causes Knockdown

Sword causes Stagger -> Press Advantage -> Hammer causes Knockdown:
- Hammer itself resolves normally,
- no second Advantage is granted,
- Knockdown remains on the enemy,
- the next offensive action targeting the enemy has 0% Dodge,
- then Knockdown clears.

### Counterattack causes Knockdown

Enemy attack resolves -> player survives -> Hammer Counterattack causes Knockdown:
- no immediate extra action is granted,
- Knockdown remains,
- player's next offensive action against that enemy gets 0% enemy Dodge,
- then Knockdown clears.

---

# 2.1F — Player Knockdown Symmetry

Apply the same Knockdown rule to the player.

If an enemy attack Knocks the player Down:
- the player does **not** lose their next attack phase,
- the player may still act normally on their turn,
- the next enemy offensive action targeting the player has player Dodge forced to 0%,
- Knockdown clears after that offensive action resolves.

During that incoming action, the player may still:
- Block,
- Counterattack,
- use any other legal non-Dodge defense.

Dodge should either be unavailable or visibly shown as 0%; prefer whichever is cleaner and consistent with the existing decision UI.

The key rule is that Knockdown removes Dodge for one incoming offensive action. It does not remove the player's turn.

---

# 2.1G — Press the Advantage

Press the Advantage grants:

> **One immediate enemy-targeted offensive action.**

Legal Phase 2.1 categories:
- Sword / Hammer / Bow,
- Bare Hands,
- offensive learned spell,
- offensive Scroll.

Not legal:
- Heal,
- Barrier,
- Teleport,
- Unlock,
- potions,
- Antidotes,
- equipment swap,
- movement,
- inventory management.

The offensive action uses its normal costs and resource consumption.

An action taken during Press the Advantage:
- may deal damage,
- may apply Impact,
- may Stagger,
- may Knockdown,
- may kill,
- may consume ammo / DUR / Essence / Scroll,
- but **cannot grant another Press the Advantage or other immediate action**.

If no legal offensive action exists for some future authored reason, the opportunity may expire safely; however, after range removal Bare Hands should normally prevent this state.

---

# 2.1H — Counterattack

Counterattack should use the same enemy-targeted offensive-action pool as Press the Advantage.

Legal Counterattack actions:
- Sword / Hammer / Bow,
- Bare Hands,
- offensive learned spell,
- offensive Scroll.

Not legal:
- Heal,
- Barrier,
- Teleport,
- Unlock,
- potions,
- Antidotes,
- movement,
- equipment swap,
- inventory actions.

## Timing rule — LOCKED

> **The original attacker resolves first.**

Sequence:
1. enemy commits offensive action,
2. player chooses Counterattack,
3. enemy offensive action resolves completely first,
4. apply damage, status, Knockdown, movement legacy compatibility, etc.,
5. if player is dead, Counterattack does not happen,
6. if player survives, player chooses/resolves one legal offensive Counterattack,
7. combat proceeds normally.

Example:

> Enemy attacks -> player chooses Fireball Counterattack -> enemy hit lands first -> player survives -> Fireball resolves -> Fireball kills enemy.

The Counterattack offensive action may Stagger/Knockdown normally, but cannot generate another immediate action.

No recursive Counterattack chain.

---

# 2.1I — Reaction / Immediate-Action Safety

Press the Advantage and Counterattack are different triggers but share the same offensive-action eligibility rules.

### Trigger difference

**Press the Advantage**
- player caused Stagger/Knockdown before the enemy's committed offense resolved,
- committed enemy offense is cancelled,
- player receives one immediate offensive action.

**Counterattack**
- player intentionally accepts the incoming offense,
- enemy resolves first,
- if player survives, player receives one immediate offensive action.

### Shared safety rule

> **An immediate offensive action can never generate another immediate offensive action.**

This prevents:
- Stagger -> Advantage -> Force -> Advantage -> ...
- Counterattack -> Stagger -> free action,
- reaction loops involving Scrolls/spells.

Knockdown vulnerability may still persist to the next ordinary offensive action according to Section 2.1E.

---

# 2.1J — UI Changes

Normal Mode:
- remove combat Range display,
- remove Move to NEAR/FAR controls,
- remove range text from weapon/spell legality,
- keep Damage / Impact / Speed / Dodge information,
- show Knockdown clearly as one-action Dodge vulnerability,
- keep formulas/roll machinery in Dev Mode.

Suggested Knockdown text:

> **KNOCKED DOWN — Dodge is 0% against the next offensive action.**

Suggested Stagger text:

> **STAGGERED — [move] cancelled. Press the Advantage.**

No standalone confirmation screen between result and next meaningful action.

Counterattack UI should make timing understandable:

> **Counterattack — Take the incoming attack first. If you survive, choose one offensive response.**

Do not pre-resolve a specific retaliation if the new design instead presents the offensive choice after incoming resolution.

---

# 2.1K — Save Compatibility

Preserve deterministic seeded RNG and exact save/reload continuation.

Do not destructively rewrite old saves merely to remove range.

Requirements:
- legacy `range` fields may remain tolerated but ignored by new combat logic,
- old committed `Close to NEAR` resumes harmlessly,
- old Pounce / Rock Throw commitments remain valid attacks,
- old Advantage saves remain one Advantage action,
- old Knockdown saves must migrate/resume safely into the new vulnerability semantics without duplicate actions,
- no save-load path may double-resolve damage, Poison, wear, rewards, or RNG,
- no save-version bump unless truly required.

If a legacy state cannot map cleanly, document the exact compatibility decision instead of inventing hidden behavior.

---

# 2.1L — Explicit Non-Goals

Do not rebalance in Phase 2.1:
- enemy HP,
- enemy Defense,
- player weapon Damage,
- Dodge percentage bands,
- durability maximums,
- economy,
- room weights,
- loot,
- Sanity,
- Essence economy,
- spell damage/costs beyond what is required for compatibility,
- Bow replacement mechanics.

Do not implement Phase 3, 4, or 5 systems in this pass.

---

# Required Tests Before Handoff

Add/update deterministic tests for at least:

## Range removal
- new combat has no meaningful NEAR/FAR state dependency,
- Sword/Hammer/Bow/Bare Hands legality is range-independent,
- no Move Near/Far action appears,
- enemy move selection uses unified pools,
- Pounce and Rock Throw still function as attacks,
- Close to NEAR is absent from new combats,
- old saved Close-to-NEAR commitment resumes safely,
- normal UI does not show Range.

## Knockdown
- normal Knockdown cancels current committed enemy offense,
- Knockdown grants Press the Advantage,
- target Dodge is 0% for exactly the next offensive action,
- Knockdown clears after that action resolves,
- Advantage-caused Knockdown persists to the next offensive action,
- Counterattack-caused Knockdown persists to the next offensive action,
- player Knockdown does not remove player's next attack,
- player Knockdown forces 0% Dodge on next incoming offensive action,
- player may still Block/Counterattack while Knocked Down,
- save/reload preserves Knockdown vulnerability exactly.

## Press the Advantage
- weapon attack legal,
- Bare Hands legal,
- offensive learned spell legal,
- offensive Scroll legal,
- supportive/nonoffensive spell unavailable,
- immediate action cannot generate another immediate action,
- costs/ammo/DUR/Scroll consumption occur once.

## Counterattack
- enemy attack resolves first,
- lethal incoming hit prevents retaliation,
- surviving player receives exactly one offensive response,
- weapon / Bare Hands / offensive spell / offensive Scroll legal,
- supportive/nonoffensive actions unavailable,
- Counterattack action cannot create another immediate action,
- Counterattack kill rewards resolve once,
- exact save/load continuation does not replay incoming damage or retaliation.

## Regression
- Poison still ticks exactly once per completed round,
- Block wear remains post-quality raw-damage based,
- DEX/Speed Dodge remains intact,
- Glancing/Normal/Critical remains intact,
- Bare Hands retains Defense bypass,
- Heart-loss/Auron logic from Phase 1 remains intact,
- Dev Mode continues to expose formulas while Normal Mode exposes only decisions,
- no empty Continue / Round Outcome / cancelled-round screen returns.

Run:
1. focused Phase 2 / 2.1 tests,
2. browser checks,
3. production campaign,
4. `git diff --check`,
5. full `npm test`.

---

# Handoff Requirements

When complete, report:
- exact files changed,
- save-compatibility decisions,
- any ambiguity encountered,
- targeted test totals,
- browser test totals,
- campaign result,
- full `npm test` result,
- any remaining range-related code retained only for legacy compatibility,
- concise list of player-visible behavior changes.

Do **not** commit or push unless explicitly requested.

After implementation, stop for maintainer review and human playtest before Phase 3.
