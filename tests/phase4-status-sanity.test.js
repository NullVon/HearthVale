import test from 'node:test';
import assert from 'node:assert/strict';
import { entered,setup,context,combatFixture,roomFixture,world,player,pit,expedition,item,dice,use } from './helpers/m2-fixture.js';
import { surfaceFixture,configure,service } from './helpers/m3-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { expeditionCatalog as catalog,byId } from '../HearthVale_Content/expedition.js';
import { applyPoison,noncombatCheck } from '../HearthVale_Shell/src/expedition-checks.js';
import { forward,finishExpeditionAction,requestReturn,handleDefeat,retreat } from '../HearthVale_Shell/src/expedition-lifecycle.js';
import { attackUnarmed,defend,startCombat } from '../HearthVale_Shell/src/expedition-combat.js';
import { resolveRoom,explorationSpell } from '../HearthVale_Shell/src/expedition-rooms.js';
import { generateFloor } from '../HearthVale_Shell/src/expedition-generation.js';
import { useBag } from '../HearthVale_Shell/src/expedition-equipment.js';
import { economyState,shopOffers,resolveEconomy } from '../HearthVale_Shell/src/economy.js';
import { talk } from '../HearthVale_Shell/src/social.js';
import { sanityBand } from '../HearthVale_Shell/src/sanity.js';
import { hud,statusView } from '../HearthVale_UI/surface-views.js';
import { statusDetails } from '../HearthVale_Story/statuses.js';
import { miraClosing,traitDescriptions } from '../HearthVale_Story/surface.js';
import { heldInformation } from '../HearthVale_Shell/src/information.js';

const r=a=>a.data.attributes.resources;
const reload=g=>{const saved=g.save(),copy=createSurfaceGame({saved});copy.resumeFlow();assert.equal(copy.save(),saved);return copy;};
const both=(a,b,type,params={})=>{a.perform(type,params);b.perform(type,params);assert.equal(a.save(),b.save());};
const cleanContext=()=>{const ctx=context();ctx.actor.data.attributes.traits=[];return ctx;};
const noRng={next(){throw Error('Unexpected random draw');}};

test('Phase 4 Poison presentation, resistance/nonstacking, Dodge and one boundary tick',()=>{
  const ctx=cleanContext();ctx.actor.data.statuses={};
  ctx.actor.data.attributes.traits=['trait_tough_stomach'];assert.match(applyPoison(ctx.actor,dice(0)),/resisted/);
  assert.equal(ctx.actor.data.statuses.poison,undefined);applyPoison(ctx.actor,dice(.99));
  assert.match(applyPoison(ctx.actor,noRng),/does not stack/);
  assert.equal(statusDetails.poison.name,'POISONED');assert.match(statusView(ctx.actor),/Antidote or Cleanse Tonic/);
  assert.match(statusView(ctx.actor),/ordinary Heart loss/);
  const g=setup(entered(),ctx=>{roomFixture(ctx,'empty','empty_tick');ctx.actor.data.statuses={poison:true};});
  const hp=r(player(g)).hp,copy=reload(g);both(g,copy,'pit.resolve-room',{approach:'inspect'});
  assert.equal(r(player(g)).hp,hp-1);assert.match(expedition(g).lastResult.text,/POISONED — 1 HP lost/);
  reload(g);g.expeditionChoices();hud(player(g),world(g).globals.hearthvaleSurface.calendar);assert.equal(r(player(g)).hp,hp-1);
  const dodge=cleanContext();dodge.actor.data.statuses={};dodge.actor.data.attributes.baseStats.DEX=30;
  dodge.expedition.combat.committed={...byId('moves','move_venom_bite'),offensive:true};
  defend(dodge,'dodge',undefined,dice(0));assert.equal(dodge.actor.data.statuses.poison,undefined);
  const round=cleanContext();round.actor.data.statuses={poison:true};round.expedition.combat.phase='incoming';round.expedition.combat.committed.damage=0;
  const before=r(round.actor).hp;defend(round,'dodge',undefined,dice(.99));finishExpeditionAction(round,dice(.2));
  assert.equal(r(round.actor).hp,before-1);finishExpeditionAction(round,noRng);assert.equal(r(round.actor).hp,before-1);
});

