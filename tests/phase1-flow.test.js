import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture, context, dice, expedition, player, pit, world } from './helpers/m2-fixture.js';
import { attackUnarmed, attackWeapon, defend } from '../HearthVale_Shell/src/expedition-combat.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { derivedActorValues } from '../HearthVale_Shell/src/surface-candidates.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { expeditionView, pitEntrance, resultView } from '../HearthVale_UI/expedition-views.js';
import { serviceView } from '../HearthVale_UI/service-views.js';
import { freshGameSeed } from '../HearthVale_UI/new-game.js';

const r = actor => actor.data.attributes.resources;
const noPause = game => assert.ok(!game.expeditionChoices().some(c => c.type === 'pit.combat-next' || c.params.mode === 'none'));

test('Phase 1 Bare Hands resolves ordinary and Return combat without any equipment', () => {
  for (const kind of ['room', 'return']) {
    const g = combatFixture(undefined, ctx => {
      ctx.expedition.combat.kind = kind;
      ctx.actor.data.inventory.equipped.fill(null);
      ctx.actor.data.inventory.chest = null;
      ctx.actor.data.attributes.baseStats.STR = 30;
      ctx.actor.data.attributes.baseStats.DEX = 30;
    });
    const arrows = r(player(g)).arrows;
    for (let n = 0; expedition(g)?.combat && n < 30; n++) {
      noPause(g);
      const choices = g.expeditionChoices();
      const choice = choices.find(c => c.type === 'pit.unarmed')
        ?? choices.find(c => c.type === 'pit.move') ?? choices.find(c => c.type === 'pit.defend');
      assert.ok(choice, 'A resolving action always exists');
      g.perform(choice.type, choice.params);
    }
    assert.ok(!expedition(g)?.combat);
    const arrowReward=expedition(g)?.lastResult.rewards?.find(reward=>reward.resource==='arrows')?.quantity??0;
    assert.equal(r(player(g)).arrows, arrows+arrowReward);
    assert.ok(kind==='room'?[0,1,2].includes(arrowReward):arrowReward===0);
    assert.equal(r(player(g)).hearts, 3);
    assert.deepEqual(player(g).data.inventory.equipped, [null, null, null, null]);
    if (kind === 'return') assert.equal(player(g).primaryLocation, 'loc_pit_entrance');
  }
  const ctx = context();
  ctx.expedition.combat.enemy.templateId = 'enemy_cave_beetle';
  attackUnarmed(ctx, dice(.99));
  assert.equal(ctx.expedition.lastResult.damage, 2);
  assert.equal(ctx.expedition.lastResult.impact, 0);
  assert.equal(ctx.expedition.lastResult.quality.stat, 'STR');
  const far = combatFixture(undefined, c => { c.expedition.combat.range = 'FAR'; });
  assert.doesNotThrow(() => far.perform('pit.unarmed'));
});

