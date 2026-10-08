# Phase 6 — World Change Notifications + Non-Meaningful Screen Cleanup

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented 2026-10-04 against the accepted Phase 1–5 working tree. The current user request governs this phase, rather than the older Phase 6 feedback brief. No next-phase work, broad UI redesign, balancing, commit, push, full suite, production campaign, or APK build was performed.

## Changes and notification policy

Three existing consequences now have clearer feedback:

1. **Personal crafting orders ready for collection.** A single inline “Ready at the General Shop” section lists the current Actor's completed, uncollected orders, including quantities and directions to the existing Crafting and collection section. It explains when Bag space blocks collection. It appears on ordinary Surface destinations, not over combat, utility panels, opening narrative, death, succession, or completion. Pending orders produce no message; another Actor's orders are never exposed. The reminder remains until collection, including across reload. This is a read-only projection of existing orders, not a notification queue or repeated toast.
2. **Player deliveries change supplies.** The existing fulfillment receipt now explains the exact addition to General Shop shelves or Town supplies. The request's original materials, rewards, resolver credit, lifecycle, and records are unchanged. Autonomous deliveries are not broadcast through the player's receipt. Hound verification retains its existing result rather than claiming a supply increase.
3. **Sunken Square opens a new entry route.** The discovery result explains that future expeditions can enter via Sunken Square at the Pit Entrance. This follows the current Actor's knowledge, including a first personal visit after someone else discovered the Square. Learning confirmed Square knowledge through the existing Talk channel gives the same practical explanation in that Talk receipt. Already-known routes are not announced again. Remote objective discovery alone produces no notification or new knowledge.

All messages use existing result sections or one lightweight inline section. There are no modals, acknowledgement clicks, new world systems, notification history, timers, random draws, or save-schema fields.

## Candidates deliberately not notified

- Training unlock, Auron introduction, training receipts, and important/manual save success: Phase 5 already communicates these. No duplicate channel was added.
- Ordinary HP/AP/XP/Gold changes, wear, loot, Poison, and Sanity: existing HUD/results already report them; a second notification would be spam.
- Routine stock reconciliation and autonomous commerce: not every stock change warrants an alert, and remote activity must not become automatic player knowledge. Existing Shop offers and information records remain available.
- Unobserved NPC arrivals, absences, death, discoveries, and hidden consequences: no omniscient broadcast. Existing local people lists, provider eligibility, Talk, records, and major outcomes retain their roles.
- Public posting updates and rumors: existing local/communicated knowledge and record views remain; no separate remote status subscription was introduced.
- Guardian victory, Heart loss, death/succession, and chapter completion: already significant result flows. No duplicate generic “world changed” screen.
- Blacksmith existence: the current economy has eligibility support but no new provider-unlock mechanic was invented to generate a notification.

## Flow audit and cleanup

**Bypassed in Normal Mode:** the bare post-selection arrival screen, which only displayed the Actor's name/date and an “Enter the Inn” button. Normal character selection now executes the existing `surface.arrive` action and presents Mira directly. Name/date are retained on the Inn conversation screen. Legacy saves stopped at arrival follow the same path when loaded.

**Dev-only diagnostic:** the generic “No usable action in this tab. Check the current phase and item condition” filler. Empty inventory/spell slots remain inspectable; meaningful item restrictions and all usable actions remain. Dev Mode retains that diagnostic and the bare arrival step. Existing combat/hazard calculations and other Dev features remain unchanged.

**Intentionally retained:** opening narrative cards; candidate selection; Mira's reply and guidance; sleep confirmation; destructive-action warnings; Floor-start equipment/Return opportunities; empty-room resolution; event/hazard choices; discovery and reward summaries; full-Bag decisions; significant expedition/Heart-loss outcomes; Journal/weekly history; death/Life Records, succession selection, and demo completion.

Empty rooms were not blindly auto-resolved: their noncombat boundary can tick Poison, and the player can choose to use a cure or return beforehand. Floor starts likewise offer meaningful equipment and Return choices. Existing redundant combat-round transitions were already resolved automatically in Phase 1; they were not reimplemented.

## State transitions and saving

The arrival helper performs exactly one existing legal action, only from the arrival stage and only outside Dev Mode. It does not loop, advance Mira's response, spend resources, bypass rewards, or replace Core effects. Tests compare its resulting serialized state byte-for-byte with manually performing the old arrival action.

After character selection, autosave runs after automatic arrival finishes. On load, the existing compatibility resume runs first, followed by arrival when applicable. If either changes the loaded save, the completed state is written to the existing autosave slot; the manual slot remains untouched. Storage failure retains the Phase 5 warning and never claims success. Unchanged loads and panel inspection do not add writes. Shell deserialization remains exact; automatic arrival is a UI policy, preserving existing programmatic/legacy entry points.

