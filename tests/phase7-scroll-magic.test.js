import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture,context,dice,item,world,player,pit,expedition,setup,use } from './helpers/m2-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { byId } from '../HearthVale_Content/expedition.js';
import { castCombatSpell,castCombatScroll,startCombat,defend,nextCombatPhase } from '../HearthVale_Shell/src/expedition-combat.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { spellPressure,resolveSpellPressure } from '../HearthVale_Shell/src/magic-pressure.js';
import { expeditionView,resultView } from '../HearthVale_UI/expedition-views.js';
const r=a=>a.data.attributes.resources;
const scrollChoice=g=>g.expeditionChoices().find(c=>c.type==='pit.scroll'&&c.params.container==='bag');
function fixture(mutate=()=>{}){return combatFixture(undefined,ctx=>{
  ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_scroll_fireball',4);
  ctx.expedition.combat.enemy.hp=50;ctx.actor.data.attributes.baseStats.INT=2;ctx.actor.data.attributes.baseStats.WIS=2;
  mutate(ctx);
});}
function castContext(mutate=()=>{}){const ctx=context(fixture());mutate(ctx);return ctx;}

test('Phase 7 Items offers bag Scrolls without equipment or learned spells; inactive items stay visible',()=>{
  const g=fixture(ctx=>{ctx.actor.data.inventory.spells.fill(null);r(ctx.actor).essence=0;
    ctx.actor.data.inventory.bag[1]=item(ctx.actor,'item_tome_fireball');
    ctx.actor.data.inventory.bag[2]=item(ctx.actor,'item_scroll_unlock');
    ctx.actor.data.inventory.bag[3]=item(ctx.actor,'item_antidote');
    ctx.actor.data.holdings={materials:{},valuables:{item_town_medal:3}};
  });
  const w=world(g),a=player(g);
  const html=expeditionView(w,a,g.expeditionChoices(),'bag');
  assert.match(html,/Use Fireball Scroll ×4/);assert.match(html,/Items/);
  assert.match(html,/disabled>Fireball Tome ×1/);assert.match(html,/disabled>Unlock Scroll ×1/);
  assert.match(html,/disabled>Antidote ×1/);assert.match(html,/Town Commemorative Medal ×3/);
  assert.doesNotMatch(html,/Learn Fireball|data-value="spells"|vs DC/);
  assert.ok(!g.expeditionChoices().some(c=>c.type==='pit.swap'&&c.params.bag===0));
});

test('Phase 7 Fireball auto-hits with base plus INT, ignores armor/DEX and uses no accuracy RNG',()=>{
  for(const int of [1,4]){
    const ctx=castContext(c=>{c.actor.data.attributes.baseStats.INT=int;c.expedition.combat.enemy.templateId='enemy_cave_beetle';});
    const before=r(ctx.actor).essence,gear=structuredClone(ctx.actor.data.inventory.equipped);
    castCombatScroll(ctx,'bag',0,{next(){throw Error('Safe auto-hit must not roll');}});
    assert.equal(ctx.expedition.lastResult.damage,5+int);assert.equal(ctx.expedition.combat.enemy.hp,50-5-int);
    assert.equal(ctx.expedition.combat.phase,'incoming');assert.equal(ctx.expedition.combat.spellStrain,undefined);
    assert.equal(ctx.actor.data.inventory.bag[0].quantity,3);assert.equal(r(ctx.actor).essence,before);
    assert.deepEqual(ctx.actor.data.inventory.equipped,gear);
    assert.equal(ctx.expedition.lastResult.dodge,undefined);assert.equal(ctx.expedition.lastResult.quality,undefined);
    assert.match(ctx.expedition.lastResult.text,/automatic hit/);
  }
});

