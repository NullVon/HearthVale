# Core controller transfer proposal

Status: proposal only. No Core changes are requested or implemented by Milestone 2. Succession remains deferred pending explicit review and approval.

## Required behavior

HearthVale must eventually transfer the Player Controller from existing Actor A to existing Actor B while preserving both IDs, world-visible state, Actor Information, Situations, and causal history. A completed checkpoint must precede the transition. Successor eligibility, inheritance, chronology, one-player policy, and compression semantics remain Shell rules.

## What Core v0.1.0 provides

The public entry point is `../LWE-Core/src/api/index.js`. Bootstrap accepts `actor.controller: Human | Autonomous`. Both controllers use the same Action pipeline. Saves retain the Actor component. Generic `data` Consequences update only `entity.data`, not the Actor component. `world-state.change` exposes no controller mutation operation through the Event/Consequence pipeline.

Important Situations also retain `situation.opportunity.actor`. Current World validation requires that recipient to be Human, including for retained important Situations. There is no supported operation to reassign that recipient. Demoting Actor A without addressing these references would invalidate the world even if a controller setter existed.

## Why Shell code cannot currently complete it

Duplicating a player ID in Shell state would disagree with Core controllers. Rewriting a save would bypass causality. Recreating or replacing the successor would violate unified Actor identity and continuity. Importing Core internal mutators is outside the public contract. None is an acceptable workaround.

## Smallest proposed generic capability

Review a validated controller-assignment Consequence plus supported reassignment of important Situation opportunity recipients. Define how related assignments form one consistent Scene transaction, including any interim per-effect validation. Preserve before/after values, WHY provenance, deterministic save/reload, and rollback on invalid references or failures. Exact operation names and API shape are deliberately not prescribed here.

Core should retain only structural meaning: valid Actors/controllers and valid opportunity recipients. HearthVale should choose which Actor becomes player-controlled and which opportunities legitimately transfer or change. Core must not learn HearthVale succession types, inheritance, Pit rules, or family semantics.

## Acceptance checks for a future reviewed Core change

- Existing Actor IDs and arbitrary data survive reassignment.
- Invalid controller values and non-Actor targets fail atomically.
- Important Situation recipient references remain structurally valid through the transition.
- Assignment Events/Consequences explain changed control and opportunity recipients.
- Save/reload before and after transfer preserves exact state and continuation.
- Autonomous selection uses the new controller assignments; no stale roster persists.
- A failed multi-assignment transition leaves the complete prior checkpoint intact.

This is the previously reported Milestone 4 gap. Milestone 2 needs no controller reassignment and introduces no new required Core capability gap.
