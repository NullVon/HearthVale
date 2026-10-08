import { byId } from '../../HearthVale_Content/expedition.js';
import { derivedActorValues } from './surface-candidates.js';

const supportedEffects=new Set(['effect_damage','effect_impact','effect_heal','effect_defense','effect_return']);
export function scrollSpell(item) {
  const definition=item&&byId('items',item.templateId);
  return definition?.category==='scroll'?byId('spells',definition.spell):null;
}
export function canCastCombatScroll(actor,combat,item,phase=combat?.phase) {
  const spell=scrollSpell(item);
  if(!combat||!Number.isSafeInteger(item?.quantity)||item.quantity<1||!spell||spell.explorationOnly
    ||!spell.effects.length||spell.effects.some(effect=>!supportedEffects.has(effect.tag)))return false;
  if(!['attack','advantage','counterattack'].includes(phase)||phase!=='attack'&&spell.target!=='enemy')return false;
  if(spell.target==='enemy')return combat.enemy.hp>0;
  if(spell.id==='spell_teleport')return true;
  return spell.target==='self'&&spell.effects.some(effect=>effect.tag==='effect_heal'
    ?actor.data.attributes.resources.hp<derivedActorValues(actor).maxHp
    :effect.tag==='effect_defense'&&combat.barrier<effect.value);
}

// Performance is content-driven. Damage gets INT; support/Impact retain their
// authored magnitudes. No physical hit, Dodge, quality or Defense calculation.
export function applyScrollEffects(actor,combat,spell) {
  let damage=0,impact=0;const descriptions=[];
  for(const effect of spell.effects){
    if(effect.tag==='effect_damage')damage+=Math.max(0,effect.value+actor.data.attributes.baseStats.INT);
    if(effect.tag==='effect_impact')impact+=effect.value;
    if(effect.tag==='effect_heal'){
      const r=actor.data.attributes.resources,before=r.hp;
      r.hp=Math.min(derivedActorValues(actor).maxHp,r.hp+effect.value);
      descriptions.push(`${r.hp-before} HP restored`);
    }
    if(effect.tag==='effect_defense'){combat.barrier=effect.value;descriptions.push(`Barrier ${effect.value} until the next enemy offensive action resolves`);}
  }
  if(spell.target==='enemy'){
    combat.enemy.hp=Math.max(0,combat.enemy.hp-damage);
    descriptions.push(`${damage} damage${impact?`; ${impact} Impact`:''} — automatic hit`);
  }
  return {damage,impact,text:descriptions.join('; ')};
}
