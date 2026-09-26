import { economyState,economyChoices,resolveEconomy } from './economy.js';
import { trainingChoices,train } from './training.js';
import { talk } from './social.js';
import { byId } from '../../HearthVale_Content/expedition.js';
import { canUseBag,useBag,swap,learn,definitionOf } from './expedition-equipment.js';
import { requestChoices, resolveMaterialRequest, trackingChoices } from './living-situations.js';
import { talkInformationEffects } from './information.js';

export function serviceChoices(world){
  const s=world.globals.hearthvaleSurface,actor=world.entities[s?.playerId],pit=world.entities.hv_pit_1?.data;
  if(world.globals.hearthvaleCompletion?.completed||s?.stage!=='surface'||!actor||actor.lifecycle!=='active'||actor.data.death||actor.data.attributes.resources.hearts<=0
    ||actor.data.attributes.resources.sanity<=0||pit?.expedition||pit?.pendingFinalHeart||pit?.pendingDeath)return [];
  const state=economyState(world),choices=[];
  const add=(op,label,params={})=>choices.push({type:'service.act',label,params:{op,...params}});
  economyChoices(world,actor,state,add);trainingChoices(world,actor,state,add);
  for (const choice of requestChoices(world, actor)) add(choice.op, choice.label, choice.params);
  for (const choice of trackingChoices(world, actor)) add(choice.op, choice.label, choice.params);
  for(const target of Object.values(world.entities))if(target.actor&&target.id!==actor.id&&target.lifecycle==='active'&&target.primaryLocation===actor.primaryLocation)add('talk',`Talk with ${target.data.identity.name}`,{actor:target.id});
  const inv=actor.data.inventory;
  inv.bag.forEach((item,bag)=>{
    if(!item)return;const d=definitionOf(item);
    if(canUseBag(actor,bag))add('use',`Use ${d.label}`,{bag});
    if(d.category==='armor')add('armor',`Wear ${d.label} DEF ${d.defense}; replace ${definitionOf(inv.chest)?.label??'Empty'}`,{bag});
    if(['weapon','shield','scroll'].includes(d.category))inv.equipped.forEach((equipped,slot)=>add('swap',`Equip ${d.label}; replace slot ${slot+1}: ${definitionOf(equipped)?.label??'Empty'}`,{bag,slot}));
    if(d.category==='tome'&&!inv.spells.includes(d.spell)){const empty=inv.spells.indexOf(null);(empty>=0?[empty]:[0,1,2,3]).forEach(slot=>add('learn',`Learn ${byId('spells',d.spell).label}; replace ${inv.spells[slot]?byId('spells',inv.spells[slot]).label:'Empty'}`,{bag,slot}));}
    add('discard',`Discard ${d.label} ×${item.quantity} from Bag ${bag+1}`,{bag,id:item.id});
  });
  return choices;
}
const same=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>a[k]===b[k]);
export const serviceActions={'service.act':{
  eligible:({world,attempt})=>attempt.actor===world.globals.hearthvaleSurface.playerId&&serviceChoices(world).some(c=>same(c.params,attempt.params)),
  resolve:({world,attempt},{rng})=>{
    const original=world.entities[attempt.actor],actor=structuredClone(original),state=economyState(world),p=attempt.params;
    const ctx={world,actor,state,day:world.globals.hearthvaleSurface.calendar.day};
    const handlers={train:()=>train(ctx,p.stat),talk:()=>talk(ctx,world.entities[p.actor]),use:()=>{state.lastResult=useBag(actor,p.bag,rng).text;},swap:()=>swap(actor,p.slot,p.bag),learn:()=>{state.lastResult=learn(actor,p.bag,p.slot).text;},armor:()=>{[actor.data.inventory.chest,actor.data.inventory.bag[p.bag]]=[actor.data.inventory.bag[p.bag],actor.data.inventory.chest];},discard:()=>{actor.data.inventory.bag[p.bag]=null;}};
    const requestEffects = p.op==='fulfill-request' ? resolveMaterialRequest(ctx,p.situation)
      : p.op==='talk' ? talkInformationEffects(world,actor,world.entities[p.actor]) : [];
    if (['track-opportunity','untrack-opportunity'].includes(p.op)) {
      actor.data.trackedOpportunities = (actor.data.trackedOpportunities ?? []).filter(id => id !== p.situation);
      if (p.op === 'track-opportunity') actor.data.trackedOpportunities.push(p.situation);
    }
    else if(p.op==='fulfill-request')state.lastResult=actor.data.memories.at(-1).event;
    else if(handlers[p.op])handlers[p.op]();else resolveEconomy(ctx,p.op,p,rng);
    // Silent inventory/bookmark changes must not claim an earlier Actor's receipt.
    if(!['swap','armor','discard','track-opportunity','untrack-opportunity'].includes(p.op))state.lastResultActor=actor.id;
    return {type:`hearthvale.service.${p.op}`,effects:[...requestEffects,...Object.entries(actor.data).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(original.data[key])).map(([key,value])=>({type:'data',entity:actor.id,key,value})),{type:'global',key:'hearthvaleServices',value:state},
      ...(actor.data.knownActors??[]).filter(id=>!original.data.knownActors?.includes(id)).map(id=>({type:'learn',actor:actor.id,claim:{subject:id,key:'met',value:true}})),
      ...(p.op==='turn-in'?[{type:'learn',actor:actor.id,claim:{subject:'loc_shop',key:`material-${p.item}`,value:{templateId:p.item,known:true}}}]:[])]};
  },
}};
export function serviceArrivalEvents(world){
  const s=world.globals.hearthvaleSurface,original=world.entities[s?.playerId];
  if(s?.stage!=='surface'||!original||original.lifecycle!=='active'||original.data.death||world.entities.hv_pit_1.data.expedition||world.entities.hv_pit_1.data.pendingFinalHeart||world.entities.hv_pit_1.data.pendingDeath)return [];
  const service=byId('locations',original.primaryLocation)?.serviceActor;
  if(!service)return [];
  const target=Object.values(world.entities).find(a=>a.data?.templateId===service);
  if(!target||original.data.knownActors?.includes(target.id))return [];
  const actor=structuredClone(original),state=economyState(world);talk({world,actor,state,day:s.calendar.day},target,true);
  return [{type:'hearthvale.first-service-meeting',effects:[...Object.entries(actor.data).filter(([key,v])=>JSON.stringify(v)!==JSON.stringify(original.data[key])).map(([key,value])=>({type:'data',entity:actor.id,key,value})),{type:'global',key:'hearthvaleServices',value:state},{type:'learn',actor:actor.id,claim:{subject:target.id,key:'met',value:true}}]}];
}
