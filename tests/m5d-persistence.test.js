import test from 'node:test';
import assert from 'node:assert/strict';
import { persistenceFixture,world,player,person,r,sanityDeath,succeed,configure,service,applyAs,sleep,use } from './helpers/m5d-fixture.js';
import { finalHeartFixture } from './helpers/m5-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { generateCandidates,instantiateSurfaceActor } from '../HearthVale_Shell/src/surface-candidates.js';
import { heldInformation,knowledgeState,talkInformationEffects } from '../HearthVale_Shell/src/information.js';
import { knownHistory } from '../HearthVale_Shell/src/history-records.js';
import { firstGuardianClear,guardianWeeklyEffects,playerGuardianVictory } from '../HearthVale_Shell/src/guardian.js';
import { advanceEconomy } from '../HearthVale_Shell/src/economy.js';
import { livingSituations } from '../HearthVale_Shell/src/living-situations.js';
import { archivedLives } from '../HearthVale_UI/death-views.js';
import { pitEntrance } from '../HearthVale_UI/expedition-views.js';
import { recordCards } from '../HearthVale_UI/service-views.js';
let deadSave;
function dead(){if(!deadSave)deadSave=sanityDeath(persistenceFixture()).save();return createSurfaceGame({saved:deadSave});}
const pit=g=>world(g).entities.hv_pit_1.data;
function assertPreserved(before,after){
  // Exhaustive old-entity comparison includes claims (active and superseded),
  // Events/Consequences, Items, Actors, Situations and permanent Locations.
  for(const [id,entity]of Object.entries(before.entities)){
    const expected=structuredClone(entity);
    if(id===before.globals.hearthvaleSurface.playerId)expected.actor.controller='Autonomous';
    assert.deepEqual(after.entities[id],expected,`Existing entity ${id}`);
  }
  for(const [key,value]of Object.entries(before.globals))if(!['hearthvaleSurface','hearthvaleDeathTransition'].includes(key))
    assert.deepEqual(after.globals[key],value,`World global ${key}`);
  const s=after.globals.hearthvaleSurface;
  assert.deepEqual(s,{...before.globals.hearthvaleSurface,playerId:s.playerId,nextActorInstance:before.globals.hearthvaleSurface.nextActorInstance+3});
  assert.deepEqual(after.relations,before.relations);
}

test('M5D all pre-existing entities/globals/history survive handoff; calendar and completed weekly boundary do not reset',()=>{
  const g=dead(),before=world(g);assert.equal(before.globals.hearthvaleSurface.calendar.year,2);assert.equal(before.globals.hearthvaleSurface.calendar.day,6);
  assert.equal(before.globals.hearthvaleWeekly.lastCompletedDay,5);assert.ok(before.globals.hearthvaleWeekly.snapshots.length);
  assert.ok(before.globals.hearthvaleWeekly.records);succeed(g);assertPreserved(before,world(g));
  assert.equal(player(g).data.generation,2);assert.deepEqual(player(g).data.arrived,before.globals.hearthvaleSurface.calendar);
});

test('M5D named cast, Rook, original Could-Have and living wounded Auron retain identity and independent history',()=>{
  const g=dead(),before=world(g),auron=person(before,'actor_auron'),old=player(g),ch=before.globals.hearthvaleSurface.couldHaveId;
  assert.equal(auron.data.rescueCount,2);assert.equal(r(auron).hearts,1);assert.equal(auron.data.scars[0].label,'Lost Arm');
  assert.equal(before.globals.hearthvaleServices.auronTrainingUnlocked,true);
  succeed(g);const w=world(g);for(const a of Object.values(before.entities).filter(a=>a.actor&&a.id!==old.id))assert.deepEqual(w.entities[a.id],a);
  for(const template of ['actor_mira','actor_rook'])assert.equal(person(w,template).data.relationships[old.id],7);
  assert.equal(w.globals.hearthvaleSurface.couldHaveId,ch);assert.deepEqual(w.entities[ch],before.entities[ch]);
  assert.equal(player(g).data.relationships,undefined);assert.equal(player(g).data.memories,undefined);
  assert.ok(person(w,'actor_rook').data.memories.some(m=>m.kind==='guardian'));
});

