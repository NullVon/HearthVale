import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFixture,configure,service } from './helpers/m3-fixture.js';
import { entered,setup,item } from './helpers/m2-fixture.js';
import { apply,worldOf,player,sleep } from './helpers/m4-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { autonomousChoices,dayAutonomyEffects } from '../HearthVale_Shell/src/day-autonomy.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { knowledgeState } from '../HearthVale_Shell/src/information.js';
import { knownHistory } from '../HearthVale_Shell/src/history-records.js';
import { routeFloor } from '../HearthVale_Shell/src/expedition-discovery.js';
import { playerGuardianVictory } from '../HearthVale_Shell/src/guardian.js';
import { validateExpeditionState } from '../HearthVale_Shell/src/expedition-lifecycle.js';
const pit=g=>worldOf(g).entities.hv_pit_1.data;
const rook=w=>w.entities.hv_actor_2;
const choices=(w,a=rook(w))=>autonomousChoices(w,a,economyState(w));
const square='discovery-loc_sunken_square';
function fixture(){return surfaceFixture((w,a)=>{
  a.primaryLocation='loc_inn';w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.townSupplies={item_iron_ore:2};
  w.entities.hv_pit_1.data.lastExpedition={id:'prior_return',reason:'return',deepestFloor:6,day:1};
  w.entities.hv_pit_1.data.sunkenSquare={floor:5,pending:true,remaining:2};
});}
function daily(g,sample=0){return apply(g,w=>{const state=economyState(w);
  return [...dayAutonomyEffects(w,state,{next:()=>sample}),{type:'global',key:'hearthvaleServices',value:state}];});}
function use(g,type,predicate=()=>true){const c=g.expeditionChoices().find(c=>c.type===type&&predicate(c));assert.ok(c,`Missing ${type}`);g.perform(c.type,c.params);}
function playerClear(){let g=setup(entered(),(ctx,rng)=>{
  ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;
  ctx.actor.data.attributes.baseStats.STR=30;ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_fang_hammer');
  ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;
});use(g,'pit.guardian');g=setup(g,ctx=>{ctx.expedition.combat.enemy.hp=1;});
  use(g,'pit.attack',c=>c.params.slot===0);
  // Historical post-clear subsystem coverage; this continuation is not V1 play.
  g=configure(g,w=>{w.globals.hearthvaleCompletion=null;});
  use(g,'pit.cast');g.perform('Move',{location:'loc_inn'});return g;}

test('M4F compressed discovery uses actual finder/date, assigned floor, finite pool and scoped Guild report',()=>{
  let g=fixture();assert.ok(choices(worldOf(g)).some(c=>c.op==='discover-square'));
  g=daily(g);const w=worldOf(g);
  assert.equal(pit(g).sunkenSquare.known.actor,'hv_actor_2');assert.equal(pit(g).sunkenSquare.known.day,1);
  assert.equal(pit(g).sunkenSquare.floor,5);assert.equal(pit(g).sunkenSquare.remaining,1);
  assert.equal(w.entities.loc_sunken_square.data.finder,'hv_actor_2');
  assert.equal(rook(w).data.holdings.valuables.item_town_medal,1);
  assert.equal(rook(w).data.memories.filter(m=>m.id===square).length,1);
  assert.equal(knowledgeState(w,'loc_guild','hv_pit_1',square),'Known');
  for(const holder of [player(w).id,'loc_shop','loc_town_hall','loc_inn'])assert.equal(knowledgeState(w,holder,'hv_pit_1',square),'Unknown');
  const first=structuredClone(pit(g).sunkenSquare.known);g=daily(g);assert.deepEqual(pit(g).sunkenSquare.known,first);
  assert.equal(pit(g).sunkenSquare.remaining,1);assert.equal(knownHistory(worldOf(g),'loc_guild').filter(f=>f.id===square).length,1);
});