test('Phase 7 safe capacity is expedition-wide WIS, then DC 8 / 11 / 14 / 17 / 20 cap; mental check and loss follow existing rules',()=>{
  const ctx=castContext(c=>{c.actor.data.attributes.baseStats.WIS=2;c.actor.data.attributes.traits=['trait_strong_willed'];});
  const sequence=[];
  for(let n=0;n<6;n++){
    const result=resolveSpellPressure(ctx.actor,ctx.expedition,dice(.99));sequence.push(result.dc);
    if(result.check){assert.equal(result.check.stat,'WIS');assert.equal(result.check.value,2);assert.equal(result.check.bonus,2);assert.equal(result.check.total,24);}
  }
  assert.deepEqual(sequence,[null,null,8,11,14,17]);assert.equal(r(ctx.actor).sanity,5);
  const failed=resolveSpellPressure(ctx.actor,ctx.expedition,dice(0));
  assert.equal(failed.check.success,false);assert.equal(r(ctx.actor).sanity,4);assert.match(failed.text,/Sanity -1/);
  const preview=spellPressure(ctx.actor,ctx.expedition);ctx.actor.data.attributes.baseStats.INT=50;
  assert.deepEqual(spellPressure(ctx.actor,ctx.expedition),preview);
});

test('Corrected learned Overcast still resolves the spell and pays Essence; Scroll stacks are untouched',()=>{
  const ctx=castContext(c=>{c.actor.data.attributes.baseStats.WIS=0;c.actor.data.attributes.traits=['trait_wasteful'];r(c.actor).essence=20;});
  castCombatSpell(ctx,'spell_fireball',dice(0));
  assert.equal(ctx.expedition.combat.enemy.hp,45);assert.equal(ctx.actor.data.inventory.bag[0].quantity,4);
  assert.equal(ctx.expedition.lastResult.overcast.dc,8);assert.equal(r(ctx.actor).sanity,4);assert.equal(r(ctx.actor).essence,19);
  assert.equal(ctx.expedition.combat.phase,'incoming');
  const normal=resultView(ctx.expedition.lastResult),dev=resultView(ctx.expedition.lastResult,true);
  assert.match(normal,/WIS check failed/);assert.doesNotMatch(normal,/d20|vs DC/);
  assert.match(dev,/vs DC 8/);
});

test('Phase 7 illegal phase, missing/zero Scroll and stale stack identity fail atomically',()=>{
  const g=fixture();const choice=scrollChoice(g),saved=g.save();
  assert.throws(()=>g.perform(choice.type,{...choice.params,id:'missing'}),/unavailable/);assert.equal(g.save(),saved);
  g.perform(choice.type,choice.params);const after=g.save();
  assert.throws(()=>g.perform(choice.type,choice.params),/unavailable/);assert.equal(g.save(),after);
  for(const quantity of [0]){const zero=fixture(ctx=>{ctx.actor.data.inventory.bag[0].quantity=quantity;});assert.equal(scrollChoice(zero),undefined);}
  const missing=fixture(ctx=>{ctx.actor.data.inventory.bag[0]=null;});assert.equal(scrollChoice(missing),undefined);
  const ctx=castContext(c=>{c.expedition.combat.phase='incoming';});const before=structuredClone(ctx);
  assert.throws(()=>castCombatScroll(ctx,'bag',0,dice(0)),/unavailable/);assert.deepEqual(ctx,before);
});

test('Corrected Scroll casts take a normal turn without Strain and replay exactly',()=>{
  const g=fixture(ctx=>{ctx.actor.data.attributes.baseStats.DEX=30;ctx.actor.data.statuses={poison:true};});
  const clone=createSurfaceGame({saved:g.save()});
  for(let n=1;n<=3;n++){
    for(const game of [g,clone]){const c=scrollChoice(game);game.perform(c.type,c.params);}
    assert.equal(g.save(),clone.save());assert.equal(expedition(g).combat.phase,'incoming');
    assert.equal(expedition(g).combat.spellStrain,undefined);assert.equal(player(g).data.inventory.bag[0].quantity,4-n);
    assert.equal(expedition(g).lastResult.check,null);
    for(const game of [g,clone])game.perform('pit.defend',{mode:'dodge'});
    assert.equal(g.save(),clone.save());assert.equal(expedition(g).combat.round,n+1);assert.equal(r(player(g)).hp,16-n);
  }
  const saved=g.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);loaded.resumeFlow();assert.equal(loaded.save(),saved);
});

