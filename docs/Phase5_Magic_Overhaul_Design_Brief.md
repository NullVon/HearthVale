# Phase 5 — Magic Overhaul Design Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Design locked after simplification pass; numeric combat/economy tuning remains playtest-adjustable**

Owner: **Implementation followed by maintainer review and playtesting**

Scope: Phase 5 only. Preserve the Phase 1–4 rules already locked unless this brief explicitly supersedes an old magic behavior. Phase 2.1's no-range combat, Knockdown vulnerability, and shared immediate-offense rules are the combat foundation.

## Goal

Restore HearthVale's original Path of Adventure-inspired magic economy while fitting the newer Combat and Sanity systems.

Magic should feel powerful and reliable because its pressure comes from:
- expedition-local Essence,
- exponential learned-cast cost,
- repeated learned casting during the expedition,
- and WIS/Sanity risk from Overcast.

Do **not** expose a separate player-facing Strain resource. The implementation may track how many learned spells have been cast this expedition, but Normal Mode should present the consequence of that count — next Essence cost and Overcast risk — rather than another meter.

Core design principle:

> **Essence is common. Repeated learned casting is expensive.**

Magic should not primarily be a second weapon list. The VS should contain a few offensive spells, with more emphasis on buffs, debuffs, control, recovery, escape, and utility/world-event solutions.
## 5A — Learned Casting Economy

Every learned spell uses the same expedition-wide escalating cost. Individual learned spells do **not** have separate base Essence costs.

At the start of each expedition:
- Essence starts at **0**.
- internal **Learned Cast Count** starts at **0**.
- unused Essence is lost when the expedition ends/returns.
- Learned Cast Count resets when the expedition ends/returns.

For a learned cast, let **Learned Casts** mean the number of learned spells already cast this expedition before the current spell:

`Effective Cost Tier = max(0, Learned Casts - INT + 1)`

`Essence Cost = 2 ^ Effective Cost Tier`

This count is implementation machinery, not a normal player-facing resource.

Examples:
- INT 1: **1 → 2 → 4 → 8 → 16...**
- INT 2: **1 → 1 → 2 → 4 → 8 → 16...**
- INT 3: **1 → 1 → 1 → 2 → 4 → 8...**
- INT 4: **1 → 1 → 1 → 1 → 2 → 4...**

INT therefore answers both:
> **How efficiently can I sustain learned casting?**

and, where an authored difficult magical task requires a check:
> **How well can I perform difficult magic?**
## 5B — WIS and Overcast

After every **learned** spell cast, increment Learned Cast Count by 1.

WIS is the Actor's safe magical endurance:
- if the new Learned Cast Count **<= WIS**, the cast is mentally safe;
- if the new Learned Cast Count **> WIS**, the cast is an **Overcast**.

Overcast difficulty is based on how far the new Learned Cast Count exceeds WIS:

| Casts over WIS | WIS DC |
|---:|---:|
| +1 | 8 |
| +2 | 11 |
| +3 | 14 |
| +4 | 17 |
| +5 or more | 20 |

WIS checks use HearthVale's normal stat-check rule:

`d20 + WIS + applicable authored bonuses vs DC`

No D&D-style derived ability modifier is used.
On an Overcast:
- the spell still resolves;
- then make the WIS check;
- failure costs **1 Sanity**;
- success avoids the Sanity loss.

A failed Overcast does **not** retroactively cancel the spell.

If the failed check reduces Sanity to 0, use the Phase 4 death/succession rules after the spell has resolved.

Example, INT 2 / WIS 2:

| Cast | Cost | New Learned Cast Count | Mental result |
|---:|---:|---:|---|
| 1 | 1 | 1 | Safe |
| 2 | 1 | 2 | Safe |
| 3 | 2 | 3 | WIS DC 8 |
| 4 | 4 | 4 | WIS DC 11 |
| 5 | 8 | 5 | WIS DC 14 |
| 6 | 16 | 6 | WIS DC 17 |
| 7+ | 32+ | 7+ | WIS DC 20 cap |

