import test from 'node:test';
import assert from 'node:assert/strict';
import { livingSituationDefinitions } from '../HearthVale_Content/living-situations.js';
import { makeMaterialRequest, situationDayEvents, livingSituations, requestChoices } from '../HearthVale_Shell/src/living-situations.js';
import { autonomousChoices, dayAutonomyEffects } from '../HearthVale_Shell/src/day-autonomy.js';
import { economyState } from '../HearthVale_Shell/src/economy.js';
import { createRuntime } from '../HearthVale_Shell/src/core.js';
import { createSurfaceGame, createSurfaceShell } from '../HearthVale_Shell/src/surface.js';
import { activeSituation } from '../HearthVale_Shell/src/situations.js';
import { surfaceFixture, configure, service } from './helpers/m3-fixture.js';

const definition = livingSituationDefinitions[0];
const worldOf = game => game.snapshot().world;
const playerOf = world => world.entities[world.globals.hearthvaleSurface.playerId];
const sleep = game => game.perform('surface.sleep', { confirmed: true, day: worldOf(game).globals.hearthvaleSurface.calendar.day });
function setup() {
  return surfaceFixture((world, actor) => {
    actor.primaryLocation = 'loc_inn';
    actor.data.holdings = { materials: { item_moonleaf: 10 } };
    world.globals.hearthvaleServices = economyState(world);
    world.globals.hearthvaleServices.stock.item_hp_potion_basic = 3;
    // Keep this M4B fixture focused on medicine pressure; M4D tests civic demand.
    world.globals.hearthvaleServices.townSupplies = { item_iron_ore: 2 };
  });
}
function installed(game, definitions = [definition]) {
  const base = createSurfaceShell();
  const runtime = createRuntime({ saved: game.save(), shell: { ...base, actions: { ...base.actions,
    'fixture.requests': { resolve: ({world}) => ({ effects: definitions.map((d,i) => ({ type: 'create',
      entity: makeMaterialRequest(d, `fixture_request_${i}`, world.globals.hearthvaleSurface.calendar.day) })) }) },
  } } });
  runtime.startScene(); runtime.submit({ actor: playerOf(worldOf(game)).id, type: 'fixture.requests' });
  runtime.resolveScene({ offscreenBudget: 0 });
  return createSurfaceGame({ saved: runtime.save() });
}

test('M4B real pressure creates a deterministic authored request only at a Day boundary; reload is exact', () => {
  const a = setup(), b = createSurfaceGame({ saved: a.save() });
  assert.equal(livingSituations(worldOf(a)).length, 0);
  for(let i=0;i<4 && !livingSituations(worldOf(a)).length;i++) { sleep(a); sleep(b); assert.equal(a.save(),b.save()); }
  const request = livingSituations(worldOf(a))[0];
  assert.ok(request, 'real low stock must produce a request in this seeded replay');
  assert.equal(request.data.sourceDefinitionId, definition.id);
  assert.equal(request.data.expiresDay-request.data.openedDay, 3);
  assert.equal(request.lifecycle,'active');
  assert.equal(createSurfaceGame({saved:a.save()}).save(),a.save());
  a.perform('Move',{location:'loc_shop'});
  assert.equal(livingSituations(worldOf(a)).length,1);
  assert.ok(a.serviceChoices().some(c=>c.params.op==='fulfill-request'));
});

test('M4B player delivery consumes exactly the request, restores stock, rewards and credits the actual resolver via Core', () => {
  const game = installed(setup());
  game.perform('Move',{location:'loc_shop'});
  const before=worldOf(game), actor=playerOf(before), request=livingSituations(before)[0];
  service(game,'fulfill-request');
  const after=worldOf(game), result=after.entities[request.id], player=playerOf(after);
  assert.equal(result.lifecycle,'resolved');
  assert.equal(result.data.resolver,player.id);
  assert.equal(player.data.holdings.materials.item_moonleaf,8);
  assert.equal(player.data.attributes.resources.gold,actor.data.attributes.resources.gold+10);
  assert.equal(player.data.attributes.resources.xp,actor.data.attributes.resources.xp+2);
  assert.equal(after.globals.hearthvaleServices.stock.item_hp_potion_basic,5);
  assert.deepEqual(result.data.record,player.data.memories.at(-1));
  assert.ok(Object.values(after.entities).some(e=>e.event?.type==='situation.changed'&&e.event.data.situation===request.id&&e.event.data.path==='delivered'));
  assert.ok(Object.values(after.entities).some(e=>e.claim?.actor===player.id&&e.claim.subject===request.id));
  assert.equal(game.serviceChoices().some(c=>c.params.op==='fulfill-request'),false);
  const saved=game.save();
  assert.throws(()=>game.perform('service.act',{op:'fulfill-request',situation:request.id}),/unavailable/);
  assert.equal(game.save(),saved);
  assert.equal(createSurfaceGame({saved}).save(),saved);
});

