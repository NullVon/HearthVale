# HearthVale Reference Study

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


**Started:** 2026-09-27
**Purpose:** Capture design observations from reference games that may inform HearthVale's UI, combat, dungeon flow, economy, and overall player experience.

## Working Rule
- This document records **reference-game observations**, not approved HearthVale changes.
- Each note should separate what the reference game does, what the maintainer likes or dislikes, and the possible lesson for HearthVale.
- Final design decisions remain deferred until the reference pass and HearthVale playtest findings are reviewed together.
- **This reference study records design research; its proposals require review before implementation.**

## Primary Reference Pool
1. Path of Adventure
2. Grim Quest
3. Shattered Pixel Dungeon

## Secondary Comparison Pool
- A Dark Room
- Dicey Dungeons
- Into the Breach
- D&D / d20-style combat

---

# Path of Adventure

## Overall First Impression
Path of Adventure immediately demonstrates several ideas the maintainer originally wanted HearthVale to embody: compact mobile UI, fast combat resolution, equipment-as-actions, clear state communication, and dungeon-like excursions that do not interrupt the broader adventure flow.

## UI / Screen Density

### What Path of Adventure does
- Core gameplay fits on a single portrait phone screen.
- Little to no scrolling is required during normal play.
- Uses icons heavily for HP, defense, attack, speed, treasure/currency, and progress.
- Keeps explanatory text compact and situational rather than repeatedly exposing underlying calculations.
- Navigation is simple and persistent.

### What the maintainer likes
- "Everything is in a single screen, no need for scrolling."
- The interface avoids HearthVale's current problem of too much text.
- Icons communicate common information quickly.
- the maintainer still prefers HearthVale's existing bottom navigation placement.

### Possible HearthVale lesson
- Keep the bottom Character / Inventory / Menu navigation.
- Compress the gameplay HUD and replace repeated prose with icons or short labels where practical.
- Aim for no scrolling during the primary combat loop.
- Keep complex LWE mechanics internal unless the player actually needs to see them.

## Menus / Inventory

### What Path of Adventure does
- Inventory is clean and compact.
- Equipment and items are immediately readable.
- Usable items can be activated directly from the inventory.
- Equipment can be dropped.
- Item effects are described clearly and close to the action button.

### What the maintainer likes
- Clean inventory layout.
- Direct item use.
- Easy-to-read equipment state.

### What HearthVale should not copy literally
- HearthVale does not need a general "Drop equipment" mechanic.
- HearthVale's intended equipment-loss model is replacement and breakage.

### Possible HearthVale lesson
- Keep inventory interaction direct.
- Let the player understand what an item does and use it without unnecessary submenus.

## Equipment and Durability

### What Path of Adventure does
- Equipment itself is the action button in combat.
- Weapon buttons show relevant damage/defense values directly.
- Equipment has durability/condition, but exact durability numbers are hidden.
- Condition is communicated visually through text color/state changes: normal, orange/worn, red/critical.

### What the maintainer likes
- Pressing the equipment button directly to use that equipment.
- No duplicate "Attack with X" button below an equipment display.
- Durability is understandable without exposing exact numbers.

### Possible HearthVale lesson
- Make equipped weapon tiles/buttons directly perform the attack.
- Consider keeping exact DUR internally while exposing condition bands visually.
- Potential player-facing states: Good, Worn, Critical.
- This could reduce HUD clutter while preserving HearthVale's durability system.

## Combat Flow

### What Path of Adventure does
- No separate result screen after every action.
- After an attack, the result appears inline.
- The game immediately advances to the next meaningful choice.
- After defending, the result appears and the next attack choice is presented.
- When the encounter ends, a short update appears and exploration resumes.
- Combat remains one continuous interaction rather than a chain of separate phase screens.

### What the maintainer likes
- "No extra text, no result page."
- Encounter resolution flows immediately back into exploration.
- Blocking resolves and then the game asks for the next attack.
- No non-decision screens.

### Possible HearthVale lesson
- Remove the standalone Round Outcome screen.
- Fold result text into the active combat screen.
- Eliminate phase screens that contain no player choice.
- Target loop: Attack -> result -> defense/reaction -> result -> next attack.
- On victory: final result -> exploration resumes.

## Attack Resolution