test('Phase 4 Return, Return victory and Teleport preserve Poison; ordinary Heart loss clears it',()=>{
  for(const route of ['return','victory','teleport','heart-loss']){
    const ctx=cleanContext();ctx.actor.data.statuses={poison:true};const hp=r(ctx.actor).hp;
    if(route==='return'){ctx.expedition.combat=null;ctx.actor.data.attributes.baseStats.WIS=30;requestReturn(ctx,dice(.99));}
    if(route==='victory'){ctx.expedition.combat.kind='return';ctx.expedition.combat.enemy.hp=1;attackUnarmed(ctx,dice(.99));finishExpeditionAction(ctx,dice(.99));}
    if(route==='teleport'){ctx.expedition.combat=null;r(ctx.actor).essence=30;explorationSpell(ctx,'spell_teleport',dice(0));}
    if(route==='heart-loss'){r(ctx.actor).hp=0;handleDefeat(ctx,dice(0),'Poison');}
    assert.equal(ctx.pit.expedition,null);assert.equal(ctx.actor.data.statuses.poison,route==='heart-loss'?undefined:true);
    if(route!=='heart-loss')assert.equal(r(ctx.actor).hp,hp); // No victory/Return tick.
  }
  for(const cure of ['item_antidote','item_cleanse_tonic']){
    const ctx=cleanContext();ctx.actor.data.statuses={poison:true};ctx.actor.data.inventory.bag[0]=item(ctx.actor,cure);
    assert.match(useBag(ctx.actor,0,noRng).text,/Poison cured/);assert.equal(ctx.actor.data.statuses.poison,undefined);
  }
});

test('Phase 4 Antidote baseline and legacy missing stock load without RNG or mutation',()=>{
  assert.equal(byId('items','item_antidote').price,8);
  assert.deepEqual(catalog.vendors[0].stock.find(s=>s.item==='item_antidote'),{item:'item_antidote',target:4,floor:1});
  assert.ok(catalog.recipes.some(x=>x.output==='item_antidote'));
  const g=surfaceFixture(),saved=JSON.parse(g.save());delete saved.state.world.globals.hearthvaleServices.stock.item_antidote;
  const text=JSON.stringify(saved),legacy=createSurfaceGame({saved:text});assert.equal(legacy.save(),text);
  assert.equal(economyState(world(legacy)).stock.item_antidote,4);assert.equal(legacy.save(),text);
  const actor=structuredClone(player(g)),state=economyState(world(g));actor.data.attributes.traits=[];
  for(let i=0;i<3;i++)resolveEconomy({actor,state,world:world(g),day:1},'buy',{item:'item_antidote'},noRng);
  assert.equal(state.stock.item_antidote,1);assert.match(shopOffers(actor,state).find(o=>o.item.templateId==='item_antidote').reason,/reserve/);
});

test('Phase 4 daily Talk is Actor-local Year/Day, ignores legacy counter and firstOnly',()=>{
  const g=surfaceFixture(),ctx={actor:structuredClone(player(g)),world:structuredClone(world(g)),state:{},day:1};
  const people=Object.values(ctx.world.entities).filter(a=>a.data?.templateId==='actor_tavi'||a.data?.templateId==='actor_mira');
  ctx.actor.data.talkCount=999;ctx.actor.data.attributes.traits=['trait_frail'];r(ctx.actor).sanity=3;
  talk(ctx,people[0],true);assert.equal(r(ctx.actor).sanity,3);assert.equal(ctx.actor.data.sanityTalkRecovery,undefined);
  talk(ctx,people[0]);assert.equal(r(ctx.actor).sanity,4);assert.match(ctx.state.lastResult,/Sanity \+1.*Uneasy/);
  talk(ctx,people[1]);assert.equal(r(ctx.actor).sanity,4);assert.equal(ctx.actor.data.talkCount,999);
  ctx.day=2;talk(ctx,people[0]);assert.equal(r(ctx.actor).sanity,5);
  ctx.day=3;talk(ctx,people[0]);assert.equal(ctx.actor.data.sanityTalkRecovery.day,2);
  r(ctx.actor).sanity=3;talk(ctx,people[0]);assert.equal(r(ctx.actor).sanity,4);
  ctx.world.globals.hearthvaleSurface.calendar.year=2;talk(ctx,people[0]);assert.equal(r(ctx.actor).sanity,5);
  assert.deepEqual(ctx.actor.data.sanityTalkRecovery,{year:2,day:3});
  assert.doesNotMatch(traitDescriptions.trait_frail,/Talk|Sanity/);
  assert.match(miraClosing.join(' '),/first ordinary conversation each day restores 1 Sanity/);
  assert.match(miraClosing.join(' '),/Sleeping restores HP, but does not restore Sanity/);
});

