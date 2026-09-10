# HearthVale

The clean HearthVale LWE Shell. Milestones 1–3 prove bootstrap, a six-pillar causal loop, and a minimal persistent Pit expedition with immediate permanent discovery and exact saves. All content is replaceable test/demo data; no production game content is implemented.

Repository layout:

```text
HearthVale/
├── HearthVale_Shell/
│   ├── src/          # current Shell rules and Core adapter
│   ├── fixtures/     # replaceable bootstrap, six-pillar, and Pit demo data
│   └── cli/          # Shell diagnostics, not production UI
├── HearthVale_Content/  # future production Content (.gitkeep only)
├── HearthVale_Story/    # future authored narrative (.gitkeep only)
├── HearthVale_UI/       # future presentation (.gitkeep only)
├── docs/               # architecture, design, and reports
├── tests/              # shared integration tests
├── package.json        # repository-level scripts and package entry point
├── README.md
└── .git/
```

The diagnostic CLIs and fixtures accompany the Shell proof. Production Content, Story, and UI remain separately designed layers with no implementation yet. See [the reorganization report](docs/repository-reorganization.md) for the move inventory and verification.

Requires Node.js >=22 and the sibling `../LWE-Core` repository at v0.1.0 (inspected commit `2933f67`). Run from this directory; no package installation is needed:

```sh
node HearthVale_Shell/cli/bootstrap.js
node HearthVale_Shell/cli/six-pillar-demo.js
node HearthVale_Shell/cli/pit-demo.js
node --test
```

`npm start`, `npm run demo`, `npm run demo:pit`, and `npm test` are equivalent. Run Core regression tests with `node --test` from `../LWE-Core`.

```js
import { createHearthValeGame } from './HearthVale_Shell/src/index.js';
import { sixPillarFixture, demoIds } from './HearthVale_Shell/fixtures/six-pillar-fixture.js';
import { HELP } from './HearthVale_Shell/src/actions.js';

const game = createHearthValeGame({ definition: sixPillarFixture(), seed: 1 });
game.perform({ type: HELP, situation: demoIds.situation });
game.perform({ type: HELP, situation: demoIds.situation });
game.endDay();
const saved = game.save();
const restored = createHearthValeGame({ saved });
console.log(restored.view(demoIds.player)); // Actor knowledge, not objective truth
```

`HearthVale_Shell/src/core.js` is the only external Core import and uses its documented public entry point. `HearthVale_Shell/src` owns rules, `HearthVale_Shell/fixtures` isolates all temporary fixtures, and `HearthVale_Shell/cli` contains diagnostic CLIs. `createHearthValeRuntime` still exposes the raw Core development interface; `createHearthValeGame` provides player commands. Objective snapshots are for adjudication/inspection, not an omniscient player UI.

Actor identity, base stats, traits, resources, and one Main Goal live in Core Entity data. Player maps to Core `Human`; other Actors use `Autonomous`. AP 4 and Sanity 5 are initial maxima, not immutable caps. Autonomous Actors share the schema but do not spend player AP. Permanent/living/ephemeral policy is Shell data, separate from Core active/retired lifecycle.

The initial Scene records a world-started Event, applies its initialization Consequence, and grants each Actor direct knowledge of their own starting location. It advances no fictional time, charges no AP, and schedules no autonomous accomplishments. Saves use Core's exact checkpoint serialization and restore with fresh Shell hooks; active or suspended Core Scenes remain unsaveable. Schema version 1 is the only current HearthVale world schema.

`beginDayEnd()` completes daily decisions at a saveable Core boundary; `finishDayEnd()` advances the calendar. `endDay()` performs both or finishes a saved closing Day. Protection starts when the direct request is surfaced, permits at most one autonomous contribution per Situation per Week, and prevents autonomous final resolution until it expires. Idle is valid and weekly reconciliation adds no Actor turn.

The Pit fixture supports `hearthvale.enter-pit`, `hearthvale.advance-pit`, `hearthvale.recognize-pit-discovery`, and `hearthvale.exit-pit` through `game.perform({ type, targets: [pitIds.pit] })`. Import these constants from `HearthVale_Shell/src/pit.js` and fixture definitions from `HearthVale_Shell/fixtures/pit-fixture.js`. Entry spends exactly one AP; internal steps, discovery, and return spend none. Each command completes a short Core Scene, allowing exact saves while the Shell expedition remains active. Day completion is blocked inside the Pit. Return reconciles the expedition; explicit Day completion then resumes normal daily autonomy and calendar progression.

`game.sharedDiscoveries()` exposes recognized permanent discoveries only. Local expedition claims remain Actor knowledge. The deterministic reconstruction helper is test scheduling infrastructure: it replaces undiscovered ephemeral space while retaining the permanent location and causal history. It is not a player command, Chapter generator, or shortcut system.

See [the Milestone 3 report](docs/milestone-3-report.md) for the Pit flow, files, 38 HearthVale tests, and limits; [the Milestone 2 report](docs/milestone-2-report.md) records the earlier causal loop. The [architecture assessment](docs/architecture-assessment.md) records authority and implementation order. Succession remains deferred behind [the controller-transfer proposal](docs/core-controller-transfer-gap.md); no Core workaround is implemented.

The [Master Design Handoff](docs/HearthVale_Master_Design_Handoff.md) governs intended game, mechanics, tone, content direction, and prior design decisions. Authority order is current Core contracts → Shell Six Pillars Architecture → Shell Architecture Contracts → Master Design Handoff → Legacy. A lower-priority LOCKED label never overrides newer architecture. The assessment records specific conflicts and their governing interpretations; bootstrap attributes and names remain proof fixtures.

The parent directory is a workspace container. `LWE-Core` and `HearthVale_Legacy_PreLWE` are separate repositories and were not modified. Legacy remains reference-only with no runtime dependency or migrated content.
