import {fixtures as surface} from './m6c1-fixtures.js';
import {fixtures as endings} from './m6c2-fixtures.js';
const fixtures={...surface,...endings},frame=document.querySelector('#game'),output=document.querySelector('#results'),select=document.querySelector('#checkpoint');
const manual='hearthvale.surface.save.v1',auto='hearthvale.surface.autosave.v1',reports=[],errors=[];
for(const name of Object.keys(fixtures)){const option=document.createElement('option');option.textContent=name;select.append(option);}
const doc=()=>frame.contentDocument;
function check(ok,label){if(!ok)throw Error(label);}
function click(command,value){const b=[...doc().querySelectorAll('button[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}`);b.click();}
async function page(){await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});const w=frame.contentWindow;
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  for(const level of ['warn','error']){const original=w.console[level].bind(w.console);w.console[level]=(...args)=>{errors.push(`${level}: ${args.join(' ')}`);original(...args);};}
}
async function load(name){localStorage.setItem(manual,fixtures[name]);await page();click('load');}
function measure(label){const d=doc(),w=frame.contentWindow,width=d.documentElement.clientWidth;
  check(d.documentElement.scrollWidth<=width,`${label}: horizontal overflow`);
  check(d.querySelectorAll('h1').length===1,`${label}: main heading`);
  for(const b of d.querySelectorAll('button,summary'))if(b.getClientRects().length){const r=b.getBoundingClientRect();check(r.height>=44&&r.left>=-1&&r.right<=width+1,`${label}: clipped/small control ${b.textContent}`);check(b.textContent.trim(),`${label}: unnamed control`);}
  const sticky=[...d.querySelectorAll('.hud,.utilities')].filter(x=>w.getComputedStyle(x).position==='sticky');
  check(sticky.reduce((n,x)=>n+x.getBoundingClientRect().height,0)<frame.clientHeight/2,`${label}: sticky frame crowds content`);
  check(!/effect_|expedition_hp|cure 1|unlock 1|return 1|Autonomous.*70%/.test(d.querySelector('main').textContent),`${label}: internal effect/behavior text`);
  reports.push(`${label}: PASS (${width}px, targets >=44px, no overflow/clipping)`);
}
async function scales(label){for(const mode of ['normal','enlarged','200%']){doc().documentElement.classList.toggle('large-text',mode==='enlarged');doc().documentElement.style.fontSize=mode==='200%'?'36px':'';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));measure(`${label} ${mode}`);}doc().documentElement.style.fontSize='';doc().documentElement.classList.remove('large-text');}
function disclose(){doc().querySelectorAll('details').forEach(d=>d.open=true);}
function roundTrip(label){const terminal=!doc().querySelector('.hud');if(!terminal)click('menu');click('save');const saved=localStorage.getItem(manual);click('load');if(!terminal)click('menu');click('save');check(saved===localStorage.getItem(manual),`${label}: changed save`);if(!terminal)click('close');reports.push(`${label}: PASS exact save/load`);}
async function run(){const backup=[manual,auto].map(k=>localStorage.getItem(k));reports.length=0;errors.length=0;output.textContent='Running…';
try{for(const width of [320,1100]){frame.style.width=`${width}px`;
  await page();click('new');await scales(`${width} historical opening`);for(let i=0;i<5;i++)click('opening-next');await scales(`${width} initial candidates`);click('choose');click('arrive');await scales(`${width} Mira opening`);click('answer');click('finish-mira');await scales(`${width} Inn`);
  await load('Surface');await scales(`${width} Surface`);
  for(const location of ['loc_shop','loc_guild','loc_town_hall','loc_pit_entrance']){click('move',location);disclose();await scales(`${width} ${location}`);click('move','loc_surface');}
  click('character');for(const t of ['stats','traits','history']){click('character-tab',t);await scales(`${width} Character ${t}`);}click('close');
  click('inventory');for(const t of ['equipment','bag','holdings','spells']){click('inventory-tab',t);disclose();await scales(`${width} Inventory ${t}`);}click('close');
  click('menu');click('settings');check(doc().querySelector('[data-command="text-size"]').getAttribute('aria-pressed')==='false','Settings initial state');click('text-size');check(doc().querySelector('[data-command="text-size"]').getAttribute('aria-pressed')==='true','Settings selected state');check(doc().activeElement.dataset.command==='text-size','Settings focus retained');click('text-size');click('menu');click('help');await scales(`${width} Help`);click('menu');click('close');roundTrip(`${width} Surface`);
  for(const name of ['hazard','Combat spells','Return encounter','Known shortcut','Rook resolved','Rich Life Record','Successor candidates','Successor resumed','Brute ending','Day 40 ending','Day 40 death ending']){
    await load(name);disclose();
    if(name==='Combat spells'){click('pit-tab','spells');check(doc().body.textContent.includes('Barrier 3 for this round'),'Spell text');}
    if(name==='Rook resolved')check(doc().body.textContent.includes('Completed by Rook'),'Actual resolver');
    await scales(`${width} ${name}`);
    if(['Combat spells','Successor candidates','Day 40 death ending'].includes(name))roundTrip(`${width} ${name}`);
    if(name==='Successor resumed'){click('menu');click('journal');disclose();await scales(`${width} successor Journal/archives`);}
  }
  await load('Combat');click('pit-tab','bag');disclose();const slots=[...doc().querySelectorAll('[data-command="swap-slot"]')];check(slots.length===4,'Swap controls');click('swap-slot','2');check(doc().activeElement.dataset.command==='swap-slot'&&doc().activeElement.dataset.value==='2','Swap keyboard focus retained');check(doc().activeElement.closest('details').open,'Selected slot remains visible');check(doc().querySelector('[data-command="swap-slot"][data-value="2"]').getAttribute('aria-pressed')==='true','Swap selected state');await scales(`${width} selected swap slot`);
}
check(!errors.length,errors.join('; '));reports.push('PASS: settings/swap semantics, exact reload, no captured warnings/errors.');output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
}catch(e){output.textContent=`FAIL: ${e.message}\n${reports.join('\n')}`;}finally{[manual,auto].forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}}
document.querySelector('#run').onclick=run;document.querySelector('#load').onclick=()=>load(select.value).then(()=>output.textContent=`Loaded ${select.value}.`);document.querySelector('#phone').onclick=()=>frame.style.width='320px';document.querySelector('#desktop').onclick=()=>frame.style.width='1100px';
