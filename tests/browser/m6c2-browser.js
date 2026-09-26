import {fixtures} from './m6c2-fixtures.js';
const frame=document.querySelector('#game'),select=document.querySelector('#checkpoint'),output=document.querySelector('#results');
const manual='hearthvale.surface.save.v1',auto='hearthvale.surface.autosave.v1',reports=[],errors=[];
for(const name of Object.keys(fixtures)){const o=document.createElement('option');o.textContent=name;select.append(o);}
const doc=()=>frame.contentDocument;
const check=(truth,label)=>{if(!truth)throw new Error(label);};
function click(command,value){const b=[...doc().querySelectorAll('button[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}`);b.click();}
function intent(type){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>JSON.parse(b.dataset.value).type===type);check(b,`Missing ${type}`);b.click();}
async function page(){await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});const w=frame.contentWindow;
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  for(const level of ['warn','error']){const original=w.console[level].bind(w.console);w.console[level]=(...args)=>{errors.push(`${level}: ${args.join(' ')}`);original(...args);};}
  click('load');check(doc().activeElement===doc().querySelector('h1'),'Load did not focus screen heading');
}
async function load(name){localStorage.setItem(manual,fixtures[name]);await page();}
const terminal=()=>!doc().querySelector('.hud');
function measure(label){
  const d=doc(),width=d.documentElement.clientWidth;
  check(d.documentElement.scrollWidth<=width,`${label}: horizontal overflow`);
  for(const b of d.querySelectorAll('button,summary'))if(b.getClientRects().length){const r=b.getBoundingClientRect();check(r.height>=44&&r.left>=-1&&r.right<=width+1,`${label}: clipped/small control ${b.textContent}`);}
  if(terminal()){
    check(!d.querySelector('.utilities,.expedition-hud,[data-command="move"],[data-command="service"],[data-command="expedition"]'),'Gameplay controls survived takeover');
    check(d.querySelectorAll('[data-command="save"]').length===1&&d.querySelectorAll('[data-command="load"]').length===1,'Duplicate terminal save controls');
  }
  reports.push(`${label}: PASS (${width}px document, no overflow, controls ≥44px)`);
}
function scaled(label){measure(label);doc().documentElement.classList.add('large-text');measure(`${label} enlarged`);doc().documentElement.style.fontSize='36px';measure(`${label} 200%`);doc().documentElement.style.fontSize='';doc().documentElement.classList.remove('large-text');}
async function roundTrip(label){
  const isTerminal=terminal();if(!isTerminal)click('menu');click('save');const saved=localStorage.getItem(manual);click('load');
  if(!isTerminal)click('menu');click('save');check(localStorage.getItem(manual)===saved,`${label}: Load changed world`);
  if(!isTerminal)click('close');
  const text=doc().querySelector('main').textContent;await page();check(doc().querySelector('main').textContent===text,`${label}: reload changed presentation`);
  if(!isTerminal)click('menu');click('save');check(localStorage.getItem(manual)===saved,`${label}: reload changed state`);if(!isTerminal)click('close');
  reports.push(`${label}: PASS exact Save/Load/page reload`);
}
async function run(){const backup=[manual,auto].map(k=>localStorage.getItem(k));reports.length=0;errors.length=0;output.textContent='Running…';
  try{
    for(const width of [320,1100]){
      frame.style.width=`${width}px`;
      for(const name of Object.keys(fixtures).filter(n=>!n.startsWith('Before'))){await load(name);scaled(`${width} ${name}`);await roundTrip(`${width} ${name}`);
        if(name==='Successor candidates'){check(doc().querySelectorAll('[data-command="choose-successor"]').length===3,'Not three candidates');check(!doc().body.textContent.includes('Generation 1'),'Wrong successor generation');}
        if(name==='Day 40 death ending'){const html=doc().querySelector('main').innerHTML;check(html.indexOf('Life Record</h2>')<html.indexOf('<h2>Demo complete'),'Life Record not before ending');check(!doc().querySelector('[data-command="begin-succession"]'),'Final death offered succession');}
      }
      await load('Before ordinary death');intent('pit.resolve-room');check(doc().querySelector('.death-takeover'),'No death takeover');check(doc().activeElement.tagName==='H1','Death focus');scaled(`${width} real death transition`);
      click('begin-succession');check(doc().querySelectorAll('[data-command="choose-successor"]').length===3,'Succession transition');scaled(`${width} selection transition`);
      const chosen=doc().querySelector('[data-command="choose-successor"]');const chosenName=chosen.textContent.replace('Choose ','');chosen.click();
      check(doc().querySelector('.hud')&&doc().querySelector('h1').textContent==='Inn','No normal successor resume');
      check(doc().querySelector('main').textContent.includes(chosenName),'Missing successor identity');check(!doc().querySelector('[data-command="answer"],[data-command="opening-next"]'),'New Game intro replay');scaled(`${width} real successor resume`);await roundTrip(`${width} selected successor`);
      await load('Before Brute ending');intent('pit.attack');check(doc().body.textContent.includes('Stratum 2 is not playable'),'Playable deeper route implied');scaled(`${width} real Brute ending`);await roundTrip(`${width} Brute transition`);
      await load('Before Day 40 sleep');click('sleep-prompt');click('sleep','40');check(doc().body.textContent.includes('Forty Days have passed'),'Missing Day-40 ending');scaled(`${width} real Day-40 ending`);
      await load('Before Day 40 death');intent('pit.resolve-room');check(doc().body.textContent.includes('No successor begins'),'Missing final death boundary');scaled(`${width} real Day-40 death`);await roundTrip(`${width} final death transition`);
    }
    check(!errors.length,errors.join('; '));reports.push('PASS: no captured game interaction warnings/errors; exact save/reload; terminal focus and action exclusion.');output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(e){output.textContent=`FAIL: ${e.message}\n${reports.join('\n')}`;}
  finally{[manual,auto].forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
}
document.querySelector('#run').onclick=run;
document.querySelector('#load').onclick=()=>load(select.value).then(()=>output.textContent=`Loaded ${select.value}.`);
document.querySelector('#phone').onclick=()=>frame.style.width='320px';document.querySelector('#desktop').onclick=()=>frame.style.width='1100px';
document.querySelector('#large').onclick=()=>doc().documentElement.classList.toggle('large-text');
