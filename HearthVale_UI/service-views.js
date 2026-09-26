import { escapeHtml as e,button,unavailable } from './surface-views.js';
import { economyState,shopOffers } from '../HearthVale_Shell/src/economy.js';
import { expeditionCatalog as catalog,byId } from '../HearthVale_Content/expedition.js';
import { livingSituations } from '../HearthVale_Shell/src/living-situations.js';
import { equipmentEffectText } from '../HearthVale_Story/expedition.js';
import { activeSituation } from '../HearthVale_Shell/src/situations.js';
import { informationCards } from '../HearthVale_Shell/src/information.js';
const controls=choices=>choices.map(c=>button(c.label,'service',JSON.stringify(c.params))).join('');
export function serviceView(world,actor,choices){
  const state=world.globals.hearthvaleServices;
  const inventoryOps=['use','armor','swap','learn','discard'];
  const visible=choices.filter(c=>!inventoryOps.includes(c.params.op));
  const ownsResult=state?.lastResultActor===actor.id||state?.lastResultActor===undefined&&(actor.data.generation??1)===1;
  let content=state?.lastResult&&ownsResult?`<section aria-label="Service outcome"><p>${e(state.lastResult)}</p></section>`:'';
  content+=`<div class="actions">${controls(visible.filter(c=>['talk','train'].includes(c.params.op)))}</div>`;
  if(actor.primaryLocation==='loc_shop'){
    content+='<h2>Shop</h2><p>Shared stock. The last 2 Basic HP Potions and 10 Arrows are protected. Purchases, sales and orders cost no AP.</p>';
    for(const request of livingSituations(world).filter(s=>s.primaryLocation===actor.primaryLocation)){
      const d=request.data.definition;
      if(activeSituation(request))content+=`<p>${e(d.label)}: ${d.quantity} ${e(byId('items',d.material).label)} requested by the end of Day ${request.data.expiresDay-1}. Reward: ${d.reward.gold}G, ${d.reward.xp} XP.</p>`;
      else if(request.lifecycle==='expired')content+=`<p>${e(d.expiryText)}</p>`;
      else if(request.lifecycle==='cancelled')content+=`<p>${e(d.withdrawnText)}</p>`;
    }
    for(const [label,ops]of [['Buy',['buy','buy-used']],['Sell',['sell','sell-holding']],['Formal Turn-In',['turn-in']],['Material requests',['fulfill-request']],['Crafting and collection',['order','collect']]])
      content+=`<details><summary>${label}</summary><div class="actions">${controls(visible.filter(c=>ops.includes(c.params.op)))||'<p>No available transaction.</p>'}${label==='Buy'?shopOffers(actor,economyState(world)).filter(o=>o.reason).map(o=>unavailable(`${o.params.op==='buy-used'?'Used ':''}${byId('items',o.item.templateId).label} — ${o.cost}G · Stock ${o.quantity}${o.item.durability!==undefined?` · DUR ${o.item.durability}`:''}`,o.reason)).join(''):''}</div></details>`;
    content+='<p>Selling pays Gold. Formal Turn-In gives one material to document recipes; it is not a sale.</p>';
    content+='<p>Orders finish next Day. If your Bag is full, make room before purchasing or collecting; an order remains waiting. Gear recipes require an existing Blacksmith.</p>';
    content+=`<details><summary>Item reference and comparison</summary>${catalog.vendors[0].stock.map(s=>comparison(byId('items',s.item))).join('')}</details>`;
  }
  if(['loc_guild','loc_town_hall'].includes(actor.primaryLocation)){
    content+='<h2>Shared opportunities</h2><p>Tracking remembers a posting; any eligible adventurer may complete it.</p>';
    content+=`<div class="actions">${controls(visible.filter(c=>['fulfill-request','track-opportunity','untrack-opportunity'].includes(c.params.op)))}</div>`;
    for(const id of actor.data.trackedOpportunities??[]){const notice=informationCards(world,actor.id).find(c=>c.subject===id&&c.topic==='public-request');if(notice)content+=`<p>Tracked: ${e(notice.text)}</p>`;}
    content+=`<h2>${actor.primaryLocation==='loc_guild'?'Guild Records':'Town Records'}</h2>`+recordCards(world,actor,actor.primaryLocation);
    if(actor.primaryLocation==='loc_guild'&&!state?.auronTrainingUnlocked)content+='<p>Training with Auron is not yet unlocked.</p>';
  }
  return content;
}
export function comparison(d){return `<article><h3>${e(d.label)}</h3><p>${e([d.damage!==undefined?`DMG ${d.damage}`:null,d.defense!==undefined?`DEF ${d.defense}`:null,d.maxDurability?`Max DUR ${d.maxDurability}`:null,d.impact!==undefined?`Impact ${d.impact}`:null,d.range,d.accuracy?`${d.accuracy} accuracy`:null].filter(Boolean).join(' · ')||equipmentEffectText(d.effects))}</p></article>`;}
export function inventoryControls(actor,choices){return `<h2>Item actions</h2>${actor.data.inventory.bag.filter(Boolean).map(i=>comparison(byId('items',i.templateId))).join('')}<div class="actions">${controls(choices.filter(c=>['use','armor','swap','learn'].includes(c.params.op)))}</div>${actor.data.inventory.bag.map((item,bag)=>item&&!choices.some(c=>c.params.bag===bag&&['use','armor','swap','learn'].includes(c.params.op))?unavailable(byId('items',item.templateId).label,'No use or equipment change is available in your current condition.'): '').join('')}<details><summary>Discard items</summary><p>Discarding permanently removes the listed Bag contents.</p>${controls(choices.filter(c=>c.params.op==='discard'))}</details>`;}
export function recordCards(world,actor,holder=actor.id){
  const personal=holder===actor.id;
  const discoveries=personal?Object.values(world.entities.hv_pit_1.data.discoveries??{}).filter(d=>d.actor===actor.id||d.public===true):[];
  const records=[...discoveries.map(d=>({title:d.title,text:`Finder: ${d.finder??world.entities[d.actor]?.data.identity.name??'Unknown adventurer'}. Year ${d.year??1}, Day ${d.day}.`})),...(personal?actor.data.observations??[]:[]).map(d=>({title:'Observation',text:d.text})),...(personal?actor.data.rumors??[]:[]).map(d=>({title:'Rumor — unverified',text:d.text}))];
  const closed=[];
  for(const r of informationCards(world,holder)){
    const entry={title:r.state==='Rumor'?'Rumor — unverified':'Known report',text:`${r.text} Observation dated Day ${r.observedDay}.`};
    (r.topic==='public-request'&&['resolved','expired','cancelled','failed','transformed','invalidated'].includes(r.status)?closed:records).push(entry);
  }
  const cards=list=>list.map(r=>`<details><summary>${e(r.title)}</summary><p>${e(r.text)}</p></details>`).join('');
  return cards(records)+(closed.length?`<details><summary>Closed opportunities</summary>${cards(closed)}</details>`:'')||'<p>No known records yet.</p>';
}

export function weeklySnapshots(world,actor){
  return (world.globals.hearthvaleWeekly?.snapshots??[]).filter(s=>s.holder===actor.id).map(s=>
    `<details><summary>Week ${s.week} Snapshot — Days ${s.firstDay}–${s.completedDay}</summary>${s.facts.length
      ?`<ul>${s.facts.map(f=>`<li>${e(f.text)}</li>`).join('')}</ul>`:'<p>No new meaningful changes known to you this week.</p>'}</details>`).join('');
}
