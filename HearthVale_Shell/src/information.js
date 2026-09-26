import { squareInformation } from './expedition-discovery.js';
import { firstGuardianClear } from './guardian.js';
// V1 channel policy over Core claims. No second knowledge store or truth engine.
export const institutions = {
  loc_guild: { custodian: 'actor_lina', domains: ['pit','adventurers','discovery','missing','guild-work','death'] },
  loc_town_hall: { custodian: 'actor_garrick', domains: ['civic','public-danger','projects','town-needs','death'] },
  loc_shop: { custodian: 'actor_tavi', domains: ['materials','stock','items','supply'] },
  loc_inn: { custodian: 'actor_mira', domains: ['returns','injuries','social','gossip','death'] },
};
const prefix = 'institution:';
const houndKey = 'pit-hound-report';
const pitId = 'hv_pit_1';
const custodian = (world, holder) => Object.values(world.entities).find(e =>
  e.data?.templateId === institutions[holder]?.custodian && e.actor && e.lifecycle === 'active'
  && e.primaryLocation === holder);
export function heldInformation(world, holder) {
  const institution = institutions[holder], actor = institution ? custodian(world,holder)?.id : holder;
  return Object.values(world.entities).filter(e => e.lifecycle === 'active' && e.claim?.actor === actor
    && (institution ? e.claim.key.startsWith(`${prefix}${holder}:`) : !e.claim.key.startsWith(prefix)));
}
export function knowledgeState(world, holder, subject, topic) {
  const record = heldInformation(world,holder).find(e => e.claim.subject === subject && (e.claim.value?.topic ?? e.claim.key) === topic);
  return record ? record.claim.certainty === 'certain' ? 'Known' : 'Rumor' : 'Unknown';
}
function learn(world, holder, subject, topic, value, certainty = 'certain', source = null) {
  const institution = institutions[holder], receiver = institution ? custodian(world,holder) : world.entities[holder];
  if (!receiver?.actor || receiver.lifecycle !== 'active' || institution && !institution.domains.includes(value.domain)) return [];
  if (source?.claim.source.kind === 'communicated' && source.claim.source.actor === receiver.id) return [];
  const key = institution ? `${prefix}${holder}:${topic}` : topic;
  const old = heldInformation(world,holder).find(e => e.claim.subject === subject && e.claim.key === key);
  if (old && (old.claim.certainty === 'certain' && certainty !== 'certain'
    || old.claim.value.observedDay > value.observedDay
    || old.claim.certainty === certainty && JSON.stringify(old.claim.value) === JSON.stringify(value))) return [];
  return [{ type: 'learn', actor: receiver.id, ...(source ? {sourceActor:source.claim.actor} : {}),
    claim: { subject, key, value, certainty, lineage: source ? [source.id, ...source.claim.lineage] : [] } }];
}

// Public projection is deliberately explicit: never spread an objective report
// or evidence object into the UI. Hidden mode lives only in objective pit data.
export function informationCards(world, holder) {
  return heldInformation(world,holder).filter(e => e.claim.value?.topic && e.claim.value?.text).map(e => ({
    subject:e.claim.subject, topic:e.claim.value.topic,
    state:e.claim.certainty === 'certain' ? 'Known' : 'Rumor', text:e.claim.value.text,
    observedDay:e.claim.value.observedDay,
    ...(e.claim.value.status?{status:e.claim.value.status}:{}),
  }));
}

export function witnessHound(ctx, enemyId) {
  if (enemyId !== 'enemy_pit_hound') return;
  const combat = ctx.expedition.combat;
  ctx.pit.houndEvidence ??= {};
  ctx.pit.houndEvidence[combat.enemy.id] = { id:combat.enemy.id, actor:ctx.actor.id,
    day:ctx.day, year:ctx.year ?? 1, floor:ctx.expedition.floor.number, status:'encountered' };
}

export function houndObservationEffects(world) {
  const effects = [];
  const latest = new Map(Object.values(world.entities[pitId]?.data.houndEvidence ?? {}).map(e => [e.actor,e]));
  for (const evidence of latest.values()) {
    const value = { topic:houndKey, domain:'pit', evidenceId:evidence.id, observedDay:evidence.day,
      confirmedBy:evidence.actor, text:`Pit Hound ${evidence.status === 'defeated' ? 'defeated' : 'encountered'} on Floor ${evidence.floor}, Day ${evidence.day}.` };
    // Already witnessed evidence is history, not a fresh observation on every
    // later Event. Superseded claims also prove it was processed previously.
    if (Object.values(world.entities).some(e => e.claim?.actor === evidence.actor
      && e.claim.key === houndKey && e.claim.certainty === 'certain'
      && JSON.stringify(e.claim.value) === JSON.stringify(value))) continue;
    effects.push(...learn(world,evidence.actor,pitId,houndKey,value));
  }
  return effects;
}

