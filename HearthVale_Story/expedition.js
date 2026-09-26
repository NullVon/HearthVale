// M2 room fixtures, deliberately separate from mechanical state/resolution.
export const roomProse = {
  combat: 'Something moves among the remains of the old town.',
  resource: 'Roots and pale growth push through cracks in the stone.',
  hazard: 'The way forward is unstable. Choose your approach.',
  treasure: 'A small pocket of belongings escaped the collapse.',
  event: 'An ordinary piece of the old town has survived down here.',
  empty: 'Nothing stirs among the bare foundations.',
  discovery: 'A recognizable remnant gives this place a name worth remembering.',
  fixed: 'A heavy silence hangs beyond the threshold.',
};
export const resolvedRoomProse = 'This Room is resolved. You can continue forward or Return.';

// Describe authored equipment effects without exposing schema tags or boolean values.
export function equipmentEffectText(effects) {
  return effects.map(({tag,value})=>({
    effect_damage: `${value} damage`,
    effect_impact: `${value} Impact`,
    effect_heal: `Restore up to ${value} HP`,
    effect_defense: `Barrier ${value} for this round`,
    effect_cure: 'Cure Poison',
    effect_expedition_hp: `+${value} Max HP for this expedition`,
    effect_unlock: 'Open a locked container or door during exploration',
    effect_return: 'Return to the Pit Entrance without a Return encounter',
  })[tag]).filter(Boolean).join(' · ');
}
