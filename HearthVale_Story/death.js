import { knowledgeState } from '../HearthVale_Shell/src/information.js';

// Describe only recorded cause/context; never infer an enemy or fatal blow.
export function deathDescription(death) {
  const cause=death.cause;
  const text=cause==='sanity'?'Sanity reached 0.'
    : death.causeKind==='special'?`Cause: ${cause}.`
    : `Final Heart lost${cause&&cause!=='heart-loss'?` after ${cause}`:''}.`;
  return text+(death.floor==null?'':` Pit Floor ${death.floor}.`);
}

// Player-facing continuity, like the Life Record: not dialogue or new Information.
export function continuityFacts(world) {
  const calendar=world.globals.hearthvaleSurface.calendar;
  const facts=[`HearthVale remains in Year ${calendar.year}, Day ${calendar.day}.`];
  const auron=Object.values(world.entities).find(a=>a.data?.templateId==='actor_auron');
  if(auron)facts.push(auron.data.death||auron.lifecycle==='retired'?'Auron is dead.'
    :`Auron lives with ${auron.data.attributes.resources.hearts} Hearts${auron.data.scars?.some(s=>s.templateId==='scar_lost_arm')?' and a Lost Arm':''}.`);
  const discoveries=world.entities.hv_pit_1?.data.discoveries??{};
  const playerId=world.globals.hearthvaleSurface.playerId;
  for(const [id,discovery] of Object.entries(discoveries)) {
    if(facts.length===4)break;
    if(playerId&&discovery.actor!==playerId&&discovery.public!==true&&knowledgeState(world,playerId,'hv_pit_1',`discovery-${id}`)!=='Known')continue;
    facts.push(`${discovery.title} remains discovered.`);
  }
  return facts;
}
