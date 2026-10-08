import { fixtures } from './phase1-fixtures.js';
import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { byId } from '../../HearthVale_Content/expedition.js';

const frame=document.querySelector('#game'), output=document.querySelector('#results');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'];
const doc=()=>frame.contentDocument;
const check=(ok,text)=>{if(!ok)throw Error(text);};
const noPause=()=>check(!/Next round|Resolve cancelled round|Resolve committed enemy move|Round outcome/.test(doc().querySelector('main').textContent),'Obsolete non-decision screen');
function click(command,value){const b=[...doc().querySelectorAll(`[data-command="${command}"]`)].find(b=>value===undefined||b.dataset.value===value);check(b,`Missing ${command}`);b.click();}
function intent(type,mode,slot){
  const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>{
    const a=JSON.parse(b.dataset.value);return a.type===type&&(mode===undefined||a.params.mode===mode)&&(slot===undefined||a.params.slot===slot);
  });check(b,`Missing ${type}/${mode}/${slot}`);b.click();check(!doc().querySelector('#status').textContent,doc().querySelector('#status').textContent);noPause();
}
function fixture(phase='attack',knockedDown=false,extra=''){
  const shell=createSurfaceShell();
  const runtime=createRuntime({saved:fixtures.attack,shell:{...shell,actions:{...shell.actions,
    'fixture.phase2':{resolve:({world,attempt})=>{
      const actor=structuredClone(world.entities[attempt.actor]),pit=structuredClone(world.entities.hv_pit_1.data),c=pit.expedition.combat;
      actor.data.attributes.baseStats={STR:3,DEX:2,CON:3,INT:2,WIS:2,CHA:1};actor.data.attributes.traits=[];
      actor.data.attributes.resources.hp=16;actor.data.attributes.resources.essence=20;actor.data.attributes.resources.arrows=10;actor.data.statuses={poison:true};
      actor.data.inventory.equipped=['item_sword','item_bow','item_hammer','item_shield'].map((templateId,i)=>({id:`${actor.id}_phase2_${i}`,templateId,quantity:1,...(byId('items',templateId).maxDurability?{durability:byId('items',templateId).maxDurability}:{})}));
      Object.assign(c,{phase,kind:'return',enemy:{...c.enemy,templateId:'enemy_slime',hp:30},round:1,enemyKnockdown:false,playerKnockdown:knockedDown,moveCancelled:false});
      delete c.range;delete c.skippedAttack;
      actor.data.inventory.spells=['spell_fireball','spell_heal','spell_barrier',null];
      if(extra==='scroll')actor.data.inventory.equipped[3]={id:`${actor.id}_phase21_scroll`,templateId:'item_scroll_force',quantity:1};
      if(extra==='hammer')actor.data.inventory.equipped[2]={id:`${actor.id}_phase21_hammer`,templateId:'item_fang_hammer',quantity:1,durability:byId('items','item_fang_hammer').maxDurability};
      c.committed={...byId('moves','move_slime_bash'),offensive:true,damageType:'physical'};
      return {effects:[...Object.entries(actor.data).map(([key,value])=>({type:'data',entity:actor.id,key,value})),{type:'data',entity:'hv_pit_1',key:'expedition',value:pit.expedition}]};
    }}}}});
  runtime.startScene();runtime.submit({actor:runtime.snapshot().world.globals.hearthvaleSurface.playerId,type:'fixture.phase2'});runtime.resolveScene({offscreenBudget:0});return runtime.save();
}
async function page(saved){localStorage.setItem(keys[0],saved);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});click('load');}
const savedState=()=>JSON.parse(localStorage.getItem(keys[1])).state.world;
output.textContent='Ready.';
document.querySelector('#run').disabled=false;
document.querySelector('#run').onclick=async()=>{
  const backup=keys.map(k=>localStorage.getItem(k)),reports=[];output.textContent='Running…';
  try{
    await page(fixture());
    check(/Your Dodge chance: 25%/.test(doc().body.textContent)&&/Speed -1/.test(doc().body.textContent),'Missing normal decision values');
    check(!doc().querySelector('.check-math'),'Normal mode leaked machinery');
    check(!/NEAR|FAR|Range|Move to/.test(doc().querySelector('main').textContent),'Range leaked into combat');
    check([...doc().querySelectorAll('.weapon-tile[data-command]')].some(b=>JSON.parse(b.dataset.value).params.slot===1),'Bow unavailable');
    intent('pit.attack',undefined,0);
    check(/STAGGERED — Slime Bash cancelled/.test(doc().body.textContent),'Missing Stagger presentation');
    check(/Press the Advantage: choose one immediate offensive action/.test(doc().body.textContent),'Missing Advantage choice');
    const advantage=localStorage.getItem(keys[1]);
    await page(advantage);check(/Press the Advantage/.test(doc().body.textContent),'Reload lost Advantage');
    intent('pit.attack',undefined,0);
    const w=savedState(),c=w.entities.hv_pit_1.data.expedition.combat;
    check(c.round===2&&c.phase==='attack','Advantage chained or failed to advance');
    check(w.entities[w.globals.hearthvaleSurface.playerId].data.attributes.resources.hp===15,'Poison did not tick once');
    reports.push('Stagger → one free attack → next round; save/load preserves choice and Poison ticks once');
    await page(fixture('incoming'));
    const tiles=[...doc().querySelectorAll('.reaction-tile')];
    check(tiles.some(t=>/Sword/.test(t.textContent)&&/Block/.test(t.textContent)),'Missing tile-scoped Block choice');
    check(!/Block with Sword|Counterattack with Sword/.test(doc().body.textContent),'Duplicated global item reactions');
    intent('pit.defend','counter');
    check(savedState().entities.hv_pit_1.data.expedition.combat.phase==='counterattack','Incoming attack did not open response choice');
    check(/choose one offensive response/.test(doc().body.textContent),'Missing Counterattack timing');
    const response=localStorage.getItem(keys[1]);await page(response);
    check(localStorage.getItem(keys[1])===response,'Reload replayed the incoming hit');
    intent('pit.attack',undefined,0);
    check(/Counterattack — Sword/.test(doc().querySelector('.outcome').textContent),'Counterattack result missing');
    check(savedState().entities.hv_pit_1.data.expedition.combat.round===2,'Counterattack did not end round');
    click('menu');click('settings');click('dev-mode');click('menu');click('close');
    check(doc().querySelector('.check-math')&&/Defender DEX/.test(doc().body.textContent)&&/d20/.test(doc().body.textContent),'Dev Mode missing formulas/quality rolls');
    reports.push('Counterattack resolves incoming first, saves the offensive response, and advances once; Block stays on tiles; Dev Mode exposes machinery');
    await page(fixture('incoming'));
    intent('pit.defend','counter');
    check(doc().querySelector('[data-command="pit-tab"][data-value="spells"]'),'Normal Mode missing learned spells');
    click('menu');click('settings');click('dev-mode');click('menu');click('close');click('pit-tab','spells');
    const spells=[...doc().querySelectorAll('[data-command=expedition]')].map(b=>JSON.parse(b.dataset.value)).filter(a=>a.type==='pit.cast');
    check(spells.length===1&&spells[0].params.slot===0,'Supportive Counterattack spell available');
    intent('pit.cast',undefined,0);
    check(savedState().entities.hv_pit_1.data.expedition.combat.round===2,'Spell Counterattack chained');
    await page(fixture('incoming',false,'scroll'));intent('pit.defend','counter');click('pit-tab','bag');intent('pit.scroll',undefined,3);
    check(savedState().entities.hv_pit_1.data.expedition.combat.round===2,'Scroll Counterattack chained');
    reports.push('Learned spell and Scroll Counterattacks resolve once; supportive spells are unavailable');
    await page(fixture('attack',false,'hammer'));intent('pit.attack',undefined,2);
    check(/Enemy Dodge 0%/.test(doc().body.textContent)&&/KNOCKED DOWN/.test(doc().body.textContent),'Missing enemy vulnerability');
    intent('pit.unarmed');
    check(!savedState().entities.hv_pit_1.data.expedition.combat.enemyKnockdown,'Advantage did not consume Knockdown');
    reports.push('Normal Knockdown gives Advantage; its next attack consumes the Dodge vulnerability');
    await page(fixture('incoming',true));
    check(/Dodge — 0%/.test(doc().body.textContent),'Player Knockdown did not show zero Dodge');
    intent('pit.defend','counter');
    check(savedState().entities.hv_pit_1.data.expedition.combat.phase==='counterattack','Knocked-down player lost response');
    click('pit-tab');
    const actions=[...doc().querySelectorAll('[data-command=expedition]')].map(b=>JSON.parse(b.dataset.value));
    check(!actions.some(a=>['pit.use','pit.swap','pit.defend','pit.move'].includes(a.type)),'Nonoffensive immediate action exposed');
    intent('pit.unarmed');
    reports.push('Knockdown shows 0% Dodge, allows Counterattack, and keeps the ordinary turn');
    check(doc().documentElement.scrollWidth<=frame.clientWidth,'Combat causes horizontal overflow at phone width');
    reports.push('390px portrait viewport has no horizontal overflow');
    output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}
  finally{keys.forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
};
