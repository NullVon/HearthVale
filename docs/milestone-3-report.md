# Milestone 3 — Minimal Pit vertical slice

Milestone 3 is complete against LWE Core v0.1.0. This is a lifecycle proof using replaceable fixtures. No production Content, Story, UI, succession, or Core implementation was added.

## 1. Files created and changed

Created:

- `HearthVale_Shell/src/pit.js`: Pit Entity construction, expedition Actions, reconstruction effects, return reconciliation, local perceptions, availability, and movement guard.
- `HearthVale_Shell/fixtures/pit-fixture.js`: minimal Pit/discovery definition using the existing test Actor fixture.
- `HearthVale_Shell/cli/pit-demo.js`: diagnostic lifecycle and exact reload smoke test.
- `tests/pit.test.js`: 12 focused integration tests.
- `tests/helpers/pit-reconstruction.js`: test-only scheduled reconstruction Action using Core's public causal API.
- `docs/milestone-3-report.md`: this report.

Changed:

- `HearthVale_Shell/src/world.js`: optional Pit bootstrap and discovery identity collision validation.
- `HearthVale_Shell/src/index.js`: compose Pit hooks with the existing Shell; defer broader Shell processes and opportunity surfacing inside expeditions.
- `HearthVale_Shell/src/progression.js`: prevent daily commands and autonomous daily decisions inside expeditions.
- `HearthVale_Shell/src/game.js`: guard Day completion and expose the narrow shared-discovery read API.
- `package.json`: add `demo:pit`.
- `README.md`: current scope, Pit commands, run instructions, and limitations.
- `docs/architecture-assessment.md`: completed milestone and next engineering boundary.

No files were moved in this milestone. The accepted repository separation remains:

```text
HearthVale/
  HearthVale_Shell/
    src/
    fixtures/
    cli/
  HearthVale_Content/.gitkeep
  HearthVale_Story/.gitkeep
  HearthVale_UI/.gitkeep
  docs/
  tests/
    helpers/
  README.md
  package.json
  .git/
```

## 2. Exact lifecycle

Bootstrap creates the persistent Pit at the town entrance. Entry requires an aware Human Actor at that entrance, an active Day, sufficient AP, and no existing expedition. It creates the first disposable procedural instance if needed, records a new expedition identity and local step counter, charges one AP, and moves the Actor inside.

Each internal step resolves a short Core Scene and immediately updates the saved expedition counter and the Actor's local observation. At the fixture threshold, recognition creates the permanent Named Location, records its shared discovery, updates expedition state, and moves the Actor to that location. The expedition can continue afterward.

Exit moves the Actor back, closes the expedition, and creates a pending return Consequence. The broader Shell process emits a causally linked return-reconciled Event and clears the pending return exactly once. Broader progression is now permitted. Existing explicit Day completion schedules daily autonomy and advances the calendar; exit does not refill AP or force the Day to end.

## 3. Shell infrastructure

Shell owns persistence categories, expedition lifecycle, AP policy, local-step semantics, discovery disclosure, return policy, and reconstruction eligibility. Core continues to own Action adjudication, Events, Consequences, Entity lifecycle, claims, causal history, checkpoints, and serialization. Shell hooks return effects rather than mutating world state or maintaining a second simulation engine.

## 4. Temporary fixtures

`pit_test`, `named_location_test`, the label `Named location test`, and the two-step discovery threshold are replaceable fixture values. A second definition with different IDs, name, and threshold is tested. Procedural instances use a Pit-derived temporary revision ID. There are no authored Strata, encounters, enemies, loot, Guardians, Waystones, routes, production balance, or production discovery catalog.

The reconstruction scheduler exists only under tests. The Shell supplies the lifecycle effects, but registers no production reroll or Chapter command.

## 5. AP verification

Tests assert AP 4 before entry and 3 afterward. Multiple internal steps, recognition, and exit preserve AP 3. Entry using the last AP still permits all internal activity and free return. Zero-AP entry fails. Re-entry costs another one AP. Universal Move cannot bypass entry payment or return reconciliation. No per-room, Floor, or Stratum charging mechanism was introduced.

