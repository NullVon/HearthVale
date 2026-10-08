import test from 'node:test';
import assert from 'node:assert/strict';
import { entered,setup,roomFixture,world,player,pit,use } from './helpers/m2-fixture.js';
import { configure,surfaceFixture,service } from './helpers/m3-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { trainingRequirement } from '../HearthVale_Shell/src/training.js';
import { serviceView } from '../HearthVale_UI/service-views.js';
import { surfaceLocation } from '../HearthVale_UI/surface-views.js';
import { pitEntrance } from '../HearthVale_UI/expedition-views.js';
import { progressionCheckpoint,importantProgress,persistProgress } from '../HearthVale_UI/save-feedback.js';
const r=a=>a.data.attributes.resources;
const state=g=>world(g).globals.hearthvaleServices;
const view=g=>serviceView(world(g),player(g),g.serviceChoices());
const checkpoint=g=>progressionCheckpoint(world(g));
function loss(g=entered()) {
  if(!pit(g).expedition){g.perform('Move',{location:'loc_pit_entrance'});g.perform('pit.enter');}
  g=setup(g,ctx=>{roomFixture(ctx,'empty','fixture_poison');r(ctx.actor).hp=1;r(ctx.actor).xp=10;ctx.actor.data.statuses={poison:true};});
  use(g,'pit.resolve-room');return g;
}
const guild=mutate=>surfaceFixture((w,a)=>{
  a.primaryLocation='loc_guild';w.globals.hearthvaleServices.auronTrainingUnlocked=true;
  mutate?.(w,a);
});

test('Phase 5 first Heart loss announces unlock and route; return, reload and later losses preserve it once',()=>{
  const before=surfaceFixture((w,a)=>{a.primaryLocation='loc_guild';});
  assert.ok(!before.serviceChoices().some(c=>c.params.op==='train'));
  assert.match(view(before),/not yet unlocked/);
  const initial=entered(), mark=checkpoint(initial);let g=loss(initial);
  assert.equal(r(player(g)).hearts,2);assert.equal(player(g).primaryLocation,'loc_pit_entrance');
  assert.equal(player(g).data.statuses.poison,undefined);assert.equal(pit(g).expedition,null);
  assert.equal(state(g).auronTrainingUnlocked,true);assert.equal(importantProgress(mark,checkpoint(g)),true);
  const html=pitEntrance(world(g),player(g),g.expeditionChoices());
  assert.match(html,/<h2>Training with Auron unlocked<\/h2>/);
  assert.match(html,/Guardian Adventurer/);assert.match(html,/Choose Leave, then Guild/);
  const saved=g.save();g=createSurfaceGame({saved});g.resumeFlow();assert.equal(g.save(),saved);
  g.perform('Move',{location:'loc_surface'});assert.match(surfaceLocation(world(g),player(g)),/Guild — Training with Auron/);
  g.perform('Move',{location:'loc_guild'});assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));
  assert.match(view(g),/Guardian Adventurer/);assert.match(view(g),/Come train with me/);
  const secondBefore=checkpoint(g);g=loss(g);
  assert.equal(r(player(g)).hearts,1);assert.doesNotMatch(pit(g).lastResult.text,/Training with Auron unlocked/);
  assert.notEqual(pit(g).lastResult.trainingUnlocked,true);assert.equal(importantProgress(secondBefore,checkpoint(g)),false);
  g.perform('Move',{location:'loc_guild'});assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));
});

test('Phase 5 training reports unchanged cost, session progress and completed stat/Level progression',()=>{
  for(const complete of [false,true]){
    let g=guild();const choice=g.serviceChoices().find(c=>c.params.op==='train'),stat=choice.params.stat;
    g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];
      a.data.attributes.traits=['trait_curious'];a.data.attributes.baseStats[stat]=3;
      a.data.training={used:[],progress:{[stat]:complete?trainingRequirement(a,stat)-1:0}};
    });
    const before=structuredClone(player(g)),mark=checkpoint(g);
    assert.match(view(g),/Current XP: 50/);assert.match(view(g),/sessions toward \+1/);
    service(g,'train',p=>p.stat===stat);
    assert.equal(r(player(g)).xp,r(before).xp-2);assert.equal(r(player(g)).ap,r(before).ap-1);
    assert.match(view(g),/Spent 2 XP and 1 AP/);assert.match(view(g),/Current XP: 48/);
    if(complete){assert.equal(player(g).data.attributes.baseStats[stat],4);assert.match(view(g),/increased: 3 → 4/);assert.match(view(g),/Level increased/);}
    else {assert.equal(player(g).data.attributes.baseStats[stat],3);assert.match(view(g),/progress: 1\/4 sessions/);}
    assert.equal(importantProgress(mark,checkpoint(g),{command:'service',value:JSON.stringify(choice.params)}),true);
    const saved=g.save();const loaded=createSurfaceGame({saved});loaded.resumeFlow();assert.equal(loaded.save(),saved);
    assert.ok(!loaded.serviceChoices().some(c=>c.params.op==='train'&&c.params.stat===stat));
  }
});

