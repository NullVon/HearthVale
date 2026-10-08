# Phase 7 — Succession Design Brief

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Status: **Design locked for implementation planning**

Owner: **Implementation and verification followed by maintainer review and playtesting**

Scope: Phase 7 only. Preserve the already-locked Phase 1–6 rules.

## Goal

Prove that HearthVale continues across Actor death without turning succession into a reset or a personal inheritance system.

Core rule:

> **The world continues. The Actor does not.**

For the Vertical Slice, succession is death-only and uses three freshly generated adventurers. No retirement, child, mentee, heirloom, estate, or long-timeskip systems are required.

The intended playable loop is:

> **Actor dies → Life Record → HearthVale continuity → choose 1 of 3 fresh Actors → arrive at the Inn in the same world → continue playing**
## 7A — Succession Trigger

Succession begins only after a real player-Actor death.

Death conditions remain:
- Hearts reach 0,
- Sanity reaches 0.

A successful Auron final-Heart rescue is survival, not succession.

For the VS:
- no voluntary retirement,
- no child succession,
- no mentee succession,
- no family inheritance path,
- no manual “change character” option.

The dead Actor's death and archival record must fully resolve before successor generation becomes available.
## 7B — Life Record Before Succession

After death, show the dead Actor's Life Record before generating a successor.

The Life Record should summarize meaningful authored history, such as:
- deepest Pit progress,
- major discoveries,
- formal material documentation,
- Ruin Brute first-clear credit,
- significant Situation resolution,
- rescue history,
- meaningful Scars.

Do not flood the Life Record with routine:
- combats,
- ordinary sales,
- ordinary Talk actions,
- minor relationship score changes,
- simulation noise.

The death screen should communicate:

> **[Actor Name] has died.**
> Generation [N]
> [death summary]

Then show the meaningful record and:

> **HearthVale continues.**

The player-facing Life Record is historical archive, not proof that the next Actor knows these facts.
## 7C — Successor Generation

When the player chooses to continue, generate exactly three fresh candidate Actors.

Prompt:

> **Who will you follow next?**

Use the same candidate generator and canonical starting-package rules used by New Game.

Each candidate should show enough information for a real decision:
- name,
- generation,
- Hearts / HP / Sanity,
- STR / DEX / CON / INT / WIS / CHA,
- innate Traits,
- starting equipment,
- starting consumables/ammo,
- starting spell if the generated package includes one.

No personal inheritance preview is required because personal inheritance is not part of the VS succession model.
### Candidate Generation Rules

- Generate the three candidates once.
- Store them in save state.
- Save/load must reproduce those exact candidates.
- Returning to Title and loading must not reroll them.
- Re-entering the succession flow must not generate a second set.
- Invalid or stale candidate IDs must fail atomically without changing save state.

Rejected candidates never enter HearthVale.

If the player chooses Rowan from Rowan / Elara / Dain:
- Rowan becomes the new controlled Actor,
- Elara and Dain are discarded candidate possibilities,
- Elara and Dain do not become NPCs.
## 7D — Control Transfer

Choosing a successor should be atomic.

After selection:
- exactly one Actor has Human control,
- the predecessor remains retired/dead,
- the predecessor retains their Life Record,
- the selected candidate is created,
- the two rejected candidates do not exist in the world,
- the death transition is marked complete,
- the successor becomes the active Surface player.

No time passes during the transfer.

The successor begins at the Inn in the same existing world.
## 7E — No Time Skip in the VS

The old long-term design allows future succession types with years passing.

Do not use that system here.

For the Vertical Slice:

> **Succession happens in the same current timeline.**

If Generation 1 dies on Day 17, Generation 2 begins on Day 17.

Do not:
- advance the Day,
- advance the Week,
- advance the Year,
- rerun weekly reconciliation,
- regenerate NPCs,
- rebuild the town,
- re-bootstrap Surface history.

This phase demonstrates continuity by letting the successor enter the exact HearthVale the predecessor left behind.
## 7F — World State vs Personal Actor State

Succession preserves world state, not personal Actor state.

### Persists because it belongs to HearthVale

Examples:
- current calendar Day / Week / Year,
- all existing NPCs and their current condition,
- Auron's Hearts, Scars, rescue history, death/living state,
- whether Auron training is unlocked,
- Pit discoveries,
- Pit floor/guardian progression,
- Ruin Brute first-clear history,
- shop stock,
- used-item inventory,
- documented materials,
- recipe knowledge,
- service unlocks,
- public Situations and their deadlines,
- institutional knowledge and records,
- historical Life Records,
- prior world consequences.

### Does not transfer because it belonged to the dead Actor

Examples:
- stats,
- Traits,
- Hearts / HP / Sanity,
- XP,
- Gold,
- equipment,
- Bag/items,
- learned spells,
- arrows/ammo,
- Scars,
- relationships,
- memories,
- private knowledge,
- training progress,
- tracked opportunities,
- personal story tags,
- temporary statuses,
- local expedition state.

