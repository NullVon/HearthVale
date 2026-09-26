# HearthVale V1 M0 completion report

M0 technical foundation is complete. All existing and new tests pass. No production M1 gameplay or UI was implemented. Changes remain in the working trees; no commits or publication were requested.

## Architecture and reuse

Both repositories retain JavaScript ESM and Node's built-in test runner with no new dependencies or build system. Core retains its six-pillar modules and public API boundary. HearthVale retains its separate Shell, Content, Story and UI folders. The complete pre-edit audit and plan are in v1-m0-audit.md.

Reused: Core lcg32 sequence and saved uint32 state, snapshot validation/versioning, Scene transaction drafts and rollback, generic effects, identity allocation, immutable hook inputs, Information and causal history; HearthVale's sole Core adapter, bootstrap, game save/load and diagnostic fixture architecture. Existing proof rules were preserved.

## Files created

LWE-Core:

* src/infrastructure/random.js — shared existing PRNG step and scoped synchronous resolution capability.
* tests/random.test.js — nine deterministic-state, replay, rollback and capability tests.
* docs/deterministic-rng.md — generic hook/save contract and explicit optional Dice injection.

HearthVale:

* HearthVale_Content/schema.js — strict declarative catalog and candidate schemas.
* HearthVale_Content/validation.js — diagnostics, identity/reference linking and V1 semantic validation.
* tests/fixtures/v1-content.js — representative authored-data fixtures and explicit test-only resolver registry.
* tests/v1-validation.test.js — 64 validation tests, including deliberately malformed fixtures.
* tests/v1-rng.test.js — three HearthVale integration/replay tests.
* tests/hardy.test.js — three Hardy scope, derived-value and invalid-data regression tests.
* docs/v1-m0-audit.md — twelve-point pre-edit audit and implementation plan.
* docs/v1-m0-contracts.md — data contracts, approved rulings, limitations and M1 entry point.
* docs/v1-m0-report.md — this report.

## Files modified

LWE-Core:

* src/core/scene-progression/index.js — uses the shared unchanged PRNG recurrence; passes scoped services to conflict and world-process hooks.
* src/core/actors-actions/index.js — passes scoped services to custom Action resolution.
* README.md — links the deterministic RNG contract.

HearthVale:

* README.md — identifies V1 authority, M0 entry points and the distinction from prior proof milestones.
* HearthVale_Shell/src/actors.js — pure constitution-derived values and separately scoped check bonus.
* docs/HearthVale_V1_VS_Mechanics.docx — authoritative Hardy scope and corrected derived values.
* docs/HearthVale_V1_VS_Implementation_Brief.docx — reconciliation, formula and validation requirements for Hardy.
* docs/HearthVale_V1_VS_UI-UX_Guide.docx — one conflicting character-screen Max HP value corrected.

The previously untracked V1 design documents remain user inputs. The Hardy follow-up explicitly authorized the targeted document edits above. Content and Story remain byte-identical. No save-format files, optional Dice implementation, legacy repository, UI or Story runtime were modified. The pure Actor math added for the Hardy ruling does not introduce M1 gameplay.

## Validation and stable IDs

Catalog schema version 1 covers all requested families, typed references, nested Event choices, Situation objectives/resolvers/terminal paths, dialogue state/voice/knowledge tags, and record subjects/credit. Errors are aggregated with precise paths in ContentValidationError. Unknown fields fail. Resolver references require callable registry entries. Validation does not mutate input.

Authored IDs are globally unique Core-compatible strings, separate from display text. Nested choice/objective/path IDs participate in duplicate checking. Candidate IDs are runtime instance IDs. Future production runtime allocation still uses persisted sequences and Core Entity collision checks. Full M3 catalog loading is not claimed; representative fixtures prove every schema family.

Generated candidates enforce six stats totaling 12, integer range 1–4, at most one 4, exactly two different Innate Traits, incompatibility metadata and Lucky/Lucky Bastard exclusion, two different Tier-1 starting weapons, Bow/Arrow consistency, starting armor/Potion/Gold/Hearts/age/spell constraints. Auron and Rook use authored Actor validation, preserving their exceptions.

