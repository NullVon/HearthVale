import assert from 'node:assert/strict';
import { createHearthValeGame } from '../src/index.js';
import { ENTER_PIT, ADVANCE_PIT, DISCOVER_PIT, EXIT_PIT } from '../src/pit.js';
import { pitFixture, pitIds } from '../fixtures/pit-fixture.js';
import { demoIds } from '../fixtures/six-pillar-fixture.js';

const game = createHearthValeGame({ definition: pitFixture(), seed: 1 });
for (const type of [ENTER_PIT, ADVANCE_PIT, ADVANCE_PIT, DISCOVER_PIT, ADVANCE_PIT]) game.perform({ type, targets: [pitIds.pit] });
const saved = game.save();
const resumed = createHearthValeGame({ saved });
assert.equal(resumed.save(), saved);
console.log('Pit lifecycle proof: replaceable fixtures only.');
console.log(`Active expedition: ${resumed.entity(pitIds.pit).data.expedition.active}; AP: ${resumed.entity(demoIds.player).data.attributes.resources.ap}; Day: ${resumed.snapshot().world.globals.hearthvale.calendar.day}.`);
console.log(`Permanent discovery: ${resumed.entity(pitIds.namedLocation).data.name}; exact active save restored.`);
resumed.perform({ type: EXIT_PIT, targets: [pitIds.pit] });
console.log(`Returned: ${!resumed.entity(pitIds.pit).data.expedition.active}; AP still ${resumed.entity(demoIds.player).data.attributes.resources.ap}.`);
resumed.endDay();
console.log(`Explicit Day end: Day ${resumed.snapshot().world.globals.hearthvale.calendar.day}; autonomous accomplishments: ${resumed.entity(demoIds.autonomous).data.daily.accomplishments}.`);
