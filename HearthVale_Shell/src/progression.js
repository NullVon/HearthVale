import { activeExpedition } from './pit.js';

export const BEGIN_DAY_END = 'hearthvale.begin-day-end';
export const FINISH_DAY_END = 'hearthvale.finish-day-end';
export const PROGRESS_GOAL = 'hearthvale.progress-main-goal';
export const IDLE_DAY = 'hearthvale.idle-day';
export const DAYS_PER_WEEK = 5;

export const clock = world => world.globals.hearthvale;
export const phase = world => clock(world).progression?.phase ?? 'active';
export const autonomousActors = world => Object.values(world.entities)
  .filter(actor => actor.actor?.controller === 'Autonomous' && actor.lifecycle === 'active');

export function canDecideToday(world, actor) {
  return !activeExpedition(world) && actor.actor.controller === 'Autonomous' && phase(world) === 'closing'
    && (actor.data.daily?.decidedDay ?? 0) < clock(world).calendar.day;
}

export function dailyEffect(world, actor, meaningful) {
  const day = clock(world).calendar.day;
  return { type: 'data', entity: actor.id, key: 'daily', value: {
    decidedDay: day,
    accomplishedDay: meaningful ? day : (actor.data.daily?.accomplishedDay ?? null),
    accomplishments: (actor.data.daily?.accomplishments ?? 0) + (meaningful ? 1 : 0),
  } };
}

function dayCommandAllowed({ attempt, world }, expectedPhase) {
  return !activeExpedition(world) && world.entities[attempt.actor].actor.controller === 'Human'
    && attempt.params.day === clock(world).calendar.day && phase(world) === expectedPhase;
}

export const progressionActions = {
  [BEGIN_DAY_END]: {
    eligible: context => dayCommandAllowed(context, 'active'),
    resolve: ({ world }) => ({ type: 'hearthvale.day-closing', data: { day: clock(world).calendar.day }, effects: [
      { type: 'global', key: 'hearthvale', value: { ...clock(world), progression: { phase: 'closing' } } },
    ] }),
  },
  [FINISH_DAY_END]: {
    eligible: context => dayCommandAllowed(context, 'closing') && autonomousActors(context.world)
      .every(actor => actor.data.daily?.decidedDay === clock(context.world).calendar.day),
    resolve: ({ world, attempt }) => {
      const current = clock(world);
      const day = current.calendar.day + 1;
      const week = Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
      const player = world.entities[attempt.actor];
      const attributes = player.data.attributes;
      const effects = [
        { type: 'global', key: 'hearthvale', value: {
          ...current, calendar: { ...current.calendar, day, week }, progression: { phase: 'active' },
        } },
        { type: 'data', entity: player.id, key: 'attributes', value: {
          ...attributes, resources: { ...attributes.resources, ap: attributes.resources.maxAp },
        } },
      ];
      if (week !== current.calendar.week) effects.push({ type: 'emit', event: {
        type: 'hearthvale.week-reconciled', data: { week, completedDay: day - 1 }, effects: [{
          type: 'global', key: 'hearthvaleWeekly', value: {
            persistence: 'ephemeral', week, reconciliations: (world.globals.hearthvaleWeekly?.reconciliations ?? 0) + 1,
          },
        }],
      } });
      return { type: 'hearthvale.day-ended', data: { day: current.calendar.day }, effects };
    },
  },
  [PROGRESS_GOAL]: {
    eligible: ({ world, attempt }) => canDecideToday(world, world.entities[attempt.actor]),
    resolve: ({ world, attempt }) => {
      const actor = world.entities[attempt.actor];
      return { type: 'hearthvale.goal-progressed', data: { meaningful: true, day: clock(world).calendar.day, goal: actor.data.mainGoal }, effects: [
        dailyEffect(world, actor, true),
        { type: 'data', entity: actor.id, key: 'goalProgress', value: (actor.data.goalProgress ?? 0) + 1 },
      ] };
    },
  },
  [IDLE_DAY]: {
    eligible: ({ world, attempt }) => canDecideToday(world, world.entities[attempt.actor]),
    resolve: ({ world, attempt }) => ({
      type: 'hearthvale.day-idle', data: { meaningful: false, day: clock(world).calendar.day },
      effects: [dailyEffect(world, world.entities[attempt.actor], false)],
    }),
  },
};