Existing appropriate mental-resilience Trait bonuses, such as Strong-Willed where authored to apply, may modify the WIS check rather than creating a second special roll system.
## 5C — Reliability of Magic

Offensive spells are **automatic-hit by default**.

Do not make ordinary offensive spells:
- roll enemy Dodge,
- roll conventional attack accuracy,
- or use Glancing / Normal / Critical hit quality.

Reason: learned casting already pays through escalating Essence cost and possible Sanity loss from Overcast. A second miss layer makes magic feel unfairly weighted against the player.

Specific spells may define a different resolution rule later, but that must be an explicit authored exception.

Pure magical damage continues to ignore ordinary:
- physical Block,
- equipped physical Armor,
- Natural Armor.

Explicit magical defenses may reduce/alter magic:
- Barrier,
- Resistance,
- Magic Block,
- Runed or magic-oriented equipment/effects.

Do not introduce a universal Magic Armor bar unless later design requires one.
## 5D — Scrolls

Scrolls are one-use **Items**, not Equipment.

They live in the same Item/Bag list as HP Potions, Antidotes, valuables, and other carried items.

A Scroll:
- does **not** require the Actor to know the spell;
- costs **0 Essence**;
- does **not** increase Learned Cast Count;
- triggers **no Overcast check**;
- resolves the authored spell effect;
- is consumed immediately after successful use.

In ordinary combat, using a Scroll consumes the Actor's **normal action**.

Scrolls are not free combat actions. However, an **offensive** Scroll may spend a Phase 2.1 Press-the-Advantage or Counterattack immediate offensive action. Supportive/nonoffensive Scrolls may not.

Out of combat, a Scroll is usable only when its spell has a valid context/target.
## 5E — Tomes and Four Spell Slots

Actors have exactly **four learned spell slots** in the VS.

Do **not** introduce separate Known Spells and Prepared Spells systems.

A Tome permanently teaches its spell into one of those four slots:
- if an empty slot exists, fill it;
- if all four are occupied, prompt the player to choose a spell to replace;
- include **Cancel**;
- do not consume the Tome until learning/replacement is confirmed.

If spell replacement becomes a major playtest problem, solve it later with content such as a magic shop/relearning service rather than adding a second preparation layer now.

For Phase 5 playtesting:
> **Exactly one of the three initial character candidates begins with Fireball in Spell Slot 1.**

This guarantees the new casting loop can be tested immediately without relying on RNG.
## 5F — Spell UI and Items UI

### Spells

The Spells view uses the same interaction philosophy as Equipment:
- a **2×2 grid**,
- four visible spell slots,
- each occupied grid square is itself the cast button,
- no separate dedicated Cast button below the grid.

The spell tile should show decision-relevant information directly, including:
- spell name,
- next learned-cast Essence cost,
- concise effect summary,
- and an Overcast warning/DC when the next cast would Overcast.

Normal mode shows decisions, not hidden machinery.

### Items

Items remain a **vertical list**, for example:

> HP Potion ×2
> Antidote ×1
> Fireball Scroll ×1
> Golden Cup ×3
Each usable Item row is itself the use button.

When an Item is not usable in the current context, keep it visible but **grey it out** rather than hiding it.

Examples:
- HP Potion at full HP: greyed out.
- Antidote when not Poisoned: greyed out.
- Fireball Scroll outside a valid combat target: greyed out.
- valuables such as Golden Cup: visible but not usable as combat actions.

Pressing **HP Potion ×2** immediately uses one and updates the row to **HP Potion ×1**.

Pressing **Fireball Scroll ×1** immediately casts Fireball and removes the Scroll from Items.

There is no equip step for Scrolls and no separate Scroll interface.
## 5G — Immediate Offensive Actions

Use the Phase 2.1 rule:

> **Press the Advantage and Counterattack each grant one immediate enemy-targeted offensive action.**

Legal magic in those states:
- offensive learned spells,
- offensive Scrolls.

