import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { byId } from '../HearthVale_Content/expedition.js';
import { dodgeChance } from '../HearthVale_Shell/src/expedition-checks.js';

// The old recorded DC/miss itinerary is no longer legal under Phase 2.
// This production-only route makes decisions from current legal choices; no
// fixture edits, inventory grants, combat-stat changes or save rewriting.
test('M6B1 Phase 2 production New Game to personal Brute completion, with exact save continuation',()=>{
 let game=createSurfaceGame({seed:33}),twin=null,checkpoints=0,couldHave,returning=false,earnedXp=0;
 const floors=new Set(),destinations=new Set(),phases=new Set();
 let currentWorld=game.snapshot().world;
 const world=()=>currentWorld;
 const state=()=>world().globals.hearthvaleSurface;
 const actor=()=>world().entities[state().playerId];
 const pit=()=>world().entities.hv_pit_1.data;
 const checkpoint=()=>{const saved=game.save();twin=game;game=createSurfaceGame({saved});assert.equal(game.save(),saved);checkpoints++;};
 function invoke(method,...args){
  const previousCombat=pit()?.expedition?.combat;
  game[method](...args);
  currentWorld=game.snapshot().world;
  if(twin){twin[method](...args);assert.equal(game.save(),twin.save(),'exact next production transition');twin=null;}
  if(state().couldHaveId){couldHave??=state().couldHaveId;assert.equal(state().couldHaveId,couldHave);}
  if(pit().expedition?.floor)floors.add(pit().expedition.floor.number);
  if(previousCombat && !pit().expedition?.combat && /Victory/.test(pit().expedition?.lastResult.text??pit().lastResult?.text??''))earnedXp+=byId('enemies',previousCombat.enemy.templateId).xp;
  if(!world().globals.hearthvaleCompletion)assert.equal(pit().guardianFirstClear,undefined);
 }
 const act=(type,params={})=>invoke('perform',type,params);
 function travel(location){act('Move',{location:'loc_surface'});destinations.add('loc_surface');act('Move',{location});destinations.add(location);}
 for(let i=0;i<5;i++)invoke('openingNext');
 assert.equal(state().candidates.length,3);invoke('choose','hv_actor_7');
 act('surface.arrive');act('surface.answer-mira',{response:'looking'});act('surface.finish-mira');
 for(const location of ['loc_shop','loc_guild','loc_town_hall','loc_inn'])travel(location);
 travel('loc_shop');
 for(let i=0;i<4;i++)act('service.act',{op:'buy',item:'item_hp_potion_basic'});
 travel('loc_pit_entrance');act('pit.enter');checkpoint();
 for(let n=0;!world().globals.hearthvaleCompletion;n++){
  assert.ok(n<600,'bounded production victory');
  if(!pit().expedition){
   console.log('Resupply',state().calendar.day,actor().data.attributes.resources,pit().lastExpedition?.reason);
   assert.ok(!actor().data.death,'Production route must survive');
   returning=false;travel('loc_shop');
   for(let option;(option=game.serviceChoices().find(c=>c.params.op==='sell-holding'));){act(option.type,option.params);}
   for(const id of ['item_hp_potion_basic','item_hp_potion_basic','item_hammer']){
    const buy=game.serviceChoices().find(c=>c.params.op==='buy'&&c.params.item===id);if(buy)act(buy.type,buy.params);
   }
   for(const id of ['item_hammer','item_shield']){
    const bag=actor().data.inventory.bag.findIndex(i=>i?.templateId===id),slot=actor().data.inventory.equipped.indexOf(null);
    if(bag>=0&&slot>=0)act('service.act',{op:'swap',bag,slot});
   }
   travel('loc_inn');
   do{const day=state().calendar.day;checkpoint();act('surface.sleep',{day,confirmed:true});}while(state().calendar.day<6);
   travel('loc_pit_entrance');
   const enter=game.expeditionChoices().find(c=>c.type==='pit.enter'&&c.params.shortcut)??game.expeditionChoices().find(c=>c.type==='pit.enter');
   act(enter.type,enter.params);continue;
  }
  const choices=game.expeditionChoices(),c=pit().expedition.combat;
  if(pit().expedition.floor.number===10&&!c&&state().calendar.day===1){
   // Reach all Floors, then take the same Surface/weekly detour as the old route.
   act('pit.return');
   while(pit().expedition){
    const options=game.expeditionChoices();
    const a=options.find(c=>c.type==='pit.unarmed')??options.find(c=>c.type==='pit.defend'&&c.params.mode==='dodge')??options.find(c=>c.type==='pit.loot'&&c.params.choice==='leave');
    assert.ok(a);act(a.type,a.params);
   }
   travel('loc_shop');
   for(let option;(option=game.serviceChoices().find(c=>c.params.op==='sell-holding'));){act(option.type,option.params);}
   // Buy replacements through ordinary shared shop stock and equip empty slots.
   for(const id of ['item_hammer','item_shield','item_hp_potion_basic','item_hp_potion_basic']){
    const buy=game.serviceChoices().find(c=>c.params.op==='buy'&&c.params.item===id);
    if(buy)act(buy.type,buy.params);
   }
   for(const id of ['item_hammer','item_shield']){
    const bag=actor().data.inventory.bag.findIndex(i=>i?.templateId===id),slot=actor().data.inventory.equipped.indexOf(null);
    if(bag>=0&&slot>=0)act('service.act',{op:'swap',bag,slot});
   }
   travel('loc_inn');
   for(let day=1;day<=5;day++){checkpoint();act('surface.sleep',{day,confirmed:true});}
   travel('loc_pit_entrance');act('pit.enter',{shortcut:true});continue;
  }
  assert.ok(!choices.some(c=>c.type==='pit.combat-next'||c.params.mode==='none'));
  if(c&&!phases.has(c.phase)){phases.add(c.phase);checkpoint();}
  const hp=actor().data.attributes.resources.hp;
  if(!c&&(hp<9&&!choices.some(c=>c.type==='pit.use')||returning)){returning=true;act('pit.return');continue;}
  if(c?.kind==='room'&&hp<=4&&!choices.some(c=>c.type==='pit.use')){act('pit.retreat');returning=true;continue;}
  const weapons=choices.filter(c=>c.type==='pit.attack').sort((a,b)=>{
   const d=slot=>byId('items',actor().data.inventory.equipped[slot].templateId);
   const first=d(a.params.slot),second=d(b.params.slot);
   const interrupts=d=>d.impact>=c.committed.stability;
   return Number(interrupts(second))-Number(interrupts(first)) || first.impact-second.impact;
  });
  const cure=choices.find(c=>c.type==='pit.use'&&byId('items',actor().data.inventory.bag[c.params.slot].templateId).effects.some(e=>e.tag==='effect_cure'));
  const healing=choices.find(c=>c.type==='pit.cast'&&actor().data.inventory.spells[c.params.slot]==='spell_heal');
  const choice=cure ?? (hp<=8?choices.find(c=>c.type==='pit.use')??healing:null)
   ?? (!c&&hp<=12?healing:null)
   ?? (c?.phase==='advantage'?choices.find(c=>c.type==='pit.unarmed'):null)
   ?? weapons[0]
   ?? choices.find(c=>c.type==='pit.unarmed')
   ?? (c&&dodgeChance(actor().data.attributes.baseStats.DEX,byId('enemies',c.enemy.templateId).combatStats.DEX,c.committed.speed,c.playerKnockdown).chance>=50?choices.find(c=>c.type==='pit.defend'&&c.params.mode==='dodge'):null)
   ?? (c?.committed.damage<=3?choices.find(c=>c.type==='pit.defend'&&c.params.mode==='counter'&&c.params.slot===undefined):null)
   ?? choices.filter(c=>c.type==='pit.defend'&&c.params.mode==='block').sort((a,b)=>byId('items',actor().data.inventory.equipped[b.params.slot].templateId).defense-byId('items',actor().data.inventory.equipped[a.params.slot].templateId).defense)[0]
   ?? choices.find(c=>c.type==='pit.defend'&&c.params.mode==='dodge')
   ?? choices.find(c=>c.type==='pit.loot'&&c.params.choice==='leave')
   ?? choices.find(c=>c.type==='pit.resolve-room')
   ?? choices.find(c=>c.type==='pit.guardian')
   ?? choices.find(c=>c.type==='pit.forward');
  assert.ok(choice,JSON.stringify(choices));act(choice.type,choice.params);
 }
 const w=game.snapshot().world,s=w.globals.hearthvaleSurface,p=w.entities.hv_pit_1.data,c=w.globals.hearthvaleCompletion;
 const player=w.entities[s.playerId],events=Object.values(w.entities).filter(e=>e.event);
 assert.equal(c.reason,'ruin-brute');assert.ok(c.completedDays>=5);assert.equal(s.calendar.day,c.completedDays+1);
 assert.equal(c.firstClear.actor,player.id);assert.deepEqual(c.firstClear,p.guardianFirstClear);
 assert.equal(p.sunkenSquare.known.actor,player.id);assert.ok(p.sunkenSquare.known.day<=s.calendar.day);
 assert.equal(s.playerId,'hv_actor_7');assert.equal(couldHave,'hv_actor_8');
 assert.equal(player.data.attributes.resources.hearts,3);assert.equal(player.data.death,undefined);
 assert.equal(player.data.attributes.resources.xp,earnedXp);assert.ok(earnedXp>=20);
 assert.equal(p.strata[0].cleared,true);assert.equal(p.strata[0].waystoneUnlocked,true);
 assert.equal(p.strata[1].locked,false);assert.equal(p.strata[1].playable,false);
 assert.equal(p.expedition.combat,null);assert.match(p.expedition.lastResult.text,/Victory/);
 assert.ok(checkpoints>=6);assert.equal(destinations.size,6);assert.equal(floors.size,10);
 assert.ok(phases.has('advantage'));assert.ok(phases.has('incoming'));assert.ok(phases.has('attack'));
 assert.equal(events.filter(e=>e.event.type==='hearthvale.demo-completed').length,1);
 assert.equal(w.globals.hearthvaleWeekly.lastCompletedDay,Math.floor(c.completedDays/5)*5);
 assert.ok(events.find(e=>e.event.type==='hearthvale.weekly-reconcile'));
 const terminal=game.save();assert.throws(()=>game.perform('pit.forward'));assert.equal(game.save(),terminal);
 assert.deepEqual(game.expeditionChoices(),[]);assert.deepEqual(game.serviceChoices(),[]);
 console.log('M6B1 Phase 2 route',JSON.stringify({xp:player.data.attributes.resources.xp,checkpoints,phases:[...phases],floors:[...floors]}));
});
