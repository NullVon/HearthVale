import { generateCandidates,instantiateSurfaceActor } from './surface-candidates.js';
import { validateCandidate } from '../../HearthVale_Content/validation.js';
import { surfaceCatalog } from '../../HearthVale_Content/surface.js';

// V1 death-only continuation. The separate old succession.js remains a proof
// adapter, not the playable V1 flow (it permits authored time skips/old Actors).
export function successionAvailable(world,status='succession-ready') {
  const s=world.globals.hearthvaleSurface,t=world.globals.hearthvaleDeathTransition;
  const a=world.entities[s?.playerId],pit=world.entities.hv_pit_1?.data;
  return !!(a?.data.death&&a.data.lifeRecord&&a.lifecycle==='retired'&&a.actor?.controller==='Human'
    &&t?.actor===a.id&&t.record===a.data.death.id&&t.status===status
    &&s.stage==='surface'&&s.calendar.day<40&&!world.globals.hearthvaleCompletion?.completed
    &&!pit?.expedition&&!pit?.pendingDeath&&!pit?.pendingFinalHeart);
}

export function successionEvents(world,rng,intent) {
  const s=world.globals.hearthvaleSurface,t=world.globals.hearthvaleDeathTransition;
  if(intent.type==='succession-begin'){
    if(!successionAvailable(world))throw new Error('Succession is unavailable');
    const candidates=generateCandidates(rng,s.nextActorInstance,Object.values(world.entities)
      .filter(a=>a.actor&&a.lifecycle==='active').map(a=>a.data.identity.name));
    return [{type:'hearthvale.successor-candidates-generated',data:{predecessor:t.actor},effects:[
      {type:'global',key:'hearthvaleDeathTransition',value:{...t,status:'choosing-successor',candidates}},
      {type:'global',key:'hearthvaleSurface',value:{...s,nextActorInstance:s.nextActorInstance+3}},
    ]}];
  }
  if(intent.type!=='succession-choose'||!successionAvailable(world,'choosing-successor'))
    throw new Error('Succession selection is unavailable');
  const candidate=t.candidates.find(c=>c.id===intent.id);
  if(!candidate||world.entities[candidate.id])throw new Error('Unknown successor candidate');
  const predecessor=world.entities[t.actor];
  const successor=instantiateSurfaceActor(candidate,{location:'loc_inn'});
  successor.data.generation=(predecessor.data.generation??predecessor.data.lifeRecord.generation)+1;
  successor.data.arrived=structuredClone(s.calendar);
  return [{type:'hearthvale.successor-selected',data:{predecessor:t.actor,successor:successor.id,generation:successor.data.generation},effects:[
    {type:'create',entity:successor},
    {type:'controller-transfer',from:predecessor.id,to:successor.id,controller:'Human',replacement:'Autonomous'},
    {type:'global',key:'hearthvaleSurface',value:{...s,playerId:successor.id,stage:'surface'}},
    {type:'global',key:'hearthvaleDeathTransition',value:{actor:t.actor,record:t.record,status:'complete',successor:successor.id}},
  ]}];
}

export function validateSuccession(world) {
  const t=world.globals.hearthvaleDeathTransition;
  if(t?.status!=='choosing-successor')return;
  if(!successionAvailable(world,'choosing-successor')||!Array.isArray(t.candidates)||t.candidates.length!==3
    ||new Set(t.candidates.map(c=>c.id)).size!==3||t.candidates.some(c=>world.entities[c.id]))
    throw new Error('Invalid successor selection snapshot');
  t.candidates.forEach(c=>validateCandidate(c,surfaceCatalog));
}
