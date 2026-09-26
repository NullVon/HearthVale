# HearthVale

HearthVale is a browser-based RPG vertical slice built as a Shell for the Living World Engine (LWE).

## V1 Vertical Slice

The M0–M6 vertical-slice implementation is complete.

- Acceptance: **A01–A32, 32/32 passed**
- HearthVale tests: **304 passed**
- LWE-Core tests: **73 passed**
- Combined verified baseline: **377 passed, 0 failed**
- Production campaigns verified both the Ruin Brute completion route and the Day-40 death/succession route.

The current build includes the Surface, procedural Stratum-1 Pit expeditions, combat, equipment, crafting, training, living-world autonomy, Situations, holder-aware Information, weekly reconciliation, death, Life Records, succession, persistence, and both V1 completion paths.

## Run locally

Requirements:

- Node.js 22 or newer
- The compatible sibling `../LWE-Core` repository

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

## Repository layout

```text
HearthVale/
├── HearthVale_Shell/    # Shell rules, orchestration, runtime adapter, development host
├── HearthVale_Content/  # Authored catalogs and content definitions
├── HearthVale_Story/    # Player-facing story and contextual prose
├── HearthVale_UI/       # Browser UI
├── docs/                # Architecture and V1 design documents
├── tests/               # Unit, integration, campaign, and browser fixtures
├── package.json
└── README.md
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

V1 M6 is complete. Stratum 2 is intentionally not playable in this vertical slice. Post-M6 work includes direct playtesting, packaging, and a separate audit of reusable HearthVale-era capabilities that may belong in LWE-Core.
