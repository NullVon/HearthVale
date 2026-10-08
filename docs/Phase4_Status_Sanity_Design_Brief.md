# HearthVale Vertical Slice — Phase 4 Statuses & Sanity Design Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Design locked after Phase 3 implementation audit; ready for focused implementation**
Purpose: define a small reusable status presentation, finalize Poison, and prove Sanity with a few strong consequences instead of a parallel subsystem.

## Phase 4 Goal

Phase 4 should make status effects and Sanity immediately readable in a text-first game without turning either system into UI clutter.

Core goals:
- statuses are compact, understandable, and reusable,
- Poison becomes fully readable and reliably curable,
- Sanity has visible consequences before reaching 0,
- low Sanity changes perception without making the interface itself deceptive,
- the VS contains enough Sanity loss and recovery to deliberately test the full 5 -> 0 range.

Principles:

> **Make every mechanic readable and purposeful.**

> **Low Sanity may make perception unreliable. It must not make the controls themselves dishonest.**
## 1. Generic Status Presentation

Build one reusable player-facing status presentation model before adding more statuses.

A status definition/display must answer:
- **Name** — what is affecting the Actor?
- **Effect** — what does it actually do?
- **Trigger/timing** — when does the effect happen?
- **Persistence** — how long does it last?
- **Removal/cure** — how does it end?

Normal Mode should stay compact. Example:

> **POISONED**

The player can open/expand details when needed:

> **POISONED**
> Lose 1 HP after each completed combat round or resolved noncombat room.
> Does not stack.
> Persists until cured or cleared by ordinary Heart loss.
> Cure: Antidote or Cleanse Tonic.

Do not build a giant generalized status simulator in this phase. Poison is the main VS proof of the reusable presentation model.

Future statuses such as Burning, Bleeding, curses, buffs, etc. should be able to use the same presentation structure later.
## 2. Poison — Locked Rules

Poison remains mechanically simple.

### Application
- Poison does **not stack**.
- If Poison is already active, a new Poison application does not increase damage or create another stack.
- **Tough Stomach** may still resist Poison according to its existing authored rule.
- A successful Phase 2.1 Dodge prevents on-hit Poison because the attack did not connect.
- Other authored Poison sources such as hazards may still apply Poison according to their own checks.

### Tick timing
Poison deals:

> **1 HP after each completed combat round or resolved noncombat room.**

A Poison tick must happen exactly once at the relevant completion boundary.

Do not tick Poison:
- on UI inspection,
- on opening menus,
- repeatedly while sitting on the same state,
- after an enemy dies before the round-end Poison boundary if the existing victory rule already ends combat immediately.

### Persistence
- No natural expiration.
- Persists until cured or cleared by ordinary Heart loss.
- **Normal successful Return does not cure Poison.**
- **Return-Encounter victory does not cure Poison.**
- **Teleport does not cure Poison.**
- Ordinary Heart-loss return clears Poison under the current Phase 1 rule.
- Final-Heart/death processing remains separate and should preserve existing semantics unless another phase explicitly changes them.

### Player-facing feedback
Every Poison tick should clearly announce:

> **POISONED — 1 HP lost.**

When Poison is applied, resisted, cured, or already active, the result should also be visible to the player.
## 3. Poison Cure Discoverability

The current VS contains Antidote and Cleanse Tonic, but Poison recovery is not discoverable enough.

### Antidote
Make **Antidote** a basic, predictably purchasable General Shop item for the VS.

Locked baseline:
- **Price: 8G**
- **General Shop stock target: 4**
- **Protected stock floor: 1**

The player should not have to rely on rare crafting knowledge simply to understand how Poison is cured.

### Cleanse Tonic
Cleanse Tonic may remain a crafted/alternate cure.

### Status details
The Poison status details should explicitly list:

> **Cure: Antidote or Cleanse Tonic.**

This lets the system teach itself without requiring outside knowledge.
## 4. Sanity Resource — Locked Baseline

The VS uses:
- **Max Sanity: 5**
- **0 Sanity = death / succession path**

Sleeping restores HP but **does not restore Sanity**.

Sanity should not behave like a second HP bar. Its main role is to change how the Actor experiences and interprets the world as their mental state declines.

