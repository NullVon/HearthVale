import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture,context,dice,item,roomFixture,player,expedition,setup,use } from './helpers/m2-fixture.js';
import { castCombatSpell,startCombat,castCombatScroll } from '../HearthVale_Shell/src/expedition-combat.js';
import { spellCost } from '../HearthVale_Shell/src/expedition-equipment.js';
import { spellPressure } from '../HearthVale_Shell/src/magic-pressure.js';
import { enterExpedition,completeReturn,finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { explorationSpell } from '../HearthVale_Shell/src/expedition-rooms.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
import { magicIntroduction } from '../HearthVale_UI/magic-onboarding.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
const r=a=>a.data.attributes.resources;
const fixture=()=>combatFixture(undefined,c=>{
  c.actor.data.inventory.spells=['spell_fireball','spell_force','spell_heal','spell_barrier'];
  c.actor.data.attributes.traits=[];r(c.actor).essence=500;c.expedition.combat.enemy.hp=200;
});

test('Locked shared Essence costs match INT 1/2/3/4 sequences, independent of every legacy spell cost',()=>{
  const expected={1:[1,2,4,8,16,32],2:[1,1,2,4,8,16],3:[1,1,1,2,4,8],4:[1,1,1,1,2,4]};
  for(const [int,sequence] of Object.entries(expected)){
    const ctx=context(fixture());ctx.actor.data.attributes.baseStats.INT=Number(int);ctx.actor.data.attributes.baseStats.WIS=50;
    for(const cost of sequence){
      for(const legacy of [0,3,4,999])assert.equal(spellCost(ctx.actor,ctx.expedition,{cost:legacy}),cost);
      const before=r(ctx.actor).essence;ctx.expedition.combat.phase='attack';castCombatSpell(ctx,'spell_fireball',dice(.99));
      assert.equal(ctx.expedition.lastResult.cost,cost);assert.equal(r(ctx.actor).essence,before-cost);
    }
    assert.equal(ctx.expedition.strain,sequence.length);
  }
  for(const spell of ['spell_fireball','spell_force','spell_heal','spell_barrier']){
    const ctx=context(fixture());r(ctx.actor).hp=2;castCombatSpell(ctx,spell,dice(.99));
    assert.equal(ctx.expedition.lastResult.cost,1);assert.equal(r(ctx.actor).essence,499);
  }
});

test('Expedition count and next cost/risk persist after victory, new combat, retreat and active save/reload',()=>{
  const ctx=context(fixture());ctx.actor.data.attributes.baseStats.INT=1;ctx.actor.data.attributes.baseStats.WIS=1;
  ctx.expedition.combat.enemy.hp=5;castCombatSpell(ctx,'spell_fireball',dice(.99));finishExpeditionAction(ctx,dice(.99));
  assert.equal(ctx.expedition.combat,null);assert.equal(ctx.expedition.strain,1);
  for(const kind of ['room','return']){
    startCombat(ctx,'enemy_slime',kind,dice(0));assert.equal(ctx.expedition.strain,1);
    assert.equal(spellCost(ctx.actor,ctx.expedition),2);assert.equal(spellPressure(ctx.actor,ctx.expedition).dc,8);
  }
  const g=setup(fixture(),c=>{c.expedition.strain=4;});const loaded=createSurfaceGame({saved:g.save()});
  assert.equal(loaded.save(),g.save());assert.equal(expedition(loaded).strain,4);
  use(loaded,'pit.retreat');assert.equal(expedition(loaded).combat,null);assert.equal(expedition(loaded).strain,4);
  assert.equal(spellPressure(player(loaded),expedition(loaded)).dc,14);
});

test('Return discards unused Essence and learned count; new expedition starts with both zero',()=>{
  const ctx=context(fixture());ctx.expedition.strain=6;r(ctx.actor).essence=47;
  completeReturn(ctx);assert.equal(ctx.pit.expedition,null);assert.equal(r(ctx.actor).essence,0);
  assert.equal(ctx.actor.primaryLocation,'loc_pit_entrance');
  enterExpedition(ctx,dice(.5));assert.equal(ctx.expedition.strain,0);assert.equal(r(ctx.actor).essence,0);
  assert.equal(spellCost(ctx.actor,ctx.expedition),1);assert.equal(spellPressure(ctx.actor,ctx.expedition).dc,null);
});

test('DC 8/11/14/17/20 is capped, including later combats; failed Overcast follows the resolved effect',()=>{
  const ctx=context(fixture());ctx.actor.data.attributes.baseStats.WIS=0;ctx.actor.data.attributes.baseStats.INT=50;
  const dcs=[];
  for(let n=1;n<=7;n++){
    startCombat(ctx,'enemy_slime','room',dice(0));ctx.expedition.combat.enemy.hp=50;
    castCombatSpell(ctx,'spell_fireball',dice(0));dcs.push(ctx.expedition.lastResult.overcast.dc);
    assert.equal(ctx.expedition.combat.enemy.hp,45);assert.equal(r(ctx.actor).sanity,Math.max(0,5-n));
    assert.equal(ctx.expedition.strain,n);
  }
  assert.deepEqual(dcs,[8,11,14,17,20,20,20]);
});

test('Learned exploration Heal/Unlock use the same count/cost/risk; Scrolls bypass it and consume exactly one',()=>{
  const ctx=context(fixture());ctx.expedition.combat=null;ctx.actor.data.attributes.baseStats.INT=1;ctx.actor.data.attributes.baseStats.WIS=1;
  r(ctx.actor).hp=2;explorationSpell(ctx,'spell_heal',dice(.99));assert.equal(ctx.expedition.strain,1);assert.equal(r(ctx.actor).hp,10);
  assert.equal(ctx.expedition.lastResult.cost,1);assert.equal(ctx.expedition.lastResult.overcast,null);
  roomFixture(ctx,'treasure','m2_locked_coffer');explorationSpell(ctx,'spell_unlock',dice(0));
  assert.equal(ctx.expedition.strain,2);assert.equal(ctx.expedition.lastResult.cost,2);assert.equal(ctx.expedition.lastResult.overcast.dc,8);
  assert.equal(ctx.expedition.floor.rooms[0].resolved,true);assert.equal(r(ctx.actor).sanity,4);
  r(ctx.actor).hp=2;ctx.actor.data.attributes.traits=['trait_wasteful'];ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_scroll_heal',2);
  const before=r(ctx.actor).essence;explorationSpell(ctx,'spell_heal',{next(){throw Error('Scroll must not roll');}},0,'bag');
  assert.equal(ctx.actor.data.inventory.bag[0].quantity,1);assert.equal(ctx.expedition.strain,2);assert.equal(r(ctx.actor).essence,before);
  assert.equal(ctx.expedition.lastResult.cost,0);assert.equal(ctx.expedition.lastResult.overcast,undefined);assert.equal(r(ctx.actor).sanity,4);
  startCombat(ctx,'enemy_slime','room',dice(0));ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_scroll_fireball',2);
  castCombatScroll(ctx,'bag',0,{next(){throw Error('Scroll must not roll');}});assert.equal(ctx.expedition.strain,2);assert.equal(r(ctx.actor).essence,before);
});

test('Lethal learned extraction checks Overcast before normal return clears expedition death context',()=>{
  const ctx=context(fixture());ctx.expedition.combat=null;ctx.actor.data.attributes.baseStats.WIS=0;r(ctx.actor).sanity=1;
  explorationSpell(ctx,'spell_teleport',dice(0));assert.equal(ctx.expedition.strain,1);assert.equal(r(ctx.actor).sanity,0);
  finishExpeditionAction(ctx,dice(0));assert.equal(ctx.pit.pendingDeath.cause,'sanity');assert.equal(ctx.pit.expedition,null);
});

test('Normal magic UI shows shared next cost and risk, hides the counter, and tutorial explains expedition reset',()=>{
  const g=setup(fixture(),c=>{c.expedition.strain=5;c.actor.data.attributes.baseStats.INT=2;});
  const html=expeditionView(g.snapshot().world,player(g),g.expeditionChoices(),'spells');
  assert.match(html,/Next learned cast: 16 Essence/);assert.match(html,/Fireball — 16 Essence/);
  assert.match(html,/Overcast — WIS check vs DC 17/);assert.doesNotMatch(html,/Strain \d|Learned Cast Count|Fireball — 4 Essence|per encounter|encounter ends/);
  const dev=expeditionView(g.snapshot().world,player(g),g.expeditionChoices(),'spells',0,true);assert.match(dev,/Learned Cast Count 5/);
  const tutorial=magicIntroduction(player(g),false);assert.match(tutorial,/increasingly expensive/);assert.match(tutorial,/return from the expedition/);
  assert.match(tutorial,/Scrolls cost no Essence and avoid Overcast/);assert.doesNotMatch(tutorial,/d20|DC|Strain|encounter ends/);
});
