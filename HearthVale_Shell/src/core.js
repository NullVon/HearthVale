// External dependency: sibling LWE-Core v0.1.0, public entry point only.
export { createRuntime, selectWeighted, evaluate } from '../../../LWE-Core/src/api/index.js';
// Optional generic Dice package; callers must supply Core's resolving RNG.
export { check as diceCheck } from '../../../LWE-Core/packages/dice/index.js';
