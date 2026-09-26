import { byId } from '../../HearthVale_Content/expedition.js';
import { currentRoom } from './expedition-generation.js';
import { noncombatCheck, applyPoison } from './expedition-checks.js';
import { awardRoom, offerLoot } from './expedition-loot.js';
import { resources, paySpell, consume } from './expedition-equipment.js';
import { derivedActorValues } from './surface-candidates.js';
import { completeReturn } from './expedition-lifecycle.js';
import { resolveEvent } from './expedition-events.js';
import { resolveSquare } from './expedition-discovery.js';
import { hasTrait } from './expedition-checks.js';

export function hazardCheckSpecification(actor,hazard,approach){
  const selected=hazard[approach];
  const advantage=hazard.advantageFrom.some(id=>actor.data.inventory.equipped.some(item=>item?.templateId===id)||actor.data.inventory.spells.includes(id));
  return {...selected,advantage,scope:hazard.id==='hazard_spore_pocket'?'biological':selected.stat==='CON'?'resilience':selected.stat==='DEX'?'escape':''};
}

export function resolveRoom(ctx, approach, rng, unlocked = false) {
  const room = currentRoom(ctx.expedition);
  let roll = null, text = `${room.title} resolved.`, extra = [];
  if(byId('events',room.encounter)) {
    const result=resolveEvent(ctx,room,approach,rng);
    const rewards=awardRoom(ctx,room,rng);
    ctx.expedition.lastResult={...result,rewards:[...result.rewards,...rewards]};
    ctx.noncombatCompleted=!ctx.expedition.combat;
    return;
  }
  if(room.encounter==='loc_sunken_square') {
    const result=resolveSquare(ctx);
    room.resolved=true; room.rewards=result.rewards;
    ctx.expedition.lastResult=result;ctx.noncombatCompleted=true;return;
  }
  if (room.family === 'hazard') {
    const hazard = byId('hazards', room.encounter);
    roll = noncombatCheck(ctx, hazardCheckSpecification(ctx.actor,hazard,approach), rng);
    text = `${hazard.label}: ${roll.success ? 'Success' : 'Failure'}.`;
    if(!roll.success && hazard.triggered) {
      const notice=roll;roll=noncombatCheck(ctx,{...hazard.triggered,scope:'escape'},rng);roll.trigger=notice;
      text+=` The trap triggers; reactive movement ${roll.success?'succeeds':'fails'}.`;
    }
    if (!roll.success) for (const effect of hazard.failure) {
      if (effect.tag === 'effect_damage') { resources(ctx.actor).hp = Math.max(0, resources(ctx.actor).hp - effect.value); text += ` ${effect.value} HP lost.`; }
      if (effect.tag === 'effect_poison') text += ` ${applyPoison(ctx.actor, rng)}`;
    }
    if(!roll.success && hazard.fire && hasTrait(ctx.actor,'pyrophobic')) {resources(ctx.actor).sanity=Math.max(0,resources(ctx.actor).sanity-1);text+=' Pyrophobic: 1 Sanity lost.';}
    if(hazard.reward && resources(ctx.actor).hp>0) extra.push(offerLoot(ctx,'item_old_coin_purse'));
  } else if (room.encounter === 'm2_locked_coffer') {
    if (!unlocked && approach !== 'leave') roll = noncombatCheck(ctx, { stat: 'DEX', dc: 11 }, rng);
    if (unlocked || roll?.success) { extra.push(offerLoot(ctx, 'item_m2_keepsake')); text = 'The coffer opens. A worn keepsake remains inside.'; }
    else text = approach === 'leave' ? 'Left the coffer unopened.' : 'The damaged lock will not open. The attempt is spent.';
  } else if (room.family === 'discovery') {
    ctx.pit.discoveries ??= {};
    if (!ctx.pit.discoveries[room.encounter]) ctx.pit.discoveries[room.encounter] = { templateId: room.encounter, title: room.title, actor: ctx.actor.id, day: ctx.day };
    text = `${room.title} recorded as a persistent observation.`;
  }
  ctx.expedition.lastResult = { text, check: roll };
  // A lethal challenge abandons this attempt before a reward is granted.
  if (resources(ctx.actor).hp <= 0) return;
  const rewards = awardRoom(ctx, room, rng);
  ctx.expedition.lastResult.rewards = [...extra, ...rewards];
  ctx.noncombatCompleted = true;
}

export function explorationSpell(ctx, spellId, rng, scrollSlot = null) {
  const spell = byId('spells', spellId);
  const cost = scrollSlot === null ? paySpell(ctx.actor, ctx.expedition, spell) : 0;
  if (scrollSlot !== null) consume(ctx.actor, 'equipped', scrollSlot, rng);
  ctx.expedition.lastResult = { text: `${spell.label} cast.`, cost };
  if (spell.id === 'spell_teleport') completeReturn(ctx, 'teleport');
  else if (spell.id === 'spell_heal') resources(ctx.actor).hp = Math.min(derivedActorValues(ctx.actor).maxHp, resources(ctx.actor).hp + 8);
  else if (spell.id === 'spell_unlock') resolveRoom(ctx, currentRoom(ctx.expedition).encounter==='event_locked_bedroom'?'choice_locked_bedroom_unlock':'unlock', rng, true);
}
