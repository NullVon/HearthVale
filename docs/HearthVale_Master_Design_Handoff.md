# HearthVale — Master Design Handoff
## Living World Engine (LWE) Source of Truth

> **Purpose:** Canonical handoff for the HearthVale design discussion from the original pitch through the first Guardian combat stress test. Another AI/designer should be able to continue from this file without re-litigating settled choices.
>
> **Labels:** **LOCKED** = intentional decision; **CURRENT / PROVISIONAL** = working rule/numbers; **TBD** = unresolved; **LATER BOX** = explicitly deferred; **SUPERSEDED** = replaced by a later decision.

---

# 1. Original Pitch and Evolution

## 1.1 Original HearthVale pitch — LOCKED ORIGIN

The original pitch was a **Path of Adventure-like game using the Living World Engine social sim**. The player essentially never leaves HearthVale except to enter the dungeon in the town center. Starting characters would be generated/rolled with distinct traits, preserving a light gacha/reroll flavor.

The first accepted core loop was:

> **Morning social/prep → Dungeon → Evening social/prep**

Primary goal:
> reach/clear roughly **Floor 100**.

Secondary but equally important long-term goal:
> **build a life** — family, friendships, romance, business, reputation, mentorship, legacy.

Primary inspirations discussed:
- **Path of Adventure** — dungeon loop, practical magic, Essence/money tension.
- **Life in Adventure** — random events, failure opportunities, Health/Sanity run pressure.
- **Etrian Odyssey / XSEED/JRPG progression** — dungeon depth and training-oriented growth.
- **Persona / Rune Factory** — town/social-life loop.
- **Degrees of Lewdity / Life in Adventure** — text-first presentation with modest art.

The early concept leaned closer to **die → reroll → die → reroll**, but the design evolved into a game where characters have enough systems to genuinely live, grow, form relationships, own businesses, mentor successors, and become painful to lose.

The original reroll/gacha DNA remains useful for:
- generated starting candidates,
- traits/backgrounds,
- replayability,
- distinct runs/generations,

but HearthVale is no longer only a disposable-run game.

---

# 2. Core Fantasy

## 2.1 HearthVale and The Pit — LOCKED

The player lives in **HearthVale**, a settlement built around a massive dungeon.

Official/common name:
> **The Pit**

Hostile/scornful nickname:
> **the Abyss**

The two fundamental fantasies are:

### Adventure
Go deeper into The Pit.

### Life
Become somebody before The Pit kills you.

Possible life stories include:
- adventurer,
- merchant,
- smith,
- scholar,
- spouse/parent,
- mentor,
- guild legend,
- wealthy dynasty founder,
- cursed survivor,
- person who survives just long enough to retire.

---

# 3. Lore / Generation 0

## 3.1 Generation 0 tutorial — LOCKED DIRECTION

The opening should have **One Piece “Dawn of the Age of Pirates” energy**.

Generation 0 is both tutorial and founding myth. A Roger-equivalent adventurer:
- explores The Pit before the modern Age of Adventurers is fully established,
- is already around two Hearts when reaching something extraordinary,
- sees/finds/proves something important,
- fails a critical roll,
- barely escapes,
- later appears again around one Heart,
- is missing an arm,
- gives the speech that inspires the **Age of Adventurers**.

This explains why later HearthVale is full of:
- heroes,
- travelers,
- fame-seekers,
- Guild contracts,
- expeditions.

Exactly what the treasure/proof is, and the speech itself, remain **TBD**.

## 3.2 Floor 100 knowledge — TBD

The design target is roughly 100 Floors, but still unresolved:
- Does the player know this immediately?
- Does HearthVale know the exact number?
- Is “100” only legend?
- Is the truth confirmed later?

Do not assume exact in-universe certainty yet.

---

# 4. Future/Thematic Ideas — LATER BOX

## 4.1 Flipped history cards

At end-of-run/credits, show epilogue cards with an option to **flip** them and see another perspective/hidden version of history. This can reveal distorted official history, monster perspectives, or opposing interpretations.

## 4.2 Possible sequel

Early sequel idea: play as monsters defending their underground home from generations of human surface invaders. Interesting, but explicitly too far ahead for current scope.

---

# 5. Presentation and Technical Shape

## 5.1 Phone-first — LOCKED

Treat HearthVale as a **phone game first**.

Presentation:
- text blocks,
- compact buttons,
- small pixel sprites/portraits,
- enemy/item icons,
- modest static location art,
- minimal animation.

Do **not** design around:
- 3D movement,
- tactical grids,
- elaborate dungeon maps,
- expensive bespoke visual scenes.

The complexity belongs in:
- state,
- rules,
- tags,
- world memory,
- event generation,
- relationships,
- history.

## 5.2 Scripted choices, no runtime AI — LOCKED

Core HearthVale should work through:
- scripted event templates,
- generated names/combinations,
- weighted RNG,
- conditional text,
- persistent world state.

No always-online generative-AI backend is required for the core game.

---

# 6. Living World Engine Philosophy

## 6.1 The character resets; HearthVale does not — LOCKED

Every new character should still experience:
> weak → capable → powerful.

But the world can inherit:
- Strata knowledge,
- landmarks,
- shortcuts,
- Waystones,
- materials,
- weapon families,
- shops/businesses,
- crafting traditions,
- prices/economic effects,
- monster equipment changes,
- Guild records,
- famous families/adventurers,
- player remains,
- heirlooms,
- item provenance,
- historical consequences.

The prestige fantasy is:
> **inherit a richer world, not a max-level character.**

## 6.2 Player knowledge is progression — LOCKED

The player learns even when a character dies.

Examples:
- recognize an Ogre’s heavy telegraph,
- remember a dangerous shrine,
- know which attack a Hammer can Stagger,
- know what preparation a certain Stratum demands.

Stats and gear matter, but the player’s understanding should be one of the strongest progression systems.

## 6.3 The Abyss should remain slightly stronger — LOCKED PHILOSOPHY

Players scale, but deep monsters should remain dangerous enough that raw stats alone do not solve the game. The gap is closed through:
- gear,
- preparation,
- utility,
- status items,
- spells,
- correct defensive reads,
- knowledge.

## 6.4 Small numbers, big consequences — LOCKED

Prefer:
- small HP pools,
- low flat damage,
- Hearts,
- Sanity pips,
- flat Block,
- 1–20 stats,
- visible durability.

Avoid MMO-style number inflation and percentage soup.

## 6.5 “Roll,” not “You can’t” — LOCKED

There are no traditional classes and generally no weapon/spell stat requirements. If the player found, bought, or learned something, they can attempt to use it. Stats affect probability/competence rather than permission.

## 6.6 The game may waste the character’s time; not the player’s indefinitely — LOCKED

False rumors, failed searches, mediocre sub-dungeons, and bad decisions are allowed. Indefinite player frustration is not. Use auto-resolution and anti-repetition where appropriate.

---

# 7. Calendar, Time, and Aging

## 7.1 Calendar — LOCKED

A HearthVale year:
- 4 seasons,
- 10 days per season,
- 2 weeks per season,
- 5 days per week.

Therefore:
> **5 days = 1 week**  
> **10 days = 1 season**  
> **40 days = 1 year**

## 7.2 One playable day = one calendar day — LOCKED

AP is not calendar time. Do not use “5 AP = one week.”

## 7.3 Life Chapter interludes — LOCKED CONCEPT

After Day 40/40:
- playable year ends,
- show a time-passage interlude,
- some number of years may pass,
- LWE advances the world,
- next playable year begins.

The skip is **not strictly always four/five years**. It may vary.

During interludes, LWE may resolve:
- aging,
- births,
- marriages,
- deaths,
- retirements,
- NPC goal progress,
- businesses,
- mundane NPC expeditions,
- rumors,
- new arrivals,
- town/Guild changes.

Do not invent huge identity-defining choices for the player character without player input.

## 7.4 Generation change ≠ automatic time skip — LOCKED

### Death with prepared mentee
Successor can take over within days/weeks.

### Death without successor
Years may pass, then a new adventurer begins.

### Planned retirement
Usually transitions during an interlude; prior player remains as an NPC.

Core line:
> **The calendar belongs to HearthVale. The generation number belongs to the player.**

---

# 8. LWE Signature Weather

## 8.1 Recurring rain dates — LOCKED FLAVOR DIRECTION

Possible engine signature: certain hardcoded dates always rain in every LWE game. Exact dates are **TBD**.

---

# 9. AP

## 9.1 Shared daily AP pool — LOCKED

One shared AP pool per day. Starting normal minimum around:
> **3–4 AP**

AP may grow through:
- CON thresholds,
- scripted milestones,
- statuses,
- special effects.

Statuses may temporarily change AP:
- sickness,
- exhaustion,
- energized/rested.

## 9.2 AP means meaningful effort — LOCKED

Do not charge AP for routine breakfast/sleep/basic life. AP represents meaningful dedication to:
- training,
- social time,
- business,
- mentorship,
- The Pit,
- major projects/events.

## 9.3 Pit AP cost — CURRENT

Current accepted model:
- **1 AP to enter The Pit**,
- potentially another AP to change Strata.

Stratum-transition cost remains **PROVISIONAL**.

## 9.4 SUPERSEDED: fixed Floors per AP

Rejected ideas:
- 1 AP = 1 Floor,
- 1 AP = 10 Floors.

Current model:
> AP buys the expedition opportunity, not a fixed number of Floors/Rooms.

---

# 10. Organic Reasons to Leave The Pit

## 10.1 No dungeon stamina meter — LOCKED

