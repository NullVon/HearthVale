import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { familyWeights, byId, expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { drawRoomFamily, generateFloor, validateRoomDeck } from '../HearthVale_Shell/src/expedition-generation.js';
import { enterExpedition, completeReturn } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { treasureTable, treasureReward, offerLoot, awardRoom, awardEnemy } from '../HearthVale_Shell/src/expedition-loot.js';
import { canAttackWith, attackWeapon } from '../HearthVale_Shell/src/expedition-combat.js';
import { wear } from '../HearthVale_Shell/src/expedition-equipment.js';
import { economyState, shopOffers, resolveEconomy } from '../HearthVale_Shell/src/economy.js';
import { resultView, expeditionView } from '../HearthVale_UI/expedition-views.js';
import { inventory } from '../HearthVale_UI/surface-views.js';
import { entered, setup, context, combatFixture, roomFixture, item, dice, world, player, pit, expedition } from './helpers/m2-fixture.js';

const composition = {combat:8,resource:6,treasure:6,hazard:4,event:3,empty:2,discovery:1};
const families = Object.keys(composition);
const counts = cards => Object.fromEntries(families.map(f=>[f,cards.filter(c=>c===f).length]));
const noRng = {next(){throw new Error('Unexpected RNG draw');}};
const reload = game => {const saved=game.save(), copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);return copy;};
const both = (a,b,type,params={}) => {a.perform(type,params);b.perform(type,params);assert.equal(a.save(),b.save());};

test('Phase 3 exact 30-card composition, no replacement, exhaustion-only refill and deterministic blocked selection',()=>{
  assert.deepEqual(Object.fromEntries(familyWeights.map(f=>[f.id,f.weight])),composition);
  const state={}, drawn=[]; let calls=0;
  const rng={next(){calls++;return .37;}};
  for(let n=0;n<30;n++)drawn.push(drawRoomFamily(state,families,rng));
  assert.deepEqual(counts(drawn),composition);assert.deepEqual(state.roomDeck,[]);assert.equal(calls,29);
  drawRoomFamily(state,families,rng);assert.equal(state.roomDeck.length,29);assert.equal(calls,58);
  state.roomDeck=['combat','combat','treasure','hazard'];
  assert.equal(drawRoomFamily(state,['treasure'],noRng),'treasure');
  assert.deepEqual(state.roomDeck,['combat','combat','hazard']);
  assert.equal(drawRoomFamily(state,['resource'],noRng),null);assert.deepEqual(state.roomDeck,['combat','combat','hazard']);
  validateRoomDeck(state);validateRoomDeck({});validateRoomDeck({roomDeck:[]});
  for(const roomDeck of [['bad'],Array(9).fill('combat'),null])assert.throws(()=>validateRoomDeck({roomDeck}),/deck/);
});

test('Phase 3 blocked deck preserves cards while completing 3–4 unique rooms with at most two combats',()=>{
  for(const cards of [Array(8).fill('combat'),Array(6).fill('resource'),['empty','empty']]){
    const state={roomDeck:[...cards]}, floor=generateFloor(1,1,[],dice(.99),null,state);
    assert.equal(floor.rooms.length,4);assert.equal(new Set(floor.rooms.map(r=>r.encounter)).size,4);
    assert.ok(floor.rooms.filter(r=>r.family==='combat').length<=2);
    if(cards[0]!=='empty')assert.deepEqual(state.roomDeck,cards.slice(2));
  }
  const state={roomDeck:['treasure']};generateFloor(10,1,[],noRng,null,state);assert.deepEqual(state.roomDeck,['treasure']);
});

test('Phase 3 deck survives save/load, Return, entry, retreat and shortcut without phantom floor draws',()=>{
  let game=setup(entered(),ctx=>{ctx.actor.data.attributes.baseStats.WIS=30;ctx.actor.data.attributes.resources.ap=4;});
  let copy=reload(game);const before=pit(game).roomDeck;
  both(game,copy,'pit.return');assert.deepEqual(pit(game).roomDeck,before);
  copy=reload(game);both(game,copy,'pit.enter');
  assert.equal(pit(game).roomDeck.length,before.length-expedition(game).floor.rooms.length);
  game=combatFixture(game);copy=reload(game);both(game,copy,'pit.retreat');
  game=setup(game,ctx=>{ctx.pit.sunkenSquare={floor:5,pending:false,known:{actor:ctx.actor.id},remaining:2};});
  // Exercise the same entry implementation directly through the fixture transaction.
  const ctx=context(game), savedDeck=[...ctx.pit.roomDeck];
  completeReturn(ctx);enterExpedition(ctx,dice(.1),true);const floor=ctx.expedition.floor;
  assert.equal(floor.rooms[0].encounter,'loc_sunken_square');
  assert.equal(ctx.pit.roomDeck.length,savedDeck.length-(floor.rooms.length-1));
});

