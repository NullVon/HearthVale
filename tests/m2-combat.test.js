import test from 'node:test';
import assert from 'node:assert/strict';
import { context, combatFixture, dice, item, player, expedition, use, setup } from './helpers/m2-fixture.js';
import { attackWeapon, castCombatSpell, defend, defenseValues, interruptMove, nextCombatPhase } from '../HearthVale_Shell/src/expedition-combat.js';
import { wear, useBag } from '../HearthVale_Shell/src/expedition-equipment.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';

test('Phase 2.1 Bow is range independent, spends only Arrows, never uses DUR, and cannot Block', () => {
  for (const roll of [0,.99]) {
    const ctx=context();ctx.actor.data.attributes.resources.arrows=10;
    assert.equal(ctx.actor.data.inventory.equipped[1].durability,undefined);
    attackWeapon(ctx,1,dice(roll));
    assert.equal(ctx.actor.data.attributes.resources.arrows,9);
    assert.equal(ctx.actor.data.inventory.equipped[1].durability,undefined);
  }
  const game=combatFixture(undefined,ctx=>{ctx.actor.data.attributes.resources.arrows=1;});
  for(const slot of [0,1,2])assert.ok(game.expeditionChoices().some(c=>c.type==='pit.attack'&&c.params.slot===slot));
  game.perform('pit.attack',{slot:1});
  assert.equal(player(game).data.attributes.resources.arrows,0);
  assert.equal(player(game).data.inventory.equipped[1].templateId,'item_bow');
  assert.equal(game.expeditionChoices().some(c=>c.type==='pit.attack'&&c.params.slot===1),false);
  assert.ok(!game.expeditionChoices().some(c=>c.type==='pit.move'));
  assert.throws(()=>game.perform('pit.defend',{mode:'block',slot:1}),/unavailable/);
});

test('Phase 2 quality uses stats; enemy Dodge saves melee DUR and zero-DUR contact completes', () => {
  const ctx = context(); ctx.actor.data.attributes.baseStats.STR = 20;
  ctx.actor.data.inventory.equipped[0].durability = 1;
  attackWeapon(ctx, 0, dice(0));
  assert.equal(ctx.expedition.lastResult.damage, 5); // Critical, ceil(3 * 1.5).
  assert.equal(ctx.actor.data.inventory.equipped[0], null);
  const missed = context(); missed.expedition.combat.enemy.templateId = 'enemy_venom_spider'; attackWeapon(missed, 0, dice(0));
  assert.equal(missed.expedition.lastResult.damage, 0);
  assert.equal(missed.actor.data.inventory.equipped[0].durability, 12);
});

test('Phase 2 failed Dodge includes passive armor; pure magic ignores ordinary physical defenses', () => {
  for (const damageType of ['physical', 'spell']) {
    const ctx = context(), combat = ctx.expedition.combat;
    combat.barrier = 3; combat.committed.damage = 10; combat.committed.damageType = damageType;
    const hp = ctx.actor.data.attributes.resources.hp;
    defend(ctx, 'dodge', undefined, dice(.99, .4));
    assert.equal(hp - ctx.actor.data.attributes.resources.hp, damageType === 'physical' ? 4 : 7);
    assert.equal(ctx.expedition.lastResult.stability, 3); // Barrier never adds Stability.
    const blocked = context(); blocked.expedition.combat.barrier = 3; blocked.expedition.combat.committed.damageType = damageType;
    assert.deepEqual(defenseValues(blocked.actor, blocked.expedition.combat, 'block', blocked.actor.data.inventory.equipped[3]),
      { defense: damageType === 'physical' ? 9 : 3, stability: 8 });
  }
});

test('M2 successful Dodge avoids damage, Impact, Poison and wear; connected zero-damage Block still wears item', () => {
  const ctx = context(); ctx.expedition.combat.committed.impact = 99;
  ctx.expedition.combat.committed.onHit = [{ tag: 'effect_poison', value: 1 }];
  defend(ctx, 'dodge', undefined, dice(0));
  assert.equal(ctx.actor.data.attributes.resources.hp, 16);
  assert.equal(ctx.expedition.combat.playerKnockdown, false);
  assert.ok(!ctx.actor.data.statuses?.poison);
  const blocked = context(), before = blocked.actor.data.inventory.equipped[3].durability;
  defend(blocked, 'block', 3, dice(0));
  assert.equal(blocked.expedition.lastResult.damage, 0);
  assert.equal(blocked.actor.data.inventory.equipped[3].durability, before - 1);
});