Most Sanity losses in the VS should be **1 point**.

Do not casually use -2 Sanity events on a 5-point scale. Larger losses are reserved for exceptional future content.

## 5. Sanity Bands

| Sanity | State | VS behavior |
| ---: | --- | --- |
| **5** | Stable | Normal play. |
| **4** | Uneasy | Flavor only; no mechanical penalty. |
| **3** | Fraying | Flavor only; authored prose may be more uncertain or unsettling. |
| **2** | Unstable | Ordinary Event rooms use the hallucination Event pool. |
| **1** | Breaking | Sanity-2 behavior + the first eligible ordinary Combat room in the expedition becomes the manifestation. |
| **0** | Broken | Death / succession path. |

Sanity 4 and 3 are **presentation states, not new gameplay subsystems**. Do not build a global prose-rewriting/perception engine for them. Specific authored scenes may use more uncertain language when appropriate.

Do **not** apply a generic low-Sanity WIS penalty. Low Sanity should create distinct content/consequences rather than making the Actor progressively worse at resisting further Sanity loss.

### UI integrity rule
Low Sanity may affect authored prose, atmosphere, and perception framing.

Low Sanity must **not**:
- secretly swap button outcomes,
- falsely display HP/Gold/DUR,
- alter inventory labels into lies,
- record fake permanent world knowledge as fact,
- make a player-facing mechanical choice mean something other than what it says.

## 6. Sanity 2 — Hallucination Event Replacement

Do not create a separate interstitial hallucination system.

At **Sanity 2 or Sanity 1**, when the Phase 3 room deck produces an ordinary **Event** room, resolve that room from the small hallucination Event pool instead of the ordinary Event pool.

This means hallucinations:
- use the existing Event-room machinery,
- consume the Event card that was already drawn,
- do not require a second transition RNG layer,
- do not require a per-floor hallucination counter,
- do not create a separate pending-interstitial save state.

## 7. VS Hallucination Event Pool

Use exactly two authored hallucination Events for the VS.

### The Body
The Actor briefly sees a corpse they recognize — potentially even themselves — where none actually exists.

Resolution:
- **WIS / mental check, DC 11.**
- Success: recognize or endure the hallucination.
- Failure: **-1 Sanity**.

### The Wrong Reflection
The Actor sees their reflection in dark water, polished metal, glass-like stone, etc., but it moves incorrectly.

Choices:
- **Look Away** -> event ends safely.
- **Look Closer** -> **WIS / mental check, DC 14.**
  - Success: recognize the distortion.
  - Failure: **-1 Sanity**.

These two Events are enough to prove the Sanity-content relationship. Atmospheric ideas such as footsteps or familiar voices may still appear as prose, but should not become separate choice systems without meaningful consequences.

Hallucination Events are subjective experiences. They use the ordinary Event-room flow but must not be written into objective Pit history or permanent world Information as though their perceived content were fact.

## 8. Sanity 1 — Manifestation Enemy

At **Sanity 1**, Sanity-2 hallucination Event replacement remains active and the manifestation becomes a deterministic expedition consequence.

Final VS name:
- **The Hollow Double**

### Eligibility
- Only eligible at **Sanity 1**.
- The **first eligible ordinary Combat room** in that expedition becomes the manifestation.
- Does **not** replace Treasure, Resource, Hazard, Event, Empty, or Discovery rooms.
- Does **not** replace the Stratum Guardian.
- Maximum **one manifestation encounter per expedition** for the VS.

There is no additional 25% manifestation roll. Once the Actor reaches Sanity 1, the consequence should be reliable, understandable, and easy to test.

### Combat role
Locked VS baseline:
- **HP 14**
- **Defense 1**
- **STR 3**
- **DEX 3**
- stronger than ordinary Stratum 1 enemies,
- weaker than the Ruin Brute,
- roughly **5–7 successful ordinary player attacks** to defeat.

Moves:
- **Quick Strike** — Damage 3, Impact 1, Speed +1, DEX quality stat, 60%
- **Heavy Blow** — Damage 5, Impact 2, Speed -1, STR quality stat, 40%

Keep its moveset small. The creature's identity should come from what it represents, not from an oversized combat kit.

### Damage type / Sanity interaction
The manifestation deals ordinary combat HP damage in the VS.