test('Phase 3 exact Treasure table and full-condition basic weapon results; no Nothing at any percentile',()=>{
  assert.deepEqual(expeditionCatalog.enemies.filter(e=>!e.subjective).map(e=>[e.label,e.hp,e.defense]),[
    ['Slime',6,0],['Cave Beetle',8,1],['Venom Spider',6,0],['Pit Hound',8,0],['Frenzied Adventurer',12,1],['Ruin Brute',24,2],
  ]);
  assert.deepEqual(treasureTable,[{id:'potion',weight:15},{id:'valuable',weight:40},{id:'weapon',weight:20},{id:'scroll',weight:15},{id:'tome',weight:10}]);
  const ctx=context();ctx.actor.data.inventory.bag=Array(8).fill(null);
  const categoryCounts={};
  for(let i=0;i<100;i++){
    const reward=treasureReward(ctx,dice((i+.5)/100,0));assert.ok(reward);
    const category=byId('items',reward.item).category;categoryCounts[category]=(categoryCounts[category]??0)+1;
  }
  assert.deepEqual(categoryCounts,{consumable:15,valuable:40,weapon:20,scroll:15,tome:10});
  for(const [selection,id,dur] of [[0,'sword',12],[.4,'hammer',10],[.9,'bow',undefined]]){
    ctx.actor.data.inventory.bag=Array(8).fill(null);
    const reward=treasureReward(ctx,dice(.6,selection));assert.equal(reward.item,`item_${id}`);
    assert.equal(ctx.actor.data.inventory.bag[0].durability,dur);
    assert.equal(item(ctx.actor,`item_${id}`).durability,dur);
  }
});

test('Phase 3 legacy missing deck loads without mutation or RNG; empty saved deck refills only on generation',()=>{
  const game=setup(entered(),ctx=>{ctx.actor.data.attributes.baseStats.WIS=30;});
  const legacy=JSON.parse(game.save());delete legacy.state.world.entities.hv_pit_1.data.roomDeck;
  const saved=JSON.stringify(legacy),loaded=createSurfaceGame({saved});
  assert.equal(loaded.save(),saved);assert.equal(pit(loaded).roomDeck,undefined);
  const random=JSON.parse(loaded.save()).state.random;loaded.expeditionChoices();
  assert.deepEqual(JSON.parse(loaded.save()).state.random,random);
  let copy=reload(loaded);both(loaded,copy,'pit.return');assert.equal(pit(loaded).roomDeck,undefined);
  both(loaded,copy,'pit.enter');assert.equal(pit(loaded).roomDeck.length,30-expedition(loaded).floor.rooms.length);
  const exhausted=setup(loaded,ctx=>{ctx.pit.roomDeck=[];});copy=reload(exhausted);
  both(exhausted,copy,'pit.return');assert.deepEqual(pit(exhausted).roomDeck,[]);
  both(exhausted,copy,'pit.enter');assert.equal(pit(exhausted).roomDeck.length,30-expedition(exhausted).floor.rooms.length);
});

