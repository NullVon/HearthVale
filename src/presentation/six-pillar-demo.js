import { createHearthValeGame } from '../shell/index.js';
import { HELP } from '../shell/actions.js';
import { sixPillarFixture, demoIds } from '../demo/six-pillar-fixture.js';

const game = createHearthValeGame({ definition: sixPillarFixture(), seed: 1 });
console.log('Six-pillar proof using test fixtures only.');
console.log(`Player aware: ${game.view(demoIds.player).some(record => record.claim.subject === demoIds.situation)}`);
game.perform({ type: HELP, situation: demoIds.situation });
game.perform({ type: HELP, situation: demoIds.situation });
console.log(`Same-Day progress: ${game.entity(demoIds.situation).data.progress}; Situation: ${game.entity(demoIds.situation).lifecycle}.`);
game.endDay();
const saved = game.save();
const restored = createHearthValeGame({ saved });
console.log(`Day ${restored.snapshot().world.globals.hearthvale.calendar.day}; exact save restoration: ${restored.save() === saved}.`);
