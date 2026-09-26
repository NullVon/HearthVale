import { firstGuardianClear } from './guardian.js';

// An archival snapshot, built once at death. Only attributed outcomes qualify;
// knowing about another Actor's achievement never makes it one's own.
export function buildLifeRecord(world, actor) {
  const death=actor.data.death, pit=world.entities.hv_pit_1.data, facts=new Map();
  const add=(id,kind,text,source,day,year)=>facts.set(id,{id,kind,text,source,
    ...(day===undefined?{}:{day}),...(year===undefined?{}:{year})});
  const depth=actor.data.deepestPitFloor;
  if(depth>1)add('pit-depth','pit',`Reached Pit Floor ${depth}.`,{actor:actor.id,field:'deepestPitFloor'});
  for(const [id,d]of Object.entries(pit.discoveries??{}))if(d.actor===actor.id)
    add(`discovery:${id}`,'discovery',`Discovered ${d.title}.`,{entity:'hv_pit_1',field:'discoveries',key:id},d.day,d.year);
  const clear=firstGuardianClear(world,pit);
  if(clear?.actor===actor.id)add('guardian:ruin-brute','guardian','First cleared the Ruin Brute.',
    {entity:'hv_pit_1',field:pit.guardianFirstClear?'guardianFirstClear':'guardianDefeated'},clear.day,clear.year);
  for(const [index,m]of (world.globals.hearthvaleServices?.materialRecords??[]).entries())if(m.actor===actor.id)
    add(`material:${m.item}`,'material',m.event,{global:'hearthvaleServices',field:'materialRecords',index},m.day,m.year);
  for(const s of Object.values(world.entities))if(s.lifecycle==='resolved'&&s.data?.resolver===actor.id&&s.data.record?.event)
    add(`situation:${s.id}`,'situation',s.data.record.event,{entity:s.id,field:'record'},s.data.resolvedDay,s.data.record.year);
  for(const [index,m]of (actor.data.memories??[]).entries()){
    // Existing resolver memories also cover older retained history. Routine
    // sales, Talk, combat and mere relationship scores are intentionally absent.
    if(m.situation&&m.actor===actor.id&&!facts.has(`situation:${m.situation}`))
      add(`situation:${m.situation}`,'situation',m.event,{actor:actor.id,memory:index},m.day,m.year);
    if(m.kind==='rescue'&&(m.actor===actor.id||m.rescuer===actor.id))
      add(m.id,'rescue',m.event,{actor:actor.id,memory:index},m.day,m.year);
    if(m.event==='event_injured_adventurer'&&m.value===2&&world.entities[m.actor]?.actor)
      add(`help:${m.actor}:${m.day}`,'relationship',`Helped the injured ${world.entities[m.actor].data.identity.name}.`,
        {actor:actor.id,memory:index},m.day,m.year);
  }
  for(const [index,scar]of (actor.data.scars??[]).entries())if(scar.label)
    add(scar.id??`scar:${index}`,'scar',scar.label,{actor:actor.id,scar:index},scar.day,scar.year);
  return {version:1,actor:actor.id,name:actor.data.identity.name,generation:actor.data.generation??1,
    ...(actor.data.arrived?{arrived:structuredClone(actor.data.arrived)}:{}),
    death:structuredClone(death),facts:[...facts.values()]};
}

export function deathTransition(world,actor) {
  return {actor:actor.id,record:actor.data.death.id,
    status:world.globals.hearthvaleCompletion?.completed||world.globals.hearthvaleSurface.calendar.day===40?'completion-pending':'succession-ready'};
}
