import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture,context,dice,item,player,expedition,setup,use } from './helpers/m2-fixture.js';
import { castCombatSpell,castCombatScroll,startCombat } from '../HearthVale_Shell/src/expedition-combat.js';
import { spellPressure } from '../HearthVale_Shell/src/magic-pressure.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
const resources=a=>a.data.attributes.resources;
const learned=(mutate=()=>{})=>combatFixture(undefined,c=>{
  c.actor.data.inventory.spells=['spell_fireball','spell_force','spell_heal','spell_barrier'];
  resources(c.actor).essence=100;c.expedition.combat.enemy.hp=200;
  c.actor.data.attributes.traits=[];mutate(c);
});

test('Learned casts use shared exponential Essence and expedition-wide WIS / DC 8,11,14,17,20 cap',()=>{
  const ctx=context(learned()),dcs=[],costs=[],draws=[];
  for(let n=1;n<=7;n++){
    ctx.expedition.combat.phase='attack';let count=0;
    castCombatSpell(ctx,'spell_fireball',{next(){count++;return .99;}});
    const result=ctx.expedition.lastResult;
    assert.equal(ctx.expedition.strain,n);assert.equal(ctx.expedition.strain,n);
    dcs.push(result.overcast?.dc??null);costs.push(result.cost);draws.push(count);
    assert.equal(result.damage,5);assert.equal(resources(ctx.actor).sanity,5);
    assert.equal(ctx.expedition.combat.phase,'incoming');
  }
  assert.deepEqual(dcs,[null,null,8,11,14,17,20]);assert.deepEqual(costs,[1,1,2,4,8,16,32]);
  assert.deepEqual(draws,[0,0,1,1,1,1,1]);assert.equal(resources(ctx.actor).essence,36);
});

test('Failed learned Overcast costs exactly one Sanity after a resolved spell; success costs none',()=>{
  for(const success of [false,true]){
    const ctx=context(learned(c=>{c.actor.data.attributes.baseStats.WIS=0;}));
    castCombatSpell(ctx,'spell_fireball',dice(success?.99:0));
    assert.equal(ctx.expedition.combat.enemy.hp,195);assert.equal(ctx.expedition.lastResult.overcast.dc,8);
    assert.equal(ctx.expedition.lastResult.overcast.success,success);
    assert.equal(resources(ctx.actor).sanity,success?5:4);assert.equal(resources(ctx.actor).essence,99);
    assert.equal(ctx.expedition.strain,1);assert.equal(ctx.expedition.combat.phase,'incoming');
  }
});

test('Every existing combat learned spell builds pressure while preserving effects and automatic offense',()=>{
  for(const id of ['spell_fireball','spell_force','spell_heal','spell_barrier']){
    const ctx=context(learned(c=>{resources(c.actor).hp=2;}));castCombatSpell(ctx,id,dice(.99));
    assert.equal(ctx.expedition.strain,1);
    if(id==='spell_fireball'){assert.equal(ctx.expedition.lastResult.damage,5);assert.equal(resources(ctx.actor).essence,99);}
    if(id==='spell_force'){assert.equal(ctx.expedition.lastResult.impact,3);assert.equal(ctx.expedition.combat.phase,'advantage');assert.equal(resources(ctx.actor).essence,99);}
    if(id==='spell_heal'){assert.equal(resources(ctx.actor).hp,10);assert.equal(resources(ctx.actor).essence,99);}
    if(id==='spell_barrier'){assert.equal(ctx.expedition.combat.barrier,3);assert.equal(resources(ctx.actor).essence,99);}
  }
  const automatic=context(learned());castCombatSpell(automatic,'spell_fireball',{next(){throw Error('Safe offense must not roll');}});
  assert.equal(automatic.expedition.lastResult.check,null);assert.equal(automatic.expedition.combat.enemy.hp,195);
  assert.equal(automatic.expedition.strain,1);assert.equal(resources(automatic.actor).essence,99);
});

test('Unknown, insufficient-Essence and wrong-phase learned actions reject atomically through production eligibility',()=>{
  for(const g of [learned(c=>c.actor.data.inventory.spells.fill(null)),learned(c=>resources(c.actor).essence=0),
    learned(c=>c.expedition.combat.phase='incoming')]){
    const before=g.save();assert.throws(()=>g.perform('pit.cast',{slot:0}),/unavailable/);assert.equal(g.save(),before);
  }
});

