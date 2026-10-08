// Presentation around the existing game.save()/browser-storage pipeline.
// These checkpoints are transient UI data, never a second save format.
export function progressionCheckpoint(world) {
  const actor=world?.entities[world.globals.hearthvaleSurface.playerId];
  const services=world?.globals.hearthvaleServices;
  return {actor:actor?.id,heartLosses:actor?.data.heartLossSequence??0,
    trainingUnlocked:services?.auronTrainingUnlocked===true,
    trainingIntroduced:services?.auronTrainingIntroduced===true};
}

export function importantProgress(before,after,{command,value}={}) {
  const trained=command==='service'&&JSON.parse(value).op==='train';
  return trained || !!before.actor && before.actor===after.actor && (
    before.heartLosses===0&&after.heartLosses>0 ||
    !before.trainingUnlocked&&after.trainingUnlocked ||
    !before.trainingIntroduced&&after.trainingIntroduced);
}

export function persistProgress(game,storage,key,notify,confirm=false) {
  try { storage.setItem(key,game.save()); }
  catch { notify('Your action is complete, but browser storage could not save it. Keep this page open.'); return false; }
  if(confirm)notify('Progress saved.');
  return true;
}
