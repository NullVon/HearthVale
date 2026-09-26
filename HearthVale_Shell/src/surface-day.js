import { DAYS_PER_WEEK } from './progression.js';
import { derivedActorValues } from './surface-candidates.js';
import { advanceEconomy, economyState } from './economy.js';
import { scheduledMeetings } from './social.js';
import { dayAutonomyEffects } from './day-autonomy.js';

// Shared resource plumbing for later authored paid actions. M1 exposes no
// synthetic AP-spending button; tests exercise this helper in a fixture action.
export function spendSurfaceAp(actor, amount) {
  const attributes = actor.data.attributes;
  if (!Number.isSafeInteger(amount) || amount < 0 || attributes.resources.ap < amount) throw new Error('Insufficient or invalid AP');
  return { type: 'data', entity: actor.id, key: 'attributes', value: {
    ...attributes, resources: { ...attributes.resources, ap: attributes.resources.ap - amount },
  } };
}

export function sleepEffects(world, actor, rng, {rest=true}={}) {
  const surface = world.globals.hearthvaleSurface;
  const day = surface.calendar.day + 1;
  const services = economyState(world);
  const autonomy = dayAutonomyEffects(world, services, rng);
  const economy=advanceEconomy(world,day,services),updatedActor=structuredClone(actor);
  if(rest)scheduledMeetings(world,updatedActor,day,economy.value);
  // Remaining M4 phases belong here, after direct autonomous consequences.
  return [
    ...autonomy,
    economy,
    ...Object.entries(updatedActor.data).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(actor.data[key])).map(([key,value])=>({type:'data',entity:actor.id,key,value})),
    ...(updatedActor.data.knownActors??[]).filter(id=>!actor.data.knownActors?.includes(id)).map(id=>({type:'learn',actor:actor.id,claim:{subject:id,key:'met',value:true}})),
    ...(rest?[{ type: 'data', entity: actor.id, key: 'attributes', value: {
      ...actor.data.attributes, resources: { ...actor.data.attributes.resources,
        hp: derivedActorValues(actor).maxHp, ap: 4 },
    } }]:[]),
    { type: 'global', key: 'hearthvaleSurface', value: { ...surface,
      calendar: { ...surface.calendar, day, week: Math.floor((day - 1) / DAYS_PER_WEEK) + 1 },
    } },
    // After these effects settle, Core closes terminal Situations; the world
    // process then escalates/generates once for this completed Day boundary.
    { type: 'global', key: 'hearthvaleSituationBoundary', value: day },
  ];
}