test('M2 A12 Impact thresholds cancel the committed move; Knockdown forces zero Dodge on the follow-up', () => {
  for (const [impact, expected] of [[0,null],[1,'Stagger'],[2,'Stagger'],[3,'Knockdown']]) {
    const ctx = context();
    assert.equal(interruptMove(ctx.expedition.combat, impact), expected);
    if (expected) {
      const hp = ctx.actor.data.attributes.resources.hp;
      assert.equal(ctx.expedition.combat.phase, 'advantage');
      attackWeapon(ctx, 0, dice(.4)); finishExpeditionAction(ctx, dice(0));
      assert.equal(ctx.actor.data.attributes.resources.hp, hp);
      if (expected === 'Knockdown') {assert.equal(ctx.expedition.lastResult.dodge.chance,0);assert.equal(ctx.expedition.combat.enemyKnockdown,false);}
      assert.equal(ctx.expedition.combat.committed.offensive,true);
    }
  }
});

test('Phase 2.1 player Knockdown keeps the next Attack phase and permits Block/Counterattack', () => {
  const game=combatFixture(undefined,ctx=>{ctx.expedition.combat.phase='incoming';ctx.expedition.combat.committed.impact=20;});
  game.perform('pit.defend',{mode:'block',slot:3});
  assert.equal(expedition(game).combat.playerKnockdown,true);assert.equal(expedition(game).combat.phase,'attack');
  game.perform('pit.unarmed');
  assert.ok(game.expeditionChoices().some(c=>c.params.mode==='block'));
  assert.ok(game.expeditionChoices().some(c=>c.params.mode==='counter'));
});

test('Phase 2.1 legacy range and movement cannot avoid a committed offense', () => {
  const ctx=context();ctx.expedition.combat.range='FAR';
  Object.assign(ctx.expedition.combat.committed,{range:'NEAR',movement:'NEAR',damage:4});
  defend(ctx,'dodge',undefined,dice(.99,.4));
  assert.equal(ctx.expedition.combat.range,'FAR');assert.equal(ctx.expedition.lastResult.damage,1);
  nextCombatPhase(ctx,dice(0));assert.equal(ctx.expedition.combat.committed.offensive,true);
  assert.equal(ctx.expedition.combat.committed.range,undefined);
});

test('M2 Heavy-Handed and Sturdy Hands apply once per wear event, including 2-DUR wear', () => {
  const ctx = context(); ctx.actor.data.attributes.traits = ['trait_heavy_handed', 'trait_sturdy_hands'];
  attackWeapon(ctx, 2, dice(.99, .1));
  assert.equal(ctx.expedition.lastResult.impact, 3);
  assert.equal(ctx.actor.data.inventory.equipped[2].durability, 9);
  assert.deepEqual(ctx.expedition.lastResult.wear, { item: 'item_hammer', loss: 1, prevented: 1, destroyed: false });
  let calls = 0; wear(ctx.actor, 0, 1, { next: () => { calls++; return .1; } });
  assert.equal(calls, 1);
});

test('M2 learned spells pay shared exponential Essence cost; Force is zero damage and spells ignore ordinary DEF', () => {
  const ctx = context(); ctx.expedition.strain = 5; ctx.actor.data.attributes.resources.essence = 20;
  ctx.expedition.combat.enemy.templateId = 'enemy_cave_beetle'; ctx.expedition.combat.enemy.hp = 10;
  castCombatSpell(ctx, 'spell_fireball', dice(.99));
  assert.equal(ctx.expedition.combat.enemy.hp, 5);
  assert.equal(ctx.actor.data.attributes.resources.essence, 4); // 2 ^ (5 - INT 2 + 1)
  assert.equal(ctx.expedition.strain, 6);
  const force = context(); force.actor.data.attributes.resources.essence = 10;
  castCombatSpell(force, 'spell_force', dice(.99));
  assert.equal(force.expedition.combat.enemy.hp, 6); assert.equal(force.expedition.lastResult.damage, 0);
  assert.equal(force.expedition.combat.phase, 'advantage');
});

test('Phase 7 bag Scrolls and legacy equipped Scrolls cost an action, one item without encounter Strain', () => {
  const game = combatFixture(undefined, ctx => {
    ctx.actor.data.inventory.bag[1] = item(ctx.actor, 'item_scroll_fireball');
    ctx.actor.data.inventory.equipped[0] = item(ctx.actor, 'item_scroll_force');
  });
  assert.throws(() => game.perform('pit.scroll', { slot: 1 }), /unavailable/);
  assert.ok(game.expeditionChoices().some(c=>c.type==='pit.scroll'&&c.params.container==='bag'&&c.params.slot===1));
  const ctx = context(game), before = ctx.actor.data.attributes.resources.essence;
  castCombatSpell(ctx, 'spell_force', dice(.99), 0);
  assert.equal(ctx.expedition.lastResult.check, null);
  assert.equal(ctx.expedition.combat.spellStrain, undefined);
  assert.equal(ctx.actor.data.attributes.resources.essence, before); assert.equal(ctx.expedition.strain, 0);
  assert.equal(ctx.actor.data.inventory.equipped[0], null);
  const heal = context(); heal.actor.data.attributes.resources.hp = 2;
  heal.actor.data.inventory.equipped[0] = item(heal.actor, 'item_scroll_heal');
  castCombatSpell(heal, 'spell_heal', dice(0), 0);
  assert.equal(heal.expedition.combat.phase, 'incoming'); assert.equal(heal.actor.data.attributes.resources.hp, 10);
});

