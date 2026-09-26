import test from 'node:test';
import assert from 'node:assert/strict';
import { expeditionCatalog as catalog,byId } from '../HearthVale_Content/expedition.js';
import { validateCatalog } from '../HearthVale_Content/validation.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { economyState,resolveEconomy,sellPrice,advanceEconomy } from '../HearthVale_Shell/src/economy.js';
import { trainingRequirement } from '../HearthVale_Shell/src/training.js';
import { traitBonus } from '../HearthVale_Shell/src/expedition-checks.js';
import { routeFloor } from '../HearthVale_Shell/src/expedition-discovery.js';
import { selectDialogue } from '../HearthVale_Story/dialogue.js';
import { derivedActorValues } from '../HearthVale_Shell/src/surface-candidates.js';
import { startCombat,defend,attackWeapon } from '../HearthVale_Shell/src/expedition-combat.js';
import { roomFixture,entered,setup,world,player,pit,expedition,item,use,context,dice } from './helpers/m2-fixture.js';
import { configure,surfaceFixture,service } from './helpers/m3-fixture.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { floorTail } from '../HearthVale_Shell/src/expedition-generation.js';
import { storyKnowledge } from '../HearthVale_Shell/src/social.js';

test('M3 full catalogs validate; all canonical equipment/spells/Traits/enemies/hazards/Events/recipes exist',()=>{
  validateCatalog(catalog);assert.equal(catalog.traits.length,23);assert.equal(catalog.spells.length,6);assert.equal(catalog.enemies.length,6);assert.equal(catalog.hazards.length,10);assert.equal(catalog.events.length,8);assert.equal(catalog.recipes.length,14);
  assert.equal(catalog.items.filter(i=>i.category==='valuable'&&i.id!=='item_m2_keepsake').length,8);
  assert.equal(catalog.items.filter(i=>i.category==='material').length,9);
  const broken=structuredClone(catalog);broken.recipes[0].materials[0].item='missing';assert.throws(()=>validateCatalog(broken));
  const bad=structuredClone(catalog);bad.vendors[0].stock[0].floor=99;assert.throws(()=>validateCatalog(bad));
});
test('M3 A05 shared stock, protected floors, Frugal rounding, free purchases and exact reload',()=>{
  const game=surfaceFixture((w,a)=>{a.data.attributes.traits=['trait_frugal','trait_curious'];});const ap=player(game).data.attributes.resources.ap;
  service(game,'buy',p=>p.item==='item_hp_potion_basic');assert.equal(player(game).data.attributes.resources.gold,491);
  const state=economyState(world(game)),actor=structuredClone(player(game));state.stock.item_arrows=11;
  resolveEconomy({actor,state,day:1},'buy',{item:'item_arrows'},dice(0));assert.equal(state.stock.item_arrows,10);
  assert.throws(()=>resolveEconomy({actor,state,day:1},'buy',{item:'item_arrows'},dice(0)),/unavailable/);
  assert.equal(player(game).data.attributes.resources.ap,ap);assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});
