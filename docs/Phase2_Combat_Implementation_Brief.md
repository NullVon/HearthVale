# HearthVale Vertical Slice — Phase 2 Combat Implementation Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Approved for implementation**
Owner: **Implementation followed by maintainer review**
Scope: Phase 2 only. Do not fold Phase 3 economy/RNG or Phase 5 spell-overhaul work into this pass.

## Goal

Replace the current binary hit/miss + fixed Dodge-DC combat with a readable combat model built around:
- relative DEX and attack Speed,
- Glancing / Normal / Critical hit quality,
- meaningful Dodge / Block / Counterattack choices,
- distinct Stagger vs Knockdown behavior,
- decision-first combat UI.

Preserve the Phase 1 rule:
> **Normal mode shows decisions. Dev mode may show machinery.**

Every reachable combat state must still contain at least one action that advances resolution.
## 2A — DEX / Dodge (LOCKED)

Enemies receive authored combat stats. For this pass they need at least **STR** and **DEX**; additional stats may be added only where an existing mechanic requires them.

Every physical weapon and offensive enemy move receives an integer **Speed** modifier.

`Effective Attack DEX = Attacker DEX + Attack Speed`

`Dodge Difference = Defender DEX - Effective Attack DEX`

Ordinary Dodge chance:
- difference <= 0 -> **0%**
- difference +1 -> **25%**
- difference +2 -> **50%**
- difference >= +3 -> **75%**
- ordinary cap = **75%**
- no ordinary 100% Dodge case in this phase.

Player attacks: the enemy automatically gets its authored Dodge chance.
Enemy attacks: the player only rolls this Dodge chance when choosing **Dodge**. Block and Counterattack deliberately give up Dodge.

Do **not** carry the legacy Quick `+2 Dodge check` into this percentage system. Keep Quick's unrelated uses intact; combat-Dodge treatment for Quick is deferred until separately tuned.
## 2B — Hit Quality (LOCKED)

If an attack is not Dodged, it **connects** and receives a hit-quality roll.

Roll:
`d20 + attack quality stat`

Thresholds:
- total 1-9 -> **Glancing**
- total 10-19 -> **Normal**
- total 20+ -> **Critical**

Damage multiplier:
- Glancing = **x0.5**
- Normal = **x1**
- Critical = **x1.5**
- round fractional raw damage **up** before Defense.

Current quality stats:
- Sword -> STR
- Hammer -> STR
- Bow -> DEX
- Bare Hands -> STR
- enemy moves -> authored per move from enemy combat stats
- spells remain deferred to the Phase 5 spell overhaul unless required for compatibility.

Hit quality changes **Damage only** in Phase 2. Do not scale Impact by Glancing/Critical.

A connected hit may still be reduced to **0 HP damage** by Defense. The old dead-turn problem is solved by removing binary attack misses, not by forcing armor penetration.
## 2C — Enemy Response (LOCKED)

### Dodge
- Uses the 0/25/50/75 relative-DEX probability above.
- Success: avoid Damage, Impact, Poison/on-hit effects, and contact wear.
- Failure: attack lands against passive physical protection only.
- Passive physical protection = Equipped Armor + Natural Armor (+ applicable explicit Barrier effects), but **no selected Block item**.

### Block
- No Dodge attempt.
- Enemy hit quality still resolves.
- Physical HP damage:
  `post-quality raw Damage - selected Block - Equipped Armor - Natural Armor`
- minimum final HP damage = 0.
- Spell/magic defense rules remain as already authored; do not silently make ordinary physical Block stop pure magic.

Block may use an eligible Shield or weapon with `canDefend`.
### Block durability (restore the handoff rule)

Use the attack's **post-quality raw physical Damage before Armor/Natural Armor** for wear classification.

For the selected Block item:
- raw Damage <= item Block -> **-1 DUR** (Withstood)
- raw Damage > item Block -> **-2 DUR** (Overwhelmed)
- raw Damage > item Max DUR -> **-3 DUR** (Overmatched)

Evaluate Overmatched first, then Overwhelmed, then Withstood.
Armor/Natural Armor must not protect the selected Block item from wear.

### Counterattack
Counterattack is the aggressive defensive option:
> **Eat the damage to attack again.**

- no Dodge,
- no selected Block,
- incoming hit resolves with passive Armor/Natural Armor,
- if the player survives, immediately make exactly one chosen retaliatory physical attack,
- no second Dodge/Block,
- no recursive Counterattack chain.
A Counterattack retaliation happens **after** the incoming hit, so it cannot Stagger an attack that already happened.
- retaliation may deal damage/kill normally,
- ordinary Stagger from the retaliation has no extra-action effect,
- if retaliation reaches the Knockdown threshold, Knockdown may still affect the enemy's next offensive action.

Physical weapons and Bare Hands are the Phase 2 Counterattack baseline.
Do not invent new spell-counterattack rules in this pass; spell reactions can be revisited with Phase 5.

## Stagger / Press the Advantage

A normal player attack that reaches Stagger:
- cancels the enemy's already committed current action,
- does **not** create a useless Continue / Round Outcome screen,
- immediately presents one **Press the Advantage** free attack.

The free attack:
- is exactly one attack,
- cannot create another Stagger/free-attack chain,
- may Knockdown if its Impact reaches the Knockdown threshold,
- after it resolves, advance to the next meaningful combat state automatically.
## Knockdown

Knockdown remains distinct from Stagger:
- current committed enemy action is cancelled,
- player receives the same one Press the Advantage attack,
- enemy also loses its **next offensive action** while recovering.