test('Phase 1 ordinary and Return Heart loss end at full HP, clear Poison, unlock Auron training and introduce it on Guild arrival', () => {
  for (const kind of ['room', 'return']) {
    const g = combatFixture(undefined, ctx => {
      ctx.expedition.combat.kind = kind;
      ctx.expedition.combat.phase = 'incoming';
      ctx.expedition.combat.committed.damage = 99;
      ctx.actor.data.attributes.baseStats.DEX = 0;
      ctx.actor.data.expeditionHp = 8;
      r(ctx.actor).hearts = 3; r(ctx.actor).hp = 1; r(ctx.actor).essence = 12; r(ctx.actor).xp = 4;
      ctx.expedition.strain = 8;
      ctx.actor.data.statuses = { poison: true };
    });
    g.perform('pit.defend', { mode: 'block', slot: 3 });
    const a = player(g);
    assert.equal(r(a).hearts, 2);
    assert.equal(r(a).hp, derivedActorValues(a).maxHp);
    assert.equal(a.data.expeditionHp, 0);
    assert.equal(a.primaryLocation, 'loc_pit_entrance');
    assert.equal(a.data.statuses.poison, undefined);
    assert.equal(r(a).essence, 0);
    assert.equal(expedition(g), null);
    assert.equal(a.data.memories.filter(m => m.kind === 'heart-loss').length, 1);
    assert.equal(a.data.scars.length, 0);
    assert.equal(world(g).globals.hearthvaleServices.auronTrainingPending, true);
    assert.equal(world(g).globals.hearthvaleServices.auronTrainingUnlocked, true);
    assert.equal(createSurfaceGame({ saved:g.save() }).save(), g.save());
    const entrance = pitEntrance(world(g), a, g.expeditionChoices());
    assert.match(entrance, /lost 1 Heart/); assert.match(entrance, /Guardian Adventurer/); assert.match(entrance, /Choose Leave, then Guild/);
    g.perform('Move', { location:'loc_guild' });
    const services=world(g).globals.hearthvaleServices;
    assert.equal(services.auronTrainingPending, false); assert.equal(services.auronTrainingUnlocked, true); assert.equal(services.auronTrainingIntroduced, true);
    const guild=serviceView(world(g), player(g), g.serviceChoices());
    assert.match(guild, /Auron training introduction/); assert.match(guild, /Come train with me/); assert.match(guild, /Training with Auron/);
    assert.match(guild, /Current XP: 4/); assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));
    g.perform('Move', { location:'loc_inn' });
    g.perform('surface.sleep', { day:1, confirmed:true });
    assert.doesNotMatch(pitEntrance(world(g), player(g), []), /lost 1 Heart/);
    assert.match(pit(g).lastResult.text, /lost 1 Heart/);
  }
});

test('Phase 2 defense and the one Stagger follow-up advance inline; Poison ticks exactly once', () => {
  for (const cancel of [false, true]) {
    const ctx = context();
    ctx.actor.data.statuses = { poison:true };
    if (cancel) {
      ctx.expedition.combat.enemy.hp = 20;
      ctx.expedition.combat.committed.stability = 2;
      attackWeapon(ctx, 2, dice(.4));
      finishExpeditionAction(ctx, dice(0));
      assert.equal(ctx.expedition.combat.phase, 'advantage');
      assert.equal(r(ctx.actor).hp, 16);
      assert.match(ctx.expedition.lastResult.text, /Stagger/);
      attackUnarmed(ctx, dice(.4));
    } else defend(ctx, 'dodge', undefined, dice(0));
    finishExpeditionAction(ctx, dice(0));
    assert.equal(r(ctx.actor).hp, 15);
    assert.equal(ctx.expedition.combat.round, 2);
    assert.equal(ctx.expedition.combat.phase, 'attack');
    assert.match(ctx.expedition.lastResult.text, cancel ? /Bare Hands/ : /Dodged/);
    assert.equal((ctx.expedition.lastResult.text.match(/POISONED — 1 HP lost/g) ?? []).length, 1);
    finishExpeditionAction(ctx, dice(0));
    assert.equal(r(ctx.actor).hp, 15);
  }
});

test('Phase 1 legacy nonoffensive moves resolve inline; legacy range cannot bypass defense', () => {
  for (const nonoffensive of [false,true]) {
    const g = combatFixture(undefined, ctx => {
      ctx.actor.data.statuses = { poison:true };
      if (nonoffensive) ctx.expedition.combat.committed.offensive = false;
      else ctx.expedition.combat.committed.range = 'FAR';
      ctx.actor.data.attributes.baseStats.STR = 30;
    });
    g.perform('pit.unarmed');
    noPause(g);
    assert.equal(expedition(g).combat.round, nonoffensive ? 2 : 1);
    assert.equal(r(player(g)).hp, nonoffensive ? 15 : 16);
    if(nonoffensive)assert.match(expedition(g).lastResult.text,/legacy nonoffensive action completed/);
    else assert.equal(expedition(g).combat.phase,'incoming');
    assert.match(expedition(g).lastResult.text, /Bare Hands/);
  }
});

