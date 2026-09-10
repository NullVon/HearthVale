export const ENTER_PIT = 'hearthvale.enter-pit';
export const ADVANCE_PIT = 'hearthvale.advance-pit';
export const DISCOVER_PIT = 'hearthvale.recognize-pit-discovery';
export const EXIT_PIT = 'hearthvale.exit-pit';

export const pits = world => Object.values(world.entities).filter(entity => entity.type === 'hearthvale.pit' && entity.lifecycle === 'active');
export const activeExpedition = world => pits(world).find(pit => pit.data.expedition?.active) ?? null;
const activeDay = world => (world.globals.hearthvale.progression?.phase ?? 'active') === 'active';
const setData = (entity, key, value) => ({ type: 'data', entity, key, value });

export function createPit(definition, entryLocation) {
  const { id, discovery } = definition;
  if (!discovery || typeof discovery.name !== 'string' || !discovery.name.trim()
    || !Number.isSafeInteger(discovery.afterSteps) || discovery.afterSteps < 1) {
    throw new Error('Pit fixture requires a named discovery and a positive local step threshold');
  }
  if (typeof discovery.id !== 'string' || discovery.id === id || discovery.id === entryLocation) {
    throw new Error('Pit discovery requires a distinct ID');
  }
  return {
    id, type: 'hearthvale.pit', lifecycle: 'active', primaryLocation: entryLocation,
    data: {
      persistence: 'permanent', entryLocation, discoveryDefinition: structuredClone(discovery),
      procedural: { revision: 0, current: null }, expeditionSequence: 0,
      expedition: null, pendingReturn: null, lastReturn: null,
    },
  };
}

// Deterministic lifecycle replacement only; no content generator or Chapter policy.
export function reconstructPitEffects(world, pitId) {
  const pit = world.entities[pitId];
  if (pit?.type !== 'hearthvale.pit' || pit.lifecycle !== 'active') throw new Error('Active Pit required');
  if (activeExpedition(world) || pit.data.pendingReturn || !activeDay(world)) {
    throw new Error('Pit reconstruction requires a completed return and an active Day checkpoint');
  }
  const revision = pit.data.procedural.revision + 1;
  const nextId = `${pit.id}.temporary.${revision}`;
  const previous = world.entities[pit.data.procedural.current];
  const effects = [];
  if (previous && previous.lifecycle === 'active' && previous.data.persistence === 'ephemeral'
    && !previous.data.discovered && !previous.data.name) {
    effects.push({ type: 'retire', entity: previous.id });
  }
  effects.push({ type: 'create', entity: {
    id: nextId, type: 'hearthvale.pit-space', primaryLocation: pit.id,
    data: { pit: pit.id, persistence: 'ephemeral', discovered: false, revision },
  } }, setData(pit.id, 'procedural', { revision, current: nextId }));
  return effects;
}

function targetPit({ attempt, world }) {
  if (attempt.targets.length !== 1) return null;
  const pit = world.entities[attempt.targets[0]];
  return pit?.type === 'hearthvale.pit' && pit.lifecycle === 'active' ? pit : null;
}

function inside(context) {
  const pit = targetPit(context);
  const actor = context.world.entities[context.attempt.actor];
  const expedition = pit?.data.expedition;
  return !!pit && activeDay(context.world) && actor.actor.controller === 'Human'
    && expedition?.active === true && expedition.actor === actor.id
    && (actor.primaryLocation === pit.id || context.world.entities[actor.primaryLocation]?.data.pit === pit.id);
}

export const pitActions = {
  [ENTER_PIT]: {
    eligible: context => {
      const pit = targetPit(context);
      const actor = context.world.entities[context.attempt.actor];
      return !!pit && activeDay(context.world) && !activeExpedition(context.world) && !pit.data.pendingReturn
        && actor.actor.controller === 'Human' && actor.primaryLocation === pit.data.entryLocation
        && actor.data.attributes.resources.ap >= 1
        && context.view.some(record => record.claim.subject === pit.id && record.claim.key === 'pit-entrance');
    },
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const actor = world.entities[attempt.actor];
      const sequence = pit.data.expeditionSequence + 1;
      const expedition = {
        id: `${pit.id}.expedition.${sequence}`, active: true, actor: actor.id,
        returnLocation: actor.primaryLocation, steps: 0, discoveries: [],
      };
      return { type: 'hearthvale.pit-entered', data: { pit: pit.id, expedition: expedition.id }, effects: [
        ...(pit.data.procedural.current === null ? reconstructPitEffects(world, pit.id) : []),
        setData(pit.id, 'expeditionSequence', sequence), setData(pit.id, 'expedition', expedition),
        setData(actor.id, 'attributes', { ...actor.data.attributes, resources: {
          ...actor.data.attributes.resources, ap: actor.data.attributes.resources.ap - 1,
        } }),
        { type: 'move', entity: actor.id, location: pit.id },
      ] };
    },
  },
  [ADVANCE_PIT]: {
    eligible: inside,
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const expedition = { ...pit.data.expedition, steps: pit.data.expedition.steps + 1 };
      return { type: 'hearthvale.pit-step', data: { pit: pit.id, expedition: expedition.id, steps: expedition.steps },
        effects: [setData(pit.id, 'expedition', expedition)] };
    },
  },
  [DISCOVER_PIT]: {
    eligible: context => {
      if (!inside(context)) return false;
      const pit = targetPit(context);
      return pit.data.expedition.steps >= pit.data.discoveryDefinition.afterSteps
        && !context.world.entities[pit.data.discoveryDefinition.id]
        && context.view.some(record => record.claim.subject === pit.id && record.claim.key === 'pit-local-progress'
          && record.claim.value.expedition === pit.data.expedition.id && record.claim.value.discoveryObserved === true);
    },
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const definition = pit.data.discoveryDefinition;
      const expedition = pit.data.expedition;
      return { type: 'hearthvale.pit-discovered', data: {
        pit: pit.id, location: definition.id, expedition: expedition.id, significance: 'historical',
      }, effects: [
        { type: 'create', entity: {
          id: definition.id, type: 'hearthvale.pit-space', primaryLocation: pit.id,
          data: { pit: pit.id, name: definition.name, persistence: 'permanent', discovered: true, recognized: true },
        } },
        // Recognized-discovery exception: shared record immediately, with no gossip/time step.
        { type: 'global', key: 'hearthvaleDiscoveries', value: {
          ...(world.globals.hearthvaleDiscoveries ?? {}),
          [definition.id]: { location: definition.id, pit: pit.id, name: definition.name },
        } },
        setData(pit.id, 'expedition', { ...expedition, discoveries: [...expedition.discoveries, definition.id] }),
        { type: 'move', entity: attempt.actor, location: definition.id },
      ] };
    },
  },
  [EXIT_PIT]: {
    eligible: inside,
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const expedition = pit.data.expedition;
      return { type: 'hearthvale.pit-exited', data: { pit: pit.id, expedition: expedition.id }, effects: [
        { type: 'move', entity: attempt.actor, location: expedition.returnLocation },
        setData(pit.id, 'expedition', { ...expedition, active: false }),
        setData(pit.id, 'pendingReturn', { actor: attempt.actor, expedition: expedition.id }),
      ] };
    },
  },
};

