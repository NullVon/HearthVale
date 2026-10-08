import {fixtures as surface} from './m6c1-fixtures.js';
import {fixtures as endings} from './m6c2-fixtures.js';
import {fixtures as magic} from './phase9-fixtures.js';
const fixtures={...surface,...endings,...magic},frame=document.querySelector('#game'),output=document.querySelector('#results'),select=document.querySelector('#checkpoint');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'],reports=[];
for(const name of Object.keys(fixtures)){const option=document.createElement('option');option.textContent=name;select.append(option);}
const doc=()=>frame.contentDocument;
const check=(ok,label)=>{if(!ok)throw Error(label);};
function click(command,value){const b=[...doc().querySelectorAll('[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}/${value}`);b.click();}
function intent(type,predicate=()=>true){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>{const action=JSON.parse(b.dataset.value);return action.type===type&&predicate(action.params);});check(b,`Missing ${type}`);b.click();}
async function load(name){localStorage.setItem(keys[0],fixtures[name]);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});click('load');check(doc().querySelector('#app h1'),'Production screen failed to load');}
const savedWorld=()=>JSON.parse(localStorage.getItem(keys[1])).state.world;
const state=()=>{const w=savedWorld();return {actor:w.entities[w.globals.hearthvaleSurface.playerId],combat:w.entities.hv_pit_1.data.expedition?.combat};};
async function measure(label){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const d=doc(),width=d.documentElement.clientWidth;check(d.documentElement.scrollWidth<=width,`${label}: horizontal overflow`);
  for(const b of d.querySelectorAll('button,summary'))if(b.getClientRects().length){const r=b.getBoundingClientRect();check(r.height>=44&&r.left>=-1&&r.right<=width+1,`${label}: clipped/small ${b.textContent}`);}
  reports.push(`${label}: PASS`);
}
function roundTrip(){click('menu');click('save');const saved=localStorage.getItem(keys[0]);click('load');click('menu');click('save');check(localStorage.getItem(keys[0])===saved,'Save/load changed state');click('close');}
async function run(){const backup=keys.map(k=>localStorage.getItem(k));reports.length=0;output.textContent='Running…';try{
  for(const width of [320,390,430,1100]){frame.style.width=`${width}px`;
    for(const name of ['Surface','Training','Combat','Incoming defense','Magic','Successor candidates','Brute ending','Day 40 ending']){await load(name);if(name==='Magic')click('pit-tab','bag');await measure(`${width} ${name}`);
      doc().documentElement.classList.add('large-text');await measure(`${width} ${name} enlarged`);doc().documentElement.style.fontSize='36px';await measure(`${width} ${name} 200%`);
    }
  }
  frame.style.width='390px';
  for(const [slot,id] of ['fireball','force','heal','barrier'].entries()){
    await load('Magic');click('pit-tab','bag');check(!doc().querySelector('.check-math'),'Normal Mode leaked formulas');
    check(doc().querySelector('[data-command="expedition"]'),'Missing Items actions');
    intent('pit.scroll',p=>p.container==='bag'&&p.slot===slot);const after=state();
    check(after.actor.data.inventory.bag[slot].quantity===2&&after.combat.spellStrain===undefined,`${id}: wrong consumption/Strain`);
    check(after.combat.phase===(id==='force'?'advantage':'incoming'),`${id}: wrong next choice`);
    if(id==='fireball')check(after.combat.enemy.hp===43,'Fireball damage changed');
    if(id==='heal')check(after.actor.data.attributes.resources.hp===12,'Heal result changed');
    if(id==='barrier')check(after.combat.barrier===3,'Barrier result changed');
    check(doc().querySelector('.outcome').textContent.includes('1 scroll consumed'),`${id}: hidden feedback`);roundTrip();await measure(`390 ${id} result and reload`);
    if(id==='force')intent('pit.unarmed');else intent('pit.defend',p=>p.mode==='dodge');
    check(state().combat.round===2&&state().actor.data.attributes.resources.hp===(id==='heal'?11:3),`${id}: continuation/Poison changed`);
    reports.push(`${id}: exact one action, one item, normal continuation and Poison boundary PASS`);
  }
  await load('Combat');const buttons=[...doc().querySelectorAll('[data-command="expedition"]')];check(buttons[0].getBoundingClientRect().top<frame.clientHeight-80,'First combat action requires scrolling');
  check(doc().querySelector('.combat-decisions').getBoundingClientRect().top<doc().querySelector('.outcome').getBoundingClientRect().top,'Feedback pushes choices down');reports.push('390 combat: first action visible and choices before feedback PASS');
  output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
}catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}finally{keys.forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}}
document.querySelector('#run').onclick=run;document.querySelector('#load').onclick=()=>load(select.value).then(()=>output.textContent=`Loaded ${select.value}.`);
