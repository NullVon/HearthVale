import test from 'node:test';
import assert from 'node:assert/strict';
import { context, combatFixture, dice, item, expedition, player, world } from './helpers/m2-fixture.js';
import { attackWeapon, attackUnarmed, castCombatSpell, defend, prepareRound } from '../HearthVale_Shell/src/expedition-combat.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { byId, expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';

const c = ctx => ctx.expedition.combat;
const r = ctx => ctx.actor.data.attributes.resources;
const reload = g => { const saved=g.save(),copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);return copy; };
const actBoth = (g,copy,type,params={}) => {g.perform(type,params);copy.perform(type,params);assert.equal(copy.save(),g.save());};

test('Phase 2.1 unified pools have exactly the approved weights and no range metadata',()=>{
  const expected=[
    [['slime_bash',70],['body_slam',30]], [['mandible_snap',65],['shell_ram',35]],
    [['venom_bite',70],['lunging_bite',30]], [['hound_bite',50],['hound_maul',30],['hound_pounce',20]],
    [['wild_slash',50],['reckless_swing',25],['rock_throw',25]], [['brute_swing',70],['brute_heavy',30]],
  ];
  for(const [i,enemy] of expeditionCatalog.enemies.filter(e=>!e.subjective).entries()){
    assert.deepEqual(enemy.moves.entries,expected[i].map(([id,weight])=>({target:`move_${id}`,weight})));
    assert.equal(enemy.near,undefined);assert.equal(enemy.far,undefined);
    const ctx=context();c(ctx).enemy.templateId=enemy.id;
    let cumulative=0;
    for(const entry of enemy.moves.entries){
      prepareRound(ctx,dice((cumulative+entry.weight/2)/100));
      assert.equal(c(ctx).committed.id,entry.target);assert.equal(c(ctx).committed.range,undefined);
      assert.equal(c(ctx).committed.movement,undefined);cumulative+=entry.weight;
    }
  }
  assert.ok(!expeditionCatalog.moves.some(m=>m.id==='move_close'));
  for(const weapon of expeditionCatalog.items.filter(i=>i.category==='weapon'))assert.equal(weapon.range,undefined);
  for(const spell of expeditionCatalog.spells)assert.equal(spell.ranges,undefined);
});

test('Phase 2.1 every weapon and Bare Hands ignores absent or legacy range, with ammo still required',()=>{
  for(const range of [undefined,'NEAR','FAR']){
    const g=combatFixture(undefined,ctx=>{if(range)c(ctx).range=range;r(ctx).arrows=1;});
    assert.equal(expedition(g).combat.range,range);
    for(const slot of [0,1,2])assert.ok(g.expeditionChoices().some(a=>a.type==='pit.attack'&&a.params.slot===slot));
    assert.ok(g.expeditionChoices().some(a=>a.type==='pit.unarmed'));
    assert.ok(!g.expeditionChoices().some(a=>a.type==='pit.move'));
    assert.throws(()=>g.perform('pit.move'),/unavailable/);
    const html=expeditionView(world(g),player(g),g.expeditionChoices());assert.doesNotMatch(html,/NEAR|FAR|Range|range/);
  }
  const empty=combatFixture(undefined,ctx=>{r(ctx).arrows=0;});
  assert.ok(!empty.expeditionChoices().some(a=>a.type==='pit.attack'&&a.params.slot===1));
});

test('Phase 2.1 ordinary Knockdown gives one Advantage and its vulnerability is consumed by that action',()=>{
  const ctx=context();c(ctx).enemy.templateId='enemy_venom_spider';c(ctx).enemy.hp=30;
  ctx.actor.data.inventory.equipped[2]=item(ctx.actor,'item_fang_hammer');
  attackWeapon(ctx,2,dice(.99,.4));assert.equal(c(ctx).phase,'advantage');assert.equal(c(ctx).enemyKnockdown,true);
  let draws=0;attackUnarmed(ctx,{next:()=>{draws++;return .1;}});
  assert.equal(draws,1);assert.equal(ctx.expedition.lastResult.dodge.chance,0);
  assert.equal(c(ctx).enemyKnockdown,false);assert.equal(c(ctx).phase,'round-result');
  finishExpeditionAction(ctx,dice(0));assert.equal(c(ctx).phase,'attack');assert.equal(c(ctx).committed.offensive,true);
  attackUnarmed(ctx,dice(0));assert.equal(ctx.expedition.lastResult.dodge.chance,50);assert.equal(ctx.expedition.lastResult.dodge.success,true);
});

test('Phase 2.1 player vulnerability consumes once for Dodge, Block or Counterattack without skipping turns',()=>{
  for(const mode of ['dodge','block','counter']){
    const ctx=context();c(ctx).playerKnockdown=true;c(ctx).committed.impact=0;c(ctx).committed.damage=2;
    let draws=0;defend(ctx,mode,mode==='block'?3:undefined,{next:()=>{draws++;return 0;}});
    assert.equal(draws,1);assert.equal(c(ctx).playerKnockdown,false);
    if(mode==='dodge'){assert.equal(ctx.expedition.lastResult.dodge.chance,0);assert.equal(ctx.expedition.lastResult.dodge.success,false);}
    if(mode==='counter'){assert.equal(c(ctx).phase,'counterattack');attackUnarmed(ctx,dice(.4));}
    finishExpeditionAction(ctx,dice(0));assert.equal(c(ctx).phase,'attack');
  }
});