Do not collapse Stagger and Knockdown into one status.

## Provisional content values for initial playtest

These are tuning values, not sacred balance.

Player weapons:
- Sword: Speed 0, quality STR
- Hammer: Speed -1, quality STR
- Bow: Speed +1, quality DEX
- Bare Hands: Speed 0, quality STR

Enemy combat stats:
- Slime: STR 2, DEX 1
- Cave Beetle: STR 3, DEX 2
- Venom Spider: STR 1, DEX 4
- Pit Hound: STR 3, DEX 4
- Frenzied Adventurer: STR 3, DEX 2
- Ruin Brute: STR 4, DEX 1
Enemy move Speed / quality stat:
- Slime Bash: Speed 0, STR
- Body Slam: Speed -1, STR
- Mandible Snap: Speed +1, STR
- Shell Ram: Speed -1, STR
- Venom Bite: Speed +1, DEX
- Lunging Bite: Speed 0, DEX
- Hound Bite: Speed +1, STR
- Hound Maul: Speed -1, STR
- Pounce: Speed +1, DEX
- Wild Slash: Speed 0, STR
- Reckless Swing: Speed -1, STR
- Rock Throw: Speed 0, DEX
- Basic Swing: Speed 0, STR
- Heavy Swing: Speed -1, STR
- nonoffensive movement/recovery moves: Speed 0; no quality roll.

Remove dependence on enemy `attackDC` and move `dodgeDC` for combat accuracy/Dodge once the new model is active. Do not remove fields from old saves in a way that breaks compatibility unless migration is explicit and tested.
## Combat UI (LOCKED DIRECTION)

Normal incoming-attack presentation should expose decision-relevant values, e.g.:
- committed move label,
- base Damage,
- Impact,
- Speed,
- **Your Dodge chance: N%**.

Dev Mode may additionally show:
`Defender DEX - (Attacker DEX + Speed) = difference -> chance`
and the actual random/quality roll details.

Player attack tiles should show Speed and enough information to understand the choice. Showing the enemy's Dodge chance for that attack is encouraged because it is decision-relevant.

During the enemy response:
- Dodge is its own clear action.
- Eligible weapon/shield tiles own their Block/Counterattack choices.
- If one item can do both, use a small tile-scoped choice/reveal such as **Block | Counterattack** rather than unrelated global duplicate buttons.
- Bare Hands remains an available NEAR Counterattack fallback when legal.
Stagger presentation:
> **STAGGERED — [move] cancelled.**
> **Press the Advantage: choose one free attack.**

Knockdown presentation:
> **KNOCKED DOWN — [move] cancelled.**
> **Press the Advantage: choose one free attack.**
> The enemy will also lose its next offensive action.

No standalone confirmation screen between these messages and the next real decision.

## Likely implementation surfaces

Audit and modify only what is required, but likely:
- `HearthVale_Content/surface.js` — weapon Speed / quality-stat data
- `HearthVale_Content/expedition.js` — base enemy stats + move Speed/quality data
- `HearthVale_Content/encounters.js` — later enemy stats + move data
- `HearthVale_Content/validation.js` — validate new fields
- `HearthVale_Shell/src/expedition-checks.js` — shared Dodge/quality helpers
- `HearthVale_Shell/src/expedition-combat.js` — combat state machine rewrite
- `HearthVale_Shell/src/expedition-actions.js` — legal Dodge/Block/Counter/Advantage choices
- `HearthVale_UI/expedition-views.js` — decision-first combat presentation
- combat and browser tests.
## Save compatibility and invariants

Preserve:
- deterministic seeded Core RNG and exact save/reload continuation,
- one-enemy-at-a-time combat,
- Return Encounter no-retreat rule,
- Poison tick exactly once per completed round,
- Heart-loss / Auron behavior from Phase 1.2,
- Bare Hands softlock protection,
- current range commitments and enemy movement semantics,
- Phase 1 automatic removal of non-decision screens.

Legacy active-combat saves should either migrate/resume safely or fail with an explicit supported-save decision; do not silently double-resolve damage, Poison, wear, or rounds.

## Required tests before handoff

Add targeted deterministic tests for:
- all four Dodge bands and 75% cap,
- player weapon Speed changing enemy Dodge chance,
- enemy move Speed changing player Dodge chance,
- Glancing/Normal/Critical boundaries and rounding,
- Defense reducing a connected hit to zero,
- Dodge failure using passive Armor but no Block,
- Block wear 1/2/3 cases,
- Counterattack survival/death and no recursion,
- Stagger -> exactly one Press the Advantage attack,
- free attack cannot chain Stagger but can Knockdown,
- Knockdown consumes the next enemy offensive action,
- save/reload in every new combat phase without duplicate RNG/Poison/wear.
UI/browser tests must verify:
- Normal Mode shows Dodge %, Speed and meaningful decision labels,
- Dev Mode shows formulas/roll machinery,
- weapon/shield tiles own Block/Counterattack controls,
- no Round Outcome / Resolve Cancelled Round / empty Continue screen returns.

Run:
1. targeted Phase 2 combat tests,
2. `git diff --check`,
3. full `npm test`.

Do not rebalance enemy HP/economy/durability replacement rates in this pass except where a test fixture must be adapted to the new combat math. Those belong to later phases.

## Review handoff

When implementation is complete, report:
- exact files changed,
- any schema/save migration,
- any design ambiguity encountered instead of inventing a rule,
- targeted test result,
- full-suite result,
- concise list of behavior differences visible to the player.
