import { firstGuardianClear } from './guardian.js';

export const demoComplete = world => world.globals.hearthvaleCompletion?.completed === true;

// Called only after the triggering command and its ordinary consequences settle.
// Existing first-clear history is not itself a new victory (notably old saves).
export function completionReason(before, after) {
  if (demoComplete(after)) return null;
  const s=after.globals.hearthvaleSurface, clear=firstGuardianClear(after);
  if (!firstGuardianClear(before) && clear?.actor===s.playerId) return 'ruin-brute';
  if (s.calendar.day===41 && after.globals.hearthvaleSituationBoundary===41
    && after.globals.hearthvaleWeekly?.lastCompletedDay===40) return 'chapter';
  return null;
}

export function completionEvent(world, reason) {
  if (demoComplete(world)) return [];
  const s=world.globals.hearthvaleSurface, actor=world.entities[s.playerId];
  const completion={completed:true,reason,year:s.calendar.year,day:Math.min(40,s.calendar.day),
    completedDays:reason==='chapter'?40:s.calendar.day-1,
    ...(reason==='ruin-brute'?{firstClear:structuredClone(firstGuardianClear(world))}:{}),
    ...(actor.data.death?{death:actor.data.death.id}:{})};
  return [{type:'hearthvale.demo-completed',data:completion,effects:[
    {type:'global',key:'hearthvaleCompletion',value:completion},
    // The existing boundary uses the next-Day cursor internally. Freeze the
    // public calendar at Day 40 only after all ordinary reconciliation finishes.
    ...(reason==='chapter'?[{type:'global',key:'hearthvaleSurface',value:{...s,
      calendar:{...s.calendar,day:40,week:8}}}]:[]),
    ...(actor.data.death?[{type:'global',key:'hearthvaleDeathTransition',value:{
      actor:actor.id,record:actor.data.death.id,status:'completion-pending'}}]:[]),
  ]}];
}