test('M4B autonomous delivery shares consequences, consumes its one accomplishment and cannot award a second resolver', () => {
  let game=installed(setup());
  game=configure(game,world=>{
    for(const id of ['hv_actor_2',world.globals.hearthvaleSurface.couldHaveId]){
      const actor=world.entities[id];actor.primaryLocation='loc_shop';
      actor.data.holdings={materials:{item_moonleaf:2}};
      actor.data.mainGoal='Keep the Inn going'; // Situation itself supplies motivation.
    }
  });
  const base=createSurfaceShell();
  const runtime=createRuntime({saved:game.save(),shell:{...base,actions:{...base.actions,
    'fixture.autonomy':{resolve:({world})=>{
      const state=economyState(world);
      return {effects:[...dayAutonomyEffects(world,state,{next:()=>0}),{type:'global',key:'hearthvaleServices',value:state}]};
    }},
  }}});
  runtime.startScene();runtime.submit({actor:playerOf(worldOf(game)).id,type:'fixture.autonomy'});runtime.resolveScene({offscreenBudget:0});
  const world=runtime.snapshot().world, request=livingSituations(world)[0];
  assert.equal(request.lifecycle,'resolved');assert.equal(request.data.resolver,'hv_actor_2');
  assert.equal(world.entities.hv_actor_2.data.holdings.materials.item_moonleaf,0);
  assert.equal(world.entities.hv_actor_2.data.memories.length,1);
  assert.equal(world.entities[world.globals.hearthvaleSurface.couldHaveId].data.memories,undefined);
  assert.equal(playerOf(world).data.memories,undefined);
  assert.equal(world.globals.hearthvaleServices.stock.item_hp_potion_basic,5);
  assert.equal(createSurfaceGame({saved:runtime.save()}).save(),runtime.save());
});

test('M4B request rewards join the existing profit category for authored Trait preferences', () => {
  const world=structuredClone(worldOf(installed(setup()))), actor=world.entities.hv_actor_2;
  actor.primaryLocation='loc_shop';actor.data.holdings={materials:{item_moonleaf:2},valuables:{item_town_medal:1}};
  for(const [trait,share]of [['trait_greedy',0.7],['trait_curious',0.3]]){
    actor.data.attributes.traits=[trait];
    const choices=autonomousChoices(world,actor,economyState(world));
    assert.ok(choices.some(c=>c.op==='fulfill-request'));
    const total=choices.reduce((s,c)=>s+c.weight,0),profit=choices.filter(c=>c.op!=='turn-in').reduce((s,c)=>s+c.weight,0);
    assert.equal(profit/total,share);
  }
});

test('M4B deadlines use Days, not free actions; expiration has no resolver or rewards', () => {
  const game=installed(setup());
  for(let i=0;i<3;i++) { game.perform('Move',{location:'loc_shop'});game.perform('Move',{location:'loc_inn'}); }
  const id=livingSituations(worldOf(game))[0].id;
  assert.equal(worldOf(game).entities[id].lifecycle,'active');
  for(let i=0;i<2;i++){sleep(game);assert.equal(worldOf(game).entities[id].lifecycle,'active');}
  const saved=game.save(), replay=createSurfaceGame({saved});sleep(game);sleep(replay);
  assert.equal(game.save(),replay.save());
  const s=worldOf(game).entities[id];assert.equal(s.lifecycle,'expired');assert.equal(s.data.resolver,null);
  assert.equal(s.data.expiresDay,4);assert.equal(s.data.record,undefined);
  assert.match(s.data.definition.expiryText,/withdrew/);
});

test('M4B Immediate/Short/Long bounds and authored-only escalation use Core lifecycle effects', () => {
  assert.throws(()=>makeMaterialRequest({...definition,duration:{kind:'Short',days:11}},'bad',1),/duration/);
  assert.throws(()=>makeMaterialRequest({...definition,duration:{kind:'Long',days:12}},'bad',1),/duration/);
  for(const [kind,days]of [['Immediate',1],['Short',2],['Long',11]])assert.equal(makeMaterialRequest({...definition,duration:{kind,days}},'test',1).data.expiresDay,1+days);
  const immediate={...definition,id:'fixture_immediate',duration:{kind:'Immediate',days:1}};
  const long={...definition,id:'fixture_long',duration:{kind:'Long',days:11},escalation:{afterDays:2}};
  const game=installed(setup(),[immediate,long,definition]);sleep(game);
  assert.equal(worldOf(game).entities.fixture_request_0.lifecycle,'expired');
  sleep(game);
  assert.equal(worldOf(game).entities.fixture_request_1.lifecycle,'escalated');
  assert.equal(worldOf(game).entities.fixture_request_2.lifecycle,'active');
  const s=worldOf(game).entities.fixture_request_1;assert.equal(s.data.expiresDay,12);
  assert.equal(createSurfaceGame({saved:game.save()}).save(),game.save());
});