test('Phase 3 Bow and Crystal Bow ignore legacy DUR, consume one Arrow on hit or miss and work again after replenishment',()=>{
  for(const id of ['item_bow','item_crystal_bow'])for(const legacy of [undefined,0,1]){
    const ctx=context();ctx.actor.data.attributes.traits=[];ctx.expedition.combat.enemy.hp=100;
    const bow=item(ctx.actor,id);assert.equal(bow.durability,undefined);assert.equal(byId('items',id).canDefend,false);
    if(legacy!==undefined)bow.durability=legacy;
    ctx.actor.data.inventory.equipped[1]=bow;ctx.actor.data.attributes.resources.arrows=2;
    for(const roll of [0,.99]){
      assert.equal(canAttackWith(ctx.actor,ctx.expedition.combat,bow),true);
      attackWeapon(ctx,1,dice(roll));assert.equal(ctx.actor.data.inventory.equipped[1],bow);
      assert.equal(bow.durability,legacy);
    }
    assert.equal(ctx.actor.data.attributes.resources.arrows,0);assert.equal(canAttackWith(ctx.actor,ctx.expedition.combat,bow),false);
    assert.equal(wear(ctx.actor,1,100,noRng),null);assert.equal(ctx.actor.data.inventory.equipped[1],bow);
    ctx.actor.data.attributes.resources.arrows=1;assert.equal(canAttackWith(ctx.actor,ctx.expedition.combat,bow),true);
    attackWeapon(ctx,1,dice(.99));assert.equal(ctx.actor.data.attributes.resources.arrows,0);
    ctx.actor.data.inventory.equipped=[bow,null,null,null];ctx.actor.data.inventory.bag=Array(8).fill(null);
    assert.doesNotMatch(inventory(ctx.actor),/DUR/);
  }
});

test('Phase 3 legacy zero-DUR Bow resumes with exact one-shot save continuation; DUR-bearing gear still destroys',()=>{
  const game=combatFixture(undefined,ctx=>{ctx.actor.data.inventory.equipped[1].durability=0;ctx.actor.data.attributes.resources.arrows=1;});
  const copy=reload(game);both(game,copy,'pit.attack',{slot:1});
  assert.equal(player(game).data.inventory.equipped[1].templateId,'item_bow');
  assert.equal(player(game).data.attributes.resources.arrows,0);
  const ctx=context();ctx.actor.data.attributes.traits=[];
  for(const id of ['item_sword','item_hammer','item_shield']){
    ctx.actor.data.inventory.equipped[0]=item(ctx.actor,id);ctx.actor.data.inventory.equipped[0].durability=1;
    assert.equal(wear(ctx.actor,0,1,noRng).destroyed,true);assert.equal(ctx.actor.data.inventory.equipped[0],null);
  }
});