Do not add room stamina/exploration points.

The player already faces:
- HP,
- Hearts,
- Sanity,
- weapon/shield durability,
- arrows,
- throwing ammo,
- Essence escalation,
- consumables,
- backpack space,
- return risk.

If the player can survive 30 rooms, let them.

---

# 11. Newbies and Veterans

## 11.1 Two simple categories — LOCKED

### Newbies
Possible titles:
- **Beginner**
- **Daring**

Benefits:
- XP gain boost,
- limited death/Heart-loss protection.

### Veterans
Possible titles:
- **Seasoned**
- **Battle-Hardened**

The training wheels come off after a threshold. Exact threshold = **TBD**.

---

# 12. Stats

## 12.1 Six stats — LOCKED

- **STR** — melee competence, physical checks.
- **DEX** — ranged/throwing, Dodge, agility, utility tools.
- **CON** — AP thresholds, Natural Armor/toughness.
- **INT** — magic competence/knowledge/checks.
- **WIS** — Sanity and safe magical-use threshold.
- **CHA** — persuasion/intimidation/negotiation/social checks.

## 12.2 Mortal stat cap — LOCKED CURRENT

Earlier 1–10 idea was replaced by:
> **1–20 mortal scale**

20 = normal mortal ceiling. Monsters may exceed it.

## 12.3 d20 placeholder — CURRENT / PROVISIONAL

Use D&D 5e-style scaffolding for now:
> **d20 + relevant stat modifier vs Defense/DC**

Placeholder modifier:
> floor((Stat − 10) / 2)

This will be replaced/tuned later.

## 12.4 Advantage / Disadvantage — LOCKED CURRENT TOOL

Roll 2d20 and take higher/lower. Does not stack. Advantage + Disadvantage cancels.

---

# 13. XP, Level, and Training

## 13.1 XP is expendable — LOCKED

XP is a spendable resource. The lifetime-threshold/advancement-token idea was rejected.

## 13.2 Training requires XP + AP — LOCKED

A stat increase requires repeated training sessions. Each session costs:
- XP,
- AP.

Illustrative inspiration:

### STR 3 → 4
10, 10, 11, 11, 12 XP across several sessions.

### STR 4 → 5
15, 16, 16, 17, 17, 18, 18 XP.

Exact formula/table = **TBD**.

## 13.3 Training can come from life — LOCKED DIRECTION

Guild Training is reliable, but other actions may count:
- STR — labor/strength work,
- DEX — archery/agility,
- CON — endurance,
- INT — study/research,
- WIS — meditation/reflection,
- CHA — business/social practice.

## 13.4 Character Level — TBD

Examples use Lv20/Lv70, but still unresolved:
- how Level rises,
- relationship between Level and spendable XP,
- Level cap,
- exact Level rewards.

What is locked:
> Max HP growth comes mainly from **Level + equipment**, not CON.

---

# 14. HP, Hearts, Sanity

## 14.1 HP — LOCKED

Ordinary combat health. Restored through items/spells/rest/services.

Max HP comes from:
- Level,
- equipment,
- rare effects/milestones.

CON does not directly raise Max HP.

User philosophy:
> “You can train your body to take hits but you can’t train it to live longer.”

## 14.2 Hearts — LOCKED

Default:
> ❤️ ❤️ ❤️

When HP reaches 0:
1. lose one Heart,
2. combat immediately ends,
3. enemy resets,
4. player is ejected from that fight,
5. return to exploration state,
6. recover to roughly **50% Max HP** as a provisional value,
7. spent resources stay spent.

A Heart is not another health bar. Losing one means:
> **you lost the encounter.**

At 0 Hearts, the body dies unless special protection intervenes.

## 14.3 Enemy reset on disengage — LOCKED

Once player is no longer actively engaging/viewing an enemy:
> enemy returns to full HP.

No death-chipping.

## 14.4 Sanity — LOCKED

Use a small icon/pip pool, not 0–100.

Sanity is deliberately fickle.

Lose it from:
- horror,
- failed WIS,
- curses,
- overcasting,
- tragedy.

Recover through ordinary life:
- coffee,
- time with friends,
- spouse/family,
- festivals,
- rest/comfort.

At 0 Sanity:
> the mind breaks; the player can no longer control that character.

The body may still exist as an NPC depending on circumstances.

Exact max Sanity = **TBD**.

---

# 15. Death Scars and Heart Restoration

## 15.1 Core rule — LOCKED

> **You can regain the Heart. You cannot undo what happened.**

## 15.2 Psychological scars — LOCKED DIRECTION

Examples:
- Fear of Deep Water,
- Fear of Fire,
- Ogre Terror,
- Claustrophobia.

These make relevant WIS/Sanity checks harder.

## 15.3 Physical scars — LOCKED DIRECTION

Examples:
- Lost Arm,
- Lost Eye,
- Crippled Leg,
- Severe Burns,
- Disfigurement.

They may affect checks, equipment, actions, social events, prosthetic questlines.

## 15.4 Second Heart loss — LOCKED DIRECTION

Second catastrophic Heart loss should strongly weight or guarantee a major Scar.

## 15.5 Heart restoration — LOCKED

Rare, difficult, limited, world-dependent. Possible sources:
- legendary medicine,
- shrine,
- artifact,
- deep-Pit content,
- exceptional world development.

Never normal clinic healing.

---

# 16. Newbie/Blessed/Cursed Survival

## 16.1 Newbie freebie — LOCKED

Early adventurer gets limited catastrophic-loss protection. Once Veteran, free protection is gone.

## 16.2 Blessed protection — LOCKED DIRECTION

Rare clean insurance, e.g. **Death Ward**:
- prevents final Heart loss once,
- destroys itself,
- Scars/history still happen.

## 16.3 Cursed/Abyssal protection — LOCKED DIRECTION

The Abyss may save you **for a price**.

Possible costs:
- permanent max Sanity loss,
- curse,
- stat loss,
- item/wealth sacrifice,
- inability to restore Hearts,
- years of life,
- family consequences,
- another life.

Sometimes a lethal event may become:
> “Not yet.”  
> “We could avoid this.”

Player may Accept or Refuse/Die.

This should not trigger every death.

## 16.4 Generational debt — LOCKED AS POSSIBLE CONTENT

Explicitly liked ideas:
- “A life for a life.”
- “Your firstborn belongs to me.”
- “I will collect later.”

A previous character refusing to die can create consequences for future generations.

---

# 17. Save System

## 17.1 Limited world/save slots — LOCKED DIRECTION

Exact count = **TBD**.

## 17.2 One rolling autosave — LOCKED

Autosave at:
> **start of every new Floor**

Save happens **before** the engine rolls/generates that Floor’s content.

Reloading returns to top of Floor and may produce different content.

This already serves the mobile suspend function.

## 17.3 Manual saves — LOCKED

Only at:
- **Home**
- **Waystones**

## 17.4 Reloading an attached character — CURRENT

The game may allow a player deeply attached to a character to reload a manual save and back out/grind/prepare rather than enforce hard irreversible permadeath at the save-file layer.

In-world insurance remains valuable because it avoids rewinding progress.

---

# 18. Equipment Structure — 4 / 4 / 4

## 18.1 Weapons — LOCKED
> **4 Weapon Slots**

## 18.2 Equipment — LOCKED
- **Head**
- **Body**
- **Hands**
- **Accessory**

## 18.3 Magic — LOCKED
> **4 prepared reusable spells**

Scrolls are one-use.

---

# 19. Armor and Natural Armor

## 19.1 No armor classes — LOCKED

Do not use Light/Medium/Heavy as hard classes.

Gear may be melee/ranged/magic-oriented through effects, but anyone may equip anything.

## 19.2 Passive Armor — LOCKED

Head/Body/Hands provide low flat physical Armor and may also grant:
- stats,
- Max HP,
- lifesteal,
- status/utility effects.

Total passive Armor should generally be lower than equivalent-quality Shield Block.

## 19.3 Matching sets — LOCKED DIRECTION

Head + Body + Hands may form sets. Accessory remains independent. Prefer immunities/fixed rules over percentages.

## 19.4 CON → Natural Armor — LOCKED

Natural Armor:
- comes from CON thresholds,
- always applies to physical damage,
- stacks with equipped Armor,
- does not raise HP.

Exact curve = **TBD**.

---

# 20. Physical vs Magical Defense

## 20.1 Physical — LOCKED

> Incoming Physical Damage  
> − selected Block  
> − Equipped Armor  
> − Natural Armor  
> = HP Damage (minimum 0)

## 20.2 Magical — LOCKED

Pure magic normally ignores:
- ordinary physical Block,
- Equipped physical Armor,
- Natural Armor.

Therefore magic should generally have lower raw base damage.

Magic defense comes from explicit effects:
- Magic Block,
- Resistance,
- Barrier,
- Runed Shield,
- Warding Staff,
- magic-oriented armor passive.

Do not add a universal Magic Armor bar unless later necessary.

---

# 21. Combat Phase UI

## 21.1 Explicit phases — LOCKED

The combat test exposed confusion about whose phase it was. UI must clearly label something like:

> ## ⚔️ YOUR ATTACK

and

> ## ⚠️ INCOMING ATTACK

Do not rely on prose alone.

---

# 22. Defensive Choices

## 22.1 Block — LOCKED

Use Shield or weapon. Reliable mitigation, durability wear.

## 22.2 Dodge — LOCKED

DEX check.
- success = 0 damage,
- failure = attack lands with passive Armor only.

## 22.3 Attack / Counterattack — LOCKED