test('M4B generation respects pressure, provider, duplicates, zero-to-two budget and global cap including unknown Situations', () => {
  const world=structuredClone(worldOf(setup()));
  world.globals.hearthvaleSurface.calendar.day=2;world.globals.hearthvaleSituationBoundary=2;
  const definitions=Array.from({length:12},(_,i)=>({...definition,id:`fixture_definition_${i}`}));
  const created=(w,sample=0.99,defs=definitions)=>situationDayEvents(w,{next:()=>sample},defs).flatMap(e=>e.effects).filter(e=>e.type==='create');
  assert.equal(created(world).length,2);assert.equal(created(world,0).length,0);
  world.globals.hearthvaleServices.stock.item_hp_potion_basic=8;assert.equal(created(world).length,0);
  world.globals.hearthvaleServices.stock.item_hp_potion_basic=3;
  world.entities.hv_actor_4.lifecycle='retired';assert.equal(created(world).length,0);world.entities.hv_actor_4.lifecycle='active';
  const own=makeMaterialRequest(definition,'existing',1);world.entities.existing=own;
  assert.equal(created(world,0.99,[definition]).length,0);
  for(let i=0;i<6;i++)world.entities[`foreign_${i}`]={id:`foreign_${i}`,data:{},situation:{paths:[]},lifecycle:'active'};
  assert.equal(created(world).length,1);
  world.entities.foreign_6={id:'foreign_6',data:{},situation:{paths:[]},lifecycle:'active'};
  assert.equal(created(world).length,0);
  assert.equal(Object.values(world.entities).filter(activeSituation).length,8);
  world.globals.hearthvaleSituationDay=2;assert.deepEqual(situationDayEvents(world,{next:()=>{throw Error('extra RNG');}}),[]);
});

test('M4B impossible delivery is excluded, pressure-eased terminal predicate cancels without borrowed credit', () => {
  let game=installed(setup());const world=structuredClone(worldOf(game)), actor=playerOf(world);
  actor.primaryLocation='loc_shop';actor.data.holdings.materials.item_moonleaf=1;
  assert.deepEqual(requestChoices(world,actor),[]);
  actor.data.holdings.materials.item_moonleaf=2;assert.equal(requestChoices(world,actor).length,1);
  world.entities.hv_actor_4.lifecycle='retired';assert.deepEqual(requestChoices(world,actor),[]);
  game=configure(game,w=>{w.globals.hearthvaleServices.stock.item_hp_potion_basic=8;});
  assert.equal(livingSituations(worldOf(game))[0].lifecycle,'cancelled');
  assert.equal(livingSituations(worldOf(game))[0].data.resolver,null);
});

test('M4B Long duration survives reload and expires at its exact deadline without implicit escalation', () => {
  let game=installed(setup(),[{...definition,id:'fixture_long_deadline',withdrawn:null,duration:{kind:'Long',days:11}}]);
  game=configure(game,w=>{w.globals.hearthvaleSurface.calendar.day=11;});
  const request=livingSituations(worldOf(game))[0];
  assert.equal(request.lifecycle,'active');assert.equal(request.data.expiresDay-11,1);
  const replay=createSurfaceGame({saved:game.save()});sleep(game);sleep(replay);
  assert.equal(game.save(),replay.save());
  assert.equal(livingSituations(worldOf(game))[0].lifecycle,'expired');
  assert.equal(livingSituations(worldOf(game))[0].data.escalated,false);
});

test('M4B sustained Core generation never exceeds eight active or two new per Day and replays exactly', () => {
  const definitions=Array.from({length:12},(_,i)=>({...definition,id:`fixture_pool_${i}`,duration:{kind:'Long',days:11}}));
  const base=createSurfaceShell();
  const shell={...base,worldProcesses:({world},{rng})=>situationDayEvents(world,rng,definitions),actions:{...base.actions,
    'fixture.next-day':{resolve:({world})=>{
      const surface=world.globals.hearthvaleSurface,day=surface.calendar.day+1;
      return {effects:[{type:'global',key:'hearthvaleSurface',value:{...surface,calendar:{...surface.calendar,day}}},
        {type:'global',key:'hearthvaleSituationBoundary',value:day}]};
    }},
  }};
  let a=createRuntime({saved:setup().save(),shell}),b=createRuntime({saved:a.save(),shell});
  let maximum=0;
  for(let i=0;i<16;i++){
    const before=livingSituations(a.snapshot().world).length;
    for(const runtime of [a,b]){runtime.startScene();runtime.submit({actor:playerOf(runtime.snapshot().world).id,type:'fixture.next-day'});runtime.resolveScene({offscreenBudget:0});}
    assert.equal(a.save(),b.save());
    const world=a.snapshot().world,active=livingSituations(world).filter(activeSituation);
    maximum=Math.max(maximum,active.length);
    assert.ok(active.length<=8);assert.ok(livingSituations(world).length-before<=2);
    assert.equal(new Set(active.map(s=>s.data.sourceDefinitionId)).size,active.length);
    b=createRuntime({saved:b.save(),shell});
  }
  assert.equal(maximum,8,'exercise the actual cap');
});