Exclusive weighted tables must total 100%, with only floating-point representation noise tolerated. Independent percentages each lie in 0–100 and are not summed. The 55/50/45/30 harvest example passes at a total of 180. Core relative desire weights remain unchanged. Enemy selection is validated separately at NEAR/FAR and rejects FAR deadlocks. Public Situation eligibility and meaningful record credit are explicit.

## Determinism and save integration

Core's existing lcg32 algorithm is unchanged: uint32 multiply/add recurrence, output in [0,1). Seeds include zero and uint32 max. Custom Action resolution, conflict resolution and world processes receive `{ rng }` as a second argument. Old one-argument hooks work unchanged. Autonomous selection and ties share this stream.

The capability expires when its synchronous hook returns or throws. It cannot mutate committed state afterward. Read/eligibility hooks receive no RNG. Draws live in Core's transaction draft; thrown errors or invalid effects roll back both world changes and random state. Optional Dice receives this RNG explicitly rather than constructing a separate stream or using its platform-random fallback.

Core save format 1 already serializes state.random; HearthVale world schema remains 1. No parallel save service or duplicate state was created. Tests advance seeded RNG, save, record many future draws, reload repeatedly and compare exact sequences and final byte-identical saves. HearthVale tests round-trip through createHearthValeGame's actual load/save API and combine diagnostic draws with existing daily autonomous choices.

## Test commands and complete results

Each command ran from the indicated repository directory. No package installation was needed.

| Repository | Command | Run | Tests | Pass | Fail | Cancelled | Skipped | Todo |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LWE-Core | `node --test` | Pre-edit baseline | 64 | 64 | 0 | 0 | 0 | 0 |
| HearthVale | `node --test` | Pre-edit baseline | 47 | 47 | 0 | 0 | 0 | 0 |
| LWE-Core | `node --test tests/random.test.js` | Focused M0 | 9 | 9 | 0 | 0 | 0 | 0 |
| HearthVale | `node --test tests/v1-validation.test.js` | Focused M0 | 64 | 64 | 0 | 0 | 0 | 0 |
| LWE-Core | `node --test` | Initial M0 full suite | 73 | 73 | 0 | 0 | 0 | 0 |
| HearthVale | `node --test` | Initial M0 full suite | 114 | 114 | 0 | 0 | 0 | 0 |
| LWE-Core | `node --test` | Final Hardy follow-up full suite | 73 | 73 | 0 | 0 | 0 | 0 |
| HearthVale | `node --test` | Final Hardy follow-up full suite | 117 | 117 | 0 | 0 | 0 | 0 |

Final total: **190 passing tests**, including all 111 pre-existing tests and 79 new M0 tests. Final full-suite durations reported by Node: Core 4186.0733 ms; HearthVale 3760.8067 ms. Every test command exited 0. Runtime: Node v24.19.0.

Validation coverage includes valid fixtures; same/cross/nested duplicate IDs; missing/wrong-type references; unknown fields; equipment values; spells; Traits; Actor stats; enemy HP/moves/ranges/FAR deadlock; hazards; Event targets; Situation objective/resolver/eligibility/paths; dialogue tags/domains/knowledge/voice; record subject/credit; exclusive percentages; independent/harvest percentages; Lucky Bastard rarity; unsafe IDs; later playable Strata; service removal without fallback; candidate total/range/fours/weapons/Arrows/Traits/spells/starting package; permitted contradictory Traits; malformed root data. RNG coverage includes seeds, exact recurrence, state serialization, repeated load continuation, rollback, read purity, shared streams, expired capabilities, explicit Dice injection and async rejection.

`git diff --check` was also run in both repositories, with per-command safe.directory overrides for the sandbox account; neither reported whitespace errors. Git printed ordinary LF/CRLF conversion notices. A source search for Math.random, randomUUID, Date.now and createSeededRng in HearthVale Shell/Content and mandatory Core returned no matches (rg exit 1 means no matches).

