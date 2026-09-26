import { deathScars } from '../../HearthVale_Content/death.js';
import { derivedActorValues } from './surface-candidates.js';
import { economyState } from './economy.js';
import { buildLifeRecord,deathTransition } from './life-record.js';

const resources = actor => actor.data.attributes.resources;

export function recordHeartLoss(actor, {cause,day,year=1,floor=null,expedition=null}, from, to) {
  const sequence=(actor.data.heartLossSequence??0)+1;
  actor.data.heartLossSequence=sequence;
  const id=`heart-loss:${actor.id}:${sequence}`;
  const fact={id,actor:actor.id,kind:'heart-loss',cause,day,year,floor,expedition,from,to,
    event:`${actor.data.identity.name} lost a Heart (${from} → ${to}) during ${cause}.`};
  actor.data.memories??=[];actor.data.memories.push(fact);
  if(from===2&&to===1){
    const scar={...(deathScars[cause]??deathScars.hazard),id:`scar:${id}`,cause,day,year};
    actor.data.scars??=[];actor.data.scars.push(scar);
    actor.data.memories.push({id:scar.id,actor:actor.id,kind:'serious-injury',day,year,
      event:`${actor.data.identity.name} acquired ${scar.label} during ${cause}.`});
  }
  return fact;
}

export function availableAuron(world) {
  const s=world.globals.hearthvaleSurface;
  if(!s?.playerId||s.calendar.year<1||world.globals.hearthvaleCompletion?.completed)return null;
  return Object.values(world.entities).find(a=>a.data?.templateId==='actor_auron'&&a.actor
    &&a.lifecycle==='active'&&!a.data.death&&resources(a).hearts>0&&resources(a).hp>0&&resources(a).sanity>0
    &&a.data.protectionUnavailable!==true&&!a.data.missing
    &&['loc_guild','loc_pit_entrance','hv_pit_1'].includes(a.primaryLocation))??null;
}

