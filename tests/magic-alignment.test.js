import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture, context, dice, item, player, pit, expedition, setup, use } from './helpers/m2-fixture.js';
import { castCombatSpell, castCombatScroll, defenseValues, defend, nextCombatPhase } from '../HearthVale_Shell/src/expedition-combat.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { expeditionView, expeditionHud } from '../HearthVale_UI/expedition-views.js';
import { equipmentEffectText } from '../HearthVale_Story/expedition.js';
import { byId } from '../HearthVale_Content/expedition.js';

const r = actor => actor.data.attributes.resources;
const noDraw = { next() { throw Error('Safe Teleport must not roll a Return check or enemy action'); } };

for (const mode of ['dodge', 'block', 'counter']) for (const damageType of ['physical', 'spell']) {
  test(`Barrier: ${mode}/${damageType} reduces only HP, preserves Stability/Impact/wear, expires at resolution`, () => {
    const protectedCtx = context();
    Object.assign(protectedCtx.expedition.combat.committed, { damage: 10, impact: 6, damageType });
    protectedCtx.expedition.combat.barrier = 3;
    const ordinary = structuredClone(protectedCtx); ordinary.expedition = ordinary.pit.expedition;
    ordinary.expedition.combat.barrier = 0;
    const slot = 3;
    const values = defenseValues(protectedCtx.actor, protectedCtx.expedition.combat, mode, protectedCtx.actor.data.inventory.equipped[slot]);
    const base = defenseValues(ordinary.actor, ordinary.expedition.combat, mode, ordinary.actor.data.inventory.equipped[slot]);
    assert.equal(values.stability, base.stability); assert.equal(values.defense, base.defense + 3);
    defend(protectedCtx, mode, slot, dice(.4)); defend(ordinary, mode, slot, dice(.4));
    assert.equal(protectedCtx.expedition.lastResult.damage, Math.max(0, ordinary.expedition.lastResult.damage - 3));
    assert.equal(protectedCtx.expedition.lastResult.knockdown, ordinary.expedition.lastResult.knockdown);
    assert.deepEqual(protectedCtx.expedition.lastResult.wear, ordinary.expedition.lastResult.wear);
    assert.equal(protectedCtx.expedition.combat.barrier, 0);
    if (mode === 'counter') assert.equal(protectedCtx.expedition.combat.phase, 'counterattack');
    nextCombatPhase(protectedCtx, dice(0));
    assert.equal(protectedCtx.expedition.combat.barrier, 0);
  });
}

test('Barrier expires on successful Dodge and full absorption, but survives nonoffense and round preparation', () => {
  for (const dodged of [true, false]) {
    const ctx = context(); ctx.expedition.combat.barrier = 3;
    ctx.actor.data.attributes.baseStats.DEX = dodged ? 30 : 0;
    ctx.expedition.combat.committed.damage = 1;
    defend(ctx, dodged ? 'dodge' : 'block', 3, dice(0));
    assert.equal(ctx.expedition.lastResult.damage, 0);
    assert.equal(ctx.expedition.combat.barrier, 0);
    assert.equal(!!ctx.expedition.lastResult.dodge?.success, dodged);
  }
  const ctx = context(); r(ctx.actor).essence = 50;
  castCombatSpell(ctx, 'spell_barrier', noDraw);
  Object.assign(ctx.expedition.combat.committed, { offensive: false, damage: 0, impact: 0, onHit: [] });
  defend(ctx, 'none', undefined, noDraw);
  assert.equal(ctx.expedition.combat.barrier, 3);
  nextCombatPhase(ctx, dice(0)); assert.equal(ctx.expedition.combat.barrier, 3);
  defend(ctx, 'block', 3, dice(.4)); assert.equal(ctx.expedition.combat.barrier, 0);
});

test('Active Barrier survives a cancelled round, legacy/current save reload and exactly one subsequent enemy action', () => {
  for (const legacy of [false, true]) {
    const g = combatFixture(undefined, ctx => {
      const c = ctx.expedition.combat;
      Object.assign(c, { barrier: 3, phase: 'advantage', moveCancelled: true }); c.enemy.hp = 100;
      if (legacy) { c.range = 'FAR'; c.scrollStrain = 4; }
    });
    const saved = g.save(), copy = createSurfaceGame({ saved }); assert.equal(copy.save(), saved);
    for (const run of [g, copy]) use(run, 'pit.unarmed');
    assert.equal(copy.save(), g.save()); assert.equal(expedition(g).combat.barrier, 3);
    assert.equal(expedition(g).combat.phase, 'attack');
    const loaded = createSurfaceGame({ saved: g.save() }); assert.equal(loaded.save(), g.save());
    for (const run of [g, loaded]) { use(run, 'pit.unarmed'); use(run, 'pit.defend', c => c.params.mode === 'block'); }
    assert.equal(loaded.save(), g.save()); assert.equal(expedition(g).combat.barrier, 0);
  }
});

const teleportFixture = (scroll, combat, mutate = () => {}) => combatFixture(undefined, ctx => {
  ctx.actor.data.inventory.spells = ['spell_teleport', null, null, null];
  ctx.actor.data.inventory.bag[0] = item(ctx.actor, 'item_scroll_teleport', 2);
  r(ctx.actor).essence = scroll ? 0 : 100;
  r(ctx.actor).hp = 9; ctx.actor.data.statuses = { poison: true };
  ctx.expedition.combat.committed.damage = 999;
  ctx.expedition.combat.barrier = 3;
  if (!combat) ctx.expedition.combat = null;
  mutate(ctx);
});