### What Path of Adventure does
- Correction from further play: attacks are **not** guaranteed to connect.
- Hit chance is presented directly as a percentage on the attack option rather than exposing a d20-style roll.
- Example observed: Bare Hands displayed **75% hit chance** against a King Cobra.
- The player sees the practical probability instead of the underlying roll math.

### What the maintainer likes
- The system is easy to read at a glance.
- Hit/miss uncertainty exists, but it is communicated directly and compactly.
- The interface does not expose unnecessary calculation steps.

### Possible HearthVale lesson
- Strong support for revisiting HearthVale's current binary d20 + modifier vs DC presentation.
- Candidate direction already discussed: keep a small outcome roll for hit quality, such as glancing / normal / critical, while handling dodge separately through a clear percentage system.
- The exact die size is not important yet; d10 or d20 could both work.
- This remains a design candidate, not an approved change.

## Defense / Reaction Phase

### What Path of Adventure does
- Enemy attack phase presents clear defensive choices.
- Example options: block with equipment, or take the hit and rely on dodge chance.
- Dodge chance is shown as a percentage.
- Defense values are immediately visible on the buttons.

### What the maintainer likes
- The defense screen is compact and readable.
- The decision itself is obvious.

### HearthVale extension the maintainer proposed
- Use a **Defense grid**.
- Add a **Counterattack grid** below it.
- Defensive choices could include Block with equipment or Dodge.
- Offensive reaction choices could include Counterattack with equipment.
- Counterattack would trade defense/safety for offense.

### Possible HearthVale lesson
- Turn the enemy phase into a meaningful reaction choice.
- DEX could determine dodge percentage.
- This would preserve DEX as useful without relying on d20 hit checks for every attack.

## Bare Hands / Fallback Attack

### What Path of Adventure does
- Provides **Bare hands** as a valid attack option even when weapons are available.

### Why this matters for HearthVale
- HearthVale's playtest exposed a critical no-equipment combat deadlock.
- Path of Adventure provides direct evidence for a simple fallback solution.

### Possible HearthVale lesson
- Add an always-available unarmed attack.
- Unarmed should be weaker than real weapons but guarantee the player can still participate in combat.
- Exact damage/rules remain to be designed.

## Dungeon / Ruin Structure

### What Path of Adventure does
- The main adventure is presented as traveling along a path.
- Optional ruins appear as side excursions.
- Ruins have rumors or implied rewards deeper inside.
- Entering a ruin leads through multiple encounter/event screens.
- The player can leave the ruin and return to the normal adventure.

### What the maintainer likes
- Dungeon crawling feels optional and integrated into the broader journey.
- The game does not constantly foreground explicit floor/room mechanics.
- "Going deeper" is conveyed through play rather than heavy structural text.

### Possible HearthVale lesson
- HearthVale can keep floors/rooms internally without constantly presenting them as mechanical bookkeeping.
- The Pit could feel more like an expedition into progressively deeper danger.
- Preserve the ability to leave and return to surface play.
- Internal floor numbering can remain mechanically important even if player-facing presentation is lighter.

## Avoiding Combat

### What Path of Adventure does
- Some encounters can be avoided by paying treasure.

### HearthVale analogue proposed by the maintainer
- Spend **Essence** to avoid a monster encounter.

### Possible HearthVale lesson
- Essence may have a valuable risk-management use beyond existing mechanics.
- Paying Essence to bypass combat could reduce forced-fight fatigue, preserve durability/HP, and create a meaningful tradeoff.
- Needs review against HearthVale's current Essence economy before approval.

## Character / Stat Presentation

### What Path of Adventure does
- Character screen explains each stat in plain language.
- Stats are compact: Life, Defense, Attack, Speed, Treasure, Progress.
- Each entry tells the player what the stat actually affects.

### Possible HearthVale lesson
- HearthVale can keep deeper Actor stats internally while improving player-facing explanation.
- Instead of exposing every calculation, show concise descriptions of what STR, DEX, CON, INT, WIS, and CHA actually do.
- Particularly relevant for DEX if it becomes tied to dodge chance.

## Current Path of Adventure Takeaways

