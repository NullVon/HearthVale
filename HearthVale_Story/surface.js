// Short M1 presentation only. These lines never resolve gameplay state.
export const openingCards = [
  'HEARTHVALE WAS ONCE AN ORDINARY TOWN.',
  'THEN THE PIT OPENED BENEATH IT. More than half the town disappeared into the earth.',
  'Years passed. Survivors rebuilt beside what remained. Then people began returning from below with strange materials, old valuables, and stories of things deeper still.',
  'Adventurers followed.',
  'HEARTHVALE — YEAR 1, DAY 1',
];
export const miraOpening = [
  'Morning reaches the Inn before you are ready for it. Downstairs, someone is already setting bowls onto the tables.',
  'Mira: “You’re awake.”', 'Mira: “Good. Food’s there.”',
  'She glances at your gear.', 'Mira: “Pit?”',
];
export const miraResponses = [
  { id: 'heading', label: "I'm heading there.", reply: 'Mm. Come back in one piece.' },
  { id: 'later', label: 'Maybe later.', reply: "Good. It'll still be there." },
  { id: 'looking', label: 'Just looking around first.', reply: 'Probably the smarter start.' },
];
export const miraClosing = [
  'Mira: “Shop’s nearby. Guild’s down the road. Town Hall’s impossible to miss.”',
  'Mira: “When you’re done for the Day, come back here and get some sleep.”',
];
export const locationDescriptions = {
  loc_inn: 'Morning light falls across the tables. Bowls are stacked beside the hearth.',
  loc_shop: 'Bottles and everyday supplies line the shelves. Tavi watches from the counter.',
  loc_guild: 'Adventurers gather by the doorway. Lina keeps the room in order.',
  loc_town_hall: 'The town’s business gathers here. Garrick looks up from his desk.',
  loc_pit_entrance: 'The town ends at the edge of the opening. A cool draft rises from below.',
};

export const traitDescriptions = Object.freeze({
  "trait_hardy": "+2 Max HP; +2 CON on physical-resilience/endurance checks.",
  "trait_frail": "−2 Max HP; −2 physical-resilience CON; recover 1 Sanity after 4 Talks instead of 5.",
  "trait_quick": "+2 Dodge and escape/reactive DEX checks; no Bow accuracy bonus.",
  "trait_strong_willed": "+2 WIS against Fear, coercion, Sanity pressure and mental effects.",
  "trait_charming": "+2 CHA for warmth, trust, cooperation and positive first impressions.",
  "trait_off_putting": "−2 CHA for warmth/cooperation; +2 for intimidation or deterrence.",
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
  "trait_cowardly": "−2 WIS against Fear; inclined to escape when threatened.",
  "trait_tough_stomach": "+2 CON against biological hazards; 50% chance to resist Poison.",
  "trait_pyrophobic": "−2 WIS against fire Fear/Sanity checks; significant fire failure also loses 1 Sanity.",
  "trait_greedy": "Drawn to opportunities for profit.",
  "trait_curious": "Drawn to mysteries and discoveries.",
  "trait_lucky_bastard": "Includes Lucky; reroll first failed noncombat check per expedition, keep better; 25% extra ordinary treasure chance."
});
