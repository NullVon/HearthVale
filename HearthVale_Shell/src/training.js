import { STATS } from '../../HearthVale_Content/schema.js';
import { spendSurfaceAp } from './surface-day.js';
export function trainingRequirement(actor,stat){return Math.max(1,actor.data.attributes.baseStats[stat]+1-Number(actor.data.attributes.traits.includes('trait_fast_learner'))+Number(actor.data.attributes.traits.includes('trait_slow_learner')));}
export function trainingChoices(world,actor,state,add){
  if(!state.auronTrainingUnlocked||actor.primaryLocation!=='loc_guild')return;
  const auron=Object.values(world.entities).find(a=>a.data?.templateId==='actor_auron');
  if(!auron||auron.lifecycle!=='active'||auron.data.death||auron.data.attributes.resources.hearts<=0||auron.primaryLocation!=='loc_guild')return;
  const day=world.globals.hearthvaleSurface.calendar.day,r=actor.data.attributes.resources;
  const offered=Array.from({length:4},(_,i)=>STATS[(day*4+i)%6]);
  if(r.ap<1||r.xp<2)return;
  for(const stat of offered)if(actor.data.attributes.baseStats[stat]<6 && !actor.data.training?.used?.includes(`${day}:${stat}`))add('train',`Train ${stat} — 1 AP + 2 XP (${actor.data.training?.progress?.[stat]??0}/${trainingRequirement(actor,stat)})`,{stat});
}
export function train(ctx,stat){const {actor,day}=ctx;actor.data.attributes=spendSurfaceAp(actor,1).value;actor.data.attributes.resources.xp-=2;
  actor.data.training??={progress:{},used:[]};const t=actor.data.training;t.used=t.used.filter(key=>key.startsWith(`${day}:`));t.used.push(`${day}:${stat}`);
  t.progress[stat]=(t.progress[stat]??0)+1;
  if(t.progress[stat]>=trainingRequirement(actor,stat)){actor.data.attributes.baseStats[stat]++;actor.data.attributes.level=(actor.data.attributes.level??1)+1;t.progress[stat]=0;}
  ctx.state.lastResult=`${stat} training completed.`;
}
