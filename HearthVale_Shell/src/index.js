import { createRuntime } from './core.js';
import { createWorld } from './world.js';
import { makeHelpSituation, surfaceHelp, priorityConsequences, expiredPriorityEvents } from './situations.js';
import { HELP, helpAction, helpPerceptions } from './actions.js';
import { progressionActions, autonomousActors } from './progression.js';
import { availableActions, desires, choices } from './autonomy.js';
import { activeExpedition, pitActions, pitReturnEvents, pitPerceptions, pitAvailable, pitMoveAllowed } from './pit.js';
import { successionActions, successionPerceptions, pendingSuccession, COMPLETE_SUCCESSION } from './succession.js';

export function createHearthValeShell({ autonomousIds = [] } = {}) {
  // Fixed cohort for this milestone; restore derives it from saved Actors.
  // This immutable routing list supplies no world knowledge to decision hooks.
  const roster = Object.freeze([...new Set(autonomousIds)]);
  const actions = { ...progressionActions, [HELP]: helpAction, ...pitActions, ...successionActions,
    Move: { eligible: pitMoveAllowed }, Take: {}, Give: {}, Communicate: {}, Interact: {}, Wait: {} };
  return Object.freeze({
    actions: Object.fromEntries(Object.entries(actions).map(([type, action]) => [type, { ...action,
      eligible: context => (!pendingSuccession(context.world) || type === COMPLETE_SUCCESSION)
        && (action.eligible ? action.eligible(context) : true),
    }])),
    worldProcesses: ({ world }) => {
      if (world.globals.hearthvale.initialized) {
        return activeExpedition(world) ? [] : [...pitReturnEvents(world), ...expiredPriorityEvents(world)];
      }
      const player = Object.values(world.entities).find(actor => actor.actor?.controller === 'Human').id;
      return [{
        type: 'hearthvale.world-started', data: { significance: 'historical' },
        effects: [
          { type: 'global', key: 'hearthvale', value: { ...world.globals.hearthvale, initialized: true } },
          ...(world.globals.hearthvale.opportunityDefinitions ?? []).map(definition => ({ type: 'emit', event: {
            type: 'hearthvale.opportunity-created', data: { situation: definition.id }, effects: [
              { type: 'create', entity: makeHelpSituation(definition, player) },
              { type: 'learn', actor: definition.beneficiary, claim: {
                subject: definition.id, key: 'help-request', value: { beneficiary: definition.beneficiary },
              } },
            ],
          } })),
        ],
      }];
    },
    perceive: context => [...(context.event.event.type === 'hearthvale.world-started'
      ? Object.values(context.world.entities).filter(entity => entity.actor).map(actor => ({
        actor: actor.id, claim: { subject: actor.id, key: 'primaryLocation', value: actor.primaryLocation },
      })) : helpPerceptions(context)), ...pitPerceptions(context), ...successionPerceptions(context)],
    surfaceOpportunity: context => !activeExpedition(context.world) && surfaceHelp(context),
    consequences: priorityConsequences,
    available: context => [...availableActions(context), ...pitAvailable(context)],
    offscreenActors: () => roster,
    desires,
    choices,
  });
}

export function createHearthValeRuntime({ seed = 1, saved, definition } = {}) {
  if (saved !== undefined) {
    // Inspect through the public API and re-supply hooks; never rewrite the save.
    const world = createRuntime({ saved }).snapshot().world;
    if (world.globals.hearthvale?.schemaVersion !== 1 || world.globals.hearthvale.initialized !== true) {
      throw new Error('Unsupported HearthVale world schema or incomplete bootstrap');
    }
    const people = Object.values(world.entities).filter(entity => entity.actor && entity.lifecycle === 'active');
    if (people.filter(actor => actor.actor.controller === 'Human').length !== 1) {
      throw new Error('A HearthVale world requires exactly one Player Controller');
    }
    return createRuntime({ saved, shell: createHearthValeShell({ autonomousIds: autonomousActors(world).map(actor => actor.id) }) });
  }
  const world = createWorld(definition);
  const shell = createHearthValeShell({ autonomousIds: world.entities.filter(actor => actor.actor?.controller === 'Autonomous').map(actor => actor.id) });
  const runtime = createRuntime({ ...world, shell, seed });
  runtime.startScene({ kind: 'hearthvale.bootstrap' });
  runtime.resolveScene({ offscreenBudget: 0 });
  return runtime;
}

export { createHearthValeGame } from './game.js';
