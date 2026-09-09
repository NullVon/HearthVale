# HearthVale

The clean HearthVale LWE Shell. Milestones 1 and 2 prove bootstrap and a six-pillar causal loop with unified Actors, a protected help Situation, legitimate awareness, immediate consequences, a minimal support Relation, Day/Week progression, weighted autonomy, and exact saves. All content is replaceable test/demo data; no production game content is implemented.

Requires Node.js >=22 and the sibling `../LWE-Core` repository at v0.1.0 (inspected commit `2933f67`). Run from this directory; no package installation is needed:

```sh
node src/presentation/bootstrap.js
node src/presentation/six-pillar-demo.js
node --test
```

`npm start`, `npm run demo`, and `npm test` are equivalent. Run Core regression tests with `node --test` from `../LWE-Core`.

```js
import { createHearthValeGame } from './src/shell/index.js';
import { sixPillarFixture, demoIds } from './src/demo/six-pillar-fixture.js';
import { HELP } from './src/shell/actions.js';

const game = createHearthValeGame({ definition: sixPillarFixture(), seed: 1 });
game.perform({ type: HELP, situation: demoIds.situation });
game.perform({ type: HELP, situation: demoIds.situation });
game.endDay();
const saved = game.save();
const restored = createHearthValeGame({ saved });
console.log(restored.view(demoIds.player)); // Actor knowledge, not objective truth
```

`src/shell/core.js` is the only external Core import and uses its documented public entry point. `src/shell` owns rules, `src/demo` isolates all temporary fixtures, and `src/presentation` contains diagnostic CLIs. `createHearthValeRuntime` still exposes the raw Core development interface; `createHearthValeGame` provides player commands. Objective snapshots are for adjudication/inspection, not an omniscient player UI.

Actor identity, base stats, traits, resources, and one Main Goal live in Core Entity data. Player maps to Core `Human`; other Actors use `Autonomous`. AP 4 and Sanity 5 are initial maxima, not immutable caps. Autonomous Actors share the schema but do not spend player AP. Permanent/living/ephemeral policy is Shell data, separate from Core active/retired lifecycle.

The initial Scene records a world-started Event, applies its initialization Consequence, and grants each Actor direct knowledge of their own starting location. It advances no fictional time, charges no AP, and schedules no autonomous accomplishments. Saves use Core's exact checkpoint serialization and restore with fresh Shell hooks; active or suspended Core Scenes remain unsaveable. Schema version 1 is the only current HearthVale world schema.

`beginDayEnd()` completes daily decisions at a saveable Core boundary; `finishDayEnd()` advances the calendar. `endDay()` performs both or finishes a saved closing Day. Protection starts when the direct request is surfaced, permits at most one autonomous contribution per Situation per Week, and prevents autonomous final resolution until it expires. Idle is valid and weekly reconciliation adds no Actor turn.

See [the Milestone 2 report](docs/milestone-2-report.md) for the implemented flow, files, tests, and limits, and [the architecture assessment](docs/architecture-assessment.md) for the authority mapping and implementation order. Pit remains Milestone 3. Succession remains deferred behind [the controller-transfer proposal](docs/core-controller-transfer-gap.md); no Core workaround is implemented.

The [Master Design Handoff](docs/HearthVale_Master_Design_Handoff.md) governs intended game, mechanics, tone, content direction, and prior design decisions. Authority order is current Core contracts → Shell Six Pillars Architecture → Shell Architecture Contracts → Master Design Handoff → Legacy. A lower-priority LOCKED label never overrides newer architecture. The assessment records specific conflicts and their governing interpretations; bootstrap attributes and names remain proof fixtures.

The parent directory is a workspace container. `LWE-Core` and `HearthVale_Legacy_PreLWE` are separate repositories and were not modified. Legacy remains reference-only with no runtime dependency or migrated content.
