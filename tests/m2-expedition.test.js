import test from 'node:test';
import assert from 'node:assert/strict';
import { entered, setup, roomFixture, combatFixture, context, dice, item, world, player, pit, expedition, use } from './helpers/m2-fixture.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { generateFloor, floorTail } from '../HearthVale_Shell/src/expedition-generation.js';
import { check, noncombatCheck, applyPoison } from '../HearthVale_Shell/src/expedition-checks.js';
import { baselineReward, awardRoom, awardEnemy, offerLoot, settleLoot, treasureReward } from '../HearthVale_Shell/src/expedition-loot.js';
import { requestReturn, completeReturn, finishExpeditionAction, handleDefeat } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { resolveRoom, explorationSpell } from '../HearthVale_Shell/src/expedition-rooms.js';
import { expeditionChoices } from '../HearthVale_Shell/src/expedition-actions.js';
import { byId, expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { validateCatalog } from '../HearthVale_Content/validation.js';

test('M2 A07 entry costs exactly 1 AP; internal actions/Retreat/Return cost none and cannot advance Surface time', () => {
  let game = entered(), before = world(game).globals.hearthvaleSurface.calendar;
  assert.equal(player(game).data.attributes.resources.ap, 3);
  assert.equal(player(game).data.attributes.resources.essence, 0); assert.equal(expedition(game).strain, 0);
  assert.throws(() => game.perform('pit.enter'), /unavailable/);
  assert.throws(() => game.perform('Move', { location: 'loc_inn' }), /unavailable/);
  assert.throws(() => game.perform('surface.sleep', { day: 1, confirmed: true }), /unavailable/);
  game = setup(game, ctx => { roomFixture(ctx, 'empty', 'fixture_empty_room'); });
  use(game, 'pit.resolve-room'); use(game, 'pit.forward');
  assert.equal(player(game).data.attributes.resources.ap, 3);
  game = setup(game, ctx => { ctx.actor.data.attributes.baseStats.WIS = 30; });
  game.perform('pit.return'); assert.equal(pit(game).expedition, null);
  assert.equal(player(game).data.attributes.resources.ap, 3);
  assert.deepEqual(world(game).globals.hearthvaleSurface.calendar, before);
  game.perform('pit.enter'); assert.equal(player(game).data.attributes.resources.ap, 2);
});

test('M2 A07 entering on the last AP still permits exploration/Return; zero AP cannot re-enter', () => {
  const game = setup(entered(), ctx => { ctx.actor.data.attributes.resources.ap = 0; ctx.actor.data.attributes.baseStats.WIS = 30; });
  use(game, 'pit.forward');
  if (expedition(game).combat) game.perform('pit.retreat');
  game.perform('pit.return'); assert.equal(player(game).data.attributes.resources.ap, 0);
  assert.throws(() => game.perform('pit.enter'), /unavailable/);
});

test('M2 A08 200 seeded nine-Floor routes satisfy counts, family runs, no repeats and stable generation', () => {
  const generate = seed => {
    const runtime = createRuntime({ seed, shell: { worldProcesses: (_, { rng }) => {
      const floors = [], families = []; let tail = [];
      for (let floor = 1; floor <= 9; floor++) {
        const result = generateFloor(floor, 1, tail, rng); floors.push(result); tail = floorTail(result);
        families.push(...result.rooms.map(r => r.family));
      }
      return [{ type: 'fixture.floors-generated', effects: [{ type: 'global', key: 'floors', value: floors }, { type: 'global', key: 'families', value: families }] }];
    } } });
    runtime.startScene(); runtime.resolveScene(); return runtime;
  };
  for (let seed = 0; seed < 200; seed++) {
    const a = generate(seed), b = generate(seed); assert.equal(a.save(), b.save());
    for (const floor of a.snapshot().world.globals.floors) {
      assert.ok([3,4].includes(floor.rooms.length));
      assert.ok(floor.rooms.filter(r => r.family === 'combat').length <= 2);
      assert.ok(floor.rooms.some(r => r.family !== 'combat'));
      assert.equal(new Set(floor.rooms.map(r => r.encounter)).size, floor.rooms.length);
    }
    const all = a.snapshot().world.globals.families;
    for (let i = 2; i < all.length; i++) assert.ok(!(all[i] === all[i-1] && all[i] === all[i-2]));
  }
  let calls = 0; const fixed = generateFloor(10, 1, [], { next: () => { calls++; return 0; } });
  assert.equal(calls, 0); assert.equal(fixed.rooms[0].family, 'fixed');
  assert.throws(() => generateFloor(11, 1, [], dice(0)), /Stratum 1/);
});

test('M2 A09 baseline boundaries, resource quantities and treasure categories are exclusive', () => {
  assert.deepEqual(baselineReward(dice(.599)), { resource: 'essence', quantity: 1 });
  assert.deepEqual(baselineReward(dice(.6, 0)), { resource: 'arrows', quantity: 1 });
  assert.deepEqual(baselineReward(dice(.899, .9)), { resource: 'arrows', quantity: 2 });
  assert.equal(baselineReward(dice(.9)), null);
  for (const [roll, material] of [[0,'moonleaf'],[.4,'bitterroot'],[.7,'bigshroom'],[.9,'iron_ore']]) {
    const ctx = context(); const room = { family: 'resource', resolved: false };
    awardRoom(ctx, room, dice(.95, roll, .75));
    assert.equal(ctx.actor.data.holdings.materials[`item_${material}`], 2);
    assert.throws(() => awardRoom(ctx, room, dice(0)), /already resolved/);
  }
  for (const [roll, category] of [[0,'consumable'],[.25,'valuable'],[.5,'scroll'],[.65,'tome'],[.8,null]]) {
    const ctx = context(), reward = treasureReward(ctx, dice(roll, 0));
    assert.equal(reward ? byId('items', reward.item).category : null, category);
  }
  const spells = new Set();
  for (let i = 0; i < 6; i++) spells.add(byId('items', treasureReward(context(), dice(.5, (i+.1)/6)).item).spell);
  assert.equal(spells.size, 6);
  const ctx = context(); assert.deepEqual(awardRoom(ctx, { family: 'empty', resolved: false }, { next: () => { throw new Error('Empty reward roll'); } }), []);
});

test('M2 A09 successful harvest yields exactly one material at the authored chance boundary', () => {
  const yes = context(); awardEnemy(yes, 'enemy_slime', dice(.549));
  assert.equal(yes.actor.data.holdings.materials.item_slime_core, 1);
  const no = context(); awardEnemy(no, 'enemy_slime', dice(.55));
  assert.equal(no.actor.data.holdings, undefined);
});

test('M2 full Bag retains pending loot; materials/valuables do not use Bag capacity; replacement/leave are explicit and saved', () => {
  let game = setup(entered(), ctx => {
    roomFixture(ctx, 'treasure', 'm2_buried_shelf');
    ctx.actor.data.inventory.bag = Array.from({ length: 8 }, () => item(ctx.actor, 'item_tome_heal'));
    offerLoot(ctx, 'item_moonleaf', 2); offerLoot(ctx, 'item_m2_keepsake');
    offerLoot(ctx, 'item_scroll_force');
  });
  assert.equal(player(game).data.inventory.bag.length, 8);
  assert.equal(player(game).data.holdings.materials.item_moonleaf, 2);
  assert.equal(expedition(game).pendingLoot.length, 1);
  assert.ok(game.expeditionChoices().every(c => c.type === 'pit.loot'));
  const saved = game.save(); game = createSurfaceGame({ saved }); assert.equal(game.save(), saved);
  const choice = game.expeditionChoices().find(c => c.params.bag === 2);
  game.perform(choice.type, choice.params);
  assert.equal(player(game).data.inventory.bag[2].templateId, 'item_scroll_force');
  assert.equal(expedition(game).pendingLoot.length, 0);
  const after = game.save(); assert.throws(() => game.perform(choice.type, choice.params), /unavailable/); assert.equal(game.save(), after);
  const leave = createSurfaceGame({ saved }); use(leave, 'pit.loot', c => c.params.choice === 'leave');
  assert.equal(expedition(leave).pendingLoot.length, 0);
  assert.equal(player(leave).data.inventory.bag[2].templateId, 'item_tome_heal');
});

test('M2 checks show dice/modifiers/DC; advantage cancels disadvantage; no automatic noncombat crits', () => {
  const actor = context().actor;
  assert.throws(() => check(actor, { stat: 'STR', dc: 8 }), /Core RNG/);
  const spells = structuredClone(expeditionCatalog); spells.moves[0].damageType = 'spell'; validateCatalog(spells);
  spells.moves[0].damageType = 'untyped'; assert.throws(() => validateCatalog(spells), /expected one of/);
  assert.equal(check(actor, { stat: 'STR', dc: 8, advantage: true }, dice(0,.99)).die, 20);
  assert.equal(check(actor, { stat: 'STR', dc: 8, disadvantage: true }, dice(.99,0)).die, 1);
  assert.equal(check(actor, { stat: 'STR', dc: 8, advantage: true, disadvantage: true }, dice(.25,.99)).rolls.length, 1);
  assert.equal(check(actor, { stat: 'STR', dc: 30 }, dice(.99)).success, false);
  actor.data.attributes.baseStats.STR = 20;
  assert.equal(check(actor, { stat: 'STR', dc: 8 }, dice(0)).success, true);
  const ctx = context(); ctx.actor.data.attributes.traits = ['trait_lucky_bastard','trait_hardy'];
  const first = noncombatCheck(ctx, { stat: 'STR', dc: 11 }, dice(0,.99)); assert.equal(first.success, true); assert.ok(first.reroll);
  assert.equal(noncombatCheck(ctx, { stat: 'STR', dc: 11 }, dice(0)).reroll, undefined);
  ctx.actor.data.attributes.traits = ['trait_hardy', 'trait_tough_stomach'];
  const resilience = check(ctx.actor, { stat: 'CON', dc: 11, scope: 'biological' }, dice(0));
  assert.equal(resilience.bonus, 4); assert.equal(resilience.value, 3);
  assert.equal(check(ctx.actor, { stat: 'CON', dc: 11 }, dice(0)).bonus, 0);
});

test('M2 complete nine-Floor traversal reaches the fixed threshold, saves exactly and Returns for only the entry AP', () => {
  const game = setup(entered(73), ctx => {
    // Endurance fixture supplies gear life/resources, not a production cheat.
    ctx.actor.data.attributes.baseStats.STR = 30; ctx.actor.data.attributes.baseStats.WIS = 30;
    ctx.actor.data.inventory.equipped = [item(ctx.actor, 'item_hammer'), item(ctx.actor, 'item_shield'), null, null];
    ctx.actor.data.inventory.equipped[0].durability = 300; ctx.actor.data.inventory.equipped[1].durability = 300;
    ctx.actor.data.inventory.bag[1] = item(ctx.actor, 'item_antidote', 30);
    ctx.actor.data.inventory.bag[2] = item(ctx.actor, 'item_hp_potion_basic', 30);
  });
  let commands = 0;
  while (!(expedition(game).floor.number === 10 && expedition(game).roomIndex === 0)) {
    assert.ok(commands++ < 300, 'Traversal must make progress without farming or a phase deadlock');
    const options = game.expeditionChoices();
    const selected = options.find(c => c.type === 'pit.use' && (player(game).data.statuses?.poison || player(game).data.attributes.resources.hp <= 8))
      ?? options.find(c => c.type === 'pit.loot' && c.params.choice === 'leave')
      ?? options.find(c => c.type === 'pit.attack')
      ?? options.find(c => c.type === 'pit.defend' && c.params.mode === 'block')
      ?? options.find(c => c.type === 'pit.defend')
      ?? options.find(c => c.type === 'pit.combat-next')
      ?? options.find(c => c.type === 'pit.resolve-room' && c.params.approach === 'alternate')
      ?? options.find(c => c.type === 'pit.resolve-room')
      ?? options.find(c => c.type === 'pit.forward');
    assert.ok(selected, `No progress option at command ${commands}`);
    game.perform(selected.type, selected.params);
    assert.equal(player(game).data.attributes.resources.ap, 3);
    assert.equal(world(game).globals.hearthvaleSurface.calendar.day, 1);
  }
  assert.ok(!game.expeditionChoices().some(c => c.type === 'pit.forward'));
  assert.equal(pit(game).strata[0].guardian.alive, true);
  const saved = game.save(); assert.equal(createSurfaceGame({ saved }).save(), saved);
  game.perform('pit.return');
  assert.equal(pit(game).expedition, null); assert.equal(player(game).data.attributes.resources.ap, 3);
  assert.equal(pit(game).lastExpedition.deepestFloor, 10);
});

test('M2 hazard primary/alternate approach resolves one consequence, once; failed result survives reload', () => {
  const game = setup(entered(), ctx => { roomFixture(ctx, 'hazard', 'hazard_falling_debris'); });
  assert.equal(game.expeditionChoices().filter(c => c.type === 'pit.resolve-room').length, 2);
  game.perform('pit.resolve-room', { approach: 'alternate' });
  assert.equal(expedition(game).lastResult.check.stat, 'STR');
  assert.equal(expedition(game).lastResult.check.dc, 11);
  const saved = game.save(); assert.equal(createSurfaceGame({ saved }).save(), saved);
  assert.throws(() => game.perform('pit.resolve-room', { approach: 'primary' }), /unavailable/); assert.equal(game.save(), saved);
  const ctx = context(); roomFixture(ctx, 'hazard', 'hazard_collapsed_floor');
  resolveRoom(ctx, 'primary', dice(0,.95)); assert.equal(ctx.actor.data.attributes.resources.hp, 13);
  assert.equal(ctx.expedition.lastResult.check.success, false);
  const lethal = context(); roomFixture(lethal, 'hazard', 'hazard_collapsed_floor');
  lethal.actor.data.attributes.resources.hp = 1;
  resolveRoom(lethal, 'primary', dice(0)); finishExpeditionAction(lethal, dice(.2));
  assert.equal(lethal.expedition.lastResult.check.success, false);
  assert.equal(lethal.expedition.lastResult.check.dc, 11);
  assert.match(lethal.expedition.lastResult.text, /Defeated by hazard/);
});

test('M2 A13 Poison does not stack; ticks after noncombat including Empty; inspection/free actions do not tick', () => {
  const ctx = context(); roomFixture(ctx, 'hazard', 'hazard_spore_pocket');
  resolveRoom(ctx, 'primary', dice(0,.95)); finishExpeditionAction(ctx, dice(0));
  assert.equal(ctx.actor.data.statuses.poison, true); assert.equal(ctx.actor.data.attributes.resources.hp, 15);
  applyPoison(ctx.actor, dice(0)); assert.equal(ctx.actor.data.statuses.poison, true);
  const game = setup(entered(), ctx => { roomFixture(ctx, 'empty', 'fixture_quiet'); ctx.actor.data.statuses = { poison: true }; ctx.actor.data.attributes.resources.hp = 5; });
  const before = game.save(); game.expeditionChoices(); game.snapshot(); assert.equal(game.save(), before);
  use(game, 'pit.resolve-room'); assert.equal(player(game).data.attributes.resources.hp, 4);
});

test('M2 A14 ordinary Retreat regenerates current Floor start, preserves resources/Poison and loses no Heart', () => {
  const game = combatFixture(undefined, ctx => {
    ctx.expedition.strain = 4; ctx.actor.data.attributes.resources.essence = 6; ctx.actor.data.attributes.resources.arrows = 3;
    ctx.actor.data.inventory.equipped[1].durability = 2; ctx.actor.data.statuses = { poison: true };
  });
  const before = structuredClone(player(game).data), old = expedition(game).floor;
  game.perform('pit.retreat');
  assert.equal(expedition(game).combat, null); assert.equal(expedition(game).roomIndex, -1);
  assert.equal(expedition(game).floor.number, old.number); assert.equal(expedition(game).floor.attempt, old.attempt + 1);
  assert.notDeepEqual(expedition(game).floor.rooms, old.rooms);
  assert.deepEqual(player(game).data, before); assert.equal(expedition(game).strain, 4);
  assert.equal(expedition(game).returnCheck, undefined);
});

test('M2 A15 lethal combat/hazard/Poison loses one Heart, restores half HP, regenerates route and preserves spending', () => {
  for (const cause of ['combat', 'hazard', 'Poison']) {
    const ctx = context(); if (cause !== 'combat') roomFixture(ctx, 'hazard', 'hazard_collapsed_floor');
    ctx.actor.data.attributes.resources.hp = 0; ctx.actor.data.attributes.resources.essence = 7;
    ctx.actor.data.attributes.resources.arrows = 1; ctx.expedition.strain = 5;
    ctx.actor.data.statuses = { poison: true }; ctx.actor.data.inventory.equipped[1].durability = 1;
    handleDefeat(ctx, dice(.2), cause);
    assert.equal(ctx.actor.data.attributes.resources.hearts, 2); assert.equal(ctx.actor.data.attributes.resources.hp, 8);
    assert.equal(ctx.expedition.roomIndex, -1); assert.equal(ctx.expedition.combat, null);
    assert.equal(ctx.actor.data.attributes.resources.essence, 7); assert.equal(ctx.expedition.strain, 5);
    assert.equal(ctx.actor.data.attributes.resources.arrows, 1); assert.equal(ctx.actor.data.inventory.equipped[1].durability, 1);
    assert.equal(ctx.actor.data.statuses.poison, true);
  }
  const game = setup(entered(), ctx => {
    roomFixture(ctx, 'empty', 'fixture_poison_death'); ctx.actor.data.attributes.resources.hp = 1; ctx.actor.data.statuses = { poison: true };
  });
  use(game, 'pit.resolve-room'); assert.equal(player(game).data.attributes.resources.hearts, 2); assert.equal(expedition(game).roomIndex, -1);
});

test('M2 A16 Return uses deepest-Floor WIS DC once; empty Known Enemy List arrives safely even after failure', () => {
  for (const [depth, dc] of [[1,8],[3,8],[4,11],[6,11],[7,14],[10,14]]) {
    const ctx = context(); ctx.expedition.combat = null; ctx.expedition.deepestFloor = depth; ctx.pit.knownEnemies = [];
    requestReturn(ctx, dice(0));
    assert.equal(ctx.pit.lastResult.check.dc, dc); assert.equal(ctx.pit.expedition, null);
    assert.equal(ctx.actor.primaryLocation, 'loc_pit_entrance');
  }
});

test('M2 A16 failed Return creates exactly one known-enemy encounter with Retreat disabled', () => {
  const ctx = context(); ctx.expedition.combat = null; ctx.pit.knownEnemies = ['enemy_slime'];
  requestReturn(ctx, dice(0)); assert.equal(ctx.expedition.combat.kind, 'return');
  assert.equal(ctx.expedition.returnCheck.success, false);
  const game = setup(entered(), (draft, rng) => {
    draft.pit.knownEnemies = ['enemy_slime'];
    requestReturn(draft, dice(0));
  });
  assert.ok(!game.expeditionChoices().some(c => ['pit.retreat','pit.return'].includes(c.type)));
  assert.throws(() => game.perform('pit.retreat'), /unavailable/);
  const saved = game.save(); assert.equal(createSurfaceGame({ saved }).save(), saved);
});

test('M2 A16 Return victory/defeat and Teleport clear Essence/Strain/Poison, preserve tangible loot, and keep the Day', () => {
  for (const ending of ['victory','defeat','teleport']) {
    const ctx = context(); ctx.expedition.combat.kind = 'return';
    ctx.actor.data.statuses = { poison: true, unrelated: true }; ctx.expedition.strain = 5;
    ctx.actor.data.attributes.resources.essence = 30; offerLoot(ctx, 'item_moonleaf', 2);
    if (ending === 'victory') { ctx.victory = true; finishExpeditionAction(ctx, dice(.99)); }
    else if (ending === 'defeat') { ctx.actor.data.attributes.resources.hp = 0; finishExpeditionAction(ctx, dice(0)); }
    else { ctx.expedition.combat = null; explorationSpell(ctx, 'spell_teleport', dice(0)); }
    assert.equal(ctx.pit.expedition, null); assert.equal(ctx.actor.primaryLocation, 'loc_pit_entrance');
    assert.equal(ctx.actor.data.attributes.resources.essence, 0); assert.equal(ctx.actor.data.statuses.poison, undefined);
    assert.equal(ctx.actor.data.statuses.unrelated, true); assert.equal(ctx.actor.data.holdings.materials.item_moonleaf, 2);
    assert.equal(ctx.pit.lastExpedition.day, 1);
    assert.equal(ctx.actor.data.attributes.resources.hearts, ending === 'defeat' ? 2 : 3);
  }
});

test('M2 final-Heart hook ends expedition and M5 adjudicates the available Auron rescue', () => {
  const game = setup(entered(), ctx => {
    roomFixture(ctx, 'empty', 'fixture_final_heart'); ctx.actor.data.attributes.resources.hearts = 1;
    ctx.actor.data.attributes.resources.hp = 1; ctx.actor.data.statuses = { poison: true };
  });
  use(game, 'pit.resolve-room');
  assert.equal(pit(game).pendingFinalHeart,null); assert.equal(pit(game).expedition, null);
  assert.equal(player(game).data.attributes.resources.hearts, 1);
  assert.ok(player(game).data.attributes.resources.hp > 0);
  assert.equal(player(game).data.deathAdjudication.status,'rescued');
  assert.ok(game.expeditionChoices().some(c=>c.type==='pit.enter'));
  assert.equal(createSurfaceGame({ saved: game.save() }).save(), game.save());
});

test('M2 Unlock/Tome/Scroll flow respects four learned slots and does not reroll a resolved locked room', () => {
  let game = setup(entered(), ctx => {
    roomFixture(ctx, 'event', 'm2_locked_coffer');
    ctx.actor.data.inventory.bag[1] = item(ctx.actor, 'item_tome_unlock'); ctx.actor.data.inventory.spells = [null,null,null,null];
    ctx.actor.data.attributes.resources.essence = 10;
  });
  use(game, 'pit.learn'); assert.equal(player(game).data.inventory.spells[0], 'spell_unlock');
  assert.equal(player(game).data.inventory.bag[1], null);
  use(game, 'pit.cast'); assert.equal(expedition(game).floor.rooms[0].resolved, true);
  assert.equal(player(game).data.holdings.valuables.item_m2_keepsake, 1);
  assert.ok(!game.expeditionChoices().some(c => c.type === 'pit.cast' && c.params.slot === 0));
  game = setup(game, ctx => {
    ctx.actor.data.inventory.spells = ['spell_fireball','spell_force','spell_heal','spell_barrier'];
    ctx.actor.data.inventory.bag[1] = item(ctx.actor, 'item_tome_unlock');
  });
  assert.equal(game.expeditionChoices().filter(c => c.type === 'pit.learn').length, 4);
  use(game, 'pit.learn', c => c.params.slot === 2);
  assert.deepEqual(player(game).data.inventory.spells, ['spell_fireball','spell_force','spell_unlock','spell_barrier']);
});

test('M2 A27 room reward/discovery/Retreat state reloads exactly and preserves future generation/RNG', () => {
  const game = setup(entered(), ctx => { roomFixture(ctx, 'discovery', 'm2_old_well'); });
  use(game, 'pit.resolve-room');
  assert.ok(pit(game).discoveries.m2_old_well);
  assert.equal(world(game).entities.hv_pit_1.data.strata[0].sunkenSquareDiscovered, false);
  const saved = game.save();
  for (let i = 0; i < 3; i++) {
    const a = createSurfaceGame({ saved }), b = createSurfaceGame({ saved });
    assert.equal(a.save(), saved); assert.deepEqual(a.snapshot(), game.snapshot());
    use(a, 'pit.forward'); use(b, 'pit.forward'); use(a, 'pit.resolve-room'); use(b, 'pit.resolve-room');
    assert.equal(a.save(), b.save());
  }
  const battle = combatFixture(); battle.perform('pit.retreat');
  const resetSave = battle.save(); assert.equal(createSurfaceGame({ saved: resetSave }).save(), resetSave);
});