test('Phase 4 ordinary Talk exact reload cannot repeat recovery; sleeping preserves Sanity',()=>{
  let g=surfaceFixture((w,a)=>{r(a).sanity=2;}),copy=reload(g);
  const choice=g.serviceChoices().find(c=>c.params.op==='talk');both(g,copy,choice.type,choice.params);
  assert.equal(r(player(g)).sanity,3);copy=reload(g);both(g,copy,choice.type,choice.params);assert.equal(r(player(g)).sanity,3);
  g.perform('Move',{location:'loc_inn'});copy=reload(g);
  both(g,copy,'surface.sleep',{day:world(g).globals.hearthvaleSurface.calendar.day,confirmed:true});
  assert.equal(r(player(g)).sanity,3);service(g,'talk');assert.equal(r(player(g)).sanity,4);
});

test('Phase 4 bands are presentation only at 4/3; no hidden check or stat penalties',()=>{
  const ctx=cleanContext(),stats=structuredClone(ctx.actor.data.attributes.baseStats);
  for(const [value,label]of [[5,'Stable'],[4,'Uneasy'],[3,'Fraying'],[2,'Unstable'],[1,'Breaking'],[0,'Broken']]){
    assert.equal(sanityBand(value),label);r(ctx.actor).sanity=value;
    const html=hud(ctx.actor,{year:1,day:1});assert.match(html,new RegExp(`Sanity ${value}/5`));
    if(value<5)assert.match(html,new RegExp(label));else assert.doesNotMatch(html,/Stable/);
  }
  const checks=[];for(const value of [5,4,3]){r(ctx.actor).sanity=value;checks.push(noncombatCheck(ctx,{stat:'WIS',scope:'mental',dc:11},dice(.4)));}
  assert.deepEqual(checks[0],checks[1]);assert.deepEqual(checks[0],checks[2]);assert.deepEqual(ctx.actor.data.attributes.baseStats,stats);
});

test('Phase 4 Event selection uses the same deck card, family and single template draw',()=>{
  assert.equal(catalog.events.filter(e=>e.subjective).length,2);
  for(const sanity of [1,2,3,4,5]){
    const state={roomDeck:['event','event','empty','combat']};let draws=0;
    const floor=generateFloor(1,1,[],{next(){draws++;return .1;}},null,state,sanity);
    assert.deepEqual(state.roomDeck,['combat']);assert.equal(draws,4); // Count + one selection per room.
    const events=floor.rooms.filter(r=>r.family==='event');assert.equal(events.length,2);
    assert.equal(new Set(events.map(e=>e.encounter)).size,2);
    for(const e of events)assert.equal(!!byId('events',e.encounter).subjective,sanity<=2);
  }
});

test('Phase 4 production entry saves hallucination selection with the consumed Event cards',()=>{
  const g=setup(entered(),ctx=>{
    ctx.pit.expedition=null;ctx.actor.primaryLocation='loc_pit_entrance';r(ctx.actor).sanity=2;
    ctx.pit.roomDeck=['event','event','combat','treasure'];
  });
  let copy=reload(g);both(g,copy,'pit.enter');
  const rooms=expedition(g).floor.rooms;
  assert.ok(rooms.slice(0,2).every(room=>room.family==='event'&&byId('events',room.encounter).subjective));
  assert.equal(pit(g).roomDeck.includes('event'),false);
  copy=reload(g);both(g,copy,'pit.forward');
  assert.deepEqual(expedition(g).floor.rooms,rooms); // Entry does not select the Event again.
});

