import test from 'node:test';
import assert from 'node:assert/strict';
import { entered,setup,use,world,player } from './helpers/m2-fixture.js';
import { configure,surfaceFixture } from './helpers/m3-fixture.js';
import { apply } from './helpers/m4-fixture.js';
import { finalHeartFixture,richLifeFixture } from './helpers/m5-fixture.js';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { heldInformation,talkInformationEffects } from '../HearthVale_Shell/src/information.js';
import { buildLifeRecord } from '../HearthVale_Shell/src/life-record.js';
import { knownHistory } from '../HearthVale_Shell/src/history-records.js';
import { deathDescription } from '../HearthVale_Story/death.js';
import { deathView } from '../HearthVale_UI/death-views.js';
const deathClaims=(g,holder)=>heldInformation(world(g),holder).filter(c=>c.claim.value?.kind==='death');

test('M5B final Heart death archives actual cause once, blocks normal actions and leaves candidates empty',()=>{
  const g=finalHeartFixture(),before=world(g),ids=Object.values(before.entities).filter(e=>e.actor).map(e=>e.id);
  use(g,'pit.resolve-room');const a=player(g),w=world(g);
  assert.equal(a.lifecycle,'retired');assert.equal(a.data.death.cause,'Poison');assert.equal(a.data.death.causeKind,'final-heart-loss');
  assert.match(deathDescription(a.data.death),/Final Heart lost after Poison/);
  assert.equal(w.globals.hearthvaleDeathTransition.status,'succession-ready');
  assert.deepEqual(w.globals.hearthvaleSurface.candidates,[]);
  assert.deepEqual(Object.values(w.entities).filter(e=>e.actor).map(e=>e.id),ids);
  assert.equal(w.globals.hearthvaleSurface.playerId,before.globals.hearthvaleSurface.playerId);
  assert.deepEqual(g.serviceChoices(),[]);assert.deepEqual(g.expeditionChoices(),[]);
  for(const [type,params]of [['Move',{location:'loc_inn'}],['surface.sleep',{day:1,confirmed:true}],['pit.enter',{}],['service.act',{op:'talk',actor:'hv_actor_5'}]])
    assert.throws(()=>g.perform(type,params),/unavailable/);
  assert.deepEqual(a.data.lifeRecord.facts,[],'short life has no invented accomplishments');
});

test('M5B Sanity reaching zero uses the Sanity cause and preserves Hearts',()=>{
  const g=configure(entered(),w=>{w.entities[w.globals.hearthvaleSurface.playerId].data.attributes.resources.sanity=0;});
  assert.equal(player(g).data.attributes.resources.hearts,3);assert.equal(player(g).lifecycle,'retired');
  assert.match(deathDescription(player(g).data.lifeRecord.death),/^Sanity reached 0/);
});

test('M5B real discovery, Guardian combat, first material turn-in and Situation resolution retain exact credit',()=>{
  const g=richLifeFixture(),before=world(g);use(g,'pit.resolve-room');const record=player(g).data.lifeRecord;
  for(const kind of ['discovery','guardian','material','situation'])assert.equal(record.facts.filter(f=>f.kind===kind).length,1,kind);
  assert.match(JSON.stringify(record),/Sunken Square/);assert.match(JSON.stringify(record),/Ruin Brute/);
  assert.equal(record.facts.find(f=>f.kind==='situation').source.entity,'m5_town_supply');
  assert.deepEqual(world(g).entities.hv_pit_1.data.discoveries,before.entities.hv_pit_1.data.discoveries);
  assert.deepEqual(world(g).entities.m5_town_supply,before.entities.m5_town_supply);
  const other=structuredClone(player(g));other.id=world(g).globals.hearthvaleSurface.couldHaveId;other.data.memories=[];
  assert.deepEqual(buildLifeRecord(world(g),other).facts,[],'knowledge/global accomplishments cannot steal credit');
});

test('M5B archival compression omits routine history and keeps real rescue/Scar history',()=>{
  let g=setup(entered(),ctx=>{ctx.actor.data.memories=[{event:'Bought a potion',day:1},{event:'Talked to Mira',day:1},
    {kind:'sell-holding',event:'Sold Town Medal',day:1}];
    ctx.actor.data.attributes.resources.hearts=1;ctx.actor.data.attributes.resources.hp=1;ctx.actor.data.statuses={poison:true};
    ctx.expedition.floor.rooms[0]={id:'poison',family:'empty',encounter:'empty',title:'Empty',resolved:false};ctx.expedition.roomIndex=0;});
  use(g,'pit.resolve-room');g=finalHeartFixture(g);use(g,'pit.resolve-room');
  const record=player(g).data.lifeRecord;
  assert.equal(record.facts.filter(f=>f.kind==='rescue').length,1);
  assert.doesNotMatch(JSON.stringify(record),/Bought a potion|Talked to Mira|Sold Town Medal/);
  const actor=structuredClone(player(g));actor.data.scars=[{id:'actual-scar',label:'Battle Mark',day:1}];
  assert.equal(buildLifeRecord(world(g),actor).facts.filter(f=>f.kind==='scar').length,1);
});