Do **not** make its attacks routinely drain additional Sanity at Sanity 1; that would create an overly aggressive collapse spiral on a five-point meter.

### Rewards
The manifestation drops:
- no ordinary creature materials,
- no normal valuables,
- no Gold.

It grants:
- **5 XP**

Defeating it restores:

> **+1 Sanity**

This moves the Actor from Sanity 1 -> 2, removing manifestation eligibility again unless Sanity later falls back to 1.

Suggested victory feedback:

> **The Hollow Double comes apart without falling. For a moment, the Pit is quiet again.**
> **Sanity restored: +1.**
## 9. Sanity Loss Sources

The VS currently lacks enough meaningful ways to lower Sanity. Add a small, authored set rather than making Sanity loss ubiquitous.

### General rule
Most Sanity-damage events:
- use a **WIS mental/fear-resilience check** where appropriate,
- cost **1 Sanity** on failure,
- clearly explain the loss.

### VS proof sources

#### Horrific Remains
- Ordinary **Event** room content.
- **WIS / mental DC 11**.
- Failure: **-1 Sanity**.

#### Whispering Depths
- Ordinary **Hazard** room content.
- **WIS / mental DC 14**.
- Failure: **-1 Sanity**.

The VS does **not** need a special combat Fear/Sanity move solely to prove that Sanity can be lost in combat-adjacent play. Authored Events and Phase 5 Overcasting already provide meaningful Sanity pressure.

### Existing authored cases
Existing trait-specific Sanity interactions such as Pyrophobic + fire may remain.

### Phase 5 boundary
Overcasting/magic may eventually threaten Sanity, but its exact rule belongs to **Phase 5 Magic Overhaul**. Do not invent a Phase 4 magic/Sanity system that Phase 5 will immediately replace.
## 10. Sanity Recovery

### Reliable town recovery

> **The first completed ordinary Talk interaction each day while below maximum Sanity restores +1 Sanity.**

This recovery can occur only once per in-game day total, not once per NPC.

Talking remains the reliable town recovery path, but the system should reward returning to normal social life rather than repeatedly clicking Talk to fill a hidden counter.

Do not add another mandatory comfort subsystem in Phase 4 merely to increase feature count.

### Dangerous Pit recovery
Defeating the Sanity-1 manifestation restores:

> **+1 Sanity**

This creates two distinct recovery paths:
- safe/reliable social recovery in HearthVale,
- dangerous opportunistic recovery in the Pit.

### Sleeping
Sleeping:
- restores HP according to the existing day-rest rule,
- **does not restore Sanity**.

## 11. Sanity Change Feedback

Whenever Sanity changes, tell the player:
- what caused it,
- the amount changed,
- the new value/band when relevant.

Example loss:

> **Whispering Depths — WIS check failed. Sanity -1.**
> **Sanity: 2/5 — Unstable.**

Example recovery:

> **The conversation helps you feel grounded again. Sanity +1.**

The player should never need to infer a Sanity change only by noticing the HUD number moved.
## 12. Mira Day-1 Sanity Tutorial

Use Mira's existing opening/closing Day 1 guidance to foreshadow the Sanity system naturally.

Suggested dialogue direction:

> Mira: “One more thing. Don’t push yourself too far down there. If you start feeling worn down — or seeing things that aren’t there — come back up.”
> Mira: “Talk to somebody. Me, the people at the Guild, whoever. Believe it or not, having a normal conversation helps.”

Then provide an explicit mechanical tutorial:

> **SANITY — Talking with people helps you recover. Your first ordinary conversation each day restores 1 Sanity if you are below maximum. Sleeping restores HP, but does not restore Sanity.**

Place this alongside Mira's existing practical Day 1 guidance about the Shop, Guild, Town Hall, and returning to the Inn.

This is not just flavor. It teaches:
- low Sanity causes perceptual problems,
- returning to town is part of expedition survival,
- social interaction is a mechanical recovery tool,
- sleeping does not restore Sanity.
## 13. Save / State Requirements

Phase 4 must preserve deterministic seeded play and exact save/reload continuation.

