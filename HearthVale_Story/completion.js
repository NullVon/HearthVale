import { firstGuardianClear } from '../HearthVale_Shell/src/guardian.js';

// Player-facing historical truth, never an Information grant to an institution.
export function completionStory(world) {
  const c=world.globals.hearthvaleCompletion,pit=world.entities.hv_pit_1.data;
  const name=id=>world.entities[id]?.data.identity?.name??id;
  const clear=firstGuardianClear(world);
  const context=c.reason==='ruin-brute'
    ?`${name(c.firstClear.actor)} first cleared the Ruin Brute on Day ${c.firstClear.day}. Beyond it, the Pit continues. This demo ends here; Stratum 2 is not playable.`
    :'Forty Days have passed in HearthVale. This Chapter is complete.';
  const facts=[`${c.completedDays} Days completed.`,clear
    ?`${name(clear.actor)} holds the first-clear record for the Ruin Brute.`
    :'The Ruin Brute remains undefeated.'];
  if(clear&&pit.strata[0].cleared&&pit.strata[0].waystoneUnlocked)facts.push('Stratum 1 is cleared. Its Waystone remains part of HearthVale’s history.');
  for(const d of Object.values(pit.discoveries??{}))
    facts.push(`${d.title} was discovered by ${name(d.actor)} on Day ${d.day}.`);
  for(const r of pit.guardianVictories??[])
    facts.push(`${name(r.actor)} recorded a later Ruin Brute victory on Day ${r.day}.`);
  for(const s of Object.values(world.entities))if(s.data?.resolver&&s.data.record?.event)
    facts.push(`${name(s.data.resolver)}: ${s.data.record.event}`);
  const auron=Object.values(world.entities).find(a=>a.data?.templateId==='actor_auron');
  if(auron)facts.push(auron.data.death?'Auron died.':`Auron lives with ${auron.data.attributes.resources.hearts} Hearts.`);
  return {context,facts,thanks:'Thank you for completing the demo.'};
}
