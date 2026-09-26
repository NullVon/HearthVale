import { expeditionCatalog as catalog, byId } from '../../HearthVale_Content/expedition.js';
import { definitionOf,resources } from './expedition-equipment.js';
import { offerLoot } from './expedition-loot.js';
export function economyState(world) {
  return structuredClone(world.globals.hearthvaleServices??{stock:Object.fromEntries(catalog.vendors[0].stock.map(s=>[s.item,s.target])),used:[],knownMaterials:[],orders:[],nextOrder:1});
}
export function validateServices(world){
  const state=world.globals.hearthvaleServices;if(!state)return;
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  if(!state.stock||!catalog.vendors[0].stock.every(s=>integer(state.stock[s.item]))||!Array.isArray(state.used)||!Array.isArray(state.orders)||!Array.isArray(state.knownMaterials)||!integer(state.nextOrder))throw new Error('Invalid service snapshot');
  if(state.knownMaterials.some(id=>byId('items',id)?.category!=='material')||new Set(state.knownMaterials).size!==state.knownMaterials.length)throw new Error('Invalid material knowledge');
  if(state.townSupplies && (typeof state.townSupplies!=='object'||Array.isArray(state.townSupplies)
    ||Object.entries(state.townSupplies).some(([id,count])=>byId('items',id)?.category!=='material'||!integer(count))))throw new Error('Invalid civic supply snapshot');
  for(const item of state.used)if(!byId('items',item.templateId)||!integer(item.soldDay)||(definitionOf(item).maxDurability&&!integer(item.durability)))throw new Error('Invalid used item snapshot');
  for(const order of state.orders)if(!world.entities[order.actor]?.actor||!byId('items',order.item)||!integer(order.readyDay)||!integer(order.quantity)||order.quantity===0)throw new Error('Invalid order snapshot');
}
export function price(actor,base){return Math.ceil(base*(actor.data.attributes.traits.includes('trait_frugal')?0.9:1));}
export function sellPrice(item){const d=definitionOf(item);return d.sellValue??(d.maxDurability?item.durability>0?Math.max(1,Math.floor((d.price??0)*0.5*item.durability/d.maxDurability)):0:Math.floor((d.price??0)*0.5));}
export const bagFits=(actor,id)=>actor.data.inventory.bag.includes(null)||byId('items',id).stackable&&actor.data.inventory.bag.some(i=>i?.templateId===id);
// Read-only offers keep availability and prices identical for resolution and UI.
export function shopOffers(actor,state){
  const offer=(item,cost,quantity,floor,params)=>({item,cost,quantity,floor,params,
    reason:quantity<=floor?(floor?'Protected stock reserve':'Out of stock')
      :resources(actor).gold<cost?`Need ${cost-resources(actor).gold} more Gold`
      :definitionOf(item).category!=='ammo'&&!bagFits(actor,item.templateId)?'Bag full — make room first':null});
  return [...catalog.vendors[0].stock.map(s=>offer({templateId:s.item},price(actor,byId('items',s.item).price),state.stock[s.item],s.floor,{op:'buy',item:s.item})),
    ...state.used.map(item=>offer(item,price(actor,sellPrice(item)*2),1,0,{op:'buy-used',id:item.id}))];
}
export function economyChoices(world,actor,state,add){
  if(actor.primaryLocation!=='loc_shop')return;
  const gold=resources(actor).gold;
  for(const offer of shopOffers(actor,state))if(!offer.reason){const {op,...params}=offer.params;
    add(op,op==='buy'?`Buy ${definitionOf(offer.item).label} — ${offer.cost}G (${offer.quantity} in stock)`
      :`Buy used ${definitionOf(offer.item).label} DUR ${offer.item.durability??'—'} — ${offer.cost}G`,params);}
  for(const container of ['bag','equipped'])actor.data.inventory[container].forEach((item,slot)=>{if(item&&sellPrice(item)>0)add('sell',`Sell ${definitionOf(item).label} — ${sellPrice(item)}G each`,{container,slot,id:item.id});});
  if(actor.data.inventory.chest)add('sell',`Sell worn Chest Armor — ${sellPrice(actor.data.inventory.chest)}G`,{container:'chest',id:actor.data.inventory.chest.id});
  for(const group of ['materials','valuables']) for(const [id,quantity]of Object.entries(actor.data.holdings?.[group]??{}))if(quantity){
    add('sell-holding',`Sell ${byId('items',id).label} — ${byId('items',id).sellValue}G`,{group,item:id});
    if(group==='materials'&&!state.knownMaterials.includes(id))add('turn-in',`Turn in one ${byId('items',id).label} — discover recipes`,{item:id});
  }
  for(const recipe of catalog.recipes)if(recipe.materials.every(m=>state.knownMaterials.includes(m.item))&& (recipe.service==='shop'||state.blacksmithExists===true)
    &&gold>=recipe.gold&&recipe.materials.every(m=>(actor.data.holdings?.materials[m.item]??0)>=m.quantity))
    add('order',`Order ${recipe.label} ×${recipe.quantity} — ${recipe.gold}G; ready next Day`,{recipe:recipe.id});
  for(const order of state.orders)if(order.actor===actor.id&&order.readyDay<=world.globals.hearthvaleSurface.calendar.day&&bagFits(actor,order.item))add('collect',`Collect ${byId('items',order.item).label} ×${order.quantity}`,{id:order.id});
}
export function resolveEconomy(ctx,operation,p,rng){
  const {actor,state,day}=ctx,r=resources(actor),inv=actor.data.inventory;
  const give=(id,count=1)=>offerLoot({actor,expedition:{pendingLoot:[]}},id,count);
  if(operation==='buy'){const d=byId('items',p.item),stock=catalog.vendors[0].stock.find(s=>s.item===p.item);
    if(!stock||state.stock[p.item]<=stock.floor||r.gold<price(actor,d.price)||d.category!=='ammo'&&!bagFits(actor,p.item))throw new Error('Purchase unavailable');
    r.gold-=price(actor,d.price);state.stock[p.item]--;if(d.category==='ammo')r.arrows++;else give(p.item);}
  if(operation==='buy-used'){const index=state.used.findIndex(i=>i.id===p.id),item=state.used[index];r.gold-=price(actor,sellPrice(item)*2);inv.bag[inv.bag.indexOf(null)]=item;state.used.splice(index,1);delete item.soldDay;}
  if(operation==='sell'){
    const item=p.container==='chest'?inv.chest:inv[p.container][p.slot],d=definitionOf(item);r.gold+=sellPrice(item);
    if(['weapon','shield','armor'].includes(d.category)){state.used.push({...item,soldDay:day});if(p.container==='chest')inv.chest=null;else inv[p.container][p.slot]=null;}
    else{item.quantity--;if(!item.quantity)inv[p.container][p.slot]=null;if(Object.hasOwn(state.stock,d.id))state.stock[d.id]++;}
  }
  if(operation==='sell-holding'){actor.data.holdings[p.group][p.item]--;r.gold+=byId('items',p.item).sellValue;}
  if(operation==='turn-in'){actor.data.holdings.materials[p.item]--;state.knownMaterials.push(p.item);}
  if(operation==='order'){const recipe=byId('recipes',p.recipe);r.gold-=recipe.gold;recipe.materials.forEach(m=>actor.data.holdings.materials[m.item]-=m.quantity);state.orders.push({id:`order_${state.nextOrder++}`,actor:actor.id,item:recipe.output,quantity:recipe.quantity,readyDay:day+1});}
  if(operation==='collect'){const index=state.orders.findIndex(o=>o.id===p.id),order=state.orders[index];give(order.item,order.quantity);state.orders.splice(index,1);}
  if(operation==='turn-in'||operation==='sell-holding'&&p.group==='valuables'){
    const record={actor:actor.id,year:ctx.world.globals.hearthvaleSurface.calendar.year,day,
      event:operation==='turn-in'?`Documented ${byId('items',p.item).label}`:`Sold ${byId('items',p.item).label}`,
      kind:operation,item:p.item,quantity:1,...(operation==='sell-holding'?{gold:byId('items',p.item).sellValue}:{})};
    (actor.data.memories??=[]).push(record);
    if(operation==='turn-in')(state.materialRecords??=[]).push(record);
  }
  state.lastResult=`${operation.replaceAll('-',' ')} completed. No AP spent.`;
}
export function advanceEconomy(world,nextDay,state=economyState(world)){const oldStock={...state.stock},oldUsed=state.used;
  state.used=state.used.filter(i=>nextDay-i.soldDay<15);
  if((nextDay-1)%5===0)for(const s of catalog.vendors[0].stock)state.stock[s.item]=Math.max(state.stock[s.item],s.target);
  if((nextDay-1)%5===0)state.weeklyReconciliation={completedDay:nextDay-1,
    refreshed:Object.keys(state.stock).filter(id=>state.stock[id]!==oldStock[id]).map(id=>({item:id,before:oldStock[id],after:state.stock[id]})),
    expired:oldUsed.filter(i=>!state.used.some(kept=>kept.id===i.id)).map(i=>i.id)};
  return {type:'global',key:'hearthvaleServices',value:state};}