Aggressive defensive option.
- kill enemy → incoming action cancelled,
- Stagger enemy → incoming action cancelled,
- otherwise enemy attack lands in full,
- no second Block/Dodge.

All-in by design.

## 22.4 Spell — LOCKED DIRECTION

May counterattack with a spell when context allows. A hit does not automatically interrupt unless enemy dies or the spell explicitly interrupts.

## 22.5 Items — LOCKED

Normal item use consumes the player’s offensive action. Not a defensive reaction unless explicitly designed as one.

---

# 23. Durability

## 23.1 Physical miss — LOCKED

Miss with no contact:
> no durability loss.

## 23.2 Physical contact — LOCKED

Hit/blocked/parried/contact can wear the item.

## 23.3 Passive weapon-slot items — LOCKED

Tome/Wand/Staff/passive weapons lose DUR only when their effect actually contributes.

## 23.4 Block wear — LOCKED CURRENT

### Withstood
Damage ≤ Block → **−1 DUR**

### Overwhelmed
Damage > Block → **−2 DUR**

### Overmatched
Damage > item Max DUR → **−3 DUR**

This replaced more complicated ratio math.

---

# 24. Weapon Families

## Sword — LOCKED
Balanced Damage / Impact / Block.

## Axe — LOCKED IDENTITY, NUMBERS TBD
Damage specialist with defensive/tradeoff weakness.

## Hammer — LOCKED
Impact/Stagger specialist. Solid Damage, high Impact, often lower durability.

Do not nerf it just because smart players can build around Stagger.

## Throwing Weapons — LOCKED
DEX-based ammunition stacks. No retrieval.

## Bow — LOCKED
DEX-based, FAR, uses Arrows, Bow has durability.

## Shield — LOCKED
Very high Block, occupies one Weapon Slot.

## Wand — LOCKED
Offensive spell power: Damage/Impact/accuracy modifiers.

## Staff — LOCKED
Magic endurance/warding/defense; may improve WIS, Magic Block, and has decent physical Block.

## Tome — LOCKED
Spell-rule/efficiency manipulation.

## Spear — LATER / DISCOVERY CANDIDATE
Potential later permanent weapon-family discovery rather than required starting family.

---

# 25. Weapon Card Philosophy — LOCKED

Keep compact. Likely fields:
- Damage,
- Impact,
- Block,
- Durability,
- Range,
- scaling/check stat,
- one meaningful special rule.

Avoid giant stat cards.

---

# 26. Impact, Stability, Stagger

## 26.1 Impact — LOCKED
Weapon property, not character stat.

## 26.2 Stability — LOCKED
Enemy **moves** have hidden Stability.

> Impact ≥ Move Stability → Stagger.

## 26.3 Do not expose “Staggerable” — LOCKED

Show the fictional telegraph only. Player learns whether their Impact is enough.

## 26.4 Stagger — LOCKED

Stagger only:
> cancels the current incoming action.

No stun meter, extra turn, or lingering effect.

Some attacks may effectively be unstaggerable.

---

# 27. Knockdown — LOCKED

Knockdown:
> consumes the target’s **next offensive action** recovering.

This differs from Stagger and allows future Knockdown builds.

---

# 28. Dodge, Openings, Criticals

## 28.1 Exceptional Dodge — CURRENT / PROVISIONAL

Current test:
- successful Dodge = evade,
- final Dodge result **16+** = **Opening**.

## 28.2 Opening — LOCKED CONCEPT

Next successful physical attack becomes a Critical. Miss wastes Opening.

## 28.3 Critical damage — PROVISIONAL

Current test:
> +50% base weapon damage, rounded up.

Tune later.

---

# 29. Range and Fleeing

## 29.1 Two range states — LOCKED
- **NEAR**
- **FAR**

No grid.

## 29.2 Close Distance — LOCKED
FAR → NEAR costs offensive action.

## 29.3 Player flee — LOCKED CURRENT
Can attempt any time; easier FAR, harder NEAR.

## 29.4 Enemy flee — LOCKED CURRENT
Enemy can only successfully flee at FAR. If NEAR, must create distance first.

## 29.5 Pursue — LOCKED CONCEPT
When FAR enemy flees, player may Pursue. Success closes to NEAR and wastes enemy flee action. Exact check = **TBD**.

---

# 30. Status and Environment

## 30.1 Keep status vocabulary small — LOCKED

Candidate MVP statuses:
- Poisoned,
- Burning,
- Bleeding,
- Restrained,
- Knockdown,
- Blinded,
- Weakened.

## 30.2 Poison — LOCKED CURRENT

Ordinary Poison:
> **1 HP per meaningful action**

It:
- persists until cured,
- continues after combat,
- does not naturally expire,
- does not stack extra ordinary Poison damage.

Reapplying normal Poison while already Poisoned has no extra effect.

Stronger variants may explicitly deal more.

Poison ignores physical Armor.

## 30.3 Poison timing — LOCKED

Ticks on meaningful action-time:
- attack,
- item use,
- forced Knockdown recovery,
- meaningful Scene/Room progression.

Does not tick from UI browsing.

Antidote consumes offensive action and cures **before** the end-of-action Poison tick.

## 30.4 Contact vs force — LOCKED

Block can prevent contact effects such as Poison/Bleed if the attack never touches the body. Force effects such as Knockdown may still occur through Block.

## 30.5 Advantage/Disadvantage for terrain — LOCKED

Example:
> Flooded Ground → Dodge at Disadvantage.

## 30.6 Hidden/Ambush attacks — LOCKED

Normally cannot be counterattacked. Must Block/Dodge unless a detection/reaction effect says otherwise.

---

# 31. Magic

## 31.1 Four reusable spells — LOCKED

Scrolls are one-use.

## 31.2 No spell stat requirements — LOCKED

If learned, it can be attempted.

## 31.3 Practical noncombat magic — LOCKED

Magic must matter outside combat. Example:
> **Unlock** for chests/doors.

Repeated utility casting still pushes cost/mental danger. The user specifically liked that spamming Unlock can eventually force WIS/Sanity checks.

## 31.4 Essence = magic fuel + Pit currency — LOCKED

Core Path of Adventure tension:
> cast now or save it for a merchant?

## 31.5 Exponential casting cost — LOCKED

> **1 → 2 → 4 → 8 → 16 → 32...**

The user explicitly preferred keeping the doubling curve.

No separate Strain meter. The current next-cast cost is the strain indicator.

Minimum spell cost:
> **1 Essence**

## 31.6 Mana Potion — LOCKED DIRECTION

Resets/reduces the exponential cast count rather than filling a separate MP bar.

## 31.7 Spell misses — LOCKED

Still spend Essence and advance escalation.

---

# 32. INT vs WIS in Magic

## INT — LOCKED
“How good am I at magic?”

Used for:
- offensive spell attacks,
- magical puzzles,
- difficult magical manipulation,
- runes/knowledge,
- unusual spell use.

Routine utility magic need not always roll.

## WIS — LOCKED
“How much magic can my mind safely endure?”

WIS:
- raises safe-casting threshold,
- handles overcast mental checks,
- ties to Sanity.

## Both — LOCKED
If a spell is both difficult and mentally dangerous, INT and WIS may resolve independently. A spell can succeed and still cost Sanity.

---

# 33. Magic Weapon Identities and Stacking

## Wand — LOCKED
Power/offense.

## Staff — LOCKED
Endurance/warding/defense.

## Tome — LOCKED
Rules/efficiency.

## Stacking — LOCKED
Let players cook. Multiple Wands/Staffs/Tomes can stack where logically meaningful.

Universal floors/caps win:
- spell cost cannot go below 1.

A passive that contributes nothing does not wear.

---

# 34. DEX Utility — LOCKED DIRECTION

DEX should support practical tools, not only Bows/Dodge.

Examples:
- Smoke Bomb,
- Caltrops,
- Grappling Hook,
- Poison coating.

No class restrictions.

---

# 35. Inventory and Ammo

## 35.1 Backpack — LOCKED STARTING TARGET
> **12 slots**

If annoying, increase toward 16.

## 35.2 Stacking — LOCKED
Materials/consumables may stack. Equipment generally uses one slot. Equipped items do not count. Key/quest items are separate/free.

## 35.3 Home storage — LOCKED DIRECTION
Larger, separate, upgradeable.

## 35.4 Arrows — LOCKED
Separate pool, current max:
> **11 Arrows**

Very abundant in The Pit. Do not consume backpack space.

## 35.5 Throwing weapons — LOCKED
Ammunition stacks, e.g. Knives ×8 → ×7. No retrieval.


---

# 36. Combat Entity Model

## 36.1 One mechanical hostile entity — LOCKED

The multiple-enemy stress test failed immediately.

Do **not** run:
> Player action → Enemy A action → Enemy B action → Enemy C action.

It creates:
- lethal action-economy imbalance,
- too many defensive phases,
- absurd durability loss,
- poor phone readability.

Combat is fundamentally:
> **a duel.**

## 36.2 Group enemies — LOCKED DIRECTION

Fiction may still show groups:
- Goblin Patrol,
- Wolf Pack,
- Rat Swarm,
- Skeleton Phalanx.

Mechanically:
> one hostile entity.

Possible design:
- one HP pool,
- one enemy action,
- certain moves disappear as HP thresholds imply members dying/fleeing.

---

# 37. Enemy Telegraphs and Learning

## 37.1 Show fiction; hide developer truth — LOCKED

Show:
> “The Ogre raises its club overhead.”

