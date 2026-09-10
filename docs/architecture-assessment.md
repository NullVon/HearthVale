# HearthVale foundation assessment

Post-Milestone 3 update: the separately authorized [controller-transfer review](core-controller-transfer-gap.md) confirmed and resolved the generic controller/opportunity-transfer gap in unreleased Core changes. All 64 Core tests and 38 unchanged HearthVale tests pass. The historical assessments below describe the gap at their original milestones. Milestone 4 is now unblocked on that capability; succession itself remains unimplemented, and Shell routing must be refreshed when control changes.

Repository paths below reflect the [structural reorganization](repository-reorganization.md): rules, test fixtures, and diagnostic CLIs now live under `HearthVale_Shell`; documentation and shared integration tests remain at the repository root. Future Content, Story, and UI layers are empty placeholders.

Milestones 1–3 use LWE Core v0.1.0 without Core changes. The original bootstrap assessment below remains the source mapping; [the Milestone 2 report](milestone-2-report.md) records the completed six-pillar fixture proof and [the Milestone 3 report](milestone-3-report.md) records the completed Pit lifecycle proof. Succession needs a generic controller mutation capability before Milestone 4; [the proposal](core-controller-transfer-gap.md) remains unimplemented.

## Sources and repository findings

Inspected Core at commit `2933f67` (`chore: prepare LWE Core v0.1.0`): its public API, all six pillar implementations, persistence, implementation guidance, fixtures, and tests. Read the Core Contracts v1 and Six Pillars v1 Word records and the supplied HearthVale Six Pillars and Architecture Contracts v1 Word records. The attached task brief defines this pass's scope; document design statements are architectural reference material, not independent authorization to implement every described mechanic.

No AGENTS.md was found in the workspace. Core and the new HearthVale had clean Git working trees. The parent is a container, not a repository. The new HearthVale contained only README.md. Conventions are dependency-free JavaScript ES modules, Node >=22, and node:test. No hosting configuration or existing UI needs extending.

The [Master Design Handoff](HearthVale_Master_Design_Handoff.md) was supplied and read after the bootstrap assessment. It is authoritative for intended game, mechanics, tone, content direction, and prior design decisions wherever compatible with the newer contracts. Legacy inspection was limited to its README and package metadata: these describe an earlier LWE adapter/playtest despite the PreLWE directory name. Nothing is copied or imported from it.

Apply this authority order, including when a lower-priority statement is labeled LOCKED:

1. Current LWE Core contracts.
2. HearthVale Shell Six Pillars Architecture.
3. HearthVale Shell Architecture Contracts.
4. HearthVale Master Design Handoff.
5. Legacy HearthVale implementation.

The handoff's historical continuation instructions (sections 87 and 90, post-combat rewards) do not replace the user's current Shell milestone scope. CURRENT/PROVISIONAL values remain provisional; TBD and LATER BOX entries do not authorize speculative implementation.

### Master Design reconciliation

Preserve its phone-first scripted-text generational life RPG direction: one evolving town and The Pit, meaningful relationships and legacy, dangerous low-number combat, preparation and player learning, weighted templates without a required runtime AI backend, and a richer inherited world rather than inherited maximum character power. Its five-day week, ten-day season, forty-day year, six stats (STR/DEX/CON/INT/WIS/CHA), spendable training XP, Hearts, duel combat, and other compatible mechanics remain design sources for their future milestones.