### Strongest transferable ideas
1. One-screen mobile-first gameplay.
2. Heavy use of icons / compact status display.
3. Equipment buttons are the actions themselves.
4. No standalone result screens.
5. Combat flows continuously between meaningful decisions.
6. Normal attacks connect.
7. Dodge presented as a percentage rather than a roll.
8. Defense is an active player choice.
9. Hidden exact durability with readable condition states.
10. Always-available Bare Hands attack.
11. Optional dungeon/ruin excursions integrated into broader adventure.
12. Possible Essence cost to avoid combat.

### Keep HearthVale's identity
- Keep HearthVale's bottom navigation.
- Keep HearthVale's Actor/world simulation depth.
- Keep HearthVale's own equipment-break/replacement rules.
- Do not copy Path of Adventure's systems wholesale.
- Use the reference to identify interaction patterns and presentation choices that make play feel cleaner and faster.

---

# Grim Quest

## What the maintainer liked most
Grim Quest is useful less as a direct combat template and more as a reference for **atmosphere, scene setting, hometown structure, shops/tavern, Sanity, and supporting systems**.

Current framing:
- Path of Adventure may help show how HearthVale should **feel to operate**.
- Grim Quest may help show how HearthVale can become **deeper without making the basic interaction loop complicated**.
- This comparison is still provisional; the maintainer will decide the final role of each reference later.

## Combat
- Grim Quest can provide selective inspiration, but HearthVale does **not** need a player skill/special-move layer.
- HearthVale already gives enemies their own special attacks/moves, so that part of Grim Quest is conceptually already present.
- Do not add Advanced Combat or extra action-economy complexity merely because Grim Quest supports it.
- Keep the focus on shorter, clearer fights and meaningful enemy identity.

## Sanity — Strong Adoption Direction
This is the most important Grim Quest system to incorporate into HearthVale.

HearthVale should make declining Sanity something the player **feels before reaching zero**.

Possible effects as Sanity falls:
- hallucinations or false perceptions,
- altered or unsettling scene text,
- temporary stat debuffs,
- incomplete or distorted information,
- misleading descriptions,
- unusual encounter/event presentation,
- other escalating psychological effects.

The exact thresholds and effects still need design work.

**HearthVale rule remains: 0 Sanity = death.**

The goal is not to copy Grim Quest's exact thresholds, but to use it as inspiration for a graded decline:
**stable -> disturbed -> impaired -> severe effects -> death at 0**.

## Heart Loss / Expedition Safety Candidate
Current HearthVale playtesting exposed an unfair failure loop:
- Actor exhausts equipment,
- loses a Heart,
- restarts at the floor start,
- tries to flee,
- gets ambushed,
- can lose another Heart before reaching safety.

Leading candidate:
- **Losing a Heart ends the current expedition and returns the Actor to the Pit entrance / safe expedition boundary.**

Reasoning:
- Heart loss is already a major punishment.
- The game should not immediately force a weakened or weaponless Actor through another escape gauntlet.
- This prevents repeated unavoidable Heart losses caused by depleted equipment.

This is a candidate until formally approved.

## Retreat Philosophy
Useful principle from Grim Quest:

> **Retreat costs progress, not necessarily another fight.**

HearthVale should **not** save individual enemies to specific rooms/floors. The Pit remains procedural.

The lesson is instead that retreat can meaningfully cost expedition progress without automatically generating another combat punishment on the way out.

## Noncombat Rooms
- the maintainer agrees HearthVale eventually needs more **meaningful noncombat rooms/outcomes**.
- These should be more than empty filler.
- This is a **later design issue**, not an immediate Vertical Slice priority.

## Economy / Replacement Gear
Confirmed direction from the comparison:

> **If HearthVale consumes equipment substantially faster, HearthVale needs a substantially stronger replacement economy.**

HearthVale should eventually provide more reliable **sellable dungeon drops / valuables / materials** so combat and durability consumption feed back into enough Gold to replace equipment.

This does **not** mean removing durability. It means making the economy capable of supporting the durability system.

## Atmosphere / Hometown
Useful Grim Quest inspiration includes:
- strong scene setting,
- a distinct hometown/home-base feeling,
- shops and tavern-like social/service spaces,
- returning from danger to a place that feels meaningfully different from the dungeon.

HearthVale already has the structural pieces for this. Grim Quest is useful as inspiration for making those spaces feel more atmospheric and cohesive rather than adding more systems for their own sake.

## Grim Quest Spell Inspiration
HearthVale should not copy Grim Quest's full spell list, especially spells built for multi-enemy combat. Instead, use selected examples to define what we want HearthVale spells to **do**.