Do not normally show:
- exact Damage,
- Stability,
- full move list,
- “this move is Staggerable.”

The player learns.

## 37.2 Knowledge can enrich the text — CURRENT

First encounter:
> “You hear clicking.”

Later:
> “You recognize Cave Spider clicking.”

Guild/world knowledge can add context, but should not automatically solve encounters.

## 37.3 Enemy non-attacks — LOCKED

Enemy phases can include:
- Sharpen,
- Guard,
- Hide,
- Submerge,
- Buff,
- Reposition,
- Taunt.

The player may Shield and discover the enemy was only buffing. That is valid learning.

If nothing hits the Shield:
> no durability loss.

---

# 38. The Pit Structural Hierarchy

## 38.1 Correct hierarchy — LOCKED

The intended mental model is:

> **Stratum → Floor → Scene → Room**

This was an important correction to earlier terminology.

## 38.2 Stratum
Large ecosystem/region spanning roughly 8–12 Floors.

## 38.3 Floor
A depth band, **not** a room.

A Floor can contain:
- multiple Scenes,
- paths,
- discoveries,
- resources,
- sub-dungeons.

Passing through does not mean the Floor is fully explored.

## 38.4 Scene
Primary generated content unit.

Examples:
- combat,
- quiet passage,
- hazard,
- traveler,
- camp,
- shrine,
- strange opening,
- sub-dungeon entrance.

## 38.5 Room
An interaction/beat inside a Scene.

Example:
> **Goblin Burrow Scene**  
> Room 1 — Goblin fight  
> Room 2 — Goblin fight  
> Room 3 — stronger Goblin  
> Room 4 — dedicated loot room

---

# 39. Content Density per AP

## 39.1 1 AP must feel worthwhile — LOCKED FEEL

Spending one of a small number of daily AP to enter The Pit should not yield only one trivial interaction.

For a Lv20-ish adventurer whose newbie protection is gone:
> roughly **3–4 meaningful content chunks** is a reasonable first benchmark for a *short* expedition.

This is not a cap.

A single Floor/sub-dungeon may contain many Rooms and fights.

---

# 40. Random-Linear Exploration

## 40.1 Random-linear with permanent discoveries — LOCKED

The selected model is:
> **random-linear moment-to-moment traversal + permanent important discoveries.**

This avoids both:
- a giant permanent procedural map,
- completely disposable content with no world memory.

---

# 41. Multiple Paths Through a Floor

## 41.1 No single strict route — LOCKED

There is not one canonical hallway to F38.

A Floor may offer choices such as:
- Follow the water,
- Enter the ruins,
- Follow footprints,
- Narrow tunnel,
- Broken bridge.

These choices adjust the layered generator context.

## 41.2 Hidden Floor progress — LOCKED

Completing enough Scenes increases hidden likelihood of finding:
> **Descend to next Floor**

Do not expose a visible “Floor exploration %” meter.

## 41.3 Ignore a descent → lose that route — LOCKED

If the player finds a way down and chooses to keep exploring, that particular ephemeral route disappears. They must later find another descent.

---

# 42. No Automatic “Known Route” Skip

## 42.1 Reaching F29 does not unlock F29 — LOCKED

Do **not** add:
> “Follow known route to F29”

just because the player has reached it before.

Every expedition should still cost:
- durability,
- HP,
- ammo,
- Essence,
- consumables,
- risk.

Only **actual discovered shortcuts** bypass traversal.

This is central to the attrition loop.

---

# 43. Persistent Pit Content Categories

## 43.1 Encounter — LOCKED
Temporary content that mostly belongs to the current expedition.

Examples:
- random merchant,
- chest,
- temporary camp,
- injured traveler,
- small cave.

## 43.2 Discovery — LOCKED
Persistent knowledge/history, but not necessarily a return destination.

Examples:
- ancient mural,
- Faceless Statue,
- strange corpse,
- historical clue.

## 43.3 Landmark — LOCKED
Persistent **and revisitable** because there is a reason to return.

Examples:
- Frozen Lake,
- Buried Library,
- Goblin Market,
- repeatable Shrine,
- permanent resource site.

Rule:
> **If there is a meaningful reason to physically come back, it is probably a Landmark.**

Do not visually spoil which category an event is before investigation.

---

# 44. Sub-Dungeons

## 44.1 Important pillar — LOCKED

Inspired directly by Path of Adventure.

Sub-dungeons may:
- contain several Rooms,
- concentrate danger,
- use checks,
- reward spells,
- produce rare loot,
- create Landmarks,
- create authored/special events.

## 44.2 Generator profiles — LOCKED DIRECTION

### Goblin Burrow
- Combat ↑↑
- Goblin-family content
- guaranteed loot endpoint

### Crystal Cavern
- Resource ↑↑
- Hazard ↑
- Combat ↓
- rare-material weighting

### Ancient Crypt
- Undead ↑
- Sanity pressure ↑
- Cursed loot ↑
- special event/Boss possibility

Same layered generator, different weights.

---

# 45. Strata

## 45.1 Size — LOCKED

Approximately:
> **8–12 Floors per Stratum**

Variable per world.

## 45.2 Rolled once, permanent — LOCKED

Most middle Strata are selected from authored archetypes when the world is generated.

Possible archetypes:
- Fungal Warrens,
- Frozen Depths,
- Sunken Halls,
- Ash Caverns,
- Ancient City,
- Crystal Depths,
- Bloodroot.

They remain permanent in that save.

Tutorial/final regions may be fixed.

## 45.3 Stratum package — LOCKED DIRECTION

Each archetype provides:
- environment tags,
- enemy candidate pools,
- event pools,
- resources,
- discoveries,
- hazards,
- loot modifiers,
- Guardian candidates.

Do not hardcode:
> one monster species = one Floor.

---

# 46. Waystones

## 46.1 Semi-random placement — LOCKED DIRECTION

Waystones are not fixed every X Floors.

Use safety guardrails.

Lean away from:
> Waystone immediately outside every Guardian/Boss.

Exact minimum spacing = **TBD**.

## 46.2 Waystone as expedition planning hub — LOCKED

At a Waystone, the player may see:
- Explore Deeper,
- known Landmark,
- known Shortcut,
- Return to HearthVale.

Once leaving the Waystone:
> these destination buttons disappear.

## 46.3 Landmark vs shortcut — LOCKED

### Landmark
“I specifically want to go there.”

### Shortcut
“I want to bypass dangerous traversal.”

Shortcuts reduce:
- risk,
- durability loss,
- encounters,

but also reduce:
- loot opportunities.

---

# 47. Return from The Pit

## 47.1 One Return action — LOCKED

Do not force players to manually press Return for every prior Floor.

Use:
> **Return to Waystone**

## 47.2 Distance-based return risk — LOCKED

The farther from safety, the more likely a complication.

Could display:
- Low,
- Moderate,
- High Risk.

Most returns:
> clean.

Rare complications:
- enemy,
- hazard,
- something following,
- collapse,
- injured traveler,
- shortcut event.

Cap complications tightly; return should not become a second expedition.

Return can kill the player.

---

# 48. Guardians

## 48.1 Guardian-class creature — LOCKED

At a Stratum boundary:
> a stronger variant of a creature from that Stratum appears.

A “roided-out goon” is completely acceptable.

Examples:
- Goblin Bulwark/Warchief,
- Elder Slime,
- Dire Rat,
- Guardian Troll.

## 48.2 First Guardian persists until defeated — LOCKED

If the first F20 Guardian is a Goblin Bulwark and the player loses:
- it heals to full,
- remains the Goblin Bulwark,
- keeps its behavior/moves,
- player can learn it across attempts.

## 48.3 First defeat opens progression — LOCKED

Defeating it permanently opens the next Stratum.

Future Guardians do **not** re-lock progression.

## 48.4 Guardian respawn — LOCKED DIRECTION

After roughly:
> **1 in-game week / 5 days**

(provisional), the Guardian slot may generate a new Guardian-class creature from the Stratum.

It may be a different species.

## 48.5 Farming — LOCKED

Future Guardians are optional farming/challenge content with special loot.

Possible rewards:
- Guardian Core,
- rare material,
- increased Rare/Cursed roll,
- special crafting drop,
- Guardian-specific variant.

---

# 49. True Bosses

## 49.1 Handcrafted — LOCKED

Bosses should be authored with:
- unique telegraphs,
- lore,
- phases,
- mechanics,
- special drops,
- world consequences.

They are **not** automatically every Stratum endpoint.

---

# 50. Layered Event Generator

## 50.1 Core LWE primitive — LOCKED

Use:

> **Context → Category Roll → Subcategory Roll → Eligibility Filter → Weighted Selection → Event Resolution → World-State Update**

Do not use one giant random table.

## 50.2 Pit top-level categories — CURRENT

Possible:
- Quiet,
- Encounter,
- Opportunity,
- Discovery,
- Special.

Encounter may branch to:
- Combat,
- Traveler,
- Hazard,
- Corpse,
- Merchant.

## 50.3 Eligibility — LOCKED

Events can require tags such as:
- stratum:frozen,
- weather:rain,
- generation>=5,
- world_knows:moonleaf,
- player_has:cursed_item,
- npc:Mira_alive,
- predecessor_died_here.

Ineligible content is removed before selection.

## 50.4 Recent-event memory — LOCKED DIRECTION

Suppress repetitive RNG.

Examples:
- repeated Combat → temporarily lower Combat weight,
- no Opportunity for a while → mild Opportunity boost.

Do not strongly pity major Discoveries. Some may remain undiscovered for generations.

---

