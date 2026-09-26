import { livingSituationDefinitions } from '../../HearthVale_Content/living-situations.js';
import { byId } from '../../HearthVale_Content/expedition.js';
import { evaluate, selectWeighted } from './core.js';
import { activeSituation } from './situations.js';
import { heldInformation, knowledgeState, talkInformationEffects } from './information.js';

export const livingSituations = world => Object.values(world.entities).filter(e => ['hearthvale.material-request','hearthvale.public-opportunity'].includes(e.type));
const providerPresent = (world, definition) => Object.values(world.entities).some(e =>
  e.data?.templateId === definition.provider && e.lifecycle === 'active'
  && e.primaryLocation === definition.location && e.data.attributes?.resources.hp > 0);

export function makeMaterialRequest(definition, id, day) {
  const { kind, days } = definition.duration;
  if (!(kind === 'Immediate' && days === 1 || kind === 'Short' && [2,3].includes(days)
    || kind === 'Long' && Number.isSafeInteger(days) && days >= 4 && days <= 11))
    throw new Error('Invalid Situation duration');
  const verification = definition.kind === 'hound-verification';
  if ((!verification && (definition.kind !== 'material-request' || byId('items', definition.material)?.category !== 'material'
    || !Number.isSafeInteger(definition.quantity) || definition.quantity < 1
    || !byId('items', definition.stock?.item) || !Number.isSafeInteger(definition.stock.quantity) || definition.stock.quantity < 1))
    || !definition.pressure || !Number.isFinite(definition.weight) || definition.weight <= 0
    || !['gold','xp'].every(k => Number.isSafeInteger(definition.reward[k]) && definition.reward[k] >= 0))
    throw new Error('Invalid material request definition');
  if (definition.escalation && (!Number.isSafeInteger(definition.escalation.afterDays)
    || definition.escalation.afterDays < 1 || definition.escalation.afterDays >= days))
    throw new Error('Invalid Situation escalation');
  const expiresDay = day + days;
  return { id, type: verification ? 'hearthvale.public-opportunity' : 'hearthvale.material-request', lifecycle: 'active', primaryLocation: definition.location,
    data: { sourceDefinitionId: definition.id, definition: structuredClone(definition),
      openedDay: day, expiresDay, resolver: null, escalated: false, persistence: 'permanent' },
    situation: { affected: [id], paths: [
      { id: 'delivered', lifecycle: 'resolved', when: { entity: id, field: 'data.resolver', op: 'ne', value: null } },
      ...(definition.withdrawn ? [{ id: 'pressure-eased', lifecycle: 'cancelled', when: definition.withdrawn }] : []),
      { id: 'deadline', lifecycle: 'expired', when: { entity: '$globals', field: 'hearthvaleSurface.calendar.day', op: 'gte', value: expiresDay } },
    ] },
  };
}

// Day deadlines are Core predicates over the calendar, never Core Beat counts.
// Core alone settles terminal lifecycles and emits situation.changed provenance.
export function situationDayEvents(world, rng, definitions = livingSituationDefinitions) {
  const surface = world.globals.hearthvaleSurface;
  if (surface?.stage !== 'surface' || world.globals.hearthvaleSituationBoundary !== surface.calendar.day) return [];
  const day = surface.calendar.day;
  if ((world.globals.hearthvaleSituationDay ?? 1) >= day) return [];
  const events = [{ type: 'hearthvale.situation-day', effects: [{ type: 'global', key: 'hearthvaleSituationDay', value: day }] }];
  const active = Object.values(world.entities).filter(activeSituation);
  for (const request of livingSituations(world).filter(activeSituation)) {
    const escalation = request.data.definition.escalation;
    if (escalation && !request.data.escalated && day >= request.data.openedDay + escalation.afterDays
      && !request.situation.paths.some(p => evaluate(p.when, world))) events.push({
      type: 'hearthvale.request-escalated', data: { situation: request.id }, effects: [
        { type: 'data', entity: request.id, key: 'escalated', value: true },
        { type: 'situation', entity: request.id, lifecycle: 'escalated' },
      ],
    });
  }
  let candidates = definitions.filter(d => providerPresent(world, d) && evaluate(d.pressure, world)
    && (d.kind !== 'hound-verification' || knowledgeState(world,'loc_guild','hv_pit_1','pit-hound-report') === 'Rumor')
    && (d.recurrence === true || !livingSituations(world).some(e => e.data.sourceDefinitionId === d.id && e.lifecycle === 'resolved'))
    && !active.some(e => e.data.sourceDefinitionId === d.id)
    // Do not expire and immediately replace the same request at one boundary.
    && !livingSituations(world).some(e => e.data.sourceDefinitionId === d.id
      && (e.data.expiresDay === day || e.data.resolvedDay === day - 1)));
  const count = Math.min(8 - active.length, candidates.length, candidates.length ? Math.floor(rng.next() * 3) : 0);
  for (let i = 0; i < count && candidates.length; i++) {
    const definition = selectWeighted(candidates, () => rng.next());
    candidates = candidates.filter(d => d.id !== definition.id);
    const id = `hv_situation_${definition.id}_day_${day}`;
    events.push({ type: 'hearthvale.request-created', data: { situation: id, sourceDefinitionId: definition.id },
      effects: [{ type: 'create', entity: makeMaterialRequest(definition, id, day) }] });
  }
  return events;
}

