import { pitFixture } from './pit-fixture.js';
import { demoIds } from './six-pillar-fixture.js';

export const successionIds = { ...demoIds, ineligible: 'actor_ineligible_test', living: 'living_state_test',
  personal: 'situation_personal_test', role: 'situation_role_test', public: 'situation_public_test' };

export function successionFixture({ years = 0 } = {}) {
  const definition = pitFixture();
  definition.actors[0].decisionWeights = { goal: 1, help: 0, idle: 0 };
  definition.actors.push({ ...structuredClone(definition.actors[1]), id: successionIds.ineligible, name: 'Ineligible test Actor' });
  definition.succession = {
    candidates: [{ actor: demoIds.autonomous, eligible: true, years }, { actor: successionIds.ineligible, eligible: false, years: 0 }],
    ages: { [demoIds.player]: 30, [demoIds.autonomous]: 20, [successionIds.ineligible]: 25 },
    living: { id: successionIds.living, value: 10, deltaPerYear: 2 },
    situations: [
      { id: successionIds.personal, scope: 'actor', owner: demoIds.player },
      { id: successionIds.role, scope: 'player-role', owner: demoIds.player },
      { id: successionIds.public, scope: 'public' },
    ],
  };
  return definition;
}