The successor receives their normal newly generated starting package instead.
## 7G — Auron Continuity

Auron is a world Actor and keeps his actual state.

If the predecessor caused:
- Auron training to become unlocked,
- Auron to lose a Heart,
- Auron to acquire Lost Arm,
- Auron to die,

those facts remain true after succession.

If Auron is alive and otherwise capable of providing training, the service remains unlocked for the successor.

The successor does not inherit:
- predecessor training progress,
- predecessor XP,
- predecessor relationship with Auron.

This is a key proof of the rule:

> **The world continues. The Actor does not.**
## 7H — Unfinished Business Ownership

Use this ownership test:

> **Who owns the thing: the Actor, or HearthVale?**

If it belongs to the world, it survives.

If it belongs personally to the dead Actor, it remains with that Actor and does not jump to the successor.

### Personal unfinished business does not transfer

Do not transfer:
- tracked opportunities/bookmarks,
- private rumors,
- firsthand knowledge,
- personal conversations,
- relationships,
- training progress,
- pending personal loot,
- personal Gold/XP,
- inventory/equipment,
- temporary combat/Pit state.

A public request may still exist in the world even if the predecessor had it tracked.

The successor may discover and pursue that request normally.
### Public/world opportunities persist

Active public requests retain:
- current lifecycle,
- current deadline,
- resolver,
- escalation status,
- completion status.

Succession does not:
- reset a request,
- extend its deadline,
- reopen a completed request,
- transfer old completion credit to the successor.

If the predecessor completed a request, the predecessor remains credited as resolver.

### Shop/economy state persists

Preserve:
- stock,
- used equipment,
- documented materials,
- recipe knowledge,
- service unlocks,
- civic supply state,
- economy reconciliation state.

A used item sold by the predecessor can later still appear as used stock for the successor.
### Personal orders remain personal

If the predecessor paid for an order and died before collection, the order remains associated with the predecessor.

The successor cannot collect it merely because the same human player now controls a different Actor.

Do not invent for the VS:
- inheritance,
- refunds,
- estates,
- next-of-kin ownership,
- automatic reassignment.

Long-term estate/inheritance systems remain post-VS possibilities.

## 7I — Relationships

NPCs remember the predecessor according to their own stored state.

Those relationships do not automatically become the successor's relationships.

Example:
- Mira may retain a relationship/history involving Alden.
- Rowan begins with no inherited relationship score with Mira.

World Actors keep their own memories and relationship history where the simulation already stores them.
## 7J — Player Knowledge vs Actor Knowledge

Lock this distinction:

> **The player may remember previous lives. The successor only knows what the world has actually made available to them.**

### Player archive

The Journal may show:
- Lives Followed,
- prior Life Records,
- generations,
- meaningful predecessor accomplishments.

This is player-facing history.

Reading it must not:
- grant claims,
- add memories,
- unlock routes,
- satisfy knowledge checks,
- complete requests,
- alter NPC behavior,
- reveal predecessor-private information as current-Actor knowledge.

### Institutional/world knowledge

Facts legitimately learned by:
- Guild,
- Inn,
- Shop,
- Town Hall,
- other Actors

remain in those holders.

The successor can learn those facts through normal communication or other valid channels.
### Private predecessor knowledge

Private knowledge dies with the predecessor unless it was genuinely shared before death.

Examples:
- a firsthand Pit Hound sighting,
- a private rumor,
- an unshared discovery,
- a confidential conversation.

Do not copy these directly into the successor.

If the predecessor reported the information to an institution before death, that institution may still know it and later communicate it.

UI rule:

> **Never present player-only archive information as if the current Actor knows it.**
## 7K — Clean Successor Start

The successor must begin in a clean playable state at the Inn.

No predecessor-local ephemeral state may leak.

Explicitly verify absence of:
- Poison,
- Barrier,
- Slow,
- Strain,
- Essence,
- expedition HP,
- combat state,
- pending enemy move,
- pending loot,
- pending final-Heart state,
- pending expedition death state,
- room-local state,
- tracked opportunities,
- predecessor service receipt,
- predecessor temporary flags.

The successor should begin with the generated package's normal:
- HP,
- Hearts,
- Sanity,
- AP,
- equipment,
- inventory,
- Gold,
- ammo,
- spell slots/spells.
## 7L — Successor Presentation

After selection, show a short inline transition at the Inn:

> **Generation 2 — Rowan**
> You now follow Rowan. HearthVale's story continues.

Then immediately show normal Surface choices.

Do not replay:
- the original world-history opening,
- the original New Game candidate flow,
- the full Mira Day 1 onboarding/tutorial.

The new Actor is new to HearthVale.

The player is not.

This transition should be brief and should not create a separate non-decision Continue screen.
## 7M — Save / Load Integrity

Three critical save points must round-trip exactly:

1. death / Life Record screen,
2. successor candidate-selection screen,
3. immediately after successor selection.

