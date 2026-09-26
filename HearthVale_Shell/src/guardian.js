import { DAYS_PER_WEEK } from './progression.js';

export const guardianWeek = day => Math.floor((day-1)/DAYS_PER_WEEK)+1;
// Legacy M3 saves contain only the actual player victory record.
export const firstGuardianClear = (world,pit=world.entities.hv_pit_1.data) => pit.guardianFirstClear
  ?? pit.guardianDefeated ?? null;

export function playerGuardianVictory(ctx) {
  if(ctx.actor.id!==ctx.world.globals.hearthvaleSurface.playerId)throw new Error('Guardian progression requires the player');
  const record={actor:ctx.actor.id,day:ctx.day,year:ctx.year??1};
  ctx.pit.guardianFirstClear??=firstGuardianClear(ctx.world,ctx.pit)??record;
  // Keep the old field as first-clear credit, never replace it with a repeat.
  ctx.pit.guardianDefeated=structuredClone(ctx.pit.guardianFirstClear);
  const stratum=ctx.pit.strata[0];
  stratum.cleared=true;stratum.waystoneUnlocked=true;
  stratum.guardian={...stratum.guardian,alive:false,defeatedBy:ctx.actor.id,day:ctx.day,year:ctx.year??1};
  ctx.pit.strata[1]={...ctx.pit.strata[1],locked:false,playable:false};
}

export function guardianWeeklyEffects(world) {
  const pit=world.entities.hv_pit_1,clear=firstGuardianClear(world),day=world.globals.hearthvaleSurface.calendar.day;
  if(!clear)return [];
  const strata=structuredClone(pit.data.strata);
  strata[0].guardian.alive=true;
  strata[0].guardian.respawnWeek=guardianWeek(day);
  return [{type:'data',entity:pit.id,key:'strata',value:strata}];
}
