import { HELP, activeSituation, isProtected, supportRelationId } from './situations.js';
import { clock, phase, canDecideToday, dailyEffect } from './progression.js';

export const helpAction = {
  eligible: ({ world, attempt }) => {
    const situation = world.entities[attempt.situation];
    const actor = world.entities[attempt.actor];
    if (!activeSituation(situation) || situation.type !== 'hearthvale.help-situation') return false;
    const beneficiary = world.entities[situation.data.beneficiary];
    if (beneficiary?.lifecycle !== 'active' || actor.primaryLocation === null || actor.primaryLocation !== beneficiary.primaryLocation) return false;
    if (actor.actor.controller === 'Human') return phase(world) === 'active' && actor.data.attributes.resources.ap >= 1;
    if (!canDecideToday(world, actor)) return false;
    if (isProtected(situation, clock(world).calendar.day)) {
      if (situation.data.progress + 1 >= situation.data.requiredContributions) return false;
      if (situation.data.priority.lastAutonomousWeek === clock(world).calendar.week) return false;
    }
    return true;
  },
  resolve: ({ world, attempt }) => {
    const situation = world.entities[attempt.situation];
    const actor = world.entities[attempt.actor];
    const day = clock(world).calendar.day;
    const progress = situation.data.progress + 1;
    const effects = [{ type: 'data', entity: situation.id, key: 'progress', value: progress }];
    if (actor.actor.controller === 'Human') {
      const attributes = actor.data.attributes;
      effects.push({ type: 'data', entity: actor.id, key: 'attributes', value: {
        ...attributes, resources: { ...attributes.resources, ap: attributes.resources.ap - 1 },
      } });
    } else {
      effects.push(dailyEffect(world, actor, true));
      if (isProtected(situation, day)) effects.push({ type: 'data', entity: situation.id, key: 'priority', value: {
        ...situation.data.priority, lastAutonomousWeek: clock(world).calendar.week,
      } });
    }
    // Small directed support record; this is not a relationship score design.
    if (actor.id !== situation.data.beneficiary) {
      const id = supportRelationId(actor.id, situation.data.beneficiary);
      effects.push({ type: 'relation', relation: {
        id, from: actor.id, to: situation.data.beneficiary,
        data: { supportContributions: (world.relations[id]?.data.supportContributions ?? 0) + 1 },
      } });
    }
    return { type: 'hearthvale.help-contributed', data: {
      meaningful: true, situation: situation.id, beneficiary: situation.data.beneficiary, day, progress,
    }, effects };
  },
};

export function helpPerceptions({ event, world }) {
  if (event.event.type !== 'hearthvale.help-contributed') return [];
  const { situation, beneficiary, progress } = event.event.data;
  const actor = event.event.actor;
  // Contributor and recipient directly experience the contribution. No broadcast.
  return [...new Set([actor, beneficiary])].flatMap(observer => [
    { actor: observer, claim: { subject: situation, key: 'progress', value: progress } },
    ...(actor === beneficiary ? [] : [{ actor: observer, claim: {
      subject: actor, key: `support-for:${beneficiary}`,
      value: world.relations[supportRelationId(actor, beneficiary)].data.supportContributions,
    } }]),
  ]);
}

export { HELP };