test('Phase 7 Scroll victory uses normal reward boundary immediately, with no Poison or duplicate loot',()=>{
  const g=fixture(ctx=>{ctx.expedition.combat.enemy.hp=5;ctx.actor.data.inventory.bag[0].quantity=1;ctx.actor.data.statuses={poison:true};});
  const before=r(player(g)).xp,c=scrollChoice(g);g.perform(c.type,c.params);
  assert.equal(expedition(g).combat,null);assert.equal(player(g).data.inventory.bag[0],null);
  assert.equal(r(player(g)).hp,16);assert.equal(r(player(g)).xp,before+byId('enemies','enemy_slime').xp);
  assert.equal(expedition(g).floor.rooms[0].resolved,true);assert.match(expedition(g).lastResult.text,/Victory/);
  const saved=g.save(),loaded=createSurfaceGame({saved});loaded.resumeFlow();assert.equal(loaded.save(),saved);
  assert.throws(()=>loaded.perform(c.type,c.params),/unavailable/);assert.equal(loaded.save(),saved);
});

test('Phase 7 Learned count persists across encounters, including Return, and legacy missing field loads without draws',()=>{
  const ctx=castContext();ctx.expedition.strain=6;
  for(const kind of ['room','return']){startCombat(ctx,'enemy_slime',kind,dice(0));assert.equal(ctx.expedition.combat.spellStrain,undefined);assert.equal(ctx.expedition.strain,6);}
  const legacy=fixture(c=>{delete c.expedition.combat.spellStrain;c.expedition.combat.scrollStrain=9;c.expedition.strain=9;});
  const saved=legacy.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);
  use(loaded,'pit.scroll',c=>c.params.container==='bag');assert.equal(expedition(loaded).combat.spellStrain,undefined);assert.equal(expedition(loaded).combat.scrollStrain,undefined);assert.equal(expedition(loaded).strain,9);
  assert.throws(()=>setup(legacy,c=>{c.expedition.combat.spellStrain=-1;}),/Invalid expedition/);
  assert.throws(()=>setup(legacy,c=>{c.expedition.combat.scrollStrain=-1;}),/Invalid expedition/);
});

test('Phase 7 support and Force share content-driven path, keep authored magnitudes and immediate-action restrictions',()=>{
  for(const spell of ['heal','barrier','force']){
    const ctx=castContext(c=>{c.actor.data.inventory.bag[0]=item(c.actor,`item_scroll_${spell}`,2);r(c.actor).hp=2;});
    castCombatScroll(ctx,'bag',0,dice(.99));
    if(spell==='heal')assert.equal(r(ctx.actor).hp,10);
    if(spell==='barrier'){assert.equal(ctx.expedition.combat.barrier,3);defend(ctx,'dodge',undefined,dice(.99));nextCombatPhase(ctx,dice(0));assert.equal(ctx.expedition.combat.barrier,0);}
    if(spell==='force'){assert.equal(ctx.expedition.lastResult.damage,0);assert.equal(ctx.expedition.lastResult.impact,3);assert.equal(ctx.expedition.combat.phase,'advantage');}
    assert.equal(ctx.actor.data.inventory.bag[0].quantity,1);
  }
  for(const phase of ['advantage','counterattack']){
    const ctx=castContext(c=>{c.expedition.combat.phase=phase;c.actor.data.inventory.bag[1]=item(c.actor,'item_scroll_heal');r(c.actor).hp=2;});
    assert.throws(()=>castCombatScroll(ctx,'bag',1,dice(0)),/unavailable/);
    castCombatScroll(ctx,'bag',0,dice(.99));assert.equal(ctx.roundCompleted,true);assert.equal(ctx.expedition.combat.phase,'round-result');
  }
});

test('Corrected learned Overcast uses the existing zero-Sanity death boundary after spell effect',()=>{
  const ctx=castContext(c=>{c.actor.data.attributes.baseStats.WIS=0;r(c.actor).sanity=1;r(c.actor).essence=20;c.expedition.combat.enemy.hp=1;});
  castCombatSpell(ctx,'spell_fireball',dice(0));assert.equal(ctx.expedition.combat.enemy.hp,0);assert.equal(ctx.actor.data.inventory.bag[0].quantity,4);
  finishExpeditionAction(ctx,dice(0));assert.equal(ctx.pit.pendingDeath.cause,'sanity');assert.equal(ctx.pit.expedition,null);
  assert.equal(r(ctx.actor).hearts,3);assert.equal(r(ctx.actor).sanity,0);
});