Crafting reminders derive from already-persisted order ownership/readiness and disappear through ordinary collection. Supply/route text lives in the existing saved receipts. No migration, new random draw, duplicate reward, extra Poison boundary, or hidden progression state was added.

## Exact files changed in this phase

| File | Change |
| --- | --- |
| `HearthVale_Shell/src/expedition-actions.js` | Add route explanation when resolving Square without prior confirmed knowledge |
| `HearthVale_Shell/src/service-actions.js` | Supply consequences and newly communicated route explanation in existing receipts |
| `HearthVale_UI/surface.js` | Inline order reminder, automatic arrival, post-resume autosave, retained arrival identity text |
| `HearthVale_UI/expedition-views.js` | Restrict empty-action diagnostic to Dev Mode |
| `HearthVale_UI/automatic-flow.js` | Small bounded UI arrival helper |
| `HearthVale_UI/world-updates.js` | Read-only personal ready-order presentation |
| `tests/phase6-world-flow.test.js` | Eight focused Phase 6 tests |
| `docs/Phase6_World_Notifications_Flow_Handoff.md` | This handoff |

Existing Phase 1–5 edits were preserved. A hash comparison against the pre-task tracked/untracked file inventory found changes to only the four existing files listed above. Other new files in the working tree predate this task, except the four additions listed here. The complete Phase 6 diff was reviewed against pre-edit working-tree copies, not against a clean checkout.

## Tests and results

**57 distinct focused/adjacent tests passed.** No full `npm test` or campaign was run.

- `node --test tests/phase6-world-flow.test.js` — final run: 8 passed, 0 failed.
- `node --test tests/phase6-world-flow.test.js tests/phase1-flow.test.js tests/phase4-status-sanity.test.js tests/m6c1-ui.test.js` — 34 passed, 0 failed.
- Phase 5 clarity tests — all 6 passed; Information/knowledge tests (`tests/m4c-information.test.js`) — all 9 passed in the initial combined run. That run initially caught an invalid new test fixture with a duplicate encounter; the fixture was corrected, and all Phase 6 tests subsequently passed.
- `node --test --test-name-pattern='opening order|exact snapshot reload|confirmed Inn sleep' tests/m1-surface.test.js` — 3 passed.
- `node --test --test-name-pattern='Turn-In|Sunken Square guarantee|full Bag' tests/m3-content.test.js` — 3 passed.
- `node --test --test-name-pattern='player delivery|autonomous delivery' tests/m4b-situations.test.js` — 2 passed.
- `git diff --check` — passed. Git reports LF/CRLF conversion advisories, not whitespace errors.

The eight new tests cover ready orders through sleep/reload/collection, NPC privacy and no routine/Training duplicates, Bag-full guidance, exact supply effects and rewards, Square route knowledge through visits/Talk with no repeat, arrival/manual equivalence, retained Mira/reward/empty-room decisions, Dev diagnostics, and actual UI dispatch/load/save behavior with storage failure. The UI harness runs the actual handler and serializer using minimal DOM/storage doubles; it is not a browser layout test.

## Decisions, limitations, and playtest

The ready-order section is an outstanding actionable reminder, not an alert that disappears after being seen. No new acknowledgement state is needed. Notifications are intentionally scoped to concrete feedback gaps found in existing systems; this phase is not a generic subscription framework or a full feedback rewrite.

No unrelated blocking bug was found or fixed. Broader layout/mobile polish, exhaustive browser coverage, and additional world-notification categories remain outside this task.

Suggested human checks:

1. Select a new adventurer in Normal Mode: Mira should appear immediately with the Actor's name/date. Read her reply and confirm guidance still requires its existing Continue action.
2. Order an item, sleep, and verify one ready-order section at the Inn. Reload, visit the Shop, collect it, and verify the reminder disappears. Repeat with a full Bag and check the explanation.
3. Fulfill Moonleaf Shortage or Town Supply Request; verify the receipt names the added supplies and normal rewards/stock changes still occur once.
4. Discover Sunken Square or learn confirmed knowledge from Lina. Check the route explanation and Pit Entrance option, then repeat the visit/Talk to confirm no second route announcement.
5. In Dev Mode, inspect an empty action tab and the arrival transition. Normal Mode should hide their diagnostic/acknowledgement friction while leaving meaningful choices and result summaries intact.
6. Confirm Phase 5 Training unlock/progression/save messages remain unchanged and are not duplicated by the new reminder.

**The next phase was not started. No commit or push was performed.**
