# Repository reorganization

The current Shell implementation is now under `HearthVale_Shell`. This is a path-only reorganization; game rules, fixture values, save schema, and Core integration behavior are unchanged. Milestone 3 has not begun.

## Moved files

| Previous directory | New directory | Files |
| --- | --- | --- |
| `src/shell/` | `HearthVale_Shell/src/` | `actions.js`, `actors.js`, `autonomy.js`, `core.js`, `game.js`, `index.js`, `progression.js`, `situations.js`, `world.js` |
| `src/demo/` | `HearthVale_Shell/fixtures/` | `bootstrap-fixture.js`, `six-pillar-fixture.js` |
| `src/presentation/` | `HearthVale_Shell/cli/` | `bootstrap.js`, `six-pillar-demo.js` |

All 13 implementation/fixture/diagnostic files moved. The obsolete empty `src/content` and `src` directories were removed. Diagnostic CLIs stay with the Shell proof; they do not constitute a production UI layer.

## Retained at repository root

`.git`, `README.md`, `package.json`, `docs/`, and `tests/` remain in place. The two existing test files retain their assertions; only imports changed. The root package entry point and start/demo commands point to the new Shell paths. Test discovery still uses `node --test` from the repository root.

`HearthVale_Content/`, `HearthVale_Story/`, and `HearthVale_UI/` each contain only an empty `.gitkeep` so Git preserves the structural placeholders. No production Content, narrative, or UI was added.

## Path updates

Updated shared test imports, Shell fixture imports, CLI imports, package exports/scripts, root README examples, and current paths in the architecture assessment and Milestone 2 report. Their historical `src/content/bootstrap.js` reference still describes the earlier fixture move; the table above preserves this reorganization's exact old paths. The supplied Master Design and Word architecture documents were not changed.

The sole external Core import remains `../../../LWE-Core/src/api/index.js` in `HearthVale_Shell/src/core.js`: the new location has the same directory depth. Core internal modules and Legacy runtime code are not imported.

## Run from HearthVale

```sh
node --test
node HearthVale_Shell/cli/bootstrap.js
node HearthVale_Shell/cli/six-pillar-demo.js
```

The matching package scripts remain `npm test`, `npm start`, and `npm run demo`. Run Core regressions with `node --test` from the sibling `LWE-Core` repository.

## Verification results

- HearthVale: 26 tests passed, 0 failed; Core: 56 tests passed, 0 failed.
- Both CLI smoke tests passed; the root package's self-referenced export resolves correctly.
- Three saves captured before the move (active Day, closing Day, completed Day) restore byte-for-byte afterward. Closing-Day continuation and a fresh run with the same seed produce exactly the pre-move saves.
- All 13 moved JavaScript files match their pre-move versions except necessary import paths. Shared test assertions are unchanged.
- SHA-256 fingerprints of every Core file outside Git metadata match the pre-move baseline, and Core's Git working tree remains clean.
- Runtime source contains no Legacy references; the only external engine import remains the public Core entry point.
- Placeholder directories contain only empty `.gitkeep` files. Git whitespace checks passed.

Final layout:

```text
HearthVale/
├── HearthVale_Shell/
│   ├── src/       (9 rule/adapter modules)
│   ├── fixtures/  (2 existing demo fixtures)
│   └── cli/       (2 diagnostic entry points)
├── HearthVale_Content/.gitkeep
├── HearthVale_Story/.gitkeep
├── HearthVale_UI/.gitkeep
├── docs/
├── tests/
├── README.md
├── package.json
└── .git/
```
