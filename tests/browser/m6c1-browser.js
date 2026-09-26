import {fixtures} from './m6c1-fixtures.js';
const frame=document.querySelector('#game'),select=document.querySelector('#checkpoint'),output=document.querySelector('#results');
const manual='hearthvale.surface.save.v1',auto='hearthvale.surface.autosave.v1';
const reports=[],errors=[];
for(const name of Object.keys(fixtures)){const o=document.createElement('option');o.textContent=name;select.append(o);}
const doc=()=>frame.contentDocument;
const check=(truth,label)=>{if(!truth)throw new Error(label);};
function click(command,value){const b=[...doc().querySelectorAll('button[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command} ${value??''}`);b.click();}
function intent(type){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>JSON.parse(b.dataset.value).type===type);check(b,`Missing ${type}`);b.click();}
async function load(name){
  localStorage.setItem(manual,fixtures[name]);
  await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});
  // Observe game warnings/errors during every subsequent interaction.
  const w=frame.contentWindow;
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  for(const level of ['warn','error']){const original=w.console[level].bind(w.console);w.console[level]=(...args)=>{errors.push(`${level}: ${args.join(' ')}`);original(...args);};}
  click('load');check(doc().querySelector('main h1'),'Production module did not load');
}
function measure(label){
  const d=doc(),w=frame.contentWindow;
  const width=d.documentElement.clientWidth;
  check(d.documentElement.scrollWidth<=width,`${label}: document overflow ${d.documentElement.scrollWidth}/${width}`);
  const visible=[...d.querySelectorAll('button,summary')].filter(b=>b.getClientRects().length);
  for(const b of visible){const r=b.getBoundingClientRect();check(r.width<=width&&r.left>=-1&&r.right<=width+1,`${label}: clipped ${b.textContent}`);check(r.height>=44,`${label}: small target ${b.textContent}`);}
  reports.push(`${label}: PASS width ${width}, scroll ${d.documentElement.scrollWidth}, ${visible.length} targets ≥44px`);
  check(w.getComputedStyle(d.querySelector('main')).overflowWrap==='anywhere',`${label}: text wrapping`);
}
function disclosures(){doc().querySelectorAll('details').forEach(d=>d.open=true);}
function saveRoundTrip(label){
  click('menu');click('save');const before=localStorage.getItem(manual);click('load');click('menu');click('save');
  check(localStorage.getItem(manual)===before,`${label}: save/load changed snapshot`);click('close');
}
function navigation(){
  const before=localStorage.getItem(auto);
  click('character');click('character-tab','history');click('close');
  check(doc().activeElement.dataset.command==='character','Close must restore utility focus');
  check(localStorage.getItem(auto)===before,'Inspection mutated autosave');
}
async function run(){
  reports.length=0;errors.length=0;output.textContent='Running…';
  const backup=[manual,auto].map(k=>localStorage.getItem(k));
  try{
    for(const width of [320,1100]){
      frame.style.width=`${width}px`;
      await load('Surface');measure(`${width} hub`);navigation();
      for(const location of ['loc_inn','loc_shop','loc_guild','loc_town_hall','loc_pit_entrance']){
        click('move',location);disclosures();measure(`${width} ${location}`);
        if(location==='loc_inn'){const before=localStorage.getItem(auto);click('sleep-prompt');measure(`${width} sleep confirmation`);click('close');check(localStorage.getItem(auto)===before,'Cancel sleep mutated world');}
        click('move','loc_surface');
      }
      click('character');for(const t of ['stats','traits','history']){click('character-tab',t);measure(`${width} Character ${t}`);}click('close');
      click('inventory');for(const t of ['equipment','bag','holdings','spells']){click('inventory-tab',t);disclosures();measure(`${width} Inventory ${t}`);}click('close');
      for(const p of ['menu','journal','settings','help']){click(p);measure(`${width} ${p}`);if(p!=='menu')click('menu');}click('close');
      saveRoundTrip('Surface');
      for(const name of Object.keys(fixtures).filter(n=>n!=='Surface')){
        await load(name);disclosures();measure(`${width} ${name}`);
        if(name==='Rook resolved')check(doc().body.textContent.includes('Completed by Rook'),'Actual Rook resolver missing');
        if(name==='Combat'){
          saveRoundTrip('Combat');click('pit-tab','spells');measure(`${width} combat spells`);click('pit-tab','bag');disclosures();measure(`${width} combat Bag`);click('pit-tab','weapons');
          const before=localStorage.getItem(auto);intent('pit.retreat');measure(`${width} Retreat confirmation`);click('cancel-action');check(localStorage.getItem(auto)===before,'Cancel Retreat mutated world');
          intent('pit.attack');measure(`${width} attack result`);
          const defensive=[...doc().querySelectorAll('[data-command="expedition"]')].some(b=>JSON.parse(b.dataset.value).type==='pit.defend');
          intent(defensive?'pit.defend':'pit.combat-next');measure(`${width} combat result`);
        }
        if(['resource','hazard','treasure','event','empty','discovery','Sunken Square'].includes(name)){
          intent('pit.resolve-room');measure(`${width} ${name} result`);saveRoundTrip(name);
        }
        if(name==='Known shortcut'){check(doc().body.textContent.includes('Enter via Sunken Square'),'Known shortcut missing');intent('pit.enter');measure(`${width} shortcut expedition`);intent('pit.return');measure(`${width} Return outcome`);}
        // Larger text is a production setting; also test 200% root text scaling.
        doc().documentElement.classList.add('large-text');measure(`${width} ${name} large text`);
        doc().documentElement.style.fontSize='36px';measure(`${width} ${name} 200% text`);
      }
    }
    check(!errors.length,`Game warnings/errors: ${errors.join('; ')}`);
    reports.push('PASS: exact Surface/combat/room Save→Load→Save; navigation/cancel state preservation; no captured interaction warnings/errors.');
    output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
  }catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}
  finally{[manual,auto].forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
}
document.querySelector('#load').onclick=()=>load(select.value).then(()=>{reports.length=0;measure(select.value);output.textContent=reports.join('\n');}).catch(e=>output.textContent=e.message);
document.querySelector('#phone').onclick=()=>frame.style.width='320px';
document.querySelector('#desktop').onclick=()=>frame.style.width='1100px';
document.querySelector('#measure').onclick=()=>{try{reports.length=0;measure('Current screen');output.textContent=reports.join('\n');}catch(e){output.textContent=e.message;}};
document.querySelector('#run').onclick=run;