test('M3 A06 used equipment preserves exact instance/DUR, buyback and 15-Day age',()=>{
  const game=surfaceFixture((w,a)=>{a.data.attributes.traits=['trait_curious','trait_charming'];a.data.inventory.bag[1]=item(a,'item_sword');a.data.inventory.bag[1].durability=6;});
  const original=player(game).data.inventory.bag[1];assert.equal(sellPrice(original),7);
  service(game,'sell',p=>p.container==='bag'&&p.slot===1);assert.equal(economyState(world(game)).used[0].id,original.id);
  const later=structuredClone(world(game));assert.equal(advanceEconomy(later,15).value.used.length,1);assert.equal(advanceEconomy(later,16).value.used.length,0);
  service(game,'buy-used');assert.deepEqual(player(game).data.inventory.bag.find(i=>i?.id===original.id),original);
});
test('M3 Turn-In differs from sale; recipe orders consume exact resources and complete next Day, no Blacksmith trigger',()=>{
  const game=surfaceFixture((w,a)=>{a.data.holdings={materials:{item_moonleaf:4,item_iron_ore:4},valuables:{}};});
  service(game,'sell-holding',p=>p.item==='item_moonleaf');assert.equal(economyState(world(game)).knownMaterials.length,0);
  service(game,'turn-in',p=>p.item==='item_moonleaf');service(game,'order',p=>p.recipe==='recipe_hp_potion_greater');
  assert.equal(player(game).data.holdings.materials.item_moonleaf,0);assert.equal(game.serviceChoices().some(c=>c.params.op==='collect'),false);
  service(game,'turn-in',p=>p.item==='item_iron_ore');assert.equal(game.serviceChoices().some(c=>c.params.recipe==='recipe_iron_sword'),false);
  game.perform('Move',{location:'loc_inn'});game.perform('surface.sleep',{day:1,confirmed:true});game.perform('Move',{location:'loc_shop'});service(game,'collect');
  assert.equal(player(game).data.inventory.bag.find(i=>i?.templateId==='item_hp_potion_greater').quantity,2);
});
test('M3 all recipes are reachable through valid provider fixtures and deliver exact outputs',()=>{
  for(const recipe of catalog.recipes){let game=surfaceFixture((w,a)=>{a.data.holdings={materials:Object.fromEntries(recipe.materials.map(m=>[m.item,m.quantity])),valuables:{}};
    const state=economyState(w);state.knownMaterials=recipe.materials.map(m=>m.item);state.blacksmithExists=recipe.service==='blacksmith';w.globals.hearthvaleServices=state;});
    service(game,'order',p=>p.recipe===recipe.id);const order=economyState(world(game)).orders[0];assert.equal(order.item,recipe.output);assert.equal(order.quantity,recipe.quantity);assert.equal(order.readyDay,2);
  }
});
test('M3 full Bag blocks purchase/collection without losing Gold, stock or a pending order',()=>{
  const game=surfaceFixture((w,a)=>{a.data.inventory.bag=Array.from({length:8},()=>item(a,'item_sword'));});
  assert.equal(game.serviceChoices().some(c=>c.params.op==='buy'&&c.params.item==='item_hammer'),false);
  assert.throws(()=>game.perform('service.act',{op:'buy',item:'item_hammer'}));assert.equal(player(game).data.attributes.resources.gold,500);
  service(game,'discard');service(game,'buy',p=>p.item==='item_hammer');assert.equal(player(game).data.inventory.bag[0].templateId,'item_hammer');
});
test('M3 A18 training requires unlock/provider, 1 AP and 2 XP, Trait-adjusted ladder, raises stat/Level only at completion',()=>{
  let game=surfaceFixture((w,a)=>{a.primaryLocation='loc_guild';a.data.attributes.traits=['trait_fast_learner','trait_curious'];a.data.attributes.baseStats.WIS=1;});assert.equal(game.serviceChoices().some(c=>c.params.op==='train'),false);
  game=configure(game,w=>{w.globals.hearthvaleServices={...economyState(w),auronTrainingUnlocked:true};});
  const before=player(game).data.attributes.resources;assert.equal(trainingRequirement(player(game),'WIS'),1);
  service(game,'train',p=>p.stat==='WIS');assert.equal(player(game).data.attributes.baseStats.WIS,2);assert.equal(player(game).data.attributes.level,2);
  assert.equal(player(game).data.attributes.resources.ap,before.ap-1);assert.equal(player(game).data.attributes.resources.xp,before.xp-2);
  assert.equal(game.serviceChoices().some(c=>c.params.op==='train'&&c.params.stat==='WIS'),false);
  const a=structuredClone(player(game));a.data.attributes.traits=['trait_slow_learner','trait_curious'];for(let stat=1;stat<=5;stat++){a.data.attributes.baseStats.STR=stat;assert.equal(trainingRequirement(a,'STR'),stat+2);}
});
test('M3 all hazards and alternate/triggered approaches resolve once and save exactly',()=>{
  for(const hazard of catalog.hazards)for(const approach of ['primary','alternate'].filter(k=>hazard[k])){
    const game=setup(entered(),ctx=>{roomFixture(ctx,'hazard',hazard.id);ctx.actor.data.attributes.baseStats.CON=10;ctx.actor.data.attributes.resources.hp=30;});
    use(game,'pit.resolve-room',c=>c.params.approach===approach);assert.equal(expedition(game).floor.rooms[0].resolved,true);
    assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());assert.equal(game.expeditionChoices().some(c=>c.type==='pit.resolve-room'),false);
  }
});
test('M3 all eight Events and their choices are reachable with saved one-time consequences',()=>{
  for(const event of catalog.events)for(const choice of event.choices.filter(c=>!c.id.endsWith('_unlock'))){
    const game=setup(entered(),ctx=>{roomFixture(ctx,'event',event.id);ctx.actor.data.attributes.resources.hp=100;});
    use(game,'pit.resolve-room',c=>c.params.approach===choice.id);assert.equal(pit(game).eventHistory.at(-1).choice,choice.id);
    assert.equal(expedition(game).floor.rooms[0].resolved,true);assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
  }
});
test('M3 five ordinary enemies plus Brute use authored NEAR/FAR behavior; Hound Pounce moves and attacks',()=>{
  const ctx=context();for(const enemy of catalog.enemies){startCombat(ctx,enemy.id,'room',dice(0));assert.ok(ctx.expedition.combat.committed);}
  startCombat(ctx,'enemy_pit_hound','room',dice(0));ctx.expedition.combat.range='FAR';ctx.expedition.combat.committed={...byId('moves','move_hound_pounce'),offensive:true,damageType:'physical'};
  defend(ctx,'dodge',null,dice(0));assert.equal(ctx.expedition.combat.range,'NEAR');assert.ok(ctx.expedition.lastResult.damage>0);
});
test('M3 Sunken Square guarantee, finder/date, shortcut and finite pool survive repeated expeditions',()=>{
  let game=setup(entered(),(ctx,rng)=>{ctx.expedition.floor=routeFloor(ctx,9,1,[],dice(.99));ctx.expedition.deepestFloor=9;ctx.expedition.roomIndex=0;});
  assert.equal(expedition(game).floor.rooms[0].encounter,'loc_sunken_square');use(game,'pit.resolve-room');const known=pit(game).sunkenSquare.known;
  assert.equal(known.actor,player(game).id);assert.equal(known.day,1);assert.equal(pit(game).sunkenSquare.remaining,1);
  assert.equal(world(game).entities.loc_sunken_square.data.finder,player(game).id);
  game=setup(game,ctx=>{ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;});use(game,'pit.cast');
  use(game,'pit.enter',c=>c.params.shortcut);assert.equal(expedition(game).floor.number,9);use(game,'pit.forward');use(game,'pit.resolve-room');assert.equal(pit(game).sunkenSquare.remaining,0);
  assert.deepEqual(pit(game).sunkenSquare.known,known);assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});
