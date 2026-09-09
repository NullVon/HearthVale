import { createHearthValeRuntime } from '../shell/index.js';

const runtime = createHearthValeRuntime();
const state = runtime.snapshot();
const actors = Object.values(state.world.entities).filter(entity => entity.actor);
console.log('HearthVale Shell bootstrap complete (LWE Core v0.1.0).');
console.log(`Core boundary ${state.boundary}; Day ${state.world.globals.hearthvale.calendar.day}; stable checkpoint: ${state.checkpoint}.`);
for (const actor of actors) {
  console.log(`${actor.data.identity.name}: ${actor.actor.controller}; Main Goal: ${actor.data.mainGoal}.`);
}
console.log('Diagnostic bootstrap only. Gameplay begins in later milestones.');
