import { fixtures } from './phase1-fixtures.js';
import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { createSurfaceGame } from '../../HearthVale_Shell/src/surface.js';
import { sellPrice } from '../../HearthVale_Shell/src/economy.js';

const frame=document.querySelector('#game'),output=document.querySelector('#results');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'];
const doc=()=>frame.contentDocument,win=()=>frame.contentWindow;
const check=(value,message)=>{if(!value)throw Error(message);};
const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const saved=()=>localStorage.getItem(keys[1]);
const world=snapshot=>JSON.parse(snapshot).state.world;
const actor=snapshot=>{const w=world(snapshot);return w.entities[w.globals.hearthvaleSurface.playerId];};
function click(command,value){const b=[...doc().querySelectorAll('[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}/${value}`);b.click();}
const row=id=>doc().querySelector(`[data-command="sell-select"][data-value="${id}"]`);
const sellPanel=()=>doc().querySelector('[data-shop-section="Sell"]');
async function page(snapshot){localStorage.setItem(keys[0],snapshot);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});click('load');await tick();}
function fixture(){
  const shell=createSurfaceShell();
  const runtime=createRuntime({saved:fixtures.attack,shell:{...shell,actions:{...shell.actions,'fixture.bulk-sale':{resolve:({world,attempt})=>{
    const a=structuredClone(world.entities[attempt.actor]);
    a.data.inventory.equipped.fill(null);a.data.inventory.chest=null;a.data.inventory.bag.fill(null);
    for(const [slot,templateId,quantity]of [[0,'item_hp_potion_basic',1],[1,'item_antidote',2],[2,'item_cleanse_tonic',3],[3,'item_scroll_fireball',2]])
      a.data.inventory.bag[slot]={id:`${a.id}_bulk_${slot}`,templateId,quantity};
    a.data.holdings={materials:{item_moonleaf:4,item_iron_ore:3,item_beast_fang:3,item_crystal_shard:2},valuables:{item_silver_locket:2,item_town_medal:1}};
    a.data.attributes.resources.gold=100;
    return {effects:[...Object.entries(a.data).map(([key,value])=>({type:'data',entity:a.id,key,value})),
      {type:'move',entity:a.id,location:'loc_shop'},{type:'data',entity:'hv_pit_1',key:'expedition',value:null}]};
  }}}}});
  runtime.startScene();runtime.submit({actor:runtime.snapshot().world.globals.hearthvaleSurface.playerId,type:'fixture.bulk-sale'});runtime.resolveScene({offscreenBudget:0});return runtime.save();
}

document.querySelector('#run').onclick=async()=>{
  const backup=keys.map(k=>localStorage.getItem(k)),reports=[];output.textContent='Running…';
  try{
    for(const large of [false,true]){
      const initial=fixture();await page(initial);doc().documentElement.classList.toggle('large-text',large);sellPanel().open=true;await tick();
      const buyOpen=!large;doc().querySelector('[data-shop-section="Buy"]').open=buyOpen;
      const sellButton=()=>doc().querySelector('[data-command="sell-selected"]');
      const beforeAutosave=saved();check(sellButton().disabled,'Empty Sell enabled');sellButton().click();check(saved()===beforeAutosave,'Empty Sell transacted');
      check(!row('item_scroll_fireball'),'Unsellable Scroll offered');
      check(![...sellPanel().querySelectorAll('[data-command="service"]')].length,'Old immediate sale present');
      win().scrollTo(0,180);doc().querySelector('main').scrollTop=120;await tick();
      const position={window:win().scrollY,main:doc().querySelector('main').scrollTop};
      const retained=()=>{check(sellPanel().open,'Sell tab closed');check(doc().querySelector('[data-shop-section="Buy"]').open===buyOpen,'Buy tab changed');check(Math.abs(win().scrollY-position.window)<2,'Window jumped');check(Math.abs(doc().querySelector('main').scrollTop-position.main)<2,'Shop jumped');};
      click('sell-select','item_hp_potion_basic');click('sell-select','item_cleanse_tonic');await tick();retained();
      check(row('item_hp_potion_basic').getAttribute('aria-pressed')==='true'&&row('item_cleanse_tonic').getAttribute('aria-pressed')==='true','Multiple selection failed');
      click('sell-select','item_hp_potion_basic');check(row('item_hp_potion_basic').getAttribute('aria-pressed')==='false','Deselection failed');
      check(row('item_cleanse_tonic').getAttribute('aria-pressed')==='true','Deselection removed other selection');
      click('sell-select','item_hp_potion_basic');check(saved()===beforeAutosave,'Selection mutated saved gameplay');
      reports.push(`${large?'Large text':'Ordinary'}: multi-selection, deselection, no immediate sale, empty Sell and retained tab/scroll: PASS`);
      const a=actor(initial),total=sellPrice(a.data.inventory.bag[0])+3*sellPrice(a.data.inventory.bag[2]);
      click('sell-selected');await tick();retained();check(!doc().querySelector('#status').textContent,'Sale error');
      const after=saved(),sold=actor(after);
      check(sold.data.attributes.resources.gold===100+total,'Wrong combined payout');
      check(sold.data.inventory.bag[0]===null&&sold.data.inventory.bag[2]===null,'Full stacks not sold');
      check(JSON.stringify(sold.data.inventory.bag[1])===JSON.stringify(a.data.inventory.bag[1]),'Unselected stack changed');
      check(JSON.stringify(sold.data.holdings)===JSON.stringify(a.data.holdings),'Unselected holdings changed');
      check(!sellPanel().querySelector('[aria-pressed="true"]')&&sellButton().disabled,'Selection not cleared');
      check(doc().activeElement===sellPanel().querySelector('summary'),'Sale lost keyboard focus');
      sellButton().click();check(saved()===after,'Empty second sale repeated');
      check(createSurfaceGame({saved:after}).save()===after,'Core reload changed transaction');
      reports.push(`${large?'Large text':'Ordinary'}: one bulk sale, quantity pricing, untouched items, cleared selection, tab/scroll and exact saved state: PASS`);
      await page(after);sellPanel().open=true;
      check(sellButton().disabled&&!row('item_hp_potion_basic')&&!row('item_cleanse_tonic'),'Browser reload restored sold items/selection');
      click('sell-select','item_antidote');click('move','loc_surface');click('move','loc_shop');sellPanel().open=true;
      check(sellButton().disabled,'Selection survived leaving Shop');
      reports.push(`${large?'Large text':'Ordinary'}: browser reload and departure reset: PASS`);
    }
    output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}
  finally{keys.forEach((key,i)=>backup[i]===null?localStorage.removeItem(key):localStorage.setItem(key,backup[i]));}
};
