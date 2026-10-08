import { fixtures } from './phase1-fixtures.js';
import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';

const frame=document.querySelector('#game'),output=document.querySelector('#results');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'];
const doc=()=>frame.contentDocument;
const check=(value,message)=>{if(!value)throw Error(message);};
const saved=()=>localStorage.getItem(keys[1]);
const world=()=>JSON.parse(saved()).state.world;
const actor=()=>world().entities[world().globals.hearthvaleSurface.playerId];
const pit=()=>world().entities.hv_pit_1.data;
function click(command,value){const b=[...doc().querySelectorAll('[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}/${value}`);b.click();}
function intent(type,slot,mode){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>{const a=JSON.parse(b.dataset.value);return a.type===type&&(slot===undefined||a.params.slot===slot)&&(mode===undefined||a.params.mode===mode);});check(b,`Missing ${type}/${slot}/${mode}`);b.click();check(!doc().querySelector('#status').textContent,'Action failed');}
async function page(snapshot){localStorage.setItem(keys[0],snapshot);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});click('load');}
function fixture(kind){
  const shell=createSurfaceShell();
  const runtime=createRuntime({saved:fixtures.attack,shell:{...shell,actions:{...shell.actions,'fixture.magic-alignment':{resolve:({world,attempt})=>{
    const a=structuredClone(world.entities[attempt.actor]),p=structuredClone(world.entities.hv_pit_1.data),c=p.expedition.combat;
    a.data.attributes.traits=[];a.data.attributes.baseStats={STR:3,DEX:30,CON:3,INT:2,WIS:2,CHA:1};
    Object.assign(a.data.attributes.resources,{hp:9,hearts:3,sanity:5,essence:20});a.data.statuses={poison:true};
    a.data.inventory.spells=['spell_barrier','spell_teleport',null,null];
    a.data.inventory.equipped[0]={id:`${a.id}_alignment_sword`,templateId:'item_sword',quantity:1,durability:12};
    a.data.inventory.bag[0]={id:`${a.id}_alignment_teleport`,templateId:'item_scroll_teleport',quantity:2};
    Object.assign(c,{phase:'attack',kind:'return',barrier:0,enemy:{...c.enemy,hp:100},enemyKnockdown:false,playerKnockdown:false,moveCancelled:false});
    if(kind==='cancelled'){Object.assign(c,{phase:'advantage',moveCancelled:true,barrier:3});}
    if(kind==='overcast'){p.expedition.strain=2;a.data.attributes.baseStats.WIS=0;}
    if(kind==='scroll'){p.expedition.strain=9;a.data.attributes.baseStats.WIS=0;a.data.attributes.resources.essence=0;}
    return {effects:[...Object.entries(a.data).map(([key,value])=>({type:'data',entity:a.id,key,value})),{type:'data',entity:'hv_pit_1',key:'expedition',value:p.expedition}]};
  }}}}});
  runtime.startScene();runtime.submit({actor:runtime.snapshot().world.globals.hearthvaleSurface.playerId,type:'fixture.magic-alignment'});runtime.resolveScene({offscreenBudget:0});return runtime.save();
}
document.querySelector('#run').onclick=async()=>{
  const backup=keys.map(k=>localStorage.getItem(k)),reports=[];output.textContent='Running…';
  try{
    for(const mode of ['dodge','block','counter']){
      await page(fixture('barrier'));click('pit-tab','spells');
      if(doc().querySelector('[data-command="magic-introduction-seen"]'))click('magic-introduction-seen');
      intent('pit.cast',0);check(pit().expedition.combat.barrier===3,'Barrier missing');
      check(/next enemy offensive action/.test(doc().body.textContent)&&!/this round/.test(doc().body.textContent),'Old Barrier lifetime UI');
      await page(saved());check(pit().expedition.combat.barrier===3,'Reload lost Barrier');
      intent('pit.defend',mode==='block'?0:undefined,mode);
      check(pit().expedition.combat.barrier===0,'Barrier did not expire');
      if(mode==='counter')check(pit().expedition.combat.phase==='counterattack','Lost Counterattack');
      reports.push(`Barrier with ${mode}, active-save reload and offensive expiration: PASS`);
    }
    await page(fixture('cancelled'));intent('pit.unarmed');
    check(pit().expedition.combat.barrier===3&&pit().expedition.combat.phase==='attack','Cancelled round expired Barrier');
    await page(saved());check(pit().expedition.combat.barrier===3,'Reload lost carried Barrier');
    reports.push('Barrier survives cancelled round and reload: PASS');
    for(const kind of ['safe','overcast','scroll']){
      const snapshot=fixture(kind),initial=JSON.parse(snapshot).state.world;
      const before=initial.entities[initial.globals.hearthvaleSurface.playerId].data.attributes.resources.hp;
      await page(snapshot);
      click('pit-tab',kind==='scroll'?'bag':'spells');
      if(doc().querySelector('[data-command="magic-introduction-seen"]'))click('magic-introduction-seen');
      intent(kind==='scroll'?'pit.scroll':'pit.cast',kind==='scroll'?0:1);
      check(pit().expedition===null&&actor().primaryLocation==='loc_pit_entrance','Teleport failed extraction');
      check(actor().data.attributes.resources.hp===before,`HP changed on ${kind} Teleport: ${before} → ${actor().data.attributes.resources.hp}`);
      check(actor().data.statuses.poison,'Teleport cleared Poison');
      check(pit().lastExpedition.reason==='teleport','Teleport used Return route');
      check(pit().lastResult.cost===(kind==='scroll'?0:kind==='overcast'?2:1),'Wrong learned/Scroll cost');
      if(kind==='overcast')check(pit().lastResult.overcast.dc===14,'Wrong Overcast');
      if(kind==='scroll')check(!pit().lastResult.overcast&&actor().data.inventory.bag[0].quantity===1,'Scroll pressure/consumption');
      const after=saved();await page(after);check(saved()===after,'Reload changed extracted state');
      reports.push(`Combat Teleport ${kind}: extraction, no enemy/Return action, cost/risk, status and reload: PASS`);
    }
    output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}
  finally{keys.forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
};
