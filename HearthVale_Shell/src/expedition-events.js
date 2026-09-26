import { byId } from '../../HearthVale_Content/expedition.js';
import { noncombatCheck } from './expedition-checks.js';
import { resources } from './expedition-equipment.js';
import { treasureReward, offerLoot } from './expedition-loot.js';
import { startCombat } from './expedition-combat.js';

export function eventChoices(ctx,room) {
  return byId('events',room.encounter)?.choices.filter(choice=>!choice.id.endsWith('_unlock'))??[];
}
export function resolveEvent(ctx,room,choiceId,rng) {
  const template=byId('events',room.encounter), choice=template.choices.find(c=>c.id===choiceId);
  if(!choice) throw new Error('Unknown Event choice');
  const check=choice.check?noncombatCheck(ctx,choice.check,rng):null;
  const rewards=[];
  // Hidden reliability is authored state, never a player-facing diagnosis.
  if(template.id==='event_scratched_warning') room.warningAccuracy ??= ['Accurate','Stale','Incomplete','Incorrect'][Math.floor(rng.next()*4)];
  ctx.pit.eventHistory ??= [];
  const history={event:template.id,choice:choice.id,actor:ctx.actor.id,day:ctx.day};
  for(const effect of check && !check.success ? choice.failure : choice.effects){
    const handlers={
      effect_treasure:()=>{const reward=treasureReward(ctx,rng);if(reward) rewards.push(reward);},
      effect_item:()=>rewards.push(offerLoot(ctx,effect.target,effect.value)),
      effect_arrows:()=>{resources(ctx.actor).arrows+=effect.value;rewards.push({resource:'arrows',quantity:effect.value});},
      effect_gold:()=>{resources(ctx.actor).gold+=effect.value;rewards.push({resource:'gold',quantity:effect.value});},
      effect_combat:()=>startCombat(ctx,effect.target,'room',rng),
      effect_rumor:()=>{ctx.actor.data.rumors??=[];ctx.actor.data.rumors.push({subject:template.id,text:'A scratched warning suggests danger nearby. Its accuracy is uncertain.',day:ctx.day});},
      effect_observation:()=>{ctx.actor.data.observations??=[];ctx.actor.data.observations.push({subject:template.id,text:byId('texts',template.opening).text,day:ctx.day});},
      effect_social:()=>{
        ctx.actor.data.reputation=(ctx.actor.data.reputation??0)+effect.value;
        const target=room.actorId && ctx.world?.entities[room.actorId];
        if(target){ctx.actor.data.relationships??={};ctx.actor.data.relationships[target.id]=(ctx.actor.data.relationships[target.id]??0)+effect.value;history.target=target.id;
          ctx.actor.data.memories??=[];ctx.actor.data.memories.push({actor:target.id,event:template.id,day:ctx.day,value:effect.value});}
      },
    };
    if(!handlers[effect.tag]) throw new Error(`Unsupported Event effect ${effect.tag}`);
    handlers[effect.tag]();
  }
  ctx.pit.eventHistory.push(history);
  return {text:`${template.label}: ${choice.label}.${check?check.success?' Success.':' Failure.':''}`,check,rewards};
}
