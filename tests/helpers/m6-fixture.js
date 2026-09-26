import { entered,setup,item,use,world,player } from './m2-fixture.js';
import { surfaceFixture,configure } from './m3-fixture.js';
import { routeFloor } from '../../HearthVale_Shell/src/expedition-discovery.js';
import { finalHeartFixture } from './m5-fixture.js';

export function bruteFixture(day=1) {
  let g=configure(entered(),w=>{w.globals.hearthvaleSurface.calendar={year:1,day,week:Math.floor((day-1)/5)+1};});
  g=setup(g,(ctx,rng)=>{
    ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;
    ctx.actor.data.attributes.baseStats.STR=30;ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_fang_hammer');
  });
  use(g,'pit.guardian');return setup(g,ctx=>{ctx.expedition.combat.enemy.hp=1;});
}
export const chapterFixture=(day=40)=>surfaceFixture((w,a)=>{
  a.primaryLocation='loc_inn';w.globals.hearthvaleSurface.calendar={year:1,day,week:Math.floor((day-1)/5)+1};
});
export const death40Fixture=()=>configure(finalHeartFixture(),w=>{
  w.globals.hearthvaleSurface.calendar={year:1,day:40,week:8};
});
export {world,player,use,configure};