Relevant examples:
- **Slow Time** — manipulates evasion / enemy accuracy-related pressure rather than simply dealing damage.
- **Nature's Embrace** — recovery over time and possible Sanity support; shows that magic can sustain the Actor instead of only attacking.
- **Absorb Pain** — temporarily changes how incoming damage works; a strong example of a spell that alters combat rules.
- **Soul Steal** — combines offense and self-recovery, giving one cast a distinct tactical identity.
- **Sunburst** — damage plus a magical-defense debuff; useful as an example of a spell that sets up later actions.
- **Fireball** — conventional damage spell; useful mainly as a baseline against which more interesting spells can be compared.

Not useful for HearthVale's current structure:
- **Glacial Spear's multi-target function**, because HearthVale currently uses one-enemy-at-a-time combat.

### Spell-overhaul lesson
Use Grim Quest and Path of Adventure together to favor spells that:
- solve a particular problem,
- manipulate a combat axis,
- create setup/payoff,
- alter risk,
- support healing/Sanity/escape/exploration,
- or bypass one defense while remaining vulnerable to another.

Avoid filling HearthVale with spells that differ only by damage number or visual element.

## Sanity Manifestations — Expanded Direction
Preferred framing:

> **lower Sanity -> hallucinations + information distortion + debuffs + occasional manifestations/events that may not occur to a sane Actor**

This means Sanity can change not only the Actor's numbers, but also what the player experiences:
- false or distorted room descriptions,
- phantom threats,
- impossible or duplicated details,
- unsettling scene changes,
- temporary manifestations,
- special events that only become eligible below certain Sanity levels.

These should feel like consequences of the Actor's mental state without requiring the underlying LWE world state itself to become incoherent.

## Future / Post-VS Pile
These are useful finished-product directions, but they are **not required for the current Vertical Slice**.

### Dynamic Hometown / Town Events
- Returning from the Pit should eventually reveal that HearthVale continued to live while the player was gone.
- Possible examples: changed shop circumstances, visitors, rumors, temporary service changes, Actor problems, local events, shortages, celebrations, or other consequences of world state.
- This directly supports the original reason for creating the Living World Engine: the world should continue to feel alive rather than resetting into a static hub menu.
- **Implementation is intentionally TBD.** Preserve the design goal now; solve the architecture later.

### Meaningful Noncombat Tradeoffs
Future dungeon rooms/events can offer choices such as:
- loot or valuables at a Sanity cost,
- spending an item/resource to help someone,
- risking danger for Essence/materials,
- taking a safer option with less reward,
- walking away.

This is similar to useful tradeoff design seen in both Grim Quest and Path of Adventure.
It is **not a VS priority**.

### Broader Surface Economy
Long-term surface play should offer multiple ways to convert dungeon activity into progress rather than depending only on random treasure.
Possible future forms include:
- material requests,
- rotating desired goods,
- jobs or commissions,
- changing shop demand,
- other world-state-driven opportunities.

Do not copy Grim Quest's bounty/city-upgrade systems literally. The useful principle is a living surface economy with more than one dependable feedback loop.
This is **not a VS priority**.

### Character Backgrounds
the maintainer likes the idea of character backgrounds.

Potential HearthVale use:
- generated Actors may have a background/history that meaningfully changes how they play or how the world reacts to them,
- backgrounds should complement existing traits, attributes, relationships, and succession rather than becoming a redundant class system,
- exact implementation is future design work.

## Status
- Sanity expansion: **strong adoption direction**.
- Heart-loss return to Pit entrance: **leading candidate**.
- Stronger sellable-drop economy: **strong direction**.
- Meaningful noncombat rooms: **later issue**.
- Grim Quest spell functions: **reference material for the spell overhaul**.
- No game-system change is approved solely by being listed here.

---

# Shattered Pixel Dungeon

## Reference Role
Shattered Pixel Dungeon is most useful to HearthVale as a **mechanics, procedural-generation, invisible-fairness, and source-code reference**.

Because HearthVale is text-based, the goal is not to copy Shattered's tile movement, spatial combat, or graphical presentation. The useful material is the machinery underneath the experience: how Shattered protects the player from meaningless RNG, distributes resources, gives enemies mechanical identity, teaches systems, and preserves recovery paths.