# 51. World Knowledge

## 51.1 Player knowledge ≠ HearthVale knowledge — LOCKED

Possible internal knowledge states:
- Unknown,
- Rumored,
- Confirmed,
- Mapped.

Exact UI labels are optional.

## 51.2 Cleared ≠ fully discovered — LOCKED

Gen 1 can clear Stratum II and miss Crystal Lake.

Gen 2 can revisit for materials and discover it later.

Old Strata remain useful.

---

# 52. NPC Adventurers in The Pit

## 52.1 They can live independently — LOCKED

NPC adventurers can:
- expedition,
- take Guild jobs,
- succeed,
- fail,
- lose Hearts,
- die,
- reveal mundane knowledge.

## 52.2 Rare NPC depth progress — LOCKED

Roughly 90% of meaningful deepest-Floor progression should still feel player-driven.

NPCs may **rarely** increase:
> deepest confirmed Floor.

## 52.3 NPCs cannot consume key player content — LOCKED

They should not:
- trigger major scripted events,
- beat major handcrafted Bosses for the player,
- solve major mysteries,
- consume key discoveries/floors/events.

Example of allowed living-world behavior:
> Player fails to find an herb patch around F33. Later Rowan tells them he discovered a patch there.

---

# 53. World Modifiers Instead of Giant Simulation

## 53.1 Preferred LWE pattern — LOCKED

Use:
> **Discovery/Event → World Modifier(s) → existing generators react**

rather than simulating an entire economy/geology/ecology continuously.

## 53.2 Goblin Market example — LOCKED EXAMPLE

F76:
> Goblin Market discovered.

Later surface dwellers occupy it.

Possible consequences:
- Goblin gear becomes cheaper/more common in HearthVale,
- Goblins suffer weapon shortages,
- Goblin equipment quality drops,
- Goblin drop tables change,
- Goblins begin carrying Orc Axes / stolen human swords / improvised clubs.

One world-state change creates the illusion of a broader arms economy.

---

# 54. Loot Generation

## 54.1 Generated variants — LOCKED

Use:
> **Base Item + Material + Modifier(s) + Maker/History**

Not just:
> Sword +1 / +2 / +3.

## 54.2 Quality — LOCKED DIRECTION

Possible:
- Crude,
- Normal,
- Fine,
- Masterwork.

## 54.3 Material discoveries — LOCKED

Example:
> Frozen Lake → Frost Crystal → Frost equipment enters later markets/loot pools.

Different worlds can develop different item cultures.

## 54.4 Maker traditions — LOCKED DIRECTION

A smith can develop a recognizable style:
> Finn’s Iron Sword → Finn-style gear → technique persists beyond Finn.

## 54.5 History variants — LOCKED

An ordinary item can become unique because of what actually happened with it.

Example:
> Iron Sword → Pit-Worn Sword → Guardian-killing heirloom → historical artifact.

---

# 55. Loot Weirdness Across Generations

## 55.1 Early coherent, later strange — LOCKED DIRECTION

Early generations:
> coherent family-specific modifiers.

Around Gen 4–5:
> broaden to cross-family/weirder combinations.

Later:
> stranger compatible combinations become more common.

Do not announce this as a meta unlock; the player should simply notice that loot is getting weird.

---

# 56. Cursed and Blessed Items

## 56.1 More Cursed than Blessed — LOCKED

It is the Abyss.

## 56.2 Cursed design — LOCKED

Most Cursed gear:
> **powerful upside + meaningful downside**.

Do not make negative-only junk common.

Core loot rule:
> **Loot should make you think, not constantly disappoint you.**

## 56.3 Blessed design — LOCKED DIRECTION

Blessed gear:
- rarer,
- cleaner,
- often tied to surface religion, smiths, families, relationships, history.

Blessed gear found inside The Pit may imply someone carried it there.

---

# 57. Item Provenance and Retroactive Story

## 57.1 Lost blessed sword example — LOCKED DESIGN DIRECTION

Player finds:
> Blessed Sword with initials / distinctive ribbon.

Later in HearthVale:
> an older woman recognizes it as her missing son’s weapon.

Choices might include:
- return it,
- keep it,
- lie.

This can create:
- reputation consequences,
- relationship events,
- a mini-store,
- a family business/history.

## 57.2 Player-created history uses same system — LOCKED

Provenance can store:
- created by,
- owned by,
- lost by,
- found at,
- blessed by,
- cursed by,
- inherited by,
- famous kill/event.

This lets Gen 5 find Gen 1’s actual sword using the same system as generated historical loot.

---

# 58. Town / Overworld

## 58.1 Scope — LOCKED DIRECTION

The game is essentially:
> **HearthVale + The Pit**

Do not add a giant traversable overworld.

## 58.2 Provisional hubs — CURRENT

Possible stable town menu:
- Castle,
- Guild Hall,
- Market,
- Tavern,
- Town,
- Home,
- The Pit.

Individual shops can live under hubs. Exact final list = **TBD**.

---

# 59. NPC Identity

## 59.1 Minimum important NPC model — LOCKED

Use:
- **Personality**
- **Goal**
- **Value**
- **Flaw**
- accumulated relationships/memories

Avoid a 30-variable personality simulator.

## 59.2 Names are generated — LOCKED

“Mira,” “Rowan,” “Jackson,” etc. are examples, not required hardcoded identities.

Gen 4 can have entirely different names and people.

---

# 60. NPC Goals

## 60.1 Goals progress without the player — LOCKED

Example:
> Open Apothecary

Possible internal stages:
- Dreaming,
- Preparing,
- Ready,
- Completed.

Exact stage model = **CURRENT**, not sacred.

## 60.2 NPCs can succeed without the player — LOCKED

Player can influence, accelerate, sabotage, support, or redirect. The world should not freeze because the protagonist ignored someone.

## 60.3 Goals can fail/change — LOCKED

NPCs may:
- fail,
- abandon a dream,
- adopt another goal,
- pass a dream to a child,
- create historical regret.

---

# 61. NPC Autonomy

## 61.1 Let them live — LOCKED

NPCs may autonomously:
- marry,
- have children,
- move,
- open/close businesses,
- expedition,
- lose Hearts,
- die.

This is ambitious but desired.

---

# 62. NPC Scale / Tiers

## 62.1 Do not simulate everyone deeply — LOCKED DIRECTION

Possible tiers:

### Major NPC
Full identity, goals, memories, relationships.

### Supporting NPC
Lighter model.

### Background population
Abstract/statistical.

Promote a background person if they become relevant.

Dead major NPCs can be compressed into historical records.

---

# 63. Generational NPC Continuity

## 63.1 Consequences survive; the person does not need to — LOCKED

Mira can die.

Her Apothecary may still exist generations later.

Do not keep active-simulating a dead NPC. Compress to:
- founder,
- discoveries,
- family,
- defining events,
- reputation/history.

## 63.2 World state changes future goal eligibility — LOCKED

If Gen 6 already has three forges, “open a blacksmith shop” should be less appropriate than:
- inherit family forge,
- modernize it,
- leave family business,
- defeat rival,
- restore abandoned forge.

## 63.3 Family influence — CURRENT

Children can be weighted by parent values/trades/traits, but may also reject/invert them. No strict personality genetics.

## 63.4 Fallback if simulation is too ambitious — LOCKED SAFETY NET

Worst-case viable implementation:
- refresh/reskin the cast each generation,
- preserve core roles,
- preserve world/business/material/history consequences.

This is still a valid HearthVale.

---

# 64. Relationships and Social Scenes

## 64.1 Relationship stages — CURRENT DIRECTION

Prefer visible stages over a 0–100 Affection bar.

Possible:
- Stranger,
- Acquaintance,
- Friend,
- Close,
- Bonded.

Bonded does not automatically mean romantic.

## 64.2 Spend Time — LOCKED DIRECTION

1 AP represents meaningful time with someone.

Eligible Scene can be generated from:
- personality,
- goal,
- value,
- flaw,
- relationship stage,
- memory,
- current world state.

## 64.3 Romance autonomy — LOCKED DIRECTION

NPCs can:
- initiate romance,
- confess,
- date/marry other NPCs.

The world does not wait for the protagonist.

---

# 65. Memories

## 65.1 Store meaningful memories only — LOCKED

Examples:
- promise made,
- promise kept/broken,
- saved someone,
- abandoned someone,
- gave important material,
- helped a business,
- failed escort.

Do not store every line of dialogue.

---

# 66. Reputation and Rumors

## 66.1 Tags, not a generic meter — LOCKED

Examples:
- Reliable Guide,
- Dangerous Guide,
- Keeps Their Word,
- Unreliable,
- Dragon Slayer,
- Town Darling,
- Walking Disaster.

## 66.2 Rumor → reputation — LOCKED DIRECTION

One failure:
> incident.

Repeated pattern:
> rumor.

More supporting evidence:
> mechanical Reputation Trait.

## 66.3 Reputation mostly dies with the person — LOCKED DIRECTION

Children do not automatically inherit “Dangerous Guide.” Extreme reputation may survive as family/history dialogue.

---

# 67. Guild

## 67.1 Guild functions — LOCKED DIRECTION

Guild Hall:
- **Contracts**
- **Records**
- **Training**

It also acts as HearthVale’s institutional memory of The Pit.

## 67.2 No Guild rank ladder — LOCKED

Do not use Bronze/Silver/Gold progression.

Use actual records:
- expeditions,
- depth,
- escorts,
- discoveries,
- Bosses,
- reputation.

---

# 68. Guild Contract Types