test('Scrolls bypass every Overcast consequence even at high learned Strain, WIS zero and one Sanity',()=>{
  const ctx=context(learned(c=>{
    c.actor.data.attributes.baseStats.WIS=0;resources(c.actor).sanity=1;c.expedition.strain=5;
    c.actor.data.inventory.bag[0]=item(c.actor,'item_scroll_fireball',2);c.actor.data.attributes.traits=['trait_wasteful'];
  }));
  castCombatScroll(ctx,'bag',0,{next(){throw Error('Scroll must not roll WIS or accuracy');}});
  assert.equal(ctx.expedition.combat.spellStrain,undefined);assert.equal(ctx.expedition.strain,5);
  assert.equal(resources(ctx.actor).sanity,1);assert.equal(resources(ctx.actor).essence,100);
  assert.equal(ctx.actor.data.inventory.bag[0].quantity,1);assert.equal(ctx.expedition.combat.enemy.hp,193);
  assert.equal(ctx.expedition.combat.phase,'incoming');assert.equal(ctx.expedition.lastResult.check,null);
  assert.equal(ctx.expedition.lastResult.overcast,undefined);
});

test('Interleaved Scroll neither increases nor clears learned pressure or Essence surcharge history',()=>{
  const ctx=context(learned(c=>{c.actor.data.attributes.baseStats.WIS=1;c.actor.data.inventory.bag[0]=item(c.actor,'item_scroll_fireball',2);}));
  castCombatSpell(ctx,'spell_fireball',dice(.99));assert.equal(ctx.expedition.strain,1);
  ctx.expedition.combat.phase='attack';castCombatScroll(ctx,'bag',0,{next(){throw Error('No Scroll random check');}});
  assert.equal(ctx.expedition.strain,1);assert.equal(ctx.expedition.strain,1);assert.equal(resources(ctx.actor).essence,99);
  ctx.expedition.combat.phase='attack';castCombatSpell(ctx,'spell_fireball',dice(0));
  assert.equal(ctx.expedition.strain,2);assert.equal(ctx.expedition.lastResult.overcast.dc,8);
  assert.equal(resources(ctx.actor).sanity,4);assert.equal(resources(ctx.actor).essence,98);
});

test('Active expedition pressure saves/replays exactly and survives new room and Return combats',()=>{
  const g=learned();use(g,'pit.cast',c=>c.params.slot===0);
  const saved=g.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);
  assert.equal(expedition(loaded).strain,1);
  for(const run of [g,loaded])use(run,'pit.defend',c=>c.params.mode==='dodge');assert.equal(g.save(),loaded.save());
  const ctx=context(g),costHistory=ctx.expedition.strain;
  for(const kind of ['room','return']){startCombat(ctx,'enemy_slime',kind,dice(0));assert.equal(ctx.expedition.combat.spellStrain,undefined);assert.equal(ctx.expedition.strain,costHistory);}
});

test('Old scrollStrain saves load exactly and migrate to zero learned pressure on the first authorized action',()=>{
  const legacy=setup(learned(),c=>{delete c.expedition.combat.spellStrain;c.expedition.combat.scrollStrain=7;});
  const saved=legacy.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);
  assert.equal(spellPressure(player(loaded),expedition(loaded)).strain,1);
  use(loaded,'pit.cast',c=>c.params.slot===0);assert.equal(expedition(loaded).strain,1);
  assert.equal(expedition(loaded).combat.scrollStrain,undefined);assert.equal(expedition(loaded).lastResult.overcast,null);
  assert.throws(()=>setup(legacy,c=>c.expedition.combat.spellStrain=-1),/Invalid expedition/);
});

test('Scroll victory remains normal at one Sanity and high pressure; reward and consumption happen once',()=>{
  const g=learned(c=>{c.expedition.combat.enemy.hp=1;c.expedition.strain=9;c.actor.data.attributes.baseStats.WIS=0;
    resources(c.actor).sanity=1;c.actor.data.inventory.bag[0]=item(c.actor,'item_scroll_fireball');});
  const xp=resources(player(g)).xp;use(g,'pit.scroll',c=>c.params.container==='bag'&&c.params.slot===0);
  assert.equal(expedition(g).combat,null);assert.equal(resources(player(g)).sanity,1);
  assert.equal(player(g).data.inventory.bag[0],null);assert.ok(resources(player(g)).xp>xp);
  assert.match(expedition(g).lastResult.text,/Victory/);assert.equal(player(g).data.death,undefined);
  const saved=g.save(),loaded=createSurfaceGame({saved});loaded.resumeFlow();assert.equal(loaded.save(),saved);
});

test('Normal spell access and UI distinguish reusable Essence/Strain casting from consumed risk-free Scrolls',()=>{
  const g=learned(c=>c.actor.data.inventory.bag[0]=item(c.actor,'item_scroll_fireball'));
  const spells=expeditionView(g.snapshot().world,player(g),g.expeditionChoices(),'spells');
  assert.match(spells,/Next learned cast/);assert.match(spells,/data-value="spells"/);assert.match(spells,/Fireball — 1 Essence/);
  assert.doesNotMatch(spells,/vs DC|d20|Dev Mode/);
  const items=expeditionView(g.snapshot().world,player(g),g.expeditionChoices(),'bag');
  assert.match(items,/without Essence cost or Overcast/);assert.doesNotMatch(items,/Strain|WIS allows|Next cast|Scroll pressure/);
});
