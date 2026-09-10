# Milestone 4 — Succession and world continuity proof

Milestone 4 is complete as a Shell architecture proof. It consumes the accepted generic Core controller-transfer operation without further Core changes. All values and opportunities are replaceable fixtures, not production succession design.

## 1. Files created and changed

Created:

- `HearthVale_Shell/src/succession.js`: fixture construction, eligibility, preparation/completion Actions, compressed historical effects, explicit recipient selection, and candidate awareness.
- `HearthVale_Shell/fixtures/succession-fixture.js`: three existing Actors, one eligible candidate, one ineligible candidate, ages, one Living State value, and three Situation scopes.
- `HearthVale_Shell/cli/succession-demo.js`: immediate and three-year diagnostic flows with exact prepared-save restoration and post-transfer autonomy assertions.
- `tests/succession.test.js`: nine focused succession integration tests.
- `docs/milestone-4-report.md`: this report.

Changed:

- `HearthVale_Shell/src/world.js`: optional succession fixture state at initialization.
- `HearthVale_Shell/src/index.js`: succession hooks and a pending-transition Action guard.
- `HearthVale_Shell/src/game.js`: explicit succession commands, save-return values, timing guards, and routing refresh through public checkpoints.
- `package.json`: `demo:succession` command.
- `README.md`, `docs/architecture-assessment.md`, and `docs/core-controller-transfer-gap.md`: current milestone status and integration guidance.

No repository reorganization, Core edits, Legacy changes, release tags, or version bumps were made.

## 2. Immediate succession

`game.successionOptions()` returns eligible, legitimately known fixture candidates. `game.beginSuccession(actorId)` validates eligibility, timing, and recipient policy; captures the current exact save; resolves a preparation Event and Consequence; and returns `{ preSuccessionSave, preparedSave }`. The former is the state before preparation and the latter can resume a prepared transition.

`game.completeSuccession()` revalidates the prepared choice and emits the meaningful succession Event through Core. Its effects invoke generic controller transfer and update the saved transition record. Both Actors remain the same Entity IDs and types. Immediate succession preserves their entire non-controller records and the existing Day/Week. Chapter and generation counters increment once to identify the new playable phase. No AP charge, resource refill, or inheritance redistribution is introduced.

## 3. Historical compression

The selected fixture optionally specifies a positive number of years. Completion emits one `hearthvale.history-compressed` Event, advances represented fixture ages, and changes one Living State value. A subsequent causally linked `hearthvale.succeeded` Event transfers control and moves the calendar directly into the new Chapter. The compatible Master Design forty-day year and existing five-day week determine the calendar offset; the Living State delta is explicitly fixture data.

Three-year and twenty-year tests both consume exactly two Core Scenes total: preparation and completion. Neither generates skipped Day-end, Week-reconciliation, or autonomous goal Events. Existing weekly state is retained with its current-week label advanced; no skipped weekly accomplishments are invented. This is bounded historical resolution, not history deletion or full generational simulation.

## 4. Eligibility proof

Candidate definitions contain existing Actor IDs, an `eligible` boolean, and a `years` timing value. An eligible active Autonomous Actor may be selected only by the sole active Human Actor, during an active Day, outside the Pit, with no pending transition and with legitimate candidate awareness. One candidate is deliberately ineligible. Missing, ineligible, and current-player selections reject without changing the save. No family, mentorship, age-gating, or production qualification rules were invented.

## 5. Core integration and provenance

The Shell emits the accepted `controller-transfer` operation with explicit expected Human/Autonomous values and selected recipient IDs. It never mutates controllers, rewrites save JSON, clones Actors, or changes Actor types. The transfer WHY chain includes the succession Event, completion Action, and preparation Consequence. For a time skip, that chain also includes the compressed historical Event. Core performs validation, mutation, rollback, and persistence.

## 6. Autonomous routing

After a successful command changes active Actor/controller assignments, the adapter saves and reconstructs the runtime through Core's public API. Fresh immutable Shell hooks derive the autonomous roster from current saved Actors. Ordinary commands retain their existing runtime when assignments are unchanged. Explicit loads follow the same reconstruction path.

Tests prove that the former player performs one autonomous accomplishment per Day, the successor performs no autonomous daily activity, and player commands target the successor even if input supplies the former player's ID. Reload during the closing-Day checkpoint cannot duplicate daily work. Existing daily decision markers are preserved.