## 68.1 MVP contract types — LOCKED

Keep:
- **Exterminate**
- **Retrieve**
- **Escort**
- **Rescue**

Cull for now:
- Explore
- Delivery

## 68.2 Generated requesters — LOCKED

Basic Guild contracts do not require persistent NPCs.

Generate:
- name,
- profession,
- reason.

“Jackson” can exist only for one contract.

## 68.3 Persistent NPC requests are separate — LOCKED

If a real NPC asks for Moonleaf, that comes from the social/goal system, not generic Guild generation.

---

# 69. Open vs Dated Contracts

## 69.1 Open — LOCKED

No strict deadline.

Example:
> Ogre bounty.

Still not reserved for player; NPCs may claim it.

## 69.2 Dated — LOCKED

Examples:
- Escort departure,
- urgent Rescue,
- medicine Retrieve.

Failing an accepted dated contract may hurt reputation.

## 69.3 Posting expiration vs accepted commitment — LOCKED

Unaccepted posting expires:
> no personal consequence.

Accepted commitment expires:
> consequence.

## 69.4 Open can become Dated — LOCKED

Example:
> Ogre begins injuring people → open bounty becomes urgent.

---

# 70. Rumors vs Contracts

## 70.1 Rumor ≠ normal quest — LOCKED

Example:
> “Someone saw a Golden Slime.”

It may be false.

## 70.2 Investigation auto-resolution — LOCKED DIRECTION

If player chooses to investigate:
- track relevant searches/actions,
- after enough failed relevant attempts, auto-resolve or escalate.

Illustrative user suggestion:
> around 5 relevant attempts.

Possible outcomes:
- false,
- misidentified,
- someone else solved it,
- location narrowed,
- rumor confirmed,
- real contract created.

Canonical funny example:
> the “Golden Slime” was a normal slime eating lemons.

---

# 71. NPCs and Guild Work

## 71.1 NPCs take contracts — LOCKED

The board does not wait for the player.

NPCs may:
- take jobs,
- succeed/fail,
- gain reputation,
- get hurt,
- reveal mundane knowledge.

---

# 72. Economy

## 72.1 Gold — LOCKED

Surface money used for:
- gear,
- repairs,
- consumables,
- services,
- gifts,
- housing,
- business,
- mercenaries.

## 72.2 Essence — LOCKED

Pit magic fuel + Pit purchasing power.

## 72.3 Loot/materials bridge Pit and HearthVale — LOCKED

Bring home:
- monster materials,
- ore,
- Frost Crystal,
- Tomes,
- equipment,
- artifacts.

Then:
- sell,
- craft,
- give to NPC,
- unlock world changes.

Do not simply convert Essence directly into Gold.

---

# 73. Businesses

## 73.1 Player can build/own a business — LOCKED

Business may generate passive income. Exact accounting is **TBD**.

## 73.2 Business inheritance matters — LOCKED

If Gen 1 spent a life building a shop, Gen 2 should be able to inherit it.

## 73.3 Inheritance is an obligation — LOCKED

The user wants this punishing enough to prevent infinite passive-income snowballing.

If inheriting generation ignores the business:
- it may fail,
- be sold,
- pass to an NPC/family member,
- close.

## 73.4 Sale can become family Gold — LOCKED DIRECTION

A predecessor may sell the neglected business. Next generation gets more money but no shop.

## 73.5 Old family property can be reclaimed — LOCKED DIRECTION

A later generation may buy the old family business back.

---

# 74. Retirement

## 74.1 Planned retirement should be rewarded — LOCKED

Possible benefits:
- choose successor,
- settle business,
- choose heirloom,
- transfer wealth,
- become mentor NPC.

Reward = **control over legacy**, not only a numeric prestige multiplier.

## 74.2 Retired player becomes semi-protected NPC — LOCKED

They may:
- mentor,
- run business,
- socialize,
- age,
- die.

LWE should not randomly destroy the life the player deliberately established.

---

# 75. Succession

## 75.1 Unplanned successor requires mentee — LOCKED

Unexpected death only produces immediate continuation if the player had already started mentoring someone.

Otherwise:
> new character.

## 75.2 Mentee succession — LOCKED

Can happen days/weeks later, preserving current-era problems.

## 75.3 No mentee → New Beginning — LOCKED

Years may pass, then a new adventurer begins.

---

# 76. Successor Types

## 76.1 Planned possibilities — LOCKED DIRECTION

Possible:
- child,
- grandchild,
- apprentice,
- relative,
- young Guild adventurer,
- new arrival.

The world is the true save, not the bloodline.

## 76.2 Gacha-like candidate selection — CURRENT

At generation start, player may choose among generated candidates with different:
- traits,
- backgrounds,
- starting stats,
- connections.

Do not assume predatory monetized gacha.

---

# 77. Inheritance and Prestige

## 77.1 Do not erase the early growth arc — LOCKED

Do not let late generations inherit:
- every legendary item,
- max stats,
- absurd liquid Gold.

Every new character should still grow.

## 77.2 Persistent assets are legitimate — LOCKED

Family business/home/storage are not unfair bonuses; they are world assets the player built.

## 77.3 Heirlooms — CURRENT / TBD

A small curated heirloom transfer is desirable. Exact number/rules are not locked.

## 77.4 New Arrival must remain appealing — LOCKED DIRECTION

Family successor:
- assets,
- connections,
- history.

New Arrival:
- potentially rarer/stranger starting traits/backgrounds.

---

# 78. Mentorship

## 78.1 Succession insurance — LOCKED

Mentoring means:
> “If I die, someone can continue.”

Creates AP tension between training self and preparing future successor.

## 78.2 Living mentor benefit — LOCKED DIRECTION

Retired predecessor may provide:
- training,
- advice,
- supplies,
- repairs,
- unique social scenes.

When mentor dies, the advantage disappears naturally.

---

# 79. Corpses and Remains

## 79.1 Player remains persist — LOCKED

If a player dies in The Pit, later generations may find the remains.

Store:
- name,
- generation,
- approximate death location,
- cause,
- equipment,
- backpack,
- historical tags.

## 79.2 Recover equipment — LOCKED

Later generation can recover predecessor gear. It may become a genuine artifact of the player’s own save.

## 79.3 Relationship-aware text — LOCKED DIRECTION

Unrelated adventurer:
> Guild tag identifies corpse.

Child/apprentice:
> recognizes sword/gear first.

---

# 80. Companions, Mercenaries, Escorts

## 80.1 Core support count — LOCKED

Normally:
> **1 chosen Companion or Mercenary**

Escort mission may add:
> **1 temporary Escort/Ward**

So player + companion + escort is allowed.

## 80.2 Full party system — LATER BOX

Defer:
- 3+ active party,
- formations,
- direct companion turns,
- party synergies,
- multi-target combat.

## 80.3 Companion support package — LOCKED DIRECTION

Companions do not need independent combat turns.

Possible benefits:
- temporary stat buff,
- limited free spell,
- Intervene,
- repair,
- discovery support,
- loot/resource bonus,
- inventory bonus.

## 80.4 Mercenaries — LOCKED DIRECTION

Pay Gold per expedition for predictable support.

Examples:
- Shieldbearer,
- Scout,
- Field Mage,
- Priest,
- Porter,
- Miner.

Mercenary = money risk. Named companion = relationship/life risk.

---

# 81. Companion HP / Hearts

## 81.1 No companion HP — LOCKED

Companions and escorts do **not** track HP.

Player HP represents immediate expedition combat condition.

## 81.2 Shared Heart-loss event — LOCKED

If the player loses a Heart while a companion/escort is present:
> they also lose a Heart.

Their own Heart count determines whether that:
- scars,
- cripples,
- kills them.

Same catastrophe can create different Scars.

## 81.3 Companion Sanity — TBD

Explicitly revisit later. Do not add now.

---

# 82. Escort Benefits and Consequences

## 82.1 Escort is not another HP bar — LOCKED

Escort profession can provide a temporary benefit.

Examples:
- Blacksmith → Field Maintenance,
- Herbalist → extra gathering,
- Mage → free spell,
- Scout → navigation/return support,
- Merchant → appraisal bonus.

## 82.2 Bad guide reputation — LOCKED DIRECTION

Repeatedly returning with escorts maimed/dead can create:
- rumors,
- “Dangerous Guide” reputation,
- employers refusing service,
- reduced reward.

---

# 83. Combat Stress-Test Record

## 83.1 Test 1 — Cave Troll

Tested:
- Sword,
- Hammer,
- Shield,
- Dodge,
- Counterattack,
- Stagger,
- durability,
- Knockdown.

Established:
- physical misses do not cost DUR,
- Hammer Impact can interrupt some attacks,
- Counterattack is all-in,
- Natural + Equipped Armor always apply physically,
- Stagger only cancels current action,
- Knockdown steals next offensive action.

Outcome:
> player won.

## 83.2 Test 2 — Goblin Hexer

Tested:
- FAR,
- Throwing Knife,
- magic,
- Dodge,
- closing distance,
- fleeing,
- Pursue.

Established:
- throwing weapons are ammo stacks,
- physical Armor does not stop pure magic,
- magic base damage should be lower,
- Close Distance costs an action,
- spell miss still costs Essence,
- enemy escape can deny loot without killing player.

Outcome:
> Hexer escaped at 1 HP.

## 83.3 Test 3 — Multiple enemies

Three independent Goblins instantly exposed fatal action-economy problems.

Decision:
> **SCRAP independent multi-enemy combat.**

Use Group enemies.

## 83.4 Test 4 — Venomous Mirecrawler