Not legal:
- Heal,
- Barrier,
- Teleport,
- Unlock,
- other supportive/nonoffensive magic.

Counterattack timing remains:
> **The original attacker resolves first. If the defender survives, the offensive Counterattack resolves second.**

An immediate offensive action may use normal spell effects, costs, ammo, DUR, or Scroll consumption, but it **cannot generate another immediate offensive action**.

This keeps Hammer -> Stagger -> Fireball and surviving Fireball Counterattack as valid strategies without allowing reaction loops.

## 5H — Essence Availability

The new exponential curve requires substantially more reliable Essence income than the current pre-Phase-5 60% chance of +1 Essence.

Initial Phase 5 economy direction:
- every resolved **non-empty room** grants **+1 Essence guaranteed**;
- a resolved **Resource room grants +1 additional Essence**;
- a resolved **Combat room** also has a **50% chance to grant 1–2 Arrows** as a separate ammo reward.

That is the entire baseline VS Essence-income rule. Combat's Arrow roll is separate and does not replace or multiply the guaranteed +1 Essence.

Do not add separate per-enemy Essence bonuses, Essence Caches, or special Event Essence awards in the VS unless playtesting demonstrates that this simple supply rule cannot support the casting loop.

Exact quantities remain a Phase 3/5 crossover tuning item.
Initial playtest target:

> A reasonably successful few-floor outing should commonly build roughly **10–15 Essence**, enough for several learned casts without making repeated casting cheap.

The exponential curve, not extreme resource starvation, is the main anti-spam pressure.

For example, INT 2 needs:
- 1 Essence for cast 1,
- 1 for cast 2,
- 2 for cast 3,
- 4 for cast 4,
- 8 for cast 5.

Four casts therefore cost 8 total Essence; the fifth doubles the cumulative commitment to 16.

Keep Essence expedition-local. Do not allow town stockpiling of large Essence reserves for future expeditions.

Long-term, Essence may also compete with casting as Pit currency. Do not invent a new merchant/system in Phase 5 solely to satisfy that future idea.
# VS Spell Library

## Fireball

Role:
> **Reliable direct magical damage.**

Rules:
- automatic hit;
- magical HP damage;
- ignores ordinary physical Block, equipped Armor, and Natural Armor;
- explicit magical defenses may apply;
- **0 Impact**;
- no Burning status in the VS;
- no Dodge roll;
- no hit-quality roll.

Exact base damage remains a playtest tuning value. A provisional value near **3 base magical damage** is acceptable for implementation/testing, but is not sacred balance.

Fireball exists as the clean baseline against which more unusual spells are compared.
## Force

Role:
> **Reliable control, interruption, and physical obstacle manipulation.**

Combat rules:
- automatic hit;
- **0 HP Damage**;
- **3 Impact**;
- uses the existing Stability / Stagger / Knockdown rules.

Examples with 3 Impact:
- Stability 1 → Knockdown;
- Stability 2 → Stagger;
- Stability 3 → Stagger.

Force may cancel a committed attack through the normal Phase 2.1 interrupt rules and may create Press the Advantage.

Force does **not** move the enemy or create a separate positioning state. Its combat identity is reliable Impact/control.

Outside combat, authored rooms/events may list Force as an alternate solution to suitable physical obstructions. The current Blocked Passage precedent remains valid.
## Barrier

Role:
> **Temporary universal protection and defensive-choice support.**

Initial VS effect:
- gain **3 Barrier** until the next enemy **offensive action actually resolves**;
- reduce incoming HP damage by 3 whether the source is physical or magical;
- Barrier is not a Block choice;
- Barrier may combine with Dodge, Block, or Counterattack;
- it expires after that offensive action resolves, even if the attack is Dodged or Barrier absorbs little/no damage.

Barrier does **not** increase Stability, reduce Impact, alter Knockdown, or protect equipment from Block wear.

Apply Barrier to HP damage after the normal applicable defense calculation, minimum 0.

Barrier should remain useful against magic even when ordinary physical Armor/Block would not apply.