test('M5B unwitnessed Pit death grants no institutional or unrelated Actor knowledge',()=>{
  const g=finalHeartFixture(),before=world(g);use(g,'pit.resolve-room');
  for(const holder of ['loc_guild','loc_town_hall','loc_inn','loc_shop',...Object.values(before.entities).filter(e=>e.actor&&e.id!==player(g).id).map(e=>e.id)]){
    assert.deepEqual(deathClaims(g,holder),[]);assert.ok(!knownHistory(world(g),holder).some(f=>f.id===player(g).data.death.id));
  }
});

test('M5B witnessed Surface death confirms only death locally; Talk carries provenance to another institution',()=>{
  let g=configure(surfaceFixture(),w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];a.primaryLocation='loc_guild';a.data.attributes.resources.sanity=0;});
  const source=deathClaims(g,'hv_actor_5')[0];assert.ok(source);assert.equal(source.claim.source.kind,'perceived');
  assert.equal(deathClaims(g,'loc_guild').length,1);assert.equal(deathClaims(g,'loc_town_hall').length,0);
  assert.equal(source.claim.value.cause,undefined);assert.equal(source.claim.value.floor,undefined);
  // A fixture moves the living witness; no invented travel or new player control.
  const base=createSurfaceShell();
  const runtime=createRuntime({saved:g.save(),shell:{...base,actions:{...base.actions,
    'fixture.travel':{resolve:()=>({effects:[{type:'move',entity:'hv_actor_5',location:'loc_town_hall'}]})},
    'fixture.report':{resolve:({world:w})=>({effects:talkInformationEffects(w,w.entities.hv_actor_5,w.entities.hv_actor_6)})},
  }}});
  for(const type of ['fixture.travel','fixture.report']){runtime.startScene();runtime.submit({actor:'hv_actor_5',type});runtime.resolveScene({offscreenBudget:0});}
  g=createSurfaceGame({saved:runtime.save()});
  const report=deathClaims(g,'loc_town_hall')[0];assert.ok(report);
  assert.ok(report.claim.lineage.includes(source.id));assert.equal(report.claim.source.kind,'communicated');
  assert.equal(report.claim.value.status,'confirmed-dead');assert.equal(deathClaims(g,'loc_inn').length,0);
  const saved=g.save();assert.equal(createSurfaceGame({saved}).save(),saved);
});

test('M5B exact reload/replay preserves archive, world, knowledge and transition without extra Events',()=>{
  const g=richLifeFixture(),branch=createSurfaceGame({saved:g.save()});use(g,'pit.resolve-room');use(branch,'pit.resolve-room');
  assert.equal(branch.save(),g.save());const saved=g.save();
  for(let i=0;i<3;i++){const loaded=createSurfaceGame({saved});assert.equal(loaded.adjudicateDeath(),null);assert.equal(loaded.save(),saved);}
  assert.equal(Object.values(world(g).entities).filter(e=>e.event?.type==='hearthvale.player-death').length,1);
  assert.equal(player(g).data.memories.filter(m=>m.kind==='death').length,1);
});

test('M5B existing M5A terminal snapshot loads unchanged, then explicitly archives without death adjudication',()=>{
  const base=entered(),shell=createSurfaceShell(),a=player(base);
  const death={id:`death:${a.id}`,actor:a.id,kind:'death',cause:'heart-loss',year:1,day:1,event:'Recorded death.'};
  const r=createRuntime({saved:base.save(),shell:{...shell,worldProcesses:()=>[],actions:{...shell.actions,
    'fixture.legacy':{resolve:()=>({effects:[{type:'data',entity:a.id,key:'death',value:death},{type:'retire',entity:a.id},
      {type:'data',entity:'hv_pit_1',key:'expedition',value:null}]})}}}});
  r.startScene();r.submit({actor:a.id,type:'fixture.legacy'});r.resolveScene({offscreenBudget:0});
  const saved=r.save(),g=createSurfaceGame({saved});assert.equal(g.save(),saved);g.adjudicateDeath();
  assert.deepEqual(player(g).data.death,death);assert.ok(player(g).data.lifeRecord);
  assert.equal(Object.values(world(g).entities).filter(e=>e.event?.type==='hearthvale.player-death').length,0);
  const after=g.save();assert.equal(g.adjudicateDeath(),null);assert.equal(g.save(),after);
});

test('M5B takeover escapes history, omits normal controls and renders no successors; completion gets a separate hook',()=>{
  // M6 now forbids gameplay after completion. Produce the real Day-40 death
  // handoff instead of declaring completion before submitting a lethal action.
  let g=finalHeartFixture();g=configure(g,w=>{w.globals.hearthvaleSurface.calendar={year:1,day:40,week:8};});use(g,'pit.resolve-room');
  const a=structuredClone(player(g));a.data.lifeRecord.name='<script>bad</script>';
  const html=deathView(a,world(g).globals.hearthvaleDeathTransition);
  assert.match(html,/&lt;script&gt;/);assert.match(html,/Life Record/);assert.match(html,/HearthVale continues/);
  assert.doesNotMatch(html,/class="hud"|class="utilities"|data-command="choose"|GAME OVER|<script>/);
  assert.equal(world(g).globals.hearthvaleDeathTransition.status,'completion-pending');
  assert.equal(deathDescription({cause:'authored cause',causeKind:'special'}),'Cause: authored cause.');
  assert.equal(deathDescription({cause:'combat'}),'Final Heart lost after combat.');
});
