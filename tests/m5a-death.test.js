import test from 'node:test';
import assert from 'node:assert/strict';
import { entered,setup,roomFixture,world,player,pit,use } from './helpers/m2-fixture.js';
import { configure,service } from './helpers/m3-fixture.js';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { derivedActorValues } from '../HearthVale_Shell/src/surface-candidates.js';
import { heldInformation } from '../HearthVale_Shell/src/information.js';
import { deathEvents } from '../HearthVale_Shell/src/death.js';
const auron=g=>Object.values(world(g).entities).find(e=>e.data?.templateId==='actor_auron');
const r=a=>a.data.attributes.resources;
function threatened(g=entered(),hearts=1){
  if(!pit(g).expedition){g.perform('Move',{location:'loc_pit_entrance'});g.perform('pit.enter');}
  return setup(g,ctx=>{roomFixture(ctx,'empty','fixture_poison');r(ctx.actor).hearts=hearts;
    r(ctx.actor).hp=1;ctx.actor.data.statuses={poison:true};});
}
const lose=g=>use(g,'pit.resolve-room');
const events=(g,type)=>Object.values(world(g).entities).filter(e=>e.event?.type===type);

test('M5A ordinary 3→2 has no Scar; 2→1 gains contextual Scar and preserves normal Floor recovery',()=>{
  let g=threatened(entered(),3);lose(g);
  assert.equal(r(player(g)).hearts,2);assert.equal(player(g).data.scars.length,0);
  assert.equal(r(player(g)).hp,Math.ceil(derivedActorValues(player(g)).maxHp/2));
  assert.equal(pit(g).expedition.roomIndex,-1);assert.equal(auron(g).data.rescueCount,undefined);
  g=threatened(g,2);const stats=structuredClone(player(g).data.attributes.baseStats);lose(g);
  assert.equal(r(player(g)).hearts,1);assert.equal(player(g).data.scars[0].templateId,'scar_poison_trauma');
  assert.deepEqual(player(g).data.attributes.baseStats,stats);
  assert.equal(player(g).data.memories.filter(m=>m.kind==='heart-loss').length,2);
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});

test('M5A unavailable protection makes final Heart death terminal and does not inform remote holders',()=>{
  let g=configure(threatened(),w=>{Object.values(w.entities).find(e=>e.data?.templateId==='actor_auron').data.protectionUnavailable=true;});
  lose(g);assert.equal(r(player(g)).hearts,0);assert.equal(player(g).lifecycle,'retired');
  assert.equal(player(g).data.death.cause,'Poison');assert.equal(player(g).primaryLocation,'hv_pit_1');
  assert.equal(pit(g).pendingFinalHeart,null);assert.equal(pit(g).expedition,null);
  assert.equal(g.serviceChoices().length,0);assert.equal(g.expeditionChoices().length,0);
  assert.throws(()=>g.perform('Move',{location:'loc_inn'}),/unavailable/);
  for(const holder of ['loc_guild','loc_town_hall','loc_inn'])assert.ok(!heldInformation(world(g),holder).some(c=>c.claim.value?.kind==='death'));
  assert.equal(events(g,'hearthvale.player-death').length,1);
});

test('M5A Sanity 1→0 dies without Heart substitution even when Auron is available',()=>{
  let g=setup(entered(),ctx=>{r(ctx.actor).sanity=1;});
  g=configure(g,w=>{r(w.entities[w.globals.hearthvaleSurface.playerId]).sanity=0;});
  assert.equal(player(g).data.death.cause,'sanity');assert.equal(r(player(g)).hearts,3);
  assert.equal(r(auron(g)).hearts,3);assert.equal(auron(g).data.rescueCount,undefined);
  assert.equal(pit(g).expedition,null);assert.equal(g.serviceChoices().length,0);
});