Numeric strength is playtest-adjustable.
## Heal

Role:
> **Reliable HP recovery.**

Rules:
- automatic;
- self-only;
- restore **8 HP**, capped at max HP;
- no overheal;
- does not cure Poison or other statuses;
- no INT roll;
- learned casting uses normal Essence / Learned Cast Count / Overcast rules;
- in combat, learned Heal consumes the Actor's normal action.

Keep Heal distinct from consumable cures and cleansing magic.

The current Basic HP Potion also heals 8 HP; the distinction is resource/action economy:
- potion = limited physical consumable and retains its authored free-action behavior;
- Heal = repeatable while Essence permits, but consumes a combat action and increases magical pressure.
## Unlock

Role:
> **Routine lock/seal bypass and world-event utility.**

Rules:
- automatic for ordinary authored valid locks/seals;
- no routine INT roll;
- learned casting uses normal Essence / Learned Cast Count / Overcast rules;
- Scroll version bypasses those learned-casting costs;
- only appears as usable when the current room/event actually supports Unlock.

Future unusual magical barriers may explicitly require an INT check for difficult manipulation, but ordinary Unlock should not become a random failure tax.

Use Unlock as an authored alternate route for suitable:
- locked doors,
- containers,
- seals,
- and similar room/event conditions.

Do not make every obstacle automatically valid for Unlock.
## Teleport

Role:
> **Guaranteed emergency extraction.**

Rules:
- automatic;
- may be cast during ordinary exploration or the Actor's normal combat action phase;
- uses the universal learned-cast cost / Learned Cast Count / Overcast rules;
- a Scroll version costs no Essence, does not increase Learned Cast Count, and triggers no Overcast;
- on a successful surviving cast, immediately ends the expedition and returns the Actor safely to the Pit entrance;
- **bypasses the normal Return route and therefore cannot trigger a Return Encounter**;
- if cast during combat, the currently committed enemy action does not resolve afterward.

Teleport exists because normal Return is not guaranteed-safe extraction.

Teleport changes location only.

It does not itself:
- heal HP,
- restore Sanity,
- cure statuses,
- erase authored consequences,
- or refund resources already spent.

Use the normal spell-resolution/Overcast order. If Overcast reduces Sanity to 0, resolve death/succession normally rather than treating Teleport as protection from magical collapse.
## Slow

Role:
> **Combat debuff that manipulates the existing DEX/Dodge axis.**

Rules:
- automatic;
- **0 Damage**;
- enemy suffers **DEX −2 until combat ends**;
- non-stacking;
- no resistance roll by default;
- recasting while already Slowed is unavailable/greyed out.

Because enemy DEX participates in Phase 2.1 relative-DEX Dodge:
- Slow makes the enemy easier to hit with physical attacks;
- Slow makes the enemy's attacks easier for the player to Dodge.

If cast before an already committed enemy attack resolves, the reduced DEX applies to that attack's later Dodge calculation.

Presentation:

> **SLOWED — DEX −2 until combat ends.**

Do not force a noncombat use onto Slow. Future authored events may accept it when slowing something is logically relevant.
# Implementation/UX Requirements

Normal mode must expose enough information for the player to make the casting decision without showing unnecessary internals.

At minimum, before a learned cast the player should be able to understand:
- current Essence,
- next cast Essence cost,
- whether the cast will Overcast,
- the WIS DC if it will Overcast,
- and the spell's concise effect.

Normal Mode should **not** require the player to manage or interpret a separate Strain/Learned-Cast meter.

Suggested compact presentation:

> **Fireball**
> 4 Essence · 3 Magic Damage · Ignores physical Defense
> **OVERCAST — WIS DC 11. Failure: −1 Sanity.**

Do not create a separate confirmation/result screen when the next meaningful decision can be shown immediately.

Dev Mode may show:
- formula details,
- pre/post Learned Cast Count,
- WIS roll,
- exact modifiers,
- and authored internal tags.
# Save/State Requirements

