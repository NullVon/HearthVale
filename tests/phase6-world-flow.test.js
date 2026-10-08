import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurfaceGame,createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { surfaceFixture,configure,service } from './helpers/m3-fixture.js';
import { entered,setup,roomFixture,world,player,pit,use,item } from './helpers/m2-fixture.js';
import { makeMaterialRequest } from '../HearthVale_Shell/src/living-situations.js';
import { livingSituationDefinitions } from '../HearthVale_Content/living-situations.js';
import { worldUpdates } from '../HearthVale_UI/world-updates.js';
import { advanceArrival } from '../HearthVale_UI/automatic-flow.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
const r=a=>a.data.attributes.resources;
const notice=g=>worldUpdates(world(g),player(g));
const receipt=g=>world(g).globals.hearthvaleServices.lastResult;
function candidates(){const g=createSurfaceGame({seed:17});for(let n=0;n<5;n++)g.openingNext();return g;}
function installRequest(g,d){
  const shell=createSurfaceShell();
  const runtime=createRuntime({saved:g.save(),shell:{...shell,actions:{...shell.actions,
    'fixture.phase6':{resolve:()=>({effects:[{type:'create',entity:makeMaterialRequest(d,'phase6_request',1)}]})}}}});
  runtime.startScene();runtime.submit({actor:player(g).id,type:'fixture.phase6'});runtime.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:runtime.save()});
}

test('Phase 6 personal crafting completion appears after sleep, survives reload and ends on collection',()=>{
  const g=surfaceFixture((w,a)=>{a.data.holdings={materials:{item_moonleaf:4},valuables:{}};});
  service(g,'turn-in',p=>p.item==='item_moonleaf');service(g,'order',p=>p.recipe==='recipe_hp_potion_greater');
  assert.equal(notice(g),'');g.perform('Move',{location:'loc_inn'});
  const sanity=r(player(g)).sanity;g.perform('surface.sleep',{day:1,confirmed:true});
  assert.match(notice(g),/Ready at the General Shop/);assert.match(notice(g),/Greater HP Potion ×2/);
  assert.equal(r(player(g)).sanity,sanity);assert.equal(r(player(g)).ap,4);
  const saved=g.save(),loaded=createSurfaceGame({saved});
  assert.equal(notice(loaded),notice(g));assert.equal(loaded.save(),saved);
  for(let n=0;n<3;n++)assert.equal(notice(g),notice(loaded));assert.equal(g.save(),saved);
  g.perform('Move',{location:'loc_shop'});service(g,'collect');assert.equal(notice(g),'');
  assert.equal(player(g).data.inventory.bag.find(i=>i?.templateId==='item_hp_potion_greater').quantity,2);
});

test('Phase 6 no notifications for NPC orders, routine resources or Training; blocked personal collection is explained',()=>{
  let g=surfaceFixture((w,a)=>{
    w.globals.hearthvaleServices.orders=[{id:'npc_order',actor:'hv_actor_2',item:'item_hp_potion_greater',quantity:2,readyDay:1}];
    w.globals.hearthvaleServices.auronTrainingUnlocked=true;r(a).gold+=5;r(a).xp+=1;
  });assert.equal(notice(g),'');
  g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];
    w.globals.hearthvaleServices.orders.push({id:'own_order',actor:a.id,item:'item_sword',quantity:1,readyDay:1});
    a.data.inventory.bag=Array.from({length:8},()=>item(a,'item_hammer'));
  });assert.match(notice(g),/Make room in your Bag/);assert.doesNotMatch(notice(g),/npc_order|own_order|Training|hearthvale|readyDay/);
  assert.equal(g.serviceChoices().some(c=>c.params.op==='collect'),false);
});

