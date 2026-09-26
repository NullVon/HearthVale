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
  if(!firstOnly){actor.data.talkCount=(actor.data.talkCount??0)+1;const required=actor.data.attributes.traits.includes('trait_frail')?4:5;
    if(actor.data.talkCount>=required){actor.data.talkCount=0;const r=actor.data.attributes.resources;r.sanity=Math.min(r.maxSanity,r.sanity+1);}}
  ctx.state.lastResult=`${first?'First meeting. ':''}${target.data.identity.name}: “${line.text}”`;
  ctx.state.lastResultActor=actor.id;
}
export function scheduledMeetings(world,actor,nextDay,state){
  const introductions=[];
  const ids=nextDay>=3?['actor_rook','actor_auron',world.globals.hearthvaleSurface.couldHaveId]:nextDay>=2?['actor_rook']:[];
  for(const id of ids){const person=Object.values(world.entities).find(a=>a.id===id||a.data?.templateId===id);
    if(person?.lifecycle==='active' && !actor.data.knownActors?.includes(person.id)){talk({world,actor,day:nextDay,state},person,true);introductions.push(state.lastResult);}}
  if(introductions.length)state.lastResult=`Passing through town: ${introductions.join(' ')}`;
}