test('M5D Auron final rescue death remains death, without replacement or reset of training history',()=>{
  let g=finalHeartFixture(persistenceFixture());g=configure(g,w=>{person(w,'actor_auron').data.protectionUnavailable=false;});
  use(g,'pit.resolve-room');assert.equal(person(world(g),'actor_auron').lifecycle,'retired');
  g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter');g=sanityDeath(g);
  const before=person(world(g),'actor_auron'),services=world(g).globals.hearthvaleServices;succeed(g);
  assert.deepEqual(person(world(g),'actor_auron'),before);assert.equal(before.data.rescueCount,3);assert.equal(r(before).hearts,0);
  assert.equal(before.data.scars[0].label,'Lost Arm');assert.ok(before.data.death);assert.deepEqual(world(g).globals.hearthvaleServices,services);
  assert.equal(Object.values(world(g).entities).filter(a=>a.data?.templateId==='actor_auron').length,1);
});

test('M5D Square credit/floor/date/pool and Guardian progression persist; successor learns shortcut through Guild',()=>{
  const g=dead(),before=pit(g),oldId=player(g).id;succeed(g);
  assert.deepEqual(pit(g),before);assert.equal(pit(g).sunkenSquare.remaining,1);assert.equal(pit(g).sunkenSquare.known.actor,oldId);
  assert.equal(pit(g).strata[0].cleared,true);assert.equal(pit(g).strata[0].waystoneUnlocked,true);assert.equal(pit(g).strata[1].playable,false);
  assert.equal(pit(g).guardianAutonomyWeek,2);assert.ok(pit(g).guardianVictories.length);
  g.perform('Move',{location:'loc_pit_entrance'});assert.ok(!g.expeditionChoices().some(c=>c.params.shortcut));
  assert.equal(knowledgeState(world(g),player(g).id,'hv_pit_1','discovery-loc_sunken_square'),'Unknown');
  g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>world(g).entities[p.actor].data.templateId==='actor_lina');
  assert.equal(knowledgeState(world(g),player(g).id,'hv_pit_1','discovery-loc_sunken_square'),'Known');
  g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter',c=>c.params.shortcut);use(g,'pit.forward');use(g,'pit.resolve-room');
  assert.deepEqual(pit(g).sunkenSquare.known,before.sunkenSquare.known);assert.equal(pit(g).sunkenSquare.floor,before.sunkenSquare.floor);
  assert.equal(pit(g).sunkenSquare.remaining,0);assert.equal(player(g).data.holdings.valuables?.item_town_medal,undefined);
  assert.ok(!player(g).data.memories?.some(m=>m.kind==='discovery'));
});

test('M5D legacy first-clear belongs to the historical victor after control transfer and a later victory',()=>{
  const g=dead(),w=structuredClone(world(g)),p=w.entities.hv_pit_1.data,first=p.guardianDefeated;
  delete p.guardianFirstClear;const old=w.globals.hearthvaleSurface.playerId;succeed(g);w.globals.hearthvaleSurface.playerId=player(g).id;
  w.entities[player(g).id]=structuredClone(player(g));assert.equal(first.actor,old);assert.deepEqual(firstGuardianClear(w),first);
  assert.equal(guardianWeeklyEffects(w).length,1);
  playerGuardianVictory({world:w,pit:p,actor:w.entities[player(g).id],day:7,year:2});
  assert.deepEqual(p.guardianFirstClear,first);assert.deepEqual(p.guardianDefeated,first);
});

test('M5D economy, formal material credit, recipe unlocks, used stock/age, reserve and personal orders persist',()=>{
  const g=dead(),before=world(g).globals.hearthvaleServices,old=player(g).id;
  assert.deepEqual(before.knownMaterials,['item_iron_ore','item_moonleaf']);assert.ok(before.materialRecords.every(m=>m.actor===old));
  assert.equal(before.used.length,1);assert.equal(before.used[0].soldDay,1);assert.equal(before.orders[0].actor,old);assert.equal(before.townSupplies.item_iron_ore,2);
  succeed(g);assert.deepEqual(world(g).globals.hearthvaleServices,before);
  g.perform('Move',{location:'loc_shop'});const choices=g.serviceChoices();
  assert.ok(!choices.some(c=>c.params.op==='collect'),'predecessor order cannot be collected by successor');
  assert.ok(!choices.some(c=>c.params.op==='buy'&&['item_hp_potion_basic','item_arrows'].includes(c.params.item)));
  assert.ok(choices.some(c=>c.params.op==='buy-used'&&c.params.id===before.used[0].id));
  const w=world(g);assert.equal(advanceEconomy(w,15).value.used.length,1);assert.equal(advanceEconomy(w,16).value.used.length,0);
  // Eligibility still requires the new Actor's own resources, not inherited ones.
  const funded=configure(g,w=>{w.entities[w.globals.hearthvaleSurface.playerId].data.holdings={materials:{item_moonleaf:2}};});
  assert.ok(funded.serviceChoices().some(c=>c.params.op==='order'&&c.params.recipe==='recipe_hp_potion_greater'));
});

