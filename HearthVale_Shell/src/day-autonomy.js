import { economyChoices, resolveEconomy } from './economy.js';
import { selectWeighted } from './core.js';
import { requestChoices, resolveMaterialRequest } from './living-situations.js';
import { autonomousPitChoices, resolveAutonomousPit } from './autonomous-pit.js';

// Existing services and compressed Pit accomplishments compete in one budget.
// Routine travel is implied; no speculative capability/danger scoring.
const goals = new Set(['Make money through the Pit', 'Understand what comes out of the Pit', 'Find a place in HearthVale']);

export function autonomousChoices(world, actor, state, claimed = new Set()) {
  const surface = world.globals.hearthvaleSurface;
  const player = world.entities[surface.playerId];
  const r = actor.data.attributes?.resources;
  if (actor.id === surface.playerId || actor.actor?.controller !== 'Autonomous'
    || actor.lifecycle !== 'active' || actor.primaryLocation === player.primaryLocation
    || !(r?.hp > 0 && r.hearts > 0) || !actor.data.inventory) return [];
  const choices = [...requestChoices(world, actor, claimed),...autonomousPitChoices(world,actor,claimed)];
  if (goals.has(actor.data.mainGoal) && Object.values(world.entities).some(e => e.data?.templateId === 'actor_tavi'
    && e.lifecycle === 'active' && e.primaryLocation === 'loc_shop')) economyChoices(world, actor, state, (op, label, params) => {
    if (op === 'turn-in' || op === 'sell-holding' && params.group === 'valuables')
      choices.push({ op, params });
  });
  // Weight categories, not individual items: carrying many materials must not
  // drown out the authored profit/discovery preference.
  const isDiscovery=c=>['turn-in','discover-square'].includes(c.op);
  const discovery = choices.filter(isDiscovery).length;
  const profit = choices.length - discovery;
  const traits = actor.data.attributes.traits;
  const greedy = traits.includes('trait_greedy'), curious = traits.includes('trait_curious');
  const discoveryWeight = curious && !greedy ? 7 : greedy && !curious ? 3 : 5;
  return choices.map(c => ({ ...c, weight: isDiscovery(c)
    ? discoveryWeight / discovery : (10 - discoveryWeight) / profit }));
}

export function dayAutonomyEffects(world, state, rng) {
  const effects = [];
  const claimed = new Set();
  const current = { ...world, globals: { ...world.globals, hearthvaleServices: state } };
  const day = world.globals.hearthvaleSurface.calendar.day;
  // Stable order and sequential shared consequences prevent double discoveries.
  for (const original of Object.values(world.entities).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const choices = autonomousChoices(current, original, state, claimed);
    if (!choices.length || rng.next() >= 0.2) continue;
    const choice = selectWeighted(choices, () => rng.next());
    const actor = structuredClone(original);
    const lastResult = state.lastResult;
    if(['discover-square','guardian-repeat'].includes(choice.op)) {
      effects.push(...resolveAutonomousPit(current,actor,choice,claimed));
    } else if (choice.op === 'fulfill-request') {
      effects.push(...resolveMaterialRequest({ world: current, actor, state, day }, choice.params.situation));
      claimed.add(choice.params.situation);
    } else resolveEconomy({ world, actor, state, day }, choice.op, choice.params, rng);
    // The shared resolver's player-facing receipt is not an information channel.
    if (lastResult === undefined) delete state.lastResult;
    else state.lastResult = lastResult;
    for (const [key, value] of Object.entries(actor.data))
      if (JSON.stringify(value) !== JSON.stringify(original.data[key]))
        effects.push({ type: 'data', entity: actor.id, key, value });
    if (choice.op === 'turn-in') effects.push({ type: 'learn', actor: actor.id,
      claim: { subject: 'loc_shop', key: `material-${choice.params.item}`,
        value: { templateId: choice.params.item, known: true } } });
  }
  return effects;
}