test('Phase 4 hallucination DCs, safe choice, mental bonus, loss and subjective history',()=>{
  for(const [id,key,dc]of [['the_body','endure',11],['wrong_reflection','closer',14],['horrific_remains','endure',11]]){
    for(const success of [false,true]){
      const ctx=cleanContext();roomFixture(ctx,'event',`event_${id}`);r(ctx.actor).sanity=2;
      ctx.actor.data.attributes.traits=['trait_strong_willed'];
      resolveRoom(ctx,`choice_${id}_${key}`,dice(success ? .99 : 0));
      assert.equal(ctx.expedition.lastResult.check.dc,dc);assert.equal(ctx.expedition.lastResult.check.bonus,2);
      assert.equal(r(ctx.actor).sanity,success?2:1);
      if(id!=='horrific_remains'){
        assert.equal(ctx.pit.eventHistory,undefined);assert.equal(ctx.actor.data.observations,undefined);assert.equal(ctx.actor.data.rumors,undefined);
        assert.match(ctx.actor.data.memories.at(-1).event,/Experienced a hallucination/);
      }else assert.equal(ctx.pit.eventHistory.at(-1).event,'event_horrific_remains');
    }
  }
  const away=cleanContext();roomFixture(away,'event','event_wrong_reflection');r(away.actor).sanity=1;
  // Baseline room reward still uses the existing room flow; safe choice itself has no check.
  resolveRoom(away,'choice_wrong_reflection_away',dice(.99));assert.equal(r(away.actor).sanity,1);assert.equal(away.expedition.lastResult.check,null);
  const hazard=cleanContext();roomFixture(hazard,'hazard','hazard_whispering_depths');r(hazard.actor).sanity=3;hazard.actor.data.attributes.traits=['trait_strong_willed'];
  resolveRoom(hazard,'primary',dice(0));assert.equal(hazard.expedition.lastResult.check.dc,14);assert.equal(hazard.expedition.lastResult.check.bonus,2);
  assert.equal(r(hazard.actor).sanity,2);assert.match(hazard.expedition.lastResult.text,/Sanity -1.*Unstable/);
});

test('Phase 4 hallucination reload never repeats outcome or creates institutional Information',()=>{
  const g=setup(entered(),ctx=>{roomFixture(ctx,'event','event_the_body');r(ctx.actor).sanity=2;ctx.actor.data.attributes.baseStats.WIS=1;ctx.actor.data.attributes.traits=[];});
  const copy=reload(g);both(g,copy,'pit.resolve-room',{approach:'choice_the_body_endure'});reload(g);
  assert.equal(pit(g).eventHistory,undefined);assert.throws(()=>g.perform('pit.resolve-room',{approach:'choice_the_body_endure'}),/unavailable/);
  for(const holder of [player(g).id,'loc_guild','loc_town_hall','loc_shop']){
    assert.doesNotMatch(JSON.stringify(heldInformation(world(g),holder)),/event_the_body|wrong_reflection/);
  }
});