// One idempotent Core world-process event settles the saved threatened-Heart /
// Sanity hooks. No dice, clock advancement, succession or Stratum-Guardian work.
export function deathEvents(world) {
  const s=world.globals.hearthvaleSurface,original=world.entities[s?.playerId],pit=world.entities.hv_pit_1?.data;
  if(!original?.actor||!pit)return [];
  if(original.data.death){
    if(original.data.lifeRecord)return [];
    // Explicit compatibility resume for completed M5A saves, never on load.
    return [{type:'hearthvale.life-record-archived',effects:[
      {type:'data',entity:original.id,key:'lifeRecord',value:buildLifeRecord(world,original)},
      {type:'global',key:'hearthvaleDeathTransition',value:deathTransition(world,original)},
    ]}];
  }
  const r=resources(original),pending=pit.pendingDeath??pit.pendingFinalHeart;
  if(!pending&&r.hearts>0&&r.sanity>0)return [];
  if(pending&&pending.actor!==original.id)return [];
  const actor=structuredClone(original),ar=resources(actor);
  const context={day:s.calendar.day,year:s.calendar.year,...pending};
  const sanity=r.sanity<=0||pit.pendingDeath?.cause==='sanity';
  const rescuer=!sanity&&r.hearts===1&&pit.pendingFinalHeart?availableAuron(world):null;
  const effects=[],changed=[actor];
  let fact;
  if(rescuer){
    const auron=structuredClone(rescuer),before=resources(auron).hearts;
    resources(auron).hearts--;
    const count=(auron.data.rescueCount??0)+1;auron.data.rescueCount=count;
    const memoryStart=auron.data.memories?.length??0;
    recordHeartLoss(auron,{...context,cause:'rescue'},before,before-1);
    ar.hearts=1;ar.hp=Math.ceil(derivedActorValues(actor).maxHp/2);
    fact={id:`auron-rescue:${auron.id}:${count}`,actor:actor.id,rescuer:auron.id,kind:'rescue',
      day:context.day,year:context.year,cause:context.cause,expedition:context.expedition??null,floor:context.floor??null,
      defeated:true,heartLossPrevented:true,trainingUnlocked:count===1,auronHeartsBefore:before,auronHeartsAfter:before-1,
      event:`Auron rescued ${actor.data.identity.name} from final-Heart loss (${before} → ${before-1} Hearts).`};
    actor.data.memories??=[];actor.data.memories.push(fact);
    auron.data.memories.push(fact);
    if(before===1){
      auron.data.death={id:`death:${auron.id}`,cause:'final-heart-rescue',day:context.day,year:context.year,actor:auron.id};
      auron.data.memories.push({...auron.data.death,kind:'death',event:'Auron died rescuing an adventurer.'});
      fact.auronDied=true;fact.event+=' Auron died performing the rescue.';
      effects.push({type:'retire',entity:auron.id});
    }
    if(before===2)fact.event+=' Auron lost an arm.';
    if(count===1)fact.event+=' Training with Auron unlocked.';
    changed.push(auron);
    const services=economyState(world);services.auronTrainingUnlocked=true;
    effects.push({type:'global',key:'hearthvaleServices',value:services});
    // Only participants have firsthand knowledge. Talk may later inform a
    // legitimate institution; objective rescue truth never broadcasts globally.
    for(const witness of [actor,auron])for(const memory of auron.data.memories.slice(memoryStart))
      effects.push({type:'learn',actor:witness.id,claim:{subject:memory.actor,key:memory.id,
        value:{...memory,topic:memory.id,domain:'adventurers',observedDay:memory.day,text:memory.event}}});
  }else{
    if(!sanity&&r.hearts===1)recordHeartLoss(actor,context,1,0);
    if(!sanity)ar.hearts=0;
    fact={id:`death:${actor.id}`,actor:actor.id,kind:'death',cause:sanity?'sanity':context.cause??'heart-loss',
      causeKind:sanity?'sanity':'final-heart-loss',
      day:context.day,year:context.year,floor:context.floor??null,expedition:context.expedition??null,
      event:`${actor.data.identity.name} died from ${sanity?'Sanity loss':context.cause??'Heart loss'}.`};
    actor.data.death=fact;actor.data.memories??=[];actor.data.memories.push(fact);
    actor.data.lifeRecord=buildLifeRecord(world,actor);
    effects.push({type:'global',key:'hearthvaleDeathTransition',value:deathTransition(world,actor)});
    effects.push({type:'retire',entity:actor.id});
    if(pit.expedition){
      ar.essence=0;actor.data.expeditionHp=0;
      if(actor.data.statuses)delete actor.data.statuses.poison;
      effects.push({type:'data',entity:'hv_pit_1',key:'lastExpedition',value:{id:pit.expedition.id,
        reason:'death',deepestFloor:pit.expedition.deepestFloor,day:context.day}},
        {type:'data',entity:'hv_pit_1',key:'expedition',value:null});
    }
    // Ending an expedition releases its local resources, not evidence that a
    // dead Actor returned alive to town. No institution learns unwitnessed death.
    if(context.expedition||pit.expedition)effects.push({type:'move',entity:actor.id,location:'hv_pit_1'});
  }
  actor.data.deathAdjudication={status:rescuer?'rescued':'dead',...fact};
  for(const a of changed)for(const [key,value]of Object.entries(a.data))
    if(JSON.stringify(value)!==JSON.stringify(world.entities[a.id].data[key]))effects.push({type:'data',entity:a.id,key,value});
  effects.push({type:'data',entity:'hv_pit_1',key:'pendingFinalHeart',value:null},
    {type:'data',entity:'hv_pit_1',key:'pendingDeath',value:null},
    {type:'data',entity:'hv_pit_1',key:'lastResult',value:{actor:actor.id,text:fact.event}});
  return [{type:rescuer?'hearthvale.auron-rescue':'hearthvale.player-death',data:fact,effects}];
}