## Combat / DEX
Shattered independently reinforces the emerging HearthVale DEX direction:
- attacker capability is compared against defender evasion rather than using an arbitrary visible d20 DC,
- evasion and damage reduction are separate concepts,
- some enemies are defined by being unusually evasive rather than simply having more HP,
- surprise or special conditions can override ordinary accuracy rules.

HearthVale should **not copy Shattered's exact formula**. The simpler stepped HearthVale candidate — roughly **0 / 25 / 50 / 75% Dodge based on relative DEX** — remains easier to communicate in a text-based game.

Useful enemy-design lesson:
- one strong mechanical identity can be enough,
- a fast enemy can be defined by Dodge,
- an armored enemy by Defense,
- a Spider by Poison,
- a Wolf by speed/mobility,
- ordinary enemies do not need giant movesets.

Shattered also reinforces the need for an always-available fallback attack. HearthVale should never reach a combat state where having no equipment means having no legal action.

## Controlled Randomness — Major Finding
The strongest Shattered lesson is that good procedural randomness is often **quietly controlled**.

Shattered uses mechanisms such as:
- deck-like item generation,
- weighted queues,
- reduced repetition after an outcome is selected,
- region-level guarantees,
- special-room rotation,
- minimum content budgets,
- limited-drop systems that prevent both droughts and excessive abundance.

The result still feels random to the player, but the game does not allow every outcome to be an isolated coin flip.

This is directly relevant to the HearthVale playtest sequence:
**combat -> combat -> multiple empty rooms -> multiple treasure rooms**.

### HearthVale direction
The Pit should eventually have a **controlled-randomness layer** that knows:
- what room families appeared recently,
- what the floor/expedition still owes the player,
- whether the player has received enough economic value to remain viable,
- whether a necessary counter/cure should become available,
- which room families have been neglected.

Randomness can still determine the exact encounter, treasure, hazard, or event inside those constraints.

Preferred principle:

> **Randomize variety and abundance, not basic viability.**

## Guaranteed Viability / Invisible Fairness
Shattered quietly guarantees important progression resources over a region instead of hoping pure RNG eventually produces them.

For HearthVale, the transferable principle is:
- replacement opportunities should exist,
- enough sellable value should appear over time,
- common hazards should have reasonable access to counters,
- healing/cure opportunities should not be completely hostage to bad luck,
- the player should always retain some meaningful recovery path.

This does **not** mean making the game easy or removing scarcity. It means avoiding mathematically valid but functionally miserable states.

## Heart Loss / Safe Recovery
Shattered deliberately protects important entrance/recovery boundaries from unfair enemy placement.

This strengthens the current HearthVale candidate:
- **losing a Heart ends the current expedition and returns the Actor to the Pit entrance / safe boundary**.

Heart loss already represents failure and lost progress. The player should not immediately be forced through another random combat gauntlet while weakened, poisoned, or unequipped.

## Status Effects / Text UI
Shattered uses compact status indicators with detailed information available on demand.

For text-based HearthVale, the equivalent should be concise status presentation such as:
- **POISONED (4)**
- **STAGGERED**
- **BURNING (2)**

with tap/click/selection revealing the full description, duration, trigger condition, and cure information.

This supports the broader UI principle learned from Path of Adventure:
**short readable state first; explanation on demand**.

## Problems Should Have Counters
Several Shattered special rooms generate a hazard and deliberately ensure that an appropriate counter-item is available somewhere relevant on the floor.

Transferable HearthVale rule:

> **If the game creates a problem that requires a specific kind of answer, the generation system should make sure a reasonable answer exists.**

Possible future examples:
- poison-heavy content -> antidote/cleanse opportunity,
- magical lock -> Unlock opportunity,
- special environmental hazard -> compatible counter somewhere relevant.

The player can still misuse, sell, ignore, or fail to recognize the solution. The game simply guarantees that the situation was fair.

## Shops / Replacement Economy
Shattered mixes reliable essentials with randomized interesting stock.

This is highly relevant to HearthVale because durability makes replacement equipment part of basic viability.

Potential HearthVale principle:
- basic replacement gear should be predictably obtainable,
- randomization should affect better, rarer, enchanted, or unusual equipment,
- common cures or baseline recovery options should be reliably accessible if their associated threats are common.

