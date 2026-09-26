import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { knowledgeState } from '../HearthVale_Shell/src/information.js';

// Companion to the real browser campaign. No fixture helpers, raw effects,
// manufactured resources, clock jumps, injected death or terminal snapshots.
test('M6B2 production rescue, death, fresh succession and forty normal Day boundaries',()=>{
 let game=createSurfaceGame({seed:1}),twin=null,commands=0;
 const checkpoints=[],boundaries=[],rescues=[],seenRescues=new Set();
 const world=()=>game.snapshot().world;
 const state=()=>world().globals.hearthvaleSurface;
 const player=()=>world().entities[state().playerId];
 const pit=()=>world().entities.hv_pit_1.data;
 const auron=()=>world().entities.hv_actor_1;
 const events=(type)=>Object.values(world().entities).filter(e=>e.event?.type===type);
 function checkpoint(label){
  const saved=game.save();twin=game;game=createSurfaceGame({saved});
  assert.equal(game.save(),saved,label);checkpoints.push({label,day:state().calendar.day,bytes:Buffer.byteLength(saved)});
 }
 function invoke(method,...args){
  game[method](...args);commands++;
  if(twin){twin[method](...args);assert.equal(game.save(),twin.save(),'exact next production transition');twin=null;}
  const a=auron();
  if(a.data.rescueCount&&!seenRescues.has(a.data.rescueCount)){
   seenRescues.add(a.data.rescueCount);rescues.push({count:a.data.rescueCount,day:state().calendar.day,hearts:a.data.attributes.resources.hearts});
  }
  assert.equal(pit().guardianFirstClear,undefined,'Brute must remain uncleared throughout');
 }
 const act=(type,params={})=>invoke('perform',type,params);
 function travel(location){act('Move',{location:'loc_surface'});act('Move',{location});}
 function service(op,params={}){act('service.act',{op,...params});}
 function talk(id){service('talk',{actor:`hv_actor_${id}`});}
 function sleep(){
  const day=state().calendar.day;act('surface.sleep',{day,confirmed:true});boundaries.push(day);
  const w=world(),weeks=Math.floor(day/5);
  assert.equal(events('hearthvale.weekly-reconcile').length,weeks);
  assert.equal(w.globals.hearthvaleWeekly?.snapshots.length??0,weeks);
  assert.equal(state().calendar.day,Math.min(day+1,40));
  assert.equal(!!w.globals.hearthvaleCompletion,day===40);
 }
 // These are the browser's deliberately underprotected choices. Selection is
 // from the production legal-action list, never from hidden future Rooms.
 function advanceUntil(done,limit=200){
  for(let i=0;!done();i++){
   assert.ok(i<limit,'bounded production route');
   const choices=game.expeditionChoices(),e=pit().expedition;
   assert.ok(e,'expected active expedition');assert.ok(e.floor.number<10,'do not enter Guardian route');
   const priority=[c=>c.type==='pit.combat-next',c=>c.type==='pit.defend'&&c.params.mode==='none',
    c=>c.type==='pit.attack'&&c.label.startsWith('Attack: Sword'),
    c=>c.type==='pit.defend'&&c.label==='Block with Hammer',c=>c.type==='pit.defend'&&c.params.mode==='dodge',
    c=>c.type==='pit.resolve-room'&&(['inspect','primary','choice_injured_adventurer_return','choice_abandoned_camp_evidence'].includes(c.params.approach)||c.label==='Force the door'),
    c=>c.type==='pit.forward'];
   const choice=priority.map(f=>choices.find(f)).find(Boolean);
   assert.ok(choice,`unhandled legal choices: ${JSON.stringify(choices)}`);
   if(player().data.attributes.resources.hearts===1&&player().data.attributes.resources.hp<=5&&!checkpoints.some(c=>c.label===`threat-${auron().data.rescueCount??0}`))checkpoint(`threat-${auron().data.rescueCount??0}`);
   act(choice.type,choice.params);
  }
 }
 for(let i=0;i<5;i++)invoke('openingNext');assert.equal(state().candidates.length,3);
 invoke('choose','hv_actor_8');assert.equal(state().couldHaveId,'hv_actor_7');
 act('surface.arrive');act('surface.answer-mira',{response:'heading'});act('surface.finish-mira');
 travel('loc_shop');service('buy',{item:'item_sword'});
 const sellChest=game.serviceChoices().find(c=>c.params.op==='sell'&&c.params.container==='chest');assert.ok(sellChest);act(sellChest.type,sellChest.params);
 service('swap',{bag:1,slot:2});checkpoint('early Surface');travel('loc_pit_entrance');act('pit.enter');
 advanceUntil(()=>auron().data.rescueCount===1);
 assert.equal(player().data.attributes.resources.hearts,1);assert.equal(auron().data.attributes.resources.hearts,2);
 assert.equal(world().globals.hearthvaleServices.auronTrainingUnlocked,true);checkpoint('after first rescue');
 travel('loc_guild');talk(1);talk(5);travel('loc_inn');sleep();
 travel('loc_pit_entrance');act('pit.enter');
 advanceUntil(()=>pit().expedition?.floor.number===4&&pit().expedition.roomIndex===-1);
 act('pit.return');assert.equal(pit().expedition,null);
 travel('loc_guild');service('train',{stat:'INT'});assert.equal(player().data.training.progress.INT,1);talk(5);
 travel('loc_inn');for(let i=0;i<4;i++)sleep();checkpoint('first weekly boundary');
 travel('loc_guild');talk(5);travel('loc_shop');service('buy',{item:'item_hammer'});service('swap',{bag:1,slot:3});
 travel('loc_pit_entrance');act('pit.enter');advanceUntil(()=>auron().data.rescueCount===2);
 assert.equal(auron().data.attributes.resources.hearts,1);assert.ok(auron().data.scars.some(s=>s.label==='Lost Arm'));
 travel('loc_guild');talk(5);travel('loc_pit_entrance');act('pit.enter',{shortcut:true});advanceUntil(()=>auron().data.rescueCount===3);
 assert.equal(auron().lifecycle,'retired');assert.equal(auron().data.attributes.resources.hearts,0);
 travel('loc_guild');talk(5);travel('loc_inn');sleep();
 travel('loc_pit_entrance');act('pit.enter',{shortcut:true});checkpoint('before terminal expedition');
 advanceUntil(()=>!!player().data.death);
 const dead=player(),before=world(),archive=structuredClone(dead.data.lifeRecord),originalCouldHave=state().couldHaveId;
 assert.equal(dead.data.identity.name,'Nessa');assert.equal(dead.data.death.cause,'combat');assert.equal(dead.data.death.floor,4);
 assert.equal(state().calendar.day,7);assert.equal(dead.lifecycle,'retired');assert.ok(archive);
 assert.equal(before.globals.hearthvaleDeathTransition.status,'succession-ready');assert.deepEqual(game.expeditionChoices(),[]);
 assert.throws(()=>game.perform('Move',{location:'loc_inn'}));checkpoint('death takeover');
 invoke('beginSuccession');const candidates=world().globals.hearthvaleDeathTransition.candidates;assert.equal(candidates.length,3);
 checkpoint('three successor candidates');const prior=world();invoke('chooseSuccessor',candidates[0].id);
 assert.equal(player().data.identity.name,'Elias');assert.equal(player().data.generation,2);assert.equal(state().calendar.day,7);
 assert.equal(state().couldHaveId,originalCouldHave);assert.equal(player().primaryLocation,'loc_inn');
 assert.equal(player().data.attributes.resources.gold,45);assert.equal(player().data.attributes.resources.xp,0);
 assert.equal(player().data.training,undefined);assert.equal(player().data.memories,undefined);assert.deepEqual(player().data.scars,[]);
 assert.equal(Object.values(world().entities).filter(e=>e.actor?.controller==='Human').length,1);
 for(const [id,entity] of Object.entries(prior.entities)){
  const expected=structuredClone(entity);if(id===dead.id)expected.actor.controller='Autonomous';
  assert.deepEqual(world().entities[id],expected,`persistent entity ${id}`);
 }
 for(const [key,value] of Object.entries(prior.globals))if(!['hearthvaleSurface','hearthvaleDeathTransition'].includes(key))assert.deepEqual(world().globals[key],value,key);
 assert.equal(knowledgeState(world(),player().id,'hv_pit_1','discovery-loc_sunken_square'),'Unknown');
 assert.equal(knowledgeState(world(),'loc_guild','hv_pit_1','discovery-loc_sunken_square'),'Known');
 assert.equal(pit().sunkenSquare.known.actor,'hv_actor_2');assert.equal(pit().sunkenSquare.known.day,4);
 checkpoint('immediately after succession');travel('loc_pit_entrance');assert.ok(!game.expeditionChoices().some(c=>c.params.shortcut));
 travel('loc_guild');talk(5);travel('loc_pit_entrance');act('pit.enter',{shortcut:true});
 act('pit.forward');act('pit.resolve-room',{approach:'inspect'});act('pit.forward');act('pit.resolve-room',{approach:'primary'});
 act('pit.forward');act('pit.resolve-room',{approach:'choice_old_notice_board_read'});checkpoint('successor Pit play');act('pit.return');
 for(let i=0;pit().expedition;i++){
  assert.ok(i<30);const choices=game.expeditionChoices();const c=choices.find(c=>c.type==='pit.combat-next')||choices.find(c=>c.label.startsWith('Attack: Hammer'))||choices.find(c=>c.label==='Block with Sword')||choices.find(c=>c.type==='pit.defend');assert.ok(c);act(c.type,c.params);
 }
 assert.equal(player().data.attributes.resources.xp,4);
 travel('loc_shop');assert.equal(world().globals.hearthvaleServices.stock.item_hammer,2);service('buy',{item:'item_hp_potion_basic'});
 travel('loc_town_hall');talk(6);service('track-opportunity',{situation:'hv_situation_situation_town_supply_day_3'});travel('loc_inn');
 for(let i=0;i<4;i++)sleep();checkpoint('second weekly boundary');travel('loc_town_hall');talk(6);travel('loc_inn');
 assert.equal(world().entities.hv_situation_situation_town_supply_day_3.lifecycle,'expired');
 while(state().calendar.day<40){sleep();if([20,21,31,40].includes(state().calendar.day))checkpoint(`Day ${state().calendar.day}`);}
 travel('loc_shop');service('buy',{item:'item_arrows'});travel('loc_inn');checkpoint('Day 40 playable before completion');sleep();
 const final=world();assert.equal(final.globals.hearthvaleCompletion.reason,'chapter');assert.equal(final.globals.hearthvaleCompletion.completedDays,40);
 assert.equal(state().calendar.day,40);assert.equal(state().calendar.week,8);assert.deepEqual(boundaries,Array.from({length:40},(_,i)=>i+1));
 assert.equal(events('hearthvale.auron-rescue').length,3);assert.equal(events('hearthvale.player-death').length,1);
 assert.equal(events('hearthvale.successor-candidates-generated').length,1);assert.equal(events('hearthvale.successor-selected').length,1);
 assert.equal(events('hearthvale.demo-completed').length,1);assert.equal(events('hearthvale.weekly-reconcile').length,8);
 assert.deepEqual(final.entities[dead.id].data.lifeRecord,archive);assert.equal(player().data.generation,2);
 assert.ok(events('hearthvale.weekly-reconcile').at(-1).event.boundary<events('hearthvale.demo-completed')[0].event.boundary);
 checkpoint('final completion');assert.deepEqual(game.serviceChoices(),[]);assert.deepEqual(game.expeditionChoices(),[]);
 const saved=game.save();assert.throws(()=>game.perform('surface.sleep',{day:40,confirmed:true}));assert.equal(game.save(),saved);
 console.log('M6B2 audit',JSON.stringify({commands,rescues,checkpoints,completion:final.globals.hearthvaleCompletion,weekly:final.globals.hearthvaleWeekly.snapshots.map(s=>({week:s.week,holder:s.holder,completedDay:s.completedDay})),situations:Object.values(final.entities).filter(e=>e.situation).map(e=>({id:e.id,lifecycle:e.lifecycle,resolver:e.data.resolver})),square:pit().sunkenSquare,archive}));
});