test('M2 Barrier expires on enemy offensive resolution; consumables are free; one swap spends Attack phase', () => {
  const ctx = context(); ctx.actor.data.attributes.resources.essence = 10;
  castCombatSpell(ctx, 'spell_barrier', dice(0)); assert.equal(ctx.expedition.combat.barrier, 3);
  defend(ctx, 'block', 3, dice(0)); assert.equal(ctx.expedition.combat.barrier, 0);
  nextCombatPhase(ctx, dice(0)); assert.equal(ctx.expedition.combat.barrier, 0);
  const game = combatFixture(undefined, ctx => { ctx.actor.data.attributes.resources.hp = 1; });
  const committed = expedition(game).combat.committed;
  use(game, 'pit.use'); assert.equal(expedition(game).combat.phase, 'attack');
  assert.deepEqual(expedition(game).combat.committed, committed);
  use(game, 'pit.swap'); assert.equal(expedition(game).combat.phase, 'incoming');
  assert.throws(() => use(game, 'pit.swap'), /Missing legal option/);
});

test('Phase 2 Force Scroll cancellation grants one Advantage attack which consumes Knockdown', () => {
  const ctx = context(); ctx.actor.data.inventory.equipped[3] = item(ctx.actor, 'item_scroll_force');
  castCombatSpell(ctx, 'spell_force', dice(.99), 3);
  assert.equal(ctx.expedition.combat.phase, 'advantage');
  assert.equal(ctx.expedition.combat.moveCancelled, true);
  assert.equal(ctx.expedition.combat.enemyKnockdown, true);
  attackWeapon(ctx, 0, dice(.99));
  assert.equal(ctx.expedition.combat.phase, 'round-result');
  assert.equal(ctx.expedition.combat.enemyKnockdown, false);
  assert.equal(ctx.expedition.combat.enemy.hp, 1);
});

test('M2 A13 Poison ticks once per completed round; Antidote/Cleanse cure free without changing telegraph', () => {
  for (const cure of ['item_antidote', 'item_cleanse_tonic']) {
    const ctx = context(); ctx.actor.data.statuses = { poison: true, unrelated: true };
    defend(ctx, 'block', 3, dice(0)); finishExpeditionAction(ctx, dice(0));
    assert.equal(ctx.actor.data.attributes.resources.hp, 15);
    const move = structuredClone(ctx.expedition.combat.committed);
    ctx.actor.data.inventory.bag[0] = item(ctx.actor, cure); useBag(ctx.actor, 0, dice(0));
    assert.equal(ctx.actor.data.statuses.poison, undefined); assert.equal(ctx.actor.data.statuses.unrelated, true);
    assert.deepEqual(ctx.expedition.combat.committed, move);
  }
});

test('M2 A27 mid-combat save preserves committed move, range, HP, Poison, Barrier, DUR/ammo, Essence/Strain and future outcome', () => {
  const game = combatFixture(undefined, ctx => {
    ctx.expedition.combat.phase = 'incoming'; ctx.expedition.combat.barrier = 3;
    ctx.expedition.strain = 4; ctx.actor.data.statuses = { poison: true };
    ctx.actor.data.attributes.resources.essence = 7; ctx.actor.data.attributes.resources.arrows = 2;
    ctx.actor.data.inventory.equipped[3].durability = 1;
  });
  const saved = game.save(); game.perform('pit.defend', { mode: 'block', slot: 3 });
  for (let i = 0; i < 3; i++) {
    const restored = createSurfaceGame({ saved }); assert.equal(restored.save(), saved);
    restored.perform('pit.defend', { mode: 'block', slot: 3 });
    assert.equal(restored.save(), game.save());
    assert.deepEqual(player(restored), player(game));
  }
});

test('M2 victory is immediate, grants XP once, and neither heals nor repairs', () => {
  const game = setup(combatFixture(), ctx => {
    ctx.actor.data.attributes.baseStats.STR = 30; ctx.actor.data.attributes.resources.hp = 5;
    ctx.actor.data.statuses = { poison: true }; ctx.expedition.combat.enemy.hp = 1;
  });
  const xp = player(game).data.attributes.resources.xp, hp = player(game).data.attributes.resources.hp;
  game.perform('pit.attack', { slot: 0 });
  assert.equal(expedition(game).combat, null);
  assert.equal(player(game).data.attributes.resources.xp, xp + 2);
  assert.equal(player(game).data.attributes.resources.hp, hp); // No Poison round after immediate victory.
  assert.equal(player(game).data.inventory.equipped[0].durability, 11);
  const after = game.save(); assert.throws(() => game.perform('pit.attack', { slot: 0 }), /unavailable/); assert.equal(game.save(), after);
});