test('Phase 6 request receipts explain actual shop/civic supply changes without altering payment or replay',()=>{
  for(const d of [livingSituationDefinitions[0],livingSituationDefinitions[2]]){
    let g=surfaceFixture((w,a)=>{a.primaryLocation=d.location;a.data.holdings={materials:{[d.material]:d.quantity},valuables:{}};
      w.globals.hearthvaleServices.stock.item_hp_potion_basic=3;
    });g=installRequest(g,d);const before=structuredClone(r(player(g)));
    service(g,'fulfill-request');assert.match(receipt(g),d.stock.pool?/Town supplies gained 2 Iron Ore/:/General Shop gained 2 Basic HP Potion/);
    assert.equal(r(player(g)).gold,before.gold+d.reward.gold);assert.equal(r(player(g)).xp,before.xp+d.reward.xp);
    assert.equal(player(g).data.holdings.materials[d.material],0);
    assert.equal(world(g).entities.phase6_request.lifecycle,'resolved');
    const saved=g.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);assert.equal(receipt(loaded),receipt(g));
    assert.ok(!loaded.serviceChoices().some(c=>c.params.op==='fulfill-request'));
  }
});

test('Phase 6 Square discovery explains entry route once; rewards and room boundary remain intact',()=>{
  let g=setup(entered(),ctx=>{roomFixture(ctx,'discovery','loc_sunken_square');
    ctx.pit.sunkenSquare={floor:1,pending:true,remaining:2};ctx.actor.data.statuses={poison:true};r(ctx.actor).hp=10;
  });use(g,'pit.resolve-room');
  assert.match(pit(g).expedition.lastResult.text,/Future expeditions can enter via Sunken Square/);
  assert.equal(r(player(g)).hp,9);assert.equal(pit(g).sunkenSquare.remaining,1);
  assert.equal(pit(g).expedition.floor.rooms[0].resolved,true);
  const saved=g.save();assert.equal(createSurfaceGame({saved}).save(),saved);
  g=setup(g,ctx=>{roomFixture(ctx,'discovery','loc_sunken_square');});use(g,'pit.resolve-room');
  assert.doesNotMatch(pit(g).expedition.lastResult.text,/Future expeditions/);assert.equal(pit(g).sunkenSquare.remaining,0);
  const other=setup(entered(),ctx=>{roomFixture(ctx,'discovery','loc_sunken_square');
    ctx.pit.sunkenSquare={floor:1,pending:false,remaining:0,known:{actor:'hv_actor_2',finder:'Rook',year:1,day:1}};
  });use(other,'pit.resolve-room');assert.match(pit(other).expedition.lastResult.text,/Future expeditions/);
});

test('Phase 6 learning the Square through actual communication announces route without remote disclosure or repeat',()=>{
  const g=surfaceFixture((w,a)=>{a.primaryLocation='loc_inn';
    const known={actor:'hv_actor_2',finder:'Rook',year:1,day:1};
    w.entities.hv_pit_1.data.sunkenSquare={floor:5,pending:false,remaining:2,known};
    w.entities.hv_pit_1.data.discoveries={loc_sunken_square:{...known,title:'Sunken Square',templateId:'loc_sunken_square'}};
  });assert.doesNotMatch(notice(g),/Sunken Square/);
  g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>p.actor==='hv_actor_5');
  assert.match(receipt(g),/Future expeditions can enter via Sunken Square/);
  service(g,'talk',p=>p.actor==='hv_actor_5');assert.doesNotMatch(receipt(g),/Future expeditions/);
  g.perform('Move',{location:'loc_pit_entrance'});assert.ok(g.expeditionChoices().some(c=>c.params.shortcut));
});

test('Phase 6 Normal arrival is exactly the existing action; Dev keeps it, Mira and results are not auto-advanced',()=>{
  const g=candidates();assert.equal(advanceArrival(g),false);
  g.choose(world(g).globals.hearthvaleSurface.candidates[0].id);
  const saved=g.save(),manual=createSurfaceGame({saved});
  assert.equal(advanceArrival(g,true),false);assert.equal(g.save(),saved);
  assert.equal(advanceArrival(g),true);manual.perform('surface.arrive');assert.equal(g.save(),manual.save());
  assert.equal(world(g).globals.hearthvaleSurface.stage,'mira');
  assert.equal(advanceArrival(g),false);g.perform('surface.answer-mira',{response:'looking'});
  const reply=g.save();assert.equal(advanceArrival(g),false);assert.equal(g.save(),reply);
  assert.equal(world(g).globals.hearthvaleSurface.stage,'mira-reply');
});

