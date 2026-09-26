import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { finalHeartFixture,richLifeFixture } from './helpers/m5-fixture.js';
import { world,player,use } from './helpers/m2-fixture.js';
import { sleep } from './helpers/m4-fixture.js';
import { heldInformation } from '../HearthVale_Shell/src/information.js';
import { deathView,archivedLives } from '../HearthVale_UI/death-views.js';
import { continuityFacts } from '../HearthVale_Story/death.js';
const reload=g=>{const saved=g.save(),next=createSurfaceGame({saved});assert.equal(next.save(),saved);return next;};

test('M5E living production action → terminal archive → saved candidates → playable successor twice',()=>{
  let a=richLifeFixture(),b=reload(a);const original=world(a).globals.hearthvaleSurface.couldHaveId;
  const old=[];
  for(let generation=2;generation<=3;generation++){
    assert.equal(player(a).lifecycle,'active');assert.equal(player(a).data.death,undefined);
    assert.ok(a.expeditionChoices().some(c=>c.type==='pit.resolve-room'));
    const calendar=structuredClone(world(a).globals.hearthvaleSurface.calendar);
    old.push(player(a).id);use(a,'pit.resolve-room');use(b,'pit.resolve-room');assert.equal(a.save(),b.save());
    assert.equal(player(a).lifecycle,'retired');assert.equal(player(a).data.death.cause,'Poison');
    assert.equal(player(a).data.deathAdjudication.status,'dead');
    assert.equal(world(a).globals.hearthvaleDeathTransition.status,'succession-ready');
    assert.equal(player(a).data.lifeRecord.actor,player(a).id);
    assert.equal(a.expeditionChoices().length,0);assert.equal(a.serviceChoices().length,0);
    assert.throws(()=>a.perform('Move',{location:'loc_inn'}),/unavailable/);
    const before=a.save();assert.equal(a.adjudicateDeath(),null);assert.equal(a.save(),before);
    b=reload(b);const archive=structuredClone(player(a).data.lifeRecord);
    const html=deathView(player(a),world(a).globals.hearthvaleDeathTransition,world(a));
    assert.match(html,/Final Heart lost after Poison/);assert.doesNotMatch(html,/Current resources|class="utilities"/);
    assert.match(html,/HearthVale remains/);
    if(player(a).data.generation===1)assert.match(html,/Sunken Square remains discovered/);
    else assert.doesNotMatch(html,/Sunken Square remains discovered/,'A successor who never learned the discovery must not reveal it through continuity');
    for(const holder of ['loc_guild','loc_town_hall'])assert.ok(!heldInformation(world(a),holder).some(c=>c.claim.subject===player(a).id&&c.claim.value?.kind==='death'));
    a.beginSuccession();b.beginSuccession();assert.equal(a.save(),b.save());
    const candidates=world(a).globals.hearthvaleDeathTransition.candidates;assert.equal(candidates.length,3);
    b=reload(b);assert.deepEqual(world(b).globals.hearthvaleDeathTransition.candidates,candidates);
    const rng=a.snapshot().random;a.chooseSuccessor(candidates[0].id);b.chooseSuccessor(candidates[0].id);
    assert.equal(a.save(),b.save());assert.equal(a.snapshot().random,rng);
    assert.equal(player(a).data.generation,generation);assert.equal(player(a).primaryLocation,'loc_inn');
    assert.equal(player(a).lifecycle,'active');assert.equal(player(a).actor.controller,'Human');
    assert.deepEqual(world(a).globals.hearthvaleSurface.calendar,calendar);
    assert.equal(world(a).globals.hearthvaleSurface.couldHaveId,original);
    assert.deepEqual(world(a).entities[old.at(-1)].data.lifeRecord,archive);
    for(const c of candidates.slice(1))assert.equal(world(a).entities[c.id],undefined);
    assert.equal(Object.values(world(a).entities).filter(e=>e.actor?.controller==='Human').length,1);
    const selected=a.save();assert.throws(()=>a.chooseSuccessor(candidates[0].id),/unavailable/);assert.equal(a.save(),selected);
    b=reload(b);sleep(a);sleep(b);assert.equal(a.save(),b.save());b=reload(b);
    if(generation===2){a=finalHeartFixture(a);b=finalHeartFixture(b);assert.equal(a.save(),b.save());}
  }
  assert.match(archivedLives(world(a)),/Generation 1/);assert.match(archivedLives(world(a)),/Generation 2/);
  for(const id of old)assert.equal(world(a).entities[id].lifecycle,'retired');
});

test('M5E continuity projection is bounded, truthful, escaped and never grants Information',()=>{
  const world={globals:{hearthvaleSurface:{calendar:{year:2,day:7}}},entities:{auron:{lifecycle:'active',data:{templateId:'actor_auron',attributes:{resources:{hearts:1}},scars:[{templateId:'scar_lost_arm'}]}},hv_pit_1:{data:{discoveries:{square:{title:'Sunken Square'}}}}}};
  const before=JSON.stringify(world);assert.deepEqual(continuityFacts(world),['HearthVale remains in Year 2, Day 7.','Auron lives with 1 Hearts and a Lost Arm.','Sunken Square remains discovered.']);assert.equal(JSON.stringify(world),before);
  world.entities.auron.data.death={};assert.equal(continuityFacts(world)[1],'Auron is dead.');
  world.entities.hv_pit_1.data.discoveries.extra={title:'<script>'};world.entities.hv_pit_1.data.discoveries.last={title:'omitted'};
  assert.equal(continuityFacts(world).length,4);
  const actor={data:{identity:{name:'test'},death:{cause:'sanity'},lifeRecord:{name:'test',generation:1,death:{cause:'sanity',year:2,day:7},facts:[]}}};
  assert.match(deathView(actor,{status:'succession-ready'},world),/&lt;script&gt;/);
  assert.doesNotMatch(deathView(actor,{status:'completion-pending'},world),/HearthVale remains/);
});