test('M4F discovery gate rejects player, services, incapable/dead/on-screen actors, wrong Goal and implausible depth',()=>{
  const initial=worldOf(fixture());assert.deepEqual(choices(initial,player(initial)),[]);
  for(const mutate of [
    (w,a)=>{a.data.attributes.resources.hp=0;},(w,a)=>{a.data.attributes.resources.hearts=0;},
    (w,a)=>{a.actor.controller='Human';},(w,a)=>{a.lifecycle='retired';},
    (w,a)=>{a.data.templateId='actor_tavi';},(w,a)=>{a.data.mainGoal='Keep the Inn going';},
    (w,a)=>{a.primaryLocation='loc_inn';},(w,a)=>{a.data.inventory.equipped=[];},
    w=>{w.entities.hv_pit_1.data.lastExpedition.deepestFloor=3;},
  ]){const w=structuredClone(initial);mutate(w,rook(w));assert.ok(!choices(w).some(c=>c.op==='discover-square'));}
  const g=daily(fixture(),0.99);assert.equal(pit(g).sunkenSquare.known,undefined);
  assert.equal(rook(worldOf(g)).data.memories,undefined);assert.equal(pit(g).sunkenSquare.remaining,2);
});

test('M4F learned shortcut and later player visit preserve autonomous first credit and exhaust only remaining content',()=>{
  let g=daily(fixture()),w=worldOf(g);const original=structuredClone(pit(g).sunkenSquare.known);
  g.perform('Move',{location:'loc_pit_entrance'});assert.ok(!g.expeditionChoices().some(c=>c.params.shortcut));
  g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>p.actor==='hv_actor_5');
  assert.equal(knowledgeState(worldOf(g),player(w).id,'hv_pit_1',square),'Known');
  g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter',c=>c.params.shortcut);
  assert.equal(pit(g).expedition.floor.number,5);use(g,'pit.forward');use(g,'pit.resolve-room');
  assert.deepEqual(pit(g).sunkenSquare.known,original);assert.equal(pit(g).sunkenSquare.remaining,0);
  assert.match(pit(g).expedition.lastResult.text,/found by Rook/);
  assert.ok(!player(worldOf(g)).data.memories?.some(m=>m.id===square));
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});

test('M4F two eligible explorers cannot both get first-discovery credit in one Day',()=>{
  let g=configure(fixture(),w=>{const a=w.entities[w.globals.hearthvaleSurface.couldHaveId];a.primaryLocation='loc_guild';});
  g=daily(g);const w=worldOf(g);
  assert.equal(Object.values(w.entities).filter(e=>e.actor).flatMap(e=>e.data.memories??[]).filter(m=>m.id===square).length,1);
  assert.equal(pit(g).sunkenSquare.remaining,1);
});

test('M4F undiscovered unassigned Square can be established from a real returned depth without changing natural routing odds',()=>{
  let g=configure(fixture(),w=>{w.entities.hv_pit_1.data.sunkenSquare=null;});g=daily(g);
  assert.equal(pit(g).sunkenSquare.floor,6);assert.equal(pit(g).sunkenSquare.known.actor,'hv_actor_2');
});

test('M4F discovery same seed/state and repeated reload continue identically through weekly boundary',()=>{
  const a=fixture();let b=createSurfaceGame({saved:a.save()});
  for(let day=1;day<=10;day++){const before=worldOf(a);sleep(a);sleep(b);assert.equal(a.save(),b.save());b=createSurfaceGame({saved:b.save()});
    for(const actor of Object.values(worldOf(a).entities).filter(e=>e.actor))
      assert.ok((actor.data.memories?.length??0)-(before.entities[actor.id].data.memories?.length??0)<=1);
  }
  assert.ok(pit(a).sunkenSquare.known);assert.equal(worldOf(a).globals.hearthvaleWeekly.snapshots.length,2);
});

test('M4F autonomous Guardian first clear is impossible and cannot unlock progression',()=>{
  const g=fixture(),w=worldOf(g);assert.ok(!choices(w).some(c=>c.op==='guardian-repeat'));
  const ctx={world:w,actor:rook(w),pit:structuredClone(pit(g)),day:1,year:1};
  assert.throws(()=>playerGuardianVictory(ctx),/requires the player/);
  const after=daily(g);assert.equal(pit(after).guardianFirstClear,undefined);assert.equal(pit(after).strata[1].locked,true);
});