Tested:
- Poison,
- Antidote,
- Flooded Ground,
- Disadvantage,
- Natural Armor,
- Ambush,
- Knockdown,
- item action cost.

The user explicitly liked this test because it **made them think about their actions**.

Outcome:
> player won but spent substantial HP/resources.

## 83.5 Test 5 — Goblin Bulwark Guardian

Observed behavior:
- giant shield/frontal defense,
- charge,
- Sharpen,
- heavy cleave,
- Shield Bash Knockdown,
- high Stability.

The player learned:
- Ember bypasses normal shield protection,
- successful high Dodge can create Opening,
- Impact-5 Hammer cannot stop the heavy cleave,
- Sharpen makes cleave worse,
- Shield Bash knocks down,
- enemy may use a buff instead of attack.

Outcome:
> player lost a Heart.

This was successful because the failed attempt generated **usable knowledge for the next attempt**.

---

# 84. Guardian Persistence Rule — LOCKED

The Goblin Bulwark remains the F20 Guardian until defeated.

After player disengages:
- Bulwark heals to full,
- identity/moves remain.

Only after first defeat does the Guardian slot later reroll.

---

# 85. What HearthVale Combat Is Becoming — LOCKED DIRECTION

HearthVale combat is fundamentally:
> **read one dangerous opponent and make meaningful low-number decisions.**

Important questions:
- Attack?
- Block?
- Dodge?
- Counterattack?
- Use item?
- Spend Essence?
- Risk Impact?
- Flee?

Difficulty should come from:
- telegraphs,
- status,
- terrain,
- attrition,
- knowledge,

not giant stats alone.

---

# 86. Explicitly Rejected / Superseded Ideas

Future collaborators should not casually reintroduce these.

## Rejected
- 1 AP = one Floor.
- 1 AP = fixed 10 Floors.
- dungeon stamina/exploration-point meter.
- traditional Light/Medium/Heavy armor classes.
- stat requirements to equip weapons.
- stat requirements to cast spells.
- CON directly raising Max HP.
- 0–100 Sanity.
- generic 0–100 Reputation.
- Guild Bronze/Silver/Gold rank ladder.
- multiple independent hostile turns.
- automatic “known route to F28” because player reached it before.
- one monster species hardcoded to one Floor.
- every Stratum ending in a handcrafted Boss.
- Guardian rerolling because the player lost.
- Stagger giving a free stun turn.
- physical misses always costing durability.
- ordinary Poison naturally expiring in a few turns.
- ordinary Poison stacking huge damage.
- companion HP bars.
- mandatory full party system in core.
- giant fully simulated Stratum geology/ecology for MVP.

## Superseded
- Natural Armor only on failed Dodge → **Natural Armor now always applies to physical damage.**
- HP 0 directly teleports to town → **Heart loss ejects from combat back into exploration state.**
- strict four/five-year skip every Life Chapter → **skip length may vary.**
- 1–10 stat cap → **1–20 mortal cap.**
- separate magical Strain tracker → **exponential Essence cost is the strain indicator.**
- throwable individual durability/retrieval → **throwing weapons are ammo stacks.**


---

# 87. Open Design Backlog — What Still Needs to Be Tackled

This section is deliberately explicit. It is the continuation checklist for another AI/designer.

## 87.1 NEXT: Post-Combat Rewards / Expedition Payoff — VERY HIGH PRIORITY

This was the exact next topic when this document was requested.

Need to define:
- monster XP rewards,
- whether XP is awarded per kill/Scene/expedition,
- loot rolls,
- monster material drops,
- Essence drops,
- dedicated loot-room rewards,
- Guardian first-clear and farm rewards,
- sub-dungeon reward guarantees,
- Rare/Cursed/Blessed roll chances,
- whether victory loot is automatic or another Room/action,
- how reward value compares against durability/consumable loss,
- how old Strata stay economically useful.

Core question:
> **Why was spending AP, HP, DUR, ammo, Essence, consumables, and Heart risk worth it?**

---

## 87.2 Character Level System — VERY HIGH PRIORITY / TBD

Need to answer:
- What makes Level increase?
- Does Level consume or merely reference XP?
- How does expendable stat-training XP interact with Level?
- Does Level give Max HP only, or more?
- Level cap?
- How does Level avoid replacing trained stats?

Do not undermine the locked XP + training system.

---

## 87.3 HearthVale-Specific d20 Curve — HIGH PRIORITY / TBD

5e math is temporary.

Need:
- what Stat 1/10/20 mean,
- expected early/Veteran stat spreads,
- stat modifier formula,
- monster Defense/DC by depth,
- how often equal-preparation attacks should hit,
- how “slightly weaker than the Abyss” feels numerically.

---

## 87.4 Max HP Curve — TBD

Need:
- starting HP,
- HP per Level/milestone,
- equipment HP bonuses,
- plausible Lv20/Lv70 HP,
- how to keep small damage meaningful late-game.

---

## 87.5 Natural Armor Curve — TBD

Need CON thresholds and maximum Natural Armor at CON 20.

Goal:
- CON is useful,
- but does not become mandatory/god-stat.

---

## 87.6 Base Weapon Numbers — HIGH PRIORITY / TBD

Need baseline tables for:
- Sword,
- Axe,
- Hammer,
- Bow,
- Shield,
- Wand,
- Staff,
- Tome,
- Throwing weapons.

Fields:
- Damage,
- Impact,
- Block,
- DUR,
- Range,
- any family rule.

---

## 87.7 Axe Identity — TBD

Currently only “damage specialist.” Need to decide what makes Axe distinct from Sword/Hammer:
- armor penetration?
- bleed?
- crit interaction?
- poor Block?
- durability trade?

Do not add complexity merely to make it different.

---

## 87.8 Bow Rules — TBD

Need:
- Bow DUR timing,
- arrow consumption on miss,
- arrow availability rates,
- special arrows,
- variants,
- ranged enemy interactions.

---

## 87.9 Spell Library — HIGH PRIORITY / TBD

Need an MVP spell list including practical utility.

Candidates:
- Ember / basic damage,
- Unlock,
- Heal/Mend,
- Barrier,
- status spell,
- movement/utility,
- possibly force/Knockdown magic.

Need to define:
- Damage,
- INT checks,
- WIS danger,
- Essence escalation behavior,
- Impact/interrupt where relevant.

---

## 87.10 WIS Overcasting Threshold — HIGH PRIORITY / TBD

Need formula/table for:
- when WIS checks begin,
- how WIS pushes threshold,
- increasing check difficulty,
- Sanity cost on failure,
- whether certain dangerous spells modify threshold.

---

## 87.11 Mana Potion / Cast Reset — TBD

Need:
- full reset vs partial reset,
- rarity,
- price,
- stack size,
- crafting,
- Tome interactions.

---

## 87.12 Sanity Pool and Recovery — HIGH PRIORITY / TBD

Need:
- default/max pips,
- whether max Sanity grows,
- ordinary recovery opportunities,
- how common −1 events are,
- phobia/Scar interactions.

---

## 87.13 Heart-Loss Scar Tables — TBD

Need context-driven candidate pools for:
- first Heart loss,
- second Heart loss,
- physical vs psychological,
- Boss/Guardian-specific events,
- prosthetic/coping/treatment rules.

---

## 87.14 Heart Restoration Content — LATER DESIGN

Need:
- rare sources,
- world-specific availability,
- limits per character,
- tradeoffs,
- relationship to Cursed/Blessed death protection.

---

## 87.15 Abyss Bargain System — LATER DESIGN

Need:
- eligibility,
- bargain presentation,
- consequence pools,
- how much the player knows before accepting,
- generational debts,
- anti-immortality limits.

---

## 87.16 Enemy Generation — HIGH PRIORITY / TBD

Need:
- creature families,
- Stratum compatibility,
- HP/Damage/Defense/Armor,
- move templates,
- telegraph text,
- Stability,
- status behavior,
- rarity/variant rules.

---

## 87.17 Guardian Template — HIGH PRIORITY / TBD

Need to define how a normal creature becomes Guardian-class:
- HP increase,
- Damage increase,
- Stability increase,
- move upgrades,
- additional behavior,
- loot multiplier/table,
- first-clear bonus,
- respawn/farming rules.

---

## 87.18 Boss Design Rules — LATER

Need:
- rough authored Boss count,
- placement,
- discovery conditions,
- phases,
- relationship to Floor 100 story.

---

## 87.19 Group Enemy Rules — TBD

Need:
- Group HP thresholds,
- member loss behavior,
- moves disappearing,
- group-target bonuses/AOE.

---

## 87.20 Status List — TBD

Finalize MVP rules for:
- Burning,
- Bleeding,
- Restrained,
- Blinded,
- Weakened,
- Knockdown,
- Poison.

Keep UI clean.

---

## 87.21 Environmental Tags — TBD

Possible:
- Flooded,
- Ice,
- Darkness,
- Narrow,
- Heat,
- Toxic.

Prefer:
- Advantage/Disadvantage,
- eligibility changes,

over stacks of numeric modifiers.

---

## 87.22 Floor Scene/Descent Weights — HIGH PRIORITY / TBD

Need:
- average Scenes before descent appears,
- anti-frustration minimum/maximum,
- whether some Scenes contribute more,
- how sub-dungeons pause/alter Floor progress.

---

## 87.23 Stratum Generation — HIGH PRIORITY / TBD

Need:
- expected number of Strata across ~100 Floors,
- archetype list,
- 8–12 Floor roll rules,
- fixed tutorial/final Strata,
- rare Strata,
- compatibility/exclusion rules.