## 6. Persistent and ephemeral verification

The Pit remains persistent across expeditions. Reconstruction at the test boundary replaces its active undiscovered ephemeral instance. The previous instance is retired, preserving Core's historical references. The Named Location, shared discovery record, and original causal explanation remain unchanged. Re-entry preserves the current procedural revision and grants no permanent shortcut. Reconstruction is denied during an active expedition.

## 7. Events and Consequences

Entry, step, discovery, exit, and reconstruction use Actor Action → Event → Consequence → state change. Tests inspect entry provenance and the discovery WHY chain back to the recognition Action. Return reconciliation traces through the exit's applied pending-return Consequence. Repeated recognition or exit does not duplicate successful discovery or reconciliation history.

## 8. Information and discovery

Entrance awareness and internal observations are explicit Actor claims. Recognition requires current-expedition local observation. `sharedDiscoveries()` exposes only the recognized location ID, Pit ID, and name immediately, before exit. It does not disclose step counters, incidental events, or undiscovered procedural instances. Other Actors' private views remain unchanged; the shared record is a separate recognized-discovery source, not a global memory synchronization.

## 9. Save and reload

Every player command finishes a short Core Scene. The Shell expedition can therefore remain active at a valid Core checkpoint. Exact serialized equality is tested before recognition, after recognition, after return, and after reconstruction. Resumed runs produce identical saves, including local state, remaining AP, permanent discovery, history, and deterministic state. Loading neither rerolls the Pit nor replays discovery. Active or suspended Core Scenes retain Core's existing no-save restriction; no new player save policy was invented.

## 10. HearthVale tests

All **38 tests pass**, with zero failures: 26 existing tests and 12 new Pit tests. Coverage includes AP, multiple local resolutions, unchanged Day and autonomous state, immediate permanent discovery, private/shared information separation, causal provenance, invalid commands, exact reload, reconstruction, re-entry, and replaceable fixture data. Raw Core attempts and an elevated offscreen budget also cannot force daily activity during an expedition.

## 11. Core regressions and smoke tests

All **56 Core regression tests pass**, with zero failures. All three diagnostic CLIs pass: bootstrap, six-pillar demo, and Pit demo. The Pit CLI asserts exact active-expedition restoration, reports AP 3 on return, and reaches Day 2 with one autonomous accomplishment only through explicit Day completion.

Run `node --test` from HearthVale and separately from LWE-Core. From HearthVale run `node HearthVale_Shell/cli/bootstrap.js`, `node HearthVale_Shell/cli/six-pillar-demo.js`, and `node HearthVale_Shell/cli/pit-demo.js` (also `npm start`, `npm run demo`, and `npm run demo:pit`). Node >=22 is required.

Core and Legacy Git working trees are clean. Runtime import inspection finds only `LWE-Core/src/api/index.js` through the existing Shell adapter, with no Legacy dependency. Content, Story, and UI contain only `.gitkeep` placeholders.

## 12. Architecture and Core gaps

No new required Core capability or architecture contradiction was found. Immediate permanent state changes do not imply fictional time advancement. Return reconciliation and subsequent explicit Day completion preserve the accepted Day/AP policy. This proof does not model actual Floors or Strata, production traversal, a full generator, or Chapter scheduling.

The previously reported generic controller/opportunity transfer gap still blocks succession. The separate history-compaction limitation remains deferred; retiring disposable state requires no history deletion or Core modification.

## 13. Completion

Milestone 3 is complete within the requested minimal lifecycle scope. All implementation changes are contained in HearthVale. No Core or Legacy edits, production layers, or unrelated gameplay changes were made.

## 14. Recommended next engineering milestone

Review the existing [controller/opportunity-transfer proposal](core-controller-transfer-gap.md) as a separately authorized generic Core task before Milestone 4 succession. Once that contract is supported and accepted, prove transfer between existing Actors, pre-transfer saves, continuity, and reload. Do not work around the gap in Shell or begin production Content as part of this milestone.
