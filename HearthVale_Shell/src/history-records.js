import { heldInformation, institutions } from './information.js';

const terminal = new Set(['resolved','expired','cancelled','failed','transformed','invalidated']);
const priority = value => ['death','missing','serious-injury'].includes(value.kind) ? 1
  : ['guardian','major-progression'].includes(value.kind) ? 2
  : value.tag === 'info_discovery' || value.kind === 'turn-in' ? 3
  : value.situation || value.topic === 'public-request' && terminal.has(value.status) ? 4
  : value.kind === 'autonomous-accomplishment' || value.kind === 'sell-holding' ? 5
  : ['stock','civic','town-needs'].includes(value.domain) ? 6 : 7;

// Read-only projections of real, personally/institutionally held history. The
// reference identifies authoritative provenance; this is not another history log.
export function knownHistory(world, holder) {
  const facts = [];
  for (const record of heldInformation(world,holder)) {
    const c=record.claim,v=c.value;
    if(c.certainty!=='certain'||!v||typeof v!=='object')continue;
    if(institutions[holder] && (!institutions[holder].domains.includes(v.domain)||v.private||v.withheld))continue;
    if(v.topic==='public-request'&&!terminal.has(v.status))continue;
    const day=v.observedDay??v.day;
    if(!Number.isSafeInteger(day))continue;
    const text=v.text??(v.tag==='info_discovery' ? `${v.title??v.templateId} discovered by ${v.finder??world.entities[v.actor]?.data.identity.name??v.actor}.` : v.event);
    if(!text)continue;
    facts.push({id:v.id??(v.situation||v.topic==='public-request'?`situation:${v.situation??c.subject}`:`claim:${c.subject}:${v.topic??c.key}`),
      source:{claim:record.id},day,priority:priority(v),text,
      ...(v.resolver||v.actor||v.confirmedBy?{actor:v.resolver??v.actor??v.confirmedBy}:{})});
  }
  const actor=world.entities[holder];
  if(actor?.actor)for(const [index,memory]of (actor.data.memories??[]).entries()){
    if(!memory.event||!Number.isSafeInteger(memory.day))continue;
    facts.push({id:memory.id??(memory.situation?`situation:${memory.situation}`:`memory:${holder}:${index}`),
      source:{actor:holder,memory:index},day:memory.day,
      priority:memory.situation?4:priority(memory),text:memory.event,actor:memory.actor??holder});
  }
  // The actual guardian victor has firsthand knowledge even in legacy saves
  // which predate Information claims for the existing M3 guardian outcome.
  const guardian=world.entities.hv_pit_1?.data.guardianDefeated;
  if(guardian?.actor===holder)facts.push({id:'guardian:ruin-brute',source:{entity:'hv_pit_1',field:'guardianDefeated'},
    day:guardian.day,priority:2,text:`Ruin Brute defeated by ${actor.data.identity.name}.`,actor:holder});
  const unique=new Map();
  for(const fact of facts)if(!unique.has(fact.id))unique.set(fact.id,fact);
  return [...unique.values()];
}

export function reconcileRecordIndexes(world) {
  const refs = holder => knownHistory(world,holder).map(f=>({id:f.id,source:f.source}));
  const actors=Object.values(world.entities).filter(e=>e.actor);
  return {
    guild:refs('loc_guild'),town:refs('loc_town_hall'),shop:refs('loc_shop'),
    discoveries:Object.fromEntries(actors.map(a=>[a.id,knownHistory(world,a.id).filter(f=>f.priority===3).map(f=>({id:f.id,source:f.source}))])),
    actors:Object.fromEntries(actors.map(a=>[a.id,refs(a.id)])),
    closedSituations:Object.fromEntries([...actors.map(a=>a.id),'loc_guild','loc_town_hall','loc_shop']
      .map(holder=>[holder,knownHistory(world,holder).filter(f=>f.id.startsWith('situation:')).map(f=>f.id.slice(10))])),
  };
}
