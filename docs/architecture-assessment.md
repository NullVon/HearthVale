# HearthVale foundation assessment

Milestone 1 can use LWE Core v0.1.0 without Core changes. This pass implements only the Shell bootstrap. Succession needs a generic controller mutation capability before Milestone 4; no workaround or Core modification is part of this pass.

## Sources and repository findings

Inspected Core at commit `2933f67` (`chore: prepare LWE Core v0.1.0`): its public API, all six pillar implementations, persistence, implementation guidance, fixtures, and tests. Read the Core Contracts v1 and Six Pillars v1 Word records and the supplied HearthVale Six Pillars and Architecture Contracts v1 Word records. The attached task brief defines this pass's scope; document design statements are architectural reference material, not independent authorization to implement every described mechanic.

No AGENTS.md was found in the workspace. Core and the new HearthVale had clean Git working trees. The parent is a container, not a repository. The new HearthVale contained only README.md. Conventions are dependency-free JavaScript ES modules, Node >=22, and node:test. No hosting configuration or existing UI needs extending.

The Master Design was not found by filename or Markdown/text references in this workspace. Do not infer its missing content. The newer Shell documents explicitly identify superseded AP, Pit, and weekly progression assumptions. Legacy inspection was limited to its README and package metadata: these describe an earlier LWE adapter/playtest despite the PreLWE directory name. Nothing is copied or imported from it.

## A. Actual public extension points

Import only `LWE-Core/src/api/index.js`, the entry point declared by Core's package exports. It exports `createRuntime`, `evaluate`, `selectWeighted`, and `compareContest`. There is no Shell registry, plugin discovery, content registry, initialization callback, or loader service. Loading means constructing a runtime with `shell` hooks and bootstrap `entities`, `globals`, and optionally `relations` and `seed`.

Runtime commands are `startScene`, `submit`, `resolveScene`, `deferAttempts`, `interrupt`, and `resume`. Read APIs are `entity`, `snapshot`, `view`, `available`, `history`, `why`, and `trace`. `save()` returns JSON; `createRuntime({saved, shell})` restores it. Shell functions must be supplied again, run synchronously, and must have no external side effects. Returned data and hook inputs are detached and frozen.

Supported hooks are `actions[type].eligible/resolve`, `available`, `desires`, `choices`, `conflicts`, `consequences`, `perceive`, `worldProcesses`, `offscreenActors`, and `surfaceOpportunity`. Specialized Action resolvers return effects; they do not mutate state. Core's built-in Actions are Move, Take, Give, Communicate, Interact, and Wait.

## B and G. Structure and exact Milestone 1 file plan

Create these files under HearthVale, and update its existing README.md:

```text
package.json                        ESM metadata, test and bootstrap commands
src/shell/core.js                    sole external Core import
src/shell/actors.js                  unified Actor construction and semantic checks
src/shell/world.js                   content-to-Core bootstrap records
src/shell/index.js                   Shell hooks and runtime composition
src/content/bootstrap.js            two placeholder people and one location
src/presentation/bootstrap.js        command-line bootstrap inspection
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

## Milestone 1 result

Implemented the file plan above. All 8 HearthVale integration tests and all 56 Core regression tests pass. The CLI successfully reports two Actors, one Human controller, Core boundary 1, Day 1, and a stable checkpoint. Tests verify the initialization Event/Consequence, Actor data, legitimate initial claims, unchanged AP/calendar during ordinary Scenes, exact save/reload and continued resolution, checkpoint/schema rejection, and runtime isolation. Import inspection confirms the single public Core dependency and no Legacy dependency. Git whitespace checking passed for the tracked diff; Core remains clean. No Core or Legacy files were changed.
