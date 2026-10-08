import test from 'node:test';
import assert from 'node:assert/strict';
import { dodgeChance, rollDodge, hitQuality } from '../HearthVale_Shell/src/expedition-checks.js';
import { attackWeapon, attackUnarmed, defend, prepareRound, combatMove } from '../HearthVale_Shell/src/expedition-combat.js';
import { finishExpeditionAction } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { byId, expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { validateCatalog } from '../HearthVale_Content/validation.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
import { context, combatFixture, dice, item, world, player, expedition } from './helpers/m2-fixture.js';

const resources = ctx => ctx.actor.data.attributes.resources;
const combat = ctx => ctx.expedition.combat;
const noPause = g => assert.ok(!g.expeditionChoices().some(c => c.type === 'pit.combat-next' || c.params.mode === 'none'));

test('Phase 2 all Dodge bands, boundaries and ordinary 75% cap', () => {
  for (const [difference, chance] of [[-9,0],[0,0],[1,25],[2,50],[3,75],[99,75]]) {
    assert.equal(dodgeChance(5 + difference, 5, 0).chance, chance);
    let draws = 0;
    const rng = { next: () => { draws++; return chance / 100; } };
    assert.equal(rollDodge(5 + difference, 5, 0, rng).success, false);
    assert.equal(draws, chance ? 1 : 0);
    if (chance) assert.equal(rollDodge(5 + difference, 5, 0, dice(chance / 100 - 0.001)).success, true);
  }
});

test('Phase 2 authored weapon and enemy move Speed change Dodge in both directions', () => {
  assert.deepEqual(['item_hammer','item_sword','item_bow'].map(id => dodgeChance(4, 2, byId('items',id).speed).chance), [75,50,25]);
  assert.deepEqual(['move_hound_maul','move_wild_slash','move_hound_bite'].map(id => dodgeChance(4, 2, byId('moves',id).speed).chance), [75,50,25]);
  assert.deepEqual(expeditionCatalog.enemies.filter(e=>!e.subjective).map(e=>e.combatStats), [{STR:2,DEX:1},{STR:3,DEX:2},{STR:1,DEX:4},{STR:3,DEX:4},{STR:3,DEX:2},{STR:4,DEX:1}]);
});

test('Phase 2 quality total boundaries and fractional raw damage round up', () => {
  for (const [die,stat,quality,raw] of [[1,0,'Glancing',2],[9,0,'Glancing',2],[10,0,'Normal',3],[19,0,'Normal',3],[20,0,'Critical',5],[17,3,'Critical',5]]) {
    const q = hitQuality('STR', stat, 3, dice((die - 1) / 20));
    assert.equal(q.total, die + stat); assert.equal(q.quality, quality); assert.equal(q.rawDamage, raw);
  }
});

test('Phase 2 connection can deal zero after Defense, retain Impact and cause contact wear', () => {
  const ctx = context(); combat(ctx).enemy.templateId = 'enemy_ruin_brute'; // DEF 2 preserves the zero-damage regression after Beetle tuning.
  combat(ctx).committed.stability = 99;
  attackWeapon(ctx, 0, dice(0));
  assert.equal(ctx.expedition.lastResult.quality.quality, 'Glancing');
  assert.equal(ctx.expedition.lastResult.damage, 0); assert.equal(ctx.expedition.lastResult.impact, 1);
  assert.equal(ctx.actor.data.inventory.equipped[0].durability, 11);
});

test('Phase 2 enemy Dodge precedes quality; melee avoids wear and Bow spends only an Arrow', () => {
  for (const slot of [0,1]) {
    const ctx=context(); combat(ctx).enemy.templateId='enemy_venom_spider';
    if(slot===1) combat(ctx).range='FAR';
    let draws=0; attackWeapon(ctx,slot,{next:()=>{draws++;return 0;}});
    assert.equal(draws,1); assert.equal(ctx.expedition.lastResult.quality,null);
    assert.equal(ctx.expedition.lastResult.impact,0);
    if(slot===0) assert.equal(ctx.actor.data.inventory.equipped[slot].durability,12);
    else {
      assert.equal(ctx.actor.data.inventory.equipped[slot].durability,undefined);
      assert.equal(resources(ctx).arrows,9);
    }
  }
});

test('Phase 2 failed Dodge uses all passive physical armor, no selected Block or Quick bonus', () => {
  const ctx=context(); combat(ctx).committed.damage=10;
  ctx.actor.data.attributes.traits=['trait_quick'];
  defend(ctx,'dodge',3,dice(.99,.4));
  const result=ctx.expedition.lastResult;
  assert.equal(result.dodge.chance,25); assert.equal(result.dodge.success,false);
  assert.equal(result.quality.quality,'Normal'); assert.equal(result.defense,3); assert.equal(result.damage,7);
  assert.equal(ctx.actor.data.inventory.equipped[3].durability,15);
});

test('Phase 2 successful Dodge avoids quality, damage, Impact, Poison and contact wear', () => {
  const ctx=context(); combat(ctx).committed.impact=99; combat(ctx).committed.onHit=[{tag:'effect_poison',value:1}];
  let draws=0; defend(ctx,'dodge',undefined,{next:()=>{draws++;return 0;}});
  assert.equal(draws,1); assert.equal(ctx.expedition.lastResult.quality,null);
  assert.equal(resources(ctx).hp,16); assert.equal(combat(ctx).playerKnockdown,false);
  assert.ok(!ctx.actor.data.statuses?.poison); assert.equal(ctx.actor.data.inventory.equipped[3].durability,15);
});

test('Phase 2 Block wear uses post-quality raw damage with Overmatched first', () => {
  for (const [base,roll,raw,loss] of [[3,.4,3,1],[4,.4,4,2],[15,.4,15,2],[11,.99,17,3],[6,0,3,1]]) {
    const ctx=context(); combat(ctx).committed.damage=base;
    combat(ctx).barrier=100; // Passive mitigation must not shield DUR.
    defend(ctx,'block',3,dice(roll));
    assert.equal(ctx.expedition.lastResult.dodge,null);
    assert.equal(ctx.expedition.lastResult.quality.rawDamage,raw);
    assert.equal(ctx.expedition.lastResult.damage,0);
    assert.equal(ctx.expedition.lastResult.wear.loss,loss);
  }
});

test('Phase 2 physical Block and Armor do not mitigate pure magic', () => {
  const ctx=context(); Object.assign(combat(ctx).committed,{damageType:'spell',damage:10}); combat(ctx).barrier=2;
  defend(ctx,'block',3,dice(.4));
  assert.equal(ctx.expedition.lastResult.defense,2); assert.equal(ctx.expedition.lastResult.damage,8);
  assert.equal(ctx.expedition.lastResult.wear,null);
});

test('Phase 2 Counterattack takes incoming damage first, retaliates once, and cannot Stagger/chain', () => {
  const ctx=context(); combat(ctx).enemy.hp=20; combat(ctx).committed.damage=10;
  defend(ctx,'counter',undefined,dice(.4));
  assert.equal(combat(ctx).phase,'counterattack'); assert.equal(combat(ctx).enemy.hp,20);
  attackWeapon(ctx,0,dice(.4));
  assert.equal(resources(ctx).hp,9); assert.equal(ctx.expedition.lastResult.defense,3);
  assert.equal(ctx.expedition.lastResult.dodge,null);
  assert.equal(combat(ctx).enemy.hp,17); assert.equal(combat(ctx).moveCancelled,false);
  assert.equal(combat(ctx).phase,'round-result'); assert.equal(ctx.expedition.lastResult.retaliation.interrupt,null);
  assert.equal(ctx.actor.data.inventory.equipped[0].durability,11);
  finishExpeditionAction(ctx,dice(0)); assert.equal(combat(ctx).round,2); assert.equal(combat(ctx).phase,'attack');
});

test('Phase 2 lethal Counterattack consumes no retaliation RNG, ammo, damage or wear', () => {
  const ctx=context(); resources(ctx).hp=1; combat(ctx).committed.damage=10;
  let draws=0; defend(ctx,'counter',0,{next:()=>{draws++;return .4;}});
  assert.equal(resources(ctx).hp,0); assert.equal(draws,1); assert.equal(combat(ctx).enemy.hp,6);
  assert.equal(ctx.expedition.lastResult.retaliation,undefined); assert.equal(ctx.actor.data.inventory.equipped[0].durability,12);
});

test('Phase 2 retaliation may Knockdown even when the incoming hit knocks the player down', () => {
  const ctx=context(); ctx.actor.data.inventory.equipped[2]=item(ctx.actor,'item_fang_hammer');
  combat(ctx).enemy.hp=20; combat(ctx).committed.impact=99;
  defend(ctx,'counter',undefined,dice(.4)); attackWeapon(ctx,2,dice(.4));
  assert.equal(combat(ctx).enemyKnockdown,true); assert.equal(combat(ctx).playerKnockdown,true);
  assert.equal(ctx.expedition.lastResult.retaliation.interrupt,'Knockdown'); assert.equal(combat(ctx).phase,'round-result');
});

test('Phase 2.1 legacy Pounce allows any offensive response without range movement', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).enemy.templateId='enemy_pit_hound';combat(ctx).enemy.hp=20;combat(ctx).range='FAR';combat(ctx).phase='incoming';
    combat(ctx).committed={...byId('moves','move_hound_pounce'),range:'FAR',movement:'NEAR',offensive:true,damageType:'physical'};
    resources(ctx).arrows=10;
  });
  g.perform('pit.defend',{mode:'counter'});
  assert.equal(expedition(g).combat.phase,'counterattack');
  for(const slot of [0,1,2])assert.ok(g.expeditionChoices().some(c=>c.type==='pit.attack'&&c.params.slot===slot));
  assert.ok(g.expeditionChoices().some(c=>c.type==='pit.unarmed'));
  g.perform('pit.unarmed');
  assert.equal(expedition(g).combat.range,'FAR');assert.match(expedition(g).lastResult.text,/Counterattack — Bare Hands/);
  assert.throws(()=>g.perform('pit.defend',{mode:'counter'}),/unavailable/);
});