Prices can still create pressure. The shop simply should not randomly fail to offer a way back into play.

## Enemy Drops / Economy
Shattered controls loot in both directions:
- bad-luck protection can prevent long droughts,
- limited-drop logic can prevent excessive farming/abundance.

For HearthVale, this supports the existing direction:
- more enemies/materials should produce **sellable value**,
- durability consumption must be matched by a viable replacement economy,
- drop rates may eventually react to recent reward history rather than remaining permanently independent rolls.

Exact implementation is still open.

## Risk / Reward Rooms — Future
Shattered's special rooms often make unusually dangerous situations pay unusually well.

Useful future HearthVale principle:

> **Unusual risk should offer unusual reward.**

This aligns with tradeoff design already liked in Path of Adventure and Grim Quest.

Not a current VS priority beyond documenting the principle.

## Spell-Overhaul Inspiration
Selected Shattered magic reinforces the same spell philosophy already emerging from Path of Adventure and Grim Quest:

- **Blast Wave** — movement/knockback/control is its identity, not raw damage.
- **Frost** — damage/control plus a logically related environmental counter.
- **Prismatic Light** — attack + blindness + revealing hidden information/light.
- **Living Earth** — defense accumulation leading to a later payoff.
- **Corruption** — becomes more effective after the target has been weakened; strong setup/payoff design.
- **Transfusion** — effect changes meaningfully depending on target; offense/support/risk are linked.
- **Regrowth** — changes the environment and creates utility/resources rather than existing only as an attack.

### HearthVale relevance
- **Force** could become a true movement/range/Stagger-control spell rather than simply “Impact +3.”
- spells can interact with combat and exploration through the same theme,
- some spells should create setup/payoff,
- some should manipulate rules rather than numbers,
- avoid adding spells that are only elemental variants of damage.

Do not import Shattered's large wand/class/build system.

## Floor Personality — Future
Shattered gives some floors broad generation “feelings” such as dark, large, trap-heavy, secret-heavy, watery, or overgrown.

Possible finished-product HearthVale equivalent:
- flooded stretch,
- fungal growth,
- unstable stone,
- unnatural darkness,
- strange magical influence,
- other Pit conditions that alter room/event eligibility.

This can give a text-based floor personality through scene descriptions and generation rules without requiring handcrafted maps.

**Future pile; not VS priority.**

## Teaching Through Friction
Shattered sometimes surfaces guidance after the player repeatedly experiences a mechanic rather than explaining every rule up front.

Useful HearthVale UX principle:
- first repeated Dodge problem -> explain DEX mismatch,
- first Poison -> explain status/cure,
- first weapon break -> clearly surface Bare Hands and replacement options,
- teach the rule when the player has a reason to care.

This can reduce tutorial text while making explanations more memorable.

## Status
- Controlled randomness / invisible fairness: **major adoption direction**.
- DEX comparison principle: **supports current combat-overhaul candidate**.
- Always-available fallback attack: **required blocker fix direction**.
- Safer Heart-loss recovery: **strongly reinforced leading candidate**.
- Reliable replacement economy: **strong direction**.
- Compact status presentation: **strong UI direction**.
- Hazard-counter guarantees: **strong procedural-design principle**.
- Spell functions: **reference material for spell overhaul**.
- Risk/reward rooms and floor personality: **future / post-VS**.
- Tile movement, hunger/supply pressure, and large class/talent systems: **not HearthVale targets**.

---

# Cross-Reference Synthesis

## Emerging Roles of the Three Primary References

### Path of Adventure — Combat and UI
Primary value:
- compact one-screen interaction,
- minimal scrolling,
- equipment-as-action buttons,
- no unnecessary result screens,
- fast combat flow,
- readable hit/dodge information,
- active defense ideas,
- compact inventory/status presentation,
- small spell list with very strong mechanical identity.

Useful shorthand:

> **Path of Adventure shows us how HearthVale should feel to operate.**

### Grim Quest — Sanity, Town, Setting, and Richness
Primary value:
- Sanity as a system with consequences before zero,
- hallucinations, distortions, debuffs, and manifestations,
- atmosphere and scene setting,
- hometown structure,
- shops/tavern/home-base richness,
- future dynamic-town/world-event ideas,
- meaningful noncombat tradeoffs,
- broader surface economy,
- character backgrounds,
- deeper supporting systems without requiring the basic interaction loop to become complicated.

