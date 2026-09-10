# Core controller transfer proposal

Status: resolved by the separately authorized generic Core review after Milestone 3. Core now implements the unreleased `controller-transfer` Consequence; see [the operation contract](../../LWE-Core/docs/controller-transfer.md). The proposal below is retained as the original gap analysis. HearthVale succession has not been implemented.

## Reviewed result

The gap was confirmed: bootstrap and Entity data effects provided no supported Actor-component reassignment. One atomic World State operation now exchanges two existing Actors' explicitly expected controllers and retargets only Shell-selected important Situation recipients. It preserves identity, non-controller state, claims, and history. The originating Event supplies meaning; the Consequence records controller and recipient before/after values for WHY queries. No special Action, single-Human invariant, or HearthVale semantics were added to Core.

Core changes are limited to `src/core/world-state/index.js`, `tests/controller-transfer.test.js`, `docs/controller-transfer.md`, `docs/implementation-contracts.md`, `README.md`, and `CHANGELOG.md`. Eight focused tests cover continuity, opportunity references, invalid and stale transfers, rollback, exact reload, no replay, delayed work, causal-budget atomicity, and current-controller routing. All 64 Core tests and all 38 unchanged HearthVale tests pass; the Pit diagnostic also passes. Core package version and save format are unchanged; no release was tagged.

Milestone 4 is unblocked with respect to controller/opportunity transfer. Its Shell implementation must still select eligible Actors, enforce its one-player policy, choose legitimate opportunity reassignment, and refresh the fixed autonomous routing cohort after a transfer. Core reads current controllers but does not repair Shell routing lists. History compaction remains a separate deferred limitation, not part of this change. Do not interpret the generic capability as an implemented succession flow.

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
