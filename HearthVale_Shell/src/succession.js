import { activeExpedition } from './pit.js';

export const PREPARE_SUCCESSION = 'hearthvale.prepare-succession';
export const COMPLETE_SUCCESSION = 'hearthvale.complete-succession';
export const pendingSuccession = world => world.globals.hearthvaleSuccession?.pending ?? null;
const humans = world => Object.values(world.entities).filter(e => e.actor?.controller === 'Human' && e.lifecycle === 'active');
const recipients = (world, from) => Object.values(world.entities).filter(e => e.situation?.important && e.situation.opportunity.actor === from);

export function successionEntities(definition, people) {
  if (!definition) return [];
  for (const candidate of definition.candidates) {
    if (!people.some(a => a.id === candidate.actor) || typeof candidate.eligible !== 'boolean'
      || !Number.isSafeInteger(candidate.years) || candidate.years < 0) throw new Error('Invalid succession candidate fixture');
  }
  if (new Set(definition.candidates.map(c => c.actor)).size !== definition.candidates.length) throw new Error('Duplicate succession candidate');
  for (const [id, age] of Object.entries(definition.ages)) {
    const actor = people.find(a => a.id === id);
    if (!actor || !Number.isSafeInteger(age) || age < 0) throw new Error('Invalid age fixture');
    actor.data.ageYears = age;
  }
  if (!Number.isFinite(definition.living.value) || !Number.isFinite(definition.living.deltaPerYear)) throw new Error('Invalid Living State fixture');
  return [
    { id: definition.living.id, type: 'hearthvale.living-state', data: { persistence: 'living', value: definition.living.value } },
    ...definition.situations.map(item => {
      if (!['actor', 'player-role', 'public'].includes(item.scope)
        || (item.scope !== 'public' && !people.some(a => a.id === item.owner))) throw new Error('Invalid Situation routing fixture');
      return { id: item.id, type: 'hearthvale.situation', data: { persistence: 'living', scope: item.scope, owner: item.scope === 'actor' ? item.owner : null },
        situation: { affected: item.scope === 'actor' ? [item.owner] : [],
          paths: [{ when: { entity: item.id, field: 'data.complete', op: 'eq', value: true }, lifecycle: 'resolved' }],
          ...(item.scope === 'player-role' ? { important: true, opportunity: { actor: item.owner,
            claim: { subject: item.id, key: 'role-opportunity', value: true } } } : {}),
        } };
    }),
  ];
}

export function successorOptions(world, from) {
  if (humans(world).length !== 1 || humans(world)[0].id !== from || pendingSuccession(world)
    || activeExpedition(world) || world.globals.hearthvale.progression.phase !== 'active') return [];
  // Never silently reassign a personal or unclassified important opportunity.
  if (recipients(world, from).some(e => e.data.scope !== 'player-role')) return [];
  return (world.globals.hearthvaleSuccession?.definition.candidates ?? []).filter(c => c.eligible
    && world.entities[c.actor]?.actor?.controller === 'Autonomous' && world.entities[c.actor].lifecycle === 'active');
}

function canPrepare({ world, attempt, view }) {
  return attempt.targets.length === 1 && successorOptions(world, attempt.actor).some(c => c.actor === attempt.targets[0])
    && view.some(c => c.claim.subject === attempt.targets[0] && c.claim.key === 'succession-option');
}

export const successionActions = {
  [PREPARE_SUCCESSION]: {
    eligible: canPrepare,
    resolve: ({ world, attempt }) => {
      const current = world.globals.hearthvaleSuccession;
      const candidate = current.definition.candidates.find(c => c.actor === attempt.targets[0]);
      return { type: 'hearthvale.succession-prepared', data: { from: attempt.actor, to: candidate.actor }, effects: [{
        type: 'global', key: 'hearthvaleSuccession', value: { ...current,
          pending: { from: attempt.actor, to: candidate.actor, years: candidate.years },
        },
      }] };
    },
  },
  [COMPLETE_SUCCESSION]: {
    eligible: ({ world, attempt }) => {
      const pending = pendingSuccession(world);
      return !!pending && attempt.actor === pending.from && humans(world).length === 1 && humans(world)[0].id === pending.from
        && world.entities[pending.to]?.actor?.controller === 'Autonomous' && world.entities[pending.to].lifecycle === 'active'
        && !activeExpedition(world) && world.globals.hearthvale.progression.phase === 'active'
        && world.globals.hearthvaleSuccession.definition.candidates.some(c => c.actor === pending.to && c.eligible && c.years === pending.years)
        && recipients(world, pending.from).every(e => e.data.scope === 'player-role');
    },
    resolve: ({ world }) => {
      const current = world.globals.hearthvaleSuccession;
      const { from, to, years } = current.pending;
      const clock = world.globals.hearthvale;
      const transfer = { type: 'hearthvale.succeeded', data: { from, to, years, significance: 'historical' }, effects: [
        { type: 'controller-transfer', from, to, controller: 'Human', replacement: 'Autonomous',
          opportunities: recipients(world, from).map(e => e.id) },
        { type: 'global', key: 'hearthvaleSuccession', value: { ...current, pending: null,
          completed: (current.completed ?? 0) + 1, last: { from, to, years } } },
        { type: 'global', key: 'hearthvale', value: { ...clock, calendar: { ...clock.calendar,
          day: clock.calendar.day + years * 40, week: Math.floor((clock.calendar.day + years * 40 - 1) / 5) + 1,
          chapter: clock.calendar.chapter + 1, generation: clock.calendar.generation + 1,
        } } },
      ] };
      const historyEffects = years ? [
        ...Object.values(world.entities).filter(e => e.actor && e.lifecycle === 'active' && Number.isSafeInteger(e.data.ageYears))
          .map(e => ({ type: 'data', entity: e.id, key: 'ageYears', value: e.data.ageYears + years })),
        { type: 'data', entity: current.definition.living.id, key: 'value',
          value: world.entities[current.definition.living.id].data.value + years * current.definition.living.deltaPerYear },
        { type: 'global', key: 'hearthvaleWeekly', value: { ...world.globals.hearthvaleWeekly,
          week: Math.floor((clock.calendar.day + years * 40 - 1) / 5) + 1 } },
        { type: 'emit', event: transfer },
      ] : transfer.effects;
      const prepared = Object.values(world.entities).findLast(e => e.consequence?.status === 'applied'
        && e.consequence.operation.type === 'global' && e.consequence.operation.key === 'hearthvaleSuccession'
        && e.consequence.operation.value.pending?.to === to);
      const event = years ? { type: 'hearthvale.history-compressed', data: { from, to, years, significance: 'historical' }, effects: historyEffects }
        : transfer;
      return { type: 'hearthvale.succession-requested', effects: [{ type: 'emit', event: {
        ...event, causes: prepared ? [prepared.id] : [],
      } }] };
    },
  },
};

export function successionPerceptions({ world, event }) {
  if (event.event.type !== 'hearthvale.world-started' || !world.globals.hearthvaleSuccession) return [];
  const player = humans(world)[0].id;
  return world.globals.hearthvaleSuccession.definition.candidates.filter(c => c.eligible).map(c => ({ actor: player,
    claim: { subject: c.actor, key: 'succession-option', value: { years: c.years } } }));
}
