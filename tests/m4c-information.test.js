import test from 'node:test';
import assert from 'node:assert/strict';
import { heldInformation, knowledgeState, informationCards, rumorEvents, talkInformationEffects } from '../HearthVale_Shell/src/information.js';
import { surfaceFixture, configure, service } from './helpers/m3-fixture.js';
import { entered, setup, roomFixture } from './helpers/m2-fixture.js';
import { startCombat } from '../HearthVale_Shell/src/expedition-combat.js';
import { createSurfaceGame, createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { makeMaterialRequest } from '../HearthVale_Shell/src/living-situations.js';
import { livingSituationDefinitions } from '../HearthVale_Content/living-situations.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { recordCards } from '../HearthVale_UI/service-views.js';
const worldOf=g=>g.snapshot().world;
const player=w=>w.entities[w.globals.hearthvaleSurface.playerId];
const state=(w,holder)=>knowledgeState(w,holder,'hv_pit_1','pit-hound-report');
function reported() {
  return surfaceFixture((world,actor)=>{
    actor.primaryLocation='loc_inn';
    const rook=world.entities.hv_actor_2;rook.primaryLocation='loc_guild';
    // Authored prior off-screen encounter fixture, resolved by the same combat
    // entry hook; no production path invents this encounter or Actor movement.
    startCombat({actor:rook,pit:world.entities.hv_pit_1.data,day:1,year:1,
      expedition:{id:'witness_expedition',nextEnemyInstance:1,floor:{number:2}}},'enemy_pit_hound','room',{next:()=>0});
  });
}
function talkLina(game) {game.perform('Move',{location:'loc_guild'});service(game,'talk',p=>p.actor==='hv_actor_5');}
function effectsFixture(game,effects) {
  const base=createSurfaceShell(),runtime=createRuntime({saved:game.save(),shell:{...base,actions:{...base.actions,
    'fixture.info':{resolve:({world})=>({effects:effects(world)})},
  }}});
  runtime.startScene();runtime.submit({actor:player(worldOf(game)).id,type:'fixture.info'});runtime.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:runtime.save()});
}

test('M4C Hound report is holder-specific and requires legitimate Talk; institutions and staff knowledge stay distinct',()=>{
  const game=reported(),world=worldOf(game),id=player(world).id;
  assert.equal(state(world,'hv_actor_2'),'Known');assert.equal(state(world,'loc_guild'),'Rumor');
  for(const holder of [id,'hv_actor_5','hv_actor_3','loc_inn','loc_shop','loc_town_hall'])assert.equal(state(world,holder),'Unknown');
  game.perform('Move',{location:'loc_guild'});
  assert.equal(state(worldOf(game),id),'Unknown','first service meeting is not a report sync');
  service(game,'talk',p=>p.actor==='hv_actor_5');
  assert.equal(state(worldOf(game),id),'Rumor');
  const claim=heldInformation(worldOf(game),id).find(e=>e.claim.value?.topic==='pit-hound-report');
  assert.equal(claim.claim.source.kind,'communicated');assert.ok(claim.claim.lineage.length);
  assert.match(recordCards(worldOf(game),player(worldOf(game))),/Rumor — unverified/);
});