| Handoff passage | Governing interpretation |
| --- | --- |
| 9.1: starting AP around 3–4; 14.4 and 87.12: maximum Sanity unresolved | Newer architecture supplies baseline Max AP 4 and Max Sanity 5; both may grow. Remaining growth/recovery formulas are not thereby decided. |
| 9.3: possible extra AP for changing Strata | Superseded: the whole Pit expedition costs one AP, including ordinary internal movement across Strata. |
| 17.2: pre-generation autosave and reload may produce different content | Exact snapshot restoration wins. Restore saved procedural state and deterministic RNG; do not reroll on load. A pre-generation checkpoint must resume generation consistently. Home/Waystone manual-save restrictions and Floor autosave direction can remain future UI policy at valid Core checkpoints; Chapter/succession boundary saves are also required. |
| 45.2: every generated middle Stratum remains permanent in that save | Generation alone does not entitle unseen disposable Pit content to permanence. Preserve recognized permanent discoveries and meaningful causal history; eligible undiscovered procedural state may change at Chapter boundaries. |
| 50.1: layered generator called a Core primitive; 8 and 87.56: shared rain signature | Use existing generic Core support where available. HearthVale content categories, generators, weather dates, and their meaning belong in Shell/content; these labels do not authorize Core additions. |
| 59 and 62: NPC minimum/tier models; 63.4: refresh/reskin the cast as fallback | One Actor model governs every represented person, including the player. Personality/value/flaw may enrich content, but do not replace the required identity, attributes/resources, traits, one Main Goal, and controller. Compression must preserve meaningful world state, identities, history, and existing successors; no wholesale cast reset that violates continuity. |
| 68.3: persistent NPC requests are separate; 70 and 87.30: rumor system | Separate content sources and presentation are valid. Requests/Guild work use Situations; rumors use Information. Do not create parallel causal quest or rumor engines. |
| 51 and 87.27: world knowledge registry | Keep objective truth separate from Actor claims. Recognized permanent Pit discoveries have the newer shared-discovery exception; incidental/private Pit happenings do not become public automatically. |
| 60–61 and 87.33: autonomous goal activity and cadence | Main Goals weight choices rather than guarantee activity. At most one meaningful off-screen accomplishment per Actor per Day; Week is reconciliation with no extra turn. Player Priority and the Situation-wide weekly contribution limit govern relevant opportunities. |
| 7, 63, and 75–78: interludes, compression, successor types | Preserve compatible chronology and succession design, including variable gaps and mentorship. Use compressed historical resolution and transfer the controller within the continuing world. Do not replay skipped Days or rebuild an existing successor as a special player entity. |

The bootstrap's `resolve` attribute and fixed names are explicit proof fixtures, not the canonical game stat roster or character generator. Adopt the handoff's six-stat model when implementing real mechanics. The separately designed production Content layer remains out of scope: Milestone 2 uses generic test IDs and parameters in `HearthVale_Shell/fixtures`, with no cast, quest catalog, stat balancing, or Legacy migration. The reported controller-transfer and history-compaction capability gaps remain unchanged.

## A. Actual public extension points

Import only `LWE-Core/src/api/index.js`, the entry point declared by Core's package exports. It exports `createRuntime`, `evaluate`, `selectWeighted`, and `compareContest`. There is no Shell registry, plugin discovery, content registry, initialization callback, or loader service. Loading means constructing a runtime with `shell` hooks and bootstrap `entities`, `globals`, and optionally `relations` and `seed`.

Runtime commands are `startScene`, `submit`, `resolveScene`, `deferAttempts`, `interrupt`, and `resume`. Read APIs are `entity`, `snapshot`, `view`, `available`, `history`, `why`, and `trace`. `save()` returns JSON; `createRuntime({saved, shell})` restores it. Shell functions must be supplied again, run synchronously, and must have no external side effects. Returned data and hook inputs are detached and frozen.

Supported hooks are `actions[type].eligible/resolve`, `available`, `desires`, `choices`, `conflicts`, `consequences`, `perceive`, `worldProcesses`, `offscreenActors`, and `surfaceOpportunity`. Specialized Action resolvers return effects; they do not mutate state. Core's built-in Actions are Move, Take, Give, Communicate, Interact, and Wait.

## B and G. Structure and exact Milestone 1 file plan

Create these files under HearthVale, and update its existing README.md:

```text
package.json                        ESM metadata, test and bootstrap commands
HearthVale_Shell/src/core.js                    sole external Core import
HearthVale_Shell/src/actors.js                  unified Actor construction and semantic checks
HearthVale_Shell/src/world.js                   content-to-Core bootstrap records
HearthVale_Shell/src/index.js                   Shell hooks and runtime composition
HearthVale_Shell/fixtures/bootstrap-fixture.js  two placeholder people and one location
HearthVale_Shell/cli/bootstrap.js        command-line bootstrap inspection
tests/bootstrap.test.js              focused integration and boundary checks
docs/architecture-assessment.md      this assessment and milestone plan
README.md                           run instructions and scope
```

No empty domain directories or speculative frameworks. Introduce action, information, situation, progression, persistence, Pit, and succession modules when their respective proofs need them. The CLI is diagnostic presentation; it is not a player knowledge view or a gameplay engine. No installation, build, Core branch, or implementation commit is needed.

## C. Architecture mapping

