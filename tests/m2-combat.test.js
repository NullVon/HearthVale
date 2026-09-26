import test from 'node:test';
import assert from 'node:assert/strict';
import { context, combatFixture, dice, item, player, expedition, use, setup } from './helpers/m2-fixture.js';
import { attackWeapon, castCombatSpell, defend, defenseValues, interruptMove, nextCombatPhase, movePlayer } from '../HearthVale_Shell/src/expedition-combat.js';
import { wear, useBag } from '../HearthVale_Shell/src/expedition-equipment.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';

test('M2 A10 Bow uses FAR, spends Arrow and DUR on hit or miss, and cannot defend', () => {
  for (const roll of [0, .99]) {
    const ctx = context(), actor = ctx.actor, combat = ctx.expedition.combat;
    combat.range = 'FAR'; actor.data.attributes.resources.arrows = 10;
    const before = actor.data.inventory.equipped[1].durability;
    attackWeapon(ctx, 1, dice(roll));
    assert.equal(actor.data.attributes.resources.arrows, 9);
    assert.equal(actor.data.inventory.equipped[1].durability, before - 1);
  }
  const game = combatFixture();
  assert.ok(!game.expeditionChoices().some(c => c.type === 'pit.attack' && c.params.slot === 1));
  game.perform('pit.move');
  assert.throws(() => game.perform('pit.defend', { mode: 'block', slot: 1 }), /unavailable/);
  use(game, 'pit.defend'); use(game, 'pit.combat-next');
  assert.ok(game.expeditionChoices().some(c => c.type === 'pit.attack' && c.params.slot === 1));
  assert.ok(!game.expeditionChoices().some(c => c.type === 'pit.attack' && c.params.slot === 0));
});

test('M2 accuracy uses stats while physical damage does not; melee miss saves DUR and zero-DUR hit completes', () => {
  const ctx = context(); ctx.actor.data.attributes.baseStats.STR = 20;
  ctx.actor.data.inventory.equipped[0].durability = 1;
  attackWeapon(ctx, 0, dice(0));
  assert.equal(ctx.expedition.lastResult.damage, 3);
  assert.equal(ctx.actor.data.inventory.equipped[0], null);
  const missed = context(); attackWeapon(missed, 0, dice(0));
  assert.equal(missed.expedition.lastResult.damage, 0);
  assert.equal(missed.actor.data.inventory.equipped[0].durability, 12);
});

test('M2 A11 failed physical/spell Dodge excludes worn and item defense; Block uses the correct defense and Stability', () => {
  for (const damageType of ['physical', 'spell']) {
    const ctx = context(), combat = ctx.expedition.combat;
    combat.barrier = 3; combat.committed.damage = 10; combat.committed.damageType = damageType;
    const hp = ctx.actor.data.attributes.resources.hp;
    defend(ctx, 'dodge', undefined, dice(0));
    assert.equal(hp - ctx.actor.data.attributes.resources.hp, damageType === 'physical' ? 6 : 7);
    assert.equal(ctx.expedition.lastResult.stability, 6); // CON + Barrier, no Natural Armor double-count.
    const blocked = context(); blocked.expedition.combat.barrier = 3; blocked.expedition.combat.committed.damageType = damageType;
    assert.deepEqual(defenseValues(blocked.actor, blocked.expedition.combat, 'block', blocked.actor.data.inventory.equipped[3]),
      { defense: damageType === 'physical' ? 9 : 6, stability: 11 });
  }
});

test('M2 successful Dodge avoids damage, Impact, Poison and wear; connected zero-damage Block still wears item', () => {
  const ctx = context(); ctx.expedition.combat.committed.impact = 99;
  ctx.expedition.combat.committed.onHit = [{ tag: 'effect_poison', value: 1 }];
  defend(ctx, 'dodge', undefined, dice(.99));
  assert.equal(ctx.actor.data.attributes.resources.hp, 16);
  assert.equal(ctx.expedition.combat.playerKnockdown, false);
  assert.ok(!ctx.actor.data.statuses?.poison);
  const blocked = context(), before = blocked.actor.data.inventory.equipped[3].durability;
  defend(blocked, 'block', 3, dice(0));
  assert.equal(blocked.expedition.lastResult.damage, 0);
  assert.equal(blocked.actor.data.inventory.equipped[3].durability, before - 1);
});

test('M2 A12 Impact thresholds cancel the committed move; Knockdown enforces a nonoffensive next cycle', () => {
  for (const [impact, expected] of [[0,null],[1,'Stagger'],[2,'Stagger'],[3,'Knockdown']]) {
    const ctx = context();
    assert.equal(interruptMove(ctx.expedition.combat, impact), expected);
    if (expected) {
      const hp = ctx.actor.data.attributes.resources.hp;
      nextCombatPhase(ctx, dice(0)); finishExpeditionAction(ctx, dice(0));
      assert.equal(ctx.actor.data.attributes.resources.hp, hp);
      nextCombatPhase(ctx, dice(0));
      if (expected === 'Knockdown') assert.equal(ctx.expedition.combat.committed.offensive, false);
    }
  }
});

test('M2 A12 player Knockdown skips next Attack phase but still allows defense', () => {
  const game = combatFixture(undefined, ctx => {
    ctx.expedition.combat.phase = 'incoming'; ctx.expedition.combat.committed.impact = 20;
  });
  game.perform('pit.defend', { mode: 'block', slot: 3 });
  assert.equal(expedition(game).combat.playerKnockdown, true);
  game.perform('pit.combat-next');
  assert.equal(expedition(game).combat.phase, 'incoming');
  assert.ok(game.expeditionChoices().some(c => c.type === 'pit.defend'));
  assert.throws(() => game.perform('pit.attack', { slot: 0 }), /unavailable/);
});