test('M4C all four state-rooted modes hide accuracy in claims/cards and cannot appear without a witness source',()=>{
  const original=worldOf(reported());
  for(const [sample,mode]of [[0,'Accurate'],[0.3,'Incomplete'],[0.6,'Exaggerated'],[0.99,'Stale']]){
    const w=structuredClone(original);w.entities.hv_pit_1.data.houndReports={};
    w.globals.hearthvaleSurface.calendar.day=3;
    const events=rumorEvents(w,{next:()=>sample});
    const report=events[0].effects.find(e=>e.key==='houndReports').value;
    assert.equal(Object.values(report)[0].mode,mode);
    for(const e of events[0].effects.filter(e=>e.type==='learn')){
      assert.equal(e.claim.certainty,'uncertain');assert.equal(e.claim.value.mode,undefined);assert.equal(e.claim.value.accuracy,undefined);
    }
  }
  const w=structuredClone(original);w.entities.hv_pit_1.data.houndReports={};
  const source=heldInformation(w,'hv_actor_2').find(e=>e.claim.value?.topic==='pit-hound-report');
  source.claim.value.withheld=true;
  assert.deepEqual(rumorEvents(w,{next:()=>{throw Error('withheld report');}}),[]);
  delete source.claim.value.withheld;
  w.entities.hv_actor_2.primaryLocation='loc_inn';assert.deepEqual(rumorEvents(w,{next:()=>{throw Error('unearned roll');}}),[]);
  w.entities.hv_pit_1.data.houndEvidence={};assert.deepEqual(rumorEvents(w,{next:()=>0}),[]);
  const game=reported();talkLina(game);
  const cards=informationCards(worldOf(game),player(worldOf(game)).id);
  assert.ok(cards.every(c=>!('mode' in c)&&!('accuracy' in c)&&!('confirmedBy' in c)));
});

test('M4C real Hound combat verifies only its witness; later Talk updates Guild with actual confirmation credit',()=>{
  let game=reported();talkLina(game);
  game=configure(game,(w)=>{player(w).primaryLocation='loc_pit_entrance';});
  game.perform('pit.enter');
  game=setup(game,(ctx,rng)=>{roomFixture(ctx,'combat','enemy_pit_hound');startCombat(ctx,'enemy_pit_hound','room',rng);});
  let w=worldOf(game),id=player(w).id;
  assert.equal(state(w,id),'Known');assert.equal(state(w,'loc_guild'),'Rumor');assert.equal(state(w,'loc_shop'),'Unknown');
  const known=heldInformation(w,id).find(e=>e.claim.value?.topic==='pit-hound-report');assert.equal(known.claim.value.confirmedBy,id);
  assert.ok(Object.values(w.entities).some(e=>e.lifecycle==='superseded'&&e.claim?.actor===id&&e.claim.certainty==='uncertain'));
  game=configure(game,w=>{w.entities.hv_pit_1.data.expedition=null;player(w).primaryLocation='loc_guild';});
  service(game,'talk',p=>p.actor==='hv_actor_5');w=worldOf(game);
  assert.equal(state(w,'loc_guild'),'Known');assert.equal(state(w,'hv_actor_5'),'Known');
  assert.equal(heldInformation(w,'loc_guild').find(e=>e.claim.value?.topic==='pit-hound-report').claim.value.confirmedBy,id);
  for(const holder of ['loc_shop','loc_inn','loc_town_hall','hv_actor_4','hv_actor_3'])assert.equal(state(w,holder),'Unknown');
});

test('M4C stale holders retain dated rumors when truth changes elsewhere; old reports never downgrade Known',()=>{
  let game=reported();talkLina(game);const id=player(worldOf(game)).id;
  const before=informationCards(worldOf(game),id);
  game=configure(game,w=>{Object.values(w.entities.hv_pit_1.data.houndEvidence)[0].status='defeated';});
  assert.deepEqual(informationCards(worldOf(game),id),before);
  assert.equal(state(worldOf(game),id),'Rumor');assert.equal(state(worldOf(game),'hv_actor_2'),'Known');
  assert.match(informationCards(worldOf(game),'hv_actor_2')[0].text,/defeated/);
  game.perform('Move',{location:'loc_guild'});service(game,'talk',p=>p.actor==='hv_actor_2');
  assert.equal(state(worldOf(game),id),'Known');
  service(game,'talk',p=>p.actor==='hv_actor_5');assert.equal(state(worldOf(game),id),'Known');
});

test('M4C institutional domain filtering and private/withheld guards prevent omniscient services',()=>{
  let game=reported();talkLina(game);
  game=effectsFixture(game,w=>['private','withheld'].map(flag=>({type:'learn',actor:player(w).id,claim:{subject:'hv_pit_1',key:flag,value:{topic:flag,domain:'pit',observedDay:1,text:'Secret',[flag]:true}}})));
  let w=worldOf(game),effects=talkInformationEffects(w,player(w),w.entities.hv_actor_5);
  assert.ok(effects.every(e=>!['private','withheld'].includes(e.claim.value.topic)));
  game.perform('Move',{location:'loc_shop'});service(game,'talk',p=>p.actor==='hv_actor_4');
  w=worldOf(game);assert.equal(state(w,'loc_shop'),'Unknown');assert.equal(state(w,'hv_actor_4'),'Unknown');
  assert.deepEqual(talkInformationEffects(w,player(w),w.entities.hv_actor_5),[]);
});

