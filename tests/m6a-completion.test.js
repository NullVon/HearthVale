import test from 'node:test';
import assert from 'node:assert/strict';
import { bruteFixture,chapterFixture,death40Fixture,world,player,use,configure } from './helpers/m6-fixture.js';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { sleep,apply } from './helpers/m4-fixture.js';
import { completionReason } from '../HearthVale_Shell/src/completion.js';
import { autonomousChoices } from '../HearthVale_Shell/src/day-autonomy.js';
import { resolveAutonomousPit } from '../HearthVale_Shell/src/autonomous-pit.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { completionView } from '../HearthVale_UI/completion-views.js';
import { byId } from '../HearthVale_Content/expedition.js';
const completion=g=>world(g).globals.hearthvaleCompletion;
const events=(g,type)=>Object.values(world(g).entities).filter(e=>e.event?.type===type);
function exact(g) {
  const saved=g.save();
  for(let i=0;i<3;i++){
    g=createSurfaceGame({saved:g.save()});assert.equal(g.save(),saved);
    assert.equal(g.adjudicateDeath(),null);assert.equal(g.save(),saved);
  }
  return g;
}
function blocked(g) {
  const saved=g.save();assert.deepEqual(g.expeditionChoices(),[]);assert.deepEqual(g.serviceChoices(),[]);
  for(const fn of [()=>g.perform('Move',{location:'loc_inn'}),()=>sleep(g),()=>g.perform('pit.enter'),
    ()=>g.beginSuccession(),()=>g.chooseSuccessor('bogus'),()=>g.openingNext()])assert.throws(fn);
  assert.equal(g.save(),saved);
}

test('M6A player Brute first-clear settles rewards, record and progression before one shared ending',()=>{
  const g=bruteFixture(),before=player(g),r=before.data.attributes.resources;
  use(g,'pit.attack',c=>c.params.slot===0);
  const w=world(g),p=w.entities.hv_pit_1.data,c=completion(g);
  assert.equal(c.reason,'ruin-brute');assert.equal(c.firstClear.actor,before.id);assert.equal(c.completedDays,0);
  assert.equal(player(g).data.attributes.resources.xp,r.xp+byId('enemies','enemy_ruin_brute').xp);
  assert.equal(player(g).data.death,undefined);assert.equal(p.expedition.combat,null);
  assert.match(p.expedition.lastResult.text,/Victory/);assert.ok(p.expedition.lastResult.rewards.length);
  assert.deepEqual(p.guardianFirstClear,c.firstClear);assert.equal(p.strata[0].cleared,true);
  assert.equal(p.strata[0].waystoneUnlocked,true);assert.equal(p.strata[1].locked,false);assert.equal(p.strata[1].playable,false);
  assert.equal(events(g,'hearthvale.demo-completed').length,1);
  assert.ok(events(g,'hearthvale.pit.attack')[0].event.boundary<events(g,'hearthvale.demo-completed')[0].event.boundary);
  blocked(g);exact(g);
});

test('M6A exact immediately-before-Brute saves replay identical terminal world, rewards and RNG',()=>{
  const a=bruteFixture();let b=createSurfaceGame({saved:a.save()});assert.equal(b.save(),a.save());
  use(a,'pit.attack',c=>c.params.slot===0);use(b,'pit.attack',c=>c.params.slot===0);
  assert.equal(a.save(),b.save());b=exact(b);assert.equal(events(b,'hearthvale.demo-completed').length,1);
});

test('M6A Day 39 completes without ending; Day 40 remains playable until confirmed sleep',()=>{
  const g=chapterFixture(39);sleep(g);assert.equal(completion(g),undefined);
  assert.equal(world(g).globals.hearthvaleSurface.calendar.day,40);
  g.perform('Move',{location:'loc_shop'});assert.ok(g.serviceChoices().length);
  g.perform('Move',{location:'loc_pit_entrance'});assert.ok(g.expeditionChoices().some(c=>c.type==='pit.enter'));
  g.perform('Move',{location:'loc_inn'});assert.equal(completion(g),undefined);
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
  sleep(g);assert.equal(completion(g).reason,'chapter');blocked(g);
});