// A returning autonomous witness can file a report at the Guild. Mere procedural
// room generation or global knownEnemies is not evidence of a communication.
export function rumorEvents(world, rng) {
  const pit = world.entities[pitId]?.data, day = world.globals.hearthvaleSurface?.calendar.day;
  if (!pit || !custodian(world,'loc_guild')) return [];
  const reports = structuredClone(pit.houndReports ?? {}), effects = [];
  for (const evidence of Object.values(pit.houndEvidence ?? {})) {
    const witness = world.entities[evidence.actor];
    if (reports[evidence.id] || witness?.actor?.controller !== 'Autonomous' || witness.lifecycle !== 'active'
      || witness.primaryLocation !== 'loc_guild') continue;
    const source = heldInformation(world,witness.id).find(e => e.claim.value?.evidenceId === evidence.id && e.claim.certainty === 'certain');
    if (!source || source.claim.value.private === true || source.claim.value.withheld === true) continue;
    const modes = ['Accurate','Incomplete','Exaggerated', ...(evidence.status === 'defeated' || day > evidence.day ? ['Stale'] : [])];
    const mode = modes[Math.floor(rng.next()*modes.length)];
    reports[evidence.id] = {mode,evidenceId:evidence.id,reportedDay:day,source:witness.id};
    const text = mode === 'Incomplete' ? 'An adventurer reports signs of a Pit Hound somewhere below.'
      : mode === 'Exaggerated' ? `An adventurer reports several Pit Hounds around Floor ${evidence.floor}.`
      : mode === 'Stale' ? `An earlier sighting places a Pit Hound on Floor ${evidence.floor}, Day ${evidence.day}; its current presence is unconfirmed.`
      : mode === 'Accurate' && evidence.status === 'defeated'
        ? `An adventurer reports a Pit Hound defeated on Floor ${evidence.floor}, Day ${evidence.day}.`
        : `An adventurer reports a Pit Hound on Floor ${evidence.floor}, seen on Day ${evidence.day}.`;
    effects.push(...learn(world,'loc_guild',pitId,houndKey,{topic:houndKey,domain:'pit',evidenceId:evidence.id,
      observedDay:evidence.day,text},'uncertain',source));
  }
  return effects.length || JSON.stringify(reports)!==JSON.stringify(pit.houndReports ?? {}) ? [{
    type:'hearthvale.hound-report-filed', effects:[...effects,{type:'data',entity:pitId,key:'houndReports',value:reports}],
  }] : [];
}

// Talk is a real bidirectional communication. Institutions accept only their
// domains; staff are not omniscient conduits for unrelated facts.
export function talkInformationEffects(world, listener, speaker) {
  if (!listener?.actor || !speaker?.actor || listener.lifecycle !== 'active' || speaker.lifecycle !== 'active'
    || !listener.primaryLocation || listener.primaryLocation !== speaker.primaryLocation) return [];
  const institution = Object.keys(institutions).find(id => custodian(world,id)?.id === speaker.id);
  const effects = [];
  const share = (source, holder) => {
    const value = source.claim.value;
    if (!value?.topic || value.private === true || value.withheld === true) return;
    effects.push(...learn(world,holder,source.claim.subject,value.topic,value,source.claim.certainty,source));
  };
  for (const source of [...heldInformation(world,speaker.id),...(institution ? heldInformation(world,institution) : [])]) share(source,listener.id);
  for (const source of heldInformation(world,listener.id)) {
    if (!institution || institutions[institution].domains.includes(source.claim.value?.domain)) {
      share(source,speaker.id);
      if (institution) share(source,institution);
    }
  }
  const best = new Map();
  for (const effect of effects) {
    const key = JSON.stringify([effect.actor,effect.claim.subject,effect.claim.key]), old = best.get(key);
    if (!old || old.claim.certainty !== 'certain' && effect.claim.certainty === 'certain'
      || old.claim.certainty === effect.claim.certainty && old.claim.value.observedDay <= effect.claim.value.observedDay) best.set(key,effect);
  }
  return [...best.values()];
}

