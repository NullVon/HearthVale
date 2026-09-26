import { DAYS_PER_WEEK } from './progression.js';
import { knownHistory, reconcileRecordIndexes } from './history-records.js';
import { guardianWeeklyEffects } from './guardian.js';

export function weeklyDue(world) {
  const surface=world.globals.hearthvaleSurface,completedDay=surface?.calendar.day-1;
  return surface?.stage==='surface' && world.globals.hearthvaleSituationBoundary===surface.calendar.day
    && completedDay>0 && completedDay%DAYS_PER_WEEK===0
    && (world.globals.hearthvaleWeekly?.lastCompletedDay??0)<completedDay;
}

// Deferred emit runs after the ordinary boundary's generated events/effects and
// their perception. No second Actor pass, RNG draw, reward or resource operation.
export function weeklyEvents(world) {
  return weeklyDue(world) ? [{type:'hearthvale.weekly-ready',effects:[
    {type:'emit',event:{type:'hearthvale.weekly-reconcile'}},
  ]}] : [];
}

export function weeklyConsequences({event,world}) {
  if(event.event.type!=='hearthvale.weekly-reconcile'||!weeklyDue(world))return [];
  const surface=world.globals.hearthvaleSurface,completedDay=surface.calendar.day-1;
  const previous=world.globals.hearthvaleWeekly??{lastCompletedDay:0,snapshots:[]};
  const firstDay=completedDay-DAYS_PER_WEEK+1;
  const facts=knownHistory(world,surface.playerId).filter(f=>f.day>=firstDay&&(f.day<=completedDay
      || f.day===completedDay+1&&f.id.startsWith('situation:')))
    .filter(f=>!previous.snapshots.some(s=>s.facts.some(old=>old.id===f.id&&old.text===f.text)))
    .sort((a,b)=>a.priority-b.priority||a.day-b.day||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,5);
  const snapshot={week:completedDay/DAYS_PER_WEEK,firstDay,completedDay,holder:surface.playerId,facts};
  return [...guardianWeeklyEffects(world),{type:'global',key:'hearthvaleWeekly',value:{lastCompletedDay:completedDay,
    snapshots:[...previous.snapshots,snapshot],records:reconcileRecordIndexes(world)}}];
}
