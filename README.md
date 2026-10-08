# HearthVale

**v0.1.0 Alpha Vertical Slice - a fully playable working demo.**

[Play in Browser](https://nullvon.github.io/HearthVale/) | [Download Android APK](https://github.com/NullVon/HearthVale/releases/tag/v0.1.0-alpha.1) | [Living World Engine Core](https://github.com/NullVon/LWE-Core)

HearthVale is a browser-based RPG vertical slice built as a Shell for the Living World Engine (LWE).

## HearthVale v0.1

The M0-M6 vertical slice and subsequent playtest corrections are implemented. The current release verification is recorded in [GitHub release cleanup handoff](docs/GitHub_Release_Cleanup_Handoff.md); older milestone totals describe their historical builds.

The current build includes the Surface, procedural Stratum-1 Pit expeditions, combat, equipment, crafting, training, living-world autonomy, Situations, holder-aware Information, weekly reconciliation, death, Life Records, succession, persistence, and both V1 completion paths.

## Run locally

Requirements:

- Node.js 22 or newer
- The compatible sibling `../LWE-Core` repository

Keep the checkouts named `HearthVale` and `LWE-Core` in the same parent directory: the development server and Core adapter use these paths. Install the locked dependencies with `npm ci` from HearthVale (required for mobile packaging).

From this directory:

```powershell
npm run surface
```
Open:

```text
http://127.0.0.1:4173
```

Run the HearthVale test suite with:

```powershell
npm test
```

Run the Core regression suite from the sibling repository with:

```powershell
cd ..\LWE-Core
node --test
```

For browser regression checks, run `node HearthVale_Shell/cli/serve-surface.js --fixtures`, then open a runner under `http://127.0.0.1:4173/HearthVale/tests/browser/`, such as `bulk-sale.html`, `magic-alignment.html`, or `playtest2.html`, and click its Run button. The automated runners exercise production controls and restore prior browser saves. Older fixture-only pages provide manual checkpoint launchers. Retain the checked-in fixtures; `tests/build-*-browser-fixtures.js` scripts regenerate their corresponding checkpoint sets when needed.

## Android development

The `android/` directory contains the Capacitor Android project and Gradle wrapper. With the locked npm dependencies installed, `npm run build:mobile` bundles the current UI into generated `www/`; `npm run android:sync` rebuilds that bundle and synchronizes native assets/plugins. `npm run android:open` opens Android Studio. Android packaging also requires Android Studio's compatible JDK and Android SDK; configure the local SDK through Android Studio or ignored `android/local.properties`.

On Windows, `npm run android:apk` runs synchronization and Gradle's debug APK build. On other platforms, synchronize first, then run `./gradlew assembleDebug` from `android/`. Debug output belongs under `android/app/build/outputs/apk/debug/` and is excluded from source control. Release signing credentials and distribution are not configured here.

## Repository layout

```text
HearthVale/
|-- HearthVale_Shell/    # Shell rules, orchestration, runtime adapter, development host
|-- HearthVale_Content/  # Authored catalogs and content definitions
|-- HearthVale_Story/    # Player-facing story and contextual prose
|-- HearthVale_UI/       # Browser UI
|-- docs/                # Architecture and V1 design documents
|-- tests/               # Unit, integration, campaign, and browser fixtures
|-- package.json
`-- README.md
```

## Architecture

LWE follows one central boundary:

> **Core owns structure and generic resolution. Shell owns meaning.**

HearthVale is the Shell. It defines its Actors, traits, resources, combat rules, Pit, economy, magic, discoveries, succession rules, presentation, and authored content. LWE-Core provides the generic persistent-world machinery beneath those systems.

The browser entry point is `createSurfaceGame({ seed, saved })` from `HearthVale_Shell/src/surface.js`.

The browser automatically checkpoints resolved actions. Menu **Save/Load** uses a separate manual save slot, while **Continue** restores the latest automatic checkpoint. Saves are local to the browser/origin; there is no server-side save service.

## V1 design documents

The V1 design set is kept under `docs/`:

- `HearthVale_V1_VS_Master_Design.docx`
- `HearthVale_V1_VS_Mechanics.docx`
- `HearthVale_V1_VS_Content.docx`
- `HearthVale_V1_VS_Story.docx`
- `HearthVale_V1_VS_UI-UX_Guide.docx`
- `HearthVale_V1_VS_Implementation_Brief.docx`

## Current boundary

Stratum 2 is intentionally not playable in this vertical slice. Design briefs, milestone reports, and earlier handoffs in `docs/` retain the decisions and verification state of their respective revisions; they are not all descriptions of today's mechanics. See [documentation guide](docs/README.md) for current and historical references.