## 7. Situation routing

- Actor-specific fixture: non-important Situation whose owner and affected Actor remain the original Actor. Its full record survives unchanged.
- Player-role fixture: important Situation explicitly marked `scope: player-role`. Only its opportunity recipient changes to the new Human Actor through the Core operation.
- Public fixture: its full world/public record remains unchanged.

No blanket recipient transfer occurs. If an important recipient attached to the departing Human is unclassified or not marked player-role, preparation is blocked without mutation. This respects Core's requirement that even retained important Situation recipients be Human; it does not silently reinterpret personal opportunities. Future content must specify a legitimate policy for such transitions. Recipient reassignment alone does not grant private Information or rewrite past disclosures.

## 8. World continuity

Tests preserve representative current and historical Entities, both Actor records, a causal support Relation, private claims, all prior history, active personal/public Situations, permanent Named Location discovery, the shared discovery registry, and valid ephemeral Pit state. The compressed path changes only its declared ages, Living State value, transition state, calendar/weekly label, and selected controller/recipient fields. Existing Pit state is not automatically rerolled at this Chapter boundary; the earlier deterministic reconstruction proof remains separate.

No private state is deleted in this minimal proof. Keeping it is valid and avoids inventing retention policy. Meaningful history remains available through Core; the previously noted history-compaction capability remains deferred.

## 9. Save boundary

The pre-succession save is returned to the caller and never deleted. A prepared transition is also an exact saveable Core checkpoint. Normal commands and Day completion are blocked while preparation is pending. Completion clears the pending transition, and repeated completion rejects rather than replaying it.

Tests prove exact prepared and post-transfer reload, deterministic continued execution, deliberate restoration of the original save, and no automatic reversal after an unrelated invalid command. Command rollback restores only the current command's checkpoint. This adapter returns save strings; durable storage and save-slot presentation remain caller/UI responsibilities. No slot UI or automatic undo command was introduced.

## 10. Infrastructure versus fixtures

Shell owns transition sequencing, eligibility interpretation, timing, public Core integration, saved transition state, scoped Situation routing, and routing refresh. Fixture definitions own concrete Actors, candidate flags, skip lengths, initial ages, Living State arithmetic parameters, Situation IDs, and scopes. Fixtures live only under `HearthVale_Shell/fixtures`; production Content, Story, and UI directories retain only `.gitkeep` files.

## 11–13. Verification results

- HearthVale: **47 tests pass**, zero failures (38 retained, nine added).
- Core: **64 regression tests pass**, zero failures; no Core changes were needed.
- CLI: bootstrap, six-pillar demo, Pit demo, and succession demo all pass. The Pit demo retains one-AP expeditions, exact active save restoration, and explicit Day progression. The succession demo verifies zero-year and three-year paths, prepared-save restoration, and correct autonomous routing.
- Git whitespace checks pass. Core and Legacy working trees are clean. Runtime imports retain the existing public Core adapter and introduce no Legacy dependency.

Run `node --test` from HearthVale and separately from LWE-Core. From HearthVale run `npm start`, `npm run demo`, `npm run demo:pit`, and `npm run demo:succession`, or their direct Node CLI paths shown in README.

## 14. Gaps and limitations

No new generic Core gap or architecture contradiction was found. The accepted controller-transfer operation supports the proof. Personal important opportunities with Human-only recipients require explicit future Shell policy; the current implementation safely rejects unresolved routing instead of silently transferring them. Full historical simulation, history pruning, succession content, inheritance economics, and production eligibility remain outside scope.

The raw Core runtime is a development interface. The game adapter supplies the explicit pre-succession save and refreshes Shell routing; integrations invoking raw runtime operations must preserve these responsibilities themselves.

## 15–16. Completion and foundation status

Milestone 4 is complete. The requested minimal Shell engineering foundation across Milestones 1–4 is proven: unified Actors, six-pillar causality and information, Day/Week cadence, persistent Pit lifecycle, exact persistence, existing-Actor succession, bounded historical advancement, and world continuity.

This is completion of the architecture proof, not a production-ready game or every future mechanic. Production Content/Story/UI and their final policies remain separately designed. Any later Legacy migration must be deliberate and classified against current architecture; none was started here.