test('Phase 2 Counterattack Poison applies on contact, ticks once after retaliation, and reload is inert', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).phase='incoming';combat(ctx).enemy.hp=30;
    combat(ctx).committed.onHit=[{tag:'effect_poison',value:1}];
  });
  g.perform('pit.defend',{mode:'counter'});
  assert.equal(expedition(g).combat.phase,'counterattack'); g.perform('pit.attack',{slot:0});
  assert.equal(player(g).data.attributes.resources.hp,15);assert.equal(player(g).data.statuses.poison,true);
  assert.equal((expedition(g).lastResult.text.match(/POISONED — 1 HP lost/g)??[]).length,1);
  const saved=g.save(),copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);
});

test('Phase 2 weapon break during Stagger still leaves Bare Hands as the one free attack', () => {
  const g=combatFixture(undefined,ctx=>{ctx.actor.data.inventory.equipped[0].durability=1;combat(ctx).enemy.hp=30;});
  g.perform('pit.attack',{slot:0});assert.equal(player(g).data.inventory.equipped[0],null);
  assert.equal(expedition(g).combat.phase,'advantage');assert.ok(g.expeditionChoices().some(c=>c.type==='pit.unarmed'));
  g.perform('pit.unarmed');assert.equal(expedition(g).combat.round,2);noPause(g);
});

