import { byId } from '../HearthVale_Content/expedition.js';
import { bagFits } from '../HearthVale_Shell/src/economy.js';
import { escapeHtml as e } from './surface-views.js';

// An outstanding personal order is already persisted. Project that fact rather
// than adding a notification queue, acknowledgement state, or remote knowledge.
export function worldUpdates(world,actor) {
  const day=world.globals.hearthvaleSurface.calendar.day;
  const ready=(world.globals.hearthvaleServices?.orders??[])
    .filter(order=>order.actor===actor.id&&order.readyDay<=day);
  if(!ready.length)return '';
  const items=ready.map(order=>`${byId('items',order.item).label} ×${order.quantity}`).join(', ');
  const blocked=ready.some(order=>!bagFits(actor,order.item));
  return `<section aria-label="World updates"><h2>Ready at the General Shop</h2><p>${e(items)}. Open Crafting and collection at the Shop to collect your order${ready.length===1?'':'s'}.${blocked?' Make room in your Bag to collect the items that do not fit.':''}</p></section>`;
}
