# HearthVale

The clean HearthVale LWE Shell. Milestone 1 creates a minimal world with two unified Actors, assigns one Player Controller, loads HearthVale hooks into Core, and resolves an initial Scene to a saveable checkpoint. No gameplay beyond the bootstrap is implemented.

Requires Node.js >=22 and the sibling `../LWE-Core` repository at v0.1.0 (inspected commit `2933f67`). Run from this directory; no package installation is needed:

```sh
node src/presentation/bootstrap.js
node --test
```

`npm start` and `npm test` are equivalent. Run Core regression tests with `node --test` from `../LWE-Core`.

```js
import { createHearthValeRuntime } from './src/shell/index.js';

const runtime = createHearthValeRuntime({ seed: 1 });
const saved = runtime.save();
const restored = createHearthValeRuntime({ saved });
console.log(restored.view('HV_ROWAN')); // Actor knowledge, not objective world truth
```

`src/shell/core.js` is the only external Core import and uses its documented public entry point. `src/shell` owns game semantics, `src/content` holds minimal placeholder data, and `src/presentation` contains a diagnostic CLI. The returned runtime is the public Core development interface; objective snapshots are for adjudication/inspection, not an omniscient player UI.

Actor identity, base stats, traits, resources, and one Main Goal live in Core Entity data. Player maps to Core `Human`; other Actors use `Autonomous`. AP 4 and Sanity 5 are initial maxima, not immutable caps. Autonomous Actors share the schema but do not spend player AP. Permanent/living/ephemeral policy is Shell data, separate from Core active/retired lifecycle.

The initial Scene records a world-started Event, applies its initialization Consequence, and grants each Actor direct knowledge of their own starting location. It advances no fictional time, charges no AP, and schedules no autonomous accomplishments. Saves use Core's exact checkpoint serialization and restore with fresh Shell hooks; active or suspended Core Scenes remain unsaveable. Schema version 1 is the only current HearthVale world schema.

See [the architecture assessment](docs/architecture-assessment.md) for the source mapping, exact file plan, implementation order, and future gaps. Day/Week behavior, Situations, Pit, and succession are later milestones. Milestone 4 is blocked on a supported causal controller transfer in Core, including handling important Situation opportunity recipients; no Core workaround is implemented.

The parent directory is a workspace container. `LWE-Core` and `HearthVale_Legacy_PreLWE` are separate repositories and were not modified. Legacy remains reference-only with no runtime dependency or migrated content.