test('Phase 2 Bow quality uses DEX while melee uses STR; quality never scales Impact', () => {
  for(const [slot,stat,quality] of [[0,'STR','Critical'],[1,'DEX','Glancing'],[2,'STR','Critical']]){
    const ctx=context();ctx.actor.data.attributes.baseStats.STR=20;ctx.actor.data.attributes.baseStats.DEX=2;
    combat(ctx).enemy.hp=30;combat(ctx).committed.stability=99;
    attackWeapon(ctx,slot,dice(0));
    assert.equal(ctx.expedition.lastResult.quality.stat,stat);assert.equal(ctx.expedition.lastResult.quality.quality,quality);
    assert.equal(ctx.expedition.lastResult.impact,byId('items',['item_sword','item_bow','item_hammer'][slot]).impact);
  }
});

test('Phase 2.1 legacy nonoffensive commitments consume no Dodge or quality RNG', () => {
  const ctx=context(); combat(ctx).committed={id:'move_close',label:'Close to NEAR',range:'FAR',movement:'NEAR',damage:0,impact:0,stability:1,onHit:[],offensive:false};
  defend(ctx,'none',undefined,{next:()=>{throw Error('Unexpected combat roll');}});
  assert.equal(ctx.expedition.lastResult.quality,null);assert.equal(ctx.expedition.lastResult.dodge,null);
});

