import { entered,setup,roomFixture,item,use,world,player } from './m2-fixture.js';
import { configure,service } from './m3-fixture.js';
import { apply } from './m4-fixture.js';
import { routeFloor } from '../../HearthVale_Shell/src/expedition-discovery.js';
import { makeMaterialRequest } from '../../HearthVale_Shell/src/living-situations.js';
import { livingSituationDefinitions } from '../../HearthVale_Content/living-situations.js';

export function finalHeartFixture(game=entered()) {
  let g=configure(game,w=>{Object.values(w.entities).find(a=>a.data?.templateId==='actor_auron').data.protectionUnavailable=true;});
  if(!world(g).entities.hv_pit_1.data.expedition){g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter');}
  return setup(g,ctx=>{roomFixture(ctx,'empty','fixture_poison');
    ctx.actor.data.attributes.resources.hearts=1;ctx.actor.data.attributes.resources.hp=1;ctx.actor.data.statuses={poison:true};});
}
export function richLifeFixture(){
  let g=setup(entered(),(ctx,rng)=>{
    ctx.pit.sunkenSquare={floor:5,pending:true,remaining:2};ctx.expedition.floor=routeFloor(ctx,5,1,[],rng);
    ctx.expedition.deepestFloor=5;ctx.expedition.roomIndex=0;
  });use(g,'pit.resolve-room');
  g=setup(g,(ctx,rng)=>{ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;
    ctx.actor.data.attributes.baseStats.STR=30;ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_fang_hammer');
    ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;});
  use(g,'pit.guardian');g=setup(g,ctx=>{ctx.expedition.combat.enemy.hp=1;});use(g,'pit.attack',c=>c.params.slot===0);
  // Historical M5 subsystem fixture: V1 now stops at this victory. Explicitly
  // reopen only this test snapshot to retain post-clear archive regression coverage.
  g=configure(g,w=>{w.globals.hearthvaleCompletion=null;});use(g,'pit.cast');
  g=configure(g,w=>{w.entities[player(g).id].data.holdings={materials:{item_iron_ore:3}};});
  g.perform('Move',{location:'loc_shop'});service(g,'turn-in',p=>p.item==='item_iron_ore');
  g=apply(g,()=>[{type:'create',entity:makeMaterialRequest(livingSituationDefinitions.find(d=>d.id==='situation_town_supply'),'m5_town_supply',1)}]);
  g.perform('Move',{location:'loc_town_hall'});service(g,'fulfill-request',p=>p.situation==='m5_town_supply');
  return finalHeartFixture(g);
}
