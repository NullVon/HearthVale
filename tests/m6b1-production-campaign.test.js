import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { dictionary,steps } from './helpers/m6b1-route.js';

test('M6B1 recorded production New Game to personal Brute completion, with exact save continuation',()=>{
 let game,saved,twin,checkpoints=0,couldHave;
 const floors=new Set(),destinations=new Set();
 function apply(g,command,value){
  if(command==='opening-next')g.openingNext();
  else if(command==='choose')g.choose(value);
  else if(command==='arrive')g.perform('surface.arrive');
  else if(command==='answer')g.perform('surface.answer-mira',{response:value});
  else if(command==='finish-mira')g.perform('surface.finish-mira');
  else if(command==='move')g.perform('Move',{location:value});
  else if(command==='service')g.perform('service.act',JSON.parse(value));
  else if(command==='expedition'){const {type,params}=JSON.parse(value);g.perform(type,params);}
  else if(command==='sleep')g.perform('surface.sleep',{day:Number(value),confirmed:true});
  else return false;
  return true;
 }
 for(const [index,key] of steps.entries()){
  const [command,value]=dictionary[key];
  if(command==='new'){assert.equal(game,undefined);game=createSurfaceGame({seed:1});}
  else if(command==='save'){saved=game.save();}
  else if(command==='load'){
   twin=game;game=createSurfaceGame({saved});assert.equal(game.save(),saved);checkpoints++;
  }else{
   if(command==='choose')assert.equal(game.snapshot().world.globals.hearthvaleSurface.candidates.length,3);
   try{
    const acted=apply(game,command,value);
    if(acted&&twin){apply(twin,command,value);assert.equal(game.save(),twin.save(),`future continuation at ${index}`);twin=null;}
   }catch(error){throw new Error(`Recorded action ${index}: ${command} ${value}`,{cause:error});}
  }
  const w=game.snapshot().world,s=w.globals.hearthvaleSurface,p=w.entities.hv_pit_1.data;
  if(s.couldHaveId){couldHave??=s.couldHaveId;assert.equal(s.couldHaveId,couldHave);}
  if(command==='move')destinations.add(value);
  if(p.expedition?.floor)floors.add(p.expedition.floor.number);
  if(!w.globals.hearthvaleCompletion)assert.equal(p.guardianFirstClear,undefined);
 }
 const w=game.snapshot().world,s=w.globals.hearthvaleSurface,p=w.entities.hv_pit_1.data,c=w.globals.hearthvaleCompletion;
 const player=w.entities[s.playerId],events=Object.values(w.entities).filter(e=>e.event);
 assert.equal(c.reason,'ruin-brute');assert.equal(c.completedDays,5);assert.equal(s.calendar.day,6);
 assert.equal(c.firstClear.actor,player.id);assert.deepEqual(c.firstClear,p.guardianFirstClear);
 assert.equal(p.sunkenSquare.known.actor,player.id);assert.equal(p.sunkenSquare.known.day,1);
 assert.equal(s.playerId,'hv_actor_7');assert.equal(couldHave,'hv_actor_8');
 assert.equal(player.data.attributes.resources.hearts,3);assert.equal(player.data.death,undefined);
 assert.equal(player.data.attributes.resources.xp,51);
 assert.equal(p.strata[0].cleared,true);assert.equal(p.strata[0].waystoneUnlocked,true);
 assert.equal(p.strata[1].locked,false);assert.equal(p.strata[1].playable,false);
 assert.equal(p.expedition.combat,null);assert.match(p.expedition.lastResult.text,/Victory/);
 assert.equal(checkpoints,6);assert.equal(destinations.size,6);assert.equal(floors.size,10);
 assert.equal(events.filter(e=>e.event.type==='hearthvale.demo-completed').length,1);
 assert.equal(w.globals.hearthvaleWeekly.lastCompletedDay,5);
 assert.ok(events.find(e=>e.event.type==='hearthvale.weekly-reconcile'));
 const terminal=game.save();assert.throws(()=>game.perform('pit.forward'));assert.equal(game.save(),terminal);
 assert.deepEqual(game.expeditionChoices(),[]);assert.deepEqual(game.serviceChoices(),[]);
 console.log('M6B1 observed world',JSON.stringify({pit:p,globals:w.globals,actors:Object.values(w.entities).filter(e=>e.actor).map(e=>({id:e.id,data:e.data})),situations:Object.values(w.entities).filter(e=>e.situation),eventTypes:[...new Set(events.map(e=>e.event.type))]}));
});