test('Phase 3.1 Tome learning and Knockdown wording are explicit in the UI',()=>{
  const ctx=context();
  ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_tome_heal');
  assert.match(inventory(ctx.actor,'bag'),/Tomes are not equipped/);

  const game=setup(entered(),ctx=>{ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_tome_heal');});
  const learn=game.expeditionChoices().find(c=>c.type==='pit.learn');
  assert.ok(learn);assert.match(learn.label,/Learn Heal/);

  const knocked=combatFixture(undefined,ctx=>{ctx.expedition.combat.playerKnockdown=true;});
  const html=expeditionView(world(knocked),player(knocked),knocked.expeditionChoices());
  assert.match(html,/your turn is not skipped/);
  assert.match(html,/next enemy offensive action, then Knockdown clears/);
});

test('Phase 3 resolved treasure cannot repeat after reload and never redraws the deck',()=>{
  const game=setup(entered(),ctx=>{roomFixture(ctx,'treasure','m2_buried_shelf');ctx.actor.data.inventory.bag=Array(8).fill(null);});
  const deck=pit(game).roomDeck,copy=reload(game);both(game,copy,'pit.resolve-room',{approach:'inspect'});
  assert.deepEqual(pit(game).roomDeck,deck);assert.ok(expedition(game).floor.rooms[0].resolved);
  const saved=game.save(),again=reload(game);assert.throws(()=>again.perform('pit.resolve-room',{approach:'inspect'}),/unavailable/);
  assert.equal(again.save(),saved);
});

test('Phase 3 valuable/material sales fund predictable basic stock; feedback shows destination, value and replacement',()=>{
  const game=entered(),ctx=context(game);ctx.world=world(game);ctx.state=economyState(ctx.world);ctx.actor.data.attributes.traits=[];
  ctx.actor.data.attributes.resources.gold=0;ctx.actor.data.inventory.bag=Array(8).fill(null);
  const rewards=[offerLoot(ctx,'item_jewelry_box'),offerLoot(ctx,'item_beast_fang'),offerLoot(ctx,'item_sword')];
  const html=resultView({text:'Found treasure.',rewards});
  assert.match(html,/Collectables; sell for 25G/);assert.match(html,/Bag; replacement weapon/);assert.doesNotMatch(html,/deck|roll|weight/);
  resolveEconomy(ctx,'sell-holding',{group:'valuables',item:'item_jewelry_box'},noRng);
  assert.match(ctx.state.lastResult,/25G/);
  resolveEconomy(ctx,'sell-holding',{group:'materials',item:'item_beast_fang'},noRng);
  assert.equal(ctx.actor.data.attributes.resources.gold,31);
  assert.equal(ctx.actor.data.holdings.valuables.item_jewelry_box,0);
  for(const [id,cost] of [['sword',30],['bow',35],['hammer',40]])assert.equal(byId('items',`item_${id}`).price,cost);
  for(const id of ['sword','hammer','bow','shield','chest_armor'])assert.ok(shopOffers(ctx.actor,ctx.state).some(o=>o.item.templateId===`item_${id}`&&o.quantity>o.floor));
  resolveEconomy(ctx,'buy',{item:'item_sword'},noRng);assert.equal(ctx.actor.data.attributes.resources.gold,1);
  assert.equal(ctx.actor.data.inventory.bag[1].durability,12);assert.match(ctx.state.lastResult,/added to Bag/);
});

test('Phase 3 small seeded three-floor supply sample reports both useful value and liquid sell value',t=>{
  const base=context(), totals=[], twoFloorTotals=[], liquidTotals=[], twoFloorLiquid=[];
  const liquidValue=d=>d.sellValue??(d.price===undefined?0:d.maxDurability?Math.max(1,Math.floor(d.price*.5)):Math.floor(d.price*.5));
  for(let seed=0;seed<40;seed++){
    const runtime=createRuntime({seed,shell:{worldProcesses:(_,{rng})=>{
      const ctx=structuredClone(base);ctx.pit={};ctx.actor.data.holdings={materials:{},valuables:{}};
      ctx.actor.data.inventory.bag=Array(8).fill(null);ctx.actor.data.attributes.traits=[];ctx.expedition.pendingLoot=[];
      let value=0, liquid=0, twoFloorValue=0, twoFloorSell=0;
      for(let floor=1;floor<=3;floor++){
        for(const room of generateFloor(floor,1,[],rng,null,ctx.pit).rooms){
          const rewards=awardRoom(ctx,room,rng);
          if(room.family==='combat')rewards.push(...awardEnemy(ctx,room.encounter,rng));
          for(const reward of rewards){
            const definition=byId('items',reward.item);
            if(definition){
              value+=(definition.sellValue??definition.price??0)*reward.quantity;
              liquid+=liquidValue(definition)*reward.quantity;
            }
          }
        }
        if(floor===2){twoFloorValue=value;twoFloorSell=liquid;}
      }
      return [{type:'fixture.supply',effects:[{type:'global',key:'value',value},{type:'global',key:'twoFloorValue',value:twoFloorValue},{type:'global',key:'liquid',value:liquid},{type:'global',key:'twoFloorSell',value:twoFloorSell}]}];
    }}});runtime.startScene();runtime.resolveScene();
    const globals=runtime.snapshot().world.globals;
    totals.push(globals.value);twoFloorTotals.push(globals.twoFloorValue);liquidTotals.push(globals.liquid);twoFloorLiquid.push(globals.twoFloorSell);
  }
  totals.sort((a,b)=>a-b);liquidTotals.sort((a,b)=>a-b);
  const mean=totals.reduce((a,b)=>a+b,0)/totals.length,twoFloorMean=twoFloorTotals.reduce((a,b)=>a+b,0)/twoFloorTotals.length;
  const liquidMean=liquidTotals.reduce((a,b)=>a+b,0)/liquidTotals.length,twoFloorLiquidMean=twoFloorLiquid.reduce((a,b)=>a+b,0)/twoFloorLiquid.length;
  t.diagnostic(`40 seeds, 3 floors: mean ${mean.toFixed(1)}G useful value; liquid sell value mean ${liquidMean.toFixed(1)}G, median ${liquidTotals[20]}G, range ${liquidTotals[0]}–${liquidTotals.at(-1)}G.`);
  t.diagnostic(`After 2 complete floors: mean ${twoFloorMean.toFixed(1)}G useful value; mean liquid sell value ${twoFloorLiquidMean.toFixed(1)}G.`);
  assert.ok(twoFloorMean>=25&&twoFloorMean<=40);
  assert.ok(twoFloorLiquidMean>0);
});