// Direct observation of a local public request; no remote knowledge or rumor sync.
export function firsthandHoundEvidence(world, actor) {
  const claim = heldInformation(world,actor.id).find(e => e.claim.key === 'pit-hound-report' && e.claim.certainty === 'certain'
    && e.claim.value.confirmedBy === actor.id && !e.claim.value.private && !e.claim.value.withheld);
  const evidence = world.entities.hv_pit_1.data.houndEvidence?.[claim?.claim.value.evidenceId];
  return evidence?.actor === actor.id ? evidence : null;
}

export function requestChoices(world, actor, claimed = new Set()) {
  const day = world.globals.hearthvaleSurface.calendar.day;
  const r = actor.data.attributes?.resources;
  if (!actor.actor || actor.lifecycle !== 'active' || !(r?.hp > 0 && r.hearts > 0)) return [];
  return livingSituations(world).filter(s => activeSituation(s) && !claimed.has(s.id)
    && s.data.resolver === null && day < s.data.expiresDay
    && !s.situation.paths.some(p => evaluate(p.when, world))
    && actor.primaryLocation === s.primaryLocation && providerPresent(world, s.data.definition)
    && (s.data.definition.kind === 'hound-verification' ? firsthandHoundEvidence(world,actor)
      : (actor.data.holdings?.materials?.[s.data.definition.material] ?? 0) >= s.data.definition.quantity))
    .map(s => ({ op: 'fulfill-request', params: { situation: s.id }, weight: 5,
      label: s.data.definition.kind === 'hound-verification' ? 'Submit firsthand Hound evidence'
        : `Deliver ${s.data.definition.quantity} ${byId('items',s.data.definition.material).label} — ${s.data.definition.label}` }));
}

// Remembering an opportunity does not feed generation, eligibility or rewards.
export function trackingChoices(world, actor) {
  return heldInformation(world,actor.id).filter(e => e.claim.value?.topic === 'public-request' && world.entities[e.claim.subject]?.situation)
    .map(e => { const tracked = actor.data.trackedOpportunities?.includes(e.claim.subject);
      return {op:tracked?'untrack-opportunity':'track-opportunity',label:`${tracked?'Untrack':'Track'} ${world.entities[e.claim.subject].data.definition.label}`,params:{situation:e.claim.subject}}; });
}

export function resolveMaterialRequest({ world, actor, state, day }, id) {
  if (!requestChoices(world, actor).some(c => c.params.situation === id)) throw new Error('Material request unavailable');
  const request = world.entities[id], d = request.data.definition;
  const verification = d.kind === 'hound-verification';
  const evidence = verification ? firsthandHoundEvidence(world,actor) : null;
  if (!verification) {
    actor.data.holdings.materials[d.material] -= d.quantity;
    const pool = d.stock.pool ?? 'stock';
    state[pool] ??= {};
    state[pool][d.stock.item] = (state[pool][d.stock.item] ?? 0) + d.stock.quantity;
  }
  actor.data.attributes.resources.gold += d.reward.gold;
  actor.data.attributes.resources.xp += d.reward.xp;
  const record = { actor: actor.id, situation: id, sourceDefinitionId: d.id, day,
    year: world.globals.hearthvaleSurface.calendar.year, event: `Fulfilled ${d.label}`,
    ...(verification ? {evidenceId:evidence.id,confirmedBy:actor.id} : {item:d.material,quantity:d.quantity}), ...d.reward };
  (actor.data.memories ??= []).push(record);
  return [
    ...(verification ? talkInformationEffects(world,actor,Object.values(world.entities).find(e => e.data?.templateId === d.provider)) : []),
    { type: 'data', entity: id, key: 'resolver', value: actor.id },
    { type: 'data', entity: id, key: 'resolvedDay', value: day },
    { type: 'data', entity: id, key: 'record', value: record },
    { type: 'learn', actor: actor.id, claim: { subject: id, key: 'request-outcome', value: record } },
  ];
}
