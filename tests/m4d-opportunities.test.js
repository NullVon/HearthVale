import test from 'node:test';
import assert from 'node:assert/strict';
import { livingSituationDefinitions } from '../HearthVale_Content/living-situations.js';
import { livingSituations,makeMaterialRequest,requestChoices,situationDayEvents } from '../HearthVale_Shell/src/living-situations.js';
import { autonomousChoices,dayAutonomyEffects } from '../HearthVale_Shell/src/day-autonomy.js';
import { heldInformation,knowledgeState } from '../HearthVale_Shell/src/information.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { startCombat } from '../HearthVale_Shell/src/expedition-combat.js';
import { serviceView } from '../HearthVale_UI/service-views.js';
import { surfaceFixture,configure,service } from './helpers/m3-fixture.js';
const worldOf=g=>g.snapshot().world;
const player=w=>w.entities[w.globals.hearthvaleSurface.playerId];
const guild=livingSituationDefinitions.find(d=>d.kind==='hound-verification');
const town=livingSituationDefinitions.find(d=>d.id==='situation_town_supply');
function evidence(w,actor,id){startCombat({actor,pit:w.entities.hv_pit_1.data,day:1,year:1,
  expedition:{id,nextEnemyInstance:1,floor:{number:2}}},'enemy_pit_hound','room',{next:()=>0});}
function apply(game,fn){
  const base=createSurfaceShell(),runtime=createRuntime({saved:game.save(),shell:{...base,actions:{...base.actions,
    'fixture.m4d':{resolve:({world},{rng})=>({effects:fn(world,rng)})},
  }}});
  runtime.startScene();runtime.submit({actor:player(worldOf(game)).id,type:'fixture.m4d'});runtime.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:runtime.save()});
}
function fixture(){
  let game=surfaceFixture((w,a)=>{a.primaryLocation='loc_inn';a.data.holdings={materials:{item_iron_ore:2}};
    w.globals.hearthvaleServices=economyState(w);w.entities.hv_actor_2.primaryLocation='loc_guild';evidence(w,w.entities.hv_actor_2,'rook_prior');});
  return apply(game,w=>[guild,town].map((d,i)=>({type:'create',entity:makeMaterialRequest(d,`shared_${i}`,1)})));
}
function autonomy(game,sample=0){return apply(game,w=>{const state=economyState(w);
  return [...dayAutonomyEffects(w,state,{next:()=>sample}),{type:'global',key:'hearthvaleServices',value:state}];});}
const notice=(w,holder,id)=>heldInformation(w,holder).find(e=>e.claim.subject===id&&e.claim.value?.topic==='public-request')?.claim.value;

test('M4D player tracking is only a bookmark; Rook can resolve first and late arrival learns exact credit',()=>{
  let game=fixture();game.perform('Move',{location:'loc_guild'});
  const before=structuredClone(worldOf(game).entities.shared_0);
  service(game,'track-opportunity',p=>p.situation==='shared_0');
  assert.deepEqual(worldOf(game).entities.shared_0,before);
  assert.deepEqual(player(worldOf(game)).data.trackedOpportunities,['shared_0']);
  game.perform('Move',{location:'loc_inn'});
  const oldGold=worldOf(game).entities.hv_actor_2.data.attributes.resources.gold;
  game=autonomy(game);let w=worldOf(game);
  assert.equal(w.entities.shared_0.lifecycle,'resolved');assert.equal(w.entities.shared_0.data.resolver,'hv_actor_2');
  assert.equal(w.entities.hv_actor_2.data.attributes.resources.gold,oldGold+10);
  assert.equal(w.entities.hv_actor_2.data.memories.at(-1).situation,'shared_0');
  assert.equal(player(w).data.memories,undefined);
  assert.equal(notice(w,player(w).id,'shared_0').status,'active','remote bookmark must stay stale');
  assert.equal(notice(w,'loc_guild','shared_0').resolver,'hv_actor_2');
  assert.equal(knowledgeState(w,'loc_guild','hv_pit_1','pit-hound-report'),'Known');
  assert.equal(notice(w,'loc_town_hall','shared_0'),undefined);assert.equal(notice(w,'loc_shop','shared_0'),undefined);
  game.perform('Move',{location:'loc_guild'});w=worldOf(game);
  assert.equal(notice(w,player(w).id,'shared_0').resolver,'hv_actor_2');
  assert.match(serviceView(w,player(w),game.serviceChoices()),/Completed by Rook/);
  assert.ok(game.serviceChoices().some(c=>c.params.op==='untrack-opportunity'));
  const save=game.save();assert.throws(()=>game.perform('service.act',{op:'fulfill-request',situation:'shared_0'}),/unavailable/);assert.equal(game.save(),save);
});

