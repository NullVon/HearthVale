import { generateFloor } from './expedition-generation.js';
import { offerLoot } from './expedition-loot.js';

export function routeFloor(ctx, number, attempt, prefix, rng) {
  const square=ctx.pit.sunkenSquare;
  const eligible=number>=4 && number<=9;
  const place=eligible && (square ? square.floor===number || square.pending : number===9 || rng.next()<0.2);
  if(place) {
    ctx.pit.sunkenSquare ??= {floor:number,pending:true,remaining:2};
    if(!ctx.pit.sunkenSquare.known) ctx.pit.sunkenSquare.floor=number;
    // A named Room counts toward the ordinary count and family constraints.
    const first={id:`square_${number}_${attempt}`,templateId:'loc_sunken_square',encounter:'loc_sunken_square',family:'discovery',title:'Sunken Square',resolved:false};
    // If the previous Floor ends with two discoveries, use one ordinary Room
    // before the Square, retaining both the count and cross-Floor constraint.
    if(prefix.at(-1)==='discovery' && prefix.at(-2)==='discovery') {
      const floor=generateFloor(number,attempt,prefix,rng);
      floor.rooms[1]=first;
      if(floor.rooms[2]?.family==='discovery') floor.rooms[2].family='empty',floor.rooms[2].encounter='square_quiet_lane',floor.rooms[2].title='Quiet Lane';
      return floor;
    }
    return generateFloor(number,attempt,prefix,rng,first);
  }
  return generateFloor(number,attempt,prefix,rng);
}
export function resolveSquare(ctx) {
  const square=ctx.pit.sunkenSquare;
  const first=!square.known;
  square.known ??= {actor:ctx.actor.id,finder:ctx.actor.data.identity.name,year:ctx.year??1,day:ctx.day};
  square.pending=false;
  ctx.pit.discoveries ??= {};
  ctx.pit.discoveries.loc_sunken_square={...square.known,title:'Sunken Square',templateId:'loc_sunken_square'};
  ctx.pit.strata[0].sunkenSquareDiscovered=true;
  if(first)(ctx.actor.data.memories??=[]).push({...square.known,id:'discovery-loc_sunken_square',kind:'discovery',tag:'info_discovery',
    event:`Sunken Square discovered by ${square.known.finder}, Year ${square.known.year}, Day ${square.known.day}.`});
  const rewards=[];
  if(square.remaining>0){rewards.push(offerLoot(ctx,square.remaining===2?'item_town_medal':'item_moonleaf'));square.remaining--;}
  return {text:`Sunken Square — found by ${square.known.finder}, Year ${square.known.year}, Day ${square.known.day}. A partially preserved central square; it is not a safe haven.`,rewards,discovery:square.known};
}

export function squareInformation(pit) {
  const d=pit.discoveries?.loc_sunken_square;
  return d?{...d,id:'discovery-loc_sunken_square',topic:'discovery-loc_sunken_square',domain:'discovery',tag:'info_discovery',observedDay:d.day,
    text:`Sunken Square discovered by ${d.finder}, Year ${d.year}, Day ${d.day}.`}:null;
}
export function squareEntityEffects(world,pit) {
  const known=pit.sunkenSquare?.known;
  return known&&!world.entities.loc_sunken_square?[{type:'create',entity:{id:'loc_sunken_square',type:'hearthvale.location',primaryLocation:'hv_pit_1',
    data:{name:'Sunken Square',pit:'hv_pit_1',persistence:'permanent',discovered:true,recognized:true,finder:known.actor,year:known.year,day:known.day}}}]:[];
}