test('M4F real player first clear unlocks progression only once, then weekly respawn permits a separate autonomous report',()=>{
  let g=playerClear();const first=structuredClone(pit(g).guardianFirstClear);
  assert.equal(first.actor,player(worldOf(g)).id);assert.equal(pit(g).strata[0].cleared,true);
  assert.equal(pit(g).strata[0].waystoneUnlocked,true);assert.equal(pit(g).strata[1].locked,false);assert.equal(pit(g).strata[1].playable,false);
  assert.ok(!choices(worldOf(g)).some(c=>c.op==='guardian-repeat'));
  for(let day=1;day<=5;day++)sleep(g);
  assert.equal(pit(g).strata[0].guardian.alive,true);assert.equal(pit(g).strata[0].guardian.respawnWeek,2);
  assert.ok(choices(worldOf(g)).some(c=>c.op==='guardian-repeat'));
  // No competing discovery for the report acceptance path.
  g=configure(g,w=>{w.entities.hv_pit_1.data.deepestReachedFloor=0;w.entities.hv_pit_1.data.lastExpedition.deepestFloor=1;});
  const strata=structuredClone(pit(g).strata);g=daily(g);const record=pit(g).guardianVictories[0];
  assert.equal(record.actor,'hv_actor_2');assert.equal(record.day,6);assert.deepEqual(pit(g).strata,strata);
  assert.deepEqual(pit(g).guardianFirstClear,first);assert.deepEqual(pit(g).guardianDefeated,first);
  assert.equal(knownHistory(worldOf(g),'loc_guild').filter(f=>f.id===record.id).length,1);
  assert.equal(knowledgeState(worldOf(g),'loc_town_hall','hv_pit_1',record.id),'Unknown');
  g=daily(g);assert.equal(pit(g).guardianVictories.length,1,'at most one compressed victory per respawn week');
  g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter');
  g=setup(g,(ctx,rng)=>{ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.roomIndex=0;ctx.expedition.deepestFloor=10;});
  use(g,'pit.guardian');assert.equal(pit(g).expedition.combat.enemy.templateId,'enemy_ruin_brute');
  g=setup(g,ctx=>{ctx.expedition.combat.enemy.hp=1;});use(g,'pit.attack',c=>c.params.slot===0);
  assert.deepEqual(pit(g).guardianFirstClear,first);assert.deepEqual(pit(g).guardianDefeated,first);
  assert.equal(pit(g).strata[0].guardian.alive,false);
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});

test('M4F legacy two-discovery-tail Square placement remains a valid saved Floor',()=>{
  const g=setup(entered(),(ctx,rng)=>{ctx.pit.sunkenSquare={floor:5,pending:true,remaining:2};
    ctx.expedition.floor=routeFloor(ctx,5,1,['discovery','discovery'],rng);ctx.expedition.roomIndex=0;ctx.expedition.deepestFloor=5;
  });
  assert.equal(pit(g).expedition.floor.rooms[1].encounter,'loc_sunken_square');
  assert.equal(pit(g).expedition.floor.rooms[1].resolved,false);
  assert.doesNotThrow(()=>validateExpeditionState(worldOf(g)));
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});

test('M4F weekly Guardian cycle and post-clear continuation preserve exact saves and do not overwrite first credit',()=>{
  const a=playerClear();let b=createSurfaceGame({saved:a.save()});const first=structuredClone(pit(a).guardianFirstClear);
  for(let day=1;day<=15;day++){sleep(a);sleep(b);assert.equal(a.save(),b.save());b=createSurfaceGame({saved:b.save()});}
  assert.deepEqual(pit(a).guardianFirstClear,first);assert.equal(pit(a).strata[0].guardian.respawnWeek,4);
  assert.ok(pit(a).guardianVictories?.length>0);
  assert.equal(new Set(pit(a).guardianVictories.map(r=>r.week)).size,pit(a).guardianVictories.length);
});