test('Phase 1 Poison defeat stops before another round; Knockdown does not create extra rounds or ticks', () => {
  const lethal = context(); lethal.actor.data.statuses = {poison:true}; r(lethal.actor).hp = 1;
  defend(lethal, 'dodge', undefined, dice(0));
  finishExpeditionAction(lethal, dice(0));
  assert.equal(lethal.pit.expedition, null);
  assert.equal(lethal.expedition.combat.round, 1);
  assert.equal(r(lethal.actor).hearts, 2);
  assert.equal(lethal.actor.data.memories.filter(m=>m.kind==='heart-loss')[0].cause, 'Poison');
  const skipped = context(); skipped.actor.data.statuses = {poison:true};
  skipped.expedition.combat.enemyKnockdown = true;
  skipped.expedition.combat.committed.impact = 99;
  defend(skipped, 'block', 3, dice(0)); // Zero damage but player knocked down.
  finishExpeditionAction(skipped, dice(0));
  assert.equal(skipped.expedition.combat.round, 2);
  assert.equal(skipped.expedition.combat.phase, 'attack');
  assert.equal(r(skipped.actor).hp, 15); // One completed round; both vulnerabilities persist.
});

test('Phase 1 old round saves load exactly and resume safely without double Poison', () => {
  for (const phase of ['cancelled','round-result','incoming']) {
    const g = combatFixture(undefined, ctx => {
      ctx.expedition.combat.phase = phase;
      ctx.expedition.combat.committed.offensive = false;
      ctx.actor.data.statuses = { poison:true };
    });
    const save = g.save(), restored = createSurfaceGame({ saved:save });
    assert.equal(restored.save(), save);
    restored.resumeFlow(); noPause(restored);
    assert.equal(r(player(restored)).hp, phase === 'round-result' ? 16 : 15);
    const resumed = restored.save(); restored.resumeFlow(); assert.equal(restored.save(), resumed);
  }
});

test('Phase 1 weapon tiles own attacks; normal view hides math and Dev Mode exposes it', () => {
  const g = combatFixture(); g.perform('pit.unarmed');
  const normal = expeditionView(world(g), player(g), g.expeditionChoices());
  const dev = expeditionView(world(g), player(g), g.expeditionChoices(), 'weapons', 0, true);
  assert.doesNotMatch(normal, /check-math|d20|vs DC|Incoming enemy phase|Round outcome/);
  assert.match(dev, /check-math/); assert.match(dev, /Defender DEX/);
  const fresh = combatFixture(), html = expeditionView(world(fresh), player(fresh), fresh.expeditionChoices());
  assert.equal((html.match(/&quot;type&quot;:&quot;pit.attack&quot;/g) ?? []).length, 3);
  assert.match(html, /class="weapon-tile" data-command="expedition"/);
  assert.doesNotMatch(html, /class="weapon-tile" disabled/);
  assert.doesNotMatch(html, /Attack: Sword|Attack: Hammer/);
  assert.match(resultView({ text:'Win', rewards:[{resource:'xp',quantity:2}] }), /XP \+2/);
});

test('Phase 1.2 legacy unlocked saves still show the Auron training introduction', () => {
  const g = combatFixture(), w = structuredClone(world(g)), a = structuredClone(player(g));
  a.primaryLocation = 'loc_guild';
  w.globals.hearthvaleServices.auronTrainingUnlocked = true;
  delete w.globals.hearthvaleServices.auronTrainingIntroduced;
  const html = serviceView(w, a, []);
  assert.match(html, /Auron training introduction/); assert.match(html, /Come train with me/); assert.match(html, /Training with Auron/);
});

test('Phase 1 UI seeds vary while explicit and default engine seeds remain deterministic', () => {
  const candidates = g => world(g).globals.hearthvaleSurface.candidates;
  assert.deepEqual(candidates(createSurfaceGame()), candidates(createSurfaceGame({seed:1})));
  assert.deepEqual(candidates(createSurfaceGame({seed:42})), candidates(createSurfaceGame({seed:42})));
  const sets = Array.from({length:4}, () => JSON.stringify(candidates(createSurfaceGame({seed:freshGameSeed()}))));
  assert.equal(new Set(sets).size, 4);
});
