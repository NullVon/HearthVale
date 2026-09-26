# V1 M0 repository audit and implementation plan

Read before implementation: all five September 11 V1 VS documents (Mechanics, Content, Story, UI/UX Guide, Implementation Brief). The Master Design is context, not a replacement authority.

## Discovered architecture

1. Both repositories use JavaScript ESM, Node >=22, package.json and the built-in node:test runner. No dependencies, transpilation or browser build system are required for the existing proofs.
2. Core separates its six pillars under src/core, public API under src/api, rules/records/persistence under src/infrastructure, and optional Dice under packages/dice. HearthVale separates Shell src, fixtures and CLI from Content, Story, UI, docs and tests. Content/Story/UI currently contain placeholders.
3. Core exports createRuntime, evaluate, selectWeighted and compareContest. Runtime exposes snapshots, entity/view/history/why/trace/available, Scene submission/resolution/interruption/resumption, deferred attempts and save. Shell actions return generic effects. Controllers transfer through a generic consequence. Core owns identity, causal records, Information, rollback and persistence.
4. HearthVale's sole external import is HearthVale_Shell/src/core.js. index.js builds hooks/bootstrap; game.js coordinates commands and checkpoint recovery; actors/world, actions/situations, progression/autonomy, pit and succession own coherent rules. Existing fixtures are engineering demonstrations, not V1 production data.
5. Baseline commands: node --test in LWE-Core (64 passed) and HearthVale (47 passed). Core covers acceptance, invariants, conflict/lifecycle, controller transfer and Dice. HearthVale covers bootstrap, six pillars, Pit and succession.
6. Core snapshots include world, pending work, ID/control sequences and random. Saves are JSON {version:1,state}; random is validated as uint32. Save requires a completed Scene boundary. Shell world schema is separately versioned at 1. game.js restores the pre-command checkpoint after errors. No parallel save service is needed.
7. Core uses a private lcg32 stream for autonomous weighted choices and random conflict ties. Optional Dice has an independent seedable lcg32 implementation and defaults to Math.random without injection. HearthVale currently uses Core randomness only; no uncontrolled random calls occur in its source. The gap is deterministic randomness inside resolving Shell hooks, with transactional rollback.
8. Current data is replaceable JS fixtures (bootstrap, six pillars, Pit, succession). No authored V1 catalog loader or comprehensive cross-catalog validator exists. Actor validation intentionally accepts generic proof attributes and trait names.
9. Core validates IDs, rejects unsafe keys, allocates CORE_<kind>_<sequence> IDs and skips collisions. Shell fixtures use HV_* and semantic strings; expeditions use a persisted sequence. New authored IDs can use the brief's actor_*, item_*, loc_* convention without renaming existing IDs. Display labels must never be references.
10. Reuse Core's PRNG algorithm/state, snapshot validation, Scene transactions, immutable hooks, IDs, effect resolution and existing tests; reuse Shell adapter and fixture isolation. Do not replace the old generic Actor factory with V1 candidate restrictions.
11. Existing proofs allow existing-Actor voluntary succession, historical multi-year compression, test attributes and protected public opportunities. V1 instead requires death-only generated successors, no succession time skip, six named stats and shared public work. These proofs must not become production V1 routes without adaptation in the appropriate later milestone. No M0 structural conflict requires a rewrite. Authored HP tables omit Hardy's +2 while Mechanics explicitly includes it; M0 validates authored base stats/loadouts and does not resolve derived HP. Later runtime must use Mechanics' formula. Ordinary Pit defeat can continue an expedition and retain Strain; only expedition-ending defeat clears it.
12. Minimal plan: add Content schemas/validation and representative catalog fixture; add Core shared RNG helper and scoped second-argument services to action resolution, world processes and conflict resolution; keep the existing random snapshot field and PRNG sequence; add focused Core/HearthVale tests; document data contracts, approved rulings, exact test results and future entry point. No folder moves, frameworks, new save envelope, production candidate generation or UI.

## Planned validation boundaries

Catalog validation distinguishes typed stable references from labels, checks nested choices/objectives/knowledge/credit references, validates schema-required values and rejects unknown fields. Generated candidates use a separate validator from authored Actors. Exclusive percentage tables total 100; independent chances are bounded separately. Relative Core desire weights keep their existing semantics.

Representative fixtures prove every supported family without pretending to be the full M3 catalog. Resolver registries passed by the consuming Shell must contain callable handlers; fixture handlers are test-only. Story text and knowledge tags remain authored data, outside UI.

## Scope

Post-audit Hardy resolution: the user explicitly ruled that Hardy grants +2 direct Max HP and +2 CON only for physical-resilience checks, never general/effective CON. The discrepancy noted in item 11 is now resolved by validation, pure formula helpers, regression tests and updates to Mechanics sections 5/10 and Implementation Brief sections 2/11/20. Auron has Max HP 18 and Mira 16; CON and Natural Armor are unchanged. Content's Hardy entry agrees and was left intact. UI/UX section 9's conflicting Max HP example was corrected to 18. See v1-m0-report.md for final verification.

M0 only. The plan above was presented before implementation. M1 requires explicit user approval after M0 review. Existing untracked V1 design documents are user inputs and must be preserved.