test('M5A rescue chain, training, severe Scar, sacrifice and subsequent death survive exact replay',()=>{
  let g=entered();
  for(let n=1;n<=3;n++){
    g=threatened(g);const before=g.save(),branch=createSurfaceGame({saved:before});
    lose(g);lose(branch);assert.equal(g.save(),branch.save());
    assert.equal(r(player(g)).hearts,1);assert.equal(r(player(g)).hp,Math.ceil(derivedActorValues(player(g)).maxHp/2));
    assert.equal(r(auron(g)).hearts,3-n);assert.equal(auron(g).data.rescueCount,n);
    assert.equal(world(g).globals.hearthvaleServices.auronTrainingUnlocked,true);
    assert.equal(events(g,'hearthvale.auron-rescue').length,n);
    assert.equal(pit(g).pendingFinalHeart,null);assert.equal(player(g).data.death,undefined);
    if(n===1)assert.equal(auron(g).data.scars.length,0);
    if(n>=2){assert.equal(auron(g).data.scars.length,1);assert.equal(auron(g).data.scars[0].label,'Lost Arm');}
    if(n===3){assert.equal(auron(g).lifecycle,'retired');assert.equal(auron(g).data.death.cause,'final-heart-rescue');}
    const after=g.save();g=createSurfaceGame({saved:after});assert.equal(g.save(),after);
    assert.equal(g.adjudicateDeath(),null);assert.equal(g.save(),after);
  }
  assert.equal(r(auron(g)).hearts,0);g=threatened(g);lose(g);
  assert.equal(r(player(g)).hearts,0);assert.ok(player(g).data.death);
  assert.equal(events(g,'hearthvale.auron-rescue').length,3);
  assert.equal(events(g,'hearthvale.player-death').length,1);
  assert.equal(Object.values(world(g).entities).filter(e=>e.data?.templateId==='actor_auron').length,1);
});

test('M5A first rescue enables real training; wounded Auron still trains, dead Auron cannot',()=>{
  let g=threatened();lose(g);
  g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];a.primaryLocation='loc_guild';r(a).xp=10;});
  assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));service(g,'train');
  g=threatened(g);lose(g);g.perform('Move',{location:'loc_guild'});
  assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));
  // Restore AP as a fixture prerequisite, not a rescue reward.
  g=configure(g,w=>{r(w.entities[w.globals.hearthvaleSurface.playerId]).ap=4;});
  g=threatened(g);lose(g);g.perform('Move',{location:'loc_guild'});
  assert.ok(!g.serviceChoices().some(c=>c.params.op==='train'));
});

test('M5A rescue knowledge belongs to witnesses and reaches Guild only through Talk',()=>{
  const g=threatened();lose(g);const id=player(g).data.deathAdjudication.id;
  assert.ok(heldInformation(world(g),player(g).id).some(e=>e.claim.key===id));
  assert.ok(heldInformation(world(g),auron(g).id).some(e=>e.claim.key===id));
  assert.ok(!heldInformation(world(g),'loc_guild').some(e=>e.claim.value?.id===id));
  g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>world(g).entities[p.actor].data.templateId==='actor_lina');
  assert.ok(heldInformation(world(g),'loc_guild').some(e=>e.claim.value?.id===id));
  assert.ok(!heldInformation(world(g),'loc_town_hall').some(e=>e.claim.value?.id===id));
});

