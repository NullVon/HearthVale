import { check } from './expedition-checks.js';
import { changeSanity } from './sanity.js';

// expedition.strain already records every learned cast across the expedition.
// Discard obsolete encounter counters on an action, never during exact load.
export function migrateSpellStrain(combat) {
  delete combat.spellStrain;
  delete combat.scrollStrain;
}

export function spellPressure(actor,expedition) {
  const strain=expedition.strain+1,wis=actor.data.attributes.baseStats.WIS;
  const excess=strain-wis;
  return {strain,safeCasts:wis,dc:excess>0?[8,11,14,17,20][Math.min(4,excess-1)]:null};
}

export function resolveSpellPressure(actor,expedition,rng) {
  if(expedition.combat)migrateSpellStrain(expedition.combat);
  const pressure=spellPressure(actor,expedition);expedition.strain=pressure.strain;
  const roll=pressure.dc===null?null:check(actor,{stat:'WIS',dc:pressure.dc,scope:'mental'},rng);
  const text=roll?`Overcast — WIS check ${roll.success?'succeeded; no Sanity lost.':'failed. '+changeSanity(actor,-1,'Overcast')}`
    :'Within your WIS limit; no Overcast check.';
  return {...pressure,check:roll,text};
}
