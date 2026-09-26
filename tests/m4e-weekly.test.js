import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFixture,configure,service } from './helpers/m3-fixture.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { livingSituationDefinitions } from '../HearthVale_Content/living-situations.js';
import { makeMaterialRequest } from '../HearthVale_Shell/src/living-situations.js';
import { weeklyConsequences,weeklyDue } from '../HearthVale_Shell/src/weekly.js';
import { knownHistory } from '../HearthVale_Shell/src/history-records.js';
import { heldInformation } from '../HearthVale_Shell/src/information.js';
import { recordCards,weeklySnapshots } from '../HearthVale_UI/service-views.js';
const worldOf=g=>g.snapshot().world;
const player=w=>w.entities[w.globals.hearthvaleSurface.playerId];
const weekly=g=>worldOf(g).globals.hearthvaleWeekly;
const sleep=g=>g.perform('surface.sleep',{confirmed:true,day:worldOf(g).globals.hearthvaleSurface.calendar.day});
function fixture(day=1){return surfaceFixture((w,a)=>{a.primaryLocation='loc_inn';
  w.globals.hearthvaleSurface.calendar.day=day;
  w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.townSupplies={item_iron_ore:2};
});}
function apply(game,fn){const base=createSurfaceShell(),r=createRuntime({saved:game.save(),shell:{...base,
  actions:{...base.actions,'fixture.weekly':{resolve:({world})=>({effects:fn(world)})}}}});
  r.startScene();r.submit({actor:player(worldOf(game)).id,type:'fixture.weekly'});r.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:r.save()});}
const learn=(actor,subject,key,value)=>({type:'learn',actor,claim:{subject,key,value,certainty:'certain'}});

test('M4E fifth completed Days trigger exactly once; sparse weeks have no filler',()=>{
  const g=fixture();for(let i=1;i<5;i++){sleep(g);assert.equal(weekly(g),undefined);}
  sleep(g);assert.equal(weekly(g).lastCompletedDay,5);assert.equal(weekly(g).snapshots.length,1);
  assert.deepEqual(weekly(g).snapshots[0].facts,[]);assert.equal(weeklyDue(worldOf(g)),false);
  assert.match(weeklySnapshots(worldOf(g),player(worldOf(g))),/No new meaningful changes/);
  g.perform('Move',{location:'loc_guild'});g.perform('Move',{location:'loc_inn'});
  assert.equal(weekly(g).snapshots.length,1);
  for(let i=6;i<=10;i++)sleep(g);
  assert.deepEqual(weekly(g).snapshots.map(s=>s.completedDay),[5,10]);
});

test('M4E existing economy targets, protected floors and 15-Day used retention remain authoritative',()=>{
  const g=configure(fixture(15),w=>{const s=w.globals.hearthvaleServices;
    s.stock.item_hp_potion_basic=2;s.stock.item_arrows=10;
    const extra=expeditionCatalog.vendors[0].stock.find(s=>!['item_hp_potion_basic','item_arrows'].includes(s.item));
    s.stock[extra.item]=extra.target+4;
    s.used=[1,2,15].map(day=>({id:`used_${day}`,templateId:'item_sword',durability:1,soldDay:day}));
  });
  sleep(g);const w=worldOf(g),s=w.globals.hearthvaleServices;
  for(const line of expeditionCatalog.vendors[0].stock)assert.ok(s.stock[line.item]>=Math.max(line.target,line.floor));
  const extra=expeditionCatalog.vendors[0].stock.find(s=>!['item_hp_potion_basic','item_arrows'].includes(s.item));
  assert.equal(s.stock[extra.item],extra.target+4);
  assert.deepEqual(s.used.map(i=>i.id),['used_2','used_15']);
  assert.deepEqual(s.weeklyReconciliation.expired,['used_1']);
  assert.equal(s.weeklyReconciliation.completedDay,15);
  assert.ok(heldInformation(w,'loc_shop').some(c=>c.claim.value.topic==='weekly-stock'));
  assert.ok(weekly(g).records.shop.length>0);
  assert.ok(!heldInformation(w,player(w).id).some(c=>c.claim.value?.topic==='weekly-stock'));
  assert.deepEqual(weekly(g).records.guild,[]);assert.deepEqual(weekly(g).records.town,[]);
});

test('M4E weekly pass adds no Actor turn, reward or RNG draw beyond normal Day processing',()=>{
  const g=configure(fixture(5),w=>{const a=w.entities.hv_actor_2;a.primaryLocation='loc_shop';
    a.data.holdings={materials:{item_moonleaf:3},valuables:{}};});
  const base=createSurfaceShell();
  const run=enabled=>{const r=createRuntime({saved:g.save(),shell:enabled?base:{...base,consequences:()=>[]}});
    r.startScene();r.submit({actor:player(worldOf(g)).id,type:'surface.sleep',params:{confirmed:true,day:5}});
    r.resolveScene({offscreenBudget:0});return r.snapshot();};
  const normal=run(false),withWeekly=run(true);
  for(const a of Object.values(normal.world.entities).filter(e=>e.actor)){
    assert.deepEqual(withWeekly.world.entities[a.id].data,a.data);
    const before=worldOf(g).entities[a.id].data.memories?.length??0;
    assert.ok((a.data.memories?.length??0)-before<=1);
  }
  assert.equal(typeof withWeekly.random,'number');assert.deepEqual(withWeekly.random,normal.random);
  assert.ok(withWeekly.world.globals.hearthvaleWeekly);
  const w=structuredClone(withWeekly.world);delete w.globals.hearthvaleWeekly;
  const before=structuredClone(w),effects=weeklyConsequences({event:{event:{type:'hearthvale.weekly-reconcile'}},world:w});
  assert.deepEqual(w,before);assert.equal(effects.length,1);assert.equal(effects[0].type,'global');
  assert.equal(effects[0].key,'hearthvaleWeekly');
});

