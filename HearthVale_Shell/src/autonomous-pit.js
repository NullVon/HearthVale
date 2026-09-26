import { byId } from '../../HearthVale_Content/expedition.js';
import { resolveSquare, squareEntityEffects } from './expedition-discovery.js';
import { firstGuardianClear, guardianWeek } from './guardian.js';

const pitGoals=new Set(['Make money through the Pit','Understand what comes out of the Pit','Find a place in HearthVale']);
const services=new Set(['actor_mira','actor_tavi','actor_lina','actor_garrick']);

// Compressed exploration, not an expedition simulator. Equipped usable weapons,
// a Pit-compatible Goal and a staging location establish adventurer capability.
export function autonomousPitChoices(world,actor,claimed=new Set()) {
  const pit=world.entities.hv_pit_1.data,r=actor.data.attributes?.resources,surface=world.globals.hearthvaleSurface;
  if(world.entities.hv_pit_1.lifecycle!=='active'||actor.id===surface.playerId||actor.actor?.controller!=='Autonomous'||actor.lifecycle!=='active'
    ||actor.primaryLocation===world.entities[surface.playerId].primaryLocation||!(r?.hp>0&&r.hearts>0)
    ||services.has(actor.data.templateId)||!pitGoals.has(actor.data.mainGoal)
    ||!['loc_guild','loc_pit_entrance'].includes(actor.primaryLocation)||pit.expedition?.active
    ||!actor.data.inventory?.equipped.some(i=>byId('items',i?.templateId)?.category==='weapon'&&i.durability>0
      &&(byId('items',i.templateId).ammo!=='item_arrows'||r.arrows>0)))return [];
  const depth=Math.max(pit.deepestReachedFloor??0,pit.lastExpedition?.deepestFloor??0);
  const square=pit.sunkenSquare,choices=[];
  const floor=square?.floor??Math.min(depth,9);
  if(!square?.known&&!claimed.has('discover-square')&&floor>=4&&floor<=9&&depth>=floor)
    choices.push({op:'discover-square',params:{floor}});
  const clear=firstGuardianClear(world),week=guardianWeek(surface.calendar.day);
  if(clear&&week>guardianWeek(clear.day)&&pit.guardianAutonomyWeek!==week&&!claimed.has('guardian-repeat'))
    choices.push({op:'guardian-repeat',params:{week}});
  return choices;
}

export function resolveAutonomousPit(world,actor,choice,claimed) {
  if(!autonomousPitChoices(world,actor,claimed).some(c=>c.op===choice.op))throw new Error('Autonomous Pit accomplishment unavailable');
  const pit=structuredClone(world.entities.hv_pit_1.data),calendar=world.globals.hearthvaleSurface.calendar;
  const ctx={actor,pit,day:calendar.day,year:calendar.year};
  if(choice.op==='discover-square') {
    pit.sunkenSquare??={floor:choice.params.floor,pending:true,remaining:2};
    resolveSquare(ctx);
  } else {
    const week=guardianWeek(calendar.day),record={id:`guardian-repeat-${calendar.year}-${week}`,kind:'guardian',domain:'pit',
      actor:actor.id,day:calendar.day,year:calendar.year,week,
      event:`${actor.data.identity.name} defeated the Ruin Brute (repeat victory).`};
    (pit.guardianVictories??=[]).push(record);pit.guardianAutonomyWeek=week;
    (actor.data.memories??=[]).push(record);
  }
  claimed.add(choice.op);
  const effects=squareEntityEffects(world,pit);
  for(const [key,value]of Object.entries(pit))if(JSON.stringify(value)!==JSON.stringify(world.entities.hv_pit_1.data[key]))
    effects.push({type:'data',entity:'hv_pit_1',key,value});
  // Subsequent Actors evaluate the actual shared result from this Day, not a
  // stale pre-boundary copy. Only the caller's local working world is changed.
  world.entities={...world.entities,hv_pit_1:{...world.entities.hv_pit_1,data:pit}};
  for(const effect of effects)if(effect.type==='create')world.entities[effect.entity.id]=effect.entity;
  return effects;
}