test('Phase 2 Stagger grants one saved Advantage decision, no Poison until its attack completes', () => {
  const ctx=context(); combat(ctx).enemy.hp=30; ctx.actor.data.statuses={poison:true};
  attackWeapon(ctx,0,dice(.4)); finishExpeditionAction(ctx,dice(0));
  assert.equal(combat(ctx).phase,'advantage'); assert.equal(combat(ctx).round,1); assert.equal(resources(ctx).hp,16);
  attackWeapon(ctx,0,dice(.4)); assert.equal(combat(ctx).phase,'round-result');
  assert.equal(ctx.expedition.lastResult.interrupt,null);
  finishExpeditionAction(ctx,dice(0)); assert.equal(combat(ctx).round,2); assert.equal(resources(ctx).hp,15);
  finishExpeditionAction(ctx,dice(0)); assert.equal(resources(ctx).hp,15);
});

test('Phase 2.1 Advantage Knockdown persists without removing an offense or granting another attack', () => {
  const ctx=context(); combat(ctx).enemy.hp=30;
  ctx.actor.data.inventory.equipped[2]=item(ctx.actor,'item_fang_hammer');
  attackWeapon(ctx,0,dice(.4));attackWeapon(ctx,2,dice(.4));
  assert.equal(combat(ctx).phase,'round-result');assert.equal(combat(ctx).enemyKnockdown,true);
  finishExpeditionAction(ctx,dice(0));assert.equal(combat(ctx).round,2);assert.equal(combat(ctx).committed.offensive,true);
  attackUnarmed(ctx,dice(.4));assert.equal(ctx.expedition.lastResult.dodge.chance,0);assert.equal(combat(ctx).enemyKnockdown,false);
  assert.equal(combat(ctx).phase,'incoming');
});

test('Phase 2.1 Knockdown survives round preparation until an offensive action targets it', () => {
  const ctx=context();combat(ctx).enemyKnockdown=true;
  prepareRound(ctx,dice(0));assert.equal(combat(ctx).committed.offensive,true);assert.equal(combat(ctx).enemyKnockdown,true);
  attackUnarmed(ctx,dice(.4));assert.equal(combat(ctx).enemyKnockdown,false);assert.equal(ctx.expedition.lastResult.dodge.chance,0);
});

test('Phase 2 exact reload continuation through attack, incoming, Advantage and completed Counterattack', () => {
  for (const phase of ['attack','incoming','advantage']) for (const mode of ['block','dodge','counter']) {
    const g=combatFixture(undefined,ctx=>{
      combat(ctx).phase=phase; combat(ctx).enemy.hp=30;
      if(phase==='advantage'){combat(ctx).moveCancelled=true;combat(ctx).interrupt='Stagger';}
      ctx.actor.data.statuses={poison:true};
    });
    const saved=g.save(), restored=createSurfaceGame({saved}); assert.equal(restored.save(),saved);
    restored.resumeFlow(); assert.equal(restored.save(),saved);
    const action=phase==='incoming'?['pit.defend',mode==='block'?{mode,slot:0}:{mode}]:['pit.attack',{slot:0}];
    g.perform(...action); restored.perform(...action); assert.equal(restored.save(),g.save()); noPause(restored);
    const done=g.save(); const reloaded=createSurfaceGame({saved:done}); reloaded.resumeFlow(); assert.equal(reloaded.save(),done);
  }
});

test('Phase 2 legacy committed moves resume byte-exactly and use authored Speed instead of old DC', () => {
  for(const dc of [0,999]){
    const g=combatFixture(undefined,ctx=>{combat(ctx).phase='incoming';delete combat(ctx).committed.speed;delete combat(ctx).committed.qualityStat;combat(ctx).committed.dodgeDC=dc;});
    const saved=g.save(), restored=createSurfaceGame({saved}); assert.equal(restored.save(),saved);
    assert.equal(combatMove(expedition(restored).combat.committed).speed,0);
    g.perform('pit.defend',{mode:'block',slot:3}); restored.perform('pit.defend',{mode:'block',slot:3});
    assert.equal(restored.save(),g.save());
  }
});

test('Phase 2 legacy Force Scroll cancellation has one remaining attack, with no new reward on reload', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).phase='attack';combat(ctx).moveCancelled=true;combat(ctx).enemyKnockdown=true;
    combat(ctx).enemy.hp=30;ctx.actor.data.statuses={poison:true};
  });
  const saved=g.save(),copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);
  assert.ok(!copy.expeditionChoices().some(c=>['pit.move','pit.swap','pit.retreat'].includes(c.type)));
  g.perform('pit.attack',{slot:0});copy.perform('pit.attack',{slot:0});assert.equal(copy.save(),g.save());
  assert.equal(expedition(copy).combat.round,2);assert.equal(expedition(copy).combat.committed.offensive,true);assert.equal(expedition(copy).combat.enemyKnockdown,false);
  assert.equal(player(copy).data.attributes.resources.hp,15);
});

