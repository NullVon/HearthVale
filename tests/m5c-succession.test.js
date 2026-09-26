import test from 'node:test';
import assert from 'node:assert/strict';
import { entered,use,world,player } from './helpers/m2-fixture.js';
import { configure } from './helpers/m3-fixture.js';
import { apply } from './helpers/m4-fixture.js';
import { finalHeartFixture } from './helpers/m5-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { generateCandidates,instantiateSurfaceActor } from '../HearthVale_Shell/src/surface-candidates.js';
import { successionEvents } from '../HearthVale_Shell/src/surface-succession.js';
import { heldInformation } from '../HearthVale_Shell/src/information.js';
import { validateCandidate } from '../HearthVale_Content/validation.js';
import { surfaceCatalog } from '../HearthVale_Content/surface.js';
import { candidateCards } from '../HearthVale_UI/surface-views.js';
import { serviceView } from '../HearthVale_UI/service-views.js';
import { service } from './helpers/m3-fixture.js';

const transition=g=>world(g).globals.hearthvaleDeathTransition;
const events=(g,type)=>Object.values(world(g).entities).filter(e=>e.event?.type===type);
let deathSave;
function dead(){if(!deathSave){const g=finalHeartFixture();use(g,'pit.resolve-room');deathSave=g.save();}return createSurfaceGame({saved:deathSave});}

test('M5C only actual archived terminal death allows succession; alive, missing marker, and completion reject',()=>{
  for(const g of [entered(),configure(finalHeartFixture(),w=>{w.globals.hearthvaleCompletion={completed:true};})]){
    const before=g.save();assert.throws(()=>g.beginSuccession(),/unavailable/);assert.equal(g.save(),before);
  }
  const w=world(dead());
  for(const mutate of [w=>{w.entities[w.globals.hearthvaleSurface.playerId].lifecycle='active';},
    w=>{delete w.entities[w.globals.hearthvaleSurface.playerId].data.death;},
    w=>{delete w.entities[w.globals.hearthvaleSurface.playerId].data.lifeRecord;},
    w=>{w.globals.hearthvaleDeathTransition.status='complete';},
    w=>{w.globals.hearthvaleDeathTransition.actor='hv_actor_2';},
    w=>{w.globals.hearthvaleCompletion={completed:true};}]){
    const next=structuredClone(w);mutate(next);
    assert.throws(()=>successionEvents(next,{next:()=>{throw new Error('Must not draw RNG');}},{type:'succession-begin'}),/unavailable/);
  }
});

test('M5C three candidates reuse the exact opening generator and canonical package without tuning',()=>{
  const g=dead(),w=world(g),names=Object.values(w.entities).filter(a=>a.actor&&a.lifecycle==='active').map(a=>a.data.identity.name);
  const rng=()=>({next:()=>0.41});
  const expected=generateCandidates(rng(),w.globals.hearthvaleSurface.nextActorInstance,names);
  const event=successionEvents(w,rng(),{type:'succession-begin'})[0];
  assert.deepEqual(event.effects[0].value.candidates,expected);
  g.beginSuccession();const candidates=transition(g).candidates;assert.equal(candidates.length,3);
  assert.equal(new Set(candidates.map(c=>c.label)).size,3);
  for(const c of candidates){
    validateCandidate(c,surfaceCatalog);assert.equal(Object.values(c.stats).reduce((a,b)=>a+b),12);
    assert.ok(Object.values(c.stats).every(n=>n>=1&&n<=4));assert.ok(Object.values(c.stats).filter(n=>n===4).length<=1);
    assert.equal(c.traits.length,2);assert.equal(new Set(c.traits).size,2);assert.ok(c.age>=18&&c.age<=30);
    assert.equal(new Set(c.loadout.weapons).size,2);assert.ok(c.loadout.weapons.every(id=>['item_sword','item_hammer','item_bow'].includes(id)));
    assert.equal(c.loadout.gold,45);assert.equal(c.loadout.arrows,c.loadout.weapons.includes('item_bow')?10:0);
    assert.deepEqual(c.loadout.armor,['item_chest_armor']);assert.deepEqual(c.loadout.items,[{item:'item_hp_potion_basic',quantity:1}]);
    assert.equal(c.loadout.spellSlots,4);assert.ok(c.loadout.spells.length<=1);assert.equal(world(g).entities[c.id],undefined);
  }
});

