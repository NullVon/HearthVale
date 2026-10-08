# Phase 2 Combat implementation handoff

> Historical revision record. Rules, completion status, and test counts describe this revision; see [documentation guide](README.md) for later corrections and current verification.


Implemented on top of the existing uncommitted Phase 1 / 1.1 / 1.2 work. No commit, push, reset, stash, or restoration from HEAD was performed. Later-phase design briefs and unrelated working-tree changes were left alone.

## State machine

- Physical attacks resolve enemy Dodge first, then d20 + the authored quality stat. Quality scales raw Damage (rounded up), never Impact. Contact can deal zero HP damage after Defense.
- Incoming Dodge uses relative DEX/Speed only. Failed Dodge and Counterattack use passive Armor/Natural Armor/Barrier, without selected Block. Physical Block subtracts the selected item as well. Pure magic bypasses ordinary physical defenses.
- Block wear is classified from post-quality raw physical Damage: Overmatched first, then Overwhelmed, then Withstood. Sturdy Hands still applies once per wear event.
- Counterattack resolves incoming damage/effects first and, only if the player survives, one chosen physical retaliation in the same Core transaction. It never creates another defense or free-attack phase. Its Knockdown can affect the next enemy offense.
- `advantage` is the new persisted decision phase. Normal Stagger/Knockdown cancels the current commitment and presents one follow-up. A follow-up cannot earn another follow-up. Round completion and Poison remain at the existing lifecycle boundary.
- Knockdown stays pending through nonoffensive movement, replacing the next selected offensive move with recovery. Recovery does not require an empty defense screen.
- Normal UI exposes Damage, Impact, Speed, Dodge chances, Block and current DUR. Weapon/shield tiles own their Block/Counterattack controls; incoming phases show those tiles even if the preceding action used another tab. Formulas and roll details remain in Dev Mode.

## Save compatibility

No save-version bump or destructive rewrite. Deserialization stays byte-exact and consumes no RNG.

- Existing item and enemy instances continue to reference authored definitions; weapon metadata and enemy stats need not be copied into old instances.
- New committed moves save Speed/quality-stat metadata. Old commitments obtain only missing metadata by stable move ID, retaining saved Damage, Impact, range, movement and effects.
- Old `cancelled`/`round-result` saves keep the Phase 1 explicit resume path. Already-paid round results do not tick Poison again.
- Old free Force Scroll saves with `phase: attack` and `moveCancelled: true` expose their one remaining attack as Advantage without mutating the save on load or granting a second follow-up.
- Counterattack has no half-resolved save phase. The result retains incoming and retaliatory evidence, while Core commits damage, Poison and wear together.
- Legacy `attackDC`/`dodgeDC` fields remain tolerated. Ordinary physical attacks and Dodge no longer use them. Learned offensive spells intentionally retain their previous accuracy/DC and Essence/Strain rules pending Phase 5.

## Explicit edge-case interpretations

These conflicts were raised during implementation. After the instruction to finish, the implementation preserves existing behavior where possible and favors a resolving combat state:

1. **Bare Hands retains the Phase 1 Defense bypass.** Base Damage remains 1, Speed 0, STR quality. Applying Defense 2 would make even its Critical raw Damage 2 incapable of hurting Cave Beetle/Ruin Brute, contradicting the required weaponless fallback. No other physical attack gains penetration.
2. **Advantage allows existing offensive learned spells and equipped offensive Scrolls.** Their old costs, accuracy, damage and effects remain unchanged. Either spends the one attack, including a miss. Ordinary free consumables and supportive Scrolls remain free; they cannot generate additional attacks. Counterattack remains physical-only.
3. **No legal follow-up is an explicit exception to “exactly one attack.”** A FAR Force cast can spend the last available Essence with no Bow/ammunition or offensive Scroll remaining. In that case the cancelled round advances automatically with “No attack is available at FAR; the advantage passes.” It does not grant movement, ammunition, a free spell, another attack, or a Continue screen. Legacy saves in this condition also resume once safely.

