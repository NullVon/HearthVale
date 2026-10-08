# Phase 6 — Feedback + Auron + Progression Clarity Design Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Design locked for implementation planning**

Owner: **Implementation followed by maintainer review and playtesting**

Scope: Phase 6 only. Preserve the already-locked Phase 1–5 rules. This phase is primarily a presentation/clarity pass over systems that already exist.

## Goal

Make meaningful Actor and world changes understandable at the moment they matter, without creating notification spam or extra non-decision screens.

Core rule:

> **Surface meaningful consequences, not simulation noise.**

Presentation rule:

> **Important changes appear inline on the current or next meaningful screen. No modal. No separate Continue screen.**

Normal mode should explain what changed and why it matters. Dev Mode may expose machinery.
## 6A — Feedback Priority

Use three feedback levels.

### Immediate consequence
For events such as:
- Heart loss,
- Scar acquisition,
- rescue,
- death.

Show these where the consequence resolves.

### Progression / unlock
For events such as:
- stat increase,
- Auron training unlock,
- recipe discovery,
- new stock/service,
- important route/world unlock.

Show these immediately and keep the permanent result discoverable in its normal screen afterward.

### Routine reward
For:
- XP,
- Gold,
- Essence,
- loot.

Keep these compact inside the normal action/result text. Do not turn each reward into a separate banner.
## 6B — Inline Notice Format

Related changes from one action should be grouped into one coherent result block.

Example:

> You stagger back to the Pit entrance.
> **HEART LOST — 1 Heart remains.**
> **NEW SCAR — Battle Mark.**
> *Steel found flesh, and the wound never quite disappeared.*

Then show the next real decision.

Do not add a separate acknowledgment screen.

Transient notices should appear once as new information, then disappear through normal play. Permanent state remains visible in the appropriate permanent UI:
- Scars in Character,
- recipes at Shop/Blacksmith,
- training at Guild,
- orders at Shop,
- history/records where appropriate.
## 6C — Heart Loss Feedback

Ordinary Heart loss should be explicit.

For 3 → 2 Hearts:

> **HEART LOST — 2 Hearts remain.**

For 2 → 1 Hearts:

> **HEART LOST — 1 Heart remains.**

If that Heart loss creates a Scar, immediately follow it with the Scar notice.

Do not imply a Scar has mechanics unless the Scar actually has authored mechanical effects.

Heart-loss messaging should reflect the Actor's current state, not a stale earlier state.
## 6D — Scar Feedback

Scar acquisition notice format:

> **NEW SCAR — [Scar Name]**
> *[Authored flavor line]*

The acquisition notice should use flavor text, not mechanical details.

The Character page is the authoritative detail view and should show:
- Scar name,
- acquisition context/history,
- flavor text,
- exact mechanical effect if one exists.

If the Scar has no gameplay modifier, say so plainly in the Character page.

Rule:

> **Scar announcement = name + flavor. Character page = history + flavor + mechanics.**

Never hide a real gameplay effect only inside flavor prose.
Initial VS flavor direction:

- **Battle Mark** — *Steel found flesh, and the wound never quite disappeared.*
- **Pit Injury** — *The Pit left something behind when you crawled back out.*
- **Poison Trauma** — *Your body survived the venom. It remembers anyway.*
- **Lost Arm** — *Some prices cannot be paid twice.*

These lines are authored flavor and may be polished later without changing Scar mechanics.

## 6E — XP Reward Feedback

XP is a spendable decision resource, so XP gains should show both:
- amount gained,
- new total.

Example:

> **+4 XP — 11 XP total**

This allows the player to decide whether returning to the Guild to train is worthwhile.
Routine XP should remain part of the normal result block.

Example:

> **Pit Hound defeated.**
> +4 XP — 11 XP total · +1 Essence
> Beast Fang ×1

Do not create a separate XP reward screen.

## 6F — Training Feedback

Training feedback should show:
- stat being trained,
- current progress toward the next increase,
- XP spent and XP remaining,
- AP spent and AP remaining.

Example, no stat increase:

> **STR Training — 3 / 4 sessions**
> −2 XP — 9 XP remaining
> −1 AP — 2 AP remaining
When the threshold is reached:

> **STR increased: 2 → 3**
> Training progress resets to **0 / [next requirement]**.
> −2 XP — 7 XP remaining
> −1 AP — 1 AP remaining

Do not add an unexplained **Level Up!** announcement in Phase 6.

Character Level remains a separate unresolved design topic. Phase 6 should communicate the stat progression the player actually chose and understands.

The Character page should continue to show current XP and training progress.

## 6G — Material Documentation / Recipe Discovery

Formal Turn-In remains distinct from selling:
- **Sell** = immediate Gold.
- **Document** = consume one material and permanently add that material to shared town knowledge.

Before acting, make that tradeoff explicit.
Example choice:

> **Sell Beetle Shell — 8G**
> **Document Beetle Shell — consumes 1; discovers recipes**

After documentation, replace generic feedback such as “turn in completed” with explicit discovery feedback.

Example:

> **MATERIAL DOCUMENTED — Beetle Shell**
> **New recipes discovered:**
> Beetle Shield — 2 Beetle Shell + 30G
> Beetle Chest — 3 Beetle Shell + 35G
> **Requires a Blacksmith.**

Do not offer Document again for a material that is already known.
## 6H — Known Recipe Visibility

Once discovered, a recipe should remain visible even when it cannot currently be ordered.

Unavailable known recipes should be greyed out and explain why.

Examples:

> **Greater HP Potion ×2**
> 2 Moonleaf + 12G
> *Need 1 more Moonleaf*