export function pitReturnEvents(world) {
  if (activeExpedition(world)) return [];
  return pits(world).filter(pit => pit.data.pendingReturn).map(pit => {
    const cause = Object.values(world.entities).findLast(record => record.consequence?.status === 'applied'
      && record.consequence.operation.entity === pit.id && record.consequence.operation.key === 'pendingReturn');
    return {
      type: 'hearthvale.pit-return-reconciled', causes: cause ? [cause.id] : [],
      data: { pit: pit.id, ...pit.data.pendingReturn },
      effects: [
        setData(pit.id, 'lastReturn', { ...pit.data.pendingReturn, day: world.globals.hearthvale.calendar.day }),
        setData(pit.id, 'pendingReturn', null),
      ],
    };
  });
}

export function pitPerceptions({ event, world }) {
  if (event.event.type === 'hearthvale.world-started') {
    return pits(world).flatMap(pit => Object.values(world.entities)
      .filter(actor => actor.actor && actor.primaryLocation === pit.data.entryLocation)
      .map(actor => ({ actor: actor.id, claim: { subject: pit.id, key: 'pit-entrance', value: { entryLocation: pit.data.entryLocation } } })));
  }
  const type = event.event.type;
  if (!['hearthvale.pit-entered', 'hearthvale.pit-step', 'hearthvale.pit-discovered', 'hearthvale.pit-exited'].includes(type)) return [];
  const pit = world.entities[event.event.data.pit];
  const actor = event.event.actor;
  const claims = [{ actor, claim: { subject: pit.id, key: 'pit-expedition', value: {
    actor, expedition: pit.data.expedition.id, active: pit.data.expedition.active,
  } } }];
  if (type === 'hearthvale.pit-step') claims.push({ actor, claim: { subject: pit.id, key: 'pit-local-progress', value: {
    expedition: pit.data.expedition.id, steps: pit.data.expedition.steps,
    discoveryObserved: pit.data.expedition.steps >= pit.data.discoveryDefinition.afterSteps,
  } } });
  if (type !== 'hearthvale.pit-step') claims.push({ actor, claim: {
    subject: actor, key: 'primaryLocation', value: world.entities[actor].primaryLocation,
  } });
  if (type === 'hearthvale.pit-discovered') claims.push({ actor, claim: {
    subject: event.event.data.location, key: 'recognized-discovery', value: world.globals.hearthvaleDiscoveries[event.event.data.location],
  } });
  return claims;
}

// Only local Actor knowledge supplies candidates. Core and Shell eligibility adjudicate them.
export function pitAvailable({ actor, view }) {
  if (actor.controller !== 'Human') return [];
  const active = view.find(record => record.claim.key === 'pit-expedition'
    && record.claim.value.actor === actor.id && record.claim.value.active);
  if (active) return [ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT].map(type => ({
    actor: actor.id, type, targets: [active.claim.subject], evidence: [active.id],
  }));
  return view.filter(record => record.claim.key === 'pit-entrance').map(record => ({
    actor: actor.id, type: ENTER_PIT, targets: [record.claim.subject], evidence: [record.id],
  }));
}

export function pitMoveAllowed({ world, attempt }) {
  const expedition = activeExpedition(world);
  if (expedition?.data.expedition.actor === attempt.actor) return false;
  const destination = world.entities[attempt.params.location];
  // Ordinary Move cannot bypass entry AP, return reconciliation, or create a route unlock.
  return destination?.type !== 'hearthvale.pit' && destination?.type !== 'hearthvale.pit-space';
}