No other approved Phase 2 system was deferred. No enemy HP, Defense, economy, room weights, loot, Sanity, spell cost, or item durability maximum was rebalanced.

## Files changed by this Phase 2 task

Existing Phase 1 changes in other files are not included in this list.

- `HearthVale_Content/encounters.js`
- `HearthVale_Content/expedition.js`
- `HearthVale_Content/schema.js`
- `HearthVale_Content/surface.js`
- `HearthVale_Content/validation.js`
- `HearthVale_Shell/src/expedition-actions.js`
- `HearthVale_Shell/src/expedition-checks.js`
- `HearthVale_Shell/src/expedition-combat.js`
- `HearthVale_Shell/src/expedition-lifecycle.js`
- `HearthVale_Story/surface.js`
- `HearthVale_UI/expedition-views.js`
- `HearthVale_UI/surface.css`
- `tests/fixtures/v1-content.js`
- `tests/m2-combat.test.js`
- `tests/m3-content.test.js`
- `tests/m6b1-production-campaign.test.js`
- `tests/phase1-flow.test.js`
- `tests/phase2-combat.test.js` (new)
- `tests/browser/phase1-browser.js`
- `tests/browser/phase2-browser.js` (new)
- `tests/browser/phase2.html` (new)
- `docs/Phase2_Combat_Handoff.md` (new)

## Verification

- Focused combat/Phase 1/save/content-validation run: **119 passed, 0 failed** (including all 31 dedicated Phase 2 cases).
- Separate content regression run: **22 passed, 0 failed**.
- Production campaign: **1 passed**, seed 33, all 10 Floors, 3 Hearts retained, 60 earned XP and 9 exact reload checkpoints.
- Browser checks: **Phase 2: 3 passed; Phase 1: 6 passed**.
- `git diff --check`: **clean**.
- Full `npm test`: **344 passed, 0 failed, 0 skipped**, exit 0 (264.6 seconds).

Final self-review checked physical DC removal, seeded RNG draw order, the single Poison boundary, nonrecursive follow-ups, legacy save continuation, Phase 1 Heart/Auron behavior, and Dev-only formula presentation. No commit or push was made.

The dedicated Phase 2 tests cover Dodge bands/cap/Speed, quality boundaries and rounding, passive/selected defenses, zero-damage contact, all Block wear bands, counter survival/lethality/range/Poison/rewards, single follow-ups, Knockdown recovery, old and new save continuation, spell compatibility, unavailable FAR follow-ups, and Normal/Dev UI separation.

Browser checks exercise production controls, tile-scoped reactions, Stagger/Advantage save/load, Poison boundaries, Dev Mode and 390px horizontal overflow. The existing Phase 1 browser checks cover New Game, equipment-independent Return, legacy round saves, stale results and Auron rescue.

The old recorded campaign encoded obsolete hit/miss and phase clicks. Its replacement uses only production intentions and exact reload checkpoints, retaining all-floor progression, all Surface destinations, weekly processing, personal Brute completion, reward accounting, permanent world state and terminal-action rejection. It does not edit saves or manufacture player resources.

## Specific playtest requests

- Compare Sword/Hammer against Spider: the Speed penalty should visibly affect enemy Dodge.
- Compare Dodge, Block and Counterattack on the same incoming move, especially at low HP.
- Block a Critical with a nearly broken item; verify the displayed HP loss and DUR loss feel understandable.
- Stagger, save on Advantage, reload and attack once. Try a Knockdown follow-up and observe the later recovery action.
- Counterattack a moving Hound Pounce: retaliation uses the resulting NEAR range; a Bow is not a legal retaliation there.
- Try an armored Return Encounter with no equipment, and FAR Force with no remaining legal follow-up.
- Watch equipment consumption and Poison pressure during a natural expedition. These are playtest observations for later tuning, not balance changes in this phase.
