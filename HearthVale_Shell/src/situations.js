// One minimal help mechanic. Definition values are fixture parameters, not balance.
export const HELP = 'hearthvale.help';
export const activeSituation = entity => !!entity?.situation && ['active', 'changed', 'escalated', 'de-escalated'].includes(entity.lifecycle);

export function makeHelpSituation(definition, player) {
  const { id, beneficiary, requiredContributions, priorityDays } = definition;
  if (!Number.isSafeInteger(requiredContributions) || requiredContributions < 1
    || !Number.isSafeInteger(priorityDays) || priorityDays < 1) {
    throw new Error('Help definition requires positive contribution and priority-day counts');
  }
  return {
    id, type: 'hearthvale.help-situation', lifecycle: 'active',
    data: {
      persistence: 'ephemeral', beneficiary, progress: 0, requiredContributions,
      priority: { status: 'awaiting-awareness', durationDays: priorityDays, untilDay: null, lastAutonomousWeek: null },
    },
    situation: {
      important: true, affected: [beneficiary, id],
      opportunity: { actor: player, claim: { subject: id, key: 'help-request', value: { beneficiary } } },
      paths: [{ id: 'help-complete', lifecycle: 'resolved', when: {
        entity: id, field: 'data.progress', op: 'gte', value: requiredContributions,
      } }],
    },
  };
}

export function isProtected(situation, day) {
  const priority = situation.data.priority;
  return priority.status === 'awaiting-awareness' || (priority.status === 'protected' && day < priority.untilDay);
}

export function surfaceHelp({ situation, world }) {
  if (situation.type !== 'hearthvale.help-situation' || situation.data.priority.status !== 'awaiting-awareness') return false;
  const recipient = world.entities[situation.situation.opportunity.actor];
  const requester = world.entities[situation.data.beneficiary];
  // In this proof, a direct request requires an active requester in the same place.
  return requester?.lifecycle === 'active' && recipient?.lifecycle === 'active'
    && requester.primaryLocation !== null && requester.primaryLocation === recipient.primaryLocation;
}

export function priorityConsequences({ event, world }) {
  if (event.event.type !== 'situation.opportunity') return [];
  const situation = world.entities[event.event.data.situation];
  if (situation?.type !== 'hearthvale.help-situation' || situation.data.priority.status !== 'awaiting-awareness') return [];
  return [{ type: 'data', entity: situation.id, key: 'priority', value: {
    ...situation.data.priority, status: 'protected',
    untilDay: world.globals.hearthvale.calendar.day + situation.data.priority.durationDays,
  } }];
}

export function expiredPriorityEvents(world) {
  const day = world.globals.hearthvale.calendar.day;
  return Object.values(world.entities).filter(situation => activeSituation(situation)
    && situation.type === 'hearthvale.help-situation'
    && situation.data.priority.status === 'protected' && day >= situation.data.priority.untilDay)
    .map(situation => ({
      type: 'hearthvale.priority-ended', data: { situation: situation.id, day },
      // End protection only. The Situation's terminal path is still contribution-based.
      effects: [{ type: 'data', entity: situation.id, key: 'priority', value: { ...situation.data.priority, status: 'ended' } }],
    }));
}

export function supportRelationId(from, to) {
  // Length prefixes keep arbitrary valid Actor IDs unambiguous.
  return `support:${from.length}:${from}:${to.length}:${to}`;
}