test('M5A legacy pending save remains exact on load and explicit adjudication happens only once',()=>{
  const g=entered(),shell=createSurfaceShell();
  const runtime=createRuntime({saved:g.save(),shell:{...shell,worldProcesses:()=>[],actions:{...shell.actions,
    'fixture.pending':{resolve:()=>({effects:[{type:'data',entity:player(g).id,key:'attributes',value:{...player(g).data.attributes,
      resources:{...r(player(g)),hearts:1,hp:0}}},{type:'data',entity:'hv_pit_1',key:'expedition',value:null},
      {type:'move',entity:player(g).id,location:'loc_pit_entrance'},
      {type:'data',entity:'hv_pit_1',key:'pendingFinalHeart',value:{actor:player(g).id,expedition:'legacy',cause:'combat',day:1,floor:1}}]})}}}});
  runtime.startScene();runtime.submit({actor:player(g).id,type:'fixture.pending'});runtime.resolveScene({offscreenBudget:0});
  const before=runtime.save(),a=createSurfaceGame({saved:before}),b=createSurfaceGame({saved:before});
  assert.equal(a.save(),before);a.adjudicateDeath();b.adjudicateDeath();assert.equal(a.save(),b.save());
  const after=a.save();a.adjudicateDeath();assert.equal(a.save(),after);
  assert.equal(events(a,'hearthvale.auron-rescue').length,1);
});

test('M5A rescue requires living available Auron within the protected period; Sanity death takes precedence',()=>{
  const g=threatened();
  for(const unavailable of ['dead','incapacitated','sanity','missing','remote','completed','player-sanity']){
    const w=structuredClone(world(g)),a=w.entities[auron(g).id],p=w.entities[player(g).id];
    w.entities.hv_pit_1.data.pendingFinalHeart={actor:p.id,expedition:'test',day:1,cause:'combat'};
    if(unavailable==='dead')r(a).hearts=0;
    if(unavailable==='incapacitated')r(a).hp=0;
    if(unavailable==='sanity')r(a).sanity=0;
    if(unavailable==='missing')a.data.missing=true;
    if(unavailable==='remote')a.primaryLocation='loc_inn';
    if(unavailable==='completed')w.globals.hearthvaleCompletion={completed:true};
    if(unavailable==='player-sanity')r(p).sanity=0;
    const before=JSON.stringify(w),outcome=deathEvents(w);
    assert.equal(outcome[0].type,'hearthvale.player-death',unavailable);
    assert.equal(JSON.stringify(w),before,'adjudicator emits effects, never mutates input');
  }
  const w=structuredClone(world(g));r(w.entities[player(g).id]).hp=0;
  assert.deepEqual(deathEvents(w),[],'HP zero alone is not permanent death');
});

test('M5A already-zero Hearts settle death without a retroactive rescue or duplicated Heart loss',()=>{
  let g=entered();g=configure(g,w=>{r(w.entities[w.globals.hearthvaleSurface.playerId]).hearts=0;});
  assert.equal(player(g).data.death.cause,'heart-loss');assert.equal(r(auron(g)).hearts,3);
  const saved=g.save();g=createSurfaceGame({saved});g.adjudicateDeath();assert.equal(g.save(),saved);
  assert.equal(events(g,'hearthvale.player-death').length,1);
});

test('M5A loading an unsettled zero-Sanity save cannot Talk/heal past death before adjudication',()=>{
  const g=entered(),shell=createSurfaceShell();
  const runtime=createRuntime({saved:g.save(),shell:{...shell,worldProcesses:()=>[],actions:{...shell.actions,
    'fixture.zero':{resolve:()=>({effects:[{type:'data',entity:player(g).id,key:'attributes',value:{...player(g).data.attributes,
      resources:{...r(player(g)),sanity:0}}},{type:'data',entity:'hv_pit_1',key:'expedition',value:null},
      {type:'move',entity:player(g).id,location:'loc_guild'}]})}}}});
  runtime.startScene();runtime.submit({actor:player(g).id,type:'fixture.zero'});runtime.resolveScene({offscreenBudget:0});
  const saved=runtime.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);
  assert.deepEqual(loaded.serviceChoices(),[]);assert.deepEqual(loaded.expeditionChoices(),[]);
  assert.throws(()=>loaded.perform('Move',{location:'loc_inn'}),/unavailable/);
  loaded.adjudicateDeath();assert.equal(player(loaded).data.death.cause,'sanity');
  assert.equal(r(auron(loaded)).hearts,3);
});
