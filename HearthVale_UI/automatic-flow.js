// Only the bare arrival acknowledgement is redundant. Keep the actual arrival
// action, Mira's choices/reply, and every consequential result/decision intact.
export function advanceArrival(game,devMode=false) {
  if(devMode||game.snapshot().world.globals.hearthvaleSurface.stage!=='arrival')return false;
  game.perform('surface.arrive');
  return true;
}
