import {fixtures as surface} from './m6c1-fixtures.js';
import {fixtures as terminal} from './m6c2-fixtures.js';
const frame=document.querySelector('#game'),output=document.querySelector('#results'),manual='hearthvale.surface.save.v1',auto='hearthvale.surface.autosave.v1';
const reports=[],errors=[],doc=()=>frame.contentDocument;
function check(ok,text){if(!ok)throw Error(text);}
function click(command,value){const b=[...doc().querySelectorAll('[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}`);b.click();}
async function page(saved){if(saved)localStorage.setItem(manual,saved);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});const w=frame.contentWindow;
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  for(const level of ['warn','error']){const original=w.console[level].bind(w.console);w.console[level]=(...args)=>{errors.push(`${level}: ${args.join(' ')}`);original(...args);};}if(saved)click('load');
}
async function measure(label){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const d=doc(),width=d.documentElement.clientWidth;
  check(d.documentElement.scrollWidth<=width,`${label}: overflow`);check(d.querySelectorAll('h1').length===1,`${label}: primary heading`);
  for(const b of d.querySelectorAll('button,summary'))if(b.getClientRects().length){const r=b.getBoundingClientRect();check(r.height>=44&&r.left>=-1&&r.right<=width+1,`${label}: clipped/small control`);}
  reports.push(`${label}: PASS (${width}px document, no overflow/clipped controls)`);
}
function reloadCheck(label){click('save');const save=localStorage.getItem(manual),text=doc().querySelector('main').textContent;click('load');check(doc().querySelector('main').textContent===text,`${label}: changed screen`);click('save');check(localStorage.getItem(manual)===save,`${label}: changed state`);reports.push(`${label}: PASS exact terminal Save/Load`);}
async function run(){const backup=[manual,auto].map(k=>localStorage.getItem(k));reports.length=0;errors.length=0;output.textContent='Running…';
  try{for(const width of [320,1100]){frame.style.width=`${width}px`;
    await page();click('new');await measure(`${width} opening`);for(let i=0;i<5;i++)click('opening-next');await measure(`${width} candidates`);click('choose');click('arrive');click('answer');click('finish-mira');await measure(`${width} Inn`);click('move','loc_surface');await measure(`${width} Surface`);
    click('character');await measure(`${width} Character`);click('close');check(doc().activeElement.dataset.command==='character','Character Close focus');click('inventory');click('inventory-tab','holdings');check(doc().querySelector('[data-command="inventory-tab"][aria-pressed="true"]').dataset.value==='holdings','Inventory selected semantics');await measure(`${width} Inventory`);
    await page(surface.Combat);await measure(`${width} combat`);doc().documentElement.style.fontSize='36px';await measure(`${width} independent 200% combat`);check(doc().documentElement.classList.contains('large-text')===false,'200% must be independent');
    await page(surface['Rook resolved']);for(const d of doc().querySelectorAll('details'))d.open=true;check(doc().body.textContent.includes('Completed by Rook'),'Actual resolver');await measure(`${width} records`);
    await page(terminal['Ordinary death']);check(!doc().querySelector('.hud,.utilities'),'Death gameplay leakage');await measure(`${width} death/Life Record`);reloadCheck(`${width} death`);click('begin-succession');doc().documentElement.classList.add('large-text');check(doc().querySelectorAll('[data-command="choose-successor"]').length===3,'Three successors');await measure(`${width} enlarged succession`);click('choose-successor');check(doc().querySelector('h1').textContent==='Inn','Successor resume');await measure(`${width} resumed successor`);
    await page(terminal['Brute ending']);check(doc().body.textContent.includes('Thank you for completing the demo.')&&!doc().querySelector('.hud,.utilities'),'Ending takeover');await measure(`${width} ending`);reloadCheck(`${width} ending`);
  }check(errors.length===0,errors.join('; '));reports.push('PASS: semantic selection, focus restoration, terminal gates and zero captured warnings/errors.');output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(e){output.textContent=`FAIL: ${e.message}\n${reports.join('\n')}`;}finally{[manual,auto].forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
}
document.querySelector('#run').onclick=run;