| HearthVale contract | Actual Core mechanism and Shell responsibility |
| --- | --- |
| World State | `createRuntime({entities, globals, relations})`; arbitrary JSON in Entity data. Use `data.persistence` for permanent/living/ephemeral policy and retain Core `lifecycle: active` for active Actors. Permanent does not mean immutable. Core records history separately from current truth and claims. |
| Actors + Actions | Entity `actor.controller` is `Human` or `Autonomous`; HearthVale Player Controller maps to Human. Both use `submit` and the same eligible/resolve pipeline. AP, probabilistic skill rules, and physical requirements belong to Shell. |
| Information | `view(actor)`, explicit `perceive` grants, `learn` effects, and Communicate; claims have Event sources and lineage. Presence does not grant knowledge. Shared recognized Pit discoveries require a defined Shell disclosure path, not global synchronization. |
| Situations | Entity `situation` component, terminal predicate paths, `surfaceOpportunity`, and `situation` effects. Shell data tracks day/week deadlines, protection, and the last autonomous contribution week for the whole Situation. Core numeric priority is ordering, not player reservation. Core `expiresAt` counts Scene boundaries; do not use it as a Day/AP deadline. |
| Events + Consequences | Action result effects and `worldProcesses` create Events; `consequences` adds effects. Operations include create, retire, data, relation, global, move, contain, learn, forget, situation, emit. `due` is an absolute Core boundary; `when` revalidates. `why/trace/history` retain causal provenance. Shell defines later reactions to changed state. |
| Scene Progression | `startScene/submit/resolveScene`; nested interruption is available. Each resolution advances a Core boundary, not fictional time. Shell calendar changes use Consequences. Off-screen budget defaults to zero. Day activity must be explicitly scheduled and limited to 0–1 accomplishment per Actor; Week grants no extra turn. |
| Actor Model | Shared Core component plus Shell data: identity, attributes (base stats, traits, resources), and exactly one mainGoal. No player entity class or duplicate controller field. |
| Content Rules | Content supplies concrete records and parameters to Shell mechanics. No imperative content engine. No Core content registration API is required. |
| Persistence | Core saves full world and deterministic control state, including queues and RNG; re-supply hooks on restore. All current Shell state remains in Core records. Future Shell schema changes require explicit version handling. Saving active or suspended Scenes is forbidden. |
| Pit | Shell-owned persistent Entity and procedural data; short completed Core Scenes allow immediate permanent discoveries and checkpoints while an expedition remains active in Shell data. Avoid keeping a parent Core Scene suspended for the whole expedition if saving inside it is required. One expedition costs one AP; internal Scenes grant no broader Actor activity. |
| Succession | Shell chooses successor, saves before the transition, and preserves IDs, state, and history. Actual controller reassignment currently lacks a supported generic Consequence operation; see gap below. |

## D. Genuine gaps and smallest solutions

**Controller transfer blocks Milestone 4, not creation in Milestone 1.** HearthVale needs existing Actor A to become Autonomous and existing Actor B to become Human through causal resolution. Core accepts both controller values at bootstrap, but `world-state.change` supports no actor/component mutation. A `data` effect changes only `entity.data[key]`, not `entity.actor.controller`. Saving and rewriting JSON, retiring/recreating Actors, or keeping a second Shell controller truth would bypass the contract. The smallest proposed Core addition is a generic validated controller-change Consequence with before/after provenance, rollback, and save/reload coverage. HearthVale must still own one-player enforcement and successor eligibility. Important Situations currently store a fixed Human opportunity recipient and Core validates that reference on each mutation; safe transfer must also address existing opportunity recipients through a supported causal mechanism. Review these together before implementing succession. No Core change is made here.

**History compaction is unavailable.** Core retains operational attempts/Events/Consequences, has no public prune/compact API, and prevents history mutation through ordinary World operations. Retention of meaningful records works now. Deleting low-level history while preserving references would need generic Core support if later required; the minimal foundation simply retains it. Compressed simulation of skipped chronology is a separate Shell concern and can summarize changes through Events without replaying every Day.

**No bootstrap blocker or major Core redesign is required.** AP, Sanity, priority windows, daily cadence, Pit rules, succession eligibility, and calendar compression remain Shell responsibilities. Report/review the future generic gaps before changing Core rather than distorting the Shell to conceal them.

## E. Conflicts and cautions