Requirements:
- exact candidate preservation,
- exact RNG preservation,
- no duplicate candidate generation,
- no duplicate successor creation,
- no extra time advancement,
- no duplicate death archival,
- no duplicated Events or rewards,
- invalid/stale selections leave state unchanged.

Succession must remain deterministic under save/load.
## 7N — Auron Rescue Exception

A successful final-Heart rescue means the Actor survives.

Therefore:
- no Life Record,
- no retirement,
- no candidate generation,
- no succession.

Play continues with the same Actor at the authored rescued state.

If Auron dies performing a rescue but the player survives, the player still does not succeed immediately. Auron's death is simply persistent world state.

Only the player Actor's actual death triggers succession.
## 7O — Day 40 / Demo Completion Exception

Day 40 is terminal for the Vertical Slice.

If the player Actor dies on the final Day:
- archive the Life Record,
- preserve the death correctly,
- complete the Chapter,
- do not generate successor candidates.

If the Ruin Brute completion condition has already ended the demo:
- succession is unavailable.

Do not generate a new Actor only to immediately terminate the demo.

A successful Auron rescue on Day 40 remains survival; the Chapter may still later complete through the normal final-Day completion path.
## 7P — Historical Credit

Historical accomplishments stay credited to the Actor who actually performed them.

Examples:
- first Ruin Brute clear,
- material documentation,
- completed Situation resolution,
- major discovery.

A successor may later perform similar actions, but the original historical credit must remain with the original Actor.

Succession must not rewrite:
- resolver identity,
- discovery owner,
- first-clear owner,
- institutional provenance,
- Life Record attribution.

# Implementation Boundaries

Phase 7 should not:
- implement child succession,
- implement mentee succession,
- implement voluntary retirement,
- implement estates/inheritance,
- transfer personal Gold/items/stats,
- add heirlooms,
- add years-long time skips,
- repopulate rejected candidates as NPCs,
- expose private predecessor knowledge to the successor,
- redesign Life Record content beyond clarity/polish needs,
- redesign the broader knowledge system,
- reset or rebuild HearthVale.

The old generic succession adapter with authored time skips remains separate from the playable V1 death-only flow.

Use the playable Surface succession path for the VS.

# Required Tests Before Handoff

Add or retain deterministic/browser coverage for at least:

- succession unavailable while player is alive,
- succession unavailable before death archival,
- succession unavailable after demo completion,
- exactly three candidates generated,
- candidate generation uses the canonical New Game generator/package,
- candidate generation happens exactly once,
- candidate screen save/load preserves exact candidates,
- invalid/stale candidate choices are atomic,
- exactly one selected successor is created,
- rejected candidates never enter the world,
- predecessor remains retired with Life Record,
- exactly one Human-controlled Actor exists after transfer,
- no calendar/time advancement during transfer,
- successor starts at the Inn,
- no opening/Mira tutorial replay,
- successor gets fresh generated personal state,
- no predecessor stats/Gold/XP/equipment/Scars/relationships transfer,
- no private knowledge transfer,
- no tracked-opportunity transfer,
- no temporary status/combat/expedition leakage,
- world/NPC/Pit/economy state persists exactly,
- Auron's Hearts/Scars/death/training-unlock state persists,
- public Situation lifecycle/deadlines/resolver persist,
- predecessor personal orders remain noncollectible by successor,
- used stock remains available normally,
- institutional knowledge/provenance persists,
- Lives Followed archive remains player-facing and grants no knowledge,
- Day 40 death creates Life Record but no successor candidates,
- successful Auron rescue does not trigger succession,
- multiple successive generations preserve accumulated world state and previous Life Records,
- exact save/load/RNG replay across succession.

# Human Playtest Checklist

During a real playtest:

1. Kill a player Actor naturally before Day 40.
2. Confirm the death result is understandable.
3. Review the Life Record.
4. Confirm **Choose Who Comes Next** appears.
5. Inspect all three candidates.
6. Save on the candidate screen.
7. Reload and confirm the same three candidates.
8. Choose one.
9. Confirm the successor appears at the Inn on the same Day.
10. Confirm the world has not reset.
11. Confirm predecessor Scars/equipment/Gold/XP did not transfer.
12. Confirm Auron and other NPCs retain their real world state.
13. Confirm shop/material/Pit/Guardian progression persists.
14. Confirm old private knowledge and relationships do not transfer.
15. Confirm Lives Followed contains the predecessor.
16. Continue playing to verify the successor is fully functional.
17. If practical, repeat for another generation.

# Phase 7 Closeout Criteria

Phase 7 is complete when the full loop works cleanly:

> **fresh Actor → play → die → Life Record → three candidates → choose successor → continue in the same world**

and the player can clearly observe that:
- HearthVale continued,
- the predecessor remained historical,
- the successor is a genuinely fresh Actor,
- persistent world consequences survived,
- personal state did not magically transfer,
- save/load cannot reroll or duplicate succession,
- no temporary state leaked,
- Day 40 correctly ends the demo instead of starting another generation.

This phase should prove the Living World Engine principle that:

> **The world is the true save, not the bloodline.**
