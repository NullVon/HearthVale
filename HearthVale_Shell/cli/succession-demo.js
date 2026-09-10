import assert from 'node:assert/strict';
import { createHearthValeGame } from '../src/index.js';
import { successionFixture, successionIds as ids } from '../fixtures/succession-fixture.js';

for (const years of [0, 3]) {
  const game = createHearthValeGame({ definition: successionFixture({ years }) });
  const { preSuccessionSave, preparedSave } = game.beginSuccession(ids.autonomous);
  const resumed = createHearthValeGame({ saved: preparedSave });
  game.completeSuccession(); resumed.completeSuccession();
  assert.equal(game.save(), resumed.save());
  assert.equal(game.entity(ids.autonomous).actor.controller, 'Human');
  assert.equal(createHearthValeGame({ saved: preSuccessionSave }).entity(ids.player).actor.controller, 'Human');
  game.endDay();
  assert.equal(game.entity(ids.player).data.daily.accomplishments, 1);
  assert.equal(game.entity(ids.autonomous).data.daily, undefined);
  console.log(`Succession fixture: ${years} years skipped; exact reload; existing successor controls play; old player acts autonomously once.`);
}
