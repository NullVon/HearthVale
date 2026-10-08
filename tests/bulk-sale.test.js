import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFixture,configure } from './helpers/m3-fixture.js';
import { player,world,item } from './helpers/m2-fixture.js';
import { economyState,sellEntries,sellOffers,sellPrice,resolveEconomy } from '../HearthVale_Shell/src/economy.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { serviceView } from '../HearthVale_UI/service-views.js';

const fixture=()=>surfaceFixture((w,a)=>{
  a.data.inventory.equipped.fill(null);a.data.inventory.chest=null;a.data.inventory.bag.fill(null);
  for(const [slot,id,quantity]of [[0,'item_hp_potion_basic',1],[1,'item_antidote',2],[2,'item_cleanse_tonic',3],[3,'item_scroll_fireball',2]])
    a.data.inventory.bag[slot]=item(a,id,quantity);
  a.data.holdings={materials:{item_moonleaf:4},valuables:{item_silver_locket:3}};
});
const sell=(g,items)=>g.perform('service.act',{op:'sell-bulk',items});

test('Bulk sale consumes full selected stacks, leaves unselected entries, pays existing unit prices and reloads exactly',()=>{
  const g=fixture(),a=player(g),before=structuredClone(a),state=economyState(world(g));
  const items=['item_hp_potion_basic','item_cleanse_tonic','item_silver_locket'];
  const total=sellEntries(a).filter(entry=>items.includes(entry.item)).reduce((sum,entry)=>sum+entry.unit*entry.quantity,0);
  const copy=createSurfaceGame({saved:g.save()});
  for(const run of [g,copy])sell(run,items);
  const after=player(g);
  assert.equal(after.data.attributes.resources.gold,before.data.attributes.resources.gold+total);
  assert.equal(after.data.inventory.bag[0],null);assert.equal(after.data.inventory.bag[2],null);
  assert.deepEqual(after.data.inventory.bag[1],before.data.inventory.bag[1]);assert.deepEqual(after.data.inventory.bag[3],before.data.inventory.bag[3]);
  assert.equal(after.data.holdings.valuables.item_silver_locket,0);assert.deepEqual(after.data.holdings.materials,before.data.holdings.materials);
  assert.equal(after.data.attributes.resources.ap,before.data.attributes.resources.ap);
  const services=economyState(world(g));
  assert.equal(services.stock.item_hp_potion_basic,state.stock.item_hp_potion_basic+1);
  assert.equal(services.stock.item_cleanse_tonic,state.stock.item_cleanse_tonic); // No new vendor stock category.
  assert.deepEqual(services.knownMaterials,state.knownMaterials);
  assert.equal(after.data.memories.at(-1).quantity,3);assert.equal(after.data.memories.at(-1).gold,54);
  assert.equal(copy.save(),g.save());assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
  assert.match(services.lastResult,new RegExp(`for ${total}G`));
});

test('One bulk transaction credits Gold once and preserves per-instance condition prices and used gear',()=>{
  const g=configure(fixture(),w=>{
    const a=w.entities[w.globals.hearthvaleSurface.playerId];a.data.attributes.traits=['trait_frugal'];
    a.data.inventory.bag[4]=item(a,'item_sword');a.data.inventory.bag[4].durability=6;
    a.data.inventory.equipped[0]=item(a,'item_sword');a.data.inventory.chest=item(a,'item_chest_armor');
    a.data.inventory.bag[5]=item(a,'item_sword');a.data.inventory.bag[5].durability=0;
    a.data.inventory.bag[0].quantity=3;
  });
  const actor=structuredClone(player(g)),state=economyState(world(g)),resources=actor.data.attributes.resources;
  const sword=sellOffers(actor).find(offer=>offer.item==='item_sword');
  assert.equal(sword.quantity,2);assert.equal(sword.total,sellPrice(actor.data.inventory.bag[4])+sellPrice(actor.data.inventory.equipped[0]));
  let gold=resources.gold,credits=0;
  Object.defineProperty(resources,'gold',{get:()=>gold,set:value=>{credits++;gold=value;},enumerable:true});
  const selected=['item_sword','item_chest_armor','item_moonleaf','item_hp_potion_basic'];
  const oldStock=state.stock.item_hp_potion_basic;
  const total=sellEntries(actor).filter(entry=>selected.includes(entry.item)).reduce((sum,entry)=>sum+entry.quantity*entry.unit,0);
  resolveEconomy({world:world(g),actor,state,day:1},'sell-bulk',{items:selected});
  assert.equal(credits,1);assert.equal(gold,500+total);
  assert.equal(actor.data.inventory.bag[4],null);assert.equal(actor.data.inventory.equipped[0],null);assert.equal(actor.data.inventory.chest,null);
  assert.equal(actor.data.inventory.bag[5].durability,0);assert.equal(state.used.length,3);
  assert.deepEqual(state.used.map(entry=>entry.durability),[6,12,undefined]);
  assert.equal(actor.data.holdings.materials.item_moonleaf,0);assert.equal(state.knownMaterials.includes('item_moonleaf'),false);
  assert.equal(state.stock.item_hp_potion_basic,oldStock+3);
});

test('Empty, duplicate, unavailable, stale and forged bulk selections reject without any partial mutation',()=>{
  for(const items of [[],Array(1),['item_hp_potion_basic','item_hp_potion_basic'],['item_hp_potion_basic','item_scroll_fireball'],['missing'],null]){
    const g=fixture(),before=g.save();assert.throws(()=>sell(g,items),/unavailable/);assert.equal(g.save(),before);
  }
  const g=fixture();sell(g,['item_hp_potion_basic']);const after=g.save();
  assert.throws(()=>sell(g,['item_hp_potion_basic','item_antidote']),/unavailable/);assert.equal(g.save(),after);
  assert.throws(()=>g.perform('service.act',{op:'sell-bulk',items:['item_antidote'],gold:9999}),/unavailable/);assert.equal(g.save(),after);
  g.perform('Move',{location:'loc_inn'});const away=g.save();assert.throws(()=>sell(g,['item_antidote']),/unavailable/);assert.equal(g.save(),away);
  const actor=structuredClone(player(fixture())),state=economyState(world(fixture())),original=JSON.stringify({actor,state});
  assert.throws(()=>resolveEconomy({actor,state,day:1},'sell-bulk',{items:['item_hp_potion_basic','missing']}),/unavailable/);
  assert.equal(JSON.stringify({actor,state}),original);
});

test('Sell view selects types without immediate service buttons, reflects multiple selections and disables empty Sell',()=>{
  const g=fixture(),before=g.save(),a=player(g),choices=g.serviceChoices();
  const selected=new Set(['item_hp_potion_basic','item_cleanse_tonic']);
  const html=serviceView(world(g),a,choices,selected);
  assert.match(html,/data-value="item_hp_potion_basic" aria-pressed="true"/);
  assert.match(html,/data-value="item_cleanse_tonic" aria-pressed="true"/);
  assert.match(html,/data-value="item_antidote" aria-pressed="false"/);
  assert.doesNotMatch(html,/data-command="sell-select" data-value="item_scroll_fireball"/);
  assert.doesNotMatch(html,/&quot;op&quot;:&quot;sell(?:-holding)?&quot;/);
  assert.match(html,/Selected total: 20G/);assert.match(html,/data-command="sell-selected">Sell/);
  selected.delete('item_hp_potion_basic');
  assert.match(serviceView(world(g),a,choices,selected),/data-value="item_hp_potion_basic" aria-pressed="false"/);
  assert.match(serviceView(world(g),a,choices),/data-command="sell-selected" disabled/);
  assert.equal(g.save(),before);
});