test('M4D Guild needs own objective evidence: rumor, borrowed Known, wrong location and zero HP cannot resolve',()=>{
  const w=structuredClone(worldOf(fixture())),rook=w.entities.hv_actor_2;
  assert.ok(requestChoices(w,rook).some(c=>c.params.situation==='shared_0'));
  for(const mutate of [a=>{a.primaryLocation='loc_inn';},a=>{a.data.attributes.resources.hp=0;}]){
    const next=structuredClone(w);mutate(next.entities.hv_actor_2);assert.deepEqual(requestChoices(next,next.entities.hv_actor_2),[]);
  }
  const other=w.entities[w.globals.hearthvaleSurface.couldHaveId];other.primaryLocation='loc_guild';
  assert.deepEqual(requestChoices(w,other),[]);
  const source=heldInformation(w,rook.id).find(e=>e.claim.key==='pit-hound-report');
  w.entities.borrowed={...structuredClone(source),id:'borrowed',claim:{...structuredClone(source.claim),actor:other.id}};
  assert.deepEqual(requestChoices(w,other),[]);
  delete w.entities.hv_pit_1.data.houndEvidence[source.claim.value.evidenceId];assert.deepEqual(requestChoices(w,rook),[]);
});

test('M4D no favoritism: Rook can do nothing; another eligible Actor can take the same posting',()=>{
  let game=fixture();assert.equal(worldOf(autonomy(game,0.99)).entities.shared_0.lifecycle,'active');
  game=configure(game,w=>{
    w.entities.hv_actor_2.primaryLocation='loc_inn';
    const other=w.entities[w.globals.hearthvaleSurface.couldHaveId];other.primaryLocation='loc_guild';evidence(w,other,'other_prior');
  });
  const id=worldOf(game).globals.hearthvaleSurface.couldHaveId;
  game=autonomy(game);assert.equal(worldOf(game).entities.shared_0.data.resolver,id);
  assert.equal(worldOf(game).entities.hv_actor_2.data.memories,undefined);
});

test('M4D Town supply player path delivers real iron, rewards once and updates only relevant holders',()=>{
  let game=fixture();game.perform('Move',{location:'loc_town_hall'});
  service(game,'track-opportunity',p=>p.situation==='shared_1');
  const gold=player(worldOf(game)).data.attributes.resources.gold;
  service(game,'fulfill-request',p=>p.situation==='shared_1');const w=worldOf(game),a=player(w);
  assert.equal(a.data.holdings.materials.item_iron_ore,0);
  assert.equal(w.globals.hearthvaleServices.townSupplies.item_iron_ore,2);
  assert.equal(a.data.attributes.resources.gold,gold+14);
  assert.equal(w.entities.shared_1.data.resolver,a.id);
  assert.equal(notice(w,'loc_town_hall','shared_1').resolver,a.id);
  assert.equal(notice(w,'loc_guild','shared_1'),undefined);
  assert.equal(notice(w,'loc_shop','shared_1'),undefined);
  assert.match(serviceView(w,a,game.serviceChoices()),new RegExp(`Completed by ${a.data.identity.name}`));
  assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});