Useful shorthand:

> **Grim Quest shows us how HearthVale can become richer and deeper without making the basic interaction loop complicated.**

### Shattered Pixel Dungeon — Mechanics, Invisible Fairness, and Code
Primary value:
- direct open-source access to mature procedural-game logic,
- controlled randomness,
- progression/resource guarantees,
- bad-luck and over-abundance protection,
- enemy identity through concise mechanical rules,
- fair recovery boundaries,
- hazard/counter pairing,
- reliable shop essentials,
- compact status-effect communication,
- setup/payoff magic design,
- procedural floor personality.

Because HearthVale is text-based, Shattered is primarily a **systems/code reference**, not a presentation template.

Useful shorthand:

> **Shattered Pixel Dungeon shows us how much invisible structure can sit underneath randomness to keep a game fair, recoverable, and interesting.**

## What the maintainer's Summary Gets Right
Current best framing:
- **Path of Adventure: combat + UI**
- **Grim Quest: Sanity + town + setting + richness**
- **Shattered Pixel Dungeon: mechanics + invisible fairness + code**

Additional nuance:
- Path of Adventure also strongly informs the **spell-overhaul philosophy** and tradeoff design.
- Grim Quest also provides long-term inspiration for the **Living World Engine surface/world simulation**, especially the idea that the town should continue changing while the player is away.
- Shattered is especially valuable for **procedural pacing and economy safeguards**, not just combat mechanics.

## Convergent Lessons Across All Three
Three principles repeatedly emerged independently across the reference games.

### 1. Failure should hurt without creating a death spiral
- retreat can cost progress,
- Heart loss can be severe,
- equipment can break,
- mistakes should matter,
- but the player should retain a credible route back into meaningful play.

Working principle:

> **Punish mistakes, not participation.**

### 2. Important mechanics need a clear identity
- enemies should read as fast, armored, poisonous, aggressive, etc.,
- spells should solve recognizable problems,
- statuses should clearly communicate what they do,
- complexity can exist underneath without forcing the player to parse it every turn.

This is especially important for a **text-based game**.

Working principle:

> **Make every mechanic readable and purposeful.**

### 3. Preserve meaningful player choice by protecting basic viability
Randomness may determine:
- which opportunity appears,
- what exact treasure is found,
- what enemy is encountered,
- which rare option is available.

Randomness should not routinely determine:
- whether the player has any legal combat action,
- whether replacement equipment exists at all,
- whether an unavoidable hazard has any counter,
- whether the economy simply collapses,
- whether failure automatically chains into another failure.

Working principle:

> **Never let randomness remove the player's ability to make a meaningful choice.**

## Closing Design Note
The reference study is not pointing toward turning HearthVale into any of these games.

Instead, each game exposes a different weakness or opportunity in the current Vertical Slice:
- Path of Adventure reveals unnecessary interaction/UI friction.
- Grim Quest reveals how underdeveloped Sanity, atmosphere, and surface richness currently are.
- Shattered Pixel Dungeon reveals how much procedural fairness and pacing control the Pit currently lacks.

The target remains recognizably HearthVale:
- text-based,
- Actor-driven,
- succession-based,
- Living World Engine powered,
- procedural Pit exploration,
- persistent world consequences,
- HearthVale's own Essence/Strain/Scroll/Tome magic structure.

The reference games are useful because they show how to make those existing goals **clearer, fairer, richer, and more playable** rather than replacing them.

# Path of Adventure Addendum — DEX / Dodge Candidate

## Observation
- Path of Adventure uses speed differences to produce a visible hit chance.
- This suggests a cleaner role for HearthVale's DEX than the current d20 modifier approach.

## the maintainer's proposed direction
- Compare attacker DEX against defender DEX.
- Keep a buffer zone around roughly +/-2 where the defender has **0% dodge chance**.
- Once the defender meaningfully exceeds the attacker, introduce simple stepped dodge chances: **0%, 25%, 50%, 75%**, with **100%** rare or avoided for ordinary stat differences.
- Example concept: Player DEX 2 vs Ogre DEX 6 could give the Ogre a **25% dodge chance**.

## Possible system structure
- Dodge check answers: does this much-faster defender evade the attack?
- If not dodged, a separate small roll can determine hit quality: glancing, normal, or critical.
- Exact die size and thresholds remain open; d10 or d20 could both work.