test('M5D active/resolved/expired/escalated Situations, deadlines/resolver and bookmarks have correct owners',()=>{
  const g=dead(),before=livingSituations(world(g));
  assert.equal(world(g).entities.m5d_active.lifecycle,'active');assert.equal(world(g).entities.m5d_expired.lifecycle,'expired');
  assert.equal(world(g).entities.m5d_escalated.lifecycle,'escalated');assert.equal(world(g).entities.m5_town_supply.lifecycle,'resolved');
  assert.equal(world(g).entities.m5d_active.data.expiresDay,9);assert.equal(world(g).entities.m5d_escalated.data.escalated,true);
  succeed(g);assert.deepEqual(livingSituations(world(g)),before);assert.equal(player(g).data.trackedOpportunities,undefined);
  assert.equal(world(g).entities.m5_town_supply.data.resolver,world(g).globals.hearthvaleDeathTransition.actor);
});

test('M5D successor gets only generated personal state; private claims, rumors, conversations and temporary flags stay with predecessor',()=>{
  const g=dead(),old=player(g),candidate=succeed(g),a=player(g),expected=instantiateSurfaceActor(candidate,{controller:'Human'});
  assert.deepEqual(a.data,{...expected.data,generation:2,arrived:world(g).globals.hearthvaleSurface.calendar});
  assert.deepEqual(world(g).entities[old.id].data,old.data);
  for(const key of ['observations','rumors','relationships','memories','reputation','training','trackedOpportunities','dialogueUsed','talkCount','storyTags','statuses','expeditionHp'])
    assert.equal(a.data[key],undefined,key);
  assert.ok(heldInformation(world(g),old.id).some(c=>c.claim.key==='private-m5d'));
  assert.ok(!heldInformation(world(g),a.id).some(c=>['private-m5d','dated-m5d'].includes(c.claim.key)));
  assert.doesNotMatch(recordCards(world(g),a),/Predecessor-only|Private unshared|Later confirmed/);
});

test('M5D institutional records/provenance/superseded claims remain; reading player archive grants no knowledge',()=>{
  const g=dead(),before=world(g),holders=['loc_guild','loc_town_hall','loc_shop'];
  assert.ok(holders.every(h=>heldInformation(before,h).length>0));
  assert.ok(Object.values(before.entities).some(e=>e.claim?.key==='dated-m5d'&&e.lifecycle!=='active'));
  succeed(g);for(const h of holders){assert.deepEqual(heldInformation(world(g),h),heldInformation(before,h));assert.deepEqual(knownHistory(world(g),h),knownHistory(before,h));}
  const saved=g.save(),html=archivedLives(world(g));assert.match(html,/Lives followed/);assert.match(html,/Generation 1/);assert.match(html,/Sanity reached 0/);
  assert.equal(g.save(),saved);assert.equal(heldInformation(world(g),player(g).id).length,0);
});

