# Milestone 2 six-pillar proof

Milestone 2 is complete using LWE Core v0.1.0 without Core changes. The proof uses replaceable test data, with no production Content design or Legacy migration. All 26 HearthVale tests and 56 Core regression tests pass; both diagnostic CLIs pass. The foundation is ready for Milestone 3's minimal Pit proof within its agreed scope. Succession remains blocked by the separate controller-transfer gap.

## Implemented flow

1. `createHearthValeGame({definition, seed})` loads two unified Core Actors, one Human and one Autonomous. All persistent state lives in Core Entities, Relations, and Globals.
2. The Shell's world-started Event emits an opportunity-created Event. Its create Consequence instantiates the help Situation with a contribution-based terminal path. The requester learns about their own request through that Event.
3. `surfaceOpportunity` permits a direct request when the player and requester are active and co-located. Core creates the opportunity Event and grants the player a claim. Protection begins on this disclosure, not on hidden creation. It uses an exclusive `untilDay` deadline (Day 1 plus two protected Days ends protection at Day 3).
4. A player Help attempt goes through Core awareness/evidence guards and Shell eligibility. It requires an active Situation, an available co-located beneficiary, an active Day, and one AP. Test attribute zero does not prohibit help.
5. Core records the attempt and help-contributed Event. Consequences increase Situation progress, spend player AP, and update a minimal directed support Relation. Explicit perception grants the contributor and beneficiary knowledge of the contribution. There is no world-wide disclosure.
6. A second Help Action on the same Day reads the updated progress and support count, then reaches the terminal threshold. Core's Situation evaluator emits situation.changed and resolves it through a Consequence. WHY follows the causal chain. No special quest engine or relationship engine exists.
7. `beginDayEnd()` resolves one Core Scene, changing the Shell phase to closing and enabling off-screen selection. Core chooses among eligible Help, Main Goal progress, and idle using its own saved RNG. Autonomous choice hooks see only Core's local Actor projection and claims.
8. Every selected daily outcome records `decidedDay`. Meaningful Help/goal progress also records `accomplishedDay` and increments a small accomplishment counter. Subsequent submissions, repeated off-screen processing, and reloads cannot repeat meaningful work that Day. Idle is an operational Event marking the decision, with zero meaningful accomplishment. Zero weights or unavailable meaningful candidates fall back to idle.
9. `finishDayEnd()` requires every active autonomous member of the fixed cohort to have completed a decision. Its Event/Consequences advance Day, refill player AP, and return to active phase. Every five Days, a causal week-reconciled Event updates an ephemeral weekly snapshot. It grants no additional Actor turn.
10. Saves restore the full Core checkpoint, claims, Relations, active/resolved Situations, AP, protection/allowance state, calendar, daily decisions, weekly temporary state, and RNG. Loading does not consume definitions, reroll, or replay initialization. Saving between the two completed Day Scenes is supported; `endDay()` finishes the pending transition without repeating completed decisions.

## Player Priority

Autonomous help can never make a final contribution while protection is awaiting awareness or active. During that interval, `lastAutonomousWeek` on the Situation permits at most one autonomous progress contribution for the Situation as a whole, even with multiple Actors. The marker survives save/reload. Comparing it with the current Week renews eligibility without erasing the prior contribution record. When the Day deadline is reached, protection ends through a distinct Event/Consequence; the Situation remains active until its own terminal path is met. AP and the number of ordinary Core Scenes do not advance the deadline.

## Infrastructure and fixture boundary

Shell infrastructure comprises the shared Actor constructor, help Situation factory, direct-awareness policy, eligibility/effects, minimal support Relation, decision hooks, Day/Week rules, and command adapter. This is a small interface for `location`, `additionalLocations`, `actors`, and `opportunities`; no scripting language, formula parser, or generic content registry was added.

`src/demo/six-pillar-fixture.js` supplies generic test IDs, zero-valued test attributes, weights, contribution thresholds, and protection duration. These values prove behavior and are not balance decisions. `src/demo/bootstrap-fixture.js` preserves the accepted Milestone 1 fixture and IDs for compatibility; its old names remain noncanonical. It was moved out of `src/content`. Production Content has not been populated. Test-only variants add a remote location or a third Actor to exercise visibility and the shared weekly limit.