test('Phase 5 Guild explains actual unavailable state without changing training eligibility',()=>{
  for(const [mutate,reason] of [
    [(w,a)=>{r(a).xp=1;},/You need 2 XP/],
    [(w,a)=>{r(a).ap=0;},/You need 1 AP/],
    [(w,a)=>{for(const stat of Object.keys(a.data.attributes.baseStats))a.data.attributes.baseStats[stat]=6;},/No further sessions/],
    [(w,a)=>{a.data.training={progress:{},used:['STR','DEX','CON','INT','WIS','CHA'].map(s=>`${w.globals.hearthvaleSurface.calendar.day}:${s}`)};},/No further sessions/],
    [(w)=>{Object.values(w.entities).find(a=>a.data?.templateId==='actor_auron').primaryLocation='loc_inn';},/Auron is unavailable/],
  ]){const g=guild(mutate);assert.ok(!g.serviceChoices().some(c=>c.params.op==='train'));const saved=g.save();assert.match(view(g),reason);assert.equal(g.save(),saved);}
});

test('Phase 5 important saves and manual saves confirm only after successful existing save writes',()=>{
  const g=loss(), writes=new Map(), messages=[];
  const storage={setItem:(key,value)=>writes.set(key,value)};
  assert.equal(persistProgress(g,storage,'auto',m=>messages.push(m),true),true);
  assert.deepEqual(messages,['Progress saved.']);
  const loaded=createSurfaceGame({saved:writes.get('auto')});assert.equal(loaded.save(),g.save());
  loaded.perform('Move',{location:'loc_guild'});service(loaded,'train');
  persistProgress(loaded,storage,'auto',m=>messages.push(m),true);
  assert.equal(createSurfaceGame({saved:writes.get('auto')}).save(),loaded.save());
  persistProgress(loaded,storage,'manual',m=>messages.push(m),true);
  assert.equal(writes.get('manual'),loaded.save());assert.equal(messages.length,3);
  persistProgress(loaded,storage,'auto',m=>messages.push(m));assert.equal(messages.length,3);
  const failing=[];assert.equal(persistProgress(loaded,{setItem(){throw Error('Quota');}},'auto',m=>failing.push(m),true),false);
  assert.equal(failing.length,1);assert.match(failing[0],/could not save/);assert.doesNotMatch(failing[0],/Progress saved/);
  assert.equal(importantProgress(checkpoint(loaded),checkpoint(loaded),{command:'move'}),false);
  assert.equal(importantProgress(progressionCheckpoint(),checkpoint(loaded)),false);
});

test('Phase 5 legacy pending introduction loads exactly and still unlocks on Guild arrival',()=>{
  let g=surfaceFixture((w,a)=>{a.primaryLocation='loc_inn';w.globals.hearthvaleServices.auronTrainingPending=true;});
  const saved=g.save();g=createSurfaceGame({saved});assert.equal(g.save(),saved);
  g.perform('Move',{location:'loc_guild'});assert.equal(state(g).auronTrainingUnlocked,true);
  assert.ok(g.serviceChoices().some(c=>c.params.op==='train'));
});

test('Phase 5 actual UI dispatch autosaves unlock/training and reports storage failure honestly',async()=>{
  const ready=setup(entered(),ctx=>{roomFixture(ctx,'empty','fixture_poison');r(ctx.actor).hp=1;r(ctx.actor).xp=10;ctx.actor.data.statuses={poison:true};});
  const auto='hearthvale.surface.autosave.v1',manual='hearthvale.surface.save.v1';
  const slots=new Map([[auto,ready.save()]]),status={textContent:''};let click,fail=false;
  const app={innerHTML:'',addEventListener:(type,fn)=>{if(type==='click')click=fn;},querySelectorAll:()=>[],querySelector:()=>null};
  const mocks={document:{querySelector:s=>s==='#app'?app:status,body:{dataset:{}},documentElement:{classList:{contains:()=>false,toggle(){}}}},
    window:{addEventListener(){},scrollTo(){}},ResizeObserver:class{observe(){}},
    localStorage:{getItem:key=>slots.get(key),setItem:(key,value)=>{if(fail)throw Error('Quota');slots.set(key,value);}}};
  const originals=Object.fromEntries(Object.keys(mocks).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const dispatch=(command,value)=>click({target:{closest:()=>({dataset:{command,value},textContent:command})}});
  const savedGame=()=>createSurfaceGame({saved:slots.get(auto)});
  try{
    for(const [key,value]of Object.entries(mocks))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    await import('../HearthVale_UI/surface.js');
    dispatch('continue');
    const resolve=ready.expeditionChoices().find(c=>c.type==='pit.resolve-room');
    dispatch('expedition',JSON.stringify({type:resolve.type,params:resolve.params}));
    assert.equal(status.textContent,'Progress saved.');assert.equal(state(savedGame()).auronTrainingUnlocked,true);
    assert.match(app.innerHTML,/<h2>Training with Auron unlocked/);
    dispatch('move','loc_guild');assert.equal(status.textContent,'Progress saved.');
    const choice=savedGame().serviceChoices().find(c=>c.params.op==='train');
    dispatch('service',JSON.stringify(choice.params));assert.equal(status.textContent,'Progress saved.');
    assert.equal(r(player(savedGame())).xp,8);assert.match(app.innerHTML,/training completed with Auron/);
    dispatch('save');assert.equal(status.textContent,'Progress saved.');assert.equal(slots.get(manual),slots.get(auto));
    dispatch('move','loc_surface');assert.equal(status.textContent,'');
    dispatch('move','loc_guild');assert.equal(status.textContent,'');
    const persisted=slots.get(auto);fail=true;
    dispatch('service',JSON.stringify(savedGame().serviceChoices().find(c=>c.params.op==='train').params));
    assert.match(status.textContent,/could not save/);assert.doesNotMatch(status.textContent,/Progress saved/);
    assert.equal(slots.get(auto),persisted);assert.match(app.innerHTML,/Current XP: 6/);
  }finally{
    for(const [key,descriptor]of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});
