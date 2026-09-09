// Replaceable demonstration data only. No production characters, goals or quests.
export const demoIds = Object.freeze({
  player: 'actor_player_test', autonomous: 'actor_autonomous_test',
  location: 'location_test', situation: 'situation_help_test',
});

export function sixPillarFixture() {
  return {
    location: { id: demoIds.location, name: 'Test location' },
    actors: [
      { id: demoIds.player, name: 'Player test Actor', controller: 'Human', baseStats: { testAttribute: 0 }, traits: [], mainGoal: 'goal_player_test' },
      { id: demoIds.autonomous, name: 'Autonomous test Actor', controller: 'Autonomous', baseStats: { testAttribute: 0 }, traits: [], mainGoal: 'goal_autonomous_test', decisionWeights: { goal: 1, help: 1, idle: 1 } },
    ],
    opportunities: [{ id: demoIds.situation, beneficiary: demoIds.autonomous, requiredContributions: 2, priorityDays: 2 }],
  };
}