test('Phase 2.1 a new Knockdown from the consuming attack remains for a subsequent action',()=>{
  const ctx=context();c(ctx).playerKnockdown=true;c(ctx).committed.impact=99;
  defend(ctx,'dodge',undefined,dice(.4));assert.equal(ctx.expedition.lastResult.dodge.chance,0);
  assert.equal(c(ctx).playerKnockdown,true);finishExpeditionAction(ctx,dice(0));assert.equal(c(ctx).phase,'attack');
});

test('Phase 2.1 supportive spells preserve vulnerability; automatic offense consumes it before applying new Impact',()=>{
  const ctx=context();r(ctx).essence=50;c(ctx).enemyKnockdown=true;
  castCombatSpell(ctx,'spell_barrier',dice(.4));assert.equal(c(ctx).enemyKnockdown,true);
  c(ctx).phase='attack';ctx.actor.data.attributes.baseStats.INT=1;
  castCombatSpell(ctx,'spell_fireball',{next(){throw Error('Safe magic must not roll');}});assert.equal(ctx.expedition.lastResult.check,null);assert.equal(c(ctx).enemyKnockdown,false);
});

for(const phase of ['advantage','counterattack'])for(const action of ['weapon','bare','spell','scroll']){
  test(`Phase 2.1 ${phase} ${action} uses one offensive action and one set of resources across reload`,()=>{
    const g=combatFixture(undefined,ctx=>{
      c(ctx).enemy.hp=100;c(ctx).phase=phase==='counterattack'?'incoming':'advantage';c(ctx).moveCancelled=phase==='advantage';
      r(ctx).essence=20;r(ctx).arrows=10;r(ctx).hp=12;ctx.actor.data.statuses={poison:true};ctx.actor.data.attributes.baseStats.INT=30;
      ctx.actor.data.inventory.spells=['spell_force','spell_heal','spell_barrier','spell_teleport'];
      ctx.actor.data.inventory.equipped[3]=item(ctx.actor,'item_scroll_force',2);
    });
    if(phase==='counterattack'){
      const before=expedition(g).combat.enemy.hp,copy=reload(g);actBoth(g,copy,'pit.defend',{mode:'counter'});
      assert.equal(expedition(g).combat.phase,'counterattack');assert.equal(expedition(g).combat.enemy.hp,before);
      assert.equal(player(g).data.attributes.resources.hp,12); // No round-end Poison before response.
    }
    const saved=g.save(),copy=reload(g),choices=g.expeditionChoices();
    assert.ok(!choices.some(a=>['pit.use','pit.swap','pit.move','pit.retreat','pit.defend'].includes(a.type)));
    assert.ok(!choices.some(a=>a.type==='pit.cast'&&a.params.slot!==0));
    const [type,params]=({weapon:['pit.attack',{slot:1}],bare:['pit.unarmed',{}],spell:['pit.cast',{slot:0}],scroll:['pit.scroll',{slot:3}]})[action];
    actBoth(g,copy,type,params);assert.equal(expedition(g).combat.round,2);assert.equal(expedition(g).combat.phase,'attack');
    assert.equal(player(g).data.attributes.resources.hp,11);assert.equal((expedition(g).lastResult.text.match(/POISONED — 1 HP lost/g)??[]).length,1);
    if(action==='weapon'){assert.equal(player(g).data.attributes.resources.arrows,9);assert.equal(player(g).data.inventory.equipped[1].durability,undefined);}
    if(action==='spell'){assert.equal(player(g).data.attributes.resources.essence,19);assert.equal(expedition(g).strain,1);}
    if(action==='scroll'){assert.equal(player(g).data.inventory.equipped[3].quantity,1);assert.equal(expedition(g).strain,0);assert.equal(expedition(g).combat.spellStrain,undefined);}
    if(['spell','scroll'].includes(action))assert.equal(expedition(g).combat.enemyKnockdown,true);
    reload(g);assert.notEqual(g.save(),saved);
  });
}

test('Phase 2.1 legacy skipped player phase restores one ordinary action and retains vulnerability across reload',()=>{
  const g=combatFixture(undefined,ctx=>{c(ctx).phase='incoming';c(ctx).skippedAttack=true;c(ctx).playerKnockdown=false;c(ctx).enemy.hp=30;});
  const copy=reload(g);assert.ok(g.expeditionChoices().some(a=>a.type==='pit.unarmed'));
  actBoth(g,copy,'pit.unarmed');assert.equal(expedition(g).combat.phase,'incoming');assert.equal(expedition(g).combat.playerKnockdown,true);
  const incoming=reload(g);actBoth(g,incoming,'pit.defend',{mode:'dodge'});
  assert.equal(expedition(g).lastResult.dodge.chance,0);assert.equal(expedition(g).combat.phase,'attack');
});

test('Phase 2.1 legacy Close commitment resumes harmlessly once through the explicit load flow',()=>{
  const g=combatFixture(undefined,ctx=>{
    c(ctx).range='FAR';c(ctx).phase='incoming';ctx.actor.data.statuses={poison:true};
    c(ctx).committed={id:'move_close',label:'Close to NEAR',range:'FAR',movement:'NEAR',damage:0,impact:0,stability:1,onHit:[],offensive:false};
  });
  const saved=g.save(),copy=createSurfaceGame({saved});assert.equal(copy.save(),saved);
  g.resumeFlow();copy.resumeFlow();assert.equal(copy.save(),g.save());
  assert.equal(player(g).data.attributes.resources.hp,15);assert.equal(expedition(g).combat.round,2);
  const done=g.save();g.resumeFlow();assert.equal(g.save(),done);
});