## Why this is interesting for HearthVale
- Makes DEX visibly useful without making every attack depend on opaque DC math.
- Ordinary enemies inside the DEX buffer would not constantly cause whiffs.
- Fast enemies would feel meaningfully evasive.
- High-DEX Actors could be better at landing hits on evasive enemies and at Dodge defense.

## Status
- **Combat/stat-overhaul candidate only.**
- Not approved until the full reference study and HearthVale playtest findings are reviewed together.

# Spells Overhaul Study — Path of Adventure -> HearthVale

## Why this deserves its own pass
Path of Adventure is a direct inspiration source for HearthVale's magic direction. HearthVale later developed its own spell-learning, Essence, and Strain systems, so the goal is **not** to copy Path of Adventure. The useful question is why its very small spell list creates distinct tactical choices.

## Path of Adventure spell list observed in the public HTML5 build
- **Fire Spell** — creates fire; utility/environment role.
- **Sesame Spell** — opens locks.
- **Lightning Spell** — 3 attack; specifically dodge-proof, but Defense can still absorb the damage.
- **Lava Spell** — 3 direct Life damage; specifically block-proof, but it can still be dodged.
- **Jellify Spell** — temporarily reduces enemy Defense by 2.
- **Love Spell** — temporarily reduces enemy Attack by 2.
- **Slime Spell** — temporarily reduces enemy Speed by 2.

## Design pattern the maintainer likes
The spells are not just differently colored damage buttons. Each one answers a different problem:
- Lightning solves **high evasion / dodge**.
- Lava solves **high defense / blocking**.
- Jellify changes the enemy so ordinary attacks work better.
- Love reduces incoming danger.
- Slime attacks the speed/evasion axis.
- Sesame solves a noncombat obstacle.
- Fire has broader utility instead of existing only as damage.

That gives a small spell list more identity than a large list of spells that mainly differ by damage number.

## HearthVale's current VS magic economy
The current vertical-slice implementation already has a separate resource model rather than Path of Adventure's gold-casting economy:
- Spells spend **Essence**.
- Each spell has a base Essence cost.
- Current VS formula: **spell cost = base cost + max(0, Strain - INT)**.
- Every cast increases expedition **Strain by 1**.
- Higher INT therefore delays the point where accumulated Strain starts increasing spell cost.
- Essence and Strain are expedition resources rather than ordinary shop currency.

Current VS spell set:
- **Fireball** — damage.
- **Force** — Impact.
- **Heal** — self-heal.
- **Barrier** — self-defense.
- **Unlock** — exploration/lock utility.
- **Teleport** — exploration/return utility.

HearthVale also creates **Scroll** and **Tome** forms for its spells, so spell acquisition/use already has more structure than Path of Adventure's reusable-spell model.

## Important documentation discrepancy to revisit
An older HearthVale design handoff still describes the earlier locked idea of a **1 -> 2 -> 4 -> 8 -> 16... Essence doubling curve** and says there is no separate Strain meter. The actual VS code now uses the explicit Strain formula above. Treat this as a documentation/design drift item to resolve when the magic overhaul is finalized.

## Spell-overhaul direction to investigate later
- Preserve **Essence** as HearthVale's casting resource.
- Preserve **Strain** as HearthVale's own escalation/pressure mechanic unless later testing gives us a reason not to.
- Re-evaluate the exact scaling only after the combat/stat overhaul is clearer.
- Give every spell a distinct tactical or exploration identity.
- Avoid filling the spell list with redundant damage upgrades.
- Design spells around HearthVale's actual combat axes: damage, Defense, Dodge/DEX, range, Impact/Stagger, status, healing, escape, and exploration utility.
- Consider spells that deliberately bypass one defense while remaining vulnerable to another, as Path of Adventure does with Lightning vs Lava.
- Consider debuff spells that change the rules of the next few actions rather than simply causing immediate damage.
- Keep Scroll/Tome identity as a HearthVale-specific layer rather than copying Path of Adventure's acquisition model.

## Status
- **Dedicated overhaul study / reference direction.**
- No spell, cost, Essence, Strain, Scroll, or Tome rule is changed yet.
- Final decisions wait until combat, stats, and the remaining reference games are reviewed together.