test('Phase 2.1 legacy recovery and pending Knockdown saves map to vulnerability exactly once', () => {
  for(const recovering of [false,true]){
    const g=combatFixture(undefined,ctx=>{
      combat(ctx).enemy.hp=30;combat(ctx).enemyKnockdown=!recovering;
      if(recovering)combat(ctx).committed={id:'move_recover',label:'Recover footing',range:'FAR',movement:'none',damage:0,impact:0,stability:0,onHit:[],offensive:false};
      ctx.actor.data.statuses={poison:true};
    });
    const saved=g.save(),copy=createSurfaceGame({saved});assert.equal(copy.save(),saved);
    g.perform('pit.unarmed');copy.perform('pit.unarmed');assert.equal(copy.save(),g.save());
    assert.equal(expedition(copy).combat.enemyKnockdown,false);
    assert.equal(expedition(copy).lastResult.dodge.chance,0);
    assert.equal(player(copy).data.attributes.resources.hp,recovering?15:16);noPause(copy);
  }
});

test('Phase 2 Counterattack victory grants rewards once and never replays incoming damage on reload', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).phase='incoming';combat(ctx).enemy.hp=1;combat(ctx).committed.damage=10;
    ctx.actor.data.attributes.baseStats.STR=30;
  });
  const xp=player(g).data.attributes.resources.xp;
  const saved=g.save(),copy=createSurfaceGame({saved});
  g.perform('pit.defend',{mode:'counter'});copy.perform('pit.defend',{mode:'counter'});
  assert.equal(copy.save(),g.save());
  g.perform('pit.attack',{slot:0});copy.perform('pit.attack',{slot:0});
  assert.equal(copy.save(),g.save());assert.equal(expedition(g).combat,null);
  assert.equal(player(g).data.attributes.resources.xp,xp+2);
  assert.ok(player(g).data.attributes.resources.hp<16);
  const completed=g.save(),reloaded=createSurfaceGame({saved:completed});reloaded.resumeFlow();assert.equal(reloaded.save(),completed);
  assert.throws(()=>reloaded.perform('pit.defend',{mode:'counter'}),/unavailable/);
});

test('Phase 2 UI exposes decisions, tile-scoped reactions, and Dev-only formulas and rolls', () => {
  const g=combatFixture();g.perform('pit.unarmed');
  const normal=expeditionView(world(g),player(g),g.expeditionChoices(),'spells');
  assert.match(normal,/Damage 2.*Impact 1.*Speed 0.*Your Dodge chance: 25%/);
  assert.match(normal,/reaction-tile/); assert.match(normal,/Block 1.*Speed 0.*Enemy Dodge 0%.*DUR 12\/12/);
  assert.match(normal,/>Block<\/button>/);assert.match(normal,/>Counterattack<\/button>/);
  assert.match(normal,/If you survive, choose one offensive response/);assert.doesNotMatch(normal,/Block with Sword|Counterattack with Sword/);
  assert.doesNotMatch(normal,/d20|check-math|Defender DEX|vs DC|Round outcome|Resolve cancelled/);
  const dev=expeditionView(world(g),player(g),g.expeditionChoices(),'weapons',0,true);
  assert.match(dev,/Defender DEX 2 - \(Attacker DEX 1 \+ Speed 0\)/);assert.match(dev,/d20.*STR/);
  const stagger=combatFixture(undefined,ctx=>{combat(ctx).phase='advantage';combat(ctx).moveCancelled=true;combat(ctx).interrupt='Stagger';});
  const html=expeditionView(world(stagger),player(stagger),stagger.expeditionChoices());
  assert.match(html,/STAGGERED — Slime Bash cancelled/);assert.match(html,/Press the Advantage: choose one immediate offensive action/);noPause(stagger);
});

test('Phase 2 content validates Speed, quality stats and nonoffensive metadata', () => {
  for(const mutate of [c=>c.moves[0].speed=.5,c=>c.moves[0].qualityStat='INT',c=>c.enemies[0].combatStats.DEX=-1,c=>{c.moves[0].damage=0;c.moves[0].impact=0;}]){
    const c=structuredClone(expeditionCatalog);mutate(c);assert.throws(()=>validateCatalog(c));
  }
});