test('M6A completed Day 40 runs ordinary boundary and Week 8 once, never exposes playable Day 41',()=>{
  const a=chapterFixture();const b=createSurfaceGame({saved:a.save()});sleep(a);sleep(b);
  assert.equal(a.save(),b.save());const w=world(a);
  assert.equal(completion(a).completedDays,40);assert.equal(w.globals.hearthvaleSurface.calendar.day,40);
  assert.equal(w.globals.hearthvaleSurface.calendar.week,8);
  assert.equal(w.globals.hearthvaleSituationBoundary,41);assert.equal(w.globals.hearthvaleSituationDay,41);
  assert.equal(w.globals.hearthvaleWeekly.lastCompletedDay,40);
  assert.equal(w.globals.hearthvaleWeekly.snapshots.filter(s=>s.week===8).length,1);
  assert.equal(events(a,'hearthvale.weekly-reconcile').length,1);
  assert.equal(events(a,'hearthvale.demo-completed').length,1);exact(a);blocked(a);
});

test('M6A terminal Day-40 death archives before final history, never heals or generates successors',()=>{
  const a=death40Fixture(),b=createSurfaceGame({saved:a.save()}),before=world(a);
  use(a,'pit.resolve-room');use(b,'pit.resolve-room');assert.equal(a.save(),b.save());
  const w=world(a),p=player(a);assert.equal(p.lifecycle,'retired');assert.equal(p.data.death.cause,'Poison');
  assert.equal(p.data.lifeRecord.death.day,40);assert.equal(p.data.attributes.resources.hearts,0);
  assert.equal(p.data.attributes.resources.hp,0);assert.equal(completion(a).reason,'chapter');
  assert.equal(completion(a).death,p.data.death.id);assert.equal(w.globals.hearthvaleWeekly.lastCompletedDay,40);
  assert.equal(w.globals.hearthvaleSurface.nextActorInstance,before.globals.hearthvaleSurface.nextActorInstance);
  assert.equal(w.globals.hearthvaleDeathTransition.candidates,undefined);
  assert.equal(events(a,'hearthvale.successor-candidates-generated').length,0);
  assert.ok(events(a,'hearthvale.player-death')[0].event.boundary<events(a,'hearthvale.weekly-reconcile')[0].event.boundary);
  assert.match(completionView(w),/Life Record/);assert.match(completionView(w),/Final Heart lost after Poison/);
  exact(a);blocked(a);
});

test('M6A Brute first-clear on Day 40 has precedence without manufacturing a completed Day',()=>{
  const g=bruteFixture(40);use(g,'pit.attack',c=>c.params.slot===0);
  assert.equal(completion(g).reason,'ruin-brute');assert.equal(completion(g).completedDays,39);
  assert.equal(events(g,'hearthvale.weekly-reconcile').length,0);exact(g);
});

test('M6A autonomous pre-first-clear eligibility cannot finish player progression or demo',()=>{
  const g=chapterFixture(),w=world(g),rook=w.entities.hv_actor_2;
  assert.ok(!autonomousChoices(w,rook,economyState(w)).some(c=>c.op==='guardian-repeat'));
  assert.throws(()=>resolveAutonomousPit(w,rook,{op:'guardian-repeat',params:{week:8}},new Set()),/unavailable/);
  assert.equal(completionReason(w,w),null);assert.equal(completion(g),undefined);
});

test('M6A autonomous post-clear victory preserves its Actor credit without demo completion',()=>{
  // Existing historical clear, not a new player victory: no load-time migration.
  let g=configure(chapterFixture(6),w=>{
    const p=w.entities.hv_pit_1.data;p.guardianFirstClear={actor:w.globals.hearthvaleSurface.playerId,day:1,year:1};
    p.guardianDefeated=structuredClone(p.guardianFirstClear);p.strata[0].cleared=true;p.strata[0].waystoneUnlocked=true;
    p.strata[1].locked=false;w.entities.hv_actor_2.primaryLocation='loc_guild';
  });
  const before=world(g);g=apply(g,w=>{
    const next=structuredClone(w),actor=next.entities.hv_actor_2;
    return [...resolveAutonomousPit(next,actor,{op:'guardian-repeat',params:{week:2}},new Set()),
      {type:'data',entity:actor.id,key:'memories',value:actor.data.memories}];
  });
  assert.equal(world(g).entities.hv_pit_1.data.guardianVictories.at(-1).actor,'hv_actor_2');
  assert.equal(completionReason(before,world(g)),null);assert.equal(completion(g),undefined);
  g.perform('Move',{location:'loc_shop'});assert.equal(completion(g),undefined);
  const viewWorld=structuredClone(world(g));viewWorld.globals.hearthvaleCompletion={completed:true,reason:'chapter',completedDays:40};
  assert.match(completionView(viewWorld),/Rook recorded a later Ruin Brute victory/);
  assert.match(completionView(viewWorld),new RegExp(`${player(g).data.identity.name} holds the first-clear record`));
});