> **Fang Sword**
> 2 Beast Fang + 30G
> *Blacksmith required*

Do not hide known recipes merely because:
- Gold is insufficient,
- materials are insufficient,
- the required service is unavailable,
- the Bag is full,
- or another temporary requirement is unmet.

This follows the broader rule: show relevant options and explain why they are unavailable.
## 6I — Unlock Terminology

Use precise labels:

- **NEW RECIPE** = crafting knowledge was discovered.
- **NEW STOCK** = a directly purchasable vendor item was added.
- **NEW SERVICE** = a service provider/function became available.
- **NEW ROUTE / DISCOVERY** = a meaningful location or route became available.

Do not use “new shop stock” for recipe discovery.

Current VS material → recipe knowledge:

- Slime Core → Slimeguard Shield
- Beetle Shell → Beetle Shield, Beetle Chest
- Beast Fang → Fang Sword, Fang Hammer
- Venom Gland → Antidote ×2
- Moonleaf → Greater HP Potion ×2
- Bitterroot → Cleanse Tonic ×2
- Bigshroom → Bigshroom Tonic ×2
- Iron Ore → Iron Sword, Iron Hammer, Iron Shield, Iron Chest
- Crystal Shard → Crystal Bow
## 6J — Auron Feedback

Preserve the Phase 1.2 onboarding flow.

After the first ordinary player Heart loss, Auron training becomes pending.

On the next appropriate Guild visit, show:

> **Auron:** “The Pit has taken its toll on you. If you plan to go back, I can help you prepare. Come train with me.”
> **Training with Auron unlocked.**

Do not redesign this timing in Phase 6 unless implementation verification finds a bug.

### Final-Heart rescue

Auron's rescue cost must be impossible to miss.

Example:

> **Auron rescued you from death.**
> You remain at 1 Heart.
> **Auron lost 1 Heart protecting you.**
If Auron acquires a Scar:

> **Auron acquired Scar — Lost Arm.**
> *Some prices cannot be paid twice.*

If Auron dies performing the rescue:

> **Auron died rescuing you.**

Do not bury rescue cost, Scar acquisition, or Auron's death only in history/records.

Training availability afterward must reflect Auron's actual state.

## 6K — World-Change Notifications

No broad new notification system is required for the VS.

Preserve the existing rule:

> **Surface meaningful consequences, not simulation noise.**
Notify the player when an off-screen world change:
- creates an option they can act on,
- removes an option they could reasonably care about,
- materially changes an important system,
- or represents a major persistent world event.

Examples worth surfacing once:
- **ORDER READY — Iron Sword can be collected at the Shop.**
- **REQUEST EXPIRED — The Moonleaf request is no longer available.**
- **NEW SERVICE — The Blacksmith is now operating in HearthVale.**
- **AURON UNAVAILABLE — Training with Auron is no longer available.**
- major Pit discovery / Guardian defeat where relevant.

Do not notify routine simulation noise such as:
- NPC location changes,
- ordinary schedules,
- mundane work actions,
- small stock-number fluctuations,
- internal AI decisions.

Off-screen changes should appear at the next sensible player-facing moment, usually after waking or returning to the Surface/relevant location.
A change should be announced as **new** once. Afterward, the permanent UI carries the state.

The existing Records / History / Weekly Snapshot systems remain the long-term bookkeeping layer where appropriate.

## 6L — Pit Return Clarity

At an expedition return/result, show decision-relevant totals compactly so the player can choose the next surface action.

At minimum, include current:
- XP,
- Gold,
- important loot/value gained,
- and other immediately relevant return resources.

The desired decision loop is readable:

> Shop → spend Gold
> Guild → spend XP
> Inn → recover/end day
> Pit → go back in

Do not add a separate summary screen if the same information can sit above the next meaningful choices.
# Implementation Boundaries

Phase 6 should not:
- invent a Character Level progression system,
- add a global notification inbox,
- add broad dynamic-town event simulation,
- redesign Auron's already-approved onboarding,
- create new Scar mechanics merely to justify Scar feedback,
- redesign the Phase 3 economy,
- change the Phase 4 Sanity model,
- change the Phase 5 magic model.

Where underlying systems already work, Phase 6 should improve visibility, wording, timing, and discoverability rather than replace them.

# Required Tests Before Handoff

Add or update deterministic/browser tests for at least:
- 3→2 Heart loss notice.
- 2→1 Heart loss + Scar notice.
- Scar notice uses flavor, while Character page exposes exact mechanics/history.
- XP gain shows delta and new total.
- training shows progress, XP/AP costs, and remaining totals.
- completed training explicitly reports stat increase.
- no unexplained Level Up notice appears.
- material documentation reports exactly which recipes were discovered.
- already-known material no longer offers Document.
- known recipes remain visible when unavailable and explain why.
- recipe/stock/service terminology is not conflated.
- Auron training introduction appears at the intended Guild timing.
- Auron final-Heart rescue clearly reports player survival and Auron Heart cost.
- Auron Scar/death is surfaced immediately when applicable.
- meaningful off-screen world changes surface once at a sensible moment.
- routine NPC/simulation changes do not create notifications.
- expedition return presents decision-relevant totals without an extra Continue screen.
- normal flow still follows **action → result inline → next meaningful choice**.

# Phase 6 Closeout Criteria

Phase 6 is complete when a player can understand:
- what important change just happened,
- why it happened,
- whether it is temporary or permanent,
- where to inspect the permanent result,
- and what useful decision that change enables next,

without opening Dev Mode or traversing a non-decision confirmation screen.