Persist as needed:
- current statuses,
- Sanity,
- whether the daily Talk recovery has already been used for the current Year/Day,
- whether the manifestation has already appeared this expedition,
- any ordinary Event-room state already required by the existing room system.

Use an Actor-local Year/Day marker for daily Talk recovery rather than another hidden Talk counter. Use an expedition-local manifestation flag. Legacy talk-count data may load harmlessly but is not used by the Phase 4 recovery rule.

Loading must not:
- repeat Sanity loss,
- repeat Poison ticks,
- grant the daily Talk recovery twice,
- spawn a second manifestation because the "already appeared" flag was lost,
- record hallucination content as objective world truth.

## 14. Phase Boundaries

Do not absorb later work into Phase 4.

Defer:
- full spell/Sanity interaction -> Phase 5,
- broad town comfort activities -> post-VS or later design,
- large hallucination bestiary -> later content,
- sophisticated procedural hallucination generation -> later content,
- long-term tragedy/world-event Sanity systems -> broader LWE/HearthVale work.

Phase 4 should prove the systems with a deliberately small content set.
## 15. Phase 4 Playtest Checklist

Deliberately test the whole Sanity loop.

Verify:
- Poison applies, ticks exactly once, displays clearly, and is curable.
- Antidote is predictably available and the Poison details identify cure methods.
- Poison clears on ordinary Heart-loss return.
- Sanity 5 and 4 do not create hidden penalties.
- Sanity 4 and 3 are flavor/presentation only and do not create hidden penalties or a global prose engine.
- At Sanity 2 or 1, an ordinary Event room uses the hallucination Event pool.
- Hallucinations use the existing Event card rather than a second interstitial system.
- The Body can lower Sanity on a failed mental check.
- The Wrong Reflection can be safely ignored or deliberately risked.
- At Sanity 1, the first eligible ordinary Combat room becomes the manifestation.
- Maximum one manifestation occurs per expedition.
- The manifestation never replaces the Guardian or noncombat room families.
- Defeating the manifestation restores exactly 1 Sanity.
- The first ordinary Talk each day restores exactly 1 Sanity when below maximum; later Talks that day do not.
- Sleeping restores HP but not Sanity.
- Sanity reaching 0 follows the current death/succession path.
- Save/reload does not duplicate hallucinations, Poison ticks, Sanity changes, or manifestation eligibility.
- Normal Mode shows consequences clearly without exposing unnecessary RNG machinery.

## 16. Locked Implementation Values

The Phase 3 playtest and read-only Phase 4 implementation audit resolved the remaining tuning questions.

### Hollow Double
- Final VS name: **The Hollow Double**
- HP: **14**
- Defense: **1**
- STR: **3**
- DEX: **3**
- **Quick Strike** — Damage 3 / Impact 1 / Speed +1 / DEX quality / 60%
- **Heavy Blow** — Damage 5 / Impact 2 / Speed -1 / STR quality / 40%
- Target: **about 5–7 ordinary successful player attacks**
- First eligible ordinary Combat room actually entered at Sanity 1 becomes the manifestation with **no extra appearance roll**
- Maximum one manifestation per expedition
- Retreating after it appears still consumes that expedition's manifestation
- Never replaces a Return Encounter or the Floor 10 Guardian
- Reward: **5 XP + 1 Sanity**
- No ordinary creature materials, valuables, or Gold
- Do **not** add the Hollow Double to permanent `pit.knownEnemies`, Guild evidence, or objective world Information

### Sanity checks
- **The Body:** WIS / mental DC 11
- **The Wrong Reflection — Look Closer:** WIS / mental DC 14
- **Horrific Remains:** ordinary Event, WIS / mental DC 11
- **Whispering Depths:** ordinary Hazard, WIS / mental DC 14
- First eligible Sanity-1 Combat becomes the manifestation deterministically; no extra appearance roll

### Poison / shop
- Antidote price: **8G**
- General Shop stock target: **4**
- Protected stock floor: **1**
- Normal successful Return does **not** cure Poison
- Return-Encounter victory does **not** cure Poison
- Teleport does **not** cure Poison
- Ordinary Heart-loss return **does** clear Poison
- Antidote and Cleanse Tonic cure Poison

## 17. Implementation Audit Locks

The current Phase 3.2 tree already contains useful foundations. Phase 4 should preserve those and correct only the mismatches below.