test('Phase 4 Hollow Double exact stats/moves; first entered ordinary Combat only, even after Retreat',()=>{
  const e=byId('enemies','enemy_hollow_double');assert.deepEqual([e.hp,e.defense,e.combatStats,e.xp,e.harvest],[14,1,{STR:3,DEX:3},5,[]]);
  assert.deepEqual(e.moves.entries.map(x=>{const m=byId('moves',x.target);return [m.label,m.damage,m.impact,m.speed,m.qualityStat,x.weight];}),[
    ['Quick Strike',3,1,1,'DEX',60],['Heavy Blow',5,2,-1,'STR',40],
  ]);
  const g=setup(entered(),ctx=>{roomFixture(ctx);ctx.expedition.roomIndex=-1;r(ctx.actor).sanity=1;});
  let copy=reload(g);both(g,copy,'pit.forward');assert.equal(expedition(g).combat.enemy.templateId,e.id);assert.equal(expedition(g).manifestationAppeared,true);
  assert.ok(!pit(g).knownEnemies?.includes(e.id));copy=reload(g);both(g,copy,'pit.retreat');assert.equal(expedition(g).manifestationAppeared,true);
  const next=setup(g,ctx=>{roomFixture(ctx);ctx.expedition.roomIndex=-1;});next.perform('pit.forward');assert.equal(expedition(next).combat.enemy.templateId,'enemy_slime');
  const ctx=cleanContext();r(ctx.actor).sanity=1;startCombat(ctx,'enemy_slime','return',dice(0));assert.equal(ctx.expedition.combat.enemy.templateId,'enemy_slime');
  startCombat(ctx,'enemy_ruin_brute','room',dice(0));assert.equal(ctx.expedition.combat.enemy.templateId,'enemy_ruin_brute');
  roomFixture(ctx,'treasure','m2_buried_shelf');ctx.expedition.roomIndex=-1;forward(ctx,dice(0));assert.equal(ctx.expedition.combat,null);
});

test('Phase 4 Hollow victory grants 5 XP and one Sanity plus current room supply, no creature drops/knowledge or Poison tick across reload',()=>{
  const g=setup(entered(),ctx=>{roomFixture(ctx);ctx.expedition.roomIndex=-1;r(ctx.actor).sanity=1;ctx.actor.data.statuses={poison:true};});g.perform('pit.forward');
  const ready=setup(g,ctx=>{ctx.expedition.combat.enemy.hp=1;ctx.expedition.combat.enemyKnockdown=true;});
  const before=structuredClone(player(ready)),copy=reload(ready);both(ready,copy,'pit.unarmed');
  assert.equal(r(player(ready)).xp,r(before).xp+5);assert.equal(r(player(ready)).sanity,2);assert.equal(r(player(ready)).hp,r(before).hp);
  assert.equal(r(player(ready)).gold,r(before).gold);assert.equal(r(player(ready)).essence,r(before).essence+1);
  const rewards=expedition(ready).lastResult.rewards,arrow=rewards.find(reward=>reward.resource==='arrows');
  assert.equal(r(player(ready)).arrows,r(before).arrows+(arrow?.quantity??0));
  assert.ok(!arrow||[1,2].includes(arrow.quantity));
  assert.deepEqual(player(ready).data.holdings,before.data.holdings);
  assert.deepEqual(rewards.filter(reward=>reward.resource!=='arrows'),[{resource:'xp',quantity:5},{resource:'essence',quantity:1}]);
  assert.match(expedition(ready).lastResult.text,/comes apart.*Sanity \+1.*Unstable/);reload(ready);
  assert.ok(!pit(ready).knownEnemies?.includes('enemy_hollow_double'));
  for(const holder of [player(ready).id,'loc_guild','loc_town_hall'])assert.doesNotMatch(JSON.stringify(heldInformation(world(ready),holder)),/enemy_hollow_double/);
});

test('Phase 4 Sanity loss to zero adjudicates death before recovery, preserves Hearts and prevents Auron rescue',()=>{
  // WIS 1 + even d20 20 can pass; choose a deterministic fixture via the existing resolver.
  let g=setup(entered(),ctx=>{roomFixture(ctx,'event','event_the_body');r(ctx.actor).sanity=1;ctx.actor.data.attributes.traits=[];ctx.actor.data.attributes.baseStats.WIS=1;});
  g=configure(g,(w,rng)=>{const a=w.entities[w.globals.hearthvaleSurface.playerId],p=w.entities.hv_pit_1.data;
    const ctx={world:w,actor:a,pit:p,pitId:'hv_pit_1',expedition:p.expedition,day:1};resolveRoom(ctx,'choice_the_body_endure',dice(0));finishExpeditionAction(ctx,rng);
  });
  assert.equal(player(g).data.death.cause,'sanity');assert.equal(r(player(g)).hearts,3);assert.equal(g.serviceChoices().length,0);
  assert.equal(Object.values(world(g).entities).find(a=>a.data?.templateId==='actor_auron').data.rescueCount,undefined);
  reload(g);
});