test('Phase 6 empty-tab diagnostics remain in Dev only; unresolved empty room and its Poison decision remain',()=>{
  const g=setup(entered(),ctx=>{roomFixture(ctx,'empty','phase6_quiet_room');ctx.actor.data.inventory.spells.fill(null);ctx.actor.data.statuses={poison:true};});
  const saved=g.save(),normal=expeditionView(world(g),player(g),g.expeditionChoices(),'spells');
  const dev=expeditionView(world(g),player(g),g.expeditionChoices(),'spells',0,true);
  assert.doesNotMatch(normal,/No usable action in this tab|check-math|Player Attack phase/);
  assert.match(dev,/No usable action in this tab/);assert.match(normal,/Continue through the empty Room/);
  assert.equal(advanceArrival(g),false);assert.equal(g.save(),saved);
  const loot=setup(g,ctx=>{ctx.expedition.pendingLoot=[item(ctx.actor,'item_sword')];});
  assert.match(expeditionView(world(loot),player(loot),loot.expeditionChoices()),/<h1>Bag full<\/h1>/);
  assert.equal(advanceArrival(loot),false);assert.equal(pit(loot).expedition.pendingLoot.length,1);
});

test('Phase 6 UI selection and legacy load skip bare arrival, save completed transition, keep Dev/Mira choices',async()=>{
  const auto='hearthvale.surface.autosave.v1',manual='hearthvale.surface.save.v1';
  const candidate=candidates(),legacy=createSurfaceGame({saved:candidate.save()});
  legacy.choose(world(legacy).globals.hearthvaleSurface.candidates[0].id);
  const slots=new Map([[auto,candidate.save()],[manual,legacy.save()]]),status={textContent:''};let click,fail=false,writes=0;
  const app={innerHTML:'',addEventListener:(type,fn)=>{if(type==='click')click=fn;},querySelectorAll:()=>[],querySelector:()=>null};
  const mocks={document:{querySelector:s=>s==='#app'?app:status,body:{dataset:{}},documentElement:{classList:{contains:()=>false,toggle(){}}}},
    window:{addEventListener(){},scrollTo(){}},ResizeObserver:class{observe(){}},
    localStorage:{getItem:key=>slots.get(key),setItem:(key,value)=>{if(fail)throw Error('Quota');writes++;slots.set(key,value);}}};
  const originals=Object.fromEntries(Object.keys(mocks).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const dispatch=(command,value)=>click({target:{closest:()=>({dataset:{command,value},textContent:command})}});
  try{
    for(const [key,value]of Object.entries(mocks))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    await import('../HearthVale_UI/surface.js');dispatch('continue');assert.match(app.innerHTML,/Choose your adventurer/);
    dispatch('choose',world(candidate).globals.hearthvaleSurface.candidates[0].id);
    assert.doesNotMatch(app.innerHTML,/data-command="arrive"/);assert.match(app.innerHTML,/data-command="answer"/);
    assert.equal(world(createSurfaceGame({saved:slots.get(auto)})).globals.hearthvaleSurface.stage,'mira');assert.equal(writes,1);
    dispatch('answer','looking');assert.match(app.innerHTML,/data-command="finish-mira"/);assert.match(app.innerHTML,/SANITY/);
    dispatch('load');assert.equal(writes,3);assert.equal(slots.get(manual),legacy.save());
    assert.doesNotMatch(app.innerHTML,/data-command="arrive"/);
    dispatch('dev-mode');dispatch('load');assert.match(app.innerHTML,/data-command="arrive"/);
    dispatch('arrive');assert.match(app.innerHTML,/data-command="answer"/);
    dispatch('dev-mode');
    const ready=surfaceFixture((w,a)=>{w.globals.hearthvaleServices.orders=[{id:'ready_order',actor:a.id,item:'item_sword',quantity:1,readyDay:1}];});
    slots.set(manual,ready.save());dispatch('load');assert.match(app.innerHTML,/Ready at the General Shop/);
    const beforePanels=writes;dispatch('character');assert.doesNotMatch(app.innerHTML,/Ready at the General Shop/);
    dispatch('close');assert.match(app.innerHTML,/Ready at the General Shop/);assert.equal(writes,beforePanels);
    slots.set(manual,legacy.save());fail=true;dispatch('load');assert.match(status.textContent,/could not save/);
    assert.doesNotMatch(app.innerHTML,/data-command="arrive"/);assert.doesNotMatch(status.textContent,/Progress saved/);
  }finally{for(const [key,descriptor]of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