Save/load must preserve:
- current expedition Essence,
- internal Learned Cast Count,
- learned four-slot spell array,
- Tome/Scroll inventory state,
- active combat Barrier,
- active enemy Slow state,
- and any pending valid interaction state required by the combat flow.

Returning from an expedition resets:
- expedition-local Essence to 0,
- Learned Cast Count to 0,
- combat-only Barrier/Slow state through normal combat teardown.

Do not reset learned spells on return.

Tome learning/replacement and Scroll consumption must save atomically so reload cannot duplicate or consume them incorrectly.

# Phase Boundaries

Do not pull these into Phase 5 unless required for compatibility:
- final Phase 3 room-deck/economy tuning beyond the Essence changes needed for magic;
- final enemy HP/Defense tuning;
- Phase 4 Sanity manifestation tuning;
- broad overworld event expansion;
- magic shop/relearning service;
- Wand/Staff/magic-equipment progression;
- large post-VS spell library;
- dedicated reaction spells.

The VS goal is to prove the magic loop and its integration with combat, Sanity, Items, and authored utility checks.
# Required Tests Before Handoff

Add deterministic tests for at least:

- INT 1–4 learned-cast cost sequences.
- Learned Cast Count increments exactly once per learned cast.
- safe casts vs WIS threshold.
- Overcast DC ladder **8 → 11 → 14 → 17 → 20 cap**.
- successful and failed Overcast; failed Overcast still resolves spell.
- failed Overcast at Sanity 1 reaches 0 and follows Phase 4 death/succession after spell resolution.
- Scroll: 0 Essence, no Learned Cast Count increase, no Overcast, consumed once.
- Scroll is in Items/Bag, not Equipment.
- Scroll consumes normal combat action.
- Tome fills empty slot, prompts replacement when full, and is not consumed on cancel.
- exactly one initial candidate begins with Fireball.
- Spells render/act as a 2×2 clickable grid with no extra Cast button.
- Items render as a vertical list; unavailable rows remain visible/greyed.
- Fireball auto-hits and bypasses ordinary physical Defense.
- Force deals 0 Damage / 3 Impact and uses Stagger/Knockdown with no range/position effect.
- Barrier reduces HP damage from the next incoming offensive action by 3, has no Stability/Impact effect, then expires.
- Heal restores 8, caps at max HP, does not cure statuses, consumes combat action.
- Unlock only appears in supported contexts and resolves ordinary eligible locks automatically.
- Teleport bypasses Return Encounters, works in combat, and prevents the pending enemy attack from resolving afterward.
- Slow applies DEX −2, affects Phase 2.1 Dodge math immediately, does not stack, and clears after combat.
- offensive learned spells and offensive Scrolls are legal for Press the Advantage and surviving Counterattack; supportive magic is not.
- immediate offensive magic cannot generate another immediate action.
- Essence starts at 0 and is discarded/reset on expedition return.
- every resolved non-empty room grants +1 Essence, Resource rooms grant exactly +1 additional Essence, and resolved Combat rooms separately have a 50% chance to grant 1–2 Arrows.
# Playtest Tuning Block

The following are intentionally tunable after hands-on play:
- Fireball exact base damage.
- Barrier exact numeric strength if 3 proves too strong/weak.
- whether +1 Essence per non-empty room, +1 additional for Resource rooms, and the 50% Combat-room 1–2 Arrow roll produce the intended resource supply.
- whether the target 10–15 Essence by a few floors is too generous or too restrictive.
- Scroll/Tome treasure frequency if Phase 3's test-focused availability still fails to expose enough magic during play.

Do not change the underlying locked structure merely to solve a tuning problem:
- INT delays exponential cost.
- WIS determines how many learned casts are mentally safe before Overcast.
- Learned Cast Count is internal machinery, not a separate player-facing resource.
- Scrolls bypass learned-cast pressure but still spend the applicable normal/immediate action.
- offensive magic is reliable by default.
- four spell slots remain the VS limit.
- Items and Spell UI behavior remain as specified above.
