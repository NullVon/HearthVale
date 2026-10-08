import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';

// Phase 1 migrates the old fixed Floor-respawn itinerary. This route uses only
// production intentions, re-enters after defeat, and never manufactures state.
test('M6B2 production rescue, death, fresh succession and forty normal Day boundaries',()=>{
 let game=createSurfaceGame({seed:1}),twin=null;
 const boundaries=[],checkpoints=[];
 const world=()=>game.snapshot().world;
 const state=()=>world().globals.hearthvaleSurface;
 const player=()=>world().entities[state().playerId];
 const pit=()=>world().entities.hv_pit_1.data;
 const auron=()=>world().entities.hv_actor_1;
 const events=type=>Object.values(world().entities).filter(e=>e.event?.type===type);
 function checkpoint(label){
  const saved=game.save();twin=game;game=createSurfaceGame({saved});
  assert.equal(game.save(),saved,label);checkpoints.push(label);
 }
 function invoke(method,...args){
  game[method](...args);
  if(twin){twin[method](...args);assert.equal(game.save(),twin.save(),'exact next production transition');twin=null;}
  assert.equal(pit().guardianFirstClear,undefined);
 }
 const act=(type,params={})=>invoke('perform',type,params);
 function travel(location){act('Move',{location:'loc_surface'});act('Move',{location});}
 function sleep(){
  const day=state().calendar.day;act('surface.sleep',{day,confirmed:true});boundaries.push(day);
  assert.equal(events('hearthvale.weekly-reconcile').length,Math.floor(day/5));
  assert.equal(state().calendar.day,Math.min(day+1,40));
 }
 for(let i=0;i<5;i++)invoke('openingNext');
 assert.equal(state().candidates.length,3);invoke('choose','hv_actor_8');
 act('surface.arrive');act('surface.answer-mira',{response:'heading'});act('surface.finish-mira');
 travel('loc_shop');
 const chest=game.serviceChoices().find(c=>c.params.op==='sell'&&c.params.container==='chest');
 assert.ok(chest);act(chest.type,chest.params);checkpoint('early Surface');
 // Underprotected bare-handed adventuring exercises failed runs and
 // all three Auron rescues before final death, even when weapons wear out.
 let rescues=0;
 for(let n=0;!player().data.death;n++){
  assert.ok(n<800,'bounded production life');
  assert.ok(state().calendar.day<40);
  if(!pit().expedition){
   if((auron().data.rescueCount??0)>rescues){
    rescues=auron().data.rescueCount;
    assert.equal(auron().data.attributes.resources.hearts,3-rescues);
    checkpoint(`after rescue ${rescues}`);
   }
   if(rescues===1)assert.equal(world().globals.hearthvaleServices.auronTrainingUnlocked,true);
   if(player().data.attributes.resources.ap<1){travel('loc_inn');sleep();}
   travel('loc_pit_entrance');act('pit.enter');
  }
  const choices=game.expeditionChoices();
  assert.ok(!choices.some(c=>c.type==='pit.combat-next'||c.params.mode==='none'));
  const choice=choices.find(c=>c.type==='pit.unarmed')
   ?? choices.find(c=>c.type==='pit.defend'&&c.params.mode==='dodge')
   ?? choices.find(c=>c.type==='pit.move')
   ?? choices.find(c=>c.type==='pit.loot'&&c.params.choice==='leave')
   ?? choices.find(c=>c.type==='pit.resolve-room')
   ?? choices.find(c=>c.type==='pit.forward'&&pit().expedition.floor.number<9)
   ?? choices.find(c=>c.type==='pit.return');
  assert.ok(choice,JSON.stringify(choices));act(choice.type,choice.params);
 }
 assert.equal(auron().data.rescueCount,3);assert.equal(auron().lifecycle,'retired');
 assert.ok(auron().data.scars.some(s=>s.label==='Lost Arm'));
 const dead=player(),archive=structuredClone(dead.data.lifeRecord),couldHave=state().couldHaveId,day=state().calendar.day;
 assert.equal(dead.lifecycle,'retired');assert.ok(archive);
 assert.equal(world().globals.hearthvaleDeathTransition.status,'succession-ready');
 assert.throws(()=>game.perform('Move',{location:'loc_inn'}));checkpoint('death takeover');
 invoke('beginSuccession');const candidates=world().globals.hearthvaleDeathTransition.candidates;
 assert.equal(candidates.length,3);checkpoint('three successors');
 const prior=world();invoke('chooseSuccessor',candidates[0].id);
 assert.equal(player().data.generation,2);assert.equal(state().calendar.day,day);
 assert.equal(state().couldHaveId,couldHave);assert.equal(player().primaryLocation,'loc_inn');
 assert.equal(player().data.attributes.resources.gold,45);assert.equal(player().data.attributes.resources.xp,0);
 assert.equal(player().data.training,undefined);assert.equal(player().data.memories,undefined);assert.deepEqual(player().data.scars,[]);
 assert.equal(Object.values(world().entities).filter(e=>e.actor?.controller==='Human').length,1);
 for(const [id,entity] of Object.entries(prior.entities)){
  const expected=structuredClone(entity);if(id===dead.id)expected.actor.controller='Autonomous';
  assert.deepEqual(world().entities[id],expected,`persistent entity ${id}`);
 }
 for(const [key,value] of Object.entries(prior.globals))if(!['hearthvaleSurface','hearthvaleDeathTransition'].includes(key))assert.deepEqual(world().globals[key],value,key);
 checkpoint('successor Surface');
 travel('loc_shop');act('service.act',{op:'buy',item:'item_hp_potion_basic'});travel('loc_inn');
 while(state().calendar.day<40){sleep();if([20,21,31,40].includes(state().calendar.day))checkpoint(`Day ${state().calendar.day}`);}
 checkpoint('Day 40 playable');sleep();
 const final=world();assert.equal(final.globals.hearthvaleCompletion.reason,'chapter');
 assert.equal(final.globals.hearthvaleCompletion.completedDays,40);
 assert.deepEqual(boundaries,Array.from({length:40},(_,i)=>i+1));
 for(const [type,count] of [['auron-rescue',3],['player-death',1],['successor-candidates-generated',1],['successor-selected',1],['demo-completed',1],['weekly-reconcile',8]])assert.equal(events(`hearthvale.${type}`).length,count,type);
 assert.deepEqual(final.entities[dead.id].data.lifeRecord,archive);
 assert.ok(events('hearthvale.weekly-reconcile').at(-1).event.boundary<events('hearthvale.demo-completed')[0].event.boundary);
 checkpoint('final completion');assert.deepEqual(game.serviceChoices(),[]);assert.deepEqual(game.expeditionChoices(),[]);
 const saved=game.save();assert.throws(()=>game.perform('surface.sleep',{day:40,confirmed:true}));assert.equal(game.save(),saved);
 console.log('M6B2 Phase 1 production checkpoints',checkpoints);
});