test('M4E real known facts rank deterministically; unknown objective truth and Rumors are excluded',()=>{
  let g=fixture(5);g=apply(g,w=>[
    ...['social','stock','autonomous-accomplishment','major-progression','serious-injury'].map((kind,i)=>
      learn(player(w).id,'hv_pit_1',`fact-${i}`,{topic:`fact-${i}`,kind,domain:kind==='stock'?'stock':'social',observedDay:5,text:`Actual fact ${i}`})),
    learn(player(w).id,'hv_pit_1','named-location',{tag:'info_discovery',day:5,title:'Sunken Square',finder:'Rook',actor:'hv_actor_2'}),
  ]);
  sleep(g);const w=worldOf(g),facts=weekly(g).snapshots[0].facts;
  assert.equal(facts.length,5);assert.deepEqual(facts.map(f=>f.priority),[1,2,3,5,6]);
  const discovery=facts.find(f=>f.priority===3);assert.equal(discovery.actor,'hv_actor_2');assert.match(discovery.text,/Rook/);
  for(const f of facts)assert.ok(w.entities[f.source.claim]?.claim);
  assert.deepEqual(weekly(g).records.guild,[]);assert.deepEqual(weekly(g).records.town,[]);
  assert.equal(weekly(g).records.discoveries[player(w).id].length,1);
});

test('M4E completed request preserves resolver and provenance; only informed holders index its outcome',()=>{
  let g=configure(fixture(5),w=>{w.globals.hearthvaleServices.townSupplies={};
    player(w).primaryLocation='loc_town_hall';player(w).data.holdings={materials:{item_iron_ore:2}};});
  g=apply(g,()=>[{type:'create',entity:makeMaterialRequest(livingSituationDefinitions.find(d=>d.id==='situation_town_supply'),'weekly_request',5)}]);
  service(g,'fulfill-request',p=>p.situation==='weekly_request');
  g.perform('Move',{location:'loc_inn'});sleep(g);
  const w=worldOf(g),request=w.entities.weekly_request,id=player(w).id;
  assert.equal(request.lifecycle,'resolved');assert.equal(request.data.resolver,id);
  assert.equal(weekly(g).snapshots[0].facts.find(f=>f.id==='situation:weekly_request').actor,id);
  assert.ok(weekly(g).records.town.some(r=>r.id==='situation:weekly_request'));
  assert.ok(!weekly(g).records.guild.some(r=>r.id==='situation:weekly_request'));
  assert.ok(weekly(g).records.closedSituations[id].includes('weekly_request'));
  assert.match(recordCards(w,player(w)),/Closed opportunities/);
  assert.ok(request.data.record);assert.ok(!g.serviceChoices().some(c=>c.params.situation==='weekly_request'&&c.params.op==='fulfill-request'));
});

test('M4E expiry at boundary is indexed locally without informing remote player',()=>{
  let g=fixture(5);g=apply(g,()=>{const d=structuredClone(livingSituationDefinitions.find(d=>d.id==='situation_town_supply'));
    d.duration={kind:'Immediate',days:1};delete d.withdrawn;
    return [{type:'create',entity:makeMaterialRequest(d,'weekly_expiry',5)}];});
  sleep(g);const w=worldOf(g);
  assert.equal(w.entities.weekly_expiry.lifecycle,'expired');
  assert.ok(weekly(g).records.closedSituations.loc_town_hall.includes('weekly_expiry'));
  assert.ok(!weekly(g).snapshots[0].facts.some(f=>f.id==='situation:weekly_expiry'));
  g.perform('Move',{location:'loc_town_hall'});
  assert.ok(knownHistory(worldOf(g),player(w).id).some(f=>f.id==='situation:weekly_expiry'));
});

test('M4E save reload before and after weekly boundary preserves exact deterministic continuation',()=>{
  const a=fixture(5),b=createSurfaceGame({saved:a.save()});sleep(a);sleep(b);assert.equal(a.save(),b.save());
  const c=createSurfaceGame({saved:a.save()});assert.equal(a.save(),c.save());
  for(let i=0;i<5;i++){sleep(a);sleep(c);assert.equal(a.save(),c.save());}
  assert.equal(weekly(a).snapshots.length,2);
});

test('M4E engine-only facts, uncertain claims and unrelated holder history never leak into snapshot',()=>{
  const g=fixture(5),w=structuredClone(worldOf(g)),id=player(w).id;
  w.entities.hv_pit_1.data.guardianDefeated={actor:'hv_actor_2',day:5,year:1};
  w.entities.hv_actor_2.data.memories=[{day:5,event:'Rook private discovery',kind:'turn-in'}];
  w.entities.uncertain={id:'uncertain',lifecycle:'active',claim:{actor:id,subject:'hv_pit_1',key:'missing',certainty:'uncertain',value:{kind:'missing',day:5,text:'Unverified disappearance'}}};
  assert.deepEqual(knownHistory(w,id),[]);
  assert.ok(knownHistory(w,'hv_actor_2').some(f=>f.priority===2));
  assert.deepEqual(knownHistory(w,'loc_guild'),[]);
});