test('M2 committed move survives player movement unchanged and cannot attack across an invalid range', () => {
  const ctx = context(), committed = structuredClone(ctx.expedition.combat.committed);
  movePlayer(ctx); assert.deepEqual(ctx.expedition.combat.committed, committed);
  const hp = ctx.actor.data.attributes.resources.hp;
  defend(ctx, 'none', undefined, dice(0));
  assert.equal(ctx.actor.data.attributes.resources.hp, hp);
  assert.match(ctx.expedition.lastResult.text, /out of range/);
  nextCombatPhase(ctx, dice(0));
  assert.equal(ctx.expedition.combat.committed.id, 'move_close');
  ctx.expedition.combat.phase = 'incoming';
  defend(ctx, 'none', undefined, dice(0)); assert.equal(ctx.expedition.combat.range, 'NEAR');
  const combined = context(); combined.expedition.combat.range = 'FAR';
  Object.assign(combined.expedition.combat.committed, { range: 'FAR', movement: 'NEAR', damage: 4 });
  defend(combined, 'dodge', undefined, dice(0));
  assert.equal(combined.expedition.combat.range, 'NEAR');
  assert.equal(combined.expedition.lastResult.damage, 3);
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

test('M2 learned spells pay Essence plus pre-cast effective Strain; Force is zero damage and spells ignore ordinary DEF', () => {
  const ctx = context(); ctx.expedition.strain = 5; ctx.actor.data.attributes.resources.essence = 20;
  ctx.expedition.combat.enemy.templateId = 'enemy_cave_beetle'; ctx.expedition.combat.enemy.hp = 10;
  castCombatSpell(ctx, 'spell_fireball', dice(.99));
  assert.equal(ctx.expedition.combat.enemy.hp, 5);
  assert.equal(ctx.actor.data.attributes.resources.essence, 13); // 4 + (5 - INT 2)
  assert.equal(ctx.expedition.strain, 6);
  const force = context(); force.actor.data.attributes.resources.essence = 10;
  castCombatSpell(force, 'spell_force', dice(.99));
  assert.equal(force.expedition.combat.enemy.hp, 6); assert.equal(force.expedition.lastResult.damage, 0);
  assert.equal(force.expedition.combat.phase, 'cancelled');
});

test('M2 Scrolls must be equipped, are free, use DC8 and add no Essence cost or Strain', () => {
  const game = combatFixture(undefined, ctx => {
    ctx.actor.data.inventory.bag[1] = item(ctx.actor, 'item_scroll_fireball');
    ctx.actor.data.inventory.equipped[0] = item(ctx.actor, 'item_scroll_force');
  });
  assert.throws(() => game.perform('pit.scroll', { slot: 1 }), /unavailable/);
  const ctx = context(game), before = ctx.actor.data.attributes.resources.essence;
  castCombatSpell(ctx, 'spell_force', dice(.99), 0);
  assert.equal(ctx.expedition.lastResult.check.dc, 8);
  assert.equal(ctx.actor.data.attributes.resources.essence, before); assert.equal(ctx.expedition.strain, 0);
  assert.equal(ctx.actor.data.inventory.equipped[0], null);
  const heal = context(); heal.actor.data.attributes.resources.hp = 2;
  heal.actor.data.inventory.equipped[0] = item(heal.actor, 'item_scroll_heal');
  castCombatSpell(heal, 'spell_heal', dice(0), 0);
  assert.equal(heal.expedition.combat.phase, 'attack'); assert.equal(heal.actor.data.attributes.resources.hp, 10);
});

test('M2 Barrier expires at next player cycle; consumables are free; one swap spends Attack phase', () => {
  const ctx = context(); ctx.actor.data.attributes.resources.essence = 10;
  castCombatSpell(ctx, 'spell_barrier', dice(0)); assert.equal(ctx.expedition.combat.barrier, 3);
  defend(ctx, 'block', 3, dice(0)); nextCombatPhase(ctx, dice(0)); assert.equal(ctx.expedition.combat.barrier, 0);
  const game = combatFixture(undefined, ctx => { ctx.actor.data.attributes.resources.hp = 1; });
  const committed = expedition(game).combat.committed;
  use(game, 'pit.use'); assert.equal(expedition(game).combat.phase, 'attack');
  assert.deepEqual(expedition(game).combat.committed, committed);
  use(game, 'pit.swap'); assert.equal(expedition(game).combat.phase, 'incoming');
  assert.throws(() => use(game, 'pit.swap'), /Missing legal option/);
});

test('M2 free Force Scroll cancellation preserves the remaining Attack phase and cannot downgrade Knockdown', () => {
  const ctx = context(); ctx.actor.data.inventory.equipped[3] = item(ctx.actor, 'item_scroll_force');
  castCombatSpell(ctx, 'spell_force', dice(.99), 3);
  assert.equal(ctx.expedition.combat.phase, 'attack');
  assert.equal(ctx.expedition.combat.moveCancelled, true);
  assert.equal(ctx.expedition.combat.enemyKnockdown, true);
  attackWeapon(ctx, 0, dice(.99));
  assert.equal(ctx.expedition.combat.phase, 'cancelled');
  assert.equal(ctx.expedition.combat.enemyKnockdown, true);
  assert.equal(ctx.expedition.combat.enemy.hp, 3);
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
  const saved = game.save(); game.perform('pit.defend', { mode: 'block', slot: 3 }); game.perform('pit.combat-next');
  for (let i = 0; i < 3; i++) {
    const restored = createSurfaceGame({ saved }); assert.equal(restored.save(), saved);
    restored.perform('pit.defend', { mode: 'block', slot: 3 }); restored.perform('pit.combat-next');
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
