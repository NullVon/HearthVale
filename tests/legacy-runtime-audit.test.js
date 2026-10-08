import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture, context, dice, item, roomFixture, setup, player, expedition, use } from './helpers/m2-fixture.js';
import { castCombatSpell, castCombatScroll, startCombat } from '../HearthVale_Shell/src/expedition-combat.js';
import { resolveRoom } from '../HearthVale_Shell/src/expedition-rooms.js';
import { awardRoom, awardEnemy } from '../HearthVale_Shell/src/expedition-loot.js';
import { finishExpeditionAction, completeReturn, enterExpedition } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { resultView } from '../HearthVale_UI/expedition-views.js';
import { comparison } from '../HearthVale_UI/service-views.js';
import { byId } from '../HearthVale_Content/expedition.js';

const r = actor => actor.data.attributes.resources;
const noDraw = { next() { throw Error('Ordinary magic must not roll accuracy, Dodge or quality'); } };

test('Equipment comparisons describe current quality stats instead of obsolete accuracy', () => {
  assert.match(comparison(byId('items', 'item_sword')), /STR quality/);
  assert.doesNotMatch(comparison(byId('items', 'item_sword')), /accuracy/);
  assert.match(comparison(byId('items', 'item_scroll_fireball')), /automatic hit/);
});

for (const spell of ['spell_fireball', 'spell_force']) for (const phase of ['attack', 'advantage', 'counterattack']) {
  test(`${spell} auto-hits in ${phase}, ignores legacy accuracy/DEX/armor, consumes vulnerability`, () => {
    const ctx = context();
    ctx.actor.data.attributes.baseStats.INT = 1;
    ctx.actor.data.attributes.baseStats.WIS = 10;
    r(ctx.actor).essence = 20;
    const combat = ctx.expedition.combat;
    Object.assign(combat, { phase, range: 'far', enemyKnockdown: true, spellStrain: 100, scrollStrain: 100 });
    combat.enemy.templateId = 'enemy_cave_beetle'; combat.enemy.hp = 100;
    castCombatSpell(ctx, spell, noDraw);
    const result = ctx.expedition.lastResult;
    assert.equal(result.check, null);
    assert.equal(result.spellStrain, undefined);
    assert.equal(result.dodge, undefined); assert.equal(result.quality, undefined);
    assert.equal(result.damage, spell === 'spell_fireball' ? 5 : 0);
    assert.equal(result.impact, spell === 'spell_force' ? 3 : 0);
    assert.equal(combat.enemy.hp, 100 - result.damage);
    assert.match(result.text, /automatic hit/); assert.doesNotMatch(result.text, /Miss|Glancing|Critical|Dodged/);
    assert.equal(ctx.expedition.strain, 1); assert.equal(r(ctx.actor).essence, 19);
    assert.equal(combat.spellStrain, undefined); assert.equal(combat.scrollStrain, undefined);
    // A Force response may apply fresh Knockdown, but cannot chain Advantage.
    if (phase !== 'attack') assert.equal(combat.phase, 'round-result');
    if (spell === 'spell_fireball') assert.equal(combat.enemyKnockdown, false);
  });
}

test('Only Overcast draws RNG for learned offense; the effect precedes failed WIS and lethal cleanup', () => {
  const ctx = context(); r(ctx.actor).essence = 20; r(ctx.actor).sanity = 1;
  ctx.actor.data.attributes.baseStats.WIS = 0; ctx.expedition.combat.enemy.hp = 50;
  let draws = 0;
  castCombatSpell(ctx, 'spell_fireball', { next() { draws++; return 0; } });
  assert.equal(draws, 1); assert.equal(ctx.expedition.combat.enemy.hp, 45);
  assert.equal(ctx.expedition.lastResult.overcast.dc, 8); assert.equal(r(ctx.actor).sanity, 0);
  finishExpeditionAction(ctx, noDraw);
  assert.equal(ctx.pit.expedition, null); assert.equal(ctx.pit.pendingDeath.cause, 'sanity');
});