### Daily Talk recovery
Current code still uses the old hidden counter:
- 5 ordinary Talks -> +1 Sanity
- Frail -> 4 Talks instead of 5

Replace that active mechanic with:

> **The first completed ordinary player-initiated Talk each in-game day while below maximum Sanity restores +1 Sanity.**

Implementation constraints:
- once per in-game day total, not once per NPC,
- automatic/first-meeting introductions using the existing `firstOnly` Talk path do not grant or consume the recovery,
- legacy `talkCount` save data may remain tolerated but is ignored for recovery,
- use an Actor-local Year/Day recovery marker rather than another click counter,
- remove Frail's obsolete “4 Talks instead of 5” description and do not invent a replacement Sanity perk for Frail.

### Poison persistence
Current `completeReturn()` behavior clears Poison too broadly.

Phase 4 must narrow it so Poison persists across:
- ordinary successful Return,
- Return-Encounter victory,
- Teleport.

Poison clears only through:
- Antidote,
- Cleanse Tonic,
- ordinary Heart-loss return.

Final-Heart/death processing keeps its existing separate semantics.

### Reusable status presentation
Do not build a generalized status simulator. Add a small reusable player-facing status-detail model whose fields answer:
- Name,
- Effect,
- Trigger/timing,
- Persistence,
- Removal/cure.

Poison is the proof case.

Normal compact display:
> **POISONED**

Expanded/detail copy should communicate:
> Lose 1 HP after each completed combat round or resolved noncombat room.
> Does not stack.
> Persists until cured or cleared by ordinary Heart loss.
> Cure: Antidote or Cleanse Tonic.

### Hallucination Events remain subjective
At Sanity 2 or 1, an already-drawn ordinary Event room resolves from the hallucination Event pool.

Hallucination Events:
- consume the Event card already drawn,
- use the existing Event-room action/resolution flow,
- do not add a second transition RNG layer,
- do not create a separate hallucination save/interstitial state,
- do **not** write hallucinated content into ordinary objective `pit.eventHistory`,
- do **not** create permanent world Information that later Actors or institutions can treat as fact.

The Actor may remember experiencing a hallucination. The world must not record the hallucinated content as objective truth.

### Hollow Double remains subjective
The Hollow Double is experienced by the current Actor but is not an objectively catalogued Pit species.

Its combat start must bypass permanent enemy-knowledge side effects that ordinary `startCombat()` currently performs.

At Sanity 1:
- the first eligible ordinary Combat room actually entered becomes the Hollow Double,
- set expedition-local `manifestationAppeared = true` when it appears,
- if the player Retreats, that still counts as the expedition's manifestation,
- no second manifestation that expedition,
- never replace Return Encounters or the Guardian.

### Sanity band presentation
Keep the HUD compact:
- 5/5 -> `Sanity 5/5`
- 4/5 -> `Sanity 4/5 · Uneasy`
- 3/5 -> `Sanity 3/5 · Fraying`
- 2/5 -> `Sanity 2/5 · Unstable`
- 1/5 -> `Sanity 1/5 · Breaking`

Bands are presentation/content gates only. They do not alter base stats or secretly modify unrelated checks.

Whenever Sanity changes, show:
- cause,
- amount,
- resulting value/band when relevant.

### Mira Day-1 tutorial
Extend Mira's existing closing Day-1 guidance rather than creating a separate tutorial screen.

Teach explicitly:
> **SANITY — Talking with people helps you recover. Your first ordinary conversation each day restores 1 Sanity if you are below maximum. Sleeping restores HP, but does not restore Sanity.**

### Existing foundations to preserve
Do not rebuild these:
- max Sanity 5,
- zero-Sanity death/succession handling,
- sleeping restores HP but not Sanity,
- Strong-Willed mental/fear/Sanity-pressure bonus,
- Pyrophobic authored Sanity-loss interaction,
- Poison nonstacking,
- Tough Stomach Poison resistance,
- successful Dodge preventing on-hit Poison,
- one Poison tick at the proper completed-round/resolved-noncombat boundary,
- no Poison tick after immediate enemy defeat.

With these values and audit locks, Phase 4 is ready to be converted directly into a focused implementation brief.