test('M6A shared presentation uses actual credit, escapes names and has no gameplay or grading controls',()=>{
  const brute=bruteFixture();use(brute,'pit.attack',c=>c.params.slot===0);
  const day=chapterFixture();sleep(day);
  for(const g of [brute,day]){
    const w=structuredClone(world(g)),a=w.entities[w.globals.hearthvaleSurface.playerId];a.data.identity.name='<script>credit</script>';
    const html=completionView(w);assert.match(html,/<h1>Demo complete<\/h1>/);
    assert.match(html,/Thank you for completing the demo\./);assert.doesNotMatch(html,/<script>|class="hud"|class="utilities"|data-command="move"|score|letter grade|performance tier|good ending|bad ending/i);
    assert.match(html,/Return to Title/);assert.match(html,/data-command="save"/);
  }
  assert.match(completionView(world(brute)),new RegExp(player(brute).data.identity.name));
  assert.match(completionView(world(day)),/Ruin Brute remains undefeated/);
});

test('M6A completion retains exactly the ordinary Day-40 Actor, Situation, economy, weekly and RNG results',()=>{
  const g=chapterFixture(),runtime=createRuntime({saved:g.save(),shell:createSurfaceShell()});
  runtime.startScene();runtime.submit({actor:player(g).id,type:'surface.sleep',params:{confirmed:true,day:40}});
  runtime.resolveScene({offscreenBudget:0});const ordinary=runtime.snapshot();sleep(g);
  const final=g.snapshot();assert.equal(final.random,ordinary.random);
  for(const entity of Object.values(ordinary.world.entities))
    if(entity.actor||entity.situation)assert.deepEqual(final.world.entities[entity.id],entity);
  for(const key of ['hearthvaleServices','hearthvaleWeekly','hearthvaleSituationBoundary','hearthvaleSituationDay'])
    assert.deepEqual(final.world.globals[key],ordinary.world.globals[key]);
});

test('M6A Day-40 rescue is still survival; later sleep closes Chapter, while Sanity death archives immediately',()=>{
  let rescued=configure(death40Fixture(),w=>{
    Object.values(w.entities).find(a=>a.data?.templateId==='actor_auron').data.protectionUnavailable=false;
  });
  use(rescued,'pit.resolve-room');assert.equal(completion(rescued),undefined);
  assert.equal(player(rescued).data.death,undefined);assert.equal(player(rescued).data.attributes.resources.hearts,1);
  rescued.perform('Move',{location:'loc_inn'});sleep(rescued);assert.equal(completion(rescued).reason,'chapter');
  const sanity=configure(chapterFixture(),w=>{
    w.entities[w.globals.hearthvaleSurface.playerId].data.attributes.resources.sanity=0;
  });
  // Fixture Core settlement archives the death. A legacy archived Day-40 snapshot
  // must remain exact on load; explicit resume completes its final boundary.
  assert.equal(player(sanity).data.death.cause,'sanity');
  sanity.adjudicateDeath();assert.equal(completion(sanity).reason,'chapter');exact(sanity);
});

test('M6A Chapter ending retains prior generations and their actual Life Records',()=>{
  let g=configure(death40Fixture(),w=>{w.globals.hearthvaleSurface.calendar.day=39;});
  use(g,'pit.resolve-room');const predecessor=player(g),record=predecessor.data.lifeRecord;
  g.beginSuccession();g.chooseSuccessor(world(g).globals.hearthvaleDeathTransition.candidates[0].id);
  g=configure(g,w=>{w.globals.hearthvaleSurface.calendar={year:1,day:40,week:8};});sleep(g);
  assert.equal(player(g).data.generation,2);assert.equal(player(g).data.death,undefined);
  assert.deepEqual(world(g).entities[predecessor.id].data.lifeRecord,record);
  const html=completionView(world(g));assert.match(html,new RegExp(`Generation 1 — ${record.name}`));
  assert.match(html,/Final Heart lost after Poison/);assert.match(html,/Ruin Brute remains undefeated/);exact(g);
});