- Core uses Human/Autonomous names and only selects active Actors; Shell lifetime categories must not replace `lifecycle: active`.
- Current Shell documents supersede fixed maximum AP, per-Stratum AP charges, extra weekly Actor accomplishments, and ordinary gossip for recognized permanent Pit discoveries.
- Direct consequences become visible after a completed Core Scene. Future user commands should complete a short Scene before offering a subsequent same-Day Action.
- Important Situation surfacing is a hook, not a guarantee of a reasonable awareness window by itself. HearthVale must guard terminal eligibility during its protection window and distinguish protection expiry from failure.
- `offscreenActors` receives only boundary, not objective world or Scene context. Future Day scheduling must avoid mutable closure state: derive candidates from serialized state outside resolution or use explicit attempts and serializable boundary policy; decision choices must still use legitimate Actor context.
- A long chronology jump changes Shell calendar data through a bounded historical Event resolution; Core's recommendation to repeat windows is not a requirement to replay skipped fictional Days.

## F. Exact implementation order

1. Milestone 1: compose Core through its public entry point, construct minimal unified Actors and world data, load Shell hooks, resolve an initial zero-time Scene, and verify the bootstrap and exact checkpoint restoration.
2. Milestone 2: one social Action and Situation, legitimate awareness, relationship consequence, protection and weekly contribution guards, Day/Week policies, deterministic autonomous choices, then full save/reload proof. Test every causal and information boundary before adding content.
3. Milestone 3: one-AP expedition, internal short Scenes, immediate named discovery, return policy, disposable procedural reroll, and exact active-expedition checkpoints.
4. Before Milestone 4: report and resolve the generic controller/opportunity transfer gap in a separately authorized Core task. Then test pre-transfer saves, existing-Actor transfer, optional compressed chronology, history/world continuity, and reload.
5. Milestone 5: deliberately classify legacy material as Shell rule, content, presentation, or obsolete only after the preceding proofs pass.

Core baseline verification: 56 tests passed before implementation. Broader gameplay tests belong to later milestones; this bootstrap does not claim to prove them.

## Milestone 3 result

The minimal Pit proof implements a persistent Pit, one-AP entry, free internal steps/discovery/return, immediate permanent recognized discovery, explicit return reconciliation, and exact active-expedition checkpoints. Internal Core boundaries do not advance the HearthVale calendar or daily autonomous activity. Return permits broader resolution again; the existing explicit Day-end policy remains responsible for daily decisions and calendar advancement. Shared discovery records disclose only the recognized location, not incidental local events.

A deterministic test-only reconstruction boundary retires an undiscovered ephemeral space and replaces it while retaining the Named Location and its causal history. Retirement preserves Core historical references; this is neither history pruning nor a full Chapter generator. All 38 HearthVale tests, 56 Core regressions, and three CLI smoke tests pass. Core and Legacy Git working trees remain clean, and the only external implementation import is Core's public API. No new Core gap or architecture contradiction was found. Review the existing controller/opportunity-transfer proposal in a separately authorized Core task before beginning Milestone 4; production Content, Story, and UI remain empty placeholders.

## Milestone 1 result

Implemented the file plan above. All 8 HearthVale integration tests and all 56 Core regression tests pass. The CLI successfully reports two Actors, one Human controller, Core boundary 1, Day 1, and a stable checkpoint. Tests verify the initialization Event/Consequence, Actor data, legitimate initial claims, unchanged AP/calendar during ordinary Scenes, exact save/reload and continued resolution, checkpoint/schema rejection, and runtime isolation. Import inspection confirms the single public Core dependency and no Legacy dependency. Git whitespace checking passed for the tracked diff; Core remains clean. No Core or Legacy files were changed.

## Milestone 2 result

The six-pillar proof adds causal help Situation creation/resolution, direct awareness, same-Day support and progress changes, player AP, protection and its expiry, a Situation-wide autonomous weekly contribution allowance, weighted daily goal/help/idle selection, and Day/Week completion. Daily decision markers and all temporary state survive exact reload, including between completed decision and calendar Scenes. Core still owns eligibility execution, selection, Events, Consequences, claims, lifecycle evaluation, and persistence. The fixed autonomous routing cohort is reconstructed from saved Actors; its decision hooks receive only Core's local projection.

All 26 HearthVale tests (8 retained plus 18 new), 56 Core regressions, and both CLI smoke tests pass. The original bootstrap fixture moved from `src/content/bootstrap.js` to `HearthVale_Shell/fixtures/bootstrap-fixture.js`; production Content is not populated. No new Core gap or internal architecture conflict was found. See the milestone report for limitations and exact changed files. The foundation is ready for the minimal Milestone 3 Pit proof; production Content and succession remain deferred.
