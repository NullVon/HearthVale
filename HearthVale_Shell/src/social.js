import { changeSanity } from './sanity.js';
import { selectDialogue } from '../../HearthVale_Story/dialogue.js';
import { heldInformation } from './information.js';
export function storyKnowledge(world,actor){return heldInformation(world,actor.id).map(e=>({subject:e.claim.value?.templateId??e.claim.subject,tag:e.claim.value?.tag??e.claim.key,state:e.claim.certainty==='certain'?'Known':'Rumor'}));}
export function talk(ctx,target,firstOnly=false){
  const actor=ctx.actor,day=ctx.day;
  actor.data.knownActors??=[];const first=!actor.data.knownActors.includes(target.id);
  if(first)actor.data.knownActors.push(target.id);
  actor.data.dialogueUsed??=[];
  const line=selectDialogue({speaker:target,listener:actor,day,known:storyKnowledge(ctx.world,actor),used:actor.data.dialogueUsed,stateTags:actor.data.storyTags??[]});
  if(line.reset)actor.data.dialogueUsed=actor.data.dialogueUsed.filter(key=>!line.pool.some(id=>key===`${day}:${id}`));
  actor.data.dialogueUsed.push(`${day}:${line.id}`);
  if(line.once)actor.data.dialogueUsed.push(`once:${line.id}`);
  const year=ctx.world.globals.hearthvaleSurface.calendar.year, r=actor.data.attributes.resources;
  const used=actor.data.sanityTalkRecovery;
  let recovery='';
  if(!firstOnly && actor.id===ctx.world.globals.hearthvaleSurface.playerId && r.sanity>0 && r.sanity<r.maxSanity && !(used?.year===year && used?.day===day)) {
    actor.data.sanityTalkRecovery={year,day};
    recovery=changeSanity(actor,1,'The conversation helps you feel grounded again');
  }
  ctx.state.lastResult=`${first?'First meeting. ':''}${target.data.identity.name}: “${line.text}”${recovery ? ` ${recovery}` : ''}`;
  ctx.state.lastResultActor=actor.id;
}
export function scheduledMeetings(world,actor,nextDay,state){
  const introductions=[];
  const ids=nextDay>=3?['actor_rook','actor_auron',world.globals.hearthvaleSurface.couldHaveId]:nextDay>=2?['actor_rook']:[];
  for(const id of ids){const person=Object.values(world.entities).find(a=>a.id===id||a.data?.templateId===id);
    if(person?.lifecycle==='active' && !actor.data.knownActors?.includes(person.id)){talk({world,actor,day:nextDay,state},person,true);introductions.push(state.lastResult);}}
  if(introductions.length)state.lastResult=`Passing through town: ${introductions.join(' ')}`;
}
