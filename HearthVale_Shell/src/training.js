import { STATS } from '../../HearthVale_Content/schema.js';
import { spendSurfaceAp } from './surface-day.js';
export function trainingRequirement(actor,stat){return Math.max(1,actor.data.attributes.baseStats[stat]+1-Number(actor.data.attributes.traits.includes('trait_fast_learner'))+Number(actor.data.attributes.traits.includes('trait_slow_learner')));}
export function trainingAvailability(world,actor,state){
  if(!state?.auronTrainingUnlocked)return {stats:[],reason:'Training with Auron is not yet unlocked.'};
  if(actor.primaryLocation!=='loc_guild')return {stats:[],reason:'Visit the Guild to train with Auron.'};
  const auron=Object.values(world.entities).find(a=>a.data?.templateId==='actor_auron');
  if(!auron||auron.lifecycle!=='active'||auron.data.death||auron.data.attributes.resources.hearts<=0||auron.primaryLocation!=='loc_guild')return {stats:[],reason:'Auron is unavailable to train at the Guild.'};
  const day=world.globals.hearthvaleSurface.calendar.day,r=actor.data.attributes.resources;
  const offered=Array.from({length:4},(_,i)=>STATS[(day*4+i)%6]);
  const stats=offered.filter(stat=>actor.data.attributes.baseStats[stat]<6 && !actor.data.training?.used?.includes(`${day}:${stat}`));
  if(!stats.length)return {stats:[],reason:'No further sessions are available for your stats today. Check again tomorrow.'};
  const reason=[r.xp<2?'You need 2 XP to train.':'',r.ap<1?'You need 1 AP to train.':''].filter(Boolean).join(' ');
  return {stats:reason?[]:stats,reason};
}
export function trainingChoices(world,actor,state,add){
  for(const stat of trainingAvailability(world,actor,state).stats)add('train',`Train ${stat} — 1 AP + 2 XP (${actor.data.training?.progress?.[stat]??0}/${trainingRequirement(actor,stat)} sessions toward +1 ${stat})`,{stat});
}
export function train(ctx,stat){const {actor,day}=ctx;const before=actor.data.attributes.baseStats[stat];actor.data.attributes=spendSurfaceAp(actor,1).value;actor.data.attributes.resources.xp-=2;
  actor.data.training??={progress:{},used:[]};const t=actor.data.training;t.used=t.used.filter(key=>key.startsWith(`${day}:`));t.used.push(`${day}:${stat}`);
  t.progress[stat]=(t.progress[stat]??0)+1;
  if(t.progress[stat]>=trainingRequirement(actor,stat)){actor.data.attributes.baseStats[stat]++;actor.data.attributes.level=(actor.data.attributes.level??1)+1;t.progress[stat]=0;}
  const r=actor.data.attributes.resources;
  const progress=actor.data.attributes.baseStats[stat]>before
    ? `${stat} increased: ${before} → ${actor.data.attributes.baseStats[stat]}. Level increased to ${actor.data.attributes.level}.`
    : `${stat} progress: ${t.progress[stat]}/${trainingRequirement(actor,stat)} sessions toward +1 ${stat}.`;
  ctx.state.lastResult=`${stat} training completed with Auron. Spent 2 XP and 1 AP. ${progress} Current XP: ${r.xp}. Current AP: ${r.ap}/${r.maxAp}.`;
}