test('Phase 2 Advantage spells retain current costs, auto-hit and cannot chain; offensive Scroll spends the one attack', () => {
  for(const scroll of [false,true]){
    const g=combatFixture(undefined,ctx=>{
      combat(ctx).phase='advantage';combat(ctx).moveCancelled=true;combat(ctx).enemy.hp=30;
      ctx.actor.data.attributes.baseStats.INT=30;resources(ctx).essence=10;ctx.actor.data.statuses={poison:true};
      if(scroll)ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_scroll_force');
      else ctx.actor.data.inventory.spells[0]='spell_force';
    });
    const saved=g.save(),copy=createSurfaceGame({saved});
    const type=scroll?'pit.scroll':'pit.cast';g.perform(type,{slot:0});copy.perform(type,{slot:0});
    assert.equal(copy.save(),g.save());assert.equal(expedition(g).combat.round,2);
    assert.equal(expedition(g).combat.committed.offensive,true);assert.equal(expedition(g).combat.enemyKnockdown,true);
    if(scroll){
      assert.equal(expedition(g).lastResult.check,null); // First cast is within WIS capacity.
      assert.equal(expedition(g).combat.spellStrain,undefined);
      assert.equal(player(g).data.inventory.equipped[0],null);
    }else {assert.equal(expedition(g).lastResult.check,null);assert.equal(expedition(g).lastResult.overcast,null);}
    assert.equal(player(g).data.attributes.resources.essence,scroll?10:9);assert.equal(expedition(g).strain,scroll?0:1);
    assert.equal(player(g).data.attributes.resources.hp,15);noPause(g);
  }
});

test('Phase 2.1 supportive actions cannot spend or extend Advantage', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).phase='advantage';combat(ctx).moveCancelled=true;combat(ctx).enemy.hp=30;
    resources(ctx).hp=8;resources(ctx).essence=20;ctx.actor.data.statuses={poison:true};ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_antidote');
    ctx.actor.data.inventory.spells=['spell_heal','spell_barrier','spell_teleport','spell_unlock'];
    ctx.actor.data.inventory.equipped[3]=item(ctx.actor,'item_scroll_heal');
  });
  const saved=g.save();
  assert.ok(!g.expeditionChoices().some(c=>['pit.use','pit.cast','pit.scroll','pit.swap','pit.move'].includes(c.type)));
  assert.throws(()=>g.perform('pit.use',{slot:0}),/unavailable/);assert.equal(g.save(),saved);
  g.perform('pit.unarmed');assert.equal(expedition(g).combat.round,2);assert.equal(player(g).data.attributes.resources.hp,7);
});

test('Phase 2.1 Force with last Essence always leaves Bare Hands Advantage, even in a legacy FAR save', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).range='FAR';combat(ctx).enemy.hp=30;
    ctx.actor.data.inventory.equipped.fill(null);ctx.actor.data.inventory.spells=['spell_force',null,null,null];
    ctx.actor.data.attributes.baseStats.INT=30;resources(ctx).essence=3;ctx.actor.data.statuses={poison:true};
  });
  const saved=g.save(),copy=createSurfaceGame({saved});g.perform('pit.cast',{slot:0});copy.perform('pit.cast',{slot:0});
  assert.equal(copy.save(),g.save());assert.equal(expedition(g).combat.phase,'advantage');
  assert.equal(player(g).data.attributes.resources.hp,16);assert.equal(expedition(g).combat.range,'FAR');
  g.perform('pit.unarmed');copy.perform('pit.unarmed');assert.equal(copy.save(),g.save());
  assert.equal(expedition(g).combat.round,2);assert.equal(player(g).data.attributes.resources.hp,15);noPause(g);
});

test('Phase 2.1 legacy FAR cancelled-scroll save retains one Bare Hands action without an automatic Poison tick', () => {
  const g=combatFixture(undefined,ctx=>{
    combat(ctx).phase='attack';combat(ctx).moveCancelled=true;combat(ctx).range='FAR';combat(ctx).enemy.hp=30;
    ctx.actor.data.inventory.equipped.fill(null);ctx.actor.data.inventory.spells.fill(null);ctx.actor.data.statuses={poison:true};
  });
  const saved=g.save(),copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);
  copy.perform('pit.unarmed');assert.equal(expedition(copy).combat.round,2);assert.equal(player(copy).data.attributes.resources.hp,15);noPause(copy);
  const done=copy.save();copy.resumeFlow();assert.equal(copy.save(),done);
});