test('M4D Town autonomous path uses identical delivery consequences and refuses missing materials',()=>{
  let game=configure(fixture(),w=>{w.entities.hv_actor_2.primaryLocation='loc_town_hall';});
  assert.deepEqual(autonomousChoices(worldOf(game),worldOf(game).entities.hv_actor_2,economyState(worldOf(game))),[]);
  game=configure(game,w=>{w.entities.hv_actor_2.data.holdings={materials:{item_iron_ore:2}};});
  game=autonomy(game);const w=worldOf(game);
  assert.equal(w.entities.shared_1.data.resolver,'hv_actor_2');assert.equal(w.entities.shared_0.lifecycle,'active');
  assert.equal(w.entities.hv_actor_2.data.holdings.materials.item_iron_ore,0);
  assert.equal(w.globals.hearthvaleServices.townSupplies.item_iron_ore,2);
  assert.equal(w.entities.hv_actor_2.data.memories.length,1);
});

test('M4D player Guild path uses the same verifier and cannot borrow Rook credit',()=>{
  let game=configure(fixture(),w=>{player(w).primaryLocation='loc_guild';evidence(w,player(w),'player_prior');});
  service(game,'fulfill-request',p=>p.situation==='shared_0');const w=worldOf(game),id=player(w).id;
  assert.equal(w.entities.shared_0.data.record.confirmedBy,id);assert.equal(w.entities.shared_0.data.resolver,id);
  assert.equal(w.entities.hv_actor_2.data.memories,undefined);
});

test('M4D authored generation is state/knowledge gated; completed nonrecurring definitions never respawn',()=>{
  let game=fixture(),w=structuredClone(worldOf(game));
  delete w.entities.shared_0;delete w.entities.shared_1;
  w.globals.hearthvaleSurface.calendar.day=2;w.globals.hearthvaleSituationBoundary=2;
  const creates=()=>situationDayEvents(w,{next:()=>0.99}).flatMap(e=>e.effects).filter(e=>e.type==='create');
  assert.deepEqual(new Set(creates().map(e=>e.entity.data.sourceDefinitionId)),new Set([guild.id,town.id]));
  const guildClaim=heldInformation(w,'loc_guild').find(e=>e.claim.value?.topic==='pit-hound-report');guildClaim.lifecycle='forgotten';
  assert.ok(creates().every(e=>e.entity.data.sourceDefinitionId!==guild.id));
  game=autonomy(game);w=structuredClone(worldOf(game));w.globals.hearthvaleSurface.calendar.day=3;w.globals.hearthvaleSituationBoundary=3;
  // Reintroduce the original pressure after cooldown: recurrence policy, not
  // merely the corrected Guild knowledge, must prevent another rewarded job.
  heldInformation(w,'loc_guild').find(e=>e.claim.value?.topic==='pit-hound-report').claim.certainty='uncertain';
  assert.ok(creates().every(e=>e.entity.data.sourceDefinitionId!==guild.id));
});

test('M4D exact saved continuation across real sleep preserves tracking, completion and actual resolver',()=>{
  const a=fixture();a.perform('Move',{location:'loc_guild'});service(a,'track-opportunity',p=>p.situation==='shared_0');a.perform('Move',{location:'loc_inn'});
  let b=createSurfaceGame({saved:a.save()});
  for(let i=0;i<3;i++){
    for(const g of [a,b])g.perform('surface.sleep',{confirmed:true,day:worldOf(g).globals.hearthvaleSurface.calendar.day});
    assert.equal(a.save(),b.save());b=createSurfaceGame({saved:b.save()});
  }
  const completed=autonomy(fixture()),reload=createSurfaceGame({saved:completed.save()});
  assert.equal(reload.save(),completed.save());assert.equal(worldOf(reload).entities.shared_0.data.resolver,'hv_actor_2');
});
