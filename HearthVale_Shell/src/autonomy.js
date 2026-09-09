import { HELP } from './situations.js';
import { PROGRESS_GOAL, IDLE_DAY } from './progression.js';

// Decision hooks consume Core's local Actor context only, never a runtime/world closure.
export function availableActions({ actor, view }) {
  const help = view.filter(record => record.claim.key === 'help-request').map(record => ({
    actor: actor.id, type: HELP, situation: record.claim.subject, evidence: [record.id],
  }));
  return [{ actor: actor.id, type: 'Wait' }, ...help, ...(actor.controller === 'Autonomous' ? [
    { actor: actor.id, type: PROGRESS_GOAL }, { actor: actor.id, type: IDLE_DAY },
  ] : [])];
}

export function desires({ actor }) {
  const weights = actor.data.decisionWeights ?? { goal: 0, help: 0, idle: 1 };
  return [
    { id: actor.data.mainGoal, weight: weights.goal },
    { id: 'hearthvale.help-desire', weight: weights.help },
    { id: 'hearthvale.idle-desire', weight: weights.idle },
  ];
}

export function choices({ actor, availableActions }) {
  const mapping = { [HELP]: 'hearthvale.help-desire', [PROGRESS_GOAL]: actor.data.mainGoal, [IDLE_DAY]: 'hearthvale.idle-desire' };
  const candidates = availableActions.filter(action => mapping[action.type]).map(attempt => ({ desire: mapping[attempt.type], attempt }));
  const weights = actor.data.decisionWeights ?? { goal: 0, help: 0, idle: 1 };
  const total = candidates.reduce((sum, choice) => sum + (choice.attempt.type === HELP ? weights.help : choice.attempt.type === PROGRESS_GOAL ? weights.goal : weights.idle), 0);
  // If every meaningful candidate is denied/zero-weight, complete an ordinary day.
  // Core still selects and resolves the idle attempt using its own pipeline/RNG.
  if (total === 0) {
    const idle = availableActions.find(action => action.type === IDLE_DAY);
    return idle ? [{ weight: 1, attempt: idle }] : [];
  }
  return candidates;
}