## Approved rulings and remaining risks

The contracts document records expedition-local Strain and every expedition-ending reset, initial-only exact Could-Have identity retention, and ordinary service Actors excluded from unscripted lethal/service-removing outcomes. Authored removal requires an explicit consequence/fallback reference. Production implementations of those rules remain in their scheduled milestones.

No Hardy discrepancy remains in the governing rule: +2 direct Max HP; +2 CON only on physical-resilience checks. The latter cannot affect base/effective CON, derived HP, Natural Armor, training, prerequisites or general CON calculations. Auron has CON 3, Max HP 18, Natural Armor 1; Mira has CON 2, Max HP 16, Natural Armor 1. Validation rejects broad CON modifiers and double counting; pure formula/check helpers and three new tests enforce this separation. Mechanics and the Implementation Brief expressly supersede old table values omitting the direct bonus. Content's Hardy entry already matches and is unchanged as requested. Ordinary Pit defeat continuing an expedition preserves Strain; expedition-ending defeat clears it.

## Exact Hardy follow-up changes

All paths below are relative to HearthVale; LWE-Core was not modified by this follow-up.

* HearthVale_Shell/src/actors.js
* HearthVale_Content/validation.js
* tests/fixtures/v1-content.js
* tests/hardy.test.js (new)
* docs/HearthVale_V1_VS_Mechanics.docx
* docs/HearthVale_V1_VS_Implementation_Brief.docx
* docs/HearthVale_V1_VS_UI-UX_Guide.docx
* docs/v1-m0-audit.md
* docs/v1-m0-contracts.md
* docs/v1-m0-report.md

Exact authoritative document sections:

* Mechanics section 5, Traits, Hearts & Scars: explicit Hardy bonus scopes and excluded uses.
* Mechanics section 10, Combat Runtime / Actor values and universal checks: direct HP formula clarification and Auron/Mira examples superseding omitted-bonus table values.
* Implementation Brief section 2, Audit Results & Reconciliation Rulings: authoritative ruling and corrected values.
* Implementation Brief section 11, Combat State Machine / Combat formulas / invariants: separate direct HP and check-only effects.
* Implementation Brief section 20, M0 Technical Foundation: Validation & Determinism: required checks against general CON bonuses/double counting and regression expectations.
* UI/UX Guide section 9, Character Screen: its CON-3 Hardy character example changed only MAX HP 16 to MAX HP 18. This was an actual numerical contradiction, meeting the user's condition for editing UI/UX.

Content section 8, Innate Traits, Hearts & Scars already says +2 Max HP and +2 on physical-resilience/endurance CON checks, so Content was not edited. Story and the Master Design were also unchanged.

Document verification: rendered and visually inspected all 50 pages across Mechanics (12), Implementation Brief (21), and UI/UX Guide (17). All three DOCX archives pass integrity checks; only word/document.xml changed, preserving all other package parts. Content, Story, and Master Design are byte-identical to their pre-follow-up versions.

Remaining technical limits: these are representative fixtures, not the full M3 catalog; structural knowledge guards cannot prove prose truth or resolver behavior; later runtime tests must enforce per-holder Information and actual service selection rules. Schema extensions must accompany future authored fields. lcg32 is retained for save compatibility, not cryptographic quality. Existing optional Dice defaults to platform randomness when called without injection, so HearthVale integration must always provide the scoped RNG. Existing pre-V1 voluntary-succession/history proofs must not be exposed as V1 production routes. No browser packaging or UI work was in M0 scope.

## Clean M1 entry point

After explicit approval, add a V1 bootstrap/application entry beside the existing proof runtime. Load validated Content, create candidate profiles inside a Core resolution hook using its scoped RNG, persist them before selection, and let Story/UI render those resolved profiles. Reuse Core effects, Information and save snapshots. Historical opening, candidate UI, Inn and Surface Day-2 thread start only in M1.