test('M5C same saved RNG yields exact candidates; generation occurs once and all three save stages round-trip',()=>{
  const a=dead(),before=a.save(),b=createSurfaceGame({saved:before});assert.equal(b.save(),before);
  a.beginSuccession();b.beginSuccession();assert.equal(a.save(),b.save());
  const screen=a.save(),reload=createSurfaceGame({saved:screen});assert.equal(reload.save(),screen);
  assert.deepEqual(transition(reload).candidates,transition(a).candidates);
  assert.throws(()=>reload.beginSuccession(),/unavailable/);assert.equal(reload.save(),screen);
  assert.equal(events(reload,'hearthvale.successor-candidates-generated').length,1);
  const id=transition(a).candidates[1].id;a.chooseSuccessor(id);reload.chooseSuccessor(id);assert.equal(a.save(),reload.save());
  const after=a.save(),finished=createSurfaceGame({saved:after});assert.equal(finished.save(),after);
  assert.throws(()=>finished.beginSuccession(),/unavailable/);assert.throws(()=>finished.chooseSuccessor(id),/unavailable/);
  assert.equal(finished.save(),after);assert.equal(events(finished,'hearthvale.successor-selected').length,1);
});

test('M5C atomic controller transfer retains predecessor archive and consumes transition without a time skip',()=>{
  const g=dead(),old=player(g),calendar=world(g).globals.hearthvaleSurface.calendar;
  g.beginSuccession();const candidates=transition(g).candidates;g.chooseSuccessor(candidates[0].id);
  const w=world(g),a=player(g),predecessor=w.entities[old.id];
  assert.equal(a.actor.controller,'Human');assert.equal(a.lifecycle,'active');assert.equal(a.data.generation,2);
  assert.equal(a.primaryLocation,'loc_inn');assert.equal(w.globals.hearthvaleSurface.stage,'surface');
  assert.deepEqual(a.data.arrived,calendar);assert.deepEqual(w.globals.hearthvaleSurface.calendar,calendar);
  assert.equal(predecessor.actor.controller,'Autonomous');assert.equal(predecessor.lifecycle,'retired');
  assert.deepEqual(predecessor.data,old.data);assert.equal(predecessor.primaryLocation,old.primaryLocation);
  assert.deepEqual(Object.values(w.entities).filter(e=>e.actor?.controller==='Human').map(e=>e.id),[a.id]);
  assert.equal(transition(g).status,'complete');assert.equal(transition(g).candidates,undefined);
  assert.equal(transition(g).successor,a.id);assert.equal(transition(g).record,old.data.death.id);
  assert.deepEqual(w.globals.hearthvaleSurface.candidates,[]);
  for(const c of candidates.slice(1))assert.equal(w.entities[c.id],undefined);
  g.perform('Move',{location:'loc_surface'});assert.equal(player(g).primaryLocation,'loc_surface');
  assert.throws(()=>g.perform('surface.arrive'),/unavailable/);assert.throws(()=>g.openingNext(),/unavailable/);
});