The support count is a minimal Actor-to-Actor state proof, not affection, relationship stages, or production social balancing. Likewise, goalProgress proves one weighted accomplishment rather than implementing a goal catalog or NPC planner.

## Files created or changed

| Files | Purpose |
| --- | --- |
| `src/shell/actions.js` (new) | Help eligibility, effects, direct contribution perception |
| `src/shell/situations.js` (new) | Situation construction, priority/awareness/expiry, support IDs |
| `src/shell/progression.js` (new) | Day commands, daily markers, goal/idle outcomes, Week reconciliation |
| `src/shell/autonomy.js` (new) | Local candidates and opaque weighted desires for Core selection |
| `src/shell/game.js` (new) | Player commands and checkpoint-safe Day orchestration |
| `src/shell/index.js` (changed) | Compose hooks, causal Situation creation, restore saved cohort |
| `src/shell/actors.js`, `src/shell/world.js` (changed) | Minimal fixture parameters, weight validation, initial progression state |
| `src/content/bootstrap.js` → `src/demo/bootstrap-fixture.js` (moved) | Isolate accepted bootstrap fixture from production Content |
| `src/demo/six-pillar-fixture.js` (new) | Replaceable two-Actor test definition |
| `src/presentation/six-pillar-demo.js` (new) | Executable complete-loop diagnostic |
| `tests/six-pillars.test.js` (new) | 18 focused integration tests |
| `package.json`, `README.md` (changed) | Demo command, API examples, current scope |
| `docs/architecture-assessment.md` (updated) | Current milestone status, unchanged authority hierarchy |
| `docs/core-controller-transfer-gap.md` (new) | Future Core proposal only |
| `docs/milestone-2-report.md` (new) | This report |

The user-supplied Master Design and Word architecture files were not modified. Existing user documentation changes were preserved. No branch or commit was created, and no Core or Legacy file was modified.

## Verification

`node --test` in HearthVale: **26 passed, 0 failed** (8 bootstrap tests retained, 18 new tests). New coverage includes causal creation and resolution, legitimate visibility and hidden requests, foreign evidence rejection, same-Day progress/support, AP denial/free actions, protected final contributions, protection expiry without failure, Situation-wide weekly caps across multiple Actors and reloads, daily caps and stale commands, idle/zero weights, both seeded weighted outcomes, local-only decisions, exact active/resolved saves and continuation, mid-transition saves, replaceable definitions, and malformed command recovery.

`node --test` in LWE-Core: **56 passed, 0 failed**. Both `node src/presentation/bootstrap.js` and `node src/presentation/six-pillar-demo.js` succeeded. Source import inspection retains exactly one external Core import at `src/shell/core.js`, using the public entry point, with no Legacy imports.

## Architecture limits and next milestone

No new Core gap or internal architecture conflict was found. The current off-screen hook receives only boundary, so Milestone 2 uses an immutable fixed Actor routing cohort, rebuilt from saved Actors on load. Decisions never obtain that roster or objective world through a closure. Dynamic births, retirements, migrations, and cohort refresh remain future Shell scheduling work; the proof does not pretend to implement them.

Core resolution rollback leaves its input Scene open for retry. The command adapter instead restores its pre-command checkpoint through the public load API and rethrows malformed-command errors, so the caller can issue another command. Expected eligibility denials remain failed Events; they are not rolled back. The adapter also rejects causal-budget overflow rather than presenting an incomplete command as completed. General resumable large causal workloads remain Core's lower-level API scope, not a claim of this tiny adapter.

Controller/important-opportunity reassignment and generic history compaction remain previously documented future gaps. No succession or history-pruning workaround was added. Continue to defer production actors, quests, Guild catalogs, stats/balance, relationship design, goal catalogs, pets, enemies, items, and Pit encounters to the separately designed Content layer. Milestone 3 should add only a minimal fixture expedition, one AP entry, short internal Scenes, permanent discovery, disposable procedural state, return, and save/reload checks.