---

## 87.24 Waystone Generation — TBD

Need:
- minimum/maximum spacing,
- boundary rules,
- forbidden Boss/Guardian proximity,
- activation/use rules.

---

## 87.25 Shortcut Rules — TBD

Need:
- discovery chances,
- how many Floors may be skipped,
- one-way vs two-way,
- special requirements,
- whether NPCs may reveal mundane shortcuts.

---

## 87.26 Return Risk Formula — TBD

Need:
- distance bands,
- complication probability,
- max complications,
- modifiers from Scouts/items/shortcuts,
- whether Return can produce meaningful discoveries (likely restricted).

---

## 87.27 World Knowledge Registry — HIGH PRIORITY / TBD

Need data model for:
- Unknown,
- Rumored,
- Confirmed,
- Mapped,
- source,
- location,
- confidence,
- date/generation.

Guild contract/rumor systems should query this.

---

## 87.28 NPC Discovery Boundary — TBD

Broad principle is locked; implementation still needs explicit tags for:
- mundane NPC-discoverable content,
- player-reserved content,
- key scripted content.

---

## 87.29 Guild Contract Generator — HIGH PRIORITY / TBD

Need schemas for:
- Exterminate,
- Retrieve,
- Escort,
- Rescue.

Each needs:
- requester flavor,
- target eligibility,
- known/rumored requirements,
- reward,
- Open/Dated state,
- expiration,
- NPC completion,
- failure effects.

---

## 87.30 Rumor System — TBD

Need:
- rumor generation,
- truth/misidentification,
- attempt counter,
- auto-resolution,
- escalation to real contract,
- Tavern/Guild delivery.

---

## 87.31 Reputation Tags — TBD

Need:
- pattern thresholds,
- rumor strength,
- tag acquisition,
- fading/decay,
- conversion to family/history.

---

## 87.32 NPC Goal Templates — HIGH PRIORITY / TBD

Need:
- schema,
- stages,
- progress odds/rules,
- player intervention,
- failure,
- successor goals,
- world-state eligibility.

---

## 87.33 NPC Autonomous Resolution — HIGH PRIORITY / TBD

Need:
- daily vs interlude resolution,
- Heart-loss risk,
- marriages/births,
- business changes,
- goal progress,
- movement/retirement.

Use simple rules, not a giant simulation.

---

## 87.34 NPC Tier Promotion/Compression — TBD

Need:
- Major/Supporting/Background rules,
- promotion triggers,
- compression on death/history,
- which memories survive.

---

## 87.35 Relationship Mechanics — HIGH PRIORITY / TBD

Need:
- stage thresholds,
- hidden numeric backing if any,
- romance transition,
- NPC initiation,
- marriage/family,
- conflicts.

---

## 87.36 Social Event Templates — TBD

Need reusable scenes such as:
- friend needs help,
- celebration,
- argument,
- confession,
- business support,
- grief,
- goal setback.

---

## 87.37 Business System — HIGH PRIORITY / TBD

Need:
- startup cost,
- passive income model,
- business treasury vs personal Gold,
- attention requirement,
- business events,
- managers,
- sale,
- failure,
- inheritance.

---

## 87.38 Inheritance Rules — TBD

Need:
- heirloom count,
- personal/family Gold,
- business ownership,
- home/storage,
- connections,
- outsider compensation.

---

## 87.39 Retirement Rules — TBD

Need:
- when retirement becomes available,
- succession flow,
- legacy settlement,
- retired NPC behavior.

---

## 87.40 Mentorship Rules — TBD

Need:
- how to start mentoring,
- AP/training cost,
- mentee growth,
- successor eligibility,
- post-retirement mentor benefits,
- what happens if mentor dies.

---

## 87.41 Corpse/Remains Generator — TBD

Need:
- persistence length,
- spawn chance,
- item loss/decay,
- recognition text,
- recovery rules.

---

## 87.42 Companion Support Packages — TBD

Need tables for:
- stats,
- limited spells,
- Intervene,
- repair,
- mining/foraging,
- inventory,
- discovery/return help.

---

## 87.43 Escort Support Packages — TBD

Need profession packages for:
- scholar,
- merchant,
- blacksmith,
- mage,
- herbalist,
- scout.

---

## 87.44 Companion Sanity — LATER BOX

Explicitly deferred.

---

## 87.45 Full Party System — LATER BOX

Explicitly deferred.

---

## 87.46 Dynamic Stratum Change — SMALL SCALE / LATER

Do not build full geology/ecology simulation.

Small authored world modifiers are allowed:
- Goblin Market occupation,
- monster nest destroyed,
- Ancient Forge restored.

Revisit larger dynamic changes later.

---

## 87.47 Loot Modifier Tables — TBD

Need:
- family-specific modifiers,
- general modifiers,
- Cursed,
- Blessed,
- rarity,
- Gen 4–5 cross-family weighting.

---

## 87.48 Item Provenance Data Model — TBD

Need fields for:
- creator,
- owners,
- lost/found location,
- famous kills,
- blessing/curse,
- inherited generations,
- historical significance.

---

## 87.49 Economy Numbers — TBD

Need:
- Guild rewards,
- prices,
- repairs,
- mercenaries,
- loot sale value,
- business income,
- Guardian reward value,
- consumable pricing.

---

## 87.50 Crafting / Smithing — TBD

Need:
- direct player crafting vs commissions,
- recipes,
- repairs,
- material integration,
- unlocking discovered materials.

---

## 87.51 Home / Storage / Housing — TBD

Need:
- starting storage,
- upgrades,
- family home inheritance,
- whether homes deteriorate/require maintenance.

---

## 87.52 Town Location List — TBD

Decide whether provisional hubs are final:
- Castle,
- Guild Hall,
- Market,
- Tavern,
- Town,
- Home,
- The Pit.

---

## 87.53 Starting Character Generation — TBD

Need:
- number of candidates,
- stat allocation,
- traits,
- backgrounds,
- rerolls,
- family successor vs outsider generation.

---

## 87.54 Generation 0 Story — LATER STORY DESIGN

Need:
- founder name,
- treasure/proof,
- tutorial mechanics,
- first Heart lesson,
- speech,
- transition to Gen 1.

---

## 87.55 Floor 100 Truth — TBD

Need final in-world answer.

---

## 87.56 LWE Rain Signature — LATER FLAVOR

Need exact recurring rain date(s).

---

## 87.57 Save Slot Count — TBD

Need:
- exact number,
- UI,
- autosave/manual structure,
- death/reload messaging.

---

## 87.58 UI / UX Pass — HIGH PRIORITY BEFORE PROTOTYPE

Need layouts for:
- YOUR ATTACK vs INCOMING ATTACK,
- HP/Hearts/Sanity,
- durability,
- range,
- statuses,
- next Essence cost,
- inventory,
- Waystone planning,
- Guild board,
- relationships.

---

## 87.59 MVP Scope — VERY HIGH PRIORITY

Before building the full 100-Floor generational dream, define a small proof slice.

A sensible MVP should prove something like:
- one town loop,
- one Stratum,
- a few Floors,
- layered Scenes/Rooms,
- one Waystone,
- one Guardian,
- several enemy types,
- Heart loss,
- Sanity,
- 4/4/4 loadout,
- Essence escalation,
- a few NPCs,
- one NPC goal,
- one business or persistent world change,
- one generation transition.

The full generational simulation should **not** be the first implementation target.

---

# 88. Guiding Tests for Every New Feature

Before adding a system, ask:

1. Does this make **the character’s life** more meaningful?
2. Does this make **The Pit** more strategically interesting?
3. Does this create or interact with a **persistent world consequence**?
4. Can it use **small numbers and simple phone UI**?
5. Can LWE create the illusion using **state + templates** instead of massive simulation?
6. Does it reward **player knowledge**?
7. Is the complexity mostly under the hood, or are we making the player do math?
8. Is it Core, or does it belong in the **Later Box**?

If it adds math without meaningful decisions:
> simplify it.

If it removes risk just because the player has seen a Floor before:
> reconsider it.

If smart preparation creates a ridiculous build:
> **let the player cook until playtesting proves it actually breaks the game.**

---

# 89. HearthVale in One Paragraph

**HearthVale is a phone-first scripted-text generational life RPG powered by the Living World Engine. The player lives in one evolving settlement built around a roughly 100-Floor dungeon called The Pit, spends limited daily AP on life, training, relationships, business, and expeditions, and explores the dungeon through layered random-linear Scenes whose important discoveries persist across generations. Combat is a low-number one-on-one duel system built around telegraphs, Attack/Block/Dodge/Counterattack, durability, physical versus magical defense, Impact/Stability/Stagger, Hearts, Sanity, status effects, and Essence whose spell cost doubles with repeated casting while also serving as Pit currency. Characters die often; HearthVale remembers. A player may retire and choose a successor, die into a prepared mentee, or leave the town to move on for years before a new adventurer arrives. Shops, landmarks, item traditions, reputations, corpses, families, Guild records, materials, and historical consequences can outlive the person who created them. The central promise is that every character is temporary, but the HearthVale created by all of them belongs uniquely to the player.**

---

# 90. Immediate Continuation Point

When this handoff was requested, the first combat stress-test suite had just ended.

The **next design topic** was explicitly:

> ## **Post-combat rewards / expedition payoff**
>
> Define what the player actually earns for spending AP, HP, durability, ammunition, consumables, Essence, and potentially Hearts inside The Pit.

Unless the user deliberately changes direction, continue from there.