test('M4C request notices and outcomes reach local witnesses/shop only, with stale remote awareness until communication',()=>{
  let game=surfaceFixture((w,a)=>{a.primaryLocation='loc_shop';w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.stock.item_hp_potion_basic=3;});
  game=effectsFixture(game,w=>[{type:'create',entity:makeMaterialRequest(livingSituationDefinitions[0],'info_request',1)}]);
  const id=player(worldOf(game)).id;
  const status=(w,holder)=>heldInformation(w,holder).find(e=>e.claim.subject==='info_request'&&e.claim.value?.topic==='public-request')?.claim.value.status;
  assert.equal(status(worldOf(game),id),'active');assert.equal(status(worldOf(game),'loc_shop'),'active');
  assert.equal(status(worldOf(game),'loc_guild'),undefined);
  game=configure(game,w=>{player(w).primaryLocation='loc_inn';w.entities.hv_actor_2.primaryLocation='loc_shop';w.entities.hv_actor_2.data.holdings={materials:{item_moonleaf:2}};});
  // Actual autonomous resolver is covered by M4B; expire here to exercise the
  // Core terminal-event perception path without moving the remote holder.
  game=configure(game,w=>{w.globals.hearthvaleSurface.calendar.day=4;});
  assert.equal(status(worldOf(game),'loc_shop'),'expired');assert.equal(status(worldOf(game),id),'active');
  assert.equal(status(worldOf(game),'loc_town_hall'),undefined);
  game.perform('Move',{location:'loc_shop'});assert.equal(status(worldOf(game),id),'expired');
});

test('M4C same seed/state, knowledge and hidden report modes survive exact save/reload continuation',()=>{
  const a=reported(),b=reported();assert.equal(a.save(),b.save());
  const c=createSurfaceGame({saved:a.save()});
  for(const g of [a,b,c])talkLina(g);
  assert.equal(a.save(),b.save());assert.equal(a.save(),c.save());
  const d=createSurfaceGame({saved:a.save()});
  for(const g of [a,d])service(g,'talk',p=>p.actor==='hv_actor_5');
  assert.equal(a.save(),d.save());
});

test('M4C resolved request knowledge names its actual resolver and does not notify unrelated institutions',()=>{
  let game=surfaceFixture((w,a)=>{
    w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.stock.item_hp_potion_basic=3;
    a.data.holdings={materials:{item_moonleaf:2}};
  });
  game=effectsFixture(game,w=>[{type:'create',entity:makeMaterialRequest(livingSituationDefinitions[0],'resolved_info_request',1)}]);
  service(game,'fulfill-request');
  const w=worldOf(game),id=player(w).id;
  for(const holder of [id,'hv_actor_4','loc_shop']){
    const record=heldInformation(w,holder).find(e=>e.claim.subject==='resolved_info_request'&&e.claim.value?.topic==='public-request');
    assert.equal(record.claim.value.status,'resolved');assert.equal(record.claim.value.resolver,id);
  }
  assert.equal(knowledgeState(w,'loc_guild','resolved_info_request','public-request'),'Unknown');
  assert.equal(knowledgeState(w,'loc_town_hall','resolved_info_request','public-request'),'Unknown');
  assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});

test('M4C unchanged evidence/communication does not churn claims or replay old personal observations',()=>{
  const game=reported();talkLina(game);
  const count=()=>Object.values(worldOf(game).entities).filter(e=>e.claim?.value?.topic==='pit-hound-report').length;
  const before=count();
  service(game,'talk',p=>p.actor==='hv_actor_5');service(game,'talk',p=>p.actor==='hv_actor_5');
  assert.equal(count(),before);
});