test('Every non-empty room receives guaranteed Essence; combat Arrow roll is independent and room-only', () => {
  for (const family of ['empty', 'resource', 'combat', 'treasure', 'hazard', 'event', 'discovery', 'fixed']) {
    for (const roll of [0, .499, .5, .999]) {
      const ctx = context(); r(ctx.actor).essence = 0; r(ctx.actor).arrows = 0;
      const room = { family, resolved: false };
      awardRoom(ctx, room, dice(roll));
      assert.equal(r(ctx.actor).essence, family === 'empty' ? 0 : family === 'resource' ? 2 : 1);
      assert.equal(r(ctx.actor).arrows, family === 'combat' && roll < .5 ? 1 : 0);
      assert.throws(() => awardRoom(ctx, room, noDraw), /already resolved/);
    }
  }
  const ctx = context(); r(ctx.actor).arrows = 0;
  awardRoom(ctx, { family: 'combat', resolved: false }, dice(.49, .5));
  assert.equal(r(ctx.actor).arrows, 2);
  const before = [r(ctx.actor).essence, r(ctx.actor).arrows];
  awardEnemy(ctx, 'enemy_slime', dice(0)); awardEnemy(ctx, 'enemy_slime', dice(.99));
  assert.deepEqual([r(ctx.actor).essence, r(ctx.actor).arrows], before);
});

test('Sunken Square resolution receives the same room Essence boundary, including exhausted visits', () => {
  for (const remaining of [2, 0]) {
    const ctx = context(); roomFixture(ctx, 'discovery', 'loc_sunken_square');
    ctx.pit.sunkenSquare = { floor: 4, pending: true, remaining };
    const before = r(ctx.actor).essence;
    resolveRoom(ctx, 'inspect', noDraw);
    assert.equal(r(ctx.actor).essence, before + 1);
    assert.equal(ctx.expedition.floor.rooms[0].resolved, true);
    assert.ok(ctx.expedition.lastResult.rewards.some(reward => reward.resource === 'essence' && reward.quantity === 1));
  }
});

test('Hollow Double keeps subjective rewards but receives ordinary Combat-room Essence and Arrow roll', () => {
  const ctx = context(); roomFixture(ctx, 'combat', 'enemy_hollow_double');
  startCombat(ctx, 'enemy_hollow_double', 'room', dice(0));
  r(ctx.actor).sanity = 1; const before = r(ctx.actor).essence;
  ctx.expedition.combat.enemy.hp = 0; ctx.victory = true;
  finishExpeditionAction(ctx, dice(.49, .99));
  assert.equal(r(ctx.actor).essence, before + 1); assert.equal(r(ctx.actor).sanity, 2);
  assert.deepEqual(ctx.expedition.lastResult.rewards, [
    { resource: 'xp', quantity: 5 }, { resource: 'essence', quantity: 1 }, { resource: 'arrows', quantity: 2 },
  ]);
});

test('Current and legacy combat saves replay identically; obsolete pressure/range cannot affect casting or next expedition', () => {
  for (const legacy of [false, true]) {
    const g = combatFixture(undefined, ctx => {
      ctx.actor.data.inventory.spells = ['spell_fireball', null, null, null];
      ctx.actor.data.inventory.bag[0] = item(ctx.actor, 'item_scroll_fireball', 2);
      r(ctx.actor).essence = 100; ctx.expedition.strain = 2; ctx.expedition.combat.enemy.hp = 100;
      if (legacy) Object.assign(ctx.expedition.combat, { range: 'far', spellStrain: 999, scrollStrain: 999 });
    });
    const saved = g.save(), loaded = createSurfaceGame({ saved });
    assert.equal(loaded.save(), saved);
    for (const run of [g, loaded]) use(run, 'pit.cast');
    assert.equal(loaded.save(), g.save()); assert.equal(expedition(loaded).strain, 3);
    assert.equal(expedition(loaded).lastResult.check, null);
    const ctx = context(loaded); ctx.expedition.combat.phase = 'attack';
    const before = [r(ctx.actor).essence, ctx.expedition.strain, r(ctx.actor).sanity];
    castCombatScroll(ctx, 'bag', 0, noDraw);
    assert.deepEqual([r(ctx.actor).essence, ctx.expedition.strain, r(ctx.actor).sanity], before);
    assert.doesNotMatch(resultView(ctx.expedition.lastResult), /Strain/);
    completeReturn(ctx); enterExpedition(ctx, dice(.5));
    assert.equal(ctx.expedition.strain, 0); assert.equal(r(ctx.actor).essence, 0);
    assert.equal(ctx.expedition.combat, null);
    // Save a new expedition after the old state has been discarded.
    const next = setup(loaded, c => {
      c.actor.data = ctx.actor.data; c.actor.primaryLocation = ctx.actor.primaryLocation;
      Object.assign(c.pit, ctx.pit);
    });
    assert.equal(createSurfaceGame({ saved: next.save() }).save(), next.save());
    assert.equal(player(next).primaryLocation, 'hv_pit_1');
  }
});