test('M3 lost unresolved Square returns as Room 1 on regenerated eligible Floor',()=>{
  const ctx=context();ctx.pit.sunkenSquare={floor:5,pending:true,remaining:2};const floor=routeFloor(ctx,5,2,[],dice(.9));assert.equal(floor.rooms[0].encounter,'loc_sunken_square');assert.ok(floor.rooms.length>=3&&floor.rooms.length<=4);
});
test('M3 production routes guarantee Square by Floor 9 while preserving all procedural constraints across 200 seeds',()=>{
  for(let seed=0;seed<200;seed++){
    const runtime=createRuntime({seed,shell:{worldProcesses:(_,{rng})=>{
      const ctx={pit:{}},floors=[];let tail=[];
      for(let n=1;n<=9;n++){const floor=routeFloor(ctx,n,1,tail,rng);floors.push(floor);tail=floorTail(floor);if(ctx.pit.sunkenSquare){ctx.pit.sunkenSquare.pending=false;ctx.pit.sunkenSquare.known={};}}
      return [{type:'fixture.route',effects:[{type:'global',key:'floors',value:floors}]}];
    }}});runtime.startScene();runtime.resolveScene();const floors=runtime.snapshot().world.globals.floors;
    assert.equal(floors.flatMap(f=>f.rooms).filter(r=>r.encounter==='loc_sunken_square').length,1);
    const families=floors.flatMap(f=>f.rooms.map(r=>r.family));
    for(let i=2;i<families.length;i++)assert.ok(!(families[i]===families[i-1]&&families[i]===families[i-2]));
    for(const floor of floors){assert.ok([3,4].includes(floor.rooms.length));assert.ok(floor.rooms.filter(r=>r.family==='combat').length<=2);assert.equal(new Set(floor.rooms.map(r=>r.encounter)).size,floor.rooms.length);}
  }
});
test('M3 rumors enter Core Information as uncertain; hidden warning accuracy never enters the player claim',()=>{
  const game=setup(entered(),ctx=>roomFixture(ctx,'event','event_scratched_warning'));use(game,'pit.resolve-room',c=>c.params.approach==='choice_scratched_warning_remember');
  const claims=Object.values(world(game).entities).filter(e=>e.claim?.actor===player(game).id&&e.claim.key==='rumor-event_scratched_warning');assert.equal(claims.length,1);assert.equal(claims[0].claim.certainty,'uncertain');assert.equal(JSON.stringify(claims[0]).includes('warningAccuracy'),false);
  assert.equal(storyKnowledge(world(game),player(game)).find(k=>k.subject==='event_scratched_warning').state,'Rumor');
});
test('M3 scheduled introductions show every due Actor and add no relationship or memory',()=>{
  const game=surfaceFixture();game.perform('Move',{location:'loc_inn'});
  for(let day=1;day<=2;day++)game.perform('surface.sleep',{day,confirmed:true});
  const w=world(game),a=player(game);for(const id of ['actor_rook','actor_auron'])assert.ok(a.data.knownActors.includes(Object.values(w.entities).find(e=>e.data?.templateId===id).id));
  assert.ok(a.data.knownActors.includes(w.globals.hearthvaleSurface.couldHaveId));assert.ok(economyState(w).lastResult.includes('Auron'));assert.equal(a.data.relationships,undefined);assert.equal(a.data.memories,undefined);
});
test('M3 Floor 10 Brute has committed moves and records actual defeat credit',()=>{
  const game=setup(entered(),(ctx,rng)=>{ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;ctx.actor.data.attributes.baseStats.STR=30;ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_fang_hammer');});
  use(game,'pit.guardian');assert.equal(expedition(game).combat.enemy.hp,24);
  let finish=setup(game,ctx=>{ctx.expedition.combat.enemy.hp=1;});use(finish,'pit.attack',c=>c.params.slot===0);
  assert.equal(pit(finish).strata[0].guardian.alive,false);assert.equal(pit(finish).guardianDefeated.actor,player(finish).id);assert.equal(finish.expeditionChoices().some(c=>c.type==='pit.guardian'),false);
});
test('M3 Bigshroom expedition HP is nonstacking and removed on Return; Greater potion heals 16',()=>{
  const game=setup(entered(),ctx=>{ctx.actor.data.inventory.bag[1]=item(ctx.actor,'item_bigshroom_tonic',2);ctx.actor.data.inventory.bag[2]=item(ctx.actor,'item_hp_potion_greater');ctx.actor.data.attributes.resources.hp=1;ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;});
  const max=derivedActorValues(player(game)).maxHp;use(game,'pit.use',c=>c.params.slot===1);assert.equal(derivedActorValues(player(game)).maxHp,max+8);
  assert.equal(game.expeditionChoices().some(c=>c.type==='pit.use'&&c.params.slot===1),false);use(game,'pit.use',c=>c.params.slot===2);assert.equal(player(game).data.attributes.resources.hp,17);
  use(game,'pit.cast');assert.equal(derivedActorValues(player(game)).maxHp,max);
});
test('M3 representative Trait scopes never modify unrelated accuracy or effective CON',()=>{
  const actor=context().actor;actor.data.attributes.traits=['trait_charming','trait_off_putting'];assert.equal(traitBonus(actor,'cooperation'),0);assert.equal(traitBonus(actor,'intimidate'),2);
  actor.data.attributes.traits=['trait_quick','trait_hardy'];assert.equal(traitBonus(actor,''),0);assert.equal(traitBonus(actor,'escape'),2);assert.equal(traitBonus(actor,'resilience'),2);
});
test('M3 zero-Sanity fire consequence adjudicates death without implementing succession',()=>{
  const game=setup(entered(2),ctx=>{roomFixture(ctx,'hazard','hazard_burning_ruin');ctx.actor.data.attributes.traits=['trait_pyrophobic','trait_curious'];ctx.actor.data.attributes.baseStats.DEX=1;ctx.actor.data.attributes.resources.sanity=1;});
  use(game,'pit.resolve-room',c=>c.params.approach==='primary');assert.equal(player(game).data.death.cause,'sanity');assert.equal(pit(game).pendingDeath,null);assert.equal(pit(game).expedition,null);
  assert.equal(game.serviceChoices().length,0);assert.equal(game.expeditionChoices().length,0);assert.throws(()=>game.perform('Move',{location:'loc_inn'}));assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});
test('M3 Crystal Bow spends ammo and DUR on miss and cannot Block; all gear templates retain authored properties',()=>{
  const game=setup(entered(),(ctx,rng)=>{roomFixture(ctx);ctx.actor.data.inventory.equipped=[item(ctx.actor,'item_crystal_bow'),null,null,null];ctx.actor.data.attributes.resources.arrows=3;startCombat(ctx,'enemy_pit_hound','room',rng);ctx.expedition.combat.range='FAR';});
  use(game,'pit.attack');assert.equal(player(game).data.attributes.resources.arrows,2);assert.equal(player(game).data.inventory.equipped[0].durability,13);assert.equal(game.expeditionChoices().some(c=>c.params.mode==='block'),false);
  const copy=structuredClone(player(game));
  for(const recipe of catalog.recipes){const d=byId('items',recipe.output);assert.ok(d);if(d.maxDurability)assert.equal(item(copy,d.id).durability,d.maxDurability);}
  const ctx=context();ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_crystal_bow');ctx.actor.data.attributes.baseStats.DEX=1;ctx.actor.data.attributes.resources.arrows=3;startCombat(ctx,'enemy_pit_hound','room',dice(0));ctx.expedition.combat.range='FAR';attackWeapon(ctx,0,dice(0));assert.equal(ctx.expedition.lastResult.check.success,false);assert.equal(ctx.actor.data.attributes.resources.arrows,2);assert.equal(ctx.actor.data.inventory.equipped[0].durability,13);
});
test('M3 learned Unlock resolves authored bedroom once; Scrolls and Tomes exist for every spell',()=>{
  const game=setup(entered(),ctx=>{roomFixture(ctx,'event','event_locked_bedroom');ctx.actor.data.inventory.spells[0]='spell_unlock';ctx.actor.data.attributes.resources.essence=20;});use(game,'pit.cast');assert.equal(expedition(game).floor.rooms[0].resolved,true);assert.equal(expedition(game).strain,1);assert.equal(game.expeditionChoices().some(c=>c.type==='pit.cast'),false);
  for(const spell of catalog.spells)for(const type of ['scroll','tome'])assert.equal(byId('items',`item_${type}_${spell.id.slice(6)}`).spell,spell.id);
});
test('M3 Story priority/knowledge guards, first meeting and nonrepeating daily pool; Frail Talk recovery',()=>{
  const game=surfaceFixture((w,a)=>{a.data.attributes.traits=['trait_frail','trait_curious'];a.data.attributes.resources.sanity=3;});
  const before=player(game).data.relationships;service(game,'talk');const first=economyState(world(game)).lastResult;service(game,'talk');assert.notEqual(economyState(world(game)).lastResult,first);service(game,'talk');service(game,'talk');assert.equal(player(game).data.attributes.resources.sanity,4);assert.deepEqual(player(game).data.relationships,before);
  const speaker=Object.values(world(game).entities).find(a=>a.data?.templateId==='actor_tavi'),base=catalog.dialogues.find(d=>d.actor==='actor_tavi');
  const secret={...base,id:'secret',priority:'immediate',text:'PRIVATE',knowledge:[{subject:'secret',tag:'fact',state:'Known'}]};
  assert.notEqual(selectDialogue({speaker,listener:player(game),day:1,lines:[secret,base]}).text,'PRIVATE');
  assert.equal(selectDialogue({speaker,listener:player(game),day:1,lines:[secret,base],known:[{subject:'secret',tag:'fact',state:'Known'}]}).text,'PRIVATE');
});