// Core invokes perception after an Event's structural effects. Local presence
// supplies witnessing; remote holders retain their previous dated information.
export function informationPerceptions({world,event}) {
  const effects = houndObservationEffects(world);
  // Observe this death event only, never re-observe an old corpse on later
  // ticks. Pit co-location is an entire dungeon, not proof of witnessing.
  // Seeing death confirms death, not its internal cause or exact circumstances.
  if(event?.event?.type==='hearthvale.player-death'){
    const dead=world.entities[world.globals.hearthvaleSurface.playerId],death=dead?.data.death;
    const place=dead?.primaryLocation;
    if(death&&Object.hasOwn(institutions,place)){
      const value={id:death.id,topic:death.id,domain:'death',kind:'death',status:'confirmed-dead',
        actor:dead.id,observedDay:death.day,day:death.day,year:death.year,
        text:`${dead.data.identity.name} died, Year ${death.year}, Day ${death.day}.`};
      for(const witness of Object.values(world.entities).filter(a=>a.actor&&a.lifecycle==='active'&&a.primaryLocation===place))
        effects.push(...learn(world,witness.id,dead.id,death.id,value));
      effects.push(...learn(world,place,dead.id,death.id,value));
    }
  }
  const pit=world.entities[pitId]?.data;
  const clear=pit?firstGuardianClear(world,pit):null;
  const facts=[squareInformation(pit??{}),clear?{...clear,id:'guardian:ruin-brute',topic:'guardian-first-clear',domain:'pit',kind:'guardian',observedDay:clear.day,
    text:`Ruin Brute first cleared by ${world.entities[clear.actor]?.data.identity.name??clear.actor}, Day ${clear.day}.`}:null,
    ...(pit?.guardianVictories??[]).map(r=>({...r,topic:r.id,observedDay:r.day,text:r.event}))].filter(Boolean);
  for(const value of facts){
    const witness=world.entities[value.actor];
    if(!witness?.actor)continue;
    effects.push(...learn(world,witness.id,pitId,value.topic,value));
    // Autonomous adventurers at Guild file their own outcomes. A remote
    // institution cannot read the ledger; player reports still use Talk.
    if(witness.actor.controller==='Autonomous'&&witness.lifecycle==='active'&&witness.primaryLocation==='loc_guild')
      effects.push(...learn(world,'loc_guild',pitId,value.topic,value));
  }
  const economy=world.globals.hearthvaleServices?.weeklyReconciliation;
  if(economy&&(economy.refreshed.length||economy.expired.length)){
    const value={topic:'weekly-stock',domain:'stock',observedDay:economy.completedDay,
      text:`Shop reconciliation: ${economy.refreshed.length} stock lines replenished; ${economy.expired.length} expired used items removed.`};
    for(const actor of Object.values(world.entities).filter(e=>e.actor&&e.lifecycle==='active'&&e.primaryLocation==='loc_shop'))
      effects.push(...learn(world,actor.id,'loc_shop','weekly-stock',value));
    effects.push(...learn(world,'loc_shop','loc_shop','weekly-stock',value));
  }
  for (const request of Object.values(world.entities).filter(e => ['hearthvale.material-request','hearthvale.public-opportunity'].includes(e.type))) {
    const d = request.data.definition;
    const status = request.lifecycle;
    const active = ['active','changed','escalated','de-escalated'].includes(status);
    // Store the date actually witnessed for an early withdrawal. For completed
    // deliveries and deadlines the Situation already holds the exact date.
    const previousNotice = Object.values(world.entities).find(e => e.claim?.subject === request.id && e.claim.value?.topic === 'public-request' && e.claim.value.status === status);
    const observedDay = active ? request.data.openedDay : request.data.resolvedDay
      ?? (status === 'expired' ? request.data.expiresDay : previousNotice?.claim.value.observedDay ?? world.globals.hearthvaleSurface.calendar.day);
    const value = { topic:'public-request',domain:d.domain ?? 'supply',status,observedDay,
      text:active ? `${d.label}: ${d.kind === 'hound-verification' ? 'firsthand evidence' : d.quantity+' materials'} requested by Day ${request.data.expiresDay-1}.`
        : status === 'resolved' ? `${d.label}: Completed by ${world.entities[request.data.resolver]?.data.identity.name ?? request.data.resolver}.`
        : status === 'expired' ? d.expiryText : d.withdrawnText ?? `${d.label} withdrawn.`,
      ...(request.data.resolver ? {resolver:request.data.resolver} : {}) };
    for (const actor of Object.values(world.entities).filter(e => e.actor && e.lifecycle === 'active' && e.primaryLocation === request.primaryLocation))
      effects.push(...learn(world,actor.id,request.id,'public-request',value));
    if (institutions[request.primaryLocation]) effects.push(...learn(world,request.primaryLocation,request.id,'public-request',value));
  }
  // Perception returns Core grant specifications, not mutations.
  return effects.map(e => ({actor:e.actor,claim:e.claim}));
}
