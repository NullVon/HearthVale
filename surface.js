// ../LWE-Core/src/infrastructure/records.js
function assert(condition, message2) {
  if (!condition) throw new Error(message2);
}
function json(value, seen = /* @__PURE__ */ new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  assert(typeof value === "object" && value !== null, "Expected JSON-serializable data");
  assert(!seen.has(value), "Cyclic data");
  assert(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, "Expected plain JSON data");
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    assert(!["__proto__", "prototype", "constructor"].includes(key), "Unsafe data key");
    json(item, seen);
  }
  assert(!Object.getOwnPropertySymbols(value).length, "Symbol keys are not serializable");
  if (Array.isArray(value)) assert(Object.keys(value).length === value.length, "Sparse arrays are not serializable");
  seen.delete(value);
}
function copy(value) {
  json(value);
  return structuredClone(value);
}
function readonly(value) {
  const result = copy(value);
  function freeze2(item) {
    if (item && typeof item === "object") {
      Object.values(item).forEach(freeze2);
      Object.freeze(item);
    }
    return item;
  }
  return freeze2(result);
}
function id(value) {
  assert(typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value), "Invalid ID");
  assert(!["__proto__", "constructor", "prototype"].includes(value), "Unsafe ID");
  return value;
}
function allocate(state, kind, component) {
  let key;
  do {
    key = `CORE_${kind}_${++state.sequence}`;
  } while (state.world.entities[key]);
  const entity2 = { id: key, type: `core.${kind}`, data: {}, lifecycle: "active", [kind]: copy(component) };
  state.world.entities[key] = entity2;
  return entity2;
}
function call(hook, context2, fallback) {
  const value = hook ? hook(readonly(context2)) : fallback;
  assert(!value?.then, "Shell hooks must be synchronous");
  return value;
}

// ../LWE-Core/src/core/world-state/index.js
function entity(world, key) {
  id(key);
  const value = world.entities[key];
  assert(value, `Unknown Entity: ${key}`);
  return value;
}
function normalize(value) {
  return { type: "entity", data: {}, lifecycle: "active", primaryLocation: null, container: null, ...copy(value) };
}
function validateWorld(world) {
  json(world);
  assert(world && [world.entities, world.relations, world.globals].every((v) => v && typeof v === "object" && !Array.isArray(v)), "Malformed World State");
  for (const [key, item] of Object.entries(world.entities)) {
    id(key);
    assert(item.id === key, "Entity key/ID mismatch");
    assert(typeof item.type === "string" && item.type.length > 0, "Entity type required");
    assert(item.data && !Array.isArray(item.data) && typeof item.data === "object", "Entity data must be an object");
    assert(typeof item.lifecycle === "string", "Entity lifecycle required");
    for (const field of ["primaryLocation", "container"]) if (item[field] != null) entity(world, item[field]);
    const visited = /* @__PURE__ */ new Set([key]);
    let next = item.container;
    while (next != null) {
      assert(!visited.has(next), "Containment cycle");
      visited.add(next);
      next = entity(world, next).container;
    }
    if (item.actor) assert(["Human", "Autonomous"].includes(item.actor.controller), "Invalid controller");
    if (item.situation) {
      const s = item.situation;
      for (const value of [s.priority ?? 0, s.urgency ?? 0]) assert(Number.isFinite(value), "Situation priority and urgency must be finite");
      if (s.expiresAt != null) assert(Number.isSafeInteger(s.expiresAt) && s.expiresAt >= 0, "Invalid Situation expiry");
      assert(Array.isArray(s.paths) && (s.paths.length > 0 || Number.isSafeInteger(s.expiresAt)), "Situation requires a terminal path");
      const pathIds = /* @__PURE__ */ new Set();
      for (const path of s.paths) {
        if (path.id != null) {
          id(path.id);
          assert(!pathIds.has(path.id), "Duplicate Situation path ID");
          pathIds.add(path.id);
        }
        assert(["resolved", "failed", "expired", "transformed", "cancelled", "invalidated"].includes(path.lifecycle), "Invalid terminal lifecycle");
        assert(path.when && typeof path.when === "object", "Terminal predicate required");
      }
      for (const ref2 of s.affected ?? []) entity(world, ref2);
      const parents = /* @__PURE__ */ new Set([item.id]);
      let parent = s.parent;
      while (parent) {
        assert(!parents.has(parent), "Situation parent cycle");
        parents.add(parent);
        const record2 = entity(world, parent);
        assert(record2.situation, "Parent must be a Situation");
        parent = record2.situation.parent;
      }
      if (s.important) {
        assert(s.opportunity?.claim, "Important Situation requires a legitimate opportunity");
        assert(entity(world, s.opportunity.actor).actor?.controller === "Human", "Opportunity recipient must be Human");
      }
    }
    if (item.claim) {
      const c = item.claim;
      assert(entity(world, c.actor).actor, "Claim owner must be an Actor");
      entity(world, c.subject);
      assert(typeof c.key === "string" && ["certain", "uncertain"].includes(c.certainty), "Malformed claim");
      assert(entity(world, c.source.event).event, "Claim source must be an Event");
      if (c.source.actor) assert(entity(world, c.source.actor).actor, "Claim source Actor required");
      for (const ref2 of c.lineage) assert(entity(world, ref2).claim, "Claim lineage must reference claims");
    }
  }
  for (const [key, rel] of Object.entries(world.relations)) {
    id(key);
    assert(key === rel.id, "Relation ID mismatch");
    entity(world, rel.from);
    entity(world, rel.to);
    assert(rel.data && typeof rel.data === "object" && !Array.isArray(rel.data), "Relation data required");
  }
}
function bootstrap(values = [], globals = {}, relations = []) {
  const world = { entities: {}, globals: copy(globals), relations: {} };
  for (const value of values) {
    id(value.id);
    assert(!world.entities[value.id], "Duplicate Entity");
    assert(!value.event && !value.consequence && !value.attempt && !value.claim, "History and claims originate through Events");
    world.entities[value.id] = normalize(value);
  }
  for (const value of relations) {
    id(value.id);
    assert(!world.relations[value.id], "Duplicate Relation");
    world.relations[value.id] = copy(value);
  }
  validateWorld(world);
  return world;
}
function change(world, op) {
  const changes = [];
  const set = (target, field, value, ref2, scope = "entity") => {
    const before = target[field] ?? null;
    target[field] = copy(value);
    changes.push({ scope, entity: ref2, field, before: copy(before), after: copy(value) });
  };
  if (op.type === "create") {
    id(op.entity.id);
    assert(!world.entities[op.entity.id], "Duplicate Entity");
    assert(!["event", "consequence", "attempt", "claim"].some((k) => op.entity[k]), "Reserved history component");
    world.entities[op.entity.id] = normalize(op.entity);
    changes.push({ scope: "entity", entity: op.entity.id, field: "*", before: null, after: copy(world.entities[op.entity.id]) });
  } else if (op.type === "controller-transfer") {
    const from = entity(world, op.from), to = entity(world, op.to);
    assert(from.id !== to.id && from.actor && to.actor, "Controller transfer requires distinct Actors");
    assert(["Human", "Autonomous"].includes(op.controller) && ["Human", "Autonomous"].includes(op.replacement) && op.controller !== op.replacement, "Controller transfer requires distinct valid controllers");
    assert(from.actor.controller === op.controller && to.actor.controller === op.replacement, "Controller transfer assignments are stale");
    const opportunities = op.opportunities ?? [];
    assert(Array.isArray(opportunities) && new Set(opportunities).size === opportunities.length, "Opportunity references must be a unique array");
    const recipients = opportunities.map((ref2) => {
      const item = entity(world, ref2);
      assert(item.situation?.important && item.situation.opportunity.actor === from.id, "Opportunity must belong to source Actor");
      assert(op.controller === "Human", "Opportunity recipient must be Human");
      return item;
    });
    set(from.actor, "controller", op.replacement, from.id);
    changes.at(-1).field = "actor.controller";
    set(to.actor, "controller", op.controller, to.id);
    changes.at(-1).field = "actor.controller";
    for (const item of recipients) {
      set(item.situation.opportunity, "actor", to.id, item.id);
      changes.at(-1).field = "situation.opportunity.actor";
    }
  } else if (op.type === "relation") {
    id(op.relation.id);
    set(world.relations, op.relation.id, op.relation, op.relation.id, "relation");
  } else if (op.type === "global") {
    id(op.key);
    set(world.globals, op.key, op.value, op.key, "global");
  } else {
    const target = entity(world, op.entity);
    assert(!target.event && !target.consequence && !target.attempt && !target.claim, "History is immutable through World operations");
    if (op.type === "move") set(target, "primaryLocation", op.location, target.id);
    else if (op.type === "contain") set(target, "container", op.container, target.id);
    else if (op.type === "retire") set(target, "lifecycle", "retired", target.id);
    else if (op.type === "data") {
      id(op.key);
      const before = target.data[op.key] ?? null;
      target.data[op.key] = copy(op.value);
      changes.push({ scope: "entity", entity: target.id, field: `data.${op.key}`, before: copy(before), after: copy(op.value) });
    } else throw new Error(`Unknown World operation: ${op.type}`);
  }
  validateWorld(world);
  return changes;
}

// ../LWE-Core/src/core/information/index.js
function view(world, actor) {
  assert(entity(world, actor).actor, "View requires an Actor");
  return Object.values(world.entities).filter((e2) => e2.claim?.actor === actor && e2.lifecycle === "active");
}
function aware(world, actor, subject) {
  return view(world, actor).some((e2) => e2.claim.subject === subject);
}
function grant(state, actor, claim, source) {
  assert(entity(state.world, actor).actor, "Receiver must be an Actor");
  entity(state.world, claim.subject);
  assert(typeof claim.key === "string" && claim.key.length > 0, "Claim key required");
  const changes = [];
  for (const previous of view(state.world, actor)) {
    if (previous.claim.subject === claim.subject && previous.claim.key === claim.key) {
      previous.lifecycle = "superseded";
      changes.push({ scope: "entity", entity: previous.id, field: "lifecycle", before: "active", after: "superseded" });
    }
  }
  const record2 = allocate(state, "claim", {
    actor,
    subject: claim.subject,
    key: claim.key,
    value: copy(claim.value),
    certainty: claim.certainty ?? "certain",
    retention: claim.retention ?? "persistent",
    source: copy(source),
    lineage: copy(claim.lineage ?? [])
  });
  changes.push({ scope: "entity", entity: record2.id, field: "*", before: null, after: copy(record2) });
  return changes;
}
function forget(world, actor, claimId) {
  const record2 = entity(world, claimId);
  assert(record2.claim?.actor === actor, "Cannot forget another Actor's claim");
  const before = record2.lifecycle;
  record2.lifecycle = "forgotten";
  return [{ scope: "entity", entity: claimId, field: "lifecycle", before, after: "forgotten" }];
}

// ../LWE-Core/src/infrastructure/random.js
function nextRandom(state) {
  state.random = Math.imul(1664525, state.random) + 1013904223 >>> 0;
  return state.random / 4294967296;
}
function callWithRandom(state, hook, context2, fallback) {
  if (!hook) return fallback;
  let active2 = true;
  const rng = Object.freeze({ next: () => {
    assert(active2, "RNG capability expired outside resolution hook");
    return nextRandom(state);
  } });
  try {
    const result = hook(readonly(context2), Object.freeze({ rng }));
    assert(!result?.then, "Shell hooks must be synchronous");
    return result;
  } finally {
    active2 = false;
  }
}

// ../LWE-Core/src/core/actors-actions/index.js
var universal = {
  Wait: () => [],
  Interact: () => [],
  Move: ({ attempt: a }) => [{ type: "move", entity: a.actor, location: a.params.location }],
  Take: ({ attempt: a }) => [{ type: "contain", entity: a.targets[0], container: a.actor }],
  Give: ({ attempt: a }) => [{ type: "contain", entity: a.targets[0], container: a.targets[1] }],
  Communicate: ({ attempt: a }) => a.targets.map((actor) => ({
    type: "learn",
    actor,
    claim: { ...a.params.claim, lineage: a.params.claim.lineage ?? a.evidence },
    sourceActor: a.actor
  }))
};
var EligibilityDenied = class extends Error {
};
function requireEligible(condition, message2) {
  if (!condition) throw new EligibilityDenied(message2);
}
function possessedBy(world, target, actor) {
  let container = entity(world, target).container;
  while (container) {
    if (container === actor) return true;
    container = entity(world, container).container;
  }
  return false;
}
function possessions(world, actor) {
  return Object.values(world.entities).filter((item) => possessedBy(world, item.id, actor)).map((item) => ({ id: item.id, type: item.type, lifecycle: item.lifecycle, container: item.container }));
}
function decisionBase(state, actor) {
  const item = entity(state.world, actor);
  assert(item.actor && item.lifecycle === "active", "Inactive or non-Actor");
  const knowledge2 = view(state.world, actor);
  const knownSituations = Object.values(state.world.entities).filter((candidate) => candidate.situation && knowledge2.some((record2) => record2.claim.subject === candidate.id));
  const permitted = state.scene?.context?.decision ?? {};
  return {
    actor: {
      id: actor,
      type: item.type,
      lifecycle: item.lifecycle,
      controller: item.actor.controller,
      data: copy(item.data),
      primaryLocation: item.primaryLocation,
      container: item.container
    },
    possessions: possessions(state.world, actor),
    view: knowledge2,
    situations: knownSituations.map((candidate) => ({
      id: candidate.id,
      claims: knowledge2.filter((record2) => record2.claim.subject === candidate.id).map((record2) => copy(record2))
    })),
    sceneContext: { shared: copy(permitted.shared ?? {}), actor: copy(permitted.actors?.[actor] ?? {}) },
    boundary: state.boundary
  };
}
function desireList(shell, context2) {
  const desires = call(shell.desires, context2, []);
  assert(Array.isArray(desires), "Desires must be an array");
  const seen = /* @__PURE__ */ new Set();
  for (const desire of desires) {
    id(desire.id);
    assert(!seen.has(desire.id), "Duplicate desire ID");
    seen.add(desire.id);
    assert(Number.isFinite(desire.weight) && desire.weight >= 0, "Invalid desire weight");
  }
  return desires;
}
function availableList(state, shell, actor, context2) {
  const candidates = call(shell.available, context2, [{ actor, type: "Wait" }]);
  assert(Array.isArray(candidates), "Available Actions must be an array");
  return candidates.filter((input) => {
    if (input.actor !== actor) return false;
    try {
      eligibility(state, shell, prepare(input), "selection");
      return true;
    } catch (error) {
      if (error instanceof EligibilityDenied) return false;
      throw error;
    }
  }).map(prepare);
}
function decisionContext(state, shell, actor) {
  const base = decisionBase(state, actor);
  const desires = desireList(shell, base);
  const withDesires = { ...base, desires };
  return { ...withDesires, availableActions: availableList(state, shell, actor, withDesires) };
}
function weightDecisions(choices, desires) {
  assert(Array.isArray(choices), "Choices must be an array");
  const weights = new Map(desires.map((desire) => [desire.id, desire.weight]));
  return choices.map((choice) => {
    const weight = choice.desire == null ? choice.weight : weights.get(choice.desire);
    assert(choice.desire == null || weights.has(choice.desire), "Choice references an unknown desire");
    return { ...copy(choice), weight };
  });
}
function prepare(input) {
  const result = { targets: [], params: {}, evidence: [], ...copy(input) };
  delete result.conflict;
  assert(typeof result.type === "string" && Array.isArray(result.targets) && Array.isArray(result.evidence), "Malformed Action attempt");
  return result;
}
function eligibility(state, shell, attempt, phase2 = "resolution") {
  const actor = entity(state.world, attempt.actor);
  assert(actor.actor && actor.lifecycle === "active", "Inactive or non-Actor");
  assert(universal[attempt.type] || shell.actions?.[attempt.type]?.resolve, "Unknown Action");
  attempt.targets.forEach((ref2) => entity(state.world, ref2));
  if (attempt.type === "Move") {
    requireEligible(attempt.targets.length === 0, "Move changes only the acting Actor primary location");
    entity(state.world, attempt.params.location);
  }
  for (const ref2 of attempt.targets) {
    if (entity(state.world, ref2).situation) requireEligible(aware(state.world, attempt.actor, ref2), "Actor is unaware of Situation");
  }
  if (attempt.type === "Give") requireEligible(possessedBy(state.world, attempt.targets[0], attempt.actor), "Actor does not possess target");
  const knowledge2 = view(state.world, attempt.actor);
  for (const ref2 of attempt.evidence) requireEligible(knowledge2.some((e2) => e2.id === ref2), "Evidence is absent from Actor View");
  if (attempt.situation) {
    assert(entity(state.world, attempt.situation).situation, "Not a Situation");
    requireEligible(aware(state.world, attempt.actor, attempt.situation), "Actor is unaware of Situation");
  }
  const context2 = { attempt, world: state.world, view: knowledge2, phase: phase2 };
  const allowed = call(shell.actions?.[attempt.type]?.eligible, context2, true);
  assert(typeof allowed === "boolean", "Action eligibility must return a boolean");
  requireEligible(allowed, "Shell denied Action");
  return context2;
}
function recordAttempt(state, input) {
  const attempt = prepare(input);
  assert(entity(state.world, attempt.actor).actor, "Attempt requires an Actor");
  const owned = view(state.world, attempt.actor).filter((c) => attempt.evidence.includes(c.id) || c.claim.subject === attempt.situation);
  const evidence = owned.map((c) => c.id);
  const record2 = allocate(state, "attempt", { ...attempt, evidence, boundary: state.boundary });
  return { attempt, record: record2 };
}
function rejectAttempt(state, input, reason, recordEvent2, causes = [], conflict = null, type = "action.failed") {
  const { attempt, record: record2 } = recordAttempt(state, input);
  return recordEvent2({
    type,
    actor: attempt.actor,
    attempt: record2.id,
    causes,
    data: { action: attempt.type, reason, ...conflict ? { conflict } : {} },
    effects: []
  });
}
function resolveAttempt(state, shell, input, recordEvent2, causes = [], conflict = null) {
  const { attempt, record: record2 } = recordAttempt(state, input);
  let context2;
  try {
    context2 = eligibility(state, shell, attempt);
  } catch (error) {
    if (!(error instanceof EligibilityDenied)) throw error;
    return recordEvent2({
      type: "action.failed",
      actor: attempt.actor,
      attempt: record2.id,
      causes,
      data: { action: attempt.type, reason: error.message, ...conflict ? { conflict } : {} },
      effects: []
    });
  }
  const builtIn = universal[attempt.type];
  const result = builtIn ? { outcome: "resolved", effects: builtIn(readonly(context2)) } : callWithRandom(state, shell.actions[attempt.type].resolve, context2);
  assert(result && Array.isArray(result.effects), "Action resolver must return effects");
  return recordEvent2({
    type: result.type ?? "action.resolved",
    actor: attempt.actor,
    attempt: record2.id,
    causes,
    data: { action: attempt.type, outcome: result.outcome ?? "resolved", ...result.data ?? {}, ...conflict ? { conflict } : {} },
    effects: result.effects
  });
}

// ../LWE-Core/src/infrastructure/rules/index.js
function read(world, subject, field) {
  const root = subject === "$globals" ? world.globals : world.entities[subject];
  assert(typeof field === "string" && field.split(".").every((k) => !["__proto__", "constructor", "prototype"].includes(k)), "Invalid field path");
  return field.split(".").reduce((v, k) => v?.[k], root);
}
function evaluate(rule, world) {
  if (rule == null) return true;
  if (rule.all) return rule.all.every((r) => evaluate(r, world));
  if (rule.any) return rule.any.some((r) => evaluate(r, world));
  if (rule.not) return !evaluate(rule.not, world);
  const value = read(world, rule.entity, rule.field);
  switch (rule.op) {
    case "eq":
      return JSON.stringify(value) === JSON.stringify(rule.value);
    case "ne":
      return JSON.stringify(value) !== JSON.stringify(rule.value);
    case "exists":
      return value !== void 0;
    case "gt":
      return typeof value === "number" && value > rule.value;
    case "gte":
      return typeof value === "number" && value >= rule.value;
    default:
      throw new Error("Unknown predicate operator");
  }
}
function selectWeighted(choices, random) {
  assert(Array.isArray(choices), "Choices must be an array");
  let total = 0;
  for (const item of choices) {
    assert(Number.isFinite(item.weight) && item.weight >= 0, "Invalid weight");
    total += item.weight;
  }
  assert(Number.isFinite(total), "Weight total overflow");
  if (!total) return null;
  const sample = random();
  assert(sample >= 0 && sample < 1, "Random sample out of range");
  let point = sample * total;
  for (const item of choices) {
    point -= item.weight;
    if (point < 0) return item;
  }
  return choices.at(-1);
}
function compareContest(entries) {
  assert(entries.every((e2) => Number.isFinite(e2.value)), "Contest values must be finite");
  const groups = [];
  for (const entry of [...entries].sort((a, b) => b.value - a.value)) {
    if (groups.at(-1)?.[0].value === entry.value) groups.at(-1).push(entry);
    else groups.push([entry]);
  }
  return groups;
}

// ../LWE-Core/src/core/events-consequences/index.js
var HARD_LIMIT = 1e4;
var MAX_DEPTH = 128;
function recordEvent(state, shell, spec, parent = null) {
  assert(typeof spec.type === "string", "Event type required");
  const causes = parent ? [parent, ...spec.causes ?? []] : [...spec.causes ?? []];
  for (const cause of causes) assert(entity(state.world, cause).consequence, "Later Events require Consequence causes");
  const depth = causes.length ? Math.max(...causes.map((c) => entity(state.world, c).consequence.depth)) + 1 : 0;
  assert(depth <= MAX_DEPTH, "Causal depth safety ceiling exceeded");
  if (spec.actor) assert(entity(state.world, spec.actor).actor, "Event Actor required");
  const event = allocate(state, "event", {
    type: spec.type,
    actor: spec.actor ?? null,
    attempt: spec.attempt ?? null,
    causes,
    data: copy(spec.data ?? {}),
    boundary: state.boundary,
    depth
  });
  const effects2 = [...spec.effects ?? []];
  const shellEffects = call(shell.consequences, { event, world: state.world }, []);
  assert(Array.isArray(shellEffects), "Shell consequences must return an array");
  effects2.push(...shellEffects);
  assert(effects2.length <= HARD_LIMIT, "Event effect safety ceiling exceeded");
  if (shell.perceive) effects2.push({ type: "perceive" });
  for (const effect2 of effects2) {
    const due = effect2.due ?? state.boundary;
    assert(Number.isSafeInteger(due) && due >= state.boundary, "Invalid due boundary");
    const consequence = allocate(state, "consequence", {
      event: event.id,
      operation: effect2,
      due,
      depth,
      status: "pending",
      changes: []
    });
    state.queue.push(consequence.id);
  }
  return event.id;
}
function apply(state, shell, record2) {
  const c = record2.consequence;
  const op = c.operation;
  if (!evaluate(op.when, state.world)) {
    c.status = "invalidated";
    c.reason = "Validity predicate no longer holds";
    return;
  }
  const prior = copy(state);
  try {
    if (op.type === "perceive") {
      const perceptions = call(shell.perceive, { event: entity(state.world, c.event), world: state.world }, []);
      assert(Array.isArray(perceptions) && perceptions.length <= HARD_LIMIT, "Perception must return bounded explicit grants");
      c.changes = perceptions.flatMap((observation) => grant(state, observation.actor, observation.claim, { kind: "perceived", event: c.event }));
    } else if (op.type === "learn") c.changes = grant(state, op.actor, op.claim, {
      kind: op.sourceActor ? "communicated" : "perceived",
      event: c.event,
      ...op.sourceActor ? { actor: op.sourceActor } : {}
    });
    else if (op.type === "forget") c.changes = forget(state.world, op.actor, op.claim);
    else if (op.type === "situation") {
      const target = entity(state.world, op.entity);
      assert(target.situation, "Not a Situation");
      assert(["active", "changed", "escalated", "de-escalated", "resolved", "failed", "expired", "transformed", "cancelled", "invalidated"].includes(op.lifecycle), "Invalid Situation lifecycle");
      c.changes = [{ scope: "entity", entity: target.id, field: "lifecycle", before: target.lifecycle, after: op.lifecycle }];
      target.lifecycle = op.lifecycle;
    } else if (op.type === "emit") recordEvent(state, shell, op.event, record2.id);
    else c.changes = change(state.world, op);
    c.status = "applied";
    c.executedAt = state.boundary;
    c.order = ++state.execution;
    validateWorld(state.world);
  } catch (error) {
    if (c.due === entity(state.world, c.event).event.boundary) throw error;
    Object.assign(state, prior);
    const restored = entity(state.world, record2.id).consequence;
    restored.status = "invalidated";
    restored.reason = error.message;
  }
}
function drain(state, shell, budget, includeDelayed = true) {
  while (budget.left > 0) {
    const index = state.queue.findIndex((ref3) => {
      const c = entity(state.world, ref3).consequence;
      return c.due <= state.boundary && (includeDelayed || c.due === entity(state.world, c.event).event.boundary);
    });
    if (index < 0) return;
    assert(++budget.used <= HARD_LIMIT, "Causal operation safety ceiling exceeded");
    budget.left--;
    const [ref2] = state.queue.splice(index, 1);
    apply(state, shell, entity(state.world, ref2));
  }
}
function hasDue(state) {
  return state.queue.some((ref2) => entity(state.world, ref2).consequence.due <= state.boundary);
}
function trace(world, root) {
  const seen = /* @__PURE__ */ new Set();
  const nodes = [];
  function visit(ref2) {
    if (seen.has(ref2)) return;
    seen.add(ref2);
    const item = entity(world, ref2);
    nodes.push(copy(item));
    if (item.consequence) visit(item.consequence.event);
    if (item.event) {
      item.event.causes.forEach(visit);
      if (item.event.attempt) visit(item.event.attempt);
    }
    if (item.attempt) item.attempt.evidence.forEach(visit);
    if (item.claim) {
      visit(item.claim.source.event);
      item.claim.lineage.forEach(visit);
    }
  }
  if (root) visit(root);
  return nodes;
}
function why(world, subject, field) {
  entity(world, subject);
  const candidates = Object.values(world.entities).filter((e2) => e2.consequence?.status === "applied" && e2.consequence.changes.some((c) => c.entity === subject && (c.field === field || c.field === "*")));
  candidates.sort((a, b) => a.consequence.executedAt - b.consequence.executedAt || a.consequence.order - b.consequence.order);
  const root = candidates.at(-1)?.id ?? null;
  return { subject, field, origin: root ? "consequence" : "bootstrap", root, nodes: trace(world, root) };
}

// ../LWE-Core/src/core/situations/index.js
var active = /* @__PURE__ */ new Set(["active", "changed", "escalated", "de-escalated"]);
function situations(world) {
  return Object.values(world.entities).filter((e2) => e2.situation && active.has(e2.lifecycle)).sort((a, b) => (b.situation.priority ?? 0) - (a.situation.priority ?? 0) || (b.situation.urgency ?? 0) - (a.situation.urgency ?? 0));
}
function updateSituations(state, shell, recordEvent2) {
  let count = 0;
  for (const item of situations(state.world)) {
    const pending = state.queue.map((ref2) => state.world.entities[ref2].consequence.operation);
    const s = item.situation;
    if (s.important) {
      assert(typeof shell.surfaceOpportunity === "function", "Important Situation requires a Shell opportunity cadence policy");
      const opportunityEvents = Object.values(state.world.entities).filter((record2) => record2.event?.type === "situation.opportunity" && record2.event.data.situation === item.id);
      const surfacedThisBoundary = opportunityEvents.some((record2) => record2.event.boundary === state.boundary);
      const surface = !surfacedThisBoundary && call(shell.surfaceOpportunity, {
        boundary: state.boundary,
        situation: item,
        previousCount: opportunityEvents.length,
        world: state.world
      }, false);
      assert(typeof surface === "boolean", "Opportunity cadence policy must return a boolean");
      if (surface) {
        recordEvent2({ type: "situation.opportunity", data: { situation: item.id, occurrence: opportunityEvents.length + 1 }, effects: [
          { type: "learn", actor: s.opportunity.actor, claim: copy(s.opportunity.claim) }
        ] });
        count++;
      }
    }
    if (pending.some((op) => op.type === "situation" && op.entity === item.id)) continue;
    const path = s.paths.find((p) => evaluate(p.when, state.world));
    const lifecycle = path?.lifecycle ?? (s.expiresAt != null && s.expiresAt <= state.boundary ? "expired" : null);
    if (!lifecycle) continue;
    const causes = Object.values(state.world.entities).filter((e2) => e2.consequence?.status === "applied" && e2.consequence.changes.some((c) => (s.affected ?? []).includes(c.entity))).map((e2) => e2.id);
    recordEvent2({ type: "situation.changed", causes, data: { situation: item.id, lifecycle, path: path?.id ?? null }, effects: [{ type: "situation", entity: item.id, lifecycle }] });
    count++;
  }
  return count;
}

// ../LWE-Core/src/core/scene-progression/index.js
function start(state, context2 = {}) {
  assert(!state.scene, "A Scene is already open");
  state.scene = { context: copy(context2), phase: "active", attempts: [] };
  state.checkpoint = false;
}
function submit(state, input) {
  assert(state.scene?.phase === "active", "Actions require an active Scene");
  const attempt = prepare(input);
  decisionBase(state, attempt.actor);
  state.scene.attempts.push(attempt);
}
function deferAttempts(state, attempts, due) {
  assert(state.checkpoint && !state.scene && !state.suspended.length, "Deferred Actions require a stable checkpoint");
  assert(Number.isSafeInteger(due) && due > state.boundary, "Deferred Action boundary must be in the future");
  assert(Array.isArray(attempts) && attempts.length > 0 && attempts.length <= HARD_LIMIT, "Invalid deferred Actions");
  const prepared = attempts.map((input) => {
    const attempt = prepare(input);
    decisionBase(state, attempt.actor);
    return attempt;
  });
  state.deferredAttempts.push({ due, attempts: prepared });
}
function interrupt(state, context2) {
  assert(state.scene?.phase === "active", "Only an active Scene can be interrupted");
  state.scene.interruptedAt = state.boundary;
  state.suspended.push(state.scene);
  state.scene = null;
  start(state, context2);
}
function resume(state, shell, mode = "resume", context2 = {}) {
  assert(!state.scene && state.suspended.length, "Finish the interruption before resuming");
  assert(["resume", "transform", "end"].includes(mode), "Unknown resume mode");
  const frame = state.suspended.pop();
  const nestedCauses = Object.values(state.world.entities).filter((record2) => record2.consequence?.status === "applied" && record2.consequence.executedAt > frame.interruptedAt).map((record2) => record2.id);
  delete frame.interruptedAt;
  if (mode === "end") {
    const emit = (spec) => recordEvent(state, shell, spec);
    for (const attempt of frame.attempts) rejectAttempt(state, attempt, "Parent Scene ended after interruption", emit, nestedCauses, null, "action.cancelled");
  } else {
    frame.resumeCauses = [.../* @__PURE__ */ new Set([...frame.resumeCauses ?? [], ...nestedCauses])];
    state.scene = frame;
    if (mode === "transform") state.scene.context = copy(context2);
  }
  state.checkpoint = !state.scene && !state.suspended.length;
}
function tieOrder(tier, tie, attempts, sample) {
  const policy = tie?.policy ?? "actor-order";
  assert(["actor-order", "random", "no-winner", "simultaneous"].includes(policy), "Unknown contest tie policy");
  if (tier.length < 2 || policy === "simultaneous" || policy === "no-winner") return tier.map((entry) => ({ ...entry, reject: tier.length > 1 && policy === "no-winner" }));
  if (policy === "actor-order") {
    const order = tie.order ?? [];
    assert(Array.isArray(order) && new Set(order).size === order.length, "Invalid contest Actor order");
    return [...tier].sort((a, b) => {
      const actorA = attempts[a.index].actor;
      const actorB = attempts[b.index].actor;
      const rankA = order.indexOf(actorA);
      const rankB = order.indexOf(actorB);
      if (rankA >= 0 || rankB >= 0) return (rankA < 0 ? Infinity : rankA) - (rankB < 0 ? Infinity : rankB);
      return actorA.localeCompare(actorB) || a.index - b.index;
    });
  }
  const pool = [...tier];
  const ordered = [];
  while (pool.length) {
    const selected = selectWeighted(pool.map((entry) => ({ ...entry, weight: entry.weight ?? 1 })), sample);
    assert(selected, "Random contest tie requires positive weight");
    ordered.push(pool.splice(pool.findIndex((entry) => entry.index === selected.index), 1)[0]);
  }
  return ordered;
}
function orderAttempts(state, shell, attempts) {
  const groups = callWithRandom(state, shell.conflicts, { attempts, world: state.world, boundary: state.boundary }, []);
  assert(Array.isArray(groups), "Conflict policy must return an array");
  const assigned = /* @__PURE__ */ new Set();
  const starts = /* @__PURE__ */ new Map();
  const covered = /* @__PURE__ */ new Set();
  const groupIds = /* @__PURE__ */ new Set();
  for (const group of groups) {
    id(group.id);
    assert(!groupIds.has(group.id), "Duplicate conflict ID");
    groupIds.add(group.id);
    assert(Array.isArray(group.entries) && group.entries.length >= 2, "Conflict requires at least two entries");
    assert(["high-first", "low-first"].includes(group.direction ?? "high-first"), "Unknown contest direction");
    const entries = group.entries.map((entry) => {
      assert(Number.isSafeInteger(entry.index) && attempts[entry.index], "Invalid conflict attempt index");
      assert(!assigned.has(entry.index), "Attempt belongs to multiple conflicts");
      assigned.add(entry.index);
      assert(Number.isFinite(entry.value), "Contest values must be finite");
      if (entry.weight != null) assert(Number.isFinite(entry.weight) && entry.weight >= 0, "Invalid tie weight");
      return copy(entry);
    });
    let tiers = compareContest(entries);
    if (group.direction === "low-first") tiers = tiers.reverse();
    const ordered = [];
    tiers.forEach((tier, rank) => {
      for (const entry of tieOrder(tier, group.tie, attempts, () => nextRandom(state))) {
        ordered.push({
          index: entry.index,
          reject: entry.reject,
          conflict: { id: group.id, value: entry.value, rank, tiePolicy: group.tie?.policy ?? "actor-order" }
        });
      }
    });
    const first = Math.min(...entries.map((entry) => entry.index));
    assert(!starts.has(first), "Conflicts have the same starting attempt");
    starts.set(first, ordered);
    entries.forEach((entry) => covered.add(entry.index));
  }
  const result = [];
  attempts.forEach((attempt, index) => {
    if (starts.has(index)) {
      for (const entry of starts.get(index)) result.push({ ...entry, attempt: copy(attempts[entry.index]) });
    } else if (!covered.has(index)) result.push({ index, attempt });
  });
  return result;
}
function resolve(state, shell, options = {}) {
  assert(state.scene?.phase === "active", "No active Scene");
  const allowance = options.budget ?? 1e3;
  const offscreenBudget = options.offscreenBudget ?? 0;
  assert(Number.isSafeInteger(allowance) && allowance > 0 && allowance <= HARD_LIMIT, "Invalid causal budget");
  assert(Number.isSafeInteger(offscreenBudget) && offscreenBudget >= 0 && offscreenBudget <= HARD_LIMIT, "Invalid off-screen budget");
  state.scene.phase = "resolving";
  state.boundary++;
  const dueAttempts = state.deferredAttempts.filter((batch) => batch.due <= state.boundary);
  state.deferredAttempts = state.deferredAttempts.filter((batch) => batch.due > state.boundary);
  const attempts = [...dueAttempts.flatMap((batch) => batch.attempts), ...state.scene.attempts];
  const budget = { left: allowance, used: 0 };
  const emit = (spec) => recordEvent(state, shell, spec);
  const settle = (includeDelayed = true) => {
    do {
      drain(state, shell, budget, includeDelayed);
      if (!updateSituations(state, shell, emit)) break;
    } while (budget.left > 0);
  };
  const hasImmediate = () => state.queue.some((ref2) => {
    const consequence = state.world.entities[ref2].consequence;
    return consequence.due <= state.boundary && consequence.due === state.world.entities[consequence.event].event.boundary;
  });
  settle(false);
  const conflictCauses = /* @__PURE__ */ new Map();
  for (const item of orderAttempts(state, shell, attempts)) {
    assert(!hasImmediate(), "Causal budget exhausted before competing attempts could revalidate");
    const causes = [.../* @__PURE__ */ new Set([...state.scene.resumeCauses ?? [], ...item.conflict ? conflictCauses.get(item.conflict.id) ?? [] : []])];
    const eventId = item.reject ? rejectAttempt(state, item.attempt, "Contest tie policy produced no winner", emit, causes, item.conflict) : resolveAttempt(state, shell, item.attempt, emit, causes, item.conflict);
    settle(false);
    if (item.conflict) {
      const applied = Object.values(state.world.entities).filter((record2) => record2.consequence?.event === eventId && record2.consequence.status === "applied").map((record2) => record2.id);
      if (applied.length) conflictCauses.set(item.conflict.id, applied);
    }
  }
  drain(state, shell, budget, true);
  const processes = callWithRandom(state, shell.worldProcesses, { world: state.world, boundary: state.boundary }, []);
  assert(Array.isArray(processes) && processes.length <= HARD_LIMIT, "World process safety ceiling exceeded");
  for (const event of processes) emit(event);
  settle();
  if (offscreenBudget > 0 && !hasDue(state)) {
    const actors = call(shell.offscreenActors, { boundary: state.boundary }, []);
    assert(Array.isArray(actors), "Off-screen policy must return Actor IDs");
    for (const actor of actors.slice(0, offscreenBudget)) {
      if (hasDue(state) || budget.left === 0) break;
      const context2 = decisionContext(state, shell, actor);
      assert(context2.actor.controller === "Autonomous", "Off-screen selection requires an Autonomous Actor");
      const choices = weightDecisions(call(shell.choices, context2, []), context2.desires);
      const selected = selectWeighted(choices, () => nextRandom(state));
      if (!selected) continue;
      assert(selected.attempt.actor === actor, "Decision may only act as its Actor");
      const selectedAttempt = prepare(selected.attempt);
      assert(context2.availableActions.some((attempt) => JSON.stringify(attempt) === JSON.stringify(selectedAttempt)), "Decision must select a dynamically available Action");
      resolveAttempt(state, shell, selectedAttempt, emit);
      settle();
    }
  }
  const deferred = hasDue(state);
  state.scene = null;
  state.checkpoint = !state.suspended.length;
  return { boundary: state.boundary, phase: deferred ? "deferred" : "stabilized", checkpoint: state.checkpoint, processed: budget.used };
}

// ../LWE-Core/src/infrastructure/persistence/index.js
var VERSION = 1;
function validateState(state) {
  json(state);
  validateWorld(state.world);
  assert(Number.isSafeInteger(state.boundary) && state.boundary >= 0, "Invalid boundary");
  assert(Number.isSafeInteger(state.sequence) && state.sequence >= 0, "Invalid ID sequence");
  assert(Number.isSafeInteger(state.execution) && state.execution >= 0, "Invalid execution sequence");
  assert(Number.isInteger(state.random) && state.random >= 0 && state.random <= 4294967295, "Invalid random state");
  assert(Array.isArray(state.queue) && new Set(state.queue).size === state.queue.length, "Invalid queue");
  assert(Array.isArray(state.deferredAttempts), "Invalid deferred Actions");
  for (const batch of state.deferredAttempts) {
    assert(Number.isSafeInteger(batch.due) && batch.due > state.boundary, "Invalid deferred Action boundary");
    assert(Array.isArray(batch.attempts) && batch.attempts.length > 0, "Invalid deferred Action batch");
    for (const attempt of batch.attempts) {
      assert(typeof attempt.type === "string" && Array.isArray(attempt.targets) && Array.isArray(attempt.evidence), "Malformed deferred Action");
      assert(entity(state.world, attempt.actor).actor, "Deferred Action Actor missing");
      for (const ref2 of attempt.targets) entity(state.world, ref2);
      for (const ref2 of attempt.evidence) assert(entity(state.world, ref2).claim?.actor === attempt.actor, "Invalid deferred Action evidence");
    }
  }
  assert(Array.isArray(state.suspended), "Invalid suspended Scenes");
  for (const ref2 of state.queue) assert(entity(state.world, ref2).consequence?.status === "pending", "Queue must reference pending Consequences");
  for (const item of Object.values(state.world.entities)) {
    if (item.consequence) {
      const c = item.consequence;
      assert(entity(state.world, c.event).event, "Consequence cause must be an Event");
      assert(["pending", "applied", "invalidated"].includes(c.status), "Invalid Consequence status");
      assert(Number.isSafeInteger(c.due) && c.due >= 0 && Array.isArray(c.changes), "Malformed Consequence");
      assert(Number.isSafeInteger(c.depth) && c.depth >= 0 && c.depth <= 128, "Invalid causal depth");
      if (c.status === "applied") assert(Number.isSafeInteger(c.order) && c.order > 0 && c.order <= state.execution && Number.isSafeInteger(c.executedAt) && c.executedAt <= state.boundary, "Invalid execution provenance");
      assert(c.status === "pending" === state.queue.includes(item.id), "Pending Consequence queue mismatch");
    }
    if (item.event) {
      const e2 = item.event;
      assert(typeof e2.type === "string" && Array.isArray(e2.causes), "Malformed Event");
      assert(Number.isSafeInteger(e2.depth) && e2.depth >= 0 && e2.depth <= 128, "Invalid Event depth");
      for (const ref2 of e2.causes) {
        const cause = entity(state.world, ref2).consequence;
        assert(cause && cause.depth < e2.depth, "Event cause must be an earlier Consequence");
      }
      if (e2.actor) assert(entity(state.world, e2.actor).actor, "Invalid Event Actor");
      if (e2.attempt) assert(entity(state.world, e2.attempt).attempt, "Event attempt missing");
    }
    if (item.attempt) {
      assert(entity(state.world, item.attempt.actor).actor, "Attempt Actor missing");
      for (const ref2 of item.attempt.evidence) assert(entity(state.world, ref2).claim?.actor === item.attempt.actor, "Invalid attempt evidence");
    }
  }
  assert(typeof state.checkpoint === "boolean", "Invalid checkpoint");
  if (state.checkpoint) assert(!state.scene && !state.suspended.length, "Unsafe checkpoint");
}
function save(state) {
  assert(state.checkpoint, "Save requires a stable checkpoint");
  validateState(state);
  return JSON.stringify({ version: VERSION, state });
}
function load(serialized) {
  const envelope = JSON.parse(serialized);
  assert(envelope.version === VERSION, "Unsupported save version; explicit migration required");
  const state = copy(envelope.state);
  state.deferredAttempts ?? (state.deferredAttempts = []);
  validateState(state);
  assert(state.checkpoint, "Save does not describe a stable checkpoint");
  return state;
}

// ../LWE-Core/src/api/index.js
function createRuntime({ entities = [], globals = {}, relations = [], shell = {}, seed = 1, saved } = {}) {
  assert(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295, "Seed must be an unsigned 32-bit integer");
  let state = saved ? load(saved) : {
    world: bootstrap(entities, globals, relations),
    sequence: 0,
    execution: 0,
    boundary: 0,
    queue: [],
    deferredAttempts: [],
    scene: null,
    suspended: [],
    random: seed,
    checkpoint: true
  };
  let busy = false;
  function transaction(fn) {
    assert(!busy, "Runtime re-entry is forbidden");
    busy = true;
    const draft = copy(state);
    try {
      const result = fn(draft);
      validateState(draft);
      state = draft;
      return result == null ? null : readonly(result);
    } finally {
      busy = false;
    }
  }
  return Object.freeze({
    snapshot: () => readonly(state),
    entity: (key) => readonly(entity(state.world, key)),
    view: (actor) => readonly(view(state.world, actor)),
    history: () => readonly(Object.values(state.world.entities).filter((e2) => e2.event || e2.consequence || e2.attempt)),
    why: (subject, field) => readonly(why(state.world, subject, field)),
    trace: (ref2) => readonly(trace(state.world, ref2)),
    available: (actor) => {
      assert(!busy, "Runtime re-entry is forbidden");
      return readonly(decisionContext(state, shell, actor).availableActions);
    },
    startScene: (context2) => transaction((s) => start(s, context2)),
    submit: (attempt) => transaction((s) => submit(s, attempt)),
    deferAttempts: (attempts, due) => transaction((s) => deferAttempts(s, attempts, due)),
    resolveScene: (options) => transaction((s) => resolve(s, shell, options)),
    interrupt: (context2) => transaction((s) => interrupt(s, context2)),
    resume: (mode, context2) => transaction((s) => resume(s, shell, mode, context2)),
    save: () => save(state)
  });
}

// ../LWE-Core/packages/dice/index.js
var MAX_DICE = 100;
var MAX_SIDES = 1e6;
var MAX_CANDIDATES = 100;
var COMPARISONS = /* @__PURE__ */ new Set(["gte", "gt", "lte", "lt", "eq"]);
var DiceError = class extends Error {
  constructor(code, message2) {
    super(message2);
    this.name = "DiceError";
    this.code = code;
  }
};
function fail(code, message2) {
  throw new DiceError(code, message2);
}
function safeAdd(left, right, label2) {
  const value = left + right;
  if (!Number.isSafeInteger(value)) fail("UNSAFE_TOTAL", `${label2} exceeds safe integer arithmetic`);
  return value;
}
function plainCopy(value) {
  try {
    return structuredClone(value);
  } catch {
    fail("INVALID_DATA", "Dice inputs and results must be serializable data");
  }
}
function frozenCopy(value) {
  const result = plainCopy(value);
  const freeze2 = (item) => {
    if (item && typeof item === "object") {
      Object.values(item).forEach(freeze2);
      Object.freeze(item);
    }
    return item;
  };
  return freeze2(result);
}
function parse(expression) {
  if (typeof expression !== "string") fail("INVALID_EXPRESSION", "Dice expression must be a string");
  const match = /^\s*(\d*)[dD](\d+)(?:\s*([+-])\s*(\d+))?\s*$/.exec(expression);
  if (!match) fail("INVALID_EXPRESSION", "Expected an NdM expression with an optional modifier");
  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const magnitude = Number(match[4] || 0);
  const modifier = match[3] === "-" ? -magnitude : magnitude;
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_DICE) fail("INVALID_EXPRESSION", `Dice count must be from 1 to ${MAX_DICE}`);
  if (!Number.isSafeInteger(sides) || sides < 2 || sides > MAX_SIDES) fail("INVALID_EXPRESSION", `Die sides must be from 2 to ${MAX_SIDES}`);
  if (!Number.isSafeInteger(modifier)) fail("INVALID_EXPRESSION", "Expression modifier must be a safe integer");
  return { expression: `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`, count, sides, modifier };
}
function randomFunction(rng) {
  if (rng === void 0) return Math.random;
  if (typeof rng === "function") return rng;
  if (rng && typeof rng.next === "function") return () => rng.next();
  fail("INVALID_RNG", "RNG must be a function or an object with next()");
}
function die(random, sides) {
  let sample;
  try {
    sample = random();
  } catch {
    fail("INVALID_RNG", "RNG threw while generating a roll");
  }
  if (typeof sample !== "number" || !Number.isFinite(sample) || sample < 0 || sample >= 1) {
    fail("INVALID_RNG", "RNG must return a finite number in [0, 1)");
  }
  return Math.floor(sample * sides) + 1;
}
function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("INVALID_OPTIONS", "Options must be an object");
  const modifier = options.modifier ?? 0;
  const candidates = options.candidates ?? 1;
  const keep = options.keep ?? "first";
  if (!Number.isSafeInteger(modifier)) fail("INVALID_MODIFIER", "Modifier must be a safe integer");
  if (!Number.isSafeInteger(candidates) || candidates < 1 || candidates > MAX_CANDIDATES) fail("INVALID_CANDIDATES", `Candidates must be from 1 to ${MAX_CANDIDATES}`);
  if (!["first", "highest", "lowest"].includes(keep)) fail("INVALID_KEEP", "Keep must be first, highest, or lowest");
  return { ...options, modifier, candidates, keep };
}
function choose(candidates, keep) {
  if (keep === "first") return 0;
  let selected = 0;
  for (let index = 1; index < candidates.length; index++) {
    if (keep === "highest" && candidates[index].total > candidates[selected].total || keep === "lowest" && candidates[index].total < candidates[selected].total) selected = index;
  }
  return selected;
}
function classify(policy, result) {
  if (policy == null) return null;
  if (typeof policy !== "function") fail("INVALID_CLASSIFICATION_POLICY", "Classification policy must be a function");
  let value;
  try {
    value = policy(frozenCopy(result));
  } catch {
    fail("CLASSIFICATION_POLICY_ERROR", "Classification policy threw");
  }
  if (value !== null && (typeof value !== "string" || !value.trim())) fail("INVALID_CLASSIFICATION", "Classification must be null or a nonempty string");
  return value === null ? null : value.trim();
}
function rollBase(expression, options) {
  const parsed = parse(expression);
  const request = normalizeOptions(options);
  const modifier = safeAdd(parsed.modifier, request.modifier, "Combined modifier");
  const random = randomFunction(request.rng);
  const candidates = [];
  for (let candidate = 0; candidate < request.candidates; candidate++) {
    const rolls = [];
    let subtotal = 0;
    for (let index = 0; index < parsed.count; index++) {
      const value = die(random, parsed.sides);
      rolls.push(value);
      subtotal = safeAdd(subtotal, value, "Dice subtotal");
    }
    candidates.push({ rolls, subtotal, total: safeAdd(subtotal, modifier, "Roll total") });
  }
  const selectedCandidate = choose(candidates, request.keep);
  const selected = candidates[selectedCandidate];
  return {
    expression: parsed.expression,
    count: parsed.count,
    sides: parsed.sides,
    expressionModifier: parsed.modifier,
    suppliedModifier: request.modifier,
    modifier,
    candidates,
    keep: request.keep,
    selectedCandidate,
    rolls: candidates.flatMap((candidate) => candidate.rolls),
    keptRolls: [...selected.rolls],
    discardedRolls: candidates.filter((_, index) => index !== selectedCandidate).flatMap((candidate) => candidate.rolls),
    subtotal: selected.subtotal,
    total: selected.total
  };
}
function compare(total, target, comparison2 = "gte") {
  if (!Number.isFinite(total) || !Number.isFinite(target)) fail("INVALID_COMPARISON", "Comparison values must be finite numbers");
  if (!COMPARISONS.has(comparison2)) fail("INVALID_COMPARISON", "Unknown comparison policy");
  if (comparison2 === "gte") return total >= target;
  if (comparison2 === "gt") return total > target;
  if (comparison2 === "lte") return total <= target;
  if (comparison2 === "lt") return total < target;
  return total === target;
}
function check({ expression, target, comparison: comparison2 = "gte", criticalPolicy, ...options } = {}) {
  if (!Number.isFinite(target)) fail("INVALID_TARGET", "Target must be a finite number");
  const result = rollBase(expression, options);
  const compared = { ...result, target, comparison: comparison2, margin: result.total - target, passed: compare(result.total, target, comparison2) };
  return { ...compared, classification: classify(criticalPolicy, compared) };
}

// HearthVale_Content/schema.js
var STATS = Object.freeze(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
var number = { type: "number", min: 0 };
var integer = { type: "integer", min: 0 };
var positive = { type: "integer", min: 1 };
var text = { type: "string" };
var boolean = { type: "boolean" };
var optional = (rule) => ({ ...rule, optional: true });
var oneOf = (...values) => ({ type: "enum", values });
var array = (items, min = 0) => ({ type: "array", items, min });
var object = (fields) => ({ type: "object", fields });
var ref = (group = "*", domain) => ({ type: "ref", group, domain });
var tag = (domain) => ref("tags", domain);
var percentage = { type: "number", min: 0, max: 100 };
var stat = oneOf(...STATS);
var check2 = object({ stat, dc: oneOf(8, 11, 14, 17), scope: optional(text) });
var effect = object({ tag: tag("effect"), value: { type: "number" }, target: optional(ref()) });
var effects = array(effect);
var refs = (group) => array(ref(group));
var knowledge = array(object({ subject: ref(), tag: tag("information"), state: oneOf("Rumor", "Known") }));
var weightedEntry = object({ target: ref(), weight: percentage });
var selection = object({ kind: oneOf("exclusive"), entries: array(weightedEntry, 1) });
var stats = object(Object.fromEntries(STATS.map((key) => [key, positive])));
var loadout = object({
  weapons: refs("items"),
  armor: refs("items"),
  items: array(object({ item: ref("items"), quantity: positive })),
  arrows: integer,
  gold: integer,
  spells: refs("spells"),
  spellSlots: oneOf(4)
});
var record = (fields) => object({ id: text, label: text, ...fields });
var schemas = Object.freeze({
  tags: record({ domain: oneOf("state", "information", "voice", "effect", "objective", "room-family") }),
  texts: record({ text }),
  traits: record({
    innate: boolean,
    incompatible: refs("traits"),
    effects,
    probabilities: array(object({ tag: tag("effect"), chance: percentage })),
    perDrawChance: optional(percentage)
  }),
  items: record({
    category: oneOf("weapon", "shield", "armor", "consumable", "ammo", "material", "valuable", "scroll", "tome"),
    price: optional(number),
    sellValue: optional(number),
    tier: optional(positive),
    stackable: boolean,
    damage: optional(number),
    defense: optional(number),
    maxDurability: optional(positive),
    impact: optional(number),
    range: optional(oneOf("NEAR", "FAR")),
    accuracy: optional(stat),
    canDefend: optional(boolean),
    speed: optional({ type: "integer" }),
    qualityStat: optional(stat),
    ammo: optional(ref("items")),
    wear: optional(oneOf("successful-hit", "every-shot", "connected-defense", "none")),
    armorSlot: optional(oneOf("head", "chest", "hands", "accessory")),
    spell: optional(ref("spells")),
    effects,
    contexts: array(oneOf("surface", "exploration", "combat")),
    freeAction: optional(boolean),
    wastefulEligible: optional(boolean)
  }),
  spells: record({
    cost: positive,
    target: oneOf("self", "enemy", "lock", "return"),
    ranges: optional(array(oneOf("NEAR", "FAR"))),
    accuracy: optional(stat),
    effects,
    explorationOnly: boolean,
    startingEligible: boolean
  }),
  moves: record({
    range: optional(oneOf("NEAR", "FAR")),
    damage: number,
    impact: number,
    speed: { type: "integer" },
    qualityStat: optional(stat),
    damageType: optional(oneOf("physical", "spell")),
    dodgeDC: oneOf(8, 11, 14, 17),
    stability: integer,
    movement: optional(oneOf("none", "NEAR", "FAR")),
    onHit: effects
  }),
  enemies: record({
    hp: positive,
    defense: number,
    attackDC: oneOf(8, 11, 14, 17),
    xp: integer,
    combatStats: object({ STR: integer, DEX: integer }),
    harvest: array(object({ item: ref("items"), chance: percentage, quantity: oneOf(1) })),
    moves: selection,
    near: optional(selection),
    far: optional(selection),
    guardian: boolean,
    subjective: optional(boolean)
  }),
  hazards: record({
    primary: check2,
    alternate: optional(check2),
    advantageFrom: refs("*"),
    failure: effects,
    text: ref("texts"),
    fire: optional(boolean),
    triggered: optional(check2),
    reward: optional(boolean)
  }),
  events: record({ subjective: optional(boolean), opening: ref("texts"), choices: array(object({
    id: text,
    label: text,
    requires: array(tag("state")),
    targets: refs("*"),
    check: optional(check2),
    resolver: optional({ type: "resolver" }),
    effects,
    failure: optional(effects),
    text: ref("texts")
  }), 1), outputs: refs("*") }),
  recipes: record({
    materials: array(object({ item: ref("items"), quantity: positive }), 1),
    gold: integer,
    output: ref("items"),
    quantity: positive,
    service: oneOf("shop", "blacksmith")
  }),
  vendors: record({ location: ref("locations"), stock: array(object({ item: ref("items"), target: positive, floor: integer })) }),
  situations: record({
    trigger: array(tag("state"), 1),
    lifetime: oneOf("Immediate", "Short", "Long"),
    scope: oneOf("public", "personal"),
    knownText: ref("texts"),
    rumorText: optional(ref("texts")),
    objectives: array(object({ id: text, kind: tag("objective"), target: ref(), quantity: positive }), 1),
    resolver: { type: "resolver" },
    eligibleActors: refs("actors"),
    eligibility: array(tag("state"), 1),
    paths: array(object({
      id: text,
      outcome: oneOf("resolved", "expired", "transformed"),
      effects,
      text: ref("texts")
    }), 1),
    rewards: object({ gold: integer, xp: integer }),
    removesServiceActor: optional(ref("actors")),
    serviceConsequence: optional(ref("texts"))
  }),
  locations: record({
    kind: oneOf("surface", "pit", "named"),
    stratum: integer,
    serviceActor: optional(ref("actors")),
    playable: boolean
  }),
  actors: record({
    role: text,
    stats,
    hearts: positive,
    traits: refs("traits"),
    goal: text,
    controller: oneOf("Human", "Autonomous"),
    location: ref("locations"),
    voice: tag("voice"),
    loadout,
    authoredExceptions: array(oneOf("stat-budget", "starting-loadout"))
  }),
  dialogues: record({
    actor: ref("actors"),
    voice: tag("voice"),
    priority: oneOf("immediate", "situation", "history", "relationship", "service", "neutral"),
    requires: array(tag("state")),
    forbids: array(tag("state")),
    knowledge,
    text: ref("texts"),
    once: boolean,
    pool: text
  }),
  records: record({
    family: oneOf("guild", "town", "discovery", "actor", "life"),
    subject: ref(),
    creditMeaningful: boolean,
    creditedActor: optional(ref("actors")),
    day: positive,
    visibility: oneOf("personal", "institutional", "public"),
    knowledge,
    text: ref("texts")
  }),
  tables: record({ kind: oneOf("exclusive"), entries: array(weightedEntry, 1) }),
  probabilities: record({ kind: oneOf("independent"), subject: ref(), chance: percentage })
});
var candidateSchema = record({
  age: { type: "integer", min: 18, max: 30 },
  stats,
  hearts: oneOf(3),
  traits: refs("traits"),
  loadout
});

// HearthVale_Content/validation.js
var ContentValidationError = class extends Error {
  constructor(errors) {
    super(`Invalid HearthVale data:
${errors.map((e2) => `${e2.path}: ${e2.message}`).join("\n")}`);
    this.name = "ContentValidationError";
    this.errors = errors;
  }
};
var plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
var stableId = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(v) && !["constructor", "prototype", "__proto__"].includes(v);
function context(catalog2, resolvers) {
  const errors = [], index = /* @__PURE__ */ new Map(), ids = /* @__PURE__ */ new Set(), references = [];
  const error = (path, message2) => errors.push({ path, message: message2 });
  function register(id2, path, group, value) {
    if (!stableId(id2)) {
      error(path, "invalid stable ID");
      return;
    }
    if (ids.has(id2)) error(path, `duplicate ID ${id2}`);
    ids.add(id2);
    if (group && !index.has(id2)) index.set(id2, { group, value });
  }
  function walk(value, rule, path) {
    if (value === void 0 && rule.optional) return;
    switch (rule.type) {
      case "string":
        if (typeof value !== "string" || !value.trim()) error(path, "expected nonempty text");
        break;
      case "boolean":
        if (typeof value !== "boolean") error(path, "expected boolean");
        break;
      case "number":
      case "integer":
        if (!Number.isFinite(value) || rule.type === "integer" && !Number.isSafeInteger(value) || value < (rule.min ?? -Infinity) || value > (rule.max ?? Infinity)) error(path, "invalid numeric value");
        break;
      case "enum":
        if (!rule.values.includes(value)) error(path, `expected one of ${rule.values.join(", ")}`);
        break;
      case "ref":
        references.push({ value, rule, path });
        break;
      case "resolver":
        if (!stableId(value) || !Object.hasOwn(resolvers, value) || typeof resolvers[value] !== "function")
          error(path, `missing callable resolver ${String(value)}`);
        break;
      case "array":
        if (!Array.isArray(value)) {
          error(path, "expected array");
          break;
        }
        if (value.length < rule.min) error(path, `requires at least ${rule.min} entries`);
        for (let i = 0; i < value.length; i++) walk(value[i], rule.items, `${path}[${i}]`);
        break;
      case "object":
        if (!plain(value)) {
          error(path, "expected plain object");
          break;
        }
        for (const key of Object.keys(value)) if (!Object.hasOwn(rule.fields, key)) error(`${path}.${key}`, "unknown field");
        for (const [key, field] of Object.entries(rule.fields)) walk(value[key], field, `${path}.${key}`);
        break;
    }
  }
  function resolveReferences() {
    for (const { value, rule, path } of references) {
      const found = index.get(value);
      if (!stableId(value) || !found) error(path, `missing reference ${String(value)}`);
      else if (rule.group !== "*" && found.group !== rule.group) error(path, `reference must target ${rule.group}`);
      else if (rule.domain && found.value.domain !== rule.domain) error(path, `tag must belong to ${rule.domain}`);
    }
  }
  if (!plain(catalog2)) {
    error("catalog", "expected plain object");
    return { errors };
  }
  if (!plain(resolvers)) {
    error("resolvers", "expected callable registry");
    return { errors };
  }
  for (const key of Object.keys(catalog2)) if (key !== "schemaVersion" && !Object.hasOwn(schemas, key)) error(key, "unknown catalog");
  if (catalog2.schemaVersion !== 1) error("schemaVersion", "unsupported content schema version");
  for (const [group, schema] of Object.entries(schemas)) {
    const values = catalog2[group];
    if (values === void 0 && ["recipes", "vendors"].includes(group)) continue;
    if (!Array.isArray(values)) {
      error(group, "expected catalog array");
      continue;
    }
    values.forEach((value, i) => {
      const path = `${group}[${i}]`;
      register(value?.id, `${path}.id`, group, value);
      walk(value, schema, path);
      for (const key of ["choices", "objectives", "paths"]) if (Array.isArray(value?.[key]))
        value[key].forEach((entry, n) => register(entry?.id, `${path}.${key}[${n}].id`, `${group}.${key}`, entry));
    });
  }
  return { errors, error, index, register, walk, resolveReferences };
}
function semantics(catalog2, ctx) {
  const { error, index } = ctx;
  const get = (id2) => index.get(id2)?.value;
  const list2 = (value) => Array.isArray(value) ? value : [];
  const unique = (values, path) => {
    if (new Set(values).size !== values.length) error(path, "duplicate references");
  };
  function traits(values, path) {
    values = list2(values);
    unique(values, path);
    if (values.length !== 2) error(path, "requires exactly 2 starting Innate Traits");
    for (const id2 of values) {
      const trait = get(id2);
      if (trait && !trait.innate) error(path, `${id2} is not an Innate Trait`);
      for (const other of list2(trait?.incompatible)) if (values.includes(other)) error(path, `incompatible Traits ${id2} and ${other}`);
    }
    if (values.includes("trait_lucky") && values.includes("trait_lucky_bastard")) error(path, "Lucky and Lucky Bastard are incompatible");
  }
  function loadout2(value, path) {
    if (!plain(value)) return;
    unique(list2(value.weapons), `${path}.weapons`);
    unique(list2(value.armor), `${path}.armor`);
    unique(list2(value.spells), `${path}.spells`);
    if (list2(value.spells).length > 4) error(`${path}.spells`, "at most 4 spells");
    for (const id2 of list2(value.weapons)) if (get(id2) && get(id2).category !== "weapon") error(`${path}.weapons`, "requires weapons");
    for (const id2 of list2(value.armor)) if (get(id2) && get(id2).category !== "armor") error(`${path}.armor`, "requires armor");
  }
  function weighted2(table, path, group) {
    const entries = list2(table?.entries);
    if (!entries.length) return;
    const total = entries.reduce((sum, e2) => sum + (e2?.weight ?? NaN), 0);
    if (!Number.isFinite(total) || Math.abs(total - 100) > Number.EPSILON * 100 * entries.length)
      error(path, `exclusive weights must total 100%, got ${total}`);
    unique(entries.map((e2) => e2?.target), path);
    for (const entry of entries) if (group && index.get(entry?.target)?.group !== group) error(path, `selection requires ${group}`);
  }
  for (const group of Object.keys(schemas)) list2(catalog2[group]).forEach((v, i) => {
    if (!plain(v)) return;
    const path = `${group}[${i}]`;
    if (group === "recipes") {
      for (const ingredient of list2(v.materials)) if (get(ingredient.item)?.category !== "material") error(path, "recipe ingredients must be materials");
      if (v.service === "shop" && get(v.output)?.category !== "consumable") error(path, "shop recipes require consumable outputs");
    }
    if (group === "vendors") {
      unique(list2(v.stock).map((s) => s.item), path);
      for (const stock of list2(v.stock)) if (stock.floor > stock.target) error(path, "protected floor exceeds stock target");
    }
    if (group === "events") {
      for (const choice of list2(v.choices)) if (!choice.resolver) {
        const allowed = ["effect_sanity", "effect_treasure", "effect_item", "effect_arrows", "effect_gold", "effect_combat", "effect_rumor", "effect_observation", "effect_social"];
        for (const effect2 of [...list2(choice.effects), ...list2(choice.failure)]) {
          if (!allowed.includes(effect2.tag)) error(path, "unsupported declarative Event consequence");
          if (effect2.tag === "effect_item" && index.get(effect2.target)?.group !== "items") error(path, "item consequence requires an item");
          if (effect2.tag === "effect_combat" && index.get(effect2.target)?.group !== "enemies") error(path, "combat consequence requires an enemy");
        }
      }
    }
    if (group === "traits") {
      if (v.id === "trait_hardy") {
        const hardyEffects = list2(v.effects);
        const expected = ["effect_max_hp", "effect_con_physical_resilience_check"];
        if (hardyEffects.length !== 2 || expected.some((tag2) => hardyEffects.filter((e2) => e2?.tag === tag2 && e2.value === 2 && e2.target === void 0).length !== 1))
          error(`${path}.effects`, "Hardy requires +2 direct Max HP and +2 physical-resilience CON checks only; no general CON modifier");
      }
      unique(list2(v.incompatible), `${path}.incompatible`);
      if (list2(v.incompatible).includes(v.id)) error(path, "Trait cannot be incompatible with itself");
      if (v.id === "trait_lucky_bastard" && v.perDrawChance !== 1) error(path, "Lucky Bastard requires 1% per draw");
    }
    if (group === "items") {
      const requireFields = (fields) => fields.forEach((f) => {
        if (v[f] === void 0) error(`${path}.${f}`, `required for ${v.category}`);
      });
      if (v.price === void 0 && v.sellValue === void 0 && !["scroll", "tome"].includes(v.category)) error(path, "requires price or direct sell value");
      if (v.category === "weapon") {
        requireFields(["tier", "damage", "defense", "impact", "accuracy", "canDefend", "speed", "qualityStat"]);
        if (v.ammo) {
          if (v.maxDurability !== void 0 || v.wear !== void 0) error(path, "ammunition weapons do not use DUR in the VS");
        } else requireFields(["maxDurability", "wear"]);
      }
      if (v.category === "shield") requireFields(["defense", "maxDurability", "canDefend", "wear"]);
      if (v.category === "armor") requireFields(["defense", "armorSlot"]);
      if (["scroll", "tome"].includes(v.category)) requireFields(["spell"]);
      if (["consumable", "scroll"].includes(v.category)) requireFields(["freeAction", "wastefulEligible"]);
      if (v.category === "consumable" && !list2(v.effects).length) error(path, "consumable requires effect");
      if (v.ammo && get(v.ammo)?.category !== "ammo") error(path, "ammo reference must target ammunition");
      if (v.id === "item_bow" && (v.canDefend !== false || !v.ammo || v.maxDurability !== void 0 || v.wear !== void 0)) error(path, "Bow requires ammunition, no DUR, and cannot defend");
    }
    if (group === "spells") {
      if (!list2(v.effects).length) error(path, "spell requires effect");
      if (v.explorationOnly && v.startingEligible) error(path, "exploration spells cannot be starting spells");
    }
    if (group === "moves" && v.speed !== void 0) {
      const offensive2 = v.damage > 0 || v.impact > 0 || list2(v.onHit).length > 0;
      if (offensive2 && !["STR", "DEX"].includes(v.qualityStat)) error(path, "offensive move requires STR or DEX quality stat");
      if (!offensive2 && (v.speed !== 0 || v.qualityStat !== void 0)) error(path, "nonoffensive move requires Speed 0 and no quality stat");
    }
    if (group === "enemies") {
      weighted2(v.moves, `${path}.moves`, "moves");
      for (const entry of list2(v.moves?.entries)) {
        const move2 = get(entry?.target);
        if (move2?.speed === void 0) error(path, "combat moves require authored Speed");
        if (move2 && !(move2.damage > 0 || move2.impact > 0 || list2(move2.onHit).length)) error(path, "unified combat pool requires offensive moves");
      }
      for (const harvest of list2(v.harvest)) if (get(harvest?.item)?.category !== "material") error(`${path}.harvest`, "harvest must target material");
    }
    if (group === "actors") {
      traits(v.traits, `${path}.traits`);
      loadout2(v.loadout, `${path}.loadout`);
    }
    if (group === "dialogues") {
      for (const id2 of list2(v.requires)) if (list2(v.forbids).includes(id2)) error(path, "required and forbidden state tags overlap");
      if (get(v.actor)?.voice !== v.voice) error(path, "dialogue voice does not match Actor");
      if (["immediate", "situation", "history"].includes(v.priority) && !list2(v.knowledge).length) error(path, "factual reactions require explicit knowledge guards");
    }
    if (group === "records" && v.creditMeaningful && !v.creditedActor) error(path, "meaningful credit requires an explicit Actor reference");
    if (group === "situations" && v.removesServiceActor && !v.serviceConsequence) error(path, "authored service removal requires explicit consequence/fallback");
    if (group === "locations" && v.playable && v.stratum > 1) error(path, "V1 cannot enter playable Stratum 2+");
    if (group === "tables") weighted2(v, path);
  });
  return { traits, loadout: loadout2 };
}
function validateCatalog(catalog2, { resolvers = {} } = {}) {
  const ctx = context(catalog2, resolvers);
  if (ctx.index) {
    semantics(catalog2, ctx);
    ctx.resolveReferences();
  }
  if (ctx.errors.length) throw new ContentValidationError(ctx.errors);
  return catalog2;
}
function validateCandidate(candidate, catalog2, options = {}) {
  validateCatalog(catalog2, options);
  const ctx = context(catalog2, options.resolvers ?? {});
  const helpers = semantics(catalog2, ctx);
  ctx.walk(candidate, candidateSchema, "candidate");
  ctx.register(candidate?.id, "candidate.id", "candidates", candidate);
  if (plain(candidate)) {
    helpers.traits(candidate.traits, "candidate.traits");
    helpers.loadout(candidate.loadout, "candidate.loadout");
    const values = STATS.map((key) => candidate.stats?.[key]);
    if (values.reduce((sum, v) => sum + v, 0) !== 12) ctx.error("candidate.stats", "generated stats must total exactly 12");
    if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 4)) ctx.error("candidate.stats", "generated stats must each be 1\u20134");
    if (values.filter((v) => v === 4).length > 1) ctx.error("candidate.stats", "at most one generated stat may start at 4");
    const loadout2 = candidate.loadout;
    if (plain(loadout2)) {
      const weapons = Array.isArray(loadout2.weapons) ? loadout2.weapons : [];
      const ordinaryStarter = weapons.length === 2 && new Set(weapons).size === 2;
      const magicStarter = weapons.length === 1 && weapons[0] === "item_bow" && Array.isArray(loadout2.spells) && loadout2.spells.length === 1 && loadout2.spells[0] === "spell_fireball";
      if (!ordinaryStarter && !magicStarter) ctx.error("candidate.loadout.weapons", "requires exactly 2 different Tier-1 weapons, or Bow-only with learned Fireball");
      if (weapons.some((id2) => !["item_sword", "item_hammer", "item_bow"].includes(id2) || ctx.index.get(id2)?.value.tier !== 1))
        ctx.error("candidate.loadout.weapons", "starting weapons must be Tier-1 Sword, Hammer or Bow");
      if (loadout2.arrows !== (weapons.includes("item_bow") ? 10 : 0)) ctx.error("candidate.loadout.arrows", "Bow requires 10 Arrows; no Bow requires 0");
      if (JSON.stringify(loadout2.armor) !== JSON.stringify(["item_chest_armor"])) ctx.error("candidate.loadout.armor", "requires 1 Chest Armor");
      if (!Array.isArray(loadout2.items) || loadout2.items.length !== 1 || loadout2.items[0]?.item !== "item_hp_potion_basic" || loadout2.items[0]?.quantity !== 1)
        ctx.error("candidate.loadout.items", "requires 1 Basic HP Potion");
      if (loadout2.gold !== 45) ctx.error("candidate.loadout.gold", "requires 45 Gold");
      if (!Array.isArray(loadout2.spells) || loadout2.spells.length > 1 || loadout2.spells.some((id2) => !ctx.index.get(id2)?.value.startingEligible))
        ctx.error("candidate.loadout.spells", "requires zero or one starting-eligible spell");
    }
  }
  ctx.resolveReferences();
  if (ctx.errors.length) throw new ContentValidationError(ctx.errors);
  return candidate;
}

// HearthVale_Content/surface.js
var deepFreeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
var candidateNames = Object.freeze(["Alden", "Ansel", "Arden", "Bram", "Cael", "Corin", "Dain", "Doran", "Elias", "Finn", "Hale", "Iven", "Joren", "Kael", "Lucan", "Marek", "Nolan", "Orin", "Perrin", "Rowan", "Soren", "Toren", "Varric", "Wren", "Alia", "Anya", "Cira", "Elara", "Faye", "Hana", "Ilya", "Jessa", "Kaia", "Mara", "Nessa", "Rhea", "Sela", "Talia", "Vera", "Yara", "Avery", "Emery", "Remy", "Ren", "Sasha", "Vale", "Quinn", "Robin"]);
var surfaceCatalog = deepFreeze(validateCatalog({
  "schemaVersion": 1,
  "tags": [
    {
      "id": "effect_heal",
      "label": "effect_heal",
      "domain": "effect"
    },
    {
      "id": "effect_damage",
      "label": "effect_damage",
      "domain": "effect"
    },
    {
      "id": "effect_impact",
      "label": "effect_impact",
      "domain": "effect"
    },
    {
      "id": "effect_defense",
      "label": "effect_defense",
      "domain": "effect"
    },
    {
      "id": "effect_max_hp",
      "label": "effect_max_hp",
      "domain": "effect"
    },
    {
      "id": "effect_con_physical_resilience_check",
      "label": "effect_con_physical_resilience_check",
      "domain": "effect"
    },
    {
      "id": "voice_auron",
      "label": "voice_auron",
      "domain": "voice"
    },
    {
      "id": "voice_rook",
      "label": "voice_rook",
      "domain": "voice"
    },
    {
      "id": "voice_mira",
      "label": "voice_mira",
      "domain": "voice"
    },
    {
      "id": "voice_tavi",
      "label": "voice_tavi",
      "domain": "voice"
    },
    {
      "id": "voice_lina",
      "label": "voice_lina",
      "domain": "voice"
    },
    {
      "id": "voice_garrick",
      "label": "voice_garrick",
      "domain": "voice"
    }
  ],
  "texts": [],
  "traits": [
    {
      "id": "trait_hardy",
      "label": "Hardy",
      "innate": true,
      "incompatible": [],
      "effects": [
        {
          "tag": "effect_max_hp",
          "value": 2
        },
        {
          "tag": "effect_con_physical_resilience_check",
          "value": 2
        }
      ],
      "probabilities": []
    },
    {
      "id": "trait_frail",
      "label": "Frail",
      "innate": true,
      "incompatible": [],
      "effects": [
        {
          "tag": "effect_max_hp",
          "value": -2
        },
        {
          "tag": "effect_con_physical_resilience_check",
          "value": -2
        }
      ],
      "probabilities": []
    },
    {
      "id": "trait_quick",
      "label": "Quick",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_strong_willed",
      "label": "Strong-Willed",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_charming",
      "label": "Charming",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_off_putting",
      "label": "Off-Putting",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_lucky",
      "label": "Lucky",
      "innate": true,
      "incompatible": [
        "trait_lucky_bastard"
      ],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_unlucky",
      "label": "Unlucky",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_fast_learner",
      "label": "Fast Learner",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_slow_learner",
      "label": "Slow Learner",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_sturdy_hands",
      "label": "Sturdy Hands",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_heavy_handed",
      "label": "Heavy-Handed",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_frugal",
      "label": "Frugal",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_wasteful",
      "label": "Wasteful",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_careful",
      "label": "Careful",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_reckless",
      "label": "Reckless",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_fearless",
      "label": "Fearless",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_cowardly",
      "label": "Cowardly",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_tough_stomach",
      "label": "Tough Stomach",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_pyrophobic",
      "label": "Pyrophobic",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_greedy",
      "label": "Greedy",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_curious",
      "label": "Curious",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_lucky_bastard",
      "label": "Lucky Bastard",
      "innate": true,
      "incompatible": [
        "trait_lucky"
      ],
      "effects": [],
      "probabilities": [],
      "perDrawChance": 1
    }
  ],
  "items": [
    {
      "id": "item_sword",
      "speed": 0,
      "qualityStat": "STR",
      "label": "Sword",
      "category": "weapon",
      "price": 30,
      "damage": 3,
      "defense": 1,
      "maxDurability": 12,
      "impact": 1,
      "accuracy": "STR",
      "tier": 1,
      "stackable": false,
      "canDefend": true,
      "wear": "successful-hit",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_hammer",
      "speed": -1,
      "qualityStat": "STR",
      "label": "Hammer",
      "category": "weapon",
      "price": 40,
      "damage": 4,
      "defense": 0,
      "maxDurability": 10,
      "impact": 2,
      "accuracy": "STR",
      "tier": 1,
      "stackable": false,
      "canDefend": true,
      "wear": "successful-hit",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_bow",
      "speed": 1,
      "qualityStat": "DEX",
      "label": "Bow",
      "category": "weapon",
      "price": 35,
      "damage": 3,
      "defense": 0,
      "impact": 0,
      "accuracy": "DEX",
      "tier": 1,
      "stackable": false,
      "canDefend": false,
      "ammo": "item_arrows",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_chest_armor",
      "label": "Chest Armor",
      "category": "armor",
      "price": 75,
      "stackable": false,
      "defense": 2,
      "armorSlot": "chest",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_shield",
      "label": "Shield",
      "category": "shield",
      "price": 50,
      "stackable": false,
      "defense": 3,
      "maxDurability": 15,
      "canDefend": true,
      "wear": "connected-defense",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_hp_potion_basic",
      "label": "Basic HP Potion",
      "category": "consumable",
      "price": 10,
      "stackable": true,
      "freeAction": true,
      "wastefulEligible": true,
      "effects": [
        {
          "tag": "effect_heal",
          "value": 8
        }
      ],
      "contexts": [
        "surface",
        "exploration",
        "combat"
      ]
    },
    {
      "id": "item_arrows",
      "label": "Arrows",
      "category": "ammo",
      "price": 1,
      "stackable": true,
      "effects": [],
      "contexts": [
        "combat"
      ]
    }
  ],
  "spells": [
    {
      "id": "spell_fireball",
      "label": "Fireball",
      "cost": 4,
      "target": "enemy",
      "accuracy": "INT",
      "effects": [
        {
          "tag": "effect_damage",
          "value": 5
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_force",
      "label": "Force",
      "cost": 3,
      "target": "enemy",
      "accuracy": "INT",
      "effects": [
        {
          "tag": "effect_impact",
          "value": 3
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_heal",
      "label": "Heal",
      "cost": 4,
      "target": "self",
      "effects": [
        {
          "tag": "effect_heal",
          "value": 8
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_barrier",
      "label": "Barrier",
      "cost": 3,
      "target": "self",
      "effects": [
        {
          "tag": "effect_defense",
          "value": 3
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    }
  ],
  "moves": [],
  "enemies": [],
  "hazards": [],
  "events": [],
  "situations": [],
  "locations": [
    {
      "id": "loc_inn",
      "label": "Inn",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_mira",
      "playable": true
    },
    {
      "id": "loc_shop",
      "label": "General Shop / Apothecary",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_tavi",
      "playable": true
    },
    {
      "id": "loc_guild",
      "label": "Adventurers\u2019 Guild",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_lina",
      "playable": true
    },
    {
      "id": "loc_town_hall",
      "label": "Town Hall",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_garrick",
      "playable": true
    },
    {
      "id": "loc_pit_entrance",
      "label": "Pit Entrance",
      "kind": "pit",
      "stratum": 1,
      "playable": true
    }
  ],
  "actors": [
    {
      "id": "actor_auron",
      "label": "Auron",
      "role": "Protect newer adventurers",
      "goal": "Protect newer adventurers",
      "stats": {
        "STR": 4,
        "DEX": 2,
        "CON": 3,
        "INT": 1,
        "WIS": 3,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_hardy",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_auron",
      "authoredExceptions": [
        "stat-budget",
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [
          "item_sword",
          "item_hammer"
        ],
        "armor": [
          "item_chest_armor"
        ],
        "items": [
          {
            "item": "item_shield",
            "quantity": 1
          },
          {
            "item": "item_hp_potion_basic",
            "quantity": 2
          }
        ],
        "arrows": 0,
        "gold": 60,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_rook",
      "label": "Rook",
      "role": "Make money through the Pit",
      "goal": "Make money through the Pit",
      "stats": {
        "STR": 2,
        "DEX": 4,
        "CON": 2,
        "INT": 1,
        "WIS": 1,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_quick",
        "trait_greedy"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_rook",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [
          "item_sword",
          "item_bow"
        ],
        "armor": [
          "item_chest_armor"
        ],
        "items": [
          {
            "item": "item_hp_potion_basic",
            "quantity": 1
          }
        ],
        "arrows": 15,
        "gold": 45,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_mira",
      "label": "Mira",
      "role": "Keep the Inn going",
      "goal": "Keep the Inn going",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 2,
        "WIS": 3,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_hardy",
        "trait_charming"
      ],
      "controller": "Autonomous",
      "location": "loc_inn",
      "voice": "voice_mira",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_tavi",
      "label": "Tavi",
      "role": "Understand what comes out of the Pit",
      "goal": "Understand what comes out of the Pit",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 3,
        "WIS": 2,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_curious",
        "trait_fast_learner"
      ],
      "controller": "Autonomous",
      "location": "loc_shop",
      "voice": "voice_tavi",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_lina",
      "label": "Lina",
      "role": "Keep Guild work moving",
      "goal": "Keep Guild work moving",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 2,
        "WIS": 2,
        "CHA": 3
      },
      "hearts": 3,
      "traits": [
        "trait_charming",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_lina",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_garrick",
      "label": "Garrick",
      "role": "Grow HearthVale",
      "goal": "Grow HearthVale",
      "stats": {
        "STR": 1,
        "DEX": 1,
        "CON": 2,
        "INT": 2,
        "WIS": 3,
        "CHA": 3
      },
      "hearts": 3,
      "traits": [
        "trait_greedy",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_town_hall",
      "voice": "voice_garrick",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    }
  ],
  "dialogues": [],
  "records": [],
  "tables": [],
  "probabilities": []
}));

// HearthVale_Shell/src/actors.js
var baselineResources = Object.freeze({ ap: 4, maxAp: 4, sanity: 5, maxSanity: 5 });
function deriveConstitutionValues(effectiveCon, effects2 = []) {
  if (!Number.isSafeInteger(effectiveCon) || effectiveCon < 1) throw new Error("Invalid effective CON");
  const directHp = effects2.filter((effect2) => effect2.tag === "effect_max_hp").reduce((sum, effect2) => sum + effect2.value, 0);
  return { effectiveCon, maxHp: 10 + 2 * effectiveCon + directHp, naturalArmor: Math.floor(effectiveCon / 2) };
}
function constitutionCheckBonus(effects2 = [], { physicalResilience = false } = {}) {
  return physicalResilience ? effects2.filter((effect2) => effect2.tag === "effect_con_physical_resilience_check").reduce((sum, effect2) => sum + effect2.value, 0) : 0;
}
function createActor({ id: id2, name, controller, baseStats, traits, mainGoal, resources: resources3 = baselineResources, decisionWeights = { goal: 0, help: 0, idle: 1 } }, location) {
  if (typeof name !== "string" || !name.trim()) throw new Error("Actor identity requires a name");
  if (!["Human", "Autonomous"].includes(controller)) throw new Error("Invalid HearthVale controller");
  if (typeof mainGoal !== "string" || !mainGoal.trim()) throw new Error("Actor requires exactly one Main Goal");
  if (!baseStats || typeof baseStats !== "object" || Array.isArray(baseStats) || !Object.values(baseStats).every(Number.isFinite)) throw new Error("Actor base stats must be finite numeric values");
  if (!Array.isArray(traits) || !traits.every((t) => typeof t === "string" && t.trim())) throw new Error("Actor traits must be names");
  if (!resources3 || !["ap", "maxAp", "sanity", "maxSanity"].every((key) => Number.isFinite(resources3[key]) && resources3[key] >= 0) || resources3.ap > resources3.maxAp || resources3.sanity > resources3.maxSanity) throw new Error("Invalid Actor resources");
  if (!["goal", "help", "idle"].every((key) => Number.isFinite(decisionWeights?.[key]) && decisionWeights[key] >= 0) || !Number.isFinite(decisionWeights.goal + decisionWeights.help + decisionWeights.idle)) throw new Error("Invalid decision weights");
  if (["hearthvale.help-desire", "hearthvale.idle-desire"].includes(mainGoal)) throw new Error("Main Goal uses a reserved desire ID");
  return {
    id: id2,
    type: "hearthvale.actor",
    lifecycle: "active",
    primaryLocation: location,
    actor: { controller },
    data: {
      persistence: "living",
      identity: { name },
      mainGoal,
      attributes: structuredClone({ baseStats, traits, resources: resources3 }),
      decisionWeights: structuredClone(decisionWeights)
    }
  };
}

// HearthVale_Shell/src/surface-candidates.js
var pick = (pool, rng) => pool[Math.floor(rng.next() * pool.length)];
function generateCandidates(rng, firstInstance = 7, usedNames = []) {
  const names = candidateNames.filter((name) => !usedNames.includes(name));
  return Array.from({ length: 3 }, (_, index) => {
    const stats2 = Object.fromEntries(STATS.map((stat2) => [stat2, 1]));
    for (let point = 0; point < 6; point++) {
      const eligible = STATS.filter((stat2) => stats2[stat2] < 3 || stats2[stat2] === 3 && !Object.values(stats2).includes(4));
      stats2[pick(eligible, rng)]++;
    }
    const traits = [];
    for (let draw = 0; draw < 2; draw++) {
      const eligible = surfaceCatalog.traits.filter((trait) => !traits.includes(trait.id) && !trait.incompatible.some((id2) => traits.includes(id2)));
      const rare = eligible.find((trait) => trait.id === "trait_lucky_bastard");
      traits.push(rare && rng.next() < rare.perDrawChance / 100 ? rare.id : pick(eligible.filter((trait) => trait.id !== "trait_lucky_bastard"), rng).id);
    }
    const weapons = ["item_sword", "item_hammer", "item_bow"];
    weapons.splice(Math.floor(rng.next() * weapons.length), 1);
    const label2 = pick(names, rng);
    names.splice(names.indexOf(label2), 1);
    const candidate = {
      id: `hv_actor_${firstInstance + index}`,
      label: label2,
      age: 18 + Math.floor(rng.next() * 13),
      hearts: 3,
      stats: stats2,
      traits,
      loadout: {
        weapons,
        armor: ["item_chest_armor"],
        items: [{ item: "item_hp_potion_basic", quantity: 1 }],
        arrows: weapons.includes("item_bow") ? 10 : 0,
        gold: 45,
        spells: rng.next() < 0.3 ? [pick(surfaceCatalog.spells.filter((spell) => spell.startingEligible), rng).id] : [],
        spellSlots: 4
      }
    };
    return validateCandidate(candidate, surfaceCatalog);
  });
}
function derivedActorValues(actor) {
  const { baseStats, traits } = actor.data.attributes;
  const values = deriveConstitutionValues(baseStats.CON, traits.flatMap((id2) => surfaceCatalog.traits.find((t) => t.id === id2).effects));
  return { ...values, maxHp: values.maxHp + (actor.data.expeditionHp ?? 0) };
}
function generateNewGameCandidates(rng, firstInstance = 7, usedNames = []) {
  const candidates = generateCandidates(rng, firstInstance, usedNames);
  const magicIndex = candidates.reduce((sum, candidate) => sum + candidate.age, 0) % candidates.length;
  for (const [index, candidate] of candidates.entries()) {
    candidate.loadout.spells = index === magicIndex ? ["spell_fireball"] : [];
    if (index === magicIndex) {
      candidate.loadout.weapons = ["item_bow"];
      candidate.loadout.arrows = 10;
    }
    validateCandidate(candidate, surfaceCatalog);
  }
  return candidates;
}
function instantiateSurfaceActor(profile, { id: id2 = profile.id, controller = "Autonomous", location = "loc_inn" } = {}) {
  const actor = createActor({
    id: id2,
    name: profile.label,
    controller,
    baseStats: profile.stats,
    traits: profile.traits,
    mainGoal: profile.goal ?? "Find a place in HearthVale"
  }, location);
  actor.data.identity = { name: profile.label, ...profile.age === void 0 ? {} : { age: profile.age } };
  if (id2 !== profile.id) actor.data.templateId = profile.id;
  const { maxHp } = derivedActorValues(actor);
  actor.data.attributes.resources = {
    ...baselineResources,
    hearts: profile.hearts,
    hp: maxHp,
    gold: profile.loadout.gold,
    arrows: profile.loadout.arrows,
    xp: 0,
    essence: 0
  };
  let sequence = 0;
  const item = (templateId, quantity = 1) => {
    const definition = surfaceCatalog.items.find((i) => i.id === templateId);
    return {
      id: `${id2}_item_${++sequence}`,
      templateId,
      quantity,
      ...definition.maxDurability ? { durability: definition.maxDurability } : {}
    };
  };
  const slots = (values, size) => [...values, ...Array(size - values.length).fill(null)];
  actor.data.inventory = {
    equipped: slots(profile.loadout.weapons.map((id3) => item(id3)), 4),
    bag: slots(profile.loadout.items.map((entry) => item(entry.item, entry.quantity)), 8),
    chest: profile.loadout.armor.length ? item(profile.loadout.armor[0]) : null,
    spells: slots(profile.loadout.spells, 4),
    nextItemInstance: sequence + 1
  };
  actor.data.scars = [];
  return actor;
}

// HearthVale_Story/surface.js
var openingCards = [
  "HEARTHVALE WAS ONCE AN ORDINARY TOWN.",
  "THEN THE PIT OPENED BENEATH IT. More than half the town disappeared into the earth.",
  "Years passed. Survivors rebuilt beside what remained. Then people began returning from below with strange materials, old valuables, and stories of things deeper still.",
  "Adventurers followed.",
  "HEARTHVALE \u2014 YEAR 1, DAY 1"
];
var miraOpening = [
  "Morning reaches the Inn before you are ready for it. Downstairs, someone is already setting bowls onto the tables.",
  "Mira: \u201CYou\u2019re awake.\u201D",
  "Mira: \u201CGood. Food\u2019s there.\u201D",
  "She glances at your gear.",
  "Mira: \u201CPit?\u201D"
];
var miraResponses = [
  { id: "heading", label: "I'm heading there.", reply: "Mm. Come back in one piece." },
  { id: "later", label: "Maybe later.", reply: "Good. It'll still be there." },
  { id: "looking", label: "Just looking around first.", reply: "Probably the smarter start." }
];
var miraClosing = [
  "Mira: \u201CIf you start seeing things down there, come back up. Talk to somebody \u2014 me, or the people at the Guild. An ordinary conversation can help you feel grounded.\u201D",
  "SANITY \u2014 Talking with people helps you recover. Your first ordinary conversation each day restores 1 Sanity if you are below maximum. Sleeping restores HP, but does not restore Sanity.",
  "Mira: \u201CShop\u2019s nearby. Guild\u2019s down the road. Town Hall\u2019s impossible to miss.\u201D",
  "Mira: \u201CWhen you\u2019re done for the Day, come back here and get some sleep.\u201D"
];
var locationDescriptions = {
  loc_inn: "Morning light falls across the tables. Bowls are stacked beside the hearth.",
  loc_shop: "Bottles and everyday supplies line the shelves. Tavi watches from the counter.",
  loc_guild: "Adventurers gather by the doorway. Lina keeps the room in order.",
  loc_town_hall: "The town\u2019s business gathers here. Garrick looks up from his desk.",
  loc_pit_entrance: "The town ends at the edge of the opening. A cool draft rises from below."
};
var traitDescriptions = Object.freeze({
  "trait_hardy": "+2 Max HP; +2 CON on physical-resilience/endurance checks.",
  "trait_frail": "\u22122 Max HP; \u22122 physical-resilience CON.",
  "trait_quick": "+2 escape/reactive DEX checks. Combat Dodge uses DEX and attack Speed; Quick adds no combat bonus.",
  "trait_strong_willed": "+2 WIS against Fear, coercion, Sanity pressure and mental effects.",
  "trait_charming": "+2 CHA for warmth, trust, cooperation and positive first impressions.",
  "trait_off_putting": "\u22122 CHA for warmth/cooperation; +2 for intimidation or deterrence.",
  "trait_lucky": "Advantage on ordinary luck checks; no change to combat accuracy or authored percentages.",
  "trait_unlucky": "Disadvantage on ordinary luck checks.",
  "trait_fast_learner": "One fewer training session per stat increase, minimum one.",
  "trait_slow_learner": "One additional training session per stat increase.",
  "trait_sturdy_hands": "50% chance to prevent 1 DUR loss per eligible wear event.",
  "trait_heavy_handed": "Melee +1 Impact; successful melee hits cost 1 additional DUR.",
  "trait_frugal": "10% shop purchase discount, final price rounded up.",
  "trait_wasteful": "20% chance that using a stackable consumable consumes two.",
  "trait_careful": "Favors safer approaches. Your choices remain your own.",
  "trait_reckless": "Favors risky approaches with greater rewards. Your choices remain your own.",
  "trait_fearless": "+2 WIS against Fear; inclined to confront danger.",
  "trait_cowardly": "\u22122 WIS against Fear; inclined to escape when threatened.",
  "trait_tough_stomach": "+2 CON against biological hazards; 50% chance to resist Poison.",
  "trait_pyrophobic": "\u22122 WIS against fire Fear/Sanity checks; significant fire failure also loses 1 Sanity.",
  "trait_greedy": "Drawn to opportunities for profit.",
  "trait_curious": "Drawn to mysteries and discoveries.",
  "trait_lucky_bastard": "Includes Lucky; reroll first failed noncombat check per expedition, keep better; 25% extra ordinary treasure chance."
});

// HearthVale_Shell/src/surface-world.js
var surfaceState = (world) => world.globals.hearthvaleSurface;
function createSurfaceWorld() {
  return {
    entities: [
      { id: "loc_surface", type: "hearthvale.location", data: { name: "HearthVale", persistence: "permanent" } },
      ...surfaceCatalog.locations.map((place) => ({
        id: place.id,
        type: "hearthvale.location",
        data: { name: place.label, persistence: "permanent" }
      })),
      ...surfaceCatalog.actors.map((profile, index) => instantiateSurfaceActor(
        profile,
        { id: `hv_actor_${index + 1}`, location: profile.location }
      )),
      { id: "hv_pit_1", type: "hearthvale.pit", primaryLocation: "loc_pit_entrance", data: {
        persistence: "permanent",
        strata: [
          {
            number: 1,
            exists: true,
            proceduralFloors: [1, 9],
            guardian: { templateId: "enemy_ruin_brute", floor: 10, alive: true },
            sunkenSquareDiscovered: false
          },
          { number: 2, locked: true, playable: false }
        ]
      } }
    ],
    globals: { hearthvaleSurface: {
      save_schema_version: 1,
      initialized: false,
      calendar: { year: 1, day: 1, week: 1 },
      stage: "history",
      openingCard: 0,
      candidates: [],
      playerId: null,
      couldHaveId: null,
      nextActorInstance: 7,
      openingComplete: false,
      miraComplete: false,
      miraResponse: null
    } }
  };
}
function openingProcess(world, rng, intent) {
  const state = surfaceState(world);
  const update = (value) => [{ type: "global", key: "hearthvaleSurface", value }];
  if (!state.initialized) return [{ type: "hearthvale.surface-created", effects: update({
    ...state,
    initialized: true,
    candidates: generateNewGameCandidates(
      rng,
      state.nextActorInstance,
      Object.values(world.entities).filter((e2) => e2.actor).map((e2) => e2.data.identity.name)
    ),
    nextActorInstance: state.nextActorInstance + 3
  }) }];
  if (!intent) return [];
  if (intent.type === "opening-next" && state.stage === "history") {
    const last = state.openingCard === openingCards.length - 1;
    return [{ type: "hearthvale.opening-progressed", effects: update({
      ...state,
      openingCard: last ? state.openingCard : state.openingCard + 1,
      stage: last ? "candidates" : "history",
      openingComplete: last
    }) }];
  }
  if (intent.type === "choose" && state.stage === "candidates") {
    const selected = state.candidates.find((candidate) => candidate.id === intent.id);
    if (!selected) throw new Error("Unknown candidate");
    const retained = state.candidates.find((candidate) => candidate.id !== selected.id);
    return [{ type: "hearthvale.player-selected", data: { player: selected.id, couldHave: retained.id }, effects: [
      { type: "create", entity: instantiateSurfaceActor(selected, { controller: "Human" }) },
      { type: "data", entity: selected.id, key: "generation", value: 1 },
      { type: "data", entity: selected.id, key: "arrived", value: structuredClone(state.calendar) },
      { type: "create", entity: instantiateSurfaceActor(retained) },
      ...update({ ...state, stage: "arrival", candidates: [], playerId: selected.id, couldHaveId: retained.id })
    ] }];
  }
  throw new Error("Opening intention is unavailable");
}

// HearthVale_Shell/src/pit.js
var ENTER_PIT = "hearthvale.enter-pit";
var ADVANCE_PIT = "hearthvale.advance-pit";
var DISCOVER_PIT = "hearthvale.recognize-pit-discovery";
var EXIT_PIT = "hearthvale.exit-pit";
var pits = (world) => Object.values(world.entities).filter((entity2) => entity2.type === "hearthvale.pit" && entity2.lifecycle === "active");
var activeExpedition = (world) => pits(world).find((pit) => pit.data.expedition?.active) ?? null;
var activeDay = (world) => (world.globals.hearthvale.progression?.phase ?? "active") === "active";
var setData = (entity2, key, value) => ({ type: "data", entity: entity2, key, value });
function reconstructPitEffects(world, pitId2) {
  const pit = world.entities[pitId2];
  if (pit?.type !== "hearthvale.pit" || pit.lifecycle !== "active") throw new Error("Active Pit required");
  if (activeExpedition(world) || pit.data.pendingReturn || !activeDay(world)) {
    throw new Error("Pit reconstruction requires a completed return and an active Day checkpoint");
  }
  const revision = pit.data.procedural.revision + 1;
  const nextId = `${pit.id}.temporary.${revision}`;
  const previous = world.entities[pit.data.procedural.current];
  const effects2 = [];
  if (previous && previous.lifecycle === "active" && previous.data.persistence === "ephemeral" && !previous.data.discovered && !previous.data.name) {
    effects2.push({ type: "retire", entity: previous.id });
  }
  effects2.push({ type: "create", entity: {
    id: nextId,
    type: "hearthvale.pit-space",
    primaryLocation: pit.id,
    data: { pit: pit.id, persistence: "ephemeral", discovered: false, revision }
  } }, setData(pit.id, "procedural", { revision, current: nextId }));
  return effects2;
}
function targetPit({ attempt, world }) {
  if (attempt.targets.length !== 1) return null;
  const pit = world.entities[attempt.targets[0]];
  return pit?.type === "hearthvale.pit" && pit.lifecycle === "active" ? pit : null;
}
function inside(context2) {
  const pit = targetPit(context2);
  const actor = context2.world.entities[context2.attempt.actor];
  const expedition = pit?.data.expedition;
  return !!pit && activeDay(context2.world) && actor.actor.controller === "Human" && expedition?.active === true && expedition.actor === actor.id && (actor.primaryLocation === pit.id || context2.world.entities[actor.primaryLocation]?.data.pit === pit.id);
}
var pitActions = {
  [ENTER_PIT]: {
    eligible: (context2) => {
      const pit = targetPit(context2);
      const actor = context2.world.entities[context2.attempt.actor];
      return !!pit && activeDay(context2.world) && !activeExpedition(context2.world) && !pit.data.pendingReturn && actor.actor.controller === "Human" && actor.primaryLocation === pit.data.entryLocation && actor.data.attributes.resources.ap >= 1 && context2.view.some((record2) => record2.claim.subject === pit.id && record2.claim.key === "pit-entrance");
    },
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const actor = world.entities[attempt.actor];
      const sequence = pit.data.expeditionSequence + 1;
      const expedition = {
        id: `${pit.id}.expedition.${sequence}`,
        active: true,
        actor: actor.id,
        returnLocation: actor.primaryLocation,
        steps: 0,
        discoveries: []
      };
      return { type: "hearthvale.pit-entered", data: { pit: pit.id, expedition: expedition.id }, effects: [
        ...pit.data.procedural.current === null ? reconstructPitEffects(world, pit.id) : [],
        setData(pit.id, "expeditionSequence", sequence),
        setData(pit.id, "expedition", expedition),
        setData(actor.id, "attributes", { ...actor.data.attributes, resources: {
          ...actor.data.attributes.resources,
          ap: actor.data.attributes.resources.ap - 1
        } }),
        { type: "move", entity: actor.id, location: pit.id }
      ] };
    }
  },
  [ADVANCE_PIT]: {
    eligible: inside,
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const expedition = { ...pit.data.expedition, steps: pit.data.expedition.steps + 1 };
      return {
        type: "hearthvale.pit-step",
        data: { pit: pit.id, expedition: expedition.id, steps: expedition.steps },
        effects: [setData(pit.id, "expedition", expedition)]
      };
    }
  },
  [DISCOVER_PIT]: {
    eligible: (context2) => {
      if (!inside(context2)) return false;
      const pit = targetPit(context2);
      return pit.data.expedition.steps >= pit.data.discoveryDefinition.afterSteps && !context2.world.entities[pit.data.discoveryDefinition.id] && context2.view.some((record2) => record2.claim.subject === pit.id && record2.claim.key === "pit-local-progress" && record2.claim.value.expedition === pit.data.expedition.id && record2.claim.value.discoveryObserved === true);
    },
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const definition = pit.data.discoveryDefinition;
      const expedition = pit.data.expedition;
      return { type: "hearthvale.pit-discovered", data: {
        pit: pit.id,
        location: definition.id,
        expedition: expedition.id,
        significance: "historical"
      }, effects: [
        { type: "create", entity: {
          id: definition.id,
          type: "hearthvale.pit-space",
          primaryLocation: pit.id,
          data: { pit: pit.id, name: definition.name, persistence: "permanent", discovered: true, recognized: true }
        } },
        // Recognized-discovery exception: shared record immediately, with no gossip/time step.
        { type: "global", key: "hearthvaleDiscoveries", value: {
          ...world.globals.hearthvaleDiscoveries ?? {},
          [definition.id]: { location: definition.id, pit: pit.id, name: definition.name }
        } },
        setData(pit.id, "expedition", { ...expedition, discoveries: [...expedition.discoveries, definition.id] }),
        { type: "move", entity: attempt.actor, location: definition.id }
      ] };
    }
  },
  [EXIT_PIT]: {
    eligible: inside,
    resolve: ({ world, attempt }) => {
      const pit = world.entities[attempt.targets[0]];
      const expedition = pit.data.expedition;
      return { type: "hearthvale.pit-exited", data: { pit: pit.id, expedition: expedition.id }, effects: [
        { type: "move", entity: attempt.actor, location: expedition.returnLocation },
        setData(pit.id, "expedition", { ...expedition, active: false }),
        setData(pit.id, "pendingReturn", { actor: attempt.actor, expedition: expedition.id })
      ] };
    }
  }
};

// HearthVale_Shell/src/progression.js
var BEGIN_DAY_END = "hearthvale.begin-day-end";
var FINISH_DAY_END = "hearthvale.finish-day-end";
var PROGRESS_GOAL = "hearthvale.progress-main-goal";
var IDLE_DAY = "hearthvale.idle-day";
var DAYS_PER_WEEK = 5;
var clock = (world) => world.globals.hearthvale;
var phase = (world) => clock(world).progression?.phase ?? "active";
var autonomousActors = (world) => Object.values(world.entities).filter((actor) => actor.actor?.controller === "Autonomous" && actor.lifecycle === "active");
function canDecideToday(world, actor) {
  return !activeExpedition(world) && actor.actor.controller === "Autonomous" && phase(world) === "closing" && (actor.data.daily?.decidedDay ?? 0) < clock(world).calendar.day;
}
function dailyEffect(world, actor, meaningful) {
  const day = clock(world).calendar.day;
  return { type: "data", entity: actor.id, key: "daily", value: {
    decidedDay: day,
    accomplishedDay: meaningful ? day : actor.data.daily?.accomplishedDay ?? null,
    accomplishments: (actor.data.daily?.accomplishments ?? 0) + (meaningful ? 1 : 0)
  } };
}
function dayCommandAllowed({ attempt, world }, expectedPhase) {
  return !activeExpedition(world) && world.entities[attempt.actor].actor.controller === "Human" && attempt.params.day === clock(world).calendar.day && phase(world) === expectedPhase;
}
var progressionActions = {
  [BEGIN_DAY_END]: {
    eligible: (context2) => dayCommandAllowed(context2, "active"),
    resolve: ({ world }) => ({ type: "hearthvale.day-closing", data: { day: clock(world).calendar.day }, effects: [
      { type: "global", key: "hearthvale", value: { ...clock(world), progression: { phase: "closing" } } }
    ] })
  },
  [FINISH_DAY_END]: {
    eligible: (context2) => dayCommandAllowed(context2, "closing") && autonomousActors(context2.world).every((actor) => actor.data.daily?.decidedDay === clock(context2.world).calendar.day),
    resolve: ({ world, attempt }) => {
      const current = clock(world);
      const day = current.calendar.day + 1;
      const week = Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
      const player2 = world.entities[attempt.actor];
      const attributes = player2.data.attributes;
      const effects2 = [
        { type: "global", key: "hearthvale", value: {
          ...current,
          calendar: { ...current.calendar, day, week },
          progression: { phase: "active" }
        } },
        { type: "data", entity: player2.id, key: "attributes", value: {
          ...attributes,
          resources: { ...attributes.resources, ap: attributes.resources.maxAp }
        } }
      ];
      if (week !== current.calendar.week) effects2.push({ type: "emit", event: {
        type: "hearthvale.week-reconciled",
        data: { week, completedDay: day - 1 },
        effects: [{
          type: "global",
          key: "hearthvaleWeekly",
          value: {
            persistence: "ephemeral",
            week,
            reconciliations: (world.globals.hearthvaleWeekly?.reconciliations ?? 0) + 1
          }
        }]
      } });
      return { type: "hearthvale.day-ended", data: { day: current.calendar.day }, effects: effects2 };
    }
  },
  [PROGRESS_GOAL]: {
    eligible: ({ world, attempt }) => canDecideToday(world, world.entities[attempt.actor]),
    resolve: ({ world, attempt }) => {
      const actor = world.entities[attempt.actor];
      return { type: "hearthvale.goal-progressed", data: { meaningful: true, day: clock(world).calendar.day, goal: actor.data.mainGoal }, effects: [
        dailyEffect(world, actor, true),
        { type: "data", entity: actor.id, key: "goalProgress", value: (actor.data.goalProgress ?? 0) + 1 }
      ] };
    }
  },
  [IDLE_DAY]: {
    eligible: ({ world, attempt }) => canDecideToday(world, world.entities[attempt.actor]),
    resolve: ({ world, attempt }) => ({
      type: "hearthvale.day-idle",
      data: { meaningful: false, day: clock(world).calendar.day },
      effects: [dailyEffect(world, world.entities[attempt.actor], false)]
    })
  }
};

// HearthVale_Content/equipment.js
function addEquipment(catalog2) {
  const item = (id2) => catalog2.items.find((x) => x.id === `item_${id2}`);
  for (const [id2, value] of [["beast_fang", 6], ["crystal_shard", 12]]) catalog2.items.push({ id: `item_${id2}`, label: id2.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), category: "material", sellValue: value, stackable: true, effects: [], contexts: [] });
  for (const [id2, label2, sellValue] of [["silver_locket", "Silver Locket", 18], ["engraved_cup", "Engraved Drinking Cup", 12], ["merchant_seal", "Merchant Seal", 15], ["porcelain_set", "Porcelain Dinner Set", 20], ["old_coin_purse", "Old Coin Purse", 10], ["jewelry_box", "Jewelry Box", 25], ["decorative_brooch", "Decorative Brooch", 14], ["town_medal", "Town Commemorative Medal", 16]])
    catalog2.items.push({ id: `item_${id2}`, label: label2, category: "valuable", sellValue, stackable: true, effects: [], contexts: [] });
  const gear = [
    ["slimeguard_shield", "Slimeguard Shield", "shield", 0, 3, 18, 0, 25],
    ["beetle_chest", "Beetle Chest", "chest_armor", 0, 3, null, 0, 35],
    ["beetle_shield", "Beetle Shield", "shield", 0, 4, 13, 0, 30],
    ["fang_sword", "Fang Sword", "sword", 4, 1, 10, 1, 30],
    ["fang_hammer", "Fang Hammer", "hammer", 5, 0, 8, 3, 35],
    ["iron_sword", "Iron Sword", "sword", 4, 2, 15, 1, 40],
    ["iron_hammer", "Iron Hammer", "hammer", 5, 0, 13, 3, 45],
    ["iron_shield", "Iron Shield", "shield", 0, 4, 18, 0, 45],
    ["iron_chest", "Iron Chest", "chest_armor", 0, 3, null, 0, 60],
    ["crystal_bow", "Crystal Bow", "bow", 4, 0, null, 0, 40]
  ];
  for (const [id2, label2, base, damage, defense, dur, impact, price2] of gear) {
    const value = { ...structuredClone(item(base)), id: `item_${id2}`, label: label2, defense, price: price2 };
    if (dur) value.maxDurability = dur;
    if (value.category === "weapon") Object.assign(value, { damage, impact, tier: 2 });
    catalog2.items.push(value);
  }
  catalog2.items.push(
    { ...structuredClone(item("hp_potion_basic")), id: "item_hp_potion_greater", label: "Greater HP Potion", price: 12, effects: [{ tag: "effect_heal", value: 16 }] },
    { ...structuredClone(item("hp_potion_basic")), id: "item_bigshroom_tonic", label: "Bigshroom Tonic", price: 20, contexts: ["exploration", "combat"], effects: [{ tag: "effect_expedition_hp", value: 8 }] }
  );
  item("antidote").price = 8;
  item("cleanse_tonic").price = 10;
  const recipes = [["slimeguard_shield", "slime_core", 2, 25], ["beetle_chest", "beetle_shell", 3, 35], ["beetle_shield", "beetle_shell", 2, 30], ["fang_sword", "beast_fang", 2, 30], ["fang_hammer", "beast_fang", 3, 35], ["antidote", "venom_gland", 1, 8, 2], ["hp_potion_greater", "moonleaf", 2, 12, 2], ["cleanse_tonic", "bitterroot", 2, 10, 2], ["bigshroom_tonic", "bigshroom", 2, 20, 2], ["iron_sword", "iron_ore", 2, 40], ["iron_hammer", "iron_ore", 3, 45], ["iron_shield", "iron_ore", 2, 45], ["iron_chest", "iron_ore", 3, 60], ["crystal_bow", "crystal_shard", 2, 40]];
  catalog2.recipes = recipes.map(([id2, material, quantity, gold, count = 1]) => ({ id: `recipe_${id2}`, label: item(id2).label, materials: [{ item: `item_${material}`, quantity }], gold, output: `item_${id2}`, quantity: count, service: count === 2 ? "shop" : "blacksmith" }));
  catalog2.vendors = [{ id: "vendor_general_shop", label: "General Shop / Apothecary", location: "loc_shop", stock: [["antidote", 4, 1], ["arrows", 40, 10], ["hp_potion_basic", 8, 2], ["sword", 4, 0], ["bow", 3, 0], ["hammer", 3, 0], ["shield", 3, 0], ["chest_armor", 2, 0]].map(([id2, target, floor]) => ({ item: `item_${id2}`, target, floor })) }];
}

// HearthVale_Content/encounters.js
var enemyWeights = [["enemy_slime", 30], ["enemy_cave_beetle", 25], ["enemy_pit_hound", 20], ["enemy_venom_spider", 15], ["enemy_frenzied_adventurer", 10]].map(([target, weight]) => ({ target, weight }));
function addEncounters(c) {
  const move2 = (id2, label2, damage, impact, dodgeDC, stability) => ({
    id: `move_${id2}`,
    label: label2,
    damage,
    impact,
    dodgeDC,
    stability,
    onHit: [],
    speed: { hound_bite: 1, hound_maul: -1, hound_pounce: 1, reckless_swing: -1, brute_heavy: -1 }[id2] ?? 0,
    qualityStat: ["hound_pounce", "rock_throw"].includes(id2) ? "DEX" : "STR"
  });
  c.moves.push(move2("hound_bite", "Hound Bite", 4, 1, 14, 1), move2("hound_maul", "Hound Maul", 5, 2, 11, 2), move2("hound_pounce", "Pounce", 3, 1, 14, 1), move2("wild_slash", "Wild Slash", 4, 1, 11, 2), move2("reckless_swing", "Reckless Swing", 5, 2, 8, 2), move2("rock_throw", "Rock Throw", 3, 1, 11, 1), move2("brute_swing", "Basic Swing", 5, 2, 11, 2), move2("brute_heavy", "Heavy Swing \u2014 a raised, crushing blow", 7, 4, 8, 3));
  const selection3 = (entries) => ({ kind: "exclusive", entries: entries.map(([id2, weight]) => ({ target: `move_${id2}`, weight })) });
  c.enemies.push(...[
    ["pit_hound", "Pit Hound", 8, 0, 14, 4, [{ item: "item_beast_fang", chance: 45, quantity: 1 }], [["hound_bite", 50], ["hound_maul", 30], ["hound_pounce", 20]], false],
    ["frenzied_adventurer", "Frenzied Adventurer", 12, 1, 11, 6, [], [["wild_slash", 50], ["reckless_swing", 25], ["rock_throw", 25]], false],
    ["ruin_brute", "Ruin Brute", 24, 2, 8, 20, [], [["brute_swing", 70], ["brute_heavy", 30]], true]
  ].map(([id2, label2, hp, defense, attackDC, xp, harvest, moves, guardian]) => ({
    id: `enemy_${id2}`,
    label: label2,
    hp,
    defense,
    attackDC,
    xp,
    harvest,
    moves: selection3(moves),
    guardian,
    combatStats: { pit_hound: { STR: 3, DEX: 4 }, frenzied_adventurer: { STR: 3, DEX: 2 }, ruin_brute: { STR: 4, DEX: 1 } }[id2]
  })));
  const specs = [
    ["blocked_passage", "Blocked Passage", "STR", 11, null, null, 2, ["item_hammer", "item_fang_hammer", "item_iron_hammer", "spell_force"]],
    ["flooded_cellar", "Flooded Cellar", "CON", 11, "WIS", 14, 3, []],
    ["unstable_stairwell", "Unstable Stairwell", "DEX", 11, "WIS", 11, 2, []],
    ["burning_ruin", "Burning Ruin", "DEX", 14, "CON", 14, 4, []],
    ["rotten_bridge", "Rotten Bridge / Broken Beam", "DEX", 11, "STR", 14, 3, []],
    ["trapped_chest", "Trapped Chest / Snare", "WIS", 11, null, null, 2, []],
    ["dark_passage", "Dark Passage", "WIS", 11, null, null, 2, []]
  ];
  for (const [id2, label2, stat2, dc, alt, altDC, damage, advantageFrom] of specs) {
    c.texts.push({ id: `text_${id2}`, label: label2, text: label2 === "Dark Passage" ? "The passage narrows beyond the reach of daylight." : `${label2} interrupts the old route.` });
    c.hazards.push({
      id: `hazard_${id2}`,
      label: label2,
      primary: { stat: stat2, dc },
      ...alt ? { alternate: { stat: alt, dc: altDC } } : {},
      advantageFrom,
      failure: [{ tag: "effect_damage", value: damage }],
      text: `text_${id2}`,
      ...id2 === "burning_ruin" ? { fire: true } : {},
      ...id2 === "trapped_chest" ? { triggered: { stat: "DEX", dc: 14 }, reward: true } : {}
    });
  }
  c.tables.push({ id: "table_enemy_encounters", label: "Stratum 1 encounters", kind: "exclusive", entries: enemyWeights });
  c.locations.push({ id: "loc_sunken_square", label: "Sunken Square", kind: "named", stratum: 1, playable: true });
}

// HearthVale_Content/pit-events.js
function addPitEvents(c) {
  const fx = (tag2, value = 1, target) => ({ tag: `effect_${tag2}`, value, ...target ? { target } : {} });
  const events = [
    ["family_table", "The Family Table", "Plates still surround a table set for an ordinary meal.", [
      ["search", "Search the room", null, [fx("treasure")]],
      ["recover", "Recover a personal item", null, [fx("item", 1, "item_silver_locket")]],
      ["leave", "Leave it undisturbed", null, []]
    ]],
    ["scratched_warning", "Scratched Warning", "A hurried warning is cut into a door frame. Its reliability is uncertain.", [
      ["remember", "Remember the warning", null, [fx("rumor")]],
      ["leave", "Continue without relying on it", null, []]
    ]],
    ["abandoned_camp", "Abandoned Adventurer Camp", "A cold camp holds a little abandoned equipment. Nothing here establishes who left it.", [
      ["supplies", "Gather usable supplies", null, [fx("arrows", 2)]],
      ["evidence", "Record the evidence", null, [fx("observation")]],
      ["leave", "Leave the camp", null, []]
    ]],
    ["injured_adventurer", "Injured Adventurer", "An adventurer sits against the wall, keeping weight off an injured leg.", [
      ["help", "Help them", null, [fx("social", 2)]],
      ["return", "Tell them to Return", { stat: "CHA", dc: 11, scope: "cooperation" }, [fx("social", 1)]],
      ["leave", "Leave", null, []],
      ["rob", "Rob them", { stat: "CHA", dc: 11, scope: "intimidate" }, [fx("gold", 5), fx("social", -2)], [fx("social", -1)]]
    ]],
    ["locked_bedroom", "The Locked Bedroom", "A swollen bedroom door is locked. Ordinary belongings may remain inside.", [
      ["unlock", "Unlock the door", null, [fx("treasure")]],
      ["force", "Force the door", { stat: "STR", dc: 11 }, [fx("treasure")]],
      ["leave", "Leave the door closed", null, []]
    ]],
    ["frenzied_survivor", "Frenzied Survivor", "An armed survivor turns toward you, frightened and agitated. You cannot tell why.", [
      ["talk", "Talk calmly", { stat: "CHA", dc: 11, scope: "cooperation" }, [fx("social", 1)], [fx("combat", 1, "enemy_frenzied_adventurer")]],
      ["back", "Back away", { stat: "DEX", dc: 11, scope: "escape" }, [], [fx("combat", 1, "enemy_frenzied_adventurer")]]
    ]],
    ["old_notice_board", "The Old Notice Board", "A repair notice and a market announcement curl on a weathered board.", [
      ["read", "Read the notices", null, [fx("observation")]],
      ["leave", "Continue", null, []]
    ]],
    ["still_lives", "Something Still Lives Here", "Fresh tracks cross the dust. Someone has recently tended a small fire.", [
      ["record", "Record signs of occupancy", null, [fx("observation")]],
      ["leave", "Leave the mystery unresolved", null, []]
    ]]
  ];
  for (const [id2, label2, opening, choices] of events) {
    c.texts.push({ id: `text_event_${id2}`, label: label2, text: opening });
    c.events.push({ id: `event_${id2}`, label: label2, opening: `text_event_${id2}`, outputs: [], choices: choices.map(([key, label3, check4, effects2, failure = []]) => ({ id: `choice_${id2}_${key}`, label: label3, requires: [], targets: [], ...check4 ? { check: check4 } : {}, effects: effects2, failure, text: `text_event_${id2}` })) });
  }
}

// HearthVale_Content/sanity.js
function addSanityContent(c) {
  c.tags.push({ id: "effect_sanity", label: "Sanity", domain: "effect" });
  const loss = [{ tag: "effect_sanity", value: -1 }];
  for (const [id2, label2, text2, subjective, choices] of [
    [
      "the_body",
      "The Body",
      "A familiar body lies in the dust. For an instant, its face is yours.",
      true,
      [["endure", "Face the sight", { stat: "WIS", scope: "mental", dc: 11 }]]
    ],
    [
      "wrong_reflection",
      "The Wrong Reflection",
      "Your reflection moves before you do. The surface is still.",
      true,
      [["away", "Look Away", null], ["closer", "Look Closer", { stat: "WIS", scope: "mental", dc: 14 }]]
    ],
    [
      "horrific_remains",
      "Horrific Remains",
      "The remains ahead leave little doubt about what happened here.",
      false,
      [["endure", "Steady yourself", { stat: "WIS", scope: "mental", dc: 11 }]]
    ]
  ]) {
    c.texts.push({ id: `text_event_${id2}`, label: label2, text: text2 });
    c.events.push({
      id: `event_${id2}`,
      label: label2,
      subjective,
      opening: `text_event_${id2}`,
      outputs: [],
      choices: choices.map(([key, label3, check4]) => ({
        id: `choice_${id2}_${key}`,
        label: label3,
        requires: [],
        targets: [],
        ...check4 ? { check: check4 } : {},
        effects: [],
        failure: check4 ? loss : [],
        text: `text_event_${id2}`
      }))
    });
  }
  c.texts.push({ id: "text_whispering_depths", label: "Whispering Depths", text: "Words seem to rise from somewhere far beneath the stone." });
  c.hazards.push({
    id: "hazard_whispering_depths",
    label: "Whispering Depths",
    primary: { stat: "WIS", scope: "mental", dc: 14 },
    advantageFrom: [],
    failure: loss,
    text: "text_whispering_depths"
  });
  c.moves.push(
    { id: "move_double_quick", label: "Quick Strike", damage: 3, impact: 1, speed: 1, qualityStat: "DEX", dodgeDC: 11, stability: 1, onHit: [] },
    { id: "move_double_heavy", label: "Heavy Blow", damage: 5, impact: 2, speed: -1, qualityStat: "STR", dodgeDC: 11, stability: 2, onHit: [] }
  );
  c.enemies.push({
    id: "enemy_hollow_double",
    label: "The Hollow Double",
    hp: 14,
    defense: 1,
    combatStats: { STR: 3, DEX: 3 },
    attackDC: 11,
    xp: 5,
    harvest: [],
    guardian: false,
    subjective: true,
    moves: { kind: "exclusive", entries: [{ target: "move_double_quick", weight: 60 }, { target: "move_double_heavy", weight: 40 }] }
  });
}

// HearthVale_Content/dialogue.js
function addDialogue(c) {
  c.tags.push({ id: "info_discovery", label: "Discovery known", domain: "information" });
  c.texts.push({ id: "text_lina_square", label: "Lina on Sunken Square", text: "Sunken Square is in the record now. We can keep its finder and date together." });
  c.dialogues.push({ id: "dialogue_lina_square", label: "Lina on Sunken Square", actor: "actor_lina", voice: "voice_lina", priority: "history", requires: [], forbids: [], knowledge: [{ subject: "loc_sunken_square", tag: "info_discovery", state: "Known" }], text: "text_lina_square", once: true, pool: "lina_history" });
  const lines = {
    auron: ["They call me the Guardian Adventurer. Helping people prepare for the Pit is part of that work.", "A first loss need not be your last descent. Training gives you something to carry back down."],
    rook: ["A short trip can still pay. Timing helps.", "I like an opportunity that leaves me time for supper."],
    mira: ["Eat something before you go. You make poor decisions hungry.", "Sit down a moment. The Pit can wait."],
    tavi: ["Bring me a sample, not just a description. Then we can work with it.", "I found room on the shelf. That is practically an invitation."],
    lina: ["Tell me what you saw. I will keep the report separate from the rumor.", "The Guild can record the finder and the date."],
    garrick: ["A useful town needs reliable supplies. Small contributions matter.", "Give me the facts first. We can decide what to announce afterward."]
  };
  for (const [name, pool] of Object.entries(lines)) pool.forEach((text2, i) => {
    const id2 = `dialogue_${name}_service_${i}`;
    c.texts.push({ id: `text_${id2}`, label: name, text: text2 });
    c.dialogues.push({ id: id2, label: `${name} service`, actor: `actor_${name}`, voice: `voice_${name}`, priority: "service", requires: [], forbids: [], knowledge: [], text: `text_${id2}`, once: false, pool: `service_${name}` });
  });
}

// HearthVale_Content/expedition.js
var catalog = structuredClone(surfaceCatalog);
catalog.tags.push(...["poison", "cure", "unlock", "return"].map((name) => ({ id: `effect_${name}`, label: name, domain: "effect" })));
catalog.spells.push(
  { id: "spell_unlock", label: "Unlock", cost: 4, target: "lock", effects: [{ tag: "effect_unlock", value: 1 }], explorationOnly: true, startingEligible: false },
  { id: "spell_teleport", label: "Teleport", cost: 8, target: "return", effects: [{ tag: "effect_return", value: 1 }], explorationOnly: false, startingEligible: false }
);
catalog.items.push(
  ...[["moonleaf", 3], ["bitterroot", 3], ["bigshroom", 5], ["iron_ore", 8], ["slime_core", 4], ["beetle_shell", 5], ["venom_gland", 8]].map(([name, sellValue]) => ({ id: `item_${name}`, label: name.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), category: "material", sellValue, stackable: true, effects: [], contexts: [] })),
  { id: "item_m2_keepsake", label: "Worn Keepsake", category: "valuable", sellValue: 5, stackable: true, effects: [], contexts: [] },
  ...[["antidote", "Antidote"], ["cleanse_tonic", "Cleanse Tonic"]].map(([name, label2]) => ({
    id: `item_${name}`,
    label: label2,
    category: "consumable",
    price: 0,
    stackable: true,
    freeAction: true,
    wastefulEligible: true,
    effects: [{ tag: "effect_cure", value: 1 }],
    contexts: ["surface", "exploration", "combat"]
  })),
  ...catalog.spells.flatMap((spell) => ["scroll", "tome"].map((category) => ({
    id: `item_${category}_${spell.id.slice(6)}`,
    label: `${spell.label} ${category === "scroll" ? "Scroll" : "Tome"}`,
    category,
    spell: spell.id,
    stackable: category === "scroll",
    effects: [],
    contexts: category === "scroll" ? ["exploration", "combat"] : ["exploration"],
    ...category === "scroll" ? { freeAction: false, wastefulEligible: false } : {}
  })))
);
var move = (id2, label2, damage, impact, dodgeDC, stability, onHit = []) => ({
  id: id2,
  label: label2,
  damage,
  impact,
  dodgeDC,
  stability,
  onHit,
  speed: { move_body_slam: -1, move_mandible_snap: 1, move_shell_ram: -1, move_venom_bite: 1 }[id2] ?? 0,
  ...damage || impact || onHit.length ? { qualityStat: ["move_venom_bite", "move_lunging_bite"].includes(id2) ? "DEX" : "STR" } : {}
});
catalog.moves = [
  move("move_slime_bash", "Slime Bash", 2, 1, 8, 1),
  move("move_body_slam", "Body Slam", 3, 1, 8, 1),
  move("move_mandible_snap", "Mandible Snap", 3, 1, 11, 2),
  move("move_shell_ram", "Shell Ram", 4, 2, 8, 3),
  move("move_venom_bite", "Venom Bite", 2, 0, 11, 1, [{ tag: "effect_poison", value: 1 }]),
  move("move_lunging_bite", "Lunging Bite", 3, 1, 14, 1)
];
var selection2 = (pairs) => ({ kind: "exclusive", entries: pairs.map(([target, weight]) => ({ target, weight })) });
catalog.enemies = [
  ["slime", "Slime", 6, 0, 8, 2, "slime_core", 55, [["move_slime_bash", 70], ["move_body_slam", 30]]],
  ["cave_beetle", "Cave Beetle", 8, 1, 11, 3, "beetle_shell", 50, [["move_mandible_snap", 65], ["move_shell_ram", 35]]],
  ["venom_spider", "Venom Spider", 6, 0, 11, 4, "venom_gland", 30, [["move_venom_bite", 70], ["move_lunging_bite", 30]]]
].map(([id2, label2, hp, defense, attackDC, xp, material, chance, moves]) => ({
  id: `enemy_${id2}`,
  label: label2,
  hp,
  defense,
  attackDC,
  xp,
  combatStats: { slime: { STR: 2, DEX: 1 }, cave_beetle: { STR: 3, DEX: 2 }, venom_spider: { STR: 1, DEX: 4 } }[id2],
  harvest: [{ item: `item_${material}`, chance, quantity: 1 }],
  moves: selection2(moves),
  guardian: false
}));
catalog.texts.push(...["collapsed_floor", "falling_debris", "spore_pocket"].map((id2) => ({ id: `text_m2_${id2}`, label: id2, text: id2.replaceAll("_", " ") })));
catalog.hazards = [
  { id: "hazard_collapsed_floor", label: "Collapsed Floor", primary: { stat: "DEX", dc: 11 }, advantageFrom: [], failure: [{ tag: "effect_damage", value: 3 }], text: "text_m2_collapsed_floor" },
  { id: "hazard_falling_debris", label: "Falling Debris", primary: { stat: "DEX", dc: 14 }, alternate: { stat: "STR", dc: 11 }, advantageFrom: [], failure: [{ tag: "effect_damage", value: 3 }], text: "text_m2_falling_debris" },
  { id: "hazard_spore_pocket", label: "Spore Pocket", primary: { stat: "CON", dc: 11 }, advantageFrom: [], failure: [{ tag: "effect_poison", value: 1 }], text: "text_m2_spore_pocket" }
];
var familyDefinition = [
  { id: "combat", weight: 8 },
  { id: "resource", weight: 6 },
  { id: "treasure", weight: 6 },
  { id: "hazard", weight: 4 },
  { id: "event", weight: 3 },
  { id: "empty", weight: 2 },
  { id: "discovery", weight: 1 }
];
catalog.tags.push(...familyDefinition.map((family) => ({ id: `room_family_${family.id}`, label: family.id, domain: "room-family" })));
catalog.tables.push({
  id: "table_m2_room_families",
  label: "M2 Room families",
  kind: "exclusive",
  entries: familyDefinition.map((family) => ({ target: `room_family_${family.id}`, weight: family.weight / 30 * 100 }))
});
catalog.tags.push(...["expedition_hp", "treasure", "item", "rumor", "arrows", "observation", "social", "gold", "combat"].map((name) => ({ id: `effect_${name}`, label: name, domain: "effect" })));
addEquipment(catalog);
addEncounters(catalog);
addPitEvents(catalog);
addDialogue(catalog);
addSanityContent(catalog);
validateCatalog(catalog);
var freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
var expeditionCatalog = freeze(catalog);
var byId = (family, id2) => expeditionCatalog[family].find((entry) => entry.id === id2);
var familyWeights = freeze(familyDefinition);
var roomPool = freeze([
  ...catalog.enemies.filter((enemy) => !enemy.guardian && !enemy.subjective).map((enemy) => ({ id: `room_${enemy.id}`, family: "combat", encounter: enemy.id, title: enemy.label })),
  ...catalog.hazards.map((hazard) => ({ id: `room_${hazard.id}`, family: "hazard", encounter: hazard.id, title: hazard.label })),
  ...catalog.events.map((event) => ({ id: `room_${event.id}`, family: "event", encounter: event.id, title: event.label })),
  ...[
    ["resource", "overgrown_courtyard", "Overgrown Courtyard"],
    ["resource", "cracked_garden", "Cracked Garden"],
    ["treasure", "buried_shelf", "Buried Shelf"],
    ["treasure", "abandoned_pack", "Abandoned Pack"],
    ["empty", "quiet_passage", "Quiet Passage"],
    ["empty", "bare_foundations", "Bare Foundations"],
    ["discovery", "old_well", "Old Well"],
    ["discovery", "town_marker", "Town Marker"]
  ].map(([family, id2, title2]) => ({ id: `room_m2_${id2}`, family, encounter: `m2_${id2}`, title: title2 }))
]);
if (new Set(roomPool.map((r) => r.id)).size !== roomPool.length || roomPool.some((r) => !/^[a-z0-9_]+$/.test(r.id) || !familyWeights.some((f) => f.id === r.family) || r.family === "combat" && !byId("enemies", r.encounter) || r.family === "hazard" && !byId("hazards", r.encounter))) throw new Error("Invalid M2 room pool");

// HearthVale_Shell/src/expedition-checks.js
var hasTrait = (actor, id2) => actor.data.attributes.traits.includes(`trait_${id2}`);
function dodgeChance(defenderDEX, attackerDEX, speed = 0, knockedDown = false) {
  const difference = defenderDEX - (attackerDEX + speed);
  return {
    defenderDEX,
    attackerDEX,
    speed,
    difference,
    chance: knockedDown ? 0 : Math.min(3, Math.max(0, difference)) * 25,
    ...knockedDown ? { knockedDown: true } : {}
  };
}
function rollDodge(defenderDEX, attackerDEX, speed, rng, knockedDown = false) {
  const preview = dodgeChance(defenderDEX, attackerDEX, speed, knockedDown);
  const roll = preview.chance ? rng.next() : null;
  return { ...preview, roll, success: roll !== null && roll < preview.chance / 100 };
}
function hitQuality(stat2, value, damage, rng) {
  const result = check({ expression: "1d20", target: 10, modifier: value, rng });
  const quality = result.total >= 20 ? "Critical" : result.total >= 10 ? "Normal" : "Glancing";
  const multiplier = { Glancing: 0.5, Normal: 1, Critical: 1.5 }[quality];
  return {
    rolls: result.rolls,
    die: result.keptRolls[0],
    stat: stat2,
    value,
    total: result.total,
    quality,
    multiplier,
    rawDamage: Math.ceil(damage * multiplier)
  };
}
function traitBonus(actor, scope) {
  let bonus = 0;
  if (["resilience", "biological"].includes(scope)) bonus += constitutionCheckBonus(actor.data.attributes.traits.flatMap((id2) => surfaceCatalog.traits.find((t) => t.id === id2)?.effects ?? []), { physicalResilience: true });
  if (scope === "escape" && hasTrait(actor, "quick")) bonus += 2;
  if (scope === "biological" && hasTrait(actor, "tough_stomach")) bonus += 2;
  if (["fear", "mental", "fire"].includes(scope) && hasTrait(actor, "strong_willed")) bonus += 2;
  if (scope === "fear") bonus += (hasTrait(actor, "fearless") ? 2 : 0) - (hasTrait(actor, "cowardly") ? 2 : 0);
  if (scope === "fire" && hasTrait(actor, "pyrophobic")) bonus -= 2;
  if (["cooperation", "warmth", "trust", "impression"].includes(scope)) bonus += 2 * Number(hasTrait(actor, "charming")) - 2 * Number(hasTrait(actor, "off_putting"));
  if (scope === "intimidate" && hasTrait(actor, "off_putting")) bonus += 2;
  return bonus;
}
function check3(actor, { stat: stat2, dc, scope = "", advantage = false, disadvantage = false }, rng) {
  if (!rng || typeof rng.next !== "function") throw new Error("A resolving Core RNG is required");
  if (scope === "luck") {
    advantage || (advantage = hasTrait(actor, "lucky") || hasTrait(actor, "lucky_bastard"));
    disadvantage || (disadvantage = hasTrait(actor, "unlucky"));
  }
  const value = actor.data.attributes.baseStats[stat2], bonus = traitBonus(actor, scope);
  const result = check({
    expression: "1d20",
    target: dc,
    modifier: value + bonus,
    rng,
    candidates: !!advantage !== !!disadvantage ? 2 : 1,
    keep: advantage && !disadvantage ? "highest" : "lowest"
  });
  return { rolls: result.rolls, die: result.keptRolls[0], stat: stat2, value, bonus, total: result.total, dc, success: result.passed };
}
function noncombatCheck(ctx, specification, rng) {
  const first = check3(ctx.actor, specification, rng);
  if (!first.success && hasTrait(ctx.actor, "lucky_bastard") && !ctx.expedition.luckyRerollUsed) {
    ctx.expedition.luckyRerollUsed = true;
    const second = check3(ctx.actor, specification, rng);
    return { ...second.total > first.total ? second : first, reroll: { first, second } };
  }
  return first;
}
function applyPoison(actor, rng) {
  var _a;
  (_a = actor.data).statuses ?? (_a.statuses = {});
  if (actor.data.statuses.poison) return "Poison is already active; it does not stack.";
  if (hasTrait(actor, "tough_stomach") && rng.next() < 0.5) return "Tough Stomach resisted Poison.";
  actor.data.statuses.poison = true;
  return "Poison applied.";
}
function tickPoison(actor) {
  if (!actor.data.statuses?.poison) return false;
  actor.data.attributes.resources.hp = Math.max(0, actor.data.attributes.resources.hp - 1);
  return true;
}

// HearthVale_Shell/src/expedition-equipment.js
var definitionOf = (item) => item ? byId("items", item.templateId) : null;
var resources = (actor) => actor.data.attributes.resources;
function spellCost(actor, expedition) {
  return 2 ** Math.max(0, expedition.strain - actor.data.attributes.baseStats.INT + 1);
}
function paySpell(actor, expedition, spell) {
  const cost = spellCost(actor, expedition, spell);
  if (resources(actor).essence < cost) throw new Error("Insufficient Essence");
  resources(actor).essence -= cost;
  return cost;
}
function wear(actor, slot, amount, rng) {
  const item = actor.data.inventory.equipped[slot];
  if (!item || !definitionOf(item)?.maxDurability || item.durability === void 0) return null;
  const prevented = hasTrait(actor, "sturdy_hands") && rng.next() < 0.5 ? 1 : 0;
  const loss = Math.max(0, amount - prevented);
  item.durability = Math.max(0, item.durability - loss);
  const destroyed = item.durability === 0;
  if (destroyed) actor.data.inventory.equipped[slot] = null;
  return { item: item.templateId, loss, prevented, destroyed };
}
function consume(actor, container, slot, rng) {
  const item = actor.data.inventory[container][slot];
  const definition = definitionOf(item);
  const desired = definition.stackable && definition.wastefulEligible && hasTrait(actor, "wasteful") && rng.next() < 0.2 ? 2 : 1;
  const spent = Math.min(item.quantity, desired);
  item.quantity -= spent;
  if (!item.quantity) actor.data.inventory[container][slot] = null;
  return spent;
}
function canUseBag(actor, slot) {
  const definition = definitionOf(actor.data.inventory.bag[slot]);
  if (definition?.category !== "consumable") return false;
  return definition.effects.some((effect2) => effect2.tag === "effect_heal" && resources(actor).hp < derivedActorValues(actor).maxHp || effect2.tag === "effect_expedition_hp" && actor.primaryLocation === "hv_pit_1" && !actor.data.expeditionHp || effect2.tag === "effect_cure" && actor.data.statuses?.poison);
}
function useBag(actor, slot, rng) {
  const definition = definitionOf(actor.data.inventory.bag[slot]);
  if (!canUseBag(actor, slot)) throw new Error("Consumable is unavailable");
  const spent = consume(actor, "bag", slot, rng);
  for (const effect2 of definition.effects) {
    if (effect2.tag === "effect_heal") resources(actor).hp = Math.min(derivedActorValues(actor).maxHp, resources(actor).hp + effect2.value);
    if (effect2.tag === "effect_cure") delete actor.data.statuses.poison;
    if (effect2.tag === "effect_expedition_hp") actor.data.expeditionHp = effect2.value;
  }
  return { text: `${definition.label} used (${spent} consumed).${definition.effects.some((effect2) => effect2.tag === "effect_cure") ? " Poison cured." : ""}`, item: definition.id, spent };
}
function swap(actor, equipped, bag) {
  const inventory2 = actor.data.inventory;
  const item = inventory2.bag[bag], definition = definitionOf(item);
  if (item && !["weapon", "shield"].includes(definition.category)) throw new Error("Item cannot be equipped");
  if (!item && !inventory2.equipped[equipped]) throw new Error("Both slots are empty");
  [inventory2.equipped[equipped], inventory2.bag[bag]] = [item, inventory2.equipped[equipped]];
}
function learn(actor, bag, slot) {
  const item = actor.data.inventory.bag[bag], definition = definitionOf(item);
  if (definition?.category !== "tome" || actor.data.inventory.spells.includes(definition.spell)) throw new Error("Tome cannot be learned");
  const replaced = actor.data.inventory.spells[slot];
  actor.data.inventory.spells[slot] = definition.spell;
  actor.data.inventory.bag[bag] = null;
  return { text: `Learned ${byId("spells", definition.spell).label}.`, replaced };
}

// HearthVale_Shell/src/expedition-generation.js
function weighted(entries, rng) {
  const selected = selectWeighted(entries, () => rng.next());
  if (!selected) throw new Error("No eligible weighted choice");
  return selected;
}
var pick2 = (values, rng) => values[Math.floor(rng.next() * values.length)];
function drawRoomFamily(pit, eligible, rng) {
  if (!pit.roomDeck?.length) {
    pit.roomDeck = familyWeights.flatMap(({ id: id2, weight }) => Array(weight).fill(id2));
    for (let i = pit.roomDeck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [pit.roomDeck[i], pit.roomDeck[j]] = [pit.roomDeck[j], pit.roomDeck[i]];
    }
  }
  const index = pit.roomDeck.findIndex((family) => eligible.includes(family));
  return index < 0 ? null : pit.roomDeck.splice(index, 1)[0];
}
function validateRoomDeck(pit) {
  if (pit?.roomDeck === void 0) return;
  if (!Array.isArray(pit.roomDeck) || pit.roomDeck.some((id2) => !familyWeights.some((f) => f.id === id2)) || familyWeights.some((f) => pit.roomDeck.filter((id2) => id2 === f.id).length > f.weight))
    throw new Error("Invalid Pit room deck");
}
function generateFloor(number2, attempt, prefixTail, rng, firstRoom = null, pit = {}, sanity = 5) {
  if (!Number.isInteger(number2) || number2 < 1 || number2 > 10) throw new Error("Only Stratum 1 is playable");
  if (number2 === 10) return { number: number2, attempt, prefixTail: [...prefixTail], rooms: [{
    id: `floor_10_${attempt}_gate`,
    templateId: "room_guardian_gate",
    encounter: "guardian_gate",
    family: "fixed",
    title: "The Guardian Threshold",
    resolved: true
  }] };
  const count = rng.next() < 0.5 ? 3 : 4, rooms = firstRoom ? [{ ...firstRoom, resolved: false }] : [];
  for (let index = rooms.length; index < count; index++) {
    const available = roomPool.filter((room) => (room.family !== "event" || !!byId("events", room.encounter)?.subjective === (sanity === 1 || sanity === 2)) && !rooms.some((r) => r.encounter === room.encounter) && !(room.family === "combat" && rooms.filter((r) => r.family === "combat").length >= 2));
    const family = drawRoomFamily(pit, available.map((room) => room.family), rng) ?? "empty";
    const pool = available.filter((room) => room.family === family);
    const selectedEnemy = family === "combat" ? weighted(enemyWeights.filter((entry) => pool.some((room) => room.encounter === entry.target)), rng).target : null;
    const chosen = selectedEnemy ? pool.find((room) => room.encounter === selectedEnemy) : pick2(pool, rng);
    rooms.push({
      id: `floor_${number2}_${attempt}_room_${index + 1}`,
      templateId: chosen.id,
      encounter: chosen.encounter,
      title: chosen.title,
      family,
      resolved: false
    });
  }
  return { number: number2, attempt, prefixTail: [...prefixTail], rooms };
}
var currentRoom = (expedition) => expedition.floor.rooms[expedition.roomIndex];
var floorTail = (floor) => [...floor.prefixTail, ...floor.rooms.map((r) => r.family)].slice(-2);

// HearthVale_Shell/src/expedition-loot.js
function baselineReward() {
  return { resource: "essence", quantity: 1 };
}
function offerLoot(ctx, templateId, quantity = 1) {
  var _a;
  const definition = byId("items", templateId), actor = ctx.actor;
  if (["material", "valuable"].includes(definition.category)) {
    (_a = actor.data).holdings ?? (_a.holdings = { materials: {}, valuables: {} });
    const store = actor.data.holdings[definition.category === "material" ? "materials" : "valuables"];
    store[templateId] = (store[templateId] ?? 0) + quantity;
    return { item: templateId, quantity, destination: "holdings" };
  }
  const inventory2 = actor.data.inventory;
  const stack = definition.stackable && inventory2.bag.find((item2) => item2?.templateId === templateId);
  if (stack) {
    stack.quantity += quantity;
    return { item: templateId, quantity, destination: "bag" };
  }
  const item = {
    id: `${actor.id}_item_${inventory2.nextItemInstance++}`,
    templateId,
    quantity,
    ...definition.maxDurability ? { durability: definition.maxDurability } : {}
  };
  const slot = inventory2.bag.indexOf(null);
  if (slot >= 0) inventory2.bag[slot] = item;
  else ctx.expedition.pendingLoot.push(item);
  return { item: templateId, quantity, destination: slot >= 0 ? "bag" : "pending" };
}
function settleLoot(ctx, { lootId, choice, bag }) {
  const item = ctx.expedition.pendingLoot[0];
  if (!item || item.id !== lootId) throw new Error("Loot choice is stale");
  if (choice === "replace") ctx.actor.data.inventory.bag[bag] = item;
  else if (choice !== "leave") throw new Error("Unknown loot choice");
  ctx.expedition.pendingLoot.shift();
  return { text: choice === "leave" ? `Left ${byId("items", item.templateId).label}.` : `Kept ${byId("items", item.templateId).label}; replaced Bag slot ${bag + 1}.` };
}
function treasureReward(ctx, rng) {
  const kind = weighted(treasureTable, rng).id;
  if (kind === "potion") return offerLoot(ctx, "item_hp_potion_basic");
  if (kind === "valuable") return offerLoot(ctx, pick2(expeditionCatalog.items.filter((item) => item.category === "valuable" && item.id !== "item_m2_keepsake"), rng).id);
  if (kind === "weapon") return offerLoot(ctx, pick2(["item_sword", "item_hammer", "item_bow"], rng));
  const spell = pick2(expeditionCatalog.spells, rng);
  return offerLoot(ctx, `item_${kind}_${spell.id.slice(6)}`);
}
var treasureTable = Object.freeze([
  { id: "potion", weight: 15 },
  { id: "valuable", weight: 40 },
  { id: "weapon", weight: 20 },
  { id: "scroll", weight: 15 },
  { id: "tome", weight: 10 }
].map(Object.freeze));
function awardRoom(ctx, room, rng) {
  if (room.resolved) throw new Error("Room already resolved");
  const rewards = [];
  if (room.family !== "empty") {
    const reward = baselineReward();
    ctx.actor.data.attributes.resources[reward.resource] += reward.quantity;
    rewards.push(reward);
  }
  if (room.family === "resource") {
    const essence = { resource: "essence", quantity: 1 };
    ctx.actor.data.attributes.resources.essence += 1;
    rewards.push(essence);
    const material = weighted([
      { id: "moonleaf", weight: 40 },
      { id: "bitterroot", weight: 30 },
      { id: "bigshroom", weight: 20 },
      { id: "iron_ore", weight: 10 }
    ], rng).id;
    rewards.push(offerLoot(ctx, `item_${material}`, rng.next() < 0.75 ? 1 : 2));
  }
  if (room.family === "combat" && rng.next() < 0.5) {
    const arrows = { resource: "arrows", quantity: rng.next() < 0.5 ? 1 : 2 };
    ctx.actor.data.attributes.resources.arrows += arrows.quantity;
    rewards.push(arrows);
  }
  if (room.family === "treasure") {
    const reward = treasureReward(ctx, rng);
    if (reward) rewards.push(reward);
    if (hasTrait(ctx.actor, "lucky_bastard") && rng.next() < 0.25) {
      const extra = treasureReward(ctx, rng);
      if (extra) rewards.push(extra);
    }
  }
  room.resolved = true;
  room.rewards = rewards;
  return rewards;
}
function awardEnemy(ctx, enemyId, rng) {
  const definition = byId("enemies", enemyId), rewards = [{ resource: "xp", quantity: definition.xp }];
  ctx.actor.data.attributes.resources.xp += definition.xp;
  for (const entry of definition.harvest) if (rng.next() < entry.chance / 100) rewards.push(offerLoot(ctx, entry.item, 1));
  return rewards;
}

// HearthVale_Shell/src/economy.js
function economyState(world) {
  var _a;
  const state = structuredClone(world.globals.hearthvaleServices ?? { stock: Object.fromEntries(expeditionCatalog.vendors[0].stock.map((s) => [s.item, s.target])), used: [], knownMaterials: [], orders: [], nextOrder: 1 });
  (_a = state.stock).item_antidote ?? (_a.item_antidote = 4);
  return state;
}
function validateServices(world) {
  const state = world.globals.hearthvaleServices;
  if (!state) return;
  const integer2 = (n) => Number.isSafeInteger(n) && n >= 0;
  if (!state.stock || !expeditionCatalog.vendors[0].stock.every((s) => integer2(state.stock[s.item]) || s.item === "item_antidote" && state.stock[s.item] === void 0) || !Array.isArray(state.used) || !Array.isArray(state.orders) || !Array.isArray(state.knownMaterials) || !integer2(state.nextOrder)) throw new Error("Invalid service snapshot");
  if (state.knownMaterials.some((id2) => byId("items", id2)?.category !== "material") || new Set(state.knownMaterials).size !== state.knownMaterials.length) throw new Error("Invalid material knowledge");
  if (state.townSupplies && (typeof state.townSupplies !== "object" || Array.isArray(state.townSupplies) || Object.entries(state.townSupplies).some(([id2, count]) => byId("items", id2)?.category !== "material" || !integer2(count)))) throw new Error("Invalid civic supply snapshot");
  for (const item of state.used) if (!byId("items", item.templateId) || !integer2(item.soldDay) || definitionOf(item).maxDurability && !integer2(item.durability)) throw new Error("Invalid used item snapshot");
  for (const order of state.orders) if (!world.entities[order.actor]?.actor || !byId("items", order.item) || !integer2(order.readyDay) || !integer2(order.quantity) || order.quantity === 0) throw new Error("Invalid order snapshot");
}
function price(actor, base) {
  return Math.ceil(base * (actor.data.attributes.traits.includes("trait_frugal") ? 0.9 : 1));
}
function sellPrice(item) {
  const d = definitionOf(item);
  return d.sellValue ?? (d.maxDurability ? item.durability > 0 ? Math.max(1, Math.floor((d.price ?? 0) * 0.5 * item.durability / d.maxDurability)) : 0 : Math.floor((d.price ?? 0) * 0.5));
}
function sellEntries(actor) {
  const entries = [], inv = actor.data.inventory;
  for (const container of ["bag", "equipped", "chest"]) {
    const items = container === "chest" ? [inv.chest] : inv[container];
    items.forEach((item, slot) => {
      if (item && sellPrice(item) > 0) entries.push({
        item: item.templateId,
        quantity: item.quantity,
        unit: sellPrice(item),
        params: { container, ...container === "chest" ? {} : { slot }, id: item.id }
      });
    });
  }
  for (const group of ["materials", "valuables"]) for (const [item, quantity] of Object.entries(actor.data.holdings?.[group] ?? {}))
    if (quantity > 0 && byId("items", item)?.sellValue > 0) entries.push({ item, quantity, unit: byId("items", item).sellValue, params: { group, item } });
  return entries;
}
function sellOffers(actor) {
  const offers = /* @__PURE__ */ new Map();
  for (const entry of sellEntries(actor)) {
    const offer = offers.get(entry.item) ?? { item: entry.item, quantity: 0, total: 0, units: [] };
    offer.quantity += entry.quantity;
    offer.total += entry.quantity * entry.unit;
    if (!offer.units.includes(entry.unit)) offer.units.push(entry.unit);
    offers.set(entry.item, offer);
  }
  return [...offers.values()];
}
function validBulkSale(actor, items) {
  const available = new Set(sellEntries(actor).map((entry) => entry.item));
  return Array.isArray(items) && items.length > 0 && new Set(items).size === items.length && [...items].every((item) => available.has(item));
}
var bagFits = (actor, id2) => actor.data.inventory.bag.includes(null) || byId("items", id2).stackable && actor.data.inventory.bag.some((i) => i?.templateId === id2);
function shopOffers(actor, state) {
  const offer = (item, cost, quantity, floor, params) => ({
    item,
    cost,
    quantity,
    floor,
    params,
    reason: quantity <= floor ? floor ? "Protected stock reserve" : "Out of stock" : resources(actor).gold < cost ? `Need ${cost - resources(actor).gold} more Gold` : definitionOf(item).category !== "ammo" && !bagFits(actor, item.templateId) ? "Bag full \u2014 make room first" : null
  });
  return [
    ...expeditionCatalog.vendors[0].stock.map((s) => offer({ templateId: s.item }, price(actor, byId("items", s.item).price), state.stock[s.item], s.floor, { op: "buy", item: s.item })),
    ...state.used.map((item) => offer(item, price(actor, sellPrice(item) * 2), 1, 0, { op: "buy-used", id: item.id }))
  ];
}
function economyChoices(world, actor, state, add) {
  if (actor.primaryLocation !== "loc_shop") return;
  const gold = resources(actor).gold;
  for (const offer of shopOffers(actor, state)) if (!offer.reason) {
    const { op, ...params } = offer.params;
    add(op, op === "buy" ? `Buy ${definitionOf(offer.item).label} \u2014 ${offer.cost}G (${offer.quantity} in stock)` : `Buy used ${definitionOf(offer.item).label}${definitionOf(offer.item).maxDurability ? ` DUR ${offer.item.durability}` : ""} \u2014 ${offer.cost}G`, params);
  }
  const entries = sellEntries(actor);
  for (const entry of entries.filter((entry2) => entry2.params.container)) add("sell", entry.params.container === "chest" ? `Sell worn Chest Armor \u2014 ${entry.unit}G` : `Sell ${byId("items", entry.item).label} \u2014 ${entry.unit}G each`, entry.params);
  for (const group of ["materials", "valuables"]) for (const [id2, quantity] of Object.entries(actor.data.holdings?.[group] ?? {})) if (quantity) {
    if (entries.some((entry) => entry.params.group === group && entry.item === id2)) add("sell-holding", `Sell ${byId("items", id2).label} \u2014 ${byId("items", id2).sellValue}G`, { group, item: id2 });
    if (group === "materials" && !state.knownMaterials.includes(id2)) add("turn-in", `Turn in one ${byId("items", id2).label} \u2014 discover recipes`, { item: id2 });
  }
  for (const recipe of expeditionCatalog.recipes) if (recipe.materials.every((m) => state.knownMaterials.includes(m.item)) && (recipe.service === "shop" || state.blacksmithExists === true) && gold >= recipe.gold && recipe.materials.every((m) => (actor.data.holdings?.materials[m.item] ?? 0) >= m.quantity))
    add("order", `Order ${recipe.label} \xD7${recipe.quantity} \u2014 ${recipe.gold}G; ready next Day`, { recipe: recipe.id });
  for (const order of state.orders) if (order.actor === actor.id && order.readyDay <= world.globals.hearthvaleSurface.calendar.day && bagFits(actor, order.item)) add("collect", `Collect ${byId("items", order.item).label} \xD7${order.quantity}`, { id: order.id });
}
function resolveEconomy(ctx, operation, p, rng) {
  var _a, _b;
  const { actor, state, day } = ctx, r = resources(actor), inv = actor.data.inventory;
  const give = (id2, count = 1) => offerLoot({ actor, expedition: { pendingLoot: [] } }, id2, count);
  if (operation === "sell-bulk") {
    if (!validBulkSale(actor, p.items)) throw new Error("Selected sale unavailable");
    const entries = sellEntries(actor).filter((entry) => p.items.includes(entry.item));
    const total = entries.reduce((sum, entry) => sum + entry.quantity * entry.unit, 0);
    for (const entry of entries) {
      const { container, slot, group } = entry.params;
      if (group) {
        actor.data.holdings[group][entry.item] = 0;
        if (group === "valuables") ((_a = actor.data).memories ?? (_a.memories = [])).push({
          actor: actor.id,
          year: ctx.world.globals.hearthvaleSurface.calendar.year,
          day,
          event: `Sold ${byId("items", entry.item).label}`,
          kind: "sell-holding",
          item: entry.item,
          quantity: entry.quantity,
          gold: entry.quantity * entry.unit
        });
      } else {
        const item = container === "chest" ? inv.chest : inv[container][slot], d = definitionOf(item);
        if (["weapon", "shield", "armor"].includes(d.category)) state.used.push({ ...item, soldDay: day });
        else if (Object.hasOwn(state.stock, d.id)) state.stock[d.id] += entry.quantity;
        if (container === "chest") inv.chest = null;
        else inv[container][slot] = null;
      }
    }
    r.gold += total;
    state.lastResult = `Sold ${entries.map((entry) => `${entry.quantity}\xD7 ${byId("items", entry.item).label}`).join(", ")} for ${total}G. Gold: ${r.gold}. No AP spent.`;
    return;
  }
  if (operation === "buy") {
    const d = byId("items", p.item), stock = expeditionCatalog.vendors[0].stock.find((s) => s.item === p.item);
    if (!stock || state.stock[p.item] <= stock.floor || r.gold < price(actor, d.price) || d.category !== "ammo" && !bagFits(actor, p.item)) throw new Error("Purchase unavailable");
    r.gold -= price(actor, d.price);
    state.stock[p.item]--;
    if (d.category === "ammo") r.arrows++;
    else give(p.item);
  }
  if (operation === "buy-used") {
    const index = state.used.findIndex((i) => i.id === p.id), item = state.used[index];
    r.gold -= price(actor, sellPrice(item) * 2);
    inv.bag[inv.bag.indexOf(null)] = item;
    state.used.splice(index, 1);
    delete item.soldDay;
  }
  if (operation === "sell") {
    const item = p.container === "chest" ? inv.chest : inv[p.container][p.slot], d = definitionOf(item);
    r.gold += sellPrice(item);
    if (["weapon", "shield", "armor"].includes(d.category)) {
      state.used.push({ ...item, soldDay: day });
      if (p.container === "chest") inv.chest = null;
      else inv[p.container][p.slot] = null;
    } else {
      item.quantity--;
      if (!item.quantity) inv[p.container][p.slot] = null;
      if (Object.hasOwn(state.stock, d.id)) state.stock[d.id]++;
    }
  }
  if (operation === "sell-holding") {
    actor.data.holdings[p.group][p.item]--;
    r.gold += byId("items", p.item).sellValue;
  }
  if (operation === "turn-in") {
    actor.data.holdings.materials[p.item]--;
    state.knownMaterials.push(p.item);
  }
  if (operation === "order") {
    const recipe = byId("recipes", p.recipe);
    r.gold -= recipe.gold;
    recipe.materials.forEach((m) => actor.data.holdings.materials[m.item] -= m.quantity);
    state.orders.push({ id: `order_${state.nextOrder++}`, actor: actor.id, item: recipe.output, quantity: recipe.quantity, readyDay: day + 1 });
  }
  if (operation === "collect") {
    const index = state.orders.findIndex((o) => o.id === p.id), order = state.orders[index];
    give(order.item, order.quantity);
    state.orders.splice(index, 1);
  }
  if (operation === "turn-in" || operation === "sell-holding" && p.group === "valuables") {
    const record2 = {
      actor: actor.id,
      year: ctx.world.globals.hearthvaleSurface.calendar.year,
      day,
      event: operation === "turn-in" ? `Documented ${byId("items", p.item).label}` : `Sold ${byId("items", p.item).label}`,
      kind: operation,
      item: p.item,
      quantity: 1,
      ...operation === "sell-holding" ? { gold: byId("items", p.item).sellValue } : {}
    };
    ((_b = actor.data).memories ?? (_b.memories = [])).push(record2);
    if (operation === "turn-in") (state.materialRecords ?? (state.materialRecords = [])).push(record2);
  }
  state.lastResult = `${operation.replaceAll("-", " ")} completed. No AP spent.`;
  if (operation === "sell-holding") state.lastResult = `Sold ${byId("items", p.item).label} from Collectables for ${byId("items", p.item).sellValue}G. Gold: ${r.gold}. No AP spent.`;
  if (operation === "turn-in") state.lastResult = `Turned in ${byId("items", p.item).label} from Collectables. Discovered recipes: ${expeditionCatalog.recipes.filter((recipe) => recipe.materials.some((m) => m.item === p.item)).map((recipe) => recipe.label).join(", ") || "none"}. No AP spent.`;
  if (operation === "buy") state.lastResult = `Bought ${byId("items", p.item).label} for ${price(actor, byId("items", p.item).price)}G; added to ${byId("items", p.item).category === "ammo" ? "Arrows" : "Bag"}. Gold: ${r.gold}. No AP spent.`;
}
function advanceEconomy(world, nextDay, state = economyState(world)) {
  const oldStock = { ...state.stock }, oldUsed = state.used;
  state.used = state.used.filter((i) => nextDay - i.soldDay < 15);
  if ((nextDay - 1) % 5 === 0) for (const s of expeditionCatalog.vendors[0].stock) state.stock[s.item] = Math.max(state.stock[s.item], s.target);
  if ((nextDay - 1) % 5 === 0) state.weeklyReconciliation = {
    completedDay: nextDay - 1,
    refreshed: Object.keys(state.stock).filter((id2) => state.stock[id2] !== oldStock[id2]).map((id2) => ({ item: id2, before: oldStock[id2], after: state.stock[id2] })),
    expired: oldUsed.filter((i) => !state.used.some((kept) => kept.id === i.id)).map((i) => i.id)
  };
  return { type: "global", key: "hearthvaleServices", value: state };
}

// HearthVale_Shell/src/sanity.js
var sanityBand = (value) => ["Broken", "Breaking", "Unstable", "Fraying", "Uneasy", "Stable"][value];
var sanityLabel = (r) => `Sanity ${r.sanity}/${r.maxSanity}${r.sanity < r.maxSanity ? ` \xB7 ${sanityBand(r.sanity)}` : ""}`;
function changeSanity(actor, amount, cause) {
  const r = actor.data.attributes.resources, before = r.sanity;
  r.sanity = Math.max(0, Math.min(r.maxSanity, r.sanity + amount));
  const delta = r.sanity - before;
  return `${cause}. Sanity ${delta >= 0 ? "+" : ""}${delta}. ${sanityLabel(r)}.`;
}

// HearthVale_Story/dialogue.js
var priority = ["immediate", "situation", "history", "relationship", "service", "neutral"];
function selectDialogue({ speaker, listener, day, stateTags = [], known = [], lines = expeditionCatalog.dialogues, used = [] }) {
  let pool = lines.filter((line2) => line2.actor === speaker.data.templateId && (!line2.once || !used.includes(`once:${line2.id}`)) && line2.requires.every((t) => stateTags.includes(t)) && line2.forbids.every((t) => !stateTags.includes(t)) && line2.knowledge.every((k) => known.some((f) => f.subject === k.subject && f.tag === k.tag && (f.state === "Known" || f.state === k.state))));
  pool.sort((a, b) => priority.indexOf(a.priority) - priority.indexOf(b.priority));
  pool = pool.filter((line2) => line2.priority === pool[0]?.priority);
  if (!pool.length) {
    const curious = speaker.data.attributes.traits.includes("trait_curious");
    const baseline = [curious ? "I wonder what used to stand down there." : "I am still finding my way around here.", "A little preparation makes the walk easier."];
    const ids = baseline.map((_, i) => `generated_${speaker.id}_${i}`);
    const fresh2 = ids.findIndex((id2) => !used.includes(`${day}:${id2}`));
    const index = fresh2 < 0 ? 0 : fresh2;
    return { id: ids[index], text: baseline[index], reset: fresh2 < 0, pool: ids };
  }
  const fresh = pool.filter((line2) => !used.includes(`${day}:${line2.id}`));
  const line = (fresh.length ? fresh : pool)[0];
  return { id: line.id, text: byId("texts", line.text)?.text ?? line.text, once: line.once, reset: !fresh.length, pool: pool.map((l) => l.id) };
}

// HearthVale_Shell/src/expedition-discovery.js
function routeFloor(ctx, number2, attempt, prefix2, rng) {
  var _a;
  const square = ctx.pit.sunkenSquare;
  const eligible = number2 >= 4 && number2 <= 9;
  const place = eligible && (square ? square.floor === number2 || square.pending : number2 === 9 || rng.next() < 0.2);
  if (place) {
    (_a = ctx.pit).sunkenSquare ?? (_a.sunkenSquare = { floor: number2, pending: true, remaining: 2 });
    if (!ctx.pit.sunkenSquare.known) ctx.pit.sunkenSquare.floor = number2;
    const first = { id: `square_${number2}_${attempt}`, templateId: "loc_sunken_square", encounter: "loc_sunken_square", family: "discovery", title: "Sunken Square", resolved: false };
    return generateFloor(number2, attempt, prefix2, rng, first, ctx.pit, ctx.actor?.data.attributes.resources.sanity);
  }
  return generateFloor(number2, attempt, prefix2, rng, null, ctx.pit, ctx.actor?.data.attributes.resources.sanity);
}
function resolveSquare(ctx) {
  var _a, _b;
  const square = ctx.pit.sunkenSquare;
  const first = !square.known;
  square.known ?? (square.known = { actor: ctx.actor.id, finder: ctx.actor.data.identity.name, year: ctx.year ?? 1, day: ctx.day });
  square.pending = false;
  (_a = ctx.pit).discoveries ?? (_a.discoveries = {});
  ctx.pit.discoveries.loc_sunken_square = { ...square.known, title: "Sunken Square", templateId: "loc_sunken_square" };
  ctx.pit.strata[0].sunkenSquareDiscovered = true;
  if (first) ((_b = ctx.actor.data).memories ?? (_b.memories = [])).push({
    ...square.known,
    id: "discovery-loc_sunken_square",
    kind: "discovery",
    tag: "info_discovery",
    event: `Sunken Square discovered by ${square.known.finder}, Year ${square.known.year}, Day ${square.known.day}.`
  });
  const rewards = [];
  if (square.remaining > 0) {
    rewards.push(offerLoot(ctx, square.remaining === 2 ? "item_town_medal" : "item_moonleaf"));
    square.remaining--;
  }
  return { text: `Sunken Square \u2014 found by ${square.known.finder}, Year ${square.known.year}, Day ${square.known.day}. A partially preserved central square; it is not a safe haven.`, rewards, discovery: square.known };
}
function squareInformation(pit) {
  const d = pit.discoveries?.loc_sunken_square;
  return d ? {
    ...d,
    id: "discovery-loc_sunken_square",
    topic: "discovery-loc_sunken_square",
    domain: "discovery",
    tag: "info_discovery",
    observedDay: d.day,
    text: `Sunken Square discovered by ${d.finder}, Year ${d.year}, Day ${d.day}.`
  } : null;
}
function squareEntityEffects(world, pit) {
  const known = pit.sunkenSquare?.known;
  return known && !world.entities.loc_sunken_square ? [{ type: "create", entity: {
    id: "loc_sunken_square",
    type: "hearthvale.location",
    primaryLocation: "hv_pit_1",
    data: { name: "Sunken Square", pit: "hv_pit_1", persistence: "permanent", discovered: true, recognized: true, finder: known.actor, year: known.year, day: known.day }
  } }] : [];
}

// HearthVale_Shell/src/guardian.js
var guardianWeek = (day) => Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
var firstGuardianClear = (world, pit = world.entities.hv_pit_1.data) => pit.guardianFirstClear ?? pit.guardianDefeated ?? null;
function playerGuardianVictory(ctx) {
  var _a;
  if (ctx.actor.id !== ctx.world.globals.hearthvaleSurface.playerId) throw new Error("Guardian progression requires the player");
  const record2 = { actor: ctx.actor.id, day: ctx.day, year: ctx.year ?? 1 };
  (_a = ctx.pit).guardianFirstClear ?? (_a.guardianFirstClear = firstGuardianClear(ctx.world, ctx.pit) ?? record2);
  ctx.pit.guardianDefeated = structuredClone(ctx.pit.guardianFirstClear);
  const stratum = ctx.pit.strata[0];
  stratum.cleared = true;
  stratum.waystoneUnlocked = true;
  stratum.guardian = { ...stratum.guardian, alive: false, defeatedBy: ctx.actor.id, day: ctx.day, year: ctx.year ?? 1 };
  ctx.pit.strata[1] = { ...ctx.pit.strata[1], locked: false, playable: false };
}
function guardianWeeklyEffects(world) {
  const pit = world.entities.hv_pit_1, clear = firstGuardianClear(world), day = world.globals.hearthvaleSurface.calendar.day;
  if (!clear) return [];
  const strata = structuredClone(pit.data.strata);
  strata[0].guardian.alive = true;
  strata[0].guardian.respawnWeek = guardianWeek(day);
  return [{ type: "data", entity: pit.id, key: "strata", value: strata }];
}

// HearthVale_Shell/src/information.js
var institutions = {
  loc_guild: { custodian: "actor_lina", domains: ["pit", "adventurers", "discovery", "missing", "guild-work", "death"] },
  loc_town_hall: { custodian: "actor_garrick", domains: ["civic", "public-danger", "projects", "town-needs", "death"] },
  loc_shop: { custodian: "actor_tavi", domains: ["materials", "stock", "items", "supply"] },
  loc_inn: { custodian: "actor_mira", domains: ["returns", "injuries", "social", "gossip", "death"] }
};
var prefix = "institution:";
var houndKey = "pit-hound-report";
var pitId = "hv_pit_1";
var custodian = (world, holder) => Object.values(world.entities).find((e2) => e2.data?.templateId === institutions[holder]?.custodian && e2.actor && e2.lifecycle === "active" && e2.primaryLocation === holder);
function heldInformation(world, holder) {
  const institution = institutions[holder], actor = institution ? custodian(world, holder)?.id : holder;
  return Object.values(world.entities).filter((e2) => e2.lifecycle === "active" && e2.claim?.actor === actor && (institution ? e2.claim.key.startsWith(`${prefix}${holder}:`) : !e2.claim.key.startsWith(prefix)));
}
function knowledgeState(world, holder, subject, topic) {
  const record2 = heldInformation(world, holder).find((e2) => e2.claim.subject === subject && (e2.claim.value?.topic ?? e2.claim.key) === topic);
  return record2 ? record2.claim.certainty === "certain" ? "Known" : "Rumor" : "Unknown";
}
function learn2(world, holder, subject, topic, value, certainty = "certain", source = null) {
  const institution = institutions[holder], receiver = institution ? custodian(world, holder) : world.entities[holder];
  if (!receiver?.actor || receiver.lifecycle !== "active" || institution && !institution.domains.includes(value.domain)) return [];
  if (source?.claim.source.kind === "communicated" && source.claim.source.actor === receiver.id) return [];
  const key = institution ? `${prefix}${holder}:${topic}` : topic;
  const old = heldInformation(world, holder).find((e2) => e2.claim.subject === subject && e2.claim.key === key);
  if (old && (old.claim.certainty === "certain" && certainty !== "certain" || old.claim.value.observedDay > value.observedDay || old.claim.certainty === certainty && JSON.stringify(old.claim.value) === JSON.stringify(value))) return [];
  return [{
    type: "learn",
    actor: receiver.id,
    ...source ? { sourceActor: source.claim.actor } : {},
    claim: { subject, key, value, certainty, lineage: source ? [source.id, ...source.claim.lineage] : [] }
  }];
}
function informationCards(world, holder) {
  return heldInformation(world, holder).filter((e2) => e2.claim.value?.topic && e2.claim.value?.text).map((e2) => ({
    subject: e2.claim.subject,
    topic: e2.claim.value.topic,
    state: e2.claim.certainty === "certain" ? "Known" : "Rumor",
    text: e2.claim.value.text,
    observedDay: e2.claim.value.observedDay,
    ...e2.claim.value.status ? { status: e2.claim.value.status } : {}
  }));
}
function witnessHound(ctx, enemyId) {
  var _a;
  if (enemyId !== "enemy_pit_hound") return;
  const combat = ctx.expedition.combat;
  (_a = ctx.pit).houndEvidence ?? (_a.houndEvidence = {});
  ctx.pit.houndEvidence[combat.enemy.id] = {
    id: combat.enemy.id,
    actor: ctx.actor.id,
    day: ctx.day,
    year: ctx.year ?? 1,
    floor: ctx.expedition.floor.number,
    status: "encountered"
  };
}
function houndObservationEffects(world) {
  const effects2 = [];
  const latest = new Map(Object.values(world.entities[pitId]?.data.houndEvidence ?? {}).map((e2) => [e2.actor, e2]));
  for (const evidence of latest.values()) {
    const value = {
      topic: houndKey,
      domain: "pit",
      evidenceId: evidence.id,
      observedDay: evidence.day,
      confirmedBy: evidence.actor,
      text: `Pit Hound ${evidence.status === "defeated" ? "defeated" : "encountered"} on Floor ${evidence.floor}, Day ${evidence.day}.`
    };
    if (Object.values(world.entities).some((e2) => e2.claim?.actor === evidence.actor && e2.claim.key === houndKey && e2.claim.certainty === "certain" && JSON.stringify(e2.claim.value) === JSON.stringify(value))) continue;
    effects2.push(...learn2(world, evidence.actor, pitId, houndKey, value));
  }
  return effects2;
}
function rumorEvents(world, rng) {
  const pit = world.entities[pitId]?.data, day = world.globals.hearthvaleSurface?.calendar.day;
  if (!pit || !custodian(world, "loc_guild")) return [];
  const reports = structuredClone(pit.houndReports ?? {}), effects2 = [];
  for (const evidence of Object.values(pit.houndEvidence ?? {})) {
    const witness = world.entities[evidence.actor];
    if (reports[evidence.id] || witness?.actor?.controller !== "Autonomous" || witness.lifecycle !== "active" || witness.primaryLocation !== "loc_guild") continue;
    const source = heldInformation(world, witness.id).find((e2) => e2.claim.value?.evidenceId === evidence.id && e2.claim.certainty === "certain");
    if (!source || source.claim.value.private === true || source.claim.value.withheld === true) continue;
    const modes = ["Accurate", "Incomplete", "Exaggerated", ...evidence.status === "defeated" || day > evidence.day ? ["Stale"] : []];
    const mode = modes[Math.floor(rng.next() * modes.length)];
    reports[evidence.id] = { mode, evidenceId: evidence.id, reportedDay: day, source: witness.id };
    const text2 = mode === "Incomplete" ? "An adventurer reports signs of a Pit Hound somewhere below." : mode === "Exaggerated" ? `An adventurer reports several Pit Hounds around Floor ${evidence.floor}.` : mode === "Stale" ? `An earlier sighting places a Pit Hound on Floor ${evidence.floor}, Day ${evidence.day}; its current presence is unconfirmed.` : mode === "Accurate" && evidence.status === "defeated" ? `An adventurer reports a Pit Hound defeated on Floor ${evidence.floor}, Day ${evidence.day}.` : `An adventurer reports a Pit Hound on Floor ${evidence.floor}, seen on Day ${evidence.day}.`;
    effects2.push(...learn2(world, "loc_guild", pitId, houndKey, {
      topic: houndKey,
      domain: "pit",
      evidenceId: evidence.id,
      observedDay: evidence.day,
      text: text2
    }, "uncertain", source));
  }
  return effects2.length || JSON.stringify(reports) !== JSON.stringify(pit.houndReports ?? {}) ? [{
    type: "hearthvale.hound-report-filed",
    effects: [...effects2, { type: "data", entity: pitId, key: "houndReports", value: reports }]
  }] : [];
}
function talkInformationEffects(world, listener, speaker) {
  if (!listener?.actor || !speaker?.actor || listener.lifecycle !== "active" || speaker.lifecycle !== "active" || !listener.primaryLocation || listener.primaryLocation !== speaker.primaryLocation) return [];
  const institution = Object.keys(institutions).find((id2) => custodian(world, id2)?.id === speaker.id);
  const effects2 = [];
  const share = (source, holder) => {
    const value = source.claim.value;
    if (!value?.topic || value.private === true || value.withheld === true) return;
    effects2.push(...learn2(world, holder, source.claim.subject, value.topic, value, source.claim.certainty, source));
  };
  for (const source of [...heldInformation(world, speaker.id), ...institution ? heldInformation(world, institution) : []]) share(source, listener.id);
  for (const source of heldInformation(world, listener.id)) {
    if (!institution || institutions[institution].domains.includes(source.claim.value?.domain)) {
      share(source, speaker.id);
      if (institution) share(source, institution);
    }
  }
  const best = /* @__PURE__ */ new Map();
  for (const effect2 of effects2) {
    const key = JSON.stringify([effect2.actor, effect2.claim.subject, effect2.claim.key]), old = best.get(key);
    if (!old || old.claim.certainty !== "certain" && effect2.claim.certainty === "certain" || old.claim.certainty === effect2.claim.certainty && old.claim.value.observedDay <= effect2.claim.value.observedDay) best.set(key, effect2);
  }
  return [...best.values()];
}
function informationPerceptions({ world, event }) {
  const effects2 = houndObservationEffects(world);
  if (event?.event?.type === "hearthvale.player-death") {
    const dead = world.entities[world.globals.hearthvaleSurface.playerId], death = dead?.data.death;
    const place = dead?.primaryLocation;
    if (death && Object.hasOwn(institutions, place)) {
      const value = {
        id: death.id,
        topic: death.id,
        domain: "death",
        kind: "death",
        status: "confirmed-dead",
        actor: dead.id,
        observedDay: death.day,
        day: death.day,
        year: death.year,
        text: `${dead.data.identity.name} died, Year ${death.year}, Day ${death.day}.`
      };
      for (const witness of Object.values(world.entities).filter((a) => a.actor && a.lifecycle === "active" && a.primaryLocation === place))
        effects2.push(...learn2(world, witness.id, dead.id, death.id, value));
      effects2.push(...learn2(world, place, dead.id, death.id, value));
    }
  }
  const pit = world.entities[pitId]?.data;
  const clear = pit ? firstGuardianClear(world, pit) : null;
  const facts = [
    squareInformation(pit ?? {}),
    clear ? {
      ...clear,
      id: "guardian:ruin-brute",
      topic: "guardian-first-clear",
      domain: "pit",
      kind: "guardian",
      observedDay: clear.day,
      text: `Ruin Brute first cleared by ${world.entities[clear.actor]?.data.identity.name ?? clear.actor}, Day ${clear.day}.`
    } : null,
    ...(pit?.guardianVictories ?? []).map((r) => ({ ...r, topic: r.id, observedDay: r.day, text: r.event }))
  ].filter(Boolean);
  for (const value of facts) {
    const witness = world.entities[value.actor];
    if (!witness?.actor) continue;
    effects2.push(...learn2(world, witness.id, pitId, value.topic, value));
    if (witness.actor.controller === "Autonomous" && witness.lifecycle === "active" && witness.primaryLocation === "loc_guild")
      effects2.push(...learn2(world, "loc_guild", pitId, value.topic, value));
  }
  const economy = world.globals.hearthvaleServices?.weeklyReconciliation;
  if (economy && (economy.refreshed.length || economy.expired.length)) {
    const value = {
      topic: "weekly-stock",
      domain: "stock",
      observedDay: economy.completedDay,
      text: `Shop reconciliation: ${economy.refreshed.length} stock lines replenished; ${economy.expired.length} expired used items removed.`
    };
    for (const actor of Object.values(world.entities).filter((e2) => e2.actor && e2.lifecycle === "active" && e2.primaryLocation === "loc_shop"))
      effects2.push(...learn2(world, actor.id, "loc_shop", "weekly-stock", value));
    effects2.push(...learn2(world, "loc_shop", "loc_shop", "weekly-stock", value));
  }
  for (const request of Object.values(world.entities).filter((e2) => ["hearthvale.material-request", "hearthvale.public-opportunity"].includes(e2.type))) {
    const d = request.data.definition;
    const status2 = request.lifecycle;
    const active2 = ["active", "changed", "escalated", "de-escalated"].includes(status2);
    const previousNotice = Object.values(world.entities).find((e2) => e2.claim?.subject === request.id && e2.claim.value?.topic === "public-request" && e2.claim.value.status === status2);
    const observedDay = active2 ? request.data.openedDay : request.data.resolvedDay ?? (status2 === "expired" ? request.data.expiresDay : previousNotice?.claim.value.observedDay ?? world.globals.hearthvaleSurface.calendar.day);
    const value = {
      topic: "public-request",
      domain: d.domain ?? "supply",
      status: status2,
      observedDay,
      text: active2 ? `${d.label}: ${d.kind === "hound-verification" ? "firsthand evidence" : d.quantity + " materials"} requested by Day ${request.data.expiresDay - 1}.` : status2 === "resolved" ? `${d.label}: Completed by ${world.entities[request.data.resolver]?.data.identity.name ?? request.data.resolver}.` : status2 === "expired" ? d.expiryText : d.withdrawnText ?? `${d.label} withdrawn.`,
      ...request.data.resolver ? { resolver: request.data.resolver } : {}
    };
    for (const actor of Object.values(world.entities).filter((e2) => e2.actor && e2.lifecycle === "active" && e2.primaryLocation === request.primaryLocation))
      effects2.push(...learn2(world, actor.id, request.id, "public-request", value));
    if (institutions[request.primaryLocation]) effects2.push(...learn2(world, request.primaryLocation, request.id, "public-request", value));
  }
  return effects2.map((e2) => ({ actor: e2.actor, claim: e2.claim }));
}

// HearthVale_Shell/src/social.js
function storyKnowledge(world, actor) {
  return heldInformation(world, actor.id).map((e2) => ({ subject: e2.claim.value?.templateId ?? e2.claim.subject, tag: e2.claim.value?.tag ?? e2.claim.key, state: e2.claim.certainty === "certain" ? "Known" : "Rumor" }));
}
function talk(ctx, target, firstOnly = false) {
  var _a, _b;
  const actor = ctx.actor, day = ctx.day;
  (_a = actor.data).knownActors ?? (_a.knownActors = []);
  const first = !actor.data.knownActors.includes(target.id);
  if (first) actor.data.knownActors.push(target.id);
  (_b = actor.data).dialogueUsed ?? (_b.dialogueUsed = []);
  const line = selectDialogue({ speaker: target, listener: actor, day, known: storyKnowledge(ctx.world, actor), used: actor.data.dialogueUsed, stateTags: actor.data.storyTags ?? [] });
  if (line.reset) actor.data.dialogueUsed = actor.data.dialogueUsed.filter((key) => !line.pool.some((id2) => key === `${day}:${id2}`));
  actor.data.dialogueUsed.push(`${day}:${line.id}`);
  if (line.once) actor.data.dialogueUsed.push(`once:${line.id}`);
  const year = ctx.world.globals.hearthvaleSurface.calendar.year, r = actor.data.attributes.resources;
  const used = actor.data.sanityTalkRecovery;
  let recovery = "";
  if (!firstOnly && actor.id === ctx.world.globals.hearthvaleSurface.playerId && r.sanity > 0 && r.sanity < r.maxSanity && !(used?.year === year && used?.day === day)) {
    actor.data.sanityTalkRecovery = { year, day };
    recovery = changeSanity(actor, 1, "The conversation helps you feel grounded again");
  }
  ctx.state.lastResult = `${first ? "First meeting. " : ""}${target.data.identity.name}: \u201C${line.text}\u201D${recovery ? ` ${recovery}` : ""}`;
  ctx.state.lastResultActor = actor.id;
}
function scheduledMeetings(world, actor, nextDay, state) {
  const introductions = [];
  const ids = nextDay >= 3 ? ["actor_rook", "actor_auron", world.globals.hearthvaleSurface.couldHaveId] : nextDay >= 2 ? ["actor_rook"] : [];
  for (const id2 of ids) {
    const person = Object.values(world.entities).find((a) => a.id === id2 || a.data?.templateId === id2);
    if (person?.lifecycle === "active" && !actor.data.knownActors?.includes(person.id)) {
      talk({ world, actor, day: nextDay, state }, person, true);
      introductions.push(state.lastResult);
    }
  }
  if (introductions.length) state.lastResult = `Passing through town: ${introductions.join(" ")}`;
}

// HearthVale_Content/living-situations.js
var livingSituationDefinitions = [{
  id: "situation_moonleaf_shortage",
  label: "Moonleaf Shortage",
  kind: "material-request",
  location: "loc_shop",
  provider: "actor_tavi",
  recurrence: true,
  duration: { kind: "Short", days: 3 },
  weight: 1,
  pressure: { all: [
    { entity: "$globals", field: "hearthvaleServices.stock.item_hp_potion_basic", op: "exists" },
    { not: { entity: "$globals", field: "hearthvaleServices.stock.item_hp_potion_basic", op: "gt", value: 3 } }
  ] },
  withdrawn: { entity: "$globals", field: "hearthvaleServices.stock.item_hp_potion_basic", op: "gte", value: 8 },
  material: "item_moonleaf",
  quantity: 2,
  reward: { gold: 10, xp: 2 },
  stock: { item: "item_hp_potion_basic", quantity: 2 },
  expiryText: "Tavi withdrew the Moonleaf request when its delivery window closed.",
  withdrawnText: "Medicine stocks recovered; Tavi no longer needs this delivery."
}, {
  id: "situation_verify_hound_report",
  label: "Verify the Hound Report",
  kind: "hound-verification",
  location: "loc_guild",
  provider: "actor_lina",
  domain: "guild-work",
  recurrence: false,
  duration: { kind: "Short", days: 3 },
  weight: 1,
  pressure: { entity: "hv_pit_1", field: "data.houndReports", op: "exists" },
  reward: { gold: 10, xp: 2 },
  expiryText: "The Guild withdrew the unconfirmed Hound posting after its evidence window closed."
}, {
  id: "situation_town_supply",
  label: "Town Supply Request",
  kind: "material-request",
  location: "loc_town_hall",
  provider: "actor_garrick",
  domain: "town-needs",
  recurrence: false,
  duration: { kind: "Long", days: 7 },
  weight: 1,
  pressure: { not: { entity: "$globals", field: "hearthvaleServices.townSupplies.item_iron_ore", op: "gte", value: 2 } },
  withdrawn: { entity: "$globals", field: "hearthvaleServices.townSupplies.item_iron_ore", op: "gte", value: 2 },
  material: "item_iron_ore",
  quantity: 2,
  reward: { gold: 14, xp: 3 },
  stock: { pool: "townSupplies", item: "item_iron_ore", quantity: 2 },
  expiryText: "The Town Hall withdrew the iron delivery posting when its delivery window closed.",
  withdrawnText: "The civic iron reserve is supplied; this delivery is no longer needed."
}];

// HearthVale_Shell/src/situations.js
var activeSituation = (entity2) => !!entity2?.situation && ["active", "changed", "escalated", "de-escalated"].includes(entity2.lifecycle);

// HearthVale_Shell/src/living-situations.js
var livingSituations = (world) => Object.values(world.entities).filter((e2) => ["hearthvale.material-request", "hearthvale.public-opportunity"].includes(e2.type));
var providerPresent = (world, definition) => Object.values(world.entities).some((e2) => e2.data?.templateId === definition.provider && e2.lifecycle === "active" && e2.primaryLocation === definition.location && e2.data.attributes?.resources.hp > 0);
function makeMaterialRequest(definition, id2, day) {
  const { kind, days } = definition.duration;
  if (!(kind === "Immediate" && days === 1 || kind === "Short" && [2, 3].includes(days) || kind === "Long" && Number.isSafeInteger(days) && days >= 4 && days <= 11))
    throw new Error("Invalid Situation duration");
  const verification = definition.kind === "hound-verification";
  if (!verification && (definition.kind !== "material-request" || byId("items", definition.material)?.category !== "material" || !Number.isSafeInteger(definition.quantity) || definition.quantity < 1 || !byId("items", definition.stock?.item) || !Number.isSafeInteger(definition.stock.quantity) || definition.stock.quantity < 1) || !definition.pressure || !Number.isFinite(definition.weight) || definition.weight <= 0 || !["gold", "xp"].every((k) => Number.isSafeInteger(definition.reward[k]) && definition.reward[k] >= 0))
    throw new Error("Invalid material request definition");
  if (definition.escalation && (!Number.isSafeInteger(definition.escalation.afterDays) || definition.escalation.afterDays < 1 || definition.escalation.afterDays >= days))
    throw new Error("Invalid Situation escalation");
  const expiresDay = day + days;
  return {
    id: id2,
    type: verification ? "hearthvale.public-opportunity" : "hearthvale.material-request",
    lifecycle: "active",
    primaryLocation: definition.location,
    data: {
      sourceDefinitionId: definition.id,
      definition: structuredClone(definition),
      openedDay: day,
      expiresDay,
      resolver: null,
      escalated: false,
      persistence: "permanent"
    },
    situation: { affected: [id2], paths: [
      { id: "delivered", lifecycle: "resolved", when: { entity: id2, field: "data.resolver", op: "ne", value: null } },
      ...definition.withdrawn ? [{ id: "pressure-eased", lifecycle: "cancelled", when: definition.withdrawn }] : [],
      { id: "deadline", lifecycle: "expired", when: { entity: "$globals", field: "hearthvaleSurface.calendar.day", op: "gte", value: expiresDay } }
    ] }
  };
}
function situationDayEvents(world, rng, definitions = livingSituationDefinitions) {
  const surface = world.globals.hearthvaleSurface;
  if (surface?.stage !== "surface" || world.globals.hearthvaleSituationBoundary !== surface.calendar.day) return [];
  const day = surface.calendar.day;
  if ((world.globals.hearthvaleSituationDay ?? 1) >= day) return [];
  const events = [{ type: "hearthvale.situation-day", effects: [{ type: "global", key: "hearthvaleSituationDay", value: day }] }];
  const active2 = Object.values(world.entities).filter(activeSituation);
  for (const request of livingSituations(world).filter(activeSituation)) {
    const escalation = request.data.definition.escalation;
    if (escalation && !request.data.escalated && day >= request.data.openedDay + escalation.afterDays && !request.situation.paths.some((p) => evaluate(p.when, world))) events.push({
      type: "hearthvale.request-escalated",
      data: { situation: request.id },
      effects: [
        { type: "data", entity: request.id, key: "escalated", value: true },
        { type: "situation", entity: request.id, lifecycle: "escalated" }
      ]
    });
  }
  let candidates = definitions.filter((d) => providerPresent(world, d) && evaluate(d.pressure, world) && (d.kind !== "hound-verification" || knowledgeState(world, "loc_guild", "hv_pit_1", "pit-hound-report") === "Rumor") && (d.recurrence === true || !livingSituations(world).some((e2) => e2.data.sourceDefinitionId === d.id && e2.lifecycle === "resolved")) && !active2.some((e2) => e2.data.sourceDefinitionId === d.id) && !livingSituations(world).some((e2) => e2.data.sourceDefinitionId === d.id && (e2.data.expiresDay === day || e2.data.resolvedDay === day - 1)));
  const count = Math.min(8 - active2.length, candidates.length, candidates.length ? Math.floor(rng.next() * 3) : 0);
  for (let i = 0; i < count && candidates.length; i++) {
    const definition = selectWeighted(candidates, () => rng.next());
    candidates = candidates.filter((d) => d.id !== definition.id);
    const id2 = `hv_situation_${definition.id}_day_${day}`;
    events.push({
      type: "hearthvale.request-created",
      data: { situation: id2, sourceDefinitionId: definition.id },
      effects: [{ type: "create", entity: makeMaterialRequest(definition, id2, day) }]
    });
  }
  return events;
}
function firsthandHoundEvidence(world, actor) {
  const claim = heldInformation(world, actor.id).find((e2) => e2.claim.key === "pit-hound-report" && e2.claim.certainty === "certain" && e2.claim.value.confirmedBy === actor.id && !e2.claim.value.private && !e2.claim.value.withheld);
  const evidence = world.entities.hv_pit_1.data.houndEvidence?.[claim?.claim.value.evidenceId];
  return evidence?.actor === actor.id ? evidence : null;
}
function requestChoices(world, actor, claimed = /* @__PURE__ */ new Set()) {
  const day = world.globals.hearthvaleSurface.calendar.day;
  const r = actor.data.attributes?.resources;
  if (!actor.actor || actor.lifecycle !== "active" || !(r?.hp > 0 && r.hearts > 0)) return [];
  return livingSituations(world).filter((s) => activeSituation(s) && !claimed.has(s.id) && s.data.resolver === null && day < s.data.expiresDay && !s.situation.paths.some((p) => evaluate(p.when, world)) && actor.primaryLocation === s.primaryLocation && providerPresent(world, s.data.definition) && (s.data.definition.kind === "hound-verification" ? firsthandHoundEvidence(world, actor) : (actor.data.holdings?.materials?.[s.data.definition.material] ?? 0) >= s.data.definition.quantity)).map((s) => ({
    op: "fulfill-request",
    params: { situation: s.id },
    weight: 5,
    label: s.data.definition.kind === "hound-verification" ? "Submit firsthand Hound evidence" : `Deliver ${s.data.definition.quantity} ${byId("items", s.data.definition.material).label} \u2014 ${s.data.definition.label}`
  }));
}
function trackingChoices(world, actor) {
  return heldInformation(world, actor.id).filter((e2) => e2.claim.value?.topic === "public-request" && world.entities[e2.claim.subject]?.situation).map((e2) => {
    const tracked = actor.data.trackedOpportunities?.includes(e2.claim.subject);
    return { op: tracked ? "untrack-opportunity" : "track-opportunity", label: `${tracked ? "Untrack" : "Track"} ${world.entities[e2.claim.subject].data.definition.label}`, params: { situation: e2.claim.subject } };
  });
}
function resolveMaterialRequest({ world, actor, state, day }, id2) {
  var _a;
  if (!requestChoices(world, actor).some((c) => c.params.situation === id2)) throw new Error("Material request unavailable");
  const request = world.entities[id2], d = request.data.definition;
  const verification = d.kind === "hound-verification";
  const evidence = verification ? firsthandHoundEvidence(world, actor) : null;
  if (!verification) {
    actor.data.holdings.materials[d.material] -= d.quantity;
    const pool = d.stock.pool ?? "stock";
    state[pool] ?? (state[pool] = {});
    state[pool][d.stock.item] = (state[pool][d.stock.item] ?? 0) + d.stock.quantity;
  }
  actor.data.attributes.resources.gold += d.reward.gold;
  actor.data.attributes.resources.xp += d.reward.xp;
  const record2 = {
    actor: actor.id,
    situation: id2,
    sourceDefinitionId: d.id,
    day,
    year: world.globals.hearthvaleSurface.calendar.year,
    event: `Fulfilled ${d.label}`,
    ...verification ? { evidenceId: evidence.id, confirmedBy: actor.id } : { item: d.material, quantity: d.quantity },
    ...d.reward
  };
  ((_a = actor.data).memories ?? (_a.memories = [])).push(record2);
  return [
    ...verification ? talkInformationEffects(world, actor, Object.values(world.entities).find((e2) => e2.data?.templateId === d.provider)) : [],
    { type: "data", entity: id2, key: "resolver", value: actor.id },
    { type: "data", entity: id2, key: "resolvedDay", value: day },
    { type: "data", entity: id2, key: "record", value: record2 },
    { type: "learn", actor: actor.id, claim: { subject: id2, key: "request-outcome", value: record2 } }
  ];
}

// HearthVale_Shell/src/autonomous-pit.js
var pitGoals = /* @__PURE__ */ new Set(["Make money through the Pit", "Understand what comes out of the Pit", "Find a place in HearthVale"]);
var services = /* @__PURE__ */ new Set(["actor_mira", "actor_tavi", "actor_lina", "actor_garrick"]);
function autonomousPitChoices(world, actor, claimed = /* @__PURE__ */ new Set()) {
  const pit = world.entities.hv_pit_1.data, r = actor.data.attributes?.resources, surface = world.globals.hearthvaleSurface;
  if (world.entities.hv_pit_1.lifecycle !== "active" || actor.id === surface.playerId || actor.actor?.controller !== "Autonomous" || actor.lifecycle !== "active" || actor.primaryLocation === world.entities[surface.playerId].primaryLocation || !(r?.hp > 0 && r.hearts > 0) || services.has(actor.data.templateId) || !pitGoals.has(actor.data.mainGoal) || !["loc_guild", "loc_pit_entrance"].includes(actor.primaryLocation) || pit.expedition?.active || !actor.data.inventory?.equipped.some((i) => byId("items", i?.templateId)?.category === "weapon" && (!byId("items", i.templateId).maxDurability || i.durability > 0) && (byId("items", i.templateId).ammo !== "item_arrows" || r.arrows > 0))) return [];
  const depth = Math.max(pit.deepestReachedFloor ?? 0, pit.lastExpedition?.deepestFloor ?? 0);
  const square = pit.sunkenSquare, choices = [];
  const floor = square?.floor ?? Math.min(depth, 9);
  if (!square?.known && !claimed.has("discover-square") && floor >= 4 && floor <= 9 && depth >= floor)
    choices.push({ op: "discover-square", params: { floor } });
  const clear = firstGuardianClear(world), week = guardianWeek(surface.calendar.day);
  if (clear && week > guardianWeek(clear.day) && pit.guardianAutonomyWeek !== week && !claimed.has("guardian-repeat"))
    choices.push({ op: "guardian-repeat", params: { week } });
  return choices;
}
function resolveAutonomousPit(world, actor, choice, claimed) {
  var _a;
  if (!autonomousPitChoices(world, actor, claimed).some((c) => c.op === choice.op)) throw new Error("Autonomous Pit accomplishment unavailable");
  const pit = structuredClone(world.entities.hv_pit_1.data), calendar = world.globals.hearthvaleSurface.calendar;
  const ctx = { actor, pit, day: calendar.day, year: calendar.year };
  if (choice.op === "discover-square") {
    pit.sunkenSquare ?? (pit.sunkenSquare = { floor: choice.params.floor, pending: true, remaining: 2 });
    resolveSquare(ctx);
  } else {
    const week = guardianWeek(calendar.day), record2 = {
      id: `guardian-repeat-${calendar.year}-${week}`,
      kind: "guardian",
      domain: "pit",
      actor: actor.id,
      day: calendar.day,
      year: calendar.year,
      week,
      event: `${actor.data.identity.name} defeated the Ruin Brute (repeat victory).`
    };
    (pit.guardianVictories ?? (pit.guardianVictories = [])).push(record2);
    pit.guardianAutonomyWeek = week;
    ((_a = actor.data).memories ?? (_a.memories = [])).push(record2);
  }
  claimed.add(choice.op);
  const effects2 = squareEntityEffects(world, pit);
  for (const [key, value] of Object.entries(pit)) if (JSON.stringify(value) !== JSON.stringify(world.entities.hv_pit_1.data[key]))
    effects2.push({ type: "data", entity: "hv_pit_1", key, value });
  world.entities = { ...world.entities, hv_pit_1: { ...world.entities.hv_pit_1, data: pit } };
  for (const effect2 of effects2) if (effect2.type === "create") world.entities[effect2.entity.id] = effect2.entity;
  return effects2;
}

// HearthVale_Shell/src/day-autonomy.js
var goals = /* @__PURE__ */ new Set(["Make money through the Pit", "Understand what comes out of the Pit", "Find a place in HearthVale"]);
function autonomousChoices(world, actor, state, claimed = /* @__PURE__ */ new Set()) {
  const surface = world.globals.hearthvaleSurface;
  const player2 = world.entities[surface.playerId];
  const r = actor.data.attributes?.resources;
  if (actor.id === surface.playerId || actor.actor?.controller !== "Autonomous" || actor.lifecycle !== "active" || actor.primaryLocation === player2.primaryLocation || !(r?.hp > 0 && r.hearts > 0) || !actor.data.inventory) return [];
  const choices = [...requestChoices(world, actor, claimed), ...autonomousPitChoices(world, actor, claimed)];
  if (goals.has(actor.data.mainGoal) && Object.values(world.entities).some((e2) => e2.data?.templateId === "actor_tavi" && e2.lifecycle === "active" && e2.primaryLocation === "loc_shop")) economyChoices(world, actor, state, (op, label2, params) => {
    if (op === "turn-in" || op === "sell-holding" && params.group === "valuables")
      choices.push({ op, params });
  });
  const isDiscovery = (c) => ["turn-in", "discover-square"].includes(c.op);
  const discovery = choices.filter(isDiscovery).length;
  const profit = choices.length - discovery;
  const traits = actor.data.attributes.traits;
  const greedy = traits.includes("trait_greedy"), curious = traits.includes("trait_curious");
  const discoveryWeight = curious && !greedy ? 7 : greedy && !curious ? 3 : 5;
  return choices.map((c) => ({ ...c, weight: isDiscovery(c) ? discoveryWeight / discovery : (10 - discoveryWeight) / profit }));
}
function dayAutonomyEffects(world, state, rng) {
  const effects2 = [];
  const claimed = /* @__PURE__ */ new Set();
  const current = { ...world, globals: { ...world.globals, hearthvaleServices: state } };
  const day = world.globals.hearthvaleSurface.calendar.day;
  for (const original of Object.values(world.entities).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const choices = autonomousChoices(current, original, state, claimed);
    if (!choices.length || rng.next() >= 0.2) continue;
    const choice = selectWeighted(choices, () => rng.next());
    const actor = structuredClone(original);
    const lastResult = state.lastResult;
    if (["discover-square", "guardian-repeat"].includes(choice.op)) {
      effects2.push(...resolveAutonomousPit(current, actor, choice, claimed));
    } else if (choice.op === "fulfill-request") {
      effects2.push(...resolveMaterialRequest({ world: current, actor, state, day }, choice.params.situation));
      claimed.add(choice.params.situation);
    } else resolveEconomy({ world, actor, state, day }, choice.op, choice.params, rng);
    if (lastResult === void 0) delete state.lastResult;
    else state.lastResult = lastResult;
    for (const [key, value] of Object.entries(actor.data))
      if (JSON.stringify(value) !== JSON.stringify(original.data[key]))
        effects2.push({ type: "data", entity: actor.id, key, value });
    if (choice.op === "turn-in") effects2.push({
      type: "learn",
      actor: actor.id,
      claim: {
        subject: "loc_shop",
        key: `material-${choice.params.item}`,
        value: { templateId: choice.params.item, known: true }
      }
    });
  }
  return effects2;
}

// HearthVale_Shell/src/surface-day.js
function spendSurfaceAp(actor, amount) {
  const attributes = actor.data.attributes;
  if (!Number.isSafeInteger(amount) || amount < 0 || attributes.resources.ap < amount) throw new Error("Insufficient or invalid AP");
  return { type: "data", entity: actor.id, key: "attributes", value: {
    ...attributes,
    resources: { ...attributes.resources, ap: attributes.resources.ap - amount }
  } };
}
function sleepEffects(world, actor, rng, { rest = true } = {}) {
  const surface = world.globals.hearthvaleSurface;
  const day = surface.calendar.day + 1;
  const services2 = economyState(world);
  const autonomy = dayAutonomyEffects(world, services2, rng);
  const economy = advanceEconomy(world, day, services2), updatedActor = structuredClone(actor);
  if (rest) scheduledMeetings(world, updatedActor, day, economy.value);
  return [
    ...autonomy,
    economy,
    ...Object.entries(updatedActor.data).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(actor.data[key])).map(([key, value]) => ({ type: "data", entity: actor.id, key, value })),
    ...(updatedActor.data.knownActors ?? []).filter((id2) => !actor.data.knownActors?.includes(id2)).map((id2) => ({ type: "learn", actor: actor.id, claim: { subject: id2, key: "met", value: true } })),
    ...rest ? [{ type: "data", entity: actor.id, key: "attributes", value: {
      ...actor.data.attributes,
      resources: {
        ...actor.data.attributes.resources,
        hp: derivedActorValues(actor).maxHp,
        ap: 4
      }
    } }] : [],
    { type: "global", key: "hearthvaleSurface", value: {
      ...surface,
      calendar: { ...surface.calendar, day, week: Math.floor((day - 1) / DAYS_PER_WEEK) + 1 }
    } },
    // After these effects settle, Core closes terminal Situations; the world
    // process then escalates/generates once for this completed Day boundary.
    { type: "global", key: "hearthvaleSituationBoundary", value: day }
  ];
}

// HearthVale_Shell/src/surface-actions.js
var stateEffect = (world, changes) => ({ type: "global", key: "hearthvaleSurface", value: { ...surfaceState(world), ...changes } });
var atStage = (stage) => ({ world, attempt }) => surfaceState(world).stage === stage && !world.globals.hearthvaleCompletion?.completed && world.entities[attempt.actor]?.lifecycle === "active" && !world.entities[attempt.actor]?.data.death && world.entities[attempt.actor].data.attributes.resources.hearts > 0 && world.entities[attempt.actor].data.attributes.resources.sanity > 0 && surfaceState(world).playerId === attempt.actor && !activeExpedition(world) && !world.entities.hv_pit_1?.data.pendingFinalHeart && !world.entities.hv_pit_1?.data.pendingDeath;
var player = (world, attempt) => world.entities[attempt.actor];
var surfaceActions = {
  "surface.arrive": {
    eligible: atStage("arrival"),
    resolve: ({ world }) => ({ type: "hearthvale.inn-arrival", effects: [stateEffect(world, { stage: "mira" })] })
  },
  "surface.answer-mira": {
    eligible: (context2) => atStage("mira")(context2) && miraResponses.some((r) => r.id === context2.attempt.params.response),
    resolve: ({ world, attempt }) => ({ type: "hearthvale.mira-answered", effects: [
      stateEffect(world, { stage: "mira-reply", miraResponse: attempt.params.response })
    ] })
  },
  "surface.finish-mira": {
    eligible: atStage("mira-reply"),
    resolve: ({ world }) => ({ type: "hearthvale.mira-met", effects: [
      stateEffect(world, { stage: "surface", miraComplete: true })
    ] })
  },
  Move: {
    eligible: (context2) => atStage("surface")(context2) && ["loc_surface", ...surfaceCatalog.locations.map((l) => l.id)].includes(context2.attempt.params.location)
  },
  "surface.sleep": {
    eligible: (context2) => atStage("surface")(context2) && player(context2.world, context2.attempt).primaryLocation === "loc_inn" && context2.attempt.params.confirmed === true && context2.attempt.params.day === surfaceState(context2.world).calendar.day,
    resolve: ({ world, attempt }, { rng }) => ({
      type: "hearthvale.surface-day-ended",
      data: { completedDay: attempt.params.day },
      effects: sleepEffects(world, player(world, attempt), rng)
    })
  }
};

// HearthVale_Shell/src/scroll-magic.js
var supportedEffects = /* @__PURE__ */ new Set(["effect_damage", "effect_impact", "effect_heal", "effect_defense", "effect_return"]);
function scrollSpell(item) {
  const definition = item && byId("items", item.templateId);
  return definition?.category === "scroll" ? byId("spells", definition.spell) : null;
}
function canCastCombatScroll(actor, combat, item, phase2 = combat?.phase) {
  const spell = scrollSpell(item);
  if (!combat || !Number.isSafeInteger(item?.quantity) || item.quantity < 1 || !spell || spell.explorationOnly || !spell.effects.length || spell.effects.some((effect2) => !supportedEffects.has(effect2.tag))) return false;
  if (!["attack", "advantage", "counterattack"].includes(phase2) || phase2 !== "attack" && spell.target !== "enemy") return false;
  if (spell.target === "enemy") return combat.enemy.hp > 0;
  if (spell.id === "spell_teleport") return true;
  return spell.target === "self" && spell.effects.some((effect2) => effect2.tag === "effect_heal" ? actor.data.attributes.resources.hp < derivedActorValues(actor).maxHp : effect2.tag === "effect_defense" && combat.barrier < effect2.value);
}
function applyScrollEffects(actor, combat, spell) {
  let damage = 0, impact = 0;
  const descriptions = [];
  for (const effect2 of spell.effects) {
    if (effect2.tag === "effect_damage") damage += Math.max(0, effect2.value + actor.data.attributes.baseStats.INT);
    if (effect2.tag === "effect_impact") impact += effect2.value;
    if (effect2.tag === "effect_heal") {
      const r = actor.data.attributes.resources, before = r.hp;
      r.hp = Math.min(derivedActorValues(actor).maxHp, r.hp + effect2.value);
      descriptions.push(`${r.hp - before} HP restored`);
    }
    if (effect2.tag === "effect_defense") {
      combat.barrier = effect2.value;
      descriptions.push(`Barrier ${effect2.value} until the next enemy offensive action resolves`);
    }
  }
  if (spell.target === "enemy") {
    combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
    descriptions.push(`${damage} damage${impact ? `; ${impact} Impact` : ""} \u2014 automatic hit`);
  }
  return { damage, impact, text: descriptions.join("; ") };
}

// HearthVale_Shell/src/magic-pressure.js
function migrateSpellStrain(combat) {
  delete combat.spellStrain;
  delete combat.scrollStrain;
}
function spellPressure(actor, expedition) {
  const strain = expedition.strain + 1, wis = actor.data.attributes.baseStats.WIS;
  const excess = strain - wis;
  return { strain, safeCasts: wis, dc: excess > 0 ? [8, 11, 14, 17, 20][Math.min(4, excess - 1)] : null };
}
function resolveSpellPressure(actor, expedition, rng) {
  if (expedition.combat) migrateSpellStrain(expedition.combat);
  const pressure = spellPressure(actor, expedition);
  expedition.strain = pressure.strain;
  const roll = pressure.dc === null ? null : check3(actor, { stat: "WIS", dc: pressure.dc, scope: "mental" }, rng);
  const text2 = roll ? `Overcast \u2014 WIS check ${roll.success ? "succeeded; no Sanity lost." : "failed. " + changeSanity(actor, -1, "Overcast")}` : "Within your WIS limit; no Overcast check.";
  return { ...pressure, check: roll, text: text2 };
}

// HearthVale_Shell/src/expedition-events.js
function eventChoices(ctx, room) {
  return byId("events", room.encounter)?.choices.filter((choice) => !choice.id.endsWith("_unlock")) ?? [];
}
function resolveEvent(ctx, room, choiceId, rng) {
  var _a, _b;
  const template = byId("events", room.encounter), choice = template.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error("Unknown Event choice");
  const check4 = choice.check ? noncombatCheck(ctx, choice.check, rng) : null;
  const rewards = [];
  let sanityText = "";
  if (template.id === "event_scratched_warning") room.warningAccuracy ?? (room.warningAccuracy = ["Accurate", "Stale", "Incomplete", "Incorrect"][Math.floor(rng.next() * 4)]);
  const history = { event: template.id, choice: choice.id, actor: ctx.actor.id, day: ctx.day };
  for (const effect2 of check4 && !check4.success ? choice.failure : choice.effects) {
    const handlers = {
      effect_sanity: () => {
        sanityText = changeSanity(ctx.actor, effect2.value, template.label);
      },
      effect_treasure: () => {
        const reward = treasureReward(ctx, rng);
        if (reward) rewards.push(reward);
      },
      effect_item: () => rewards.push(offerLoot(ctx, effect2.target, effect2.value)),
      effect_arrows: () => {
        resources(ctx.actor).arrows += effect2.value;
        rewards.push({ resource: "arrows", quantity: effect2.value });
      },
      effect_gold: () => {
        resources(ctx.actor).gold += effect2.value;
        rewards.push({ resource: "gold", quantity: effect2.value });
      },
      effect_combat: () => startCombat(ctx, effect2.target, "room", rng),
      effect_rumor: () => {
        var _a2;
        (_a2 = ctx.actor.data).rumors ?? (_a2.rumors = []);
        ctx.actor.data.rumors.push({ subject: template.id, text: "A scratched warning suggests danger nearby. Its accuracy is uncertain.", day: ctx.day });
      },
      effect_observation: () => {
        var _a2;
        (_a2 = ctx.actor.data).observations ?? (_a2.observations = []);
        ctx.actor.data.observations.push({ subject: template.id, text: byId("texts", template.opening).text, day: ctx.day });
      },
      effect_social: () => {
        var _a2, _b2;
        ctx.actor.data.reputation = (ctx.actor.data.reputation ?? 0) + effect2.value;
        const target = room.actorId && ctx.world?.entities[room.actorId];
        if (target) {
          (_a2 = ctx.actor.data).relationships ?? (_a2.relationships = {});
          ctx.actor.data.relationships[target.id] = (ctx.actor.data.relationships[target.id] ?? 0) + effect2.value;
          history.target = target.id;
          (_b2 = ctx.actor.data).memories ?? (_b2.memories = []);
          ctx.actor.data.memories.push({ actor: target.id, event: template.id, day: ctx.day, value: effect2.value });
        }
      }
    };
    if (!handlers[effect2.tag]) throw new Error(`Unsupported Event effect ${effect2.tag}`);
    handlers[effect2.tag]();
  }
  if (!template.subjective) ((_a = ctx.pit).eventHistory ?? (_a.eventHistory = [])).push(history);
  else ((_b = ctx.actor.data).memories ?? (_b.memories = [])).push({ kind: "personal-experience", day: ctx.day, year: ctx.year ?? 1, event: "Experienced a hallucination in the Pit." });
  return { text: `${template.label}: ${choice.label}.${check4 ? check4.success ? template.subjective ? " Recognized and endured the hallucination." : " Success." : " Failure." : ""}${sanityText ? ` ${sanityText}` : ""}`, check: check4, rewards };
}

// HearthVale_Shell/src/expedition-rooms.js
function hazardCheckSpecification(actor, hazard, approach) {
  const selected = hazard[approach];
  const advantage = hazard.advantageFrom.some((id2) => actor.data.inventory.equipped.some((item) => item?.templateId === id2) || actor.data.inventory.spells.includes(id2));
  return { ...selected, advantage, scope: selected.scope ?? (hazard.id === "hazard_spore_pocket" ? "biological" : selected.stat === "CON" ? "resilience" : selected.stat === "DEX" ? "escape" : "") };
}
function resolveRoom(ctx, approach, rng, unlocked = false) {
  var _a;
  const room = currentRoom(ctx.expedition);
  let roll = null, text2 = `${room.title} resolved.`, extra = [];
  if (byId("events", room.encounter)) {
    const result = resolveEvent(ctx, room, approach, rng);
    const rewards2 = awardRoom(ctx, room, rng);
    ctx.expedition.lastResult = { ...result, rewards: [...result.rewards, ...rewards2] };
    ctx.noncombatCompleted = !ctx.expedition.combat;
    return;
  }
  if (room.encounter === "loc_sunken_square") {
    const result = resolveSquare(ctx);
    result.rewards.push(...awardRoom(ctx, room, rng));
    room.rewards = result.rewards;
    ctx.expedition.lastResult = result;
    ctx.noncombatCompleted = true;
    return;
  }
  if (room.family === "hazard") {
    const hazard = byId("hazards", room.encounter);
    roll = noncombatCheck(ctx, hazardCheckSpecification(ctx.actor, hazard, approach), rng);
    text2 = `${hazard.label}: ${roll.success ? "Success" : "Failure"}.`;
    if (!roll.success && hazard.triggered) {
      const notice = roll;
      roll = noncombatCheck(ctx, { ...hazard.triggered, scope: "escape" }, rng);
      roll.trigger = notice;
      text2 += ` The trap triggers; reactive movement ${roll.success ? "succeeds" : "fails"}.`;
    }
    if (!roll.success) for (const effect2 of hazard.failure) {
      if (effect2.tag === "effect_damage") {
        resources(ctx.actor).hp = Math.max(0, resources(ctx.actor).hp - effect2.value);
        text2 += ` ${effect2.value} HP lost.`;
      }
      if (effect2.tag === "effect_sanity") text2 += ` ${changeSanity(ctx.actor, effect2.value, hazard.label)}`;
      if (effect2.tag === "effect_poison") text2 += ` ${applyPoison(ctx.actor, rng)}`;
    }
    if (!roll.success && hazard.fire && hasTrait(ctx.actor, "pyrophobic")) {
      text2 += ` ${changeSanity(ctx.actor, -1, "Pyrophobic \u2014 fire")}`;
    }
    if (hazard.reward && resources(ctx.actor).hp > 0) extra.push(offerLoot(ctx, "item_old_coin_purse"));
  } else if (room.encounter === "m2_locked_coffer") {
    if (!unlocked && approach !== "leave") roll = noncombatCheck(ctx, { stat: "DEX", dc: 11 }, rng);
    if (unlocked || roll?.success) {
      extra.push(offerLoot(ctx, "item_m2_keepsake"));
      text2 = "The coffer opens. A worn keepsake remains inside.";
    } else text2 = approach === "leave" ? "Left the coffer unopened." : "The damaged lock will not open. The attempt is spent.";
  } else if (room.family === "discovery") {
    (_a = ctx.pit).discoveries ?? (_a.discoveries = {});
    if (!ctx.pit.discoveries[room.encounter]) ctx.pit.discoveries[room.encounter] = { templateId: room.encounter, title: room.title, actor: ctx.actor.id, day: ctx.day };
    text2 = `${room.title} recorded as a persistent observation.`;
  }
  ctx.expedition.lastResult = { text: text2, check: roll };
  if (resources(ctx.actor).hp <= 0) return;
  const rewards = awardRoom(ctx, room, rng);
  ctx.expedition.lastResult.rewards = [...extra, ...rewards];
  ctx.noncombatCompleted = true;
}
function explorationSpell(ctx, spellId, rng, scrollSlot = null, scrollContainer = "equipped") {
  const spell = byId("spells", spellId);
  const cost = scrollSlot === null ? paySpell(ctx.actor, ctx.expedition, spell) : 0;
  if (scrollSlot !== null) {
    const item = ctx.actor.data.inventory[scrollContainer][scrollSlot];
    if (--item.quantity === 0) ctx.actor.data.inventory[scrollContainer][scrollSlot] = null;
  }
  ctx.expedition.lastResult = { text: `${spell.label} cast.`, cost };
  if (spell.id === "spell_heal") resources(ctx.actor).hp = Math.min(derivedActorValues(ctx.actor).maxHp, resources(ctx.actor).hp + 8);
  else if (spell.id === "spell_unlock") resolveRoom(ctx, currentRoom(ctx.expedition).encounter === "event_locked_bedroom" ? "choice_locked_bedroom_unlock" : "unlock", rng, true);
  if (scrollSlot === null) {
    const pressure = resolveSpellPressure(ctx.actor, ctx.expedition, rng);
    Object.assign(ctx.expedition.lastResult, {
      cost,
      overcast: pressure.check,
      text: `${ctx.expedition.lastResult.text} ${pressure.text}`
    });
  }
  if (spell.id === "spell_teleport" && resources(ctx.actor).sanity > 0) completeReturn(ctx, "teleport");
}

// HearthVale_Shell/src/expedition-combat.js
var offensive = (move2) => move2.damage > 0 || move2.impact > 0 || move2.onHit.length > 0;
var combatPhase = (combat) => combat.phase === "attack" && combat.moveCancelled ? "advantage" : combat.phase === "incoming" && combat.skippedAttack ? "attack" : combat.phase;
var immediateAction = (combat) => ["advantage", "counterattack"].includes(combatPhase(combat));
var enemyKnockedDown = (combat) => !!combat.enemyKnockdown || combat.committed.id === "move_recover" && !combat.legacyRecoveryMapped;
var playerKnockedDown = (combat) => !!combat.playerKnockdown || !!combat.skippedAttack;
function resumeCombat(combat) {
  migrateSpellStrain(combat);
  const phase2 = combatPhase(combat);
  combat.enemyKnockdown = enemyKnockedDown(combat);
  if (combat.committed.id === "move_recover") combat.legacyRecoveryMapped = true;
  combat.playerKnockdown = playerKnockedDown(combat);
  if (combat.skippedAttack) delete combat.skippedAttack;
  combat.phase = phase2;
}
function combatMove(move2) {
  const authored = byId("moves", move2.id);
  return {
    ...move2,
    label: move2.id === "move_close" ? "Legacy nonoffensive commitment" : authored?.label ?? move2.label,
    speed: move2.speed ?? authored?.speed ?? 0,
    qualityStat: move2.qualityStat ?? authored?.qualityStat ?? "STR"
  };
}
function canAttackWith(actor, combat, item) {
  const weapon = definitionOf(item);
  return weapon?.category === "weapon" && (!weapon.maxDurability || item.durability === void 0 || item.durability > 0) && (!weapon.ammo || resources(actor).arrows > 0);
}
function prepareRound(ctx, rng) {
  const combat = ctx.expedition.combat, definition = byId("enemies", combat.enemy.templateId);
  combat.moveCancelled = false;
  const selected = weighted(definition.moves.entries, rng);
  const move2 = byId("moves", selected.target);
  combat.committed = { ...structuredClone(move2), offensive: offensive(move2), damageType: move2.damageType ?? "physical" };
  combat.phase = "attack";
}
function startCombat(ctx, enemyId, kind, rng) {
  var _a;
  const definition = byId("enemies", enemyId), expedition = ctx.expedition;
  expedition.combat = {
    enemy: { id: `${expedition.id}_enemy_${expedition.nextEnemyInstance++}`, templateId: enemyId, hp: definition.hp },
    kind,
    round: 1,
    phase: "attack",
    committed: null,
    barrier: 0,
    enemyKnockdown: false,
    playerKnockdown: false,
    lastMove: null
  };
  if (!definition.subjective) {
    (_a = ctx.pit).knownEnemies ?? (_a.knownEnemies = []);
    witnessHound(ctx, enemyId);
    if (!ctx.pit.knownEnemies.includes(enemyId)) ctx.pit.knownEnemies.push(enemyId);
  }
  prepareRound(ctx, rng);
  expedition.lastResult = { text: `${definition.label} prepares ${expedition.combat.committed.label}.` };
}
function interruptMove(combat, impact, followup = false) {
  if (impact <= 0 || !combat.committed.offensive || impact < combat.committed.stability) return null;
  const knockdown = impact >= combat.committed.stability + 2;
  combat.enemyKnockdown || (combat.enemyKnockdown = knockdown);
  if (followup) return knockdown ? "Knockdown" : null;
  combat.moveCancelled = true;
  combat.phase = "advantage";
  combat.interrupt = knockdown ? "Knockdown" : "Stagger";
  return knockdown ? "Knockdown" : "Stagger";
}
function afterAttack(ctx, result, free = false, followup = false) {
  const combat = ctx.expedition.combat;
  const incoming = combat.counterIncoming;
  delete combat.counterIncoming;
  if (combat.enemy.hp <= 0) ctx.victory = true;
  else if (followup) {
    combat.phase = "round-result";
    combat.lastMove = combat.moveCancelled ? `${combat.committed.label} (cancelled)` : combat.lastMove;
    ctx.roundCompleted = true;
  } else combat.phase = combat.moveCancelled ? "advantage" : free ? "attack" : "incoming";
  ctx.expedition.lastResult = incoming ? { ...incoming, retaliation: result, text: `${incoming.text} Counterattack \u2014 ${result.text}` } : result;
}
function attackWeapon(ctx, slot, rng, retaliation = false) {
  const combat = ctx.expedition.combat, actor = ctx.actor, item = actor.data.inventory.equipped[slot];
  const weapon = definitionOf(item), enemy = byId("enemies", combat.enemy.templateId);
  const followup = retaliation || immediateAction(combat);
  const dodge = rollDodge(enemy.combatStats.DEX, actor.data.attributes.baseStats.DEX, weapon.speed, rng, enemyKnockedDown(combat));
  combat.enemyKnockdown = false;
  const quality = dodge.success ? null : hitQuality(weapon.qualityStat, actor.data.attributes.baseStats[weapon.qualityStat], weapon.damage, rng);
  const bow = !!weapon.ammo;
  if (bow) resources(actor).arrows--;
  const damage = quality ? Math.max(0, quality.rawDamage - enemy.defense) : 0;
  const impact = quality ? weapon.impact + (!bow && hasTrait(actor, "heavy_handed") ? 1 : 0) : 0;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
  const wearResult = bow ? null : quality ? wear(actor, slot, 1 + Number(hasTrait(actor, "heavy_handed")), rng) : null;
  const interrupt2 = quality ? interruptMove(combat, impact, followup) : null;
  afterAttack(ctx, {
    text: `${weapon.label}: ${quality ? `${quality.quality}, ${damage} damage` : "Dodged"}${interrupt2 ? followup ? "; Knockdown: next offensive action faces 0% Dodge" : `; ${interrupt2} cancels ${combat.committed.label}` : ""}.`,
    quality,
    dodge,
    damage,
    impact,
    interrupt: interrupt2,
    wear: wearResult
  }, false, followup);
}
function attackUnarmed(ctx, rng, retaliation = false) {
  const combat = ctx.expedition.combat;
  const followup = retaliation || immediateAction(combat);
  const enemy = byId("enemies", combat.enemy.templateId), stats2 = ctx.actor.data.attributes.baseStats;
  const dodge = rollDodge(enemy.combatStats.DEX, stats2.DEX, 0, rng, enemyKnockedDown(combat));
  combat.enemyKnockdown = false;
  const quality = dodge.success ? null : hitQuality("STR", stats2.STR, 1, rng);
  const damage = quality?.rawDamage ?? 0;
  combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
  afterAttack(ctx, { text: `Bare Hands: ${quality ? `${quality.quality}, ${damage} damage` : "Dodged"}.`, quality, dodge, damage, impact: 0 }, false, followup);
}
function castCombatSpell(ctx, spellId, rng, scrollSlot = null) {
  if (scrollSlot !== null) return castCombatScroll(ctx, "equipped", scrollSlot, rng);
  if (spellId === "spell_teleport") return explorationSpell(ctx, spellId, rng);
  const spell = byId("spells", spellId), combat = ctx.expedition.combat, actor = ctx.actor;
  const followup = immediateAction(combat);
  const cost = paySpell(actor, ctx.expedition, spell);
  let damage = 0, impact = 0, interrupt2 = null;
  if (spell.target === "enemy") {
    combat.enemyKnockdown = false;
    damage = spell.effects.find((e2) => e2.tag === "effect_damage")?.value ?? 0;
    impact = spell.effects.find((e2) => e2.tag === "effect_impact")?.value ?? 0;
    combat.enemy.hp = Math.max(0, combat.enemy.hp - damage);
    interrupt2 = interruptMove(combat, impact, followup);
  } else if (spell.id === "spell_heal") resources(actor).hp = Math.min(derivedActorValues(actor).maxHp, resources(actor).hp + 8);
  else if (spell.id === "spell_barrier") combat.barrier = 3;
  const pressure = resolveSpellPressure(actor, ctx.expedition, rng);
  afterAttack(ctx, {
    text: `${spell.label}: ${spell.target === "enemy" ? `${damage} damage; ${impact} Impact \u2014 automatic hit` : "applied"}${interrupt2 ? followup ? "; Knockdown: next offensive action faces 0% Dodge" : `; ${interrupt2} cancels ${combat.committed.label}` : ""}. ${pressure.text}`,
    check: null,
    overcast: pressure.check,
    damage,
    impact,
    interrupt: interrupt2,
    cost
  }, false, followup && spell.target === "enemy");
}
function castCombatScroll(ctx, container, slot, rng) {
  const actor = ctx.actor, combat = ctx.expedition.combat;
  const item = ["bag", "equipped"].includes(container) ? actor.data.inventory[container][slot] : null;
  if (!canCastCombatScroll(actor, combat, item, combat && combatPhase(combat))) throw new Error("Scroll is unavailable");
  if (scrollSpell(item).id === "spell_teleport") return explorationSpell(ctx, "spell_teleport", rng, slot, container);
  const spell = scrollSpell(item), label2 = definitionOf(item).label, followup = immediateAction(combat);
  const result = applyScrollEffects(actor, combat, spell);
  if (spell.target === "enemy") combat.enemyKnockdown = false;
  const interrupt2 = interruptMove(combat, result.impact, followup);
  item.quantity--;
  const remaining = item.quantity;
  if (!remaining) actor.data.inventory[container][slot] = null;
  afterAttack(ctx, {
    ...result,
    interrupt: interrupt2,
    check: null,
    spell: spell.id,
    scroll: item.templateId,
    spent: 1,
    remaining,
    int: actor.data.attributes.baseStats.INT,
    text: `${label2}: ${result.text}.${interrupt2 ? ` ${interrupt2}${followup ? "." : ` cancels ${combat.committed.label}.`}` : ""} 1 scroll consumed; ${remaining} remain in this stack. No Essence cost or Overcast.`
  }, false, followup);
}
function defenseValues(actor, combat, mode, item = null) {
  const natural = derivedActorValues(actor).naturalArmor, armor = definitionOf(actor.data.inventory.chest)?.defense ?? 0;
  const equipped = mode === "block" ? definitionOf(item)?.defense ?? 0 : 0, barrier = combat.barrier;
  const spell = combat.committed.damageType === "spell";
  const defense = (spell ? 0 : natural + armor + equipped) + barrier;
  const stability = actor.data.attributes.baseStats.CON + (mode === "dodge" ? 0 : armor + equipped);
  return { defense, stability };
}
function defend(ctx, mode, slot, rng) {
  const combat = ctx.expedition.combat, move2 = combatMove(combat.committed), actor = ctx.actor;
  let dodge = null, quality = null, damage = 0, defense = 0, stability = 0, wearResult = null, poison = null, knockdown = false;
  if (move2.offensive) {
    const stats2 = byId("enemies", combat.enemy.templateId).combatStats;
    if (mode === "dodge") dodge = rollDodge(actor.data.attributes.baseStats.DEX, stats2.DEX, move2.speed, rng, playerKnockedDown(combat));
    combat.playerKnockdown = false;
    if (!dodge?.success) {
      quality = hitQuality(move2.qualityStat, stats2[move2.qualityStat], move2.damage, rng);
      ({ defense, stability } = defenseValues(actor, combat, mode, mode === "block" ? actor.data.inventory.equipped[slot] : null));
      damage = Math.max(0, quality.rawDamage - defense);
      resources(actor).hp = Math.max(0, resources(actor).hp - damage);
      knockdown = move2.impact >= stability;
      combat.playerKnockdown = knockdown;
      if (mode === "block" && move2.damageType !== "spell") {
        const block = definitionOf(actor.data.inventory.equipped[slot]);
        const amount = quality.rawDamage > block.maxDurability ? 3 : quality.rawDamage > block.defense ? 2 : 1;
        wearResult = wear(actor, slot, amount, rng);
      }
      if (move2.onHit.some((effect2) => effect2.tag === "effect_poison")) poison = applyPoison(actor, rng);
    }
    combat.barrier = 0;
  }
  combat.lastMove = move2.label;
  combat.phase = "round-result";
  ctx.roundCompleted = true;
  ctx.expedition.lastResult = {
    text: `${move2.label}: ${!move2.offensive ? "legacy nonoffensive action completed" : dodge?.success ? "Dodged" : `${quality.quality}, ${damage} damage`}${knockdown ? "; KNOCKED DOWN \u2014 your next turn is not skipped; Dodge is 0% against the next enemy offensive action, then Knockdown clears" : ""}${poison ? `; ${poison}` : ""}.`,
    dodge,
    quality,
    damage,
    defense,
    stability,
    knockdown,
    wear: wearResult
  };
  if (mode === "counter" && resources(actor).hp > 0) {
    combat.counterIncoming = ctx.expedition.lastResult;
    combat.phase = "counterattack";
    ctx.roundCompleted = false;
  }
}
function nextCombatPhase(ctx, rng) {
  const combat = ctx.expedition.combat;
  if (combat.phase === "cancelled") {
    combat.lastMove = `${combat.committed.label} (cancelled)`;
    combat.phase = "round-result";
    ctx.roundCompleted = true;
    ctx.expedition.lastResult = {
      ...ctx.expedition.lastResult,
      text: `${ctx.expedition.lastResult.text} ${combat.committed.label} was cancelled. The round ends.`
    };
  } else {
    combat.round++;
    prepareRound(ctx, rng);
  }
}

// HearthVale_Content/death.js
var deathScars = Object.freeze({
  combat: { templateId: "scar_battle_mark", label: "Battle Mark" },
  hazard: { templateId: "scar_pit_injury", label: "Pit Injury" },
  Poison: { templateId: "scar_poison_trauma", label: "Poison Trauma" },
  rescue: { templateId: "scar_lost_arm", label: "Lost Arm" }
});

// HearthVale_Shell/src/life-record.js
function buildLifeRecord(world, actor) {
  const death = actor.data.death, pit = world.entities.hv_pit_1.data, facts = /* @__PURE__ */ new Map();
  const add = (id2, kind, text2, source, day, year) => facts.set(id2, {
    id: id2,
    kind,
    text: text2,
    source,
    ...day === void 0 ? {} : { day },
    ...year === void 0 ? {} : { year }
  });
  const depth = actor.data.deepestPitFloor;
  if (depth > 1) add("pit-depth", "pit", `Reached Pit Floor ${depth}.`, { actor: actor.id, field: "deepestPitFloor" });
  for (const [id2, d] of Object.entries(pit.discoveries ?? {})) if (d.actor === actor.id)
    add(`discovery:${id2}`, "discovery", `Discovered ${d.title}.`, { entity: "hv_pit_1", field: "discoveries", key: id2 }, d.day, d.year);
  const clear = firstGuardianClear(world, pit);
  if (clear?.actor === actor.id) add(
    "guardian:ruin-brute",
    "guardian",
    "First cleared the Ruin Brute.",
    { entity: "hv_pit_1", field: pit.guardianFirstClear ? "guardianFirstClear" : "guardianDefeated" },
    clear.day,
    clear.year
  );
  for (const [index, m] of (world.globals.hearthvaleServices?.materialRecords ?? []).entries()) if (m.actor === actor.id)
    add(`material:${m.item}`, "material", m.event, { global: "hearthvaleServices", field: "materialRecords", index }, m.day, m.year);
  for (const s of Object.values(world.entities)) if (s.lifecycle === "resolved" && s.data?.resolver === actor.id && s.data.record?.event)
    add(`situation:${s.id}`, "situation", s.data.record.event, { entity: s.id, field: "record" }, s.data.resolvedDay, s.data.record.year);
  for (const [index, m] of (actor.data.memories ?? []).entries()) {
    if (m.situation && m.actor === actor.id && !facts.has(`situation:${m.situation}`))
      add(`situation:${m.situation}`, "situation", m.event, { actor: actor.id, memory: index }, m.day, m.year);
    if (m.kind === "rescue" && (m.actor === actor.id || m.rescuer === actor.id))
      add(m.id, "rescue", m.event, { actor: actor.id, memory: index }, m.day, m.year);
    if (m.event === "event_injured_adventurer" && m.value === 2 && world.entities[m.actor]?.actor)
      add(
        `help:${m.actor}:${m.day}`,
        "relationship",
        `Helped the injured ${world.entities[m.actor].data.identity.name}.`,
        { actor: actor.id, memory: index },
        m.day,
        m.year
      );
  }
  for (const [index, scar] of (actor.data.scars ?? []).entries()) if (scar.label)
    add(scar.id ?? `scar:${index}`, "scar", scar.label, { actor: actor.id, scar: index }, scar.day, scar.year);
  return {
    version: 1,
    actor: actor.id,
    name: actor.data.identity.name,
    generation: actor.data.generation ?? 1,
    ...actor.data.arrived ? { arrived: structuredClone(actor.data.arrived) } : {},
    death: structuredClone(death),
    facts: [...facts.values()]
  };
}
function deathTransition(world, actor) {
  return {
    actor: actor.id,
    record: actor.data.death.id,
    status: world.globals.hearthvaleCompletion?.completed || world.globals.hearthvaleSurface.calendar.day === 40 ? "completion-pending" : "succession-ready"
  };
}

// HearthVale_Shell/src/death.js
var resources2 = (actor) => actor.data.attributes.resources;
function recordHeartLoss(actor, { cause, day, year = 1, floor = null, expedition = null }, from, to) {
  var _a, _b;
  const sequence = (actor.data.heartLossSequence ?? 0) + 1;
  actor.data.heartLossSequence = sequence;
  const id2 = `heart-loss:${actor.id}:${sequence}`;
  const fact = {
    id: id2,
    actor: actor.id,
    kind: "heart-loss",
    cause,
    day,
    year,
    floor,
    expedition,
    from,
    to,
    event: `${actor.data.identity.name} lost a Heart (${from} \u2192 ${to}) during ${cause}.`
  };
  (_a = actor.data).memories ?? (_a.memories = []);
  actor.data.memories.push(fact);
  if (from === 2 && to === 1) {
    const scar = { ...deathScars[cause] ?? deathScars.hazard, id: `scar:${id2}`, cause, day, year };
    (_b = actor.data).scars ?? (_b.scars = []);
    actor.data.scars.push(scar);
    actor.data.memories.push({
      id: scar.id,
      actor: actor.id,
      kind: "serious-injury",
      day,
      year,
      event: `${actor.data.identity.name} acquired ${scar.label} during ${cause}.`
    });
  }
  return fact;
}
function availableAuron(world) {
  const s = world.globals.hearthvaleSurface;
  if (!s?.playerId || s.calendar.year < 1 || world.globals.hearthvaleCompletion?.completed) return null;
  return Object.values(world.entities).find((a) => a.data?.templateId === "actor_auron" && a.actor && a.lifecycle === "active" && !a.data.death && resources2(a).hearts > 0 && resources2(a).hp > 0 && resources2(a).sanity > 0 && a.data.protectionUnavailable !== true && !a.data.missing && ["loc_guild", "loc_pit_entrance", "hv_pit_1"].includes(a.primaryLocation)) ?? null;
}
function deathEvents(world) {
  var _a, _b;
  const s = world.globals.hearthvaleSurface, original = world.entities[s?.playerId], pit = world.entities.hv_pit_1?.data;
  if (!original?.actor || !pit) return [];
  if (original.data.death) {
    if (original.data.lifeRecord) return [];
    return [{ type: "hearthvale.life-record-archived", effects: [
      { type: "data", entity: original.id, key: "lifeRecord", value: buildLifeRecord(world, original) },
      { type: "global", key: "hearthvaleDeathTransition", value: deathTransition(world, original) }
    ] }];
  }
  const r = resources2(original), pending = pit.pendingDeath ?? pit.pendingFinalHeart;
  if (!pending && r.hearts > 0 && r.sanity > 0) return [];
  if (pending && pending.actor !== original.id) return [];
  const actor = structuredClone(original), ar = resources2(actor);
  const context2 = { day: s.calendar.day, year: s.calendar.year, ...pending };
  const sanity = r.sanity <= 0 || pit.pendingDeath?.cause === "sanity";
  const rescuer = !sanity && r.hearts === 1 && pit.pendingFinalHeart ? availableAuron(world) : null;
  const effects2 = [], changed = [actor];
  let fact;
  if (rescuer) {
    const auron = structuredClone(rescuer), before = resources2(auron).hearts;
    resources2(auron).hearts--;
    const count = (auron.data.rescueCount ?? 0) + 1;
    auron.data.rescueCount = count;
    const memoryStart = auron.data.memories?.length ?? 0, services2 = economyState(world), trainingWasUnlocked = services2.auronTrainingUnlocked === true;
    recordHeartLoss(auron, { ...context2, cause: "rescue" }, before, before - 1);
    ar.hearts = 1;
    ar.hp = Math.ceil(derivedActorValues(actor).maxHp / 2);
    fact = {
      id: `auron-rescue:${auron.id}:${count}`,
      actor: actor.id,
      rescuer: auron.id,
      kind: "rescue",
      day: context2.day,
      year: context2.year,
      cause: context2.cause,
      expedition: context2.expedition ?? null,
      floor: context2.floor ?? null,
      defeated: true,
      heartLossPrevented: true,
      trainingUnlocked: !trainingWasUnlocked,
      auronHeartsBefore: before,
      auronHeartsAfter: before - 1,
      event: `Auron rescued ${actor.data.identity.name} from final-Heart loss (${before} \u2192 ${before - 1} Hearts).`
    };
    (_a = actor.data).memories ?? (_a.memories = []);
    actor.data.memories.push(fact);
    auron.data.memories.push(fact);
    if (before === 1) {
      auron.data.death = { id: `death:${auron.id}`, cause: "final-heart-rescue", day: context2.day, year: context2.year, actor: auron.id };
      auron.data.memories.push({ ...auron.data.death, kind: "death", event: "Auron died rescuing an adventurer." });
      fact.auronDied = true;
      fact.event += " Auron died performing the rescue.";
      effects2.push({ type: "retire", entity: auron.id });
    }
    if (before === 2) fact.event += " Auron lost an arm.";
    if (!trainingWasUnlocked) fact.event += " Training with Auron unlocked.";
    changed.push(auron);
    services2.auronTrainingUnlocked = true;
    services2.auronTrainingPending = false;
    services2.auronTrainingIntroduced = true;
    effects2.push({ type: "global", key: "hearthvaleServices", value: services2 });
    for (const witness of [actor, auron]) for (const memory of auron.data.memories.slice(memoryStart))
      effects2.push({ type: "learn", actor: witness.id, claim: {
        subject: memory.actor,
        key: memory.id,
        value: { ...memory, topic: memory.id, domain: "adventurers", observedDay: memory.day, text: memory.event }
      } });
  } else {
    if (!sanity && r.hearts === 1) recordHeartLoss(actor, context2, 1, 0);
    if (!sanity) ar.hearts = 0;
    fact = {
      id: `death:${actor.id}`,
      actor: actor.id,
      kind: "death",
      cause: sanity ? "sanity" : context2.cause ?? "heart-loss",
      causeKind: sanity ? "sanity" : "final-heart-loss",
      day: context2.day,
      year: context2.year,
      floor: context2.floor ?? null,
      expedition: context2.expedition ?? null,
      event: `${actor.data.identity.name} died from ${sanity ? "Sanity loss" : context2.cause ?? "Heart loss"}.`
    };
    actor.data.death = fact;
    (_b = actor.data).memories ?? (_b.memories = []);
    actor.data.memories.push(fact);
    actor.data.lifeRecord = buildLifeRecord(world, actor);
    effects2.push({ type: "global", key: "hearthvaleDeathTransition", value: deathTransition(world, actor) });
    effects2.push({ type: "retire", entity: actor.id });
    if (pit.expedition) {
      ar.essence = 0;
      actor.data.expeditionHp = 0;
      effects2.push(
        { type: "data", entity: "hv_pit_1", key: "lastExpedition", value: {
          id: pit.expedition.id,
          reason: "death",
          deepestFloor: pit.expedition.deepestFloor,
          day: context2.day
        } },
        { type: "data", entity: "hv_pit_1", key: "expedition", value: null }
      );
    }
    if (context2.expedition || pit.expedition) effects2.push({ type: "move", entity: actor.id, location: "hv_pit_1" });
  }
  actor.data.deathAdjudication = { status: rescuer ? "rescued" : "dead", ...fact };
  for (const a of changed) for (const [key, value] of Object.entries(a.data))
    if (JSON.stringify(value) !== JSON.stringify(world.entities[a.id].data[key])) effects2.push({ type: "data", entity: a.id, key, value });
  effects2.push(
    { type: "data", entity: "hv_pit_1", key: "pendingFinalHeart", value: null },
    { type: "data", entity: "hv_pit_1", key: "pendingDeath", value: null },
    { type: "data", entity: "hv_pit_1", key: "lastResult", value: { actor: actor.id, day: context2.day, year: context2.year, text: fact.event } }
  );
  return [{ type: rescuer ? "hearthvale.auron-rescue" : "hearthvale.player-death", data: fact, effects: effects2 }];
}

// HearthVale_Shell/src/expedition-lifecycle.js
function validateExpeditionState(world) {
  const pit = world.entities.hv_pit_1?.data, expedition = pit?.expedition;
  validateRoomDeck(pit);
  if (!expedition) return;
  const actor = world.entities[expedition.actor], floor = expedition.floor;
  const integer2 = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
  const invalid = () => {
    throw new Error("Invalid expedition snapshot");
  };
  if (expedition.active !== true || actor?.id !== world.globals.hearthvaleSurface.playerId || actor.primaryLocation !== "hv_pit_1" || !integer2(expedition.strain) || !integer2(expedition.deepestFloor, 1) || expedition.deepestFloor > 10 || !integer2(floor?.number, 1) || floor.number > 10 || !integer2(floor.attempt, 1) || !Array.isArray(floor.rooms) || !Array.isArray(floor.prefixTail) || !Array.isArray(expedition.pendingLoot) || !integer2(expedition.roomIndex, -1) || expedition.roomIndex >= floor.rooms.length) invalid();
  if (floor.number < 10 && (floor.rooms.length < 3 || floor.rooms.length > 4 || floor.rooms.filter((r) => r.family === "combat").length > 2 || new Set(floor.rooms.map((r) => r.encounter)).size !== floor.rooms.length)) invalid();
  if (floor.number === 10 && (floor.rooms.length !== 1 || floor.rooms[0].family !== "fixed")) invalid();
  for (const room of floor.rooms) {
    if (typeof room.resolved !== "boolean" || !["combat", "resource", "hazard", "treasure", "event", "empty", "discovery", "fixed"].includes(room.family)) invalid();
  }
  if (!["hp", "hearts", "ap", "arrows", "essence", "gold", "xp"].every((key) => integer2(resources(actor)[key]))) invalid();
  const combat = expedition.combat;
  if (combat && (!byId("enemies", combat.enemy?.templateId) || !integer2(combat.enemy.hp) || !["attack", "incoming", "advantage", "counterattack", "cancelled", "round-result"].includes(combat.phase) || !["room", "return"].includes(combat.kind) || !combat.committed || !["damage", "impact", "stability"].every((key) => Number.isFinite(combat.committed[key]) && combat.committed[key] >= 0) || combat.committed.speed !== void 0 && !Number.isSafeInteger(combat.committed.speed) || combat.committed.qualityStat !== void 0 && !["STR", "DEX"].includes(combat.committed.qualityStat) || !Array.isArray(combat.committed.onHit) || !integer2(combat.barrier) || !integer2(combat.round, 1) || combat.spellStrain !== void 0 && !integer2(combat.spellStrain) || combat.scrollStrain !== void 0 && !integer2(combat.scrollStrain))) invalid();
}
function enterExpedition(ctx, rng, shortcut = false) {
  var _a;
  ctx.actor.data.attributes = spendSurfaceAp(ctx.actor, 1).value;
  resources(ctx.actor).essence = 0;
  (_a = ctx.actor.data).statuses ?? (_a.statuses = {});
  const sequence = (ctx.pit.expeditionSequence ?? 0) + 1;
  ctx.pit.expeditionSequence = sequence;
  ctx.expedition = ctx.pit.expedition = {
    id: `hv_expedition_${sequence}`,
    active: true,
    actor: ctx.actor.id,
    floor: shortcut ? null : generateFloor(1, 1, [], rng, null, ctx.pit, resources(ctx.actor).sanity),
    roomIndex: -1,
    deepestFloor: 1,
    strain: 0,
    combat: null,
    pendingLoot: [],
    returnPending: false,
    luckyRerollUsed: false,
    nextEnemyInstance: 1,
    lastResult: { text: "Entered Stratum 1 \u2014 Swallowed HearthVale Ruins. Expedition cost: 1 AP." }
  };
  ctx.actor.primaryLocation = ctx.pitId;
  if (shortcut) {
    ctx.expedition.floor = routeFloor(ctx, ctx.pit.sunkenSquare.floor, 1, [], rng);
    ctx.expedition.deepestFloor = ctx.expedition.floor.number;
  }
  ctx.actor.data.deepestPitFloor = Math.max(ctx.actor.data.deepestPitFloor ?? 0, ctx.expedition.deepestFloor);
}
function forward(ctx, rng) {
  const expedition = ctx.expedition;
  if (expedition.roomIndex === expedition.floor.rooms.length - 1) {
    expedition.floor = routeFloor(ctx, expedition.floor.number + 1, 1, floorTail(expedition.floor), rng);
    expedition.deepestFloor = Math.max(expedition.deepestFloor, expedition.floor.number);
    ctx.pit.deepestReachedFloor = Math.max(ctx.pit.deepestReachedFloor ?? 1, expedition.deepestFloor);
    ctx.actor.data.deepestPitFloor = Math.max(ctx.actor.data.deepestPitFloor ?? 0, expedition.deepestFloor);
    expedition.roomIndex = -1;
  } else expedition.roomIndex++;
  const room = currentRoom(expedition);
  if (room?.encounter === "event_injured_adventurer" && ctx.world) {
    const person = Object.values(ctx.world.entities).find((a) => a.actor && a.id !== ctx.actor.id && a.lifecycle === "active" && a.primaryLocation === ctx.pitId && !["actor_mira", "actor_tavi", "actor_lina", "actor_garrick"].includes(a.data.templateId) && resources(a).hp > 0 && resources(a).hp < derivedActorValues(a).maxHp);
    if (person) room.actorId = person.id;
  }
  expedition.lastResult = { text: room ? room.title : `Reached the start of Floor ${expedition.floor.number}.` };
  if (room?.family === "combat") {
    if (resources(ctx.actor).sanity === 1 && !expedition.manifestationAppeared && expedition.floor.number < 10) {
      expedition.manifestationAppeared = true;
      Object.assign(room, { encounter: "enemy_hollow_double", templateId: "room_enemy_hollow_double", title: "The Hollow Double" });
    }
    startCombat(ctx, room.encounter, "room", rng);
  }
}
function regenerateFloor(ctx, rng) {
  const old = ctx.expedition.floor;
  ctx.expedition.floor = routeFloor(ctx, old.number, old.attempt + 1, old.prefixTail, rng);
  ctx.expedition.roomIndex = -1;
  ctx.expedition.combat = null;
}
function retreat(ctx, rng) {
  regenerateFloor(ctx, rng);
  ctx.expedition.lastResult = { text: "Retreated to a newly generated start of this Floor. No Heart loss or Return Encounter." };
}
function completeReturn(ctx, reason = "return", { preservePoison = true, fullHp = false } = {}) {
  const expedition = ctx.expedition;
  resources(ctx.actor).essence = 0;
  ctx.actor.data.expeditionHp = 0;
  if (fullHp) resources(ctx.actor).hp = derivedActorValues(ctx.actor).maxHp;
  resources(ctx.actor).hp = Math.min(resources(ctx.actor).hp, derivedActorValues(ctx.actor).maxHp);
  if (!preservePoison && ctx.actor.data.statuses) delete ctx.actor.data.statuses.poison;
  ctx.actor.primaryLocation = "loc_pit_entrance";
  ctx.pit.lastExpedition = { id: expedition.id, reason, deepestFloor: expedition.deepestFloor, day: ctx.day };
  ctx.pit.lastResult = {
    ...expedition.lastResult,
    actor: ctx.actor.id,
    day: ctx.day,
    year: ctx.year ?? 1,
    text: `${expedition.lastResult.text} Expedition ended. Unused Essence lost; casting pressure reset.${preservePoison ? "" : " Poison cleared."}`
  };
  ctx.pit.expedition = null;
}
function requestReturn(ctx, rng) {
  const depth = ctx.expedition.deepestFloor, dc = depth <= 3 ? 8 : depth <= 6 ? 11 : 14;
  const result = noncombatCheck(ctx, { stat: "WIS", dc, scope: "return" }, rng);
  const known = (ctx.pit.knownEnemies ?? []).filter((id2) => byId("enemies", id2) && !byId("enemies", id2).guardian && !byId("enemies", id2).subjective);
  ctx.expedition.returnCheck = result;
  if (result.success || !known.length) {
    ctx.expedition.lastResult = { text: result.success ? "The Return route is safe." : "No known eligible enemy intercepts the Return.", check: result };
    completeReturn(ctx);
  } else {
    startCombat(ctx, pick2(known, rng), "return", rng);
    ctx.expedition.lastResult = { text: "Return Encounter: the way out is blocked. Retreat is unavailable.", check: result };
  }
}
function handleDefeat(ctx, rng, cause) {
  const r = resources(ctx.actor), returning = ctx.expedition.combat?.kind === "return";
  const outcome = ctx.expedition.lastResult;
  if (r.hearts <= 1) {
    ctx.pit.pendingFinalHeart = {
      actor: ctx.actor.id,
      expedition: ctx.expedition.id,
      cause,
      returning,
      day: ctx.day,
      floor: ctx.expedition.floor.number
    };
    ctx.expedition.lastResult = { ...outcome, text: `${outcome.text} Your last Heart is at risk. The expedition has ended; the outcome is pending.` };
    completeReturn(ctx, "final-heart-pending", { preservePoison: true });
    return;
  }
  r.hearts--;
  recordHeartLoss(ctx.actor, {
    cause,
    day: ctx.day,
    year: ctx.year ?? 1,
    floor: ctx.expedition.floor.number,
    expedition: ctx.expedition.id
  }, r.hearts + 1, r.hearts);
  const firstHeartLoss = (ctx.actor.data.heartLossSequence ?? 0) === 1;
  const unlockTraining = firstHeartLoss && ctx.services && !ctx.services.auronTrainingUnlocked;
  if (unlockTraining) {
    ctx.services.auronTrainingPending = true;
    ctx.services.auronTrainingUnlocked = true;
  }
  ctx.expedition.lastResult = { ...outcome, text: `${outcome.text} Defeated by ${cause}: lost 1 Heart; returned safely to Pit Entrance with full HP.` };
  if (unlockTraining) {
    ctx.expedition.lastResult.trainingUnlocked = true;
    ctx.expedition.lastResult.text += " Training with Auron unlocked. Auron, the Guardian Adventurer, can help you prepare after this first loss. Choose Leave, then Guild, and find Training with Auron. Each session costs 1 AP + 2 XP.";
  }
  completeReturn(ctx, returning ? "return-defeat" : "defeat", { fullHp: true, preservePoison: false });
}
function finishExpeditionAction(ctx, rng) {
  if (!ctx.pit.expedition) return;
  const combat = ctx.expedition.combat;
  if (!ctx.victory && resources(ctx.actor).hp > 0 && combat) {
    if (combat.phase === "cancelled") nextCombatPhase(ctx, rng);
    else if (combatPhase(combat) === "incoming" && !combat.committed.offensive) {
      const previous = ctx.expedition.lastResult;
      defend(ctx, "none", void 0, rng);
      ctx.expedition.lastResult = { ...previous, text: `${previous.text} ${ctx.expedition.lastResult.text}` };
    }
  }
  if (resources(ctx.actor).sanity <= 0) {
    ctx.pit.pendingDeath = {
      actor: ctx.actor.id,
      cause: "sanity",
      day: ctx.day,
      expedition: ctx.expedition.id,
      floor: ctx.expedition.floor.number,
      hp: resources(ctx.actor).hp,
      hearts: resources(ctx.actor).hearts
    };
    ctx.expedition.lastResult.text += " Sanity reached zero. The death outcome is pending.";
    completeReturn(ctx, "sanity-death-pending", { preservePoison: true });
    return;
  }
  if (ctx.victory) {
    const evidence = ctx.pit.houndEvidence?.[ctx.expedition.combat.enemy.id];
    if (evidence) evidence.status = "defeated";
    const combat2 = ctx.expedition.combat, previous = ctx.expedition.lastResult;
    const subjective = byId("enemies", combat2.enemy.templateId).subjective;
    const rewards = awardEnemy(ctx, combat2.enemy.templateId, rng);
    if (combat2.kind === "room" && !currentRoom(ctx.expedition).resolved) rewards.push(...awardRoom(ctx, currentRoom(ctx.expedition), rng));
    if (combat2.enemy.templateId === "enemy_ruin_brute") {
      playerGuardianVictory(ctx);
    }
    ctx.expedition.combat = null;
    ctx.expedition.lastResult = { ...previous, text: subjective ? `The Hollow Double comes apart without falling. For a moment, the Pit is quiet again. ${changeSanity(ctx.actor, 1, "Hollow Double defeated \u2014 Sanity restored")} ${previous.text}` : `Victory. ${previous.text}`, rewards };
    if (combat2.kind === "return") ctx.expedition.returnPending = true;
  } else {
    if (resources(ctx.actor).hp > 0 && (ctx.roundCompleted || ctx.noncombatCompleted) && tickPoison(ctx.actor)) {
      ctx.expedition.lastResult.poisonDamage = 1;
      ctx.expedition.lastResult.text += " POISONED \u2014 1 HP lost.";
    }
    if (resources(ctx.actor).hp <= 0) handleDefeat(ctx, rng, ctx.expedition.lastResult.poisonDamage ? "Poison" : ctx.expedition.combat ? "combat" : "hazard");
  }
  ctx.roundCompleted = false;
  ctx.noncombatCompleted = false;
  if (ctx.pit.expedition && ctx.expedition.combat?.phase === "round-result") {
    nextCombatPhase(ctx, rng);
  }
  if (ctx.pit.expedition && ctx.expedition.returnPending && !ctx.expedition.pendingLoot.length) completeReturn(ctx, "return-victory");
}

// HearthVale_Shell/src/expedition-actions.js
function usableSpell(actor, expedition, spell, scroll = false) {
  if (!spell || !scroll && resources(actor).essence < spellCost(actor, expedition, spell)) return false;
  const combat = expedition.combat;
  if (combat) return (combatPhase(combat) === "attack" || immediateAction(combat) && spell.target === "enemy") && !spell.explorationOnly && (spell.id !== "spell_heal" || resources(actor).hp < derivedActorValues(actor).maxHp) && (spell.id !== "spell_barrier" || !combat.barrier);
  if (spell.id === "spell_heal") return resources(actor).hp < derivedActorValues(actor).maxHp;
  if (spell.id === "spell_teleport") return true;
  const room = currentRoom(expedition);
  return spell.id === "spell_unlock" && ["m2_locked_coffer", "event_locked_bedroom"].includes(room?.encounter) && !room.resolved;
}
function expeditionChoices(world) {
  const state = world.globals.hearthvaleSurface, actor = world.entities[state?.playerId], pit = world.entities.hv_pit_1;
  if (world.globals.hearthvaleCompletion?.completed || state?.stage !== "surface" || !actor || actor.lifecycle !== "active" || actor.data.death || resources(actor).hearts <= 0 || resources(actor).sanity <= 0 || pit?.data.pendingFinalHeart || pit?.data.pendingDeath) return [];
  const choices = [], add = (type, label2, params = {}, group = "exploration") => choices.push({ type, label: label2, params, group });
  const expedition = activeExpedition(world)?.data.expedition;
  if (!expedition) {
    if (actor.primaryLocation === "loc_pit_entrance" && resources(actor).ap >= 1 && resources(actor).hp > 0) {
      add("pit.enter", "Enter Stratum 1 \u2014 1 AP");
      if (pit.data.sunkenSquare?.known && knowledgeState(world, actor.id, pit.id, "discovery-loc_sunken_square") === "Known") add("pit.enter", "Enter via Sunken Square \u2014 1 AP", { shortcut: true });
    }
    return choices;
  }
  if (expedition.actor !== actor.id || actor.primaryLocation !== pit.id || resources(actor).hp <= 0) return [];
  const inventory2 = actor.data.inventory, combat = expedition.combat, room = currentRoom(expedition);
  if (expedition.pendingLoot.length) {
    const item = expedition.pendingLoot[0];
    add("pit.loot", `Leave ${definitionOf(item).label}`, { lootId: item.id, choice: "leave" }, "loot");
    inventory2.bag.forEach((existing, bag) => add(
      "pit.loot",
      `Keep ${definitionOf(item).label}; replace Bag ${bag + 1}: ${definitionOf(existing)?.label ?? "Empty"}`,
      { lootId: item.id, choice: "replace", bag },
      "loot"
    ));
    return choices;
  }
  if (combat) {
    if (combatPhase(combat) === "incoming") {
      if (!combat.committed.offensive) add("pit.defend", "Resolve legacy nonoffensive move", { mode: "none" }, "defense");
      else {
        add("pit.defend", "Dodge", { mode: "dodge" }, "defense");
        inventory2.equipped.forEach((item, slot) => {
          if (definitionOf(item)?.canDefend && item.durability > 0) add("pit.defend", `Block with ${definitionOf(item).label}`, { mode: "block", slot }, "defense");
        });
        add("pit.defend", "Counterattack", { mode: "counter" }, "defense");
      }
      return choices;
    }
    if (["cancelled", "round-result"].includes(combat.phase)) {
      add("pit.combat-next", combat.phase === "cancelled" ? "Resolve cancelled round" : "Next round", {}, "combat");
      return choices;
    }
    inventory2.equipped.forEach((item, slot) => {
      const definition = definitionOf(item);
      if (canAttackWith(actor, combat, item)) add("pit.attack", `Attack: ${definition.label} (${definition.ammo ? "1 Arrow" : `DUR ${item.durability}`})`, { slot }, "weapons");
    });
    add("pit.unarmed", "Bare Hands \u2014 Damage 1 \xB7 Speed 0", {}, "combat");
    if (combatPhase(combat) === "attack") {
      if (combat.kind === "room") add("pit.retreat", "Retreat to Floor start", {}, "combat");
    }
  } else {
    if (room?.family === "fixed" && pit.data.strata[0].guardian.alive) add("pit.guardian", "Face the Ruin Brute");
    if (expedition.roomIndex < 0 || room?.resolved && expedition.floor.number < 10) add("pit.forward", expedition.lastResult?.discovery ? "Continue" : "Forward");
    if (room && !room.resolved && room.family !== "combat") {
      if (byId("events", room.encounter)) {
        for (const choice of eventChoices({ actor }, room)) add("pit.resolve-room", choice.label, { approach: choice.id });
      } else if (room.family === "hazard") {
        const hazard = byId("hazards", room.encounter);
        for (const approach of ["primary", "alternate"]) if (hazard[approach]) add(
          "pit.resolve-room",
          `${approach === "primary" ? "Attempt" : "Alternate approach"}: ${hazard[approach].stat} vs DC ${hazard[approach].dc}`,
          { approach }
        );
      } else {
        add("pit.resolve-room", room.encounter === "m2_locked_coffer" ? "Pick the lock: DEX vs DC 11" : { empty: "Continue through the empty Room", resource: "Gather resources", treasure: "Collect treasure", discovery: "Investigate discovery" }[room.family] ?? "Inspect and resolve", { approach: "inspect" });
        if (room.encounter === "m2_locked_coffer") add("pit.resolve-room", "Leave the coffer unopened", { approach: "leave" });
      }
    }
    add("pit.return", "Return to entrance", {}, "return");
  }
  inventory2.bag.forEach((item, slot) => {
    const spell = scrollSpell(item);
    if (item?.quantity > 0 && (combat ? canCastCombatScroll(actor, combat, item, combatPhase(combat)) : usableSpell(actor, expedition, spell, true)))
      add("pit.scroll", `Use ${definitionOf(item).label} \xD7${item.quantity}${combat ? " \u2014 1 action" : ""}`, { container: "bag", slot, id: item.id }, "bag");
    if ((!combat || !immediateAction(combat)) && canUseBag(actor, slot)) add("pit.use", `Use ${definitionOf(item).label} \xD7${item.quantity} (free)`, { slot }, "bag");
    if (!combat && definitionOf(item)?.category === "tome" && !inventory2.spells.includes(definitionOf(item).spell)) {
      const empty = inventory2.spells.indexOf(null);
      (empty >= 0 ? [empty] : [0, 1, 2, 3]).forEach((spellSlot) => add("pit.learn", `Learn ${byId("spells", definitionOf(item).spell).label}${empty >= 0 ? "" : `; replace ${byId("spells", inventory2.spells[spellSlot]).label}`}`, { bag: slot, slot: spellSlot }, "bag"));
    }
  });
  inventory2.spells.forEach((id2, slot) => {
    const spell = byId("spells", id2);
    if (usableSpell(actor, expedition, spell)) add("pit.cast", `${spell.label} \u2014 ${spellCost(actor, expedition, spell)} Essence`, { slot }, "spells");
  });
  inventory2.equipped.forEach((item, slot) => {
    const definition = definitionOf(item), spell = definition?.category === "scroll" ? byId("spells", definition.spell) : null;
    if (item?.quantity > 0 && (combat ? canCastCombatScroll(actor, combat, item, combatPhase(combat)) : usableSpell(actor, expedition, spell, true)))
      add("pit.scroll", `Use ${definition.label} \xD7${item.quantity}${combat ? " \u2014 1 action" : ""}`, { slot }, "bag");
    inventory2.bag.forEach((bagItem, bag) => {
      if ((!combat || combatPhase(combat) === "attack") && (bagItem || item) && (!bagItem || ["weapon", "shield"].includes(definitionOf(bagItem).category)))
        add(
          "pit.swap",
          `Equipped ${slot + 1} \u2194 Bag ${bag + 1}: ${definitionOf(bagItem)?.label ?? "Empty"}`,
          { equipped: slot, bag },
          "swap"
        );
    });
  });
  return choices;
}
function resolveIntention(ctx, type, params, rng) {
  switch (type) {
    case "pit.enter":
      enterExpedition(ctx, rng, params.shortcut);
      break;
    case "pit.guardian":
      startCombat(ctx, "enemy_ruin_brute", "room", rng);
      break;
    case "pit.forward":
      forward(ctx, rng);
      break;
    case "pit.resolve-room":
      resolveRoom(ctx, params.approach, rng);
      break;
    case "pit.return":
      requestReturn(ctx, rng);
      break;
    case "pit.retreat":
      retreat(ctx, rng);
      break;
    case "pit.attack":
      attackWeapon(ctx, params.slot, rng);
      break;
    case "pit.unarmed":
      attackUnarmed(ctx, rng);
      break;
    case "pit.defend":
      defend(ctx, params.mode, params.slot, rng);
      break;
    case "pit.combat-next":
      nextCombatPhase(ctx, rng);
      break;
    case "pit.scroll": {
      const container = params.container ?? "equipped", spell = scrollSpell(ctx.actor.data.inventory[container][params.slot]);
      if (ctx.expedition.combat) castCombatScroll(ctx, container, params.slot, rng);
      else explorationSpell(ctx, spell.id, rng, params.slot, container);
      break;
    }
    case "pit.cast": {
      const id2 = ctx.actor.data.inventory.spells[params.slot];
      const cast = ctx.expedition.combat ? castCombatSpell : explorationSpell;
      cast(ctx, id2, rng);
      break;
    }
    case "pit.use":
      ctx.expedition.lastResult = useBag(ctx.actor, params.slot, rng);
      break;
    case "pit.learn":
      ctx.expedition.lastResult = learn(ctx.actor, params.bag, params.slot);
      break;
    case "pit.swap":
      swap(ctx.actor, params.equipped, params.bag);
      if (ctx.expedition.combat) ctx.expedition.combat.phase = ctx.expedition.combat.moveCancelled ? "cancelled" : "incoming";
      ctx.expedition.lastResult = { text: "Swapped one Equipped/Bag slot." };
      break;
    case "pit.loot":
      ctx.expedition.lastResult = settleLoot(ctx, params);
      break;
    default:
      throw new Error("Unknown expedition intention");
  }
}
var sameParams = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => a[key] === b[key]);
var types = ["enter", "guardian", "forward", "resolve-room", "return", "retreat", "attack", "unarmed", "defend", "combat-next", "cast", "scroll", "use", "learn", "swap", "loot"];
var expeditionActions = Object.fromEntries(types.map((name) => {
  const type = `pit.${name}`;
  return [type, {
    eligible: ({ world, attempt }) => attempt.actor === world.globals.hearthvaleSurface.playerId && expeditionChoices(world).some((choice) => choice.type === type && sameParams(choice.params, attempt.params)),
    resolve: ({ world, attempt }, { rng }) => {
      const originalActor = world.entities[attempt.actor], originalPit = world.entities.hv_pit_1;
      const actor = structuredClone(originalActor), pit = structuredClone(originalPit.data), services2 = economyState(world);
      const ctx = { world, actor, pit, services: services2, pitId: originalPit.id, expedition: pit.expedition, day: world.globals.hearthvaleSurface.calendar.day, year: world.globals.hearthvaleSurface.calendar.year };
      if (ctx.expedition?.combat) resumeCombat(ctx.expedition.combat);
      resolveIntention(ctx, type, attempt.params, rng);
      if (type === "pit.resolve-room" && ctx.expedition?.lastResult.discovery && knowledgeState(world, actor.id, originalPit.id, "discovery-loc_sunken_square") !== "Known")
        ctx.expedition.lastResult.text += " Future expeditions can enter via Sunken Square from the Pit Entrance.";
      finishExpeditionAction(ctx, rng);
      const effects2 = [];
      effects2.push(...squareEntityEffects(world, pit));
      if (type === "pit.resolve-room" && ctx.expedition?.lastResult.discovery) effects2.push({
        type: "learn",
        actor: actor.id,
        claim: { subject: originalPit.id, key: "discovery-loc_sunken_square", value: squareInformation(pit) }
      });
      for (const [entity2, before, after] of [[actor.id, originalActor.data, actor.data], [originalPit.id, originalPit.data, pit]])
        for (const key of Object.keys(after)) if (JSON.stringify(after[key]) !== JSON.stringify(before[key]))
          effects2.push({ type: "data", entity: entity2, key, value: after[key] });
      if (JSON.stringify(services2) !== JSON.stringify(world.globals.hearthvaleServices))
        effects2.push({ type: "global", key: "hearthvaleServices", value: services2 });
      if (actor.primaryLocation !== originalActor.primaryLocation) effects2.push({ type: "move", entity: actor.id, location: actor.primaryLocation });
      for (const id2 of pit.knownEnemies ?? []) if (!(originalPit.data.knownEnemies ?? []).includes(id2)) effects2.push({
        type: "learn",
        actor: actor.id,
        claim: { subject: originalPit.id, key: `known-enemy-${id2}`, value: id2 }
      });
      for (const [id2, discovery] of Object.entries(pit.discoveries ?? {})) if (id2 !== "loc_sunken_square" && !originalPit.data.discoveries?.[id2]) effects2.push({
        type: "learn",
        actor: actor.id,
        claim: { subject: originalPit.id, key: `discovery-${id2}`, value: { ...discovery, tag: "info_discovery" } }
      });
      for (const rumor of (actor.data.rumors ?? []).slice(originalActor.data.rumors?.length ?? 0)) effects2.push({ type: "learn", actor: actor.id, claim: { subject: originalPit.id, key: `rumor-${rumor.subject}`, value: { ...rumor, templateId: rumor.subject }, certainty: "uncertain" } });
      return { type: `hearthvale.${type}`, data: { expedition: ctx.expedition?.id ?? null }, effects: effects2 };
    }
  }];
}));

// HearthVale_Shell/src/training.js
function trainingRequirement(actor, stat2) {
  return Math.max(1, actor.data.attributes.baseStats[stat2] + 1 - Number(actor.data.attributes.traits.includes("trait_fast_learner")) + Number(actor.data.attributes.traits.includes("trait_slow_learner")));
}
function trainingAvailability(world, actor, state) {
  if (!state?.auronTrainingUnlocked) return { stats: [], reason: "Training with Auron is not yet unlocked." };
  if (actor.primaryLocation !== "loc_guild") return { stats: [], reason: "Visit the Guild to train with Auron." };
  const auron = Object.values(world.entities).find((a) => a.data?.templateId === "actor_auron");
  if (!auron || auron.lifecycle !== "active" || auron.data.death || auron.data.attributes.resources.hearts <= 0 || auron.primaryLocation !== "loc_guild") return { stats: [], reason: "Auron is unavailable to train at the Guild." };
  const day = world.globals.hearthvaleSurface.calendar.day, r = actor.data.attributes.resources;
  const offered = Array.from({ length: 4 }, (_, i) => STATS[(day * 4 + i) % 6]);
  const stats2 = offered.filter((stat2) => actor.data.attributes.baseStats[stat2] < 6 && !actor.data.training?.used?.includes(`${day}:${stat2}`));
  if (!stats2.length) return { stats: [], reason: "No further sessions are available for your stats today. Check again tomorrow." };
  const reason = [r.xp < 2 ? "You need 2 XP to train." : "", r.ap < 1 ? "You need 1 AP to train." : ""].filter(Boolean).join(" ");
  return { stats: reason ? [] : stats2, reason };
}
function trainingChoices(world, actor, state, add) {
  for (const stat2 of trainingAvailability(world, actor, state).stats) add("train", `Train ${stat2} \u2014 1 AP + 2 XP (${actor.data.training?.progress?.[stat2] ?? 0}/${trainingRequirement(actor, stat2)} sessions toward +1 ${stat2})`, { stat: stat2 });
}
function train(ctx, stat2) {
  var _a;
  const { actor, day } = ctx;
  const before = actor.data.attributes.baseStats[stat2];
  actor.data.attributes = spendSurfaceAp(actor, 1).value;
  actor.data.attributes.resources.xp -= 2;
  (_a = actor.data).training ?? (_a.training = { progress: {}, used: [] });
  const t = actor.data.training;
  t.used = t.used.filter((key) => key.startsWith(`${day}:`));
  t.used.push(`${day}:${stat2}`);
  t.progress[stat2] = (t.progress[stat2] ?? 0) + 1;
  if (t.progress[stat2] >= trainingRequirement(actor, stat2)) {
    actor.data.attributes.baseStats[stat2]++;
    actor.data.attributes.level = (actor.data.attributes.level ?? 1) + 1;
    t.progress[stat2] = 0;
  }
  const r = actor.data.attributes.resources;
  const progress = actor.data.attributes.baseStats[stat2] > before ? `${stat2} increased: ${before} \u2192 ${actor.data.attributes.baseStats[stat2]}. Level increased to ${actor.data.attributes.level}.` : `${stat2} progress: ${t.progress[stat2]}/${trainingRequirement(actor, stat2)} sessions toward +1 ${stat2}.`;
  ctx.state.lastResult = `${stat2} training completed with Auron. Spent 2 XP and 1 AP. ${progress} Current XP: ${r.xp}. Current AP: ${r.ap}/${r.maxAp}.`;
}

// HearthVale_Shell/src/service-actions.js
function serviceChoices(world) {
  const s = world.globals.hearthvaleSurface, actor = world.entities[s?.playerId], pit = world.entities.hv_pit_1?.data;
  if (world.globals.hearthvaleCompletion?.completed || s?.stage !== "surface" || !actor || actor.lifecycle !== "active" || actor.data.death || actor.data.attributes.resources.hearts <= 0 || actor.data.attributes.resources.sanity <= 0 || pit?.expedition || pit?.pendingFinalHeart || pit?.pendingDeath) return [];
  const state = economyState(world), choices = [];
  const add = (op, label2, params = {}) => choices.push({ type: "service.act", label: label2, params: { op, ...params } });
  economyChoices(world, actor, state, add);
  trainingChoices(world, actor, state, add);
  for (const choice of requestChoices(world, actor)) add(choice.op, choice.label, choice.params);
  for (const choice of trackingChoices(world, actor)) add(choice.op, choice.label, choice.params);
  for (const target of Object.values(world.entities)) if (target.actor && target.id !== actor.id && target.lifecycle === "active" && target.primaryLocation === actor.primaryLocation) add("talk", `Talk with ${target.data.identity.name}`, { actor: target.id });
  const inv = actor.data.inventory;
  inv.bag.forEach((item, bag) => {
    if (!item) return;
    const d = definitionOf(item);
    if (canUseBag(actor, bag)) add("use", `Use ${d.label}`, { bag });
    if (d.category === "armor") add("armor", `Wear ${d.label} DEF ${d.defense}; replace ${definitionOf(inv.chest)?.label ?? "Empty"}`, { bag });
    if (["weapon", "shield"].includes(d.category)) inv.equipped.forEach((equipped, slot) => add("swap", `Equip ${d.label}; replace slot ${slot + 1}: ${definitionOf(equipped)?.label ?? "Empty"}`, { bag, slot }));
    if (d.category === "tome" && !inv.spells.includes(d.spell)) {
      const empty = inv.spells.indexOf(null);
      (empty >= 0 ? [empty] : [0, 1, 2, 3]).forEach((slot) => add("learn", `Learn ${byId("spells", d.spell).label}; replace ${inv.spells[slot] ? byId("spells", inv.spells[slot]).label : "Empty"}`, { bag, slot }));
    }
    add("discard", `Discard ${d.label} \xD7${item.quantity} from Bag ${bag + 1}`, { bag, id: item.id });
  });
  return choices;
}
var same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
var serviceActions = { "service.act": {
  eligible: ({ world, attempt }) => attempt.actor === world.globals.hearthvaleSurface.playerId && (attempt.params?.op === "sell-bulk" ? Object.keys(attempt.params).length === 2 && serviceChoices(world).some((c) => ["sell", "sell-holding"].includes(c.params.op)) && validBulkSale(world.entities[attempt.actor], attempt.params.items) : serviceChoices(world).some((c) => same(c.params, attempt.params))),
  resolve: ({ world, attempt }, { rng }) => {
    const original = world.entities[attempt.actor], actor = structuredClone(original), state = economyState(world), p = attempt.params;
    const ctx = { world, actor, state, day: world.globals.hearthvaleSurface.calendar.day };
    const handlers = { train: () => train(ctx, p.stat), talk: () => talk(ctx, world.entities[p.actor]), use: () => {
      state.lastResult = useBag(actor, p.bag, rng).text;
    }, swap: () => swap(actor, p.slot, p.bag), learn: () => {
      state.lastResult = learn(actor, p.bag, p.slot).text;
    }, armor: () => {
      [actor.data.inventory.chest, actor.data.inventory.bag[p.bag]] = [actor.data.inventory.bag[p.bag], actor.data.inventory.chest];
    }, discard: () => {
      actor.data.inventory.bag[p.bag] = null;
    } };
    const requestEffects = p.op === "fulfill-request" ? resolveMaterialRequest(ctx, p.situation) : p.op === "talk" ? talkInformationEffects(world, actor, world.entities[p.actor]) : [];
    if (["track-opportunity", "untrack-opportunity"].includes(p.op)) {
      actor.data.trackedOpportunities = (actor.data.trackedOpportunities ?? []).filter((id2) => id2 !== p.situation);
      if (p.op === "track-opportunity") actor.data.trackedOpportunities.push(p.situation);
    } else if (p.op === "fulfill-request") state.lastResult = actor.data.memories.at(-1).event;
    else if (handlers[p.op]) handlers[p.op]();
    else resolveEconomy(ctx, p.op, p, rng);
    if (p.op === "fulfill-request") {
      const d = world.entities[p.situation].data.definition;
      if (d.stock) state.lastResult += d.stock.pool === "townSupplies" ? `. Town supplies gained ${d.stock.quantity} ${byId("items", d.stock.item).label}.` : `. The General Shop gained ${d.stock.quantity} ${byId("items", d.stock.item).label} for its shelves.`;
    }
    if (p.op === "talk" && knowledgeState(world, actor.id, "hv_pit_1", "discovery-loc_sunken_square") !== "Known" && requestEffects.some((effect2) => effect2.type === "learn" && effect2.actor === actor.id && effect2.claim.subject === "hv_pit_1" && effect2.claim.key === "discovery-loc_sunken_square" && effect2.claim.certainty === "certain"))
      state.lastResult += " Future expeditions can enter via Sunken Square from the Pit Entrance.";
    if (!["swap", "armor", "discard", "track-opportunity", "untrack-opportunity"].includes(p.op)) state.lastResultActor = actor.id;
    return { type: `hearthvale.service.${p.op}`, effects: [
      ...requestEffects,
      ...Object.entries(actor.data).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original.data[key])).map(([key, value]) => ({ type: "data", entity: actor.id, key, value })),
      { type: "global", key: "hearthvaleServices", value: state },
      ...(actor.data.knownActors ?? []).filter((id2) => !original.data.knownActors?.includes(id2)).map((id2) => ({ type: "learn", actor: actor.id, claim: { subject: id2, key: "met", value: true } })),
      ...p.op === "turn-in" ? [{ type: "learn", actor: actor.id, claim: { subject: "loc_shop", key: `material-${p.item}`, value: { templateId: p.item, known: true } } }] : []
    ] };
  }
} };
function serviceArrivalEvents(world) {
  const s = world.globals.hearthvaleSurface, original = world.entities[s?.playerId];
  if (s?.stage !== "surface" || !original || original.lifecycle !== "active" || original.data.death || world.entities.hv_pit_1.data.expedition || world.entities.hv_pit_1.data.pendingFinalHeart || world.entities.hv_pit_1.data.pendingDeath) return [];
  const state = economyState(world), events = [];
  if (original.primaryLocation === "loc_guild" && state.auronTrainingIntroduced !== true && (state.auronTrainingPending === true || state.auronTrainingUnlocked === true)) {
    const auron = Object.values(world.entities).find((a) => a.data?.templateId === "actor_auron");
    if (auron && auron.lifecycle === "active" && !auron.data.death && auron.primaryLocation === "loc_guild" && auron.data.attributes.resources.hearts > 0) {
      state.auronTrainingPending = false;
      state.auronTrainingUnlocked = true;
      state.auronTrainingIntroduced = true;
      state.auronTrainingIntroducedDay = s.calendar.day;
      state.auronTrainingIntroducedActor = original.id;
      state.lastResult = null;
      state.lastResultActor = original.id;
      events.push({ type: "hearthvale.auron-training-introduced", data: { actor: original.id, auron: auron.id, day: s.calendar.day }, effects: [{ type: "global", key: "hearthvaleServices", value: state }] });
    }
  }
  const service = byId("locations", original.primaryLocation)?.serviceActor;
  if (!service) return events;
  const target = Object.values(world.entities).find((a) => a.data?.templateId === service);
  if (!target || original.data.knownActors?.includes(target.id)) return events;
  const actor = structuredClone(original), meetingState = structuredClone(state);
  talk({ world, actor, state: meetingState, day: s.calendar.day }, target, true);
  return [...events, { type: "hearthvale.first-service-meeting", effects: [...Object.entries(actor.data).filter(([key, v]) => JSON.stringify(v) !== JSON.stringify(original.data[key])).map(([key, value]) => ({ type: "data", entity: actor.id, key, value })), { type: "global", key: "hearthvaleServices", value: meetingState }, { type: "learn", actor: actor.id, claim: { subject: target.id, key: "met", value: true } }] }];
}

// HearthVale_Shell/src/history-records.js
var terminal = /* @__PURE__ */ new Set(["resolved", "expired", "cancelled", "failed", "transformed", "invalidated"]);
var priority2 = (value) => ["death", "missing", "serious-injury"].includes(value.kind) ? 1 : ["guardian", "major-progression"].includes(value.kind) ? 2 : value.tag === "info_discovery" || value.kind === "turn-in" ? 3 : value.situation || value.topic === "public-request" && terminal.has(value.status) ? 4 : value.kind === "autonomous-accomplishment" || value.kind === "sell-holding" ? 5 : ["stock", "civic", "town-needs"].includes(value.domain) ? 6 : 7;
function knownHistory(world, holder) {
  const facts = [];
  for (const record2 of heldInformation(world, holder)) {
    const c = record2.claim, v = c.value;
    if (c.certainty !== "certain" || !v || typeof v !== "object") continue;
    if (institutions[holder] && (!institutions[holder].domains.includes(v.domain) || v.private || v.withheld)) continue;
    if (v.topic === "public-request" && !terminal.has(v.status)) continue;
    const day = v.observedDay ?? v.day;
    if (!Number.isSafeInteger(day)) continue;
    const text2 = v.text ?? (v.tag === "info_discovery" ? `${v.title ?? v.templateId} discovered by ${v.finder ?? world.entities[v.actor]?.data.identity.name ?? v.actor}.` : v.event);
    if (!text2) continue;
    facts.push({
      id: v.id ?? (v.situation || v.topic === "public-request" ? `situation:${v.situation ?? c.subject}` : `claim:${c.subject}:${v.topic ?? c.key}`),
      source: { claim: record2.id },
      day,
      priority: priority2(v),
      text: text2,
      ...v.resolver || v.actor || v.confirmedBy ? { actor: v.resolver ?? v.actor ?? v.confirmedBy } : {}
    });
  }
  const actor = world.entities[holder];
  if (actor?.actor) for (const [index, memory] of (actor.data.memories ?? []).entries()) {
    if (!memory.event || !Number.isSafeInteger(memory.day)) continue;
    facts.push({
      id: memory.id ?? (memory.situation ? `situation:${memory.situation}` : `memory:${holder}:${index}`),
      source: { actor: holder, memory: index },
      day: memory.day,
      priority: memory.situation ? 4 : priority2(memory),
      text: memory.event,
      actor: memory.actor ?? holder
    });
  }
  const guardian = world.entities.hv_pit_1?.data.guardianDefeated;
  if (guardian?.actor === holder) facts.push({
    id: "guardian:ruin-brute",
    source: { entity: "hv_pit_1", field: "guardianDefeated" },
    day: guardian.day,
    priority: 2,
    text: `Ruin Brute defeated by ${actor.data.identity.name}.`,
    actor: holder
  });
  const unique = /* @__PURE__ */ new Map();
  for (const fact of facts) if (!unique.has(fact.id)) unique.set(fact.id, fact);
  return [...unique.values()];
}
function reconcileRecordIndexes(world) {
  const refs2 = (holder) => knownHistory(world, holder).map((f) => ({ id: f.id, source: f.source }));
  const actors = Object.values(world.entities).filter((e2) => e2.actor);
  return {
    guild: refs2("loc_guild"),
    town: refs2("loc_town_hall"),
    shop: refs2("loc_shop"),
    discoveries: Object.fromEntries(actors.map((a) => [a.id, knownHistory(world, a.id).filter((f) => f.priority === 3).map((f) => ({ id: f.id, source: f.source }))])),
    actors: Object.fromEntries(actors.map((a) => [a.id, refs2(a.id)])),
    closedSituations: Object.fromEntries([...actors.map((a) => a.id), "loc_guild", "loc_town_hall", "loc_shop"].map((holder) => [holder, knownHistory(world, holder).filter((f) => f.id.startsWith("situation:")).map((f) => f.id.slice(10))]))
  };
}

// HearthVale_Shell/src/weekly.js
function weeklyDue(world) {
  const surface = world.globals.hearthvaleSurface, completedDay = surface?.calendar.day - 1;
  return surface?.stage === "surface" && world.globals.hearthvaleSituationBoundary === surface.calendar.day && completedDay > 0 && completedDay % DAYS_PER_WEEK === 0 && (world.globals.hearthvaleWeekly?.lastCompletedDay ?? 0) < completedDay;
}
function weeklyEvents(world) {
  return weeklyDue(world) ? [{ type: "hearthvale.weekly-ready", effects: [
    { type: "emit", event: { type: "hearthvale.weekly-reconcile" } }
  ] }] : [];
}
function weeklyConsequences({ event, world }) {
  if (event.event.type !== "hearthvale.weekly-reconcile" || !weeklyDue(world)) return [];
  const surface = world.globals.hearthvaleSurface, completedDay = surface.calendar.day - 1;
  const previous = world.globals.hearthvaleWeekly ?? { lastCompletedDay: 0, snapshots: [] };
  const firstDay = completedDay - DAYS_PER_WEEK + 1;
  const facts = knownHistory(world, surface.playerId).filter((f) => f.day >= firstDay && (f.day <= completedDay || f.day === completedDay + 1 && f.id.startsWith("situation:"))).filter((f) => !previous.snapshots.some((s) => s.facts.some((old) => old.id === f.id && old.text === f.text))).sort((a, b) => a.priority - b.priority || a.day - b.day || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, 5);
  const snapshot = { week: completedDay / DAYS_PER_WEEK, firstDay, completedDay, holder: surface.playerId, facts };
  return [...guardianWeeklyEffects(world), { type: "global", key: "hearthvaleWeekly", value: {
    lastCompletedDay: completedDay,
    snapshots: [...previous.snapshots, snapshot],
    records: reconcileRecordIndexes(world)
  } }];
}

// HearthVale_Shell/src/surface-succession.js
function successionAvailable(world, status2 = "succession-ready") {
  const s = world.globals.hearthvaleSurface, t = world.globals.hearthvaleDeathTransition;
  const a = world.entities[s?.playerId], pit = world.entities.hv_pit_1?.data;
  return !!(a?.data.death && a.data.lifeRecord && a.lifecycle === "retired" && a.actor?.controller === "Human" && t?.actor === a.id && t.record === a.data.death.id && t.status === status2 && s.stage === "surface" && s.calendar.day < 40 && !world.globals.hearthvaleCompletion?.completed && !pit?.expedition && !pit?.pendingDeath && !pit?.pendingFinalHeart);
}
function successionEvents(world, rng, intent) {
  const s = world.globals.hearthvaleSurface, t = world.globals.hearthvaleDeathTransition;
  if (intent.type === "succession-begin") {
    if (!successionAvailable(world)) throw new Error("Succession is unavailable");
    const candidates = generateCandidates(rng, s.nextActorInstance, Object.values(world.entities).filter((a) => a.actor && a.lifecycle === "active").map((a) => a.data.identity.name));
    return [{ type: "hearthvale.successor-candidates-generated", data: { predecessor: t.actor }, effects: [
      { type: "global", key: "hearthvaleDeathTransition", value: { ...t, status: "choosing-successor", candidates } },
      { type: "global", key: "hearthvaleSurface", value: { ...s, nextActorInstance: s.nextActorInstance + 3 } }
    ] }];
  }
  if (intent.type !== "succession-choose" || !successionAvailable(world, "choosing-successor"))
    throw new Error("Succession selection is unavailable");
  const candidate = t.candidates.find((c) => c.id === intent.id);
  if (!candidate || world.entities[candidate.id]) throw new Error("Unknown successor candidate");
  const predecessor = world.entities[t.actor];
  const successor = instantiateSurfaceActor(candidate, { location: "loc_inn" });
  successor.data.generation = (predecessor.data.generation ?? predecessor.data.lifeRecord.generation) + 1;
  successor.data.arrived = structuredClone(s.calendar);
  return [{ type: "hearthvale.successor-selected", data: { predecessor: t.actor, successor: successor.id, generation: successor.data.generation }, effects: [
    { type: "create", entity: successor },
    { type: "controller-transfer", from: predecessor.id, to: successor.id, controller: "Human", replacement: "Autonomous" },
    { type: "global", key: "hearthvaleSurface", value: { ...s, playerId: successor.id, stage: "surface" } },
    { type: "global", key: "hearthvaleDeathTransition", value: { actor: t.actor, record: t.record, status: "complete", successor: successor.id } }
  ] }];
}
function validateSuccession(world) {
  const t = world.globals.hearthvaleDeathTransition;
  if (t?.status !== "choosing-successor") return;
  if (!successionAvailable(world, "choosing-successor") || !Array.isArray(t.candidates) || t.candidates.length !== 3 || new Set(t.candidates.map((c) => c.id)).size !== 3 || t.candidates.some((c) => world.entities[c.id]))
    throw new Error("Invalid successor selection snapshot");
  t.candidates.forEach((c) => validateCandidate(c, surfaceCatalog));
}

// HearthVale_Shell/src/completion.js
var demoComplete = (world) => world.globals.hearthvaleCompletion?.completed === true;
function completionReason(before, after) {
  if (demoComplete(after)) return null;
  const s = after.globals.hearthvaleSurface, clear = firstGuardianClear(after);
  if (!firstGuardianClear(before) && clear?.actor === s.playerId) return "ruin-brute";
  if (s.calendar.day === 41 && after.globals.hearthvaleSituationBoundary === 41 && after.globals.hearthvaleWeekly?.lastCompletedDay === 40) return "chapter";
  return null;
}
function completionEvent(world, reason) {
  if (demoComplete(world)) return [];
  const s = world.globals.hearthvaleSurface, actor = world.entities[s.playerId];
  const completion = {
    completed: true,
    reason,
    year: s.calendar.year,
    day: Math.min(40, s.calendar.day),
    completedDays: reason === "chapter" ? 40 : s.calendar.day - 1,
    ...reason === "ruin-brute" ? { firstClear: structuredClone(firstGuardianClear(world)) } : {},
    ...actor.data.death ? { death: actor.data.death.id } : {}
  };
  return [{ type: "hearthvale.demo-completed", data: completion, effects: [
    { type: "global", key: "hearthvaleCompletion", value: completion },
    // The existing boundary uses the next-Day cursor internally. Freeze the
    // public calendar at Day 40 only after all ordinary reconciliation finishes.
    ...reason === "chapter" ? [{ type: "global", key: "hearthvaleSurface", value: {
      ...s,
      calendar: { ...s.calendar, day: 40, week: 8 }
    } }] : [],
    ...actor.data.death ? [{ type: "global", key: "hearthvaleDeathTransition", value: {
      actor: actor.id,
      record: actor.data.death.id,
      status: "completion-pending"
    } }] : []
  ] }];
}

// HearthVale_Shell/src/surface.js
var actions = { ...surfaceActions, ...expeditionActions, ...serviceActions };
function createSurfaceShell(openingIntent) {
  return {
    actions: {
      ...actions,
      ...Object.fromEntries(["Take", "Give", "Communicate", "Interact", "Wait"].map((type) => [type, { eligible: () => false }]))
    },
    perceive: informationPerceptions,
    consequences: weeklyConsequences,
    worldProcesses: ({ world }, { rng }) => {
      if (openingIntent?.type === "magic-introduction-seen") return [{ type: "hearthvale.magic-introduction-seen", effects: [
        { type: "global", key: "hearthvaleSurface", value: { ...surfaceState(world), magicIntroductionSeen: true } }
      ] }];
      if (demoComplete(world)) return [];
      if (openingIntent?.type === "completion-finalize") return completionEvent(world, openingIntent.reason);
      if (openingIntent?.type === "completion-death-boundary") return [{ type: "hearthvale.final-day-boundary", effects: sleepEffects(world, world.entities[surfaceState(world).playerId], rng, { rest: false }) }];
      if (openingIntent?.type.startsWith("succession-")) return successionEvents(world, rng, openingIntent);
      const deaths = deathEvents(world);
      return deaths.length ? deaths : [...openingProcess(world, rng, openingIntent), ...serviceArrivalEvents(world), ...situationDayEvents(world, rng), ...rumorEvents(world, rng), ...weeklyEvents(world)];
    }
  };
}
function validateSurfaceSave(runtime) {
  const world = runtime.snapshot().world, state = surfaceState(world);
  validateExpeditionState(world);
  validateServices(world);
  validateSuccession(world);
  if (state?.save_schema_version !== 1 || !state.initialized || !["history", "candidates", "arrival", "mira", "mira-reply", "surface"].includes(state.stage)) {
    throw new Error("Unsupported or incomplete Surface save");
  }
  const humans = Object.values(world.entities).filter((e2) => e2.actor?.controller === "Human");
  if (state.playerId ? humans.length !== 1 || humans[0].id !== state.playerId || !world.entities[state.couldHaveId]?.actor || state.candidates.length !== 0 : humans.length !== 0 || state.candidates.length !== 3) throw new Error("Invalid Surface Actor selection");
}
function createSurfaceGame({ seed = 1, saved } = {}) {
  let runtime = saved === void 0 ? createRuntime({ ...createSurfaceWorld(), seed, shell: createSurfaceShell() }) : createRuntime({ saved, shell: createSurfaceShell() });
  if (saved === void 0) {
    runtime.startScene({ kind: "hearthvale.surface-bootstrap" });
    runtime.resolveScene({ offscreenBudget: 0 });
  }
  validateSurfaceSave(runtime);
  function resolve2(intent, attempt) {
    if (demoComplete(runtime.snapshot().world)) throw new Error("Action unavailable: the demo is complete");
    const checkpoint = runtime.save();
    const before = runtime.snapshot().world;
    try {
      let settle = function(nextIntent, nextAttempt) {
        runtime = createRuntime({ saved: runtime.save(), shell: createSurfaceShell(nextIntent) });
        runtime.startScene({ kind: "hearthvale.surface" });
        if (nextAttempt) runtime.submit(nextAttempt);
        const result2 = runtime.resolveScene({ offscreenBudget: 0 });
        if (result2.phase !== "stabilized") throw new Error("Surface command exceeded its causal budget");
        return result2;
      };
      const result = settle(intent, attempt);
      let after = runtime.snapshot().world;
      const s = surfaceState(after), actor = after.entities[s.playerId];
      if (s.calendar.day === 40 && actor?.data.death && actor.data.lifeRecord) {
        settle({ type: "completion-death-boundary" });
        settle();
        after = runtime.snapshot().world;
      }
      const reason = completionReason(before, after);
      if (reason) settle({ type: "completion-finalize", reason });
      validateSurfaceSave(runtime);
      runtime = createRuntime({ saved: runtime.save(), shell: createSurfaceShell() });
      return result;
    } catch (error) {
      runtime = createRuntime({ saved: checkpoint, shell: createSurfaceShell() });
      throw error;
    }
  }
  return Object.freeze({
    snapshot: () => runtime.snapshot(),
    save: () => runtime.save(),
    expeditionChoices: () => expeditionChoices(runtime.snapshot().world),
    serviceChoices: () => serviceChoices(runtime.snapshot().world),
    // Legacy pending M2/M3 saves remain exact on load; explicitly resume their
    // adjudication without submitting an ordinary gameplay action.
    adjudicateDeath: () => {
      const world = runtime.snapshot().world, s = surfaceState(world);
      if (demoComplete(world)) return null;
      return deathEvents(world).length || s.calendar.day === 40 && world.entities[s.playerId]?.data.death ? resolve2(void 0) : null;
    },
    // Explicit compatibility resume keeps API deserialization byte-exact. The
    // player UI invokes it before rendering a loaded game, through Core actions.
    resumeFlow: () => {
      let world = runtime.snapshot().world;
      if (!demoComplete(world) && deathEvents(world).length) resolve2(void 0);
      for (let i = 0; i < 4; i++) {
        world = runtime.snapshot().world;
        const choice = expeditionChoices(world).find((c) => c.type === "pit.combat-next" || c.type === "pit.defend" && c.params.mode === "none");
        if (!choice) return;
        resolve2(void 0, { actor: surfaceState(world).playerId, type: choice.type, params: choice.params, targets: [] });
      }
      throw new Error("Unable to resume combat flow");
    },
    openingNext: () => resolve2({ type: "opening-next" }),
    acknowledgeMagicIntroduction: () => surfaceState(runtime.snapshot().world).magicIntroductionSeen ? null : resolve2({ type: "magic-introduction-seen" }),
    choose: (id2) => resolve2({ type: "choose", id: id2 }),
    beginSuccession: () => resolve2({ type: "succession-begin" }),
    chooseSuccessor: (id2) => resolve2({ type: "succession-choose", id: id2 }),
    perform: (type, params = {}) => {
      const world = runtime.snapshot().world;
      const attempt = { actor: surfaceState(world).playerId, type, params, targets: [] };
      if (!actions[type]?.eligible({ world, attempt })) throw new Error("Surface action is unavailable");
      return resolve2(void 0, attempt);
    }
  });
}

// HearthVale_Story/statuses.js
var statusDetails = Object.freeze({
  poison: Object.freeze({
    name: "POISONED",
    effect: "Lose 1 HP",
    timing: "after each completed combat round or resolved noncombat room.",
    persistence: "Does not stack. Persists until cured or cleared by ordinary Heart loss.",
    removal: "Cure: Antidote or Cleanse Tonic."
  })
});

// HearthVale_UI/surface-views.js
var escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var e = escapeHtml;
var button = (label2, command, value = "") => {
  let op = command;
  if (command === "service" || command === "expedition") {
    const action = JSON.parse(value);
    op = action.op ?? action.type;
  }
  const tone = ["new", "choose", "choose-successor", "begin-succession", "sleep", "train", "pit.enter", "pit.forward", "pit.guardian"].includes(op) ? "primary" : ["confirm-action", "discard", "sell", "sell-holding", "pit.retreat", "return-to-title"].includes(op) ? "caution" : ["close", "cancel-action", "menu"].includes(op) ? "quiet" : "standard";
  return `<button type="button" class="control ${tone}" data-command="${e(command)}" data-value="${e(value)}">${e(label2)}</button>`;
};
var tabButton = (label2, command, value, selected) => button(`${label2}${selected ? " \xB7 Selected" : ""}`, command, value).replace("<button ", `<button aria-pressed="${selected}" `);
var unavailable = (label2, reason) => `<p class="unavailable"><button type="button" disabled>${e(label2)}</button><span>${e(reason)}</span></p>`;
var list = (values) => `<ul>${values.map((value) => `<li>${e(value)}</li>`).join("")}</ul>`;
var label = (id2) => [...expeditionCatalog.items, ...expeditionCatalog.spells, ...surfaceCatalog.traits].find((t) => t.id === id2)?.label ?? id2;
var paragraphs = (lines) => lines.map((line) => `<p>${e(line)}</p>`).join("");
function statusView(actor) {
  return Object.entries(statusDetails).filter(([key]) => actor.data.statuses?.[key]).map(([, d]) => '<details class="status-detail"><summary>' + e(d.name) + "</summary><p>" + e(d.effect + " " + d.timing) + "</p><p>" + e(d.persistence) + "</p><p>" + e(d.removal) + "</p></details>").join("");
}
function hud(actor, calendar) {
  const r = actor.data.attributes.resources;
  return `<header class="hud" aria-label="Current resources">${[
    [`HP ${r.hp}/${derivedActorValues(actor).maxHp}`, "Current health; sleep restores HP."],
    [`Hearts ${r.hearts}`, "Hearts remaining in this life."],
    [sanityLabel(r), "Sanity is separate from HP; sleep does not restore it."]
  ].map(([text2, help]) => `<span class="resource" title="${e(help)}">${e(text2)}</span>`).join("")}
    <span class="hud-context">Year ${calendar.year} \xB7 Day ${calendar.day}</span><span>AP ${r.ap}/${r.maxAp}</span><span>Gold ${r.gold}</span>${statusView(actor)}</header>`;
}
function character(actor, tab = "all", world = null) {
  const { baseStats, traits, resources: r } = actor.data.attributes;
  const d = derivedActorValues(actor);
  return `<h1>${e(actor.data.identity.name)}</h1><p>Generation ${e(actor.data.generation ?? 1)} \xB7 ${actor.data.identity.age === void 0 ? "" : `Age ${e(actor.data.identity.age)} \xB7 `}Hearts ${e(r.hearts)} \xB7 HP ${e(r.hp)}/${e(d.maxHp)} \xB7 ${e(sanityLabel(r))}</p>
    ${tab !== "all" ? `<nav class="combat-tabs" aria-label="Character tabs">${["stats", "traits", "history"].map((t) => tabButton(t, "character-tab", t, t === tab)).join("")}</nav>` : ""}
    ${["all", "stats"].includes(tab) ? `<dl>${Object.entries(baseStats).map(([key, value]) => `<dt>${e(key)}</dt><dd>${e(value)}</dd>`).join("")}
    <dt>Max HP</dt><dd>${e(d.maxHp)}</dd><dt>Natural Armor</dt><dd>${e(d.naturalArmor)}</dd></dl><p>Level ${e(actor.data.attributes.level ?? 1)} \xB7 XP ${e(r.xp)}</p><h2>Training progress</h2>${list(Object.keys(baseStats).map((stat2) => `${stat2}: ${actor.data.training?.progress?.[stat2] ?? 0}/${trainingRequirement(actor, stat2)} sessions`))}` : ""}
    ${["all", "traits"].includes(tab) ? `<h2>Innate Traits</h2>${list(traits.map((id2) => `${label(id2)} \u2014 ${traitDescriptions[id2]}`))}
    <h2>Scars</h2>${actor.data.scars.length ? list(actor.data.scars.map((s) => typeof s === "string" ? s : s.label ?? "Scar")) : "<p>None.</p>"}` : ""}
    ${["all", "history"].includes(tab) ? `<h2>Personal history</h2>${actor.data.memories?.length ? list(actor.data.memories.map((m) => `${m.event} \xB7 Day ${m.day}`)) : "<p>No personal history yet.</p>"}${world ? `<h2>Relationships</h2>${list(Object.entries(actor.data.relationships ?? {}).filter(([id2]) => world.entities[id2]?.data.identity?.name).map(([id2, value]) => `${world.entities[id2].data.identity.name}: ${value}`))}` : ""}` : ""}`;
}
function inventory(actor, tab = "all") {
  const { inventory: inv, attributes: { resources: r } } = actor.data;
  const itemText = (item) => {
    if (!item) return "Empty";
    const definition = expeditionCatalog.items.find((d) => d.id === item.templateId);
    return `${label(item.templateId)} \xD7${item.quantity}${!definition?.maxDurability || item.durability === void 0 ? "" : ` \xB7 DUR ${item.durability}`}${definition?.category === "tome" ? " \xB7 Learn to add this spell; Tomes are not equipped" : ""}`;
  };
  const slots = (values, grid = true) => `<ol class="${grid ? "slot-grid" : "bag-slots"}">${values.map((value) => `<li>${e(value)}</li>`).join("")}</ol>`;
  return `<h1>Inventory</h1>${tab !== "all" ? `<nav class="inventory-tabs" aria-label="Inventory tabs">${[["equipment", "EQUIPPED"], ["bag", "BAG"], ["holdings", "COLLECTABLES"], ["spells", "SPELLS"]].map(([t, name]) => tabButton(name, "inventory-tab", t, t === tab)).join("")}</nav>` : ""}
    ${["all", "equipment"].includes(tab) ? `<h2>Equipped \xB7 4 slots</h2>${slots(inv.equipped.map(itemText))}<h2>Chest Armor</h2><p>${e(itemText(inv.chest))}</p>` : ""}
    ${["all", "bag"].includes(tab) ? `<h2>Bag \xB7 ${inv.bag.filter(Boolean).length}/8 slots</h2>${slots(inv.bag.map(itemText), false)}` : ""}
    ${["all", "spells"].includes(tab) ? `<h2>Spell Slots \xB7 4 slots</h2><p class="helper">Learned spells are reusable. Their shared Essence cost increases with repeated casting during an expedition, and casting beyond your WIS limit risks Overcast. Cast from the expedition Spells tab when a target and enough Essence are available. Scrolls are consumed Items: no Essence cost or Overcast.</p>${slots(inv.spells.map((id2) => id2 ? label(id2) : "Empty"))}` : ""}
    ${["all", "holdings"].includes(tab) ? `<h2>Resources</h2>${list([`Arrows: ${r.arrows}`, `Gold: ${r.gold}`, `XP: ${r.xp}`, `Essence: ${r.essence}`])}
    <h2>Materials</h2>${list(Object.entries(actor.data.holdings?.materials ?? {}).map(([id2, quantity]) => `${label(id2)} \xD7${quantity}`))}
    <h2>Valuables</h2>${list(Object.entries(actor.data.holdings?.valuables ?? {}).map(([id2, quantity]) => `${label(id2)} \xD7${quantity}`))}` : ""}`;
}
function candidateCards(candidates, succession = false, generation = null) {
  return (succession ? "<h1>Who will you follow next?</h1><p>Three more adventurers arrive in HearthVale. A different person, in the same town.</p>" : "<h1>Choose your adventurer</h1><p>Three arrivals. A different life ahead of each.</p>") + (succession && generation ? `<p>Generation ${e(generation)} \xB7 Choose one adventurer to follow.</p>` : "") + candidates.map((candidate) => {
    const actor = instantiateSurfaceActor(candidate);
    const r = actor.data.attributes.resources, d = derivedActorValues(actor);
    const profile = `<h2>${e(candidate.label)}</h2><p class="muted">Age ${candidate.age} \xB7 Hearts ${r.hearts} \xB7 HP ${r.hp}/${d.maxHp} \xB7 Sanity ${r.sanity}/${r.maxSanity}</p><h3>Starting stats</h3><dl class="candidate-stats">${Object.entries(actor.data.attributes.baseStats).map(([stat2, value]) => `<div><dt>${e(stat2)}</dt><dd>${value}</dd></div>`).join("")}</dl><p class="candidate-traits">${actor.data.attributes.traits.map(label).map(e).join(" \xB7 ")}</p>`;
    const magicStarter = !succession && candidate.loadout.weapons.length === 1 && candidate.loadout.weapons[0] === "item_bow" && candidate.loadout.spells[0] === "spell_fireball";
    return `<article class="candidate-card" aria-label="${e(candidate.label)} candidate">${profile}${magicStarter ? '<p class="status-badge">Learned Fireball + Bow starter</p>' : ""}
      <h3>Starting loadout</h3>${list([
      ...candidate.loadout.weapons.map(label),
      "Chest Armor",
      "1 Basic HP Potion",
      `${candidate.loadout.arrows} Arrows \xB7 45 Gold \xB7 0 XP \xB7 0 Essence`,
      `4 Spell Slots \xB7 ${candidate.loadout.spells.length ? candidate.loadout.spells.map(label).join(", ") : "No starting spell"}`
    ])}
      ${button(`Choose ${candidate.label}`, succession ? "choose-successor" : "choose", candidate.id)}
      <details><summary>Traits and spell guidance</summary>${list(actor.data.attributes.traits.map((id2) => `${label(id2)} \u2014 ${traitDescriptions[id2]}`))}<p class="helper">Learned spells are reusable; repeated casting during an expedition increases Essence cost and risks Overcast beyond your WIS limit. Scrolls are carried Items: consumed on use, with no Essence cost or Overcast.</p></details></article>`;
  }).join("");
}
function surfaceLocation(world, actor, services2 = "") {
  if (actor.primaryLocation === "loc_surface") return `<p class="eyebrow">The town beside the Pit</p><h1>HearthVale</h1>
    <p>The streets are yours to explore. Moving costs no AP.</p><nav class="actions destination-grid" aria-label="Surface destinations">${surfaceCatalog.locations.map((l) => button(l.id === "loc_guild" && world.globals.hearthvaleServices?.auronTrainingUnlocked ? `${l.label} \u2014 Training with Auron` : l.label, "move", l.id)).join("")}</nav>`;
  const place = surfaceCatalog.locations.find((l) => l.id === actor.primaryLocation);
  const people = Object.values(world.entities).filter((a) => a.actor && a.id !== actor.id && a.lifecycle === "active" && a.primaryLocation === actor.primaryLocation);
  return `<p class="eyebrow">HearthVale \xB7 Surface</p><h1>${e(place.label)}</h1><p>${e(locationDescriptions[place.id])}</p>
    <p class="here-now"><strong>Here now:</strong> ${people.length ? people.map((a) => e(a.data.identity.name)).join(" \xB7 ") : "No one else nearby."}</p>
    ${place.id === "loc_inn" ? `<div class="actions">${button("Sleep / End Day", "sleep-prompt")}</div>` : ""}
    ${services2}<div class="leave">${button("Leave", "move", "loc_surface")}</div>`;
}

// HearthVale_Story/expedition.js
var roomProse = {
  combat: "Something moves among the remains of the old town.",
  resource: "Roots and pale growth push through cracks in the stone.",
  hazard: "The way forward is unstable. Choose your approach.",
  treasure: "A small pocket of belongings escaped the collapse.",
  event: "An ordinary piece of the old town has survived down here.",
  empty: "Nothing stirs among the bare foundations.",
  discovery: "A recognizable remnant gives this place a name worth remembering.",
  fixed: "A heavy silence hangs beyond the threshold."
};
var resolvedRoomProse = "This Room is resolved. You can continue forward or Return.";
function equipmentEffectText(effects2) {
  return effects2.map(({ tag: tag2, value }) => ({
    effect_damage: `${value} damage`,
    effect_impact: `${value} Impact`,
    effect_heal: `Restore up to ${value} HP`,
    effect_defense: `Barrier ${value} until the next enemy offensive action resolves; no Stability bonus`,
    effect_cure: "Cure Poison",
    effect_expedition_hp: `+${value} Max HP for this expedition`,
    effect_unlock: "Open a locked container or door during exploration",
    effect_return: "Return to the Pit Entrance without a Return encounter"
  })[tag2]).filter(Boolean).join(" \xB7 ");
}

// HearthVale_UI/expedition-views.js
var buttons = (choices) => choices.map((choice) => button(choice.label, "expedition", JSON.stringify({ type: choice.type, params: choice.params }))).join("");
var itemName = (item) => item ? byId("items", item.templateId)?.label ?? item.templateId : "Empty";
var signed = (n) => n > 0 ? `+${n}` : `${n}`;
var dodgeFormula = (d) => `Defender DEX ${d.defenderDEX} - (Attacker DEX ${d.attackerDEX} + Speed ${d.speed}) = ${d.difference} \u2192 ${d.chance}% Dodge`;
function combatRolls(result) {
  const q = result.quality, d = result.dodge;
  return `${d ? `<p class="check-math">${escapeHtml(dodgeFormula(d))}. ${d.roll === null ? "No Dodge draw at 0%." : `Roll ${d.roll}: ${d.success ? "Dodged" : "Connected"}.`}</p>` : ""}
    ${q ? `<p class="check-math">d20 ${q.die} + ${escapeHtml(q.stat)} ${q.value} = ${q.total}: ${q.quality} \xD7${q.multiplier} \u2192 raw Damage ${q.rawDamage} (rounded up).</p>` : ""}
    ${result.retaliation ? `<p>Retaliation:</p>${combatRolls(result.retaliation)}` : ""}`;
}
function rewardDetails(reward) {
  const item = byId("items", reward.item);
  const destination = { pending: "Bag full; decision required", bag: "Bag", holdings: "Collectables" }[reward.destination];
  return (destination ? " \u2014 " + destination : "") + (item?.sellValue ? "; sell for " + item.sellValue * reward.quantity + "G at the General Shop" : "") + (item?.category === "weapon" ? "; replacement weapon" : "");
}
function resultView(result, devMode2 = false) {
  if (!result) return "";
  const roll = result.check;
  return `<section class="outcome" aria-label="Resolved outcome">${result.trainingUnlocked ? "<h2>Training with Auron unlocked</h2>" : '<h2 class="outcome-heading">Recent outcome</h2>'}<p>${escapeHtml(result.text)}</p>${devMode2 && roll ? `<p class="check-math">d20 ${escapeHtml(roll.rolls.join(", "))} \u2192 ${roll.die} + ${escapeHtml(roll.stat)} ${roll.value} ${roll.bonus >= 0 ? "+" : "\u2212"} ${Math.abs(roll.bonus)} = ${roll.total} vs DC ${roll.dc}: <strong>${roll.success ? "Success" : "Failure"}</strong></p>` : ""}
    ${roll?.reroll ? "<p>Lucky Bastard used its expedition reroll; the better result was kept.</p>" : ""}
    ${result.rewards?.length ? `<ul>${result.rewards.map((reward) => `<li>${escapeHtml({ xp: "XP", gold: "Gold", arrows: "Arrows", essence: "Essence" }[reward.resource] ?? byId("items", reward.item)?.label ?? "Reward")} +${reward.quantity}${escapeHtml(rewardDetails(reward))}</li>`).join("")}</ul>` : ""}
    ${devMode2 && roll?.trigger ? `<p>Initial trap check: ${escapeHtml(roll.trigger.stat)} total ${roll.trigger.total} vs DC ${roll.trigger.dc}: ${roll.trigger.success ? "Success" : "Failure"}. The roll above is the triggered reaction.</p>` : ""}
    ${devMode2 && result.defense !== void 0 ? `<p>Defense applied: ${result.defense}. Damage taken: ${result.damage}.</p>` : ""}
    ${devMode2 ? combatRolls(result) : ""}${devMode2 && result.overcast ? `<p class="check-math">Overcast: d20 ${escapeHtml(result.overcast.rolls.join(", "))} \u2192 ${result.overcast.total} vs DC ${result.overcast.dc}: ${result.overcast.success ? "Success" : "Failure"}</p>` : ""}${devMode2 && result.spell ? `<p>Scroll effect: ${escapeHtml(result.spell)} \xB7 INT ${result.int}. No Essence cost or Overcast.</p>` : ""}
    ${[result.wear, result.retaliation?.wear].filter(Boolean).map((wear2) => `<p>${escapeHtml(byId("items", wear2.item)?.label)}: ${wear2.loss} DUR lost${wear2.prevented ? "; 1 wear prevented" : ""}${wear2.destroyed ? "; destroyed after the action" : ""}.</p>`).join("")}</section>`;
}
function expeditionHud(actor, expedition) {
  const r = actor.data.attributes.resources;
  return `<aside class="expedition-hud" aria-label="Expedition resources"><span>Floor ${expedition.floor.number} \xB7 ${expedition.roomIndex < 0 ? "Start" : `Room ${expedition.roomIndex + 1}/${expedition.floor.rooms.length}`}</span>
    <span>Arrows ${r.arrows}</span><span>Essence ${r.essence}</span>${actor.data.inventory.spells.some(Boolean) ? `<span>Next learned cast ${spellCost(actor, expedition)} Essence</span>` : ""}
    ${expedition.combat?.barrier ? `<span class="status-badge">Barrier ${expedition.combat.barrier} (next enemy offensive action)</span>` : ""}${actor.data.expeditionHp ? `<span>Bigshroom +${actor.data.expeditionHp} Max HP</span>` : ""}</aside>`;
}
function pitEntrance(world, actor, choices, devMode2 = false) {
  const pit = world.entities.hv_pit_1, r = actor.data.attributes.resources;
  return `<p class="eyebrow">Stratum 1</p><h1>Pit Entrance</h1><p>Swallowed HearthVale Ruins</p>
    <h2>Supplies and status</h2><p>Arrows ${r.arrows} \xB7 HP Potions ${actor.data.inventory.bag.filter((i) => i?.templateId === "item_hp_potion_basic").reduce((sum, i) => sum + i.quantity, 0)} \xB7 AP ${r.ap}/${r.maxAp}</p>
    <p>Bag ${actor.data.inventory.bag.filter(Boolean).length}/8. The entire expedition costs 1 AP; Rooms and Floors cost no further AP. Return costs 0 AP and may involve an encounter.</p><p>${actor.data.statuses?.poison ? statusDetails.poison.name : "No Poison"}. Expeditions begin with 0 Essence and fresh casting pressure.</p>
      ${currentPitResult(world, actor) ? resultView(pit.data.lastResult, devMode2) : ""}<div class="actions primary-actions">${buttons(choices)}</div>
    ${!choices.length ? "<p>You have no available entry action. Check your AP and condition.</p>" : ""}
    <div class="leave">${button("Leave", "move", "loc_surface")}</div>`;
}
function currentPitResult(world, actor) {
  const pit = world.entities.hv_pit_1.data, result = pit.lastResult, calendar = world.globals.hearthvaleSurface.calendar;
  if (!result || result.actor !== actor.id && !(result.actor === void 0 && (actor.data.generation ?? 1) === 1)) return false;
  const day = result.day ?? pit.lastExpedition?.day;
  return day === calendar.day && (result.year ?? 1) === calendar.year;
}
function equipmentPanels(actor, choices, tab, swapSlot2, expedition, devMode2 = false) {
  const inventory2 = actor.data.inventory;
  const groups = tab === "bag" ? ["bag"] : [tab];
  const content = buttons(choices.filter((c) => groups.includes(c.group) && c.type !== "pit.attack"));
  const inspection = tab === "weapons" ? inventory2.equipped.map((item, i) => {
    const d = item && byId("items", item.templateId);
    const attack = choices.find((c) => c.type === "pit.attack" && c.params.slot === i);
    const reactions = choices.filter((c) => c.type === "pit.defend" && c.params.slot === i);
    const enemy = expedition.combat && byId("enemies", expedition.combat.enemy.templateId);
    const details = d ? [d.damage !== void 0 ? `Damage ${d.damage}` : null, d.impact !== void 0 ? `Impact ${d.impact}` : null, d.defense !== void 0 ? `Block ${d.defense}` : null, d.speed !== void 0 ? `Speed ${signed(d.speed)}` : null, enemy && d.category === "weapon" ? `Enemy Dodge ${dodgeChance(enemy.combatStats.DEX, actor.data.attributes.baseStats.DEX, d.speed, enemyKnockedDown(expedition.combat)).chance}%` : null, d.maxDurability !== void 0 && item.durability !== void 0 ? `DUR ${item.durability}/${d.maxDurability}` : null, d.ammo ? `Arrows ${actor.data.attributes.resources.arrows} \xB7 1 Arrow per shot \xB7 No DUR \xB7 Cannot Block` : null].filter(Boolean).join(" \xB7 ") : "";
    if (reactions.length) return `<li><div class="weapon-tile reaction-tile"><strong>${escapeHtml(d.label)}</strong><span>${escapeHtml(details)}</span><div class="actions">${buttons(reactions.map((c) => ({ ...c, label: c.params.mode === "block" ? "Block" : "Counterattack" })))}</div></div></li>`;
    if (d?.category === "weapon") return `<li><button class="weapon-tile" ${attack ? `data-command="expedition" data-value="${escapeHtml(JSON.stringify({ type: attack.type, params: attack.params }))}"` : "disabled"}><strong>${escapeHtml(d.label)}</strong><span>${escapeHtml(details)}</span>${attack || !expedition.combat ? "" : "<span>Unavailable: check ammunition and condition.</span>"}</button></li>`;
    return `<li>${escapeHtml(itemName(item))}${d ? `<p>${escapeHtml(details)}</p>${d.category === "shield" ? "<p>Block during the incoming attack.</p>" : ""}` : ""}</li>`;
  }).join("") : tab === "spells" ? inventory2.spells.map((id2, i) => {
    const d = id2 && byId("spells", id2), cast = choices.filter((c) => c.type === "pit.cast" && c.params.slot === i);
    return `<li>${d ? `${cast.length ? buttons(cast) : unavailable(d.label, "Unavailable: check Essence, phase and whether this spell has a valid target here.")}<p>${spellCost(actor, expedition, d)} Essence \xB7 ${escapeHtml(equipmentEffectText(d.effects))}</p>` : "Empty"}</li>`;
  }).join("") : inventory2.bag.map((item, i) => `<li>${i + 1}. ${escapeHtml(itemName(item))}${item ? ` \xD7${item.quantity}` : ""}</li>`).join("");
  const tomeHint = !expedition.combat && tab === "bag" && inventory2.bag.some((item) => item && byId("items", item.templateId)?.category === "tome") ? "<p>Tomes are learned, not equipped. Choose Learn below when you are between combats.</p>" : "";
  const swapping = tab === "bag" && choices.some((c) => c.group === "swap") ? `<details><summary>Swap one Equipped \u2194 Bag slot</summary>
    <p>A combat swap spends the Attack phase. Outside combat it is free.</p><div class="actions">${inventory2.equipped.map((item, i) => tabButton(`Equipped ${i + 1}: ${itemName(item)}`, "swap-slot", i, i === swapSlot2)).join("")}</div>
    <p>Selected Equipped slot: ${swapSlot2 + 1}</p><div class="actions">${buttons(choices.filter((c) => c.group === "swap" && c.params.equipped === swapSlot2))}</div></details>` : "";
  const items = tab === "bag" && expedition.combat;
  const itemList = items ? inventory2.bag.map((item, slot) => {
    if (!item) return "";
    const actions2 = choices.filter((c) => c.group === "bag" && (c.type === "pit.use" && c.params.slot === slot || c.type === "pit.scroll" && c.params.container === "bag" && c.params.slot === slot));
    const spell = scrollSpell(item);
    return `<li>${actions2.length ? buttons(actions2) : unavailable(`${itemName(item)} \xD7${item.quantity}`, spell?.explorationOnly ? "Use between combats when its exploration target is available." : "Unavailable during this combat action.")}${spell ? `<p class="helper">${escapeHtml(spell.effects.map((effect2) => effect2.tag === "effect_damage" ? `${effect2.value} base damage, increased by INT; automatic hit` : equipmentEffectText([effect2])).join(" \xB7 "))}</p>` : ""}</li>`;
  }).join("") + Object.entries(actor.data.holdings?.valuables ?? {}).filter(([, q]) => q > 0).map(([id2, q]) => `<li>${unavailable(`${byId("items", id2).label} \xD7${q}`, "Not usable in combat.")}</li>`).join("") : inspection;
  const pressure = tab === "spells" ? spellPressure(actor, expedition) : null;
  const magicHint = pressure ? `<section class="magic-pressure ${pressure.dc === null ? "safe" : "warning"}" aria-label="Learned magic pressure"><p><strong>Next learned cast: ${spellCost(actor, expedition)} Essence \xB7 ${pressure.dc === null ? "within your WIS limit" : `Overcast \u2014 WIS check vs DC ${pressure.dc}; failure costs 1 Sanity`}.</strong></p><p class="helper">Learned spells are reusable. Repeated casting increases their shared Essence cost. WIS allows ${pressure.safeCasts} safe casts per expedition. Casting pressure resets when you return from the expedition.</p>${devMode2 ? `<p class="diagnostic">Learned Cast Count ${expedition.strain} \xB7 INT ${actor.data.attributes.baseStats.INT} \xB7 next cost 2 ^ max(0, count - INT + 1).</p>` : ""}</section>` : items ? '<p class="helper">Scrolls consume one action and one item, without Essence cost or Overcast. Scroll damage scales with INT.</p>' : "";
  const itemControls = tab === "spells" ? "" : items ? buttons(choices.filter((c) => c.type === "pit.scroll" && !c.params.container)) : content;
  return `<nav class="combat-tabs" aria-label="Expedition equipment">${(expedition.combat && !devMode2 && !inventory2.spells.some(Boolean) ? ["weapons", "bag"] : ["weapons", "spells", "bag"]).map((name) => tabButton(name === "bag" ? "Items" : name[0].toUpperCase() + name.slice(1), "pit-tab", name, name === tab)).join("")}</nav>
    <section aria-label="${items ? "Items" : escapeHtml(tab)}">${magicHint}<ol class="${tab === "bag" ? "bag-slots" : "slot-grid"}">${itemList}</ol>${items && !inventory2.bag.some(Boolean) ? '<p class="helper">Your Bag is empty.</p>' : ""}${tomeHint}<div class="actions">${itemControls || (!devMode2 || tab === "spells" && choices.some((c) => c.type === "pit.cast") || choices.some((c) => c.type === "pit.attack" || c.type === "pit.defend" && c.params.slot !== void 0) && tab === "weapons" ? "" : '<p class="diagnostic">No usable action in this tab. Check the current phase and item condition.</p>')}</div>${swapping}</section>`;
}
function expeditionView(world, actor, choices, tab = "weapons", swapSlot2 = 0, devMode2 = false) {
  const expedition = world.entities.hv_pit_1.data.expedition, room = expedition.floor.rooms[expedition.roomIndex], combat = expedition.combat;
  const hazard = room?.family === "hazard" && !room.resolved ? byId("hazards", room.encounter) : null;
  const hazardPreview = devMode2 && hazard ? `<section aria-label="Hazard approaches">${["primary", "alternate"].filter((a) => hazard[a]).map((a) => {
    const spec = hazardCheckSpecification(actor, hazard, a);
    return `<p>${a === "primary" ? "Approach" : "Alternate"}: ${spec.stat} ${actor.data.attributes.baseStats[spec.stat]}, modifier ${traitBonus(actor, spec.scope)} vs DC ${spec.dc}${spec.advantage ? " \xB7 Advantage" : ""}.</p>`;
  }).join("")}</section>` : "";
  if (expedition.pendingLoot.length) return `<h1>Bag full</h1><p>Choose whether to keep ${escapeHtml(itemName(expedition.pendingLoot[0]))}. Replacing a Bag slot discards its previous contents.</p>${resultView(expedition.lastResult, devMode2)}<div class="actions">${buttons(choices)}</div>`;
  if (combat) {
    const enemy = byId("enemies", combat.enemy.templateId);
    const move2 = combatMove(combat.committed);
    const dodge = dodgeChance(actor.data.attributes.baseStats.DEX, enemy.combatStats.DEX, move2.speed, playerKnockedDown(combat));
    if (combatPhase(combat) === "incoming") tab = "weapons";
    return `<p class="eyebrow">${combat.kind === "return" ? "Return Encounter" : "Combat"} \xB7 Round ${combat.round}</p><h1>${escapeHtml(enemy.label)}</h1>
      <p class="enemy-health"><strong>Enemy HP ${combat.enemy.hp}/${enemy.hp}</strong></p>
      <p class="combat-status">${escapeHtml([
      enemyKnockedDown(combat) ? "Enemy KNOCKED DOWN \u2014 Dodge is 0% against your next offensive action, then Knockdown clears" : null,
      playerKnockedDown(combat) ? "You are KNOCKED DOWN \u2014 your turn is not skipped. Dodge is 0% against the next enemy offensive action, then Knockdown clears" : null
    ].filter(Boolean).join(" \xB7 "))}</p>
      <section class="telegraph" aria-label="Committed enemy move"><h2>${combat.moveCancelled || combat.phase === "cancelled" ? "Cancelled" : "Committed"}: ${escapeHtml(move2.label)}</h2>
      <p>Damage ${move2.damage} (${escapeHtml(move2.damageType ?? "physical")}) \xB7 Impact ${move2.impact} \xB7 Speed ${signed(move2.speed)}${move2.offensive ? ` \xB7 Your Dodge chance: ${dodge.chance}%` : " \xB7 Legacy nonoffensive commitment"}</p>${devMode2 && move2.offensive ? `<p class="check-math">${escapeHtml(dodgeFormula(dodge))}</p>` : ""}</section>
      <section class="combat-decisions" aria-label="Current combat choices">
      ${combatPhase(combat) === "incoming" ? `<h2>${devMode2 ? "Incoming enemy phase" : "How do you defend?"}</h2><div class="actions defense-grid">${buttons(choices.filter((c) => c.group === "defense" && c.params.slot === void 0).map((c) => c.params.mode === "dodge" ? { ...c, label: `Dodge \u2014 ${dodge.chance}%` } : c))}</div><p class="helper">Counterattack \u2014 Take the incoming attack first. If you survive, choose one offensive response. Block uses the equipped item and wears its durability on physical contact.</p>` : combatPhase(combat) === "advantage" ? `<h2>${combat.interrupt === "Knockdown" || !combat.interrupt && combat.enemyKnockdown ? "KNOCKED DOWN" : "STAGGERED"} \u2014 ${escapeHtml(move2.label)} cancelled.</h2><p>Press the Advantage: choose one immediate offensive action.</p>${enemyKnockedDown(combat) ? "<p>Enemy Dodge is 0% against the next offensive action.</p>" : ""}` : combatPhase(combat) === "counterattack" ? "<h2>Counterattack \u2014 choose one offensive response.</h2>" : combatPhase(combat) === "attack" ? `<h2>${devMode2 ? "Player Attack phase" : "What do you do?"}</h2>` : ""}
      ${tab === "weapons" ? `<div class="actions bare-hands">${buttons(choices.filter((c) => c.type === "pit.unarmed"))}</div>` : ""}
      ${equipmentPanels(actor, choices, tab, swapSlot2, expedition, devMode2)}
      <div class="actions combat-secondary">${buttons(choices.filter((c) => c.group === "combat" && (tab !== "weapons" || c.type !== "pit.unarmed")))}</div></section>
      ${resultView(expedition.lastResult, devMode2)}<p class="helper">Last enemy move: ${escapeHtml(combat.lastMove ?? "None")}</p>
      ${combat.kind === "return" ? '<p class="helper">Retreat is unavailable during a Return Encounter.</p>' : '<p class="helper">Retreat abandons this Floor attempt and regenerates its start; spent resources remain spent.</p>'}`;
  }
  return `<p class="eyebrow">Stratum 1 \xB7 Swallowed HearthVale Ruins</p><h1>${escapeHtml(room?.title ?? `Floor ${expedition.floor.number} \u2014 Start`)}</h1>
    <p>${escapeHtml(room ? room.resolved && room.family !== "fixed" ? resolvedRoomProse : byId("texts", byId("events", room.encounter)?.opening ?? byId("hazards", room.encounter)?.text)?.text ?? roomProse[room.family] : "A new stretch of ruins lies ahead. Movement is forward only.")}</p>
    ${hazardPreview}<div class="actions primary-actions">${buttons(choices.filter((c) => c.group === "exploration").map((c) => devMode2 ? c : { ...c, label: c.label.replace(/ vs DC \d+/g, "") }))}</div>${resultView(expedition.lastResult, devMode2)}
    ${equipmentPanels(actor, choices, tab, swapSlot2, expedition, devMode2)}
    <p>Forward only through Rooms. Return ends this expedition through a WIS check and possible encounter; it does not retrace Rooms.</p>
    <div class="return-control">${buttons(choices.filter((c) => c.group === "return"))}</div>`;
}

// HearthVale_UI/service-views.js
var controls = (choices) => choices.map((c) => button(c.label, "service", JSON.stringify(c.params))).join("");
function serviceView(world, actor, choices, selectedSale2 = /* @__PURE__ */ new Set()) {
  const state = world.globals.hearthvaleServices;
  const inventoryOps = ["use", "armor", "swap", "learn", "discard"];
  const visible = choices.filter((c) => !inventoryOps.includes(c.params.op));
  const ownsResult = state?.lastResultActor === actor.id || state?.lastResultActor === void 0 && (actor.data.generation ?? 1) === 1;
  let content = state?.lastResult && ownsResult ? `<section class="outcome service-receipt" aria-label="Service outcome"><h2 class="outcome-heading">Recent activity</h2><p>${escapeHtml(state.lastResult)}</p></section>` : "";
  content += `<div class="actions talk-actions">${controls(visible.filter((c) => c.params.op === "talk"))}</div>`;
  if (actor.primaryLocation === "loc_shop") {
    content += `<h2>Shop</h2><p class="shop-funds"><strong>Gold ${actor.data.attributes.resources.gold}</strong> \xB7 Purchases, sales and orders cost no AP.</p><p class="helper">Shared stock. The last 2 Basic HP Potions and 10 Arrows are protected.</p>`;
    for (const request of livingSituations(world).filter((s) => s.primaryLocation === actor.primaryLocation)) {
      const d = request.data.definition;
      if (activeSituation(request)) content += `<p>${escapeHtml(d.label)}: ${d.quantity} ${escapeHtml(byId("items", d.material).label)} requested by the end of Day ${request.data.expiresDay - 1}. Reward: ${d.reward.gold}G, ${d.reward.xp} XP.</p>`;
      else if (request.lifecycle === "expired") content += `<p>${escapeHtml(d.expiryText)}</p>`;
      else if (request.lifecycle === "cancelled") content += `<p>${escapeHtml(d.withdrawnText)}</p>`;
    }
    for (const [label2, ops] of [["Buy", ["buy", "buy-used"]], ["Sell", ["sell", "sell-holding"]], ["Formal Turn-In", ["turn-in"]], ["Material requests", ["fulfill-request"]], ["Crafting and collection", ["order", "collect"]]]) {
      const offers = label2 === "Sell" ? sellOffers(actor) : [];
      const selected = offers.filter((offer) => selectedSale2.has(offer.item));
      const sales = offers.map((offer) => `<button type="button" class="control standard" data-command="sell-select" data-value="${escapeHtml(offer.item)}" aria-pressed="${selectedSale2.has(offer.item)}">${escapeHtml(byId("items", offer.item).label)} \xD7${offer.quantity} \u2014 ${offer.units.length === 1 ? `${offer.units[0]}G each` : "priced by condition"} \xB7 ${offer.total}G total</button>`).join("");
      content += `<details class="service-group" data-shop-section="${escapeHtml(label2)}"${label2 === "Buy" ? " open" : ""}><summary>${label2}</summary><div class="actions">${label2 === "Sell" ? `<p>Select item types to sell their entire sellable stacks, including equipped gear.</p>${sales || "<p>No sellable items.</p>"}<p>Selected total: ${selected.reduce((sum, offer) => sum + offer.total, 0)}G</p><button type="button" class="control caution" data-command="sell-selected"${selected.length ? "" : " disabled"}>Sell</button>` : controls(visible.filter((c) => ops.includes(c.params.op))) || "<p>No available transaction.</p>"}${label2 === "Buy" ? shopOffers(actor, economyState(world)).filter((o) => o.reason).map((o) => unavailable(`${o.params.op === "buy-used" ? "Used " : ""}${byId("items", o.item.templateId).label} \u2014 ${o.cost}G \xB7 Stock ${o.quantity}${byId("items", o.item.templateId).maxDurability && o.item.durability !== void 0 ? ` \xB7 DUR ${o.item.durability}` : ""}`, o.reason)).join("") : ""}</div></details>`;
    }
    content += "<p>Selling pays Gold. Formal Turn-In gives one material to document recipes; it is not a sale.</p>";
    content += "<p>Orders finish next Day. If your Bag is full, make room before purchasing or collecting; an order remains waiting. Gear recipes require an existing Blacksmith.</p>";
    content += `<details><summary>Item reference and comparison</summary>${expeditionCatalog.vendors[0].stock.map((s) => comparison(byId("items", s.item))).join("")}</details>`;
  }
  if (["loc_guild", "loc_town_hall"].includes(actor.primaryLocation)) {
    if (actor.primaryLocation === "loc_guild") {
      const r = actor.data.attributes.resources;
      const introToday = state?.auronTrainingIntroducedActor === actor.id && state?.auronTrainingIntroducedDay === world.globals.hearthvaleSurface.calendar.day;
      const legacyIntro = state?.auronTrainingUnlocked === true && state?.auronTrainingIntroduced !== true;
      if (introToday || legacyIntro) content += '<section aria-label="Auron training introduction"><p><strong>Auron \xB7 Guardian Adventurer:</strong> \u201CThe Pit has taken its toll on you. I cannot spare you every loss, but I can help you prepare for the next descent. Come train with me.\u201D</p><p>Training with Auron is unlocked.</p></section>';
      content += state?.auronTrainingUnlocked ? `<section class="training-panel" aria-label="Training with Auron"><h2>Training with Auron</h2><p class="helper">Auron, the Guardian Adventurer, helps you prepare for the Pit.</p><p class="training-budget"><strong>Each session costs 1 AP + 2 XP.</strong><br>Current XP: ${r.xp}. Current AP: ${r.ap}/${r.maxAp}.</p><div class="actions">${controls(visible.filter((c) => c.params.op === "train")) || `<p class="availability">${escapeHtml(trainingAvailability(world, actor, state).reason || "No session is available right now.")}</p>`}</div></section>` : "<p>Training with Auron is not yet unlocked.</p>";
    }
    content += "<h2>Shared opportunities</h2><p>Tracking remembers a posting; any eligible adventurer may complete it.</p>";
    content += `<div class="actions">${controls(visible.filter((c) => ["fulfill-request", "track-opportunity", "untrack-opportunity"].includes(c.params.op)))}</div>`;
    for (const id2 of actor.data.trackedOpportunities ?? []) {
      const notice = informationCards(world, actor.id).find((c) => c.subject === id2 && c.topic === "public-request");
      if (notice) content += `<p>Tracked: ${escapeHtml(notice.text)}</p>`;
    }
    content += `<h2>${actor.primaryLocation === "loc_guild" ? "Guild Records" : "Town Records"}</h2>` + recordCards(world, actor, actor.primaryLocation);
  }
  return content;
}
function comparison(d) {
  const spell = d.category === "scroll" && byId("spells", d.spell);
  return `<article><h3>${escapeHtml(d.label)}</h3><p>${escapeHtml(spell ? spell.effects.map((effect2) => effect2.tag === "effect_damage" ? `${effect2.value} base damage, increased by INT; automatic hit` : equipmentEffectText([effect2])).join(" \xB7 ") : [d.damage !== void 0 ? `DMG ${d.damage}` : null, d.defense !== void 0 ? `DEF ${d.defense}` : null, d.maxDurability ? `Max DUR ${d.maxDurability}` : null, d.impact !== void 0 ? `Impact ${d.impact}` : null, d.qualityStat ? `${d.qualityStat} quality` : null].filter(Boolean).join(" \xB7 ") || equipmentEffectText(d.effects))}</p></article>`;
}
function inventoryControls(actor, choices) {
  return `<h2>Item actions</h2><div class="actions">${controls(choices.filter((c) => ["use", "armor", "swap", "learn"].includes(c.params.op)))}</div>${actor.data.inventory.bag.map((item, bag) => item && !choices.some((c) => c.params.bag === bag && ["use", "armor", "swap", "learn"].includes(c.params.op)) ? unavailable(byId("items", item.templateId).label, byId("items", item.templateId).category === "scroll" ? "Carry this Scroll in your Bag. Use it from Items when its target is available in the Pit." : "No use or equipment change is available in your current condition.") : "").join("")}<details><summary>Carried item effects</summary>${actor.data.inventory.bag.filter(Boolean).map((i) => comparison(byId("items", i.templateId))).join("")}</details><details><summary>Discard items</summary><p>Discarding permanently removes the listed Bag contents.</p>${controls(choices.filter((c) => c.params.op === "discard"))}</details>`;
}
function recordCards(world, actor, holder = actor.id) {
  const personal = holder === actor.id;
  const discoveries = personal ? Object.values(world.entities.hv_pit_1.data.discoveries ?? {}).filter((d) => d.actor === actor.id || d.public === true) : [];
  const records = [...discoveries.map((d) => ({ title: d.title, text: `Finder: ${d.finder ?? world.entities[d.actor]?.data.identity.name ?? "Unknown adventurer"}. Year ${d.year ?? 1}, Day ${d.day}.` })), ...(personal ? actor.data.observations ?? [] : []).map((d) => ({ title: "Observation", text: d.text })), ...(personal ? actor.data.rumors ?? [] : []).map((d) => ({ title: "Rumor \u2014 unverified", text: d.text }))];
  const closed = [];
  for (const r of informationCards(world, holder)) {
    const entry = { title: r.state === "Rumor" ? "Rumor \u2014 unverified" : "Known report", text: `${r.text} Observation dated Day ${r.observedDay}.` };
    (r.topic === "public-request" && ["resolved", "expired", "cancelled", "failed", "transformed", "invalidated"].includes(r.status) ? closed : records).push(entry);
  }
  const cards = (list2) => list2.map((r) => `<details><summary>${escapeHtml(r.title)}</summary><p>${escapeHtml(r.text)}</p></details>`).join("");
  return cards(records) + (closed.length ? `<details><summary>Closed opportunities</summary>${cards(closed)}</details>` : "") || "<p>No known records yet.</p>";
}
function weeklySnapshots(world, actor) {
  return (world.globals.hearthvaleWeekly?.snapshots ?? []).filter((s) => s.holder === actor.id).map((s) => `<details><summary>Week ${s.week} Snapshot \u2014 Days ${s.firstDay}\u2013${s.completedDay}</summary>${s.facts.length ? `<ul>${s.facts.map((f) => `<li>${escapeHtml(f.text)}</li>`).join("")}</ul>` : "<p>No new meaningful changes known to you this week.</p>"}</details>`).join("");
}

// HearthVale_Story/death.js
function deathDescription(death) {
  const cause = death.cause;
  const text2 = cause === "sanity" ? "Sanity reached 0." : death.causeKind === "special" ? `Cause: ${cause}.` : `Final Heart lost${cause && cause !== "heart-loss" ? ` after ${cause}` : ""}.`;
  return text2 + (death.floor == null ? "" : ` Pit Floor ${death.floor}.`);
}
function continuityFacts(world) {
  const calendar = world.globals.hearthvaleSurface.calendar;
  const facts = [`HearthVale remains in Year ${calendar.year}, Day ${calendar.day}.`];
  const auron = Object.values(world.entities).find((a) => a.data?.templateId === "actor_auron");
  if (auron) facts.push(auron.data.death || auron.lifecycle === "retired" ? "Auron is dead." : `Auron lives with ${auron.data.attributes.resources.hearts} Hearts${auron.data.scars?.some((s) => s.templateId === "scar_lost_arm") ? " and a Lost Arm" : ""}.`);
  const discoveries = world.entities.hv_pit_1?.data.discoveries ?? {};
  const playerId = world.globals.hearthvaleSurface.playerId;
  for (const [id2, discovery] of Object.entries(discoveries)) {
    if (facts.length === 4) break;
    if (playerId && discovery.actor !== playerId && discovery.public !== true && knowledgeState(world, playerId, "hv_pit_1", `discovery-${id2}`) !== "Known") continue;
    facts.push(`${discovery.title} remains discovered.`);
  }
  return facts;
}

// HearthVale_UI/death-views.js
function lifeRecordView(record2) {
  return `<section aria-label="Life Record"><h2>Life Record</h2><p>${escapeHtml(record2.name)} \xB7 Generation ${escapeHtml(record2.generation)}</p>
    ${record2.arrived ? `<p>Arrived Year ${escapeHtml(record2.arrived.year)}, Day ${escapeHtml(record2.arrived.day)}.</p>` : ""}
    ${record2.facts.length ? `<ul>${record2.facts.map((f) => `<li>${escapeHtml(f.text)}${f.day === void 0 ? "" : ` <span class="muted">\u2014 ${f.year === void 0 ? "" : `Year ${escapeHtml(f.year)}, `}Day ${escapeHtml(f.day)}</span>`}</li>`).join("")}</ul>` : ""}
    <p><strong>Life ended:</strong> ${escapeHtml(deathDescription(record2.death))} Year ${escapeHtml(record2.death.year)}, Day ${escapeHtml(record2.death.day)}.</p></section>`;
}
function archivedLives(world, excludeActor = null) {
  const records = Object.values(world.entities).filter((a) => a.actor && a.data.lifeRecord && a.id !== excludeActor).map((a) => a.data.lifeRecord).sort((a, b) => a.generation - b.generation || a.actor.localeCompare(b.actor));
  if (!records.length) return "";
  return "<h2>Lives followed</h2><p>Earlier lives in the same HearthVale. This player-facing archive does not give the current adventurer private knowledge.</p>" + records.map((r) => `<details><summary>Generation ${escapeHtml(r.generation)} \u2014 ${escapeHtml(r.name)}</summary>
      ${lifeRecordView(r)}</details>`).join("");
}
function deathView(actor, transition, world) {
  const record2 = actor.data.lifeRecord, death = record2?.death ?? actor.data.death;
  return `<p class="eyebrow">A life in HearthVale</p><h1>${escapeHtml(record2?.name ?? actor.data.identity.name)} has died</h1>
    <p>This is the record of the life you followed, not a public report. HearthVale may not yet know how this life ended.</p>
    ${record2 ? lifeRecordView(record2) : `<p>${escapeHtml(deathDescription(death))}</p>` + button("Prepare Life Record", "adjudicate-death")}
    <h2>HearthVale continues.</h2>
    <p>Continuity is shown for you as the player; it does not transfer private knowledge to a new adventurer.</p>
    ${world && transition?.status !== "completion-pending" ? `<ul>${continuityFacts(world).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
    <p>${transition?.status === "completion-pending" ? "This is the final Day. Chapter completion awaits; no successor begins." : record2 ? "This life is recorded. You may follow a new adventurer in the same world." : ""}</p>
    <div class="actions">${record2 && world?.globals.hearthvaleSurface.calendar.day === 40 ? button("Complete Chapter", "adjudicate-death") : record2 && transition?.status === "succession-ready" ? button("Choose Who Comes Next", "begin-succession") : ""}${button("Save", "save")}${button("Load", "load")}${button("Return to Title", "return-to-title")}</div>`;
}

// HearthVale_Story/completion.js
function completionStory(world) {
  const c = world.globals.hearthvaleCompletion, pit = world.entities.hv_pit_1.data;
  const name = (id2) => world.entities[id2]?.data.identity?.name ?? id2;
  const clear = firstGuardianClear(world);
  const context2 = c.reason === "ruin-brute" ? `${name(c.firstClear.actor)} first cleared the Ruin Brute on Day ${c.firstClear.day}. Beyond it, the Pit continues. This demo ends here; Stratum 2 is not playable.` : "Forty Days have passed in HearthVale. This Chapter is complete.";
  const facts = [`${c.completedDays} Days completed.`, clear ? `${name(clear.actor)} holds the first-clear record for the Ruin Brute.` : "The Ruin Brute remains undefeated."];
  if (clear && pit.strata[0].cleared && pit.strata[0].waystoneUnlocked) facts.push("Stratum 1 is cleared. Its Waystone remains part of HearthVale\u2019s history.");
  for (const d of Object.values(pit.discoveries ?? {}))
    facts.push(`${d.title} was discovered by ${name(d.actor)} on Day ${d.day}.`);
  for (const r of pit.guardianVictories ?? [])
    facts.push(`${name(r.actor)} recorded a later Ruin Brute victory on Day ${r.day}.`);
  for (const s of Object.values(world.entities)) if (s.data?.resolver && s.data.record?.event)
    facts.push(`${name(s.data.resolver)}: ${s.data.record.event}`);
  const auron = Object.values(world.entities).find((a) => a.data?.templateId === "actor_auron");
  if (auron) facts.push(auron.data.death ? "Auron died." : `Auron lives with ${auron.data.attributes.resources.hearts} Hearts.`);
  return { context: context2, facts, thanks: "Thank you for completing the demo." };
}

// HearthVale_UI/completion-views.js
function completionView(world) {
  const story = completionStory(world), s = world.globals.hearthvaleSurface;
  const actor = world.entities[s.playerId], record2 = actor.data.lifeRecord;
  const finalDeath = !!world.globals.hearthvaleCompletion.death;
  return `<main class="demo-complete"><p class="eyebrow">HearthVale \xB7 Year ${escapeHtml(s.calendar.year)} \xB7 Day ${escapeHtml(s.calendar.day)}</p>
    ${finalDeath ? `<h1>${escapeHtml(record2.name)} has died</h1><p>This player-facing Life Record is not a public report.</p>${lifeRecordView(record2)}<p>This Life Record closes the final Day. No successor begins.</p><h2>Demo complete</h2>` : "<h1>Demo complete</h1>"}<p>${escapeHtml(story.context)}</p>
    <h2>HearthVale remembers</h2><ul>${story.facts.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    ${story.facts.length > 5 ? `<details><summary>More recorded history</summary><ul>${story.facts.slice(5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></details>` : ""}
    ${archivedLives(world, finalDeath ? actor.id : null)}<h2>${escapeHtml(story.thanks)}</h2>
    <div class="actions">${button("Save", "save")}${button("Load", "load")}${button("Return to Title", "return-to-title")}</div></main>`;
}

// HearthVale_UI/new-game.js
function freshGameSeed(source = globalThis.crypto) {
  return source.getRandomValues(new Uint32Array(1))[0];
}

// HearthVale_UI/save-feedback.js
function progressionCheckpoint(world) {
  const actor = world?.entities[world.globals.hearthvaleSurface.playerId];
  const services2 = world?.globals.hearthvaleServices;
  return {
    actor: actor?.id,
    heartLosses: actor?.data.heartLossSequence ?? 0,
    trainingUnlocked: services2?.auronTrainingUnlocked === true,
    trainingIntroduced: services2?.auronTrainingIntroduced === true
  };
}
function importantProgress(before, after, { command, value } = {}) {
  const trained = command === "service" && JSON.parse(value).op === "train";
  return trained || !!before.actor && before.actor === after.actor && (before.heartLosses === 0 && after.heartLosses > 0 || !before.trainingUnlocked && after.trainingUnlocked || !before.trainingIntroduced && after.trainingIntroduced);
}
function persistProgress(game2, storage, key, notify, confirm = false) {
  try {
    storage.setItem(key, game2.save());
  } catch {
    notify("Your action is complete, but browser storage could not save it. Keep this page open.");
    return false;
  }
  if (confirm) notify("Progress saved.");
  return true;
}

// HearthVale_UI/automatic-flow.js
function advanceArrival(game2, devMode2 = false) {
  if (devMode2 || game2.snapshot().world.globals.hearthvaleSurface.stage !== "arrival") return false;
  game2.perform("surface.arrive");
  return true;
}

// HearthVale_UI/world-updates.js
function worldUpdates(world, actor) {
  const day = world.globals.hearthvaleSurface.calendar.day;
  const ready = (world.globals.hearthvaleServices?.orders ?? []).filter((order) => order.actor === actor.id && order.readyDay <= day);
  if (!ready.length) return "";
  const items = ready.map((order) => `${byId("items", order.item).label} \xD7${order.quantity}`).join(", ");
  const blocked = ready.some((order) => !bagFits(actor, order.item));
  return `<section aria-label="World updates"><h2>Ready at the General Shop</h2><p>${escapeHtml(items)}. Open Crafting and collection at the Shop to collect your order${ready.length === 1 ? "" : "s"}.${blocked ? " Make room in your Bag to collect the items that do not fit." : ""}</p></section>`;
}

// HearthVale_UI/magic-onboarding.js
function hasLearnedMagic(actor) {
  return (actor?.data.inventory?.spells ?? []).some((id2) => {
    const spell = byId("spells", id2);
    return spell && !spell.explorationOnly;
  });
}
function magicIntroduction(actor, seen) {
  if (seen || !hasLearnedMagic(actor)) return "";
  return `<section class="magic-pressure" aria-label="Essence and Overcast introduction"><h2>Essence &amp; Overcast</h2><p>Learned magic draws on Essence. Repeated casting during an expedition becomes increasingly expensive, and your WIS determines how long you can cast safely. Push beyond your limit and you risk Overcasting; a failed Overcast costs 1 Sanity, though the spell still takes effect. Casting pressure resets when you return from the expedition. Scrolls cost no Essence and avoid Overcast, but are consumed when used.</p>${button("Got it", "magic-introduction-seen")}</section>`;
}

// HearthVale_UI/surface.js
var app = document.querySelector("#app");
var status = document.querySelector("#status");
var manualKey = "hearthvale.surface.save.v1";
var autoKey = "hearthvale.surface.autosave.v1";
function fitFrame() {
  const height = [...app.querySelectorAll(".hud,.utilities")].reduce((sum, node) => sum + node.getBoundingClientRect().height, 0);
  document.documentElement.classList.toggle("flow-frame", height > window.innerHeight * 0.45);
}
new ResizeObserver(fitFrame).observe(app);
window.addEventListener("resize", fitFrame);
var game = null;
var title = true;
var panel = null;
var expeditionTab = "weapons";
var swapSlot = 0;
var inventoryTab = "equipment";
var characterTab = "stats";
var pendingAction = null;
var devMode = false;
var selectedSale = /* @__PURE__ */ new Set();
var saleOwner = null;
var message = (text2) => {
  status.textContent = text2;
};
function persist(key = autoKey, confirm = false) {
  return persistProgress(game, localStorage, key, message, confirm);
}
function load2(key) {
  const saved = localStorage.getItem(key);
  if (!saved) throw new Error("No saved game in this slot.");
  const loaded = createSurfaceGame({ saved });
  loaded.resumeFlow();
  advanceArrival(loaded, devMode);
  game = loaded;
  title = false;
  panel = null;
  pendingAction = null;
  selectedSale.clear();
  saleOwner = null;
  message("Saved game loaded.");
  if (loaded.save() !== saved) persist();
}
function render() {
  document.body.dataset.theme = "surface";
  document.body.dataset.devMode = String(devMode);
  if (title) {
    app.innerHTML = `<main class="opening title-screen"><p class="eyebrow">A town. A Pit. A life of your own.</p><h1>HEARTHVALE</h1><p class="muted">One adventurer. Forty days. A town that carries on.</p><div class="actions">${button("New Game", "new")}${button("Continue", "continue")}${button("Load Saved Game", "load")}</div><p class="helper">Continue opens your latest automatic checkpoint. Load opens your manual save.</p></main>`;
    return;
  }
  const world = game.snapshot().world, s = world.globals.hearthvaleSurface, actor = world.entities[s.playerId];
  const owner = actor?.primaryLocation === "loc_shop" ? actor.id : null;
  if (owner !== saleOwner) {
    selectedSale.clear();
    saleOwner = owner;
  }
  const sellable = new Set(owner ? sellOffers(actor).map((offer) => offer.item) : []);
  selectedSale = new Set([...selectedSale].filter((item) => sellable.has(item)));
  if (world.globals.hearthvaleCompletion?.completed) {
    app.innerHTML = completionView(world);
    return;
  }
  const transition = world.globals.hearthvaleDeathTransition;
  if (transition?.status === "choosing-successor") {
    app.innerHTML = `<main>${candidateCards(transition.candidates, true, (actor.data.generation ?? 1) + 1)}<div class="actions">${button("Save", "save")}${button("Load", "load")}${button("Return to Title", "return-to-title")}</div></main>`;
    return;
  }
  if (actor?.data.death) {
    app.innerHTML = `<main class="death-takeover">${deathView(actor, world.globals.hearthvaleDeathTransition, world)}</main>`;
    return;
  }
  const normal = s.stage === "surface";
  const pit = world.entities.hv_pit_1, expedition = pit.data.expedition;
  document.body.dataset.theme = expedition?.active ? "pit" : "surface";
  let content;
  if (panel === "confirm-action") content = `<h1>Confirm action</h1><p>${escapeHtml(pendingAction.label)}</p><p>${escapeHtml(pendingAction.warning)}</p><div class="actions">${button("Confirm", "confirm-action")}${button("Cancel", "cancel-action")}</div>`;
  else if (panel === "character") content = character(actor, characterTab, world) + (characterTab === "history" ? "<h2>Life archive</h2>" + archivedLives(world) : "") + button("Close", "close");
  else if (panel === "inventory") content = inventory(actor, inventoryTab) + (expedition?.active ? "<p>Tomes are learned, not equipped. Between combats, close Inventory, open the expedition Bag tab, and choose Learn for the Tome. Combat swaps spend the Attack phase.</p>" : inventoryTab === "bag" ? inventoryControls(actor, game.serviceChoices()) : "") + button("Close", "close");
  else if (panel === "menu") content = `<h1>Menu</h1><div class="actions">${["Journal", "Save", "Load", "Settings", "Help", "Return to Title", "Close"].map((label2) => button(label2, label2.toLowerCase().replaceAll(" ", "-"))).join("")}</div>`;
  else if (panel === "journal") content = "<h1>Journal</h1>" + weeklySnapshots(world, actor) + recordCards(world, actor) + archivedLives(world) + button("Back to Menu", "menu");
  else if (panel === "settings") content = "<h1>Settings</h1><p>Text size can also be changed using browser zoom. Reduced motion follows your device preference.</p>" + tabButton("Larger text", "text-size", "", document.documentElement.classList.contains("large-text")) + tabButton("Dev Mode", "dev-mode", "", devMode) + button("Back to Menu", "menu");
  else if (panel === "help") content = "<h1>Help</h1><p>Explore the five Surface destinations. Moving and inspecting cost no AP. Sleep at the Inn to end the Day, heal HP, and reset AP. Sleep does not restore Sanity.</p><p>Continue restores your latest autosave. Save and Load use a separate manual slot in this browser. Closing a panel never undoes an action.</p>" + button("Back to Menu", "menu");
  else if (panel === "sleep") content = `<h1>End Day ${escapeHtml(s.calendar.day)}?</h1><p>Sleeping ends this Day and advances the world, allowing other people to act. It restores HP and resets AP. Sanity stays the same.</p><div class="actions">${button("Confirm sleep", "sleep", s.calendar.day)}${button("Cancel", "close")}</div>`;
  else if (s.stage === "history") content = `<p class="eyebrow">Before your arrival</p><h1>${escapeHtml(openingCards[s.openingCard])}</h1>${button("Continue", "opening-next")}`;
  else if (s.stage === "candidates") content = candidateCards(s.candidates);
  else if (s.stage === "arrival") content = `<h1>${escapeHtml(actor.data.identity.name)} \u2014 Year 1, Day 1</h1>${button("Enter the Inn", "arrive")}`;
  else if (s.stage === "mira") content = `<h1>The Inn</h1><p>${escapeHtml(actor.data.identity.name)} \u2014 Year ${s.calendar.year}, Day ${s.calendar.day}</p>` + paragraphs(miraOpening) + `<div class="actions">${miraResponses.map((r) => button(r.label, "answer", r.id)).join("")}</div>`;
  else if (s.stage === "mira-reply") content = "<h1>Mira</h1>" + paragraphs([`Mira: \u201C${miraResponses.find((r) => r.id === s.miraResponse).reply}\u201D`, ...miraClosing]) + button("Continue", "finish-mira");
  else if (pit.data.pendingFinalHeart || pit.data.pendingDeath || actor.data.attributes.resources.hearts <= 0 || actor.data.attributes.resources.sanity <= 0) content = "<h1>At the edge</h1>" + resultView(pit.data.lastResult, devMode) + (devMode ? button("Resolve survival outcome", "adjudicate-death") : "<p>Survival recovery could not complete. Open Settings and enable Dev Mode to retry.</p>");
  else if (expedition?.active) content = expeditionView(world, actor, game.expeditionChoices(), expeditionTab, swapSlot, devMode);
  else if (actor.primaryLocation === "loc_pit_entrance") content = pitEntrance(world, actor, game.expeditionChoices(), devMode);
  else content = (actor.data.generation > 1 && actor.primaryLocation === "loc_inn" ? `<p class="eyebrow">${escapeHtml(actor.data.identity.name)} \xB7 Generation ${escapeHtml(actor.data.generation)}</p><p>You now follow ${escapeHtml(actor.data.identity.name)}. HearthVale's story continues.</p>` : "") + surfaceLocation(world, actor, serviceView(world, actor, game.serviceChoices(), selectedSale));
  const viewingLearnedMagic = normal && (panel === "inventory" && inventoryTab === "spells" || !panel && expedition?.active && expeditionTab === "spells");
  if (viewingLearnedMagic) content = content.replace("</h1>", `</h1>${magicIntroduction(actor, s.magicIntroductionSeen)}`);
  app.innerHTML = `${normal ? hud(actor, s.calendar) : ""}${expedition?.active ? expeditionHud(actor, expedition) : ""}<main class="${normal || s.stage === "candidates" ? "" : "opening"}">${normal && !panel && !expedition?.active ? worldUpdates(world, actor) : ""}${content}</main>${normal ? `<nav class="utilities" aria-label="Utilities">${button("Character", "character")}${button("Inventory", "inventory")}${button("Menu", "menu")}</nav>` : ""}`;
}
app.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-command]");
  if (!target) return;
  let command = target.dataset.command, value = target.dataset.value;
  const selling = ["sell-select", "sell-selected"].includes(command);
  const shopSections = [...app.querySelectorAll("[data-shop-section]")].map((node) => ({ name: node.dataset.shopSection, open: node.open }));
  const shopScroll = { main: app.querySelector("main")?.scrollTop ?? 0, x: window.scrollX, y: window.scrollY };
  const previousPanel = panel;
  message("");
  try {
    const beforeProgress = progressionCheckpoint(game?.snapshot().world);
    let changed = false;
    if (command === "confirm-action") {
      ({ command, value } = pendingAction);
      panel = pendingAction.panel;
      pendingAction = null;
    } else if (command === "cancel-action") {
      panel = pendingAction.panel;
      pendingAction = null;
      command = "cancelled";
    } else if (["service", "expedition"].includes(command)) {
      const action = JSON.parse(value), op = action.op ?? action.type;
      const warnings = { "pit.retreat": "This abandons current Floor progress and regenerates its start. Spent resources remain spent.", discard: "This permanently removes the listed Bag contents.", sell: "This sells the listed item from your inventory.", learn: "This consumes the Tome and may replace the named spell.", "pit.learn": "This consumes the Tome and may replace the named spell." };
      if (warnings[op]) {
        pendingAction = { command, value, panel, label: target.textContent, warning: warnings[op] };
        panel = "confirm-action";
        command = "prompted";
      }
    }
    if (["cancelled", "prompted"].includes(command)) {
    } else if (command === "new") {
      game = createSurfaceGame({ seed: freshGameSeed() });
      title = false;
      panel = null;
      selectedSale.clear();
      saleOwner = null;
      changed = true;
    } else if (command === "continue") load2(autoKey);
    else if (command === "load") load2(manualKey);
    else if (command === "save") persist(manualKey, true);
    else if (command === "magic-introduction-seen") {
      game.acknowledgeMagicIntroduction();
      persist();
    } else if (command === "return-to-title") {
      title = true;
      panel = null;
    } else if (command === "close") panel = null;
    else if (["character", "inventory", "menu", "journal", "settings", "help"].includes(command)) panel = command;
    else if (command === "sleep-prompt") panel = "sleep";
    else if (command === "text-size") document.documentElement.classList.toggle("large-text");
    else if (command === "dev-mode") devMode = !devMode;
    else if (command === "pit-tab") expeditionTab = value;
    else if (command === "inventory-tab") inventoryTab = value;
    else if (command === "character-tab") characterTab = value;
    else if (command === "swap-slot") swapSlot = Number(value);
    else if (command === "sell-select") {
      if (!sellOffers(game.snapshot().world.entities[saleOwner]).some((offer) => offer.item === value)) throw new Error("Item is no longer sellable");
      if (selectedSale.has(value)) selectedSale.delete(value);
      else selectedSale.add(value);
    } else if (command === "sell-selected") {
      if (!selectedSale.size) return;
      game.perform("service.act", { op: "sell-bulk", items: [...selectedSale] });
      selectedSale.clear();
      changed = true;
    } else {
      if (command === "service") game.perform("service.act", JSON.parse(value));
      else if (command === "expedition") {
        const intention = JSON.parse(value);
        game.perform(intention.type, intention.params);
      } else if (command === "opening-next") game.openingNext();
      else if (command === "choose") game.choose(value);
      else if (command === "begin-succession") {
        game.beginSuccession();
        panel = null;
      } else if (command === "choose-successor") {
        game.chooseSuccessor(value);
        panel = null;
        pendingAction = null;
        characterTab = "stats";
        inventoryTab = "equipment";
        expeditionTab = "weapons";
        swapSlot = 0;
      } else if (command === "arrive") game.perform("surface.arrive");
      else if (command === "answer") game.perform("surface.answer-mira", { response: value });
      else if (command === "finish-mira") game.perform("surface.finish-mira");
      else if (command === "adjudicate-death") game.adjudicateDeath();
      else if (command === "move") game.perform("Move", { location: value });
      else if (command === "sleep") {
        game.perform("surface.sleep", { day: Number(value), confirmed: true });
        panel = null;
      } else throw new Error("Unknown interface command");
      changed = true;
    }
    if (changed) {
      advanceArrival(game, devMode);
      persist(autoKey, importantProgress(beforeProgress, progressionCheckpoint(game.snapshot().world), { command, value }));
    }
    render();
    if (selling) for (const section of app.querySelectorAll("[data-shop-section]")) section.open = shopSections.find((saved) => saved.name === section.dataset.shopSection)?.open ?? section.open;
    const keepControl = ["save", "text-size", "dev-mode", "pit-tab", "inventory-tab", "character-tab", "swap-slot"].includes(command);
    const restore = command === "close" && ["character", "inventory", "menu"].includes(previousPanel) ? previousPanel : null;
    const control = (keepControl || restore) && [...app.querySelectorAll("button[data-command]")].find((b) => b.dataset.command === (restore ?? command) && (restore || b.dataset.value === value));
    if (control) {
      for (let parent = control.parentElement; parent; parent = parent.parentElement) if (parent.tagName === "DETAILS") parent.open = true;
    }
    const saleControl = selling && ([...app.querySelectorAll("button[data-command]")].find((b) => !b.disabled && b.dataset.command === command && (command === "sell-selected" || b.dataset.value === value)) || app.querySelector('[data-shop-section="Sell"] summary'));
    const focusTarget = saleControl || control || app.querySelector("h1");
    if (focusTarget) {
      if (!control && !saleControl) focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: !!control || selling });
    }
    if (selling) {
      app.querySelector("main").scrollTop = shopScroll.main;
      window.scrollTo(shopScroll.x, shopScroll.y);
    } else if (!control) window.scrollTo(0, 0);
  } catch (error) {
    message(error.message);
  }
});
render();
//# sourceMappingURL=surface.js.map