for (const scroll of [false, true]) for (const combat of [false, true]) {
  test(`Teleport ${scroll ? 'Scroll' : 'learned'} is available in ${combat ? 'combat' : 'exploration'}, bypasses Return, reloads exactly`, () => {
    const g = teleportFixture(scroll, combat), saved = g.save(), copy = createSurfaceGame({ saved });
    assert.equal(copy.save(), saved);
    const before = structuredClone(r(player(g))), quantity = player(g).data.inventory.bag[0].quantity;
    for (const run of [g, copy]) use(run, scroll ? 'pit.scroll' : 'pit.cast');
    assert.equal(copy.save(), g.save()); assert.equal(expedition(g), null);
    assert.equal(player(g).primaryLocation, 'loc_pit_entrance'); assert.equal(pit(g).lastExpedition.reason, 'teleport');
    assert.equal(r(player(g)).hp, before.hp); assert.equal(r(player(g)).hearts, before.hearts);
    assert.equal(r(player(g)).sanity, before.sanity); assert.equal(r(player(g)).essence, 0);
    assert.equal(player(g).data.statuses.poison, true);
    assert.equal(pit(g).lastResult.cost, scroll ? 0 : 1);
    assert.equal(player(g).data.inventory.bag[0].quantity, quantity - Number(scroll));
    assert.equal(createSurfaceGame({ saved: g.save() }).save(), g.save());
    assert.throws(() => use(g, 'pit.defend'), /Missing legal/);
  });
}

test('Learned combat Teleport pays shared cost, increments count once, checks Overcast before extraction', () => {
  const ctx = context(teleportFixture(false, true)); ctx.expedition.strain = 2;
  ctx.actor.data.attributes.baseStats.INT = 2; ctx.actor.data.attributes.baseStats.WIS = 2;
  castCombatSpell(ctx, 'spell_teleport', dice(0));
  assert.equal(ctx.expedition.strain, 3); assert.equal(ctx.pit.lastResult.cost, 2);
  assert.equal(ctx.pit.lastResult.overcast.dc, 8); assert.equal(r(ctx.actor).sanity, 4);
  assert.equal(ctx.pit.expedition, null); assert.equal(r(ctx.actor).hp, 9);
});

test('Lethal combat Teleport Overcast preserves death context and never resolves pending enemy offense', () => {
  const ctx = context(teleportFixture(false, true)); ctx.expedition.strain = 2;
  ctx.actor.data.attributes.baseStats.WIS = 2; r(ctx.actor).sanity = 1;
  castCombatSpell(ctx, 'spell_teleport', dice(0));
  assert.equal(ctx.pit.expedition, ctx.expedition); assert.equal(r(ctx.actor).sanity, 0);
  assert.equal(ctx.expedition.lastResult.cost, 2); assert.equal(ctx.expedition.strain, 3);
  finishExpeditionAction(ctx, noDraw);
  assert.equal(ctx.pit.expedition, null); assert.equal(ctx.pit.pendingDeath.cause, 'sanity');
  assert.equal(r(ctx.actor).hp, 9); assert.equal(ctx.actor.data.statuses.poison, true);
});

test('Combat Teleport Scroll ignores high learned count, WIS zero and Wasteful, including a Return Encounter', () => {
  const ctx = context(teleportFixture(true, true)); ctx.expedition.strain = 9;
  ctx.expedition.combat.kind = 'return'; ctx.actor.data.attributes.baseStats.WIS = 0;
  ctx.actor.data.attributes.traits = ['trait_wasteful']; r(ctx.actor).sanity = 1;
  castCombatScroll(ctx, 'bag', 0, noDraw);
  assert.equal(ctx.expedition.strain, 9); assert.equal(ctx.pit.lastResult.cost, 0);
  assert.equal(ctx.pit.lastResult.overcast, undefined); assert.equal(r(ctx.actor).sanity, 1);
  assert.equal(ctx.actor.data.inventory.bag[0].quantity, 1); assert.equal(ctx.pit.expedition, null);
  assert.equal(ctx.pit.lastExpedition.reason, 'teleport'); assert.equal(r(ctx.actor).hp, 9);
});

test('Teleport is limited to normal combat actions; Barrier and Teleport UI describe current timing', () => {
  for (const phase of ['incoming', 'advantage', 'counterattack']) {
    const g = teleportFixture(false, true, ctx => { ctx.expedition.combat.phase = phase; });
    assert.ok(!g.expeditionChoices().some(c => c.type === 'pit.cast' || c.type === 'pit.scroll'));
  }
  const g = teleportFixture(false, true);
  const html = expeditionView(g.snapshot().world, player(g), g.expeditionChoices(), 'spells');
  assert.match(html, /Teleport — 1 Essence/);
  assert.match(expeditionHud(player(g), expedition(g)), /Barrier 3 \(next enemy offensive action\)/);
  assert.doesNotMatch(html, /this round/);
  assert.match(equipmentEffectText(byId('spells', 'spell_barrier').effects), /no Stability bonus/);
  const items = expeditionView(g.snapshot().world, player(g), g.expeditionChoices(), 'bag');
  assert.match(items, /Use Teleport Scroll ×2/);
});