test('M5D unwitnessed death stays unconfirmed; a pre-existing missing report is not promoted by succession',()=>{
  let g=dead();const w=world(g),rook=person(w,'actor_rook').id,lina=person(w,'actor_lina').id,old=player(g).id;
  g=applyAs(g,rook,()=>[{type:'learn',actor:rook,claim:{subject:old,key:'missing-fixture',certainty:'uncertain',value:{topic:'missing-fixture',domain:'missing',kind:'missing',observedDay:6,text:'An adventurer has not returned.'}}}]);
  g=applyAs(g,rook,w=>talkInformationEffects(w,w.entities[rook],w.entities[lina]));
  const claims=heldInformation(world(g),'loc_guild');assert.ok(claims.some(c=>c.claim.value?.kind==='missing'));
  succeed(g);assert.deepEqual(heldInformation(world(g),'loc_guild'),claims);
  for(const holder of ['loc_guild','loc_town_hall','loc_inn',player(g).id])assert.ok(!heldInformation(world(g),holder).some(c=>c.claim.subject===old&&c.claim.value?.kind==='death'));
  g.perform('Move',{location:'loc_pit_entrance'});
  const view=pitEntrance(world(g),player(g),g.expeditionChoices());assert.doesNotMatch(view,/died from Sanity/);
  const legacy=structuredClone(world(g));delete legacy.entities.hv_pit_1.data.lastResult.actor;
  assert.doesNotMatch(pitEntrance(legacy,player(g),g.expeditionChoices()),/died from Sanity/);
});

test('M5D legitimate confirmed death knowledge remains confirmed across handoff without gaining circumstances',()=>{
  let g=persistenceFixture();g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];w.entities.hv_pit_1.data.expedition=null;a.primaryLocation='loc_town_hall';});
  g=sanityDeath(g);const old=player(g).id,claim=heldInformation(world(g),'loc_town_hall').find(c=>c.claim.subject===old&&c.claim.value?.kind==='death');
  assert.ok(claim);succeed(g);assert.deepEqual(heldInformation(world(g),'loc_town_hall').find(c=>c.id===claim.id),claim);
  assert.equal(claim.claim.value.cause,undefined);assert.equal(claim.claim.value.floor,undefined);
});

test('M5D two successions preserve accumulated world and old Life Records with exact future RNG/save replay',()=>{
  let a=dead(),b=createSurfaceGame({saved:a.save()});const originalCouldHave=world(a).globals.hearthvaleSurface.couldHaveId;
  const oldIds=[];
  for(let generation=2;generation<=3;generation++){
    const before=world(a);oldIds.push(player(a).id);
    const expected=createRuntime({saved:a.save(),shell:{worldProcesses:({world:w},{rng})=>[{type:'fixture.expected-rng',effects:[
      {type:'global',key:'fixtureCandidates',value:generateCandidates(rng,w.globals.hearthvaleSurface.nextActorInstance,Object.values(w.entities).filter(e=>e.actor&&e.lifecycle==='active').map(e=>e.data.identity.name))},
    ]}]}});expected.startScene();expected.resolveScene({offscreenBudget:0});
    a.beginSuccession();b.beginSuccession();assert.equal(a.save(),b.save());assert.equal(a.snapshot().random,expected.snapshot().random);
    assert.deepEqual(world(a).globals.hearthvaleDeathTransition.candidates,expected.snapshot().world.globals.fixtureCandidates);
    const candidates=world(a).globals.hearthvaleDeathTransition.candidates,id=candidates[1].id,random=a.snapshot().random;
    b=createSurfaceGame({saved:b.save()});a.chooseSuccessor(id);b.chooseSuccessor(id);assert.equal(a.save(),b.save());
    assert.equal(a.snapshot().random,random);assert.equal(player(a).data.generation,generation);assertPreserved(before,world(a));
    for(const rejected of [candidates[0],candidates[2]])assert.equal(world(a).entities[rejected.id],undefined);
    assert.equal(world(a).globals.hearthvaleSurface.couldHaveId,originalCouldHave);
    for(const old of oldIds){assert.ok(world(a).entities[old].data.lifeRecord);assert.equal(world(a).entities[old].lifecycle,'retired');}
    assert.equal(Object.values(world(a).entities).filter(e=>e.actor?.controller==='Human').length,1);
    const saved=a.save();assert.equal(createSurfaceGame({saved}).save(),saved);
    // Ordinary future Day work consumes the continuing RNG identically.
    sleep(a);sleep(b);assert.equal(a.save(),b.save());
    if(generation===2){a.perform('Move',{location:'loc_pit_entrance'});b.perform('Move',{location:'loc_pit_entrance'});use(a,'pit.enter');use(b,'pit.enter');a=sanityDeath(a);b=sanityDeath(b);assert.equal(a.save(),b.save());}
  }
  const html=archivedLives(world(a));assert.match(html,/Generation 1/);assert.match(html,/Generation 2/);
  assert.equal(Object.values(world(a).entities).filter(e=>e.id===originalCouldHave).length,1);
});
