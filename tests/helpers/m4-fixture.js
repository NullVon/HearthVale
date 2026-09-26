import { configure,surfaceFixture } from './m3-fixture.js';
import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceGame,createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { startCombat } from '../../HearthVale_Shell/src/expedition-combat.js';
import { economyState } from '../../HearthVale_Shell/src/economy.js';
import { livingSituationDefinitions } from '../../HearthVale_Content/living-situations.js';
import { makeMaterialRequest } from '../../HearthVale_Shell/src/living-situations.js';
export const worldOf=g=>g.snapshot().world;
export const player=w=>w.entities[w.globals.hearthvaleSurface.playerId];
export const sleep=g=>g.perform('surface.sleep',{confirmed:true,day:worldOf(g).globals.hearthvaleSurface.calendar.day});
export function apply(game,fn){const base=createSurfaceShell(),r=createRuntime({saved:game.save(),shell:{...base,
  actions:{...base.actions,'fixture.m4':{resolve:({world},{rng})=>({effects:fn(world,rng)})}}}});
  r.startScene();r.submit({actor:player(worldOf(game)).id,type:'fixture.m4'});r.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:r.save()});}
export function integratedFixture(){
  let g=surfaceFixture((w,a)=>{a.primaryLocation='loc_guild';a.data.holdings={materials:{item_iron_ore:2}};
    const rook=w.entities.hv_actor_2;rook.primaryLocation='loc_guild';
    startCombat({actor:rook,pit:w.entities.hv_pit_1.data,day:1,year:1,
      expedition:{id:'m4_prior_encounter',nextEnemyInstance:1,floor:{number:2}}},'enemy_pit_hound','room',{next:()=>0});
    w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.stock.item_hp_potion_basic=2;
    const other=w.entities[w.globals.hearthvaleSurface.couldHaveId];other.primaryLocation='loc_shop';
    other.data.holdings={materials:{item_iron_ore:1}};other.data.mainGoal='Understand what comes out of the Pit';
  });
  return apply(g,()=>livingSituationDefinitions.filter(d=>d.id!=='situation_moonleaf_shortage')
    .map(d=>({type:'create',entity:makeMaterialRequest(d,`integration_${d.id}`,1)})));
}
export function sparseFixture(){return configure(surfaceFixture(),w=>{
  player(w).primaryLocation='loc_inn';w.globals.hearthvaleServices=economyState(w);
  w.globals.hearthvaleServices.townSupplies={item_iron_ore:2};
  w.globals.hearthvaleSurface.calendar.day=5;
});}