test('M5C fresh Actor package inherits no personal data, private claims, equipment, Scars or relationships',()=>{
  let g=configure(finalHeartFixture(),w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];
    a.data.attributes.baseStats.STR=30;a.data.attributes.resources.gold=999;a.data.attributes.resources.xp=123;
    a.data.relationships={hv_actor_2:99};a.data.training={progress:{STR:12}};a.data.storyTags=['predecessor-only'];
    a.data.scars=[{id:'old-scar',label:'Old injury'}];a.data.memories=[{actor:a.id,day:1,event:'A predecessor-only memory'}];
    a.data.inventory.bag[0]={id:'predecessor-item',templateId:'item_hp_potion_basic',quantity:3};});
  g=apply(g,w=>[{type:'learn',actor:w.globals.hearthvaleSurface.playerId,claim:{subject:'hv_pit_1',key:'private-predecessor',
    value:{topic:'private-predecessor',domain:'pit',private:true,text:'A private memory',observedDay:1}}}]);
  use(g,'pit.resolve-room');const old=player(g);g.beginSuccession();const c=transition(g).candidates[0];g.chooseSuccessor(c.id);
  const expected=instantiateSurfaceActor(c,{controller:'Human'}),a=player(g);
  assert.deepEqual(a.data.attributes,expected.data.attributes);assert.deepEqual(a.data.inventory,expected.data.inventory);
  assert.deepEqual(a.data.scars,[]);
  for(const key of ['relationships','memories','training','storyTags','death','lifeRecord'])assert.equal(a.data[key],undefined,key);
  assert.ok(!heldInformation(world(g),a.id).some(e=>e.claim.key==='private-predecessor'));
  assert.ok(heldInformation(world(g),old.id).some(e=>e.claim.key==='private-predecessor'));
  assert.equal(a.data.attributes.resources.ap,4);assert.equal(a.data.attributes.resources.hearts,3);assert.equal(a.data.attributes.resources.sanity,5);
});

test('M5C keeps original Could-Have and existing world instead of bootstrapping or retaining rejected candidates',()=>{
  const g=dead(),before=world(g),couldHave=before.globals.hearthvaleSurface.couldHaveId;
  const bootstrapCount=events(g,'hearthvale.surface-created').length;
  g.beginSuccession();const candidates=transition(g).candidates;g.chooseSuccessor(candidates[2].id);const after=world(g);
  assert.equal(after.globals.hearthvaleSurface.couldHaveId,couldHave);assert.deepEqual(after.entities[couldHave],before.entities[couldHave]);
  assert.equal(events(g,'hearthvale.surface-created').length,bootstrapCount);
  assert.equal(Object.values(after.entities).filter(e=>e.actor).length,Object.values(before.entities).filter(e=>e.actor).length+1);
  assert.deepEqual(after.entities.hv_pit_1,before.entities.hv_pit_1);
  for(const [id,e]of Object.entries(before.entities).filter(([,e])=>e.actor&&e.id!==before.globals.hearthvaleSurface.playerId))assert.deepEqual(after.entities[id],e);
  assert.deepEqual(after.globals.hearthvaleServices,before.globals.hearthvaleServices);
});

test('M5C rejects arbitrary Actor IDs and stale choices atomically; shared cards use succession wording',()=>{
  const g=dead();assert.throws(()=>g.chooseSuccessor('hv_actor_2'),/unavailable/);g.beginSuccession();const before=g.save();
  for(const id of ['hv_actor_2',player(g).id,'missing']){assert.throws(()=>g.chooseSuccessor(id),/Unknown successor/);assert.equal(g.save(),before);}
  const html=candidateCards(transition(g).candidates,true);assert.match(html,/Who will you follow next\?/);
  assert.equal((html.match(/data-command="choose-successor"/g)??[]).length,3);assert.doesNotMatch(html,/data-command="choose"/);
});

test('M5C predecessor service receipts stay private to their producer; successor can produce a fresh receipt',()=>{
  const g=dead();g.beginSuccession();g.chooseSuccessor(transition(g).candidates[0].id);
  for(const owner of [undefined,transition(g).actor]){
    const w=structuredClone(world(g));w.globals.hearthvaleServices={...w.globals.hearthvaleServices,lastResult:'Predecessor receipt',lastResultActor:owner};
    assert.doesNotMatch(serviceView(w,player(g),g.serviceChoices()),/Predecessor receipt/);
  }
  service(g,'talk',p=>world(g).entities[p.actor].data.templateId==='actor_mira');
  assert.equal(world(g).globals.hearthvaleServices.lastResultActor,player(g).id);
  assert.match(serviceView(world(g),player(g),g.serviceChoices()),/Service outcome/);
});
