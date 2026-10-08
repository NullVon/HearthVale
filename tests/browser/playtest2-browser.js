import {fixtures as surface} from './m6c1-fixtures.js';
import {fixtures as endings} from './m6c2-fixtures.js';
import {fixtures as magic} from './playtest2-fixtures.js';
const fixtures={...surface,...endings,...magic},frame=document.querySelector('#game'),output=document.querySelector('#results'),select=document.querySelector('#checkpoint');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'],reports=[];
for(const name of Object.keys(fixtures)){const option=document.createElement('option');option.textContent=name;select.append(option);}
const doc=()=>frame.contentDocument;
const check=(ok,label)=>{if(!ok)throw Error(label);};
function click(command,value){const b=[...doc().querySelectorAll('[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));check(b,`Missing ${command}/${value}`);b.click();}
function intent(type){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>JSON.parse(b.dataset.value).type===type);check(b,`Missing ${type}`);b.click();}
async function page(name){if(name)localStorage.setItem(keys[0],fixtures[name]);await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});if(name)click('load');}
const savedWorld=key=>JSON.parse(localStorage.getItem(key??keys[1])).state.world;
const actor=w=>w.entities[w.globals.hearthvaleSurface.playerId];
const combat=w=>w.entities.hv_pit_1.data.expedition?.combat;
const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
function setInsets(active){for(const [side,value] of Object.entries({top:32,bottom:24,left:8,right:8}))doc().documentElement.style.setProperty(`--safe-area-inset-${side}`,`${active?value:0}px`);}
async function measure(label,insets){await tick();const d=doc(),width=d.documentElement.clientWidth;check(d.documentElement.scrollWidth<=width,`${label}: horizontal overflow`);
  const heading=d.querySelector('h1').getBoundingClientRect();check(heading.top>=(insets?32:0)-1,`${label}: heading under status bar`);
  for(const b of d.querySelectorAll('button,summary'))if(b.getClientRects().length){const r=b.getBoundingClientRect();check(r.height>=44&&r.left>=-1&&r.right<=width+1,`${label}: clipped/small ${b.textContent}`);}
  frame.contentWindow.scrollTo(0,d.documentElement.scrollHeight);await tick();
  const hud=d.querySelector('.hud'),nav=d.querySelector('.utilities');
  if(hud&&getComputedStyle(hud).position==='sticky')check(hud.getBoundingClientRect().top>=(insets?32:0)-1,`${label}: sticky HUD under status bar`);
  if(nav)check(nav.getBoundingClientRect().bottom<=frame.clientHeight-(insets?24:0)+1,`${label}: utilities under navigation bar`);
  frame.contentWindow.scrollTo(0,0);await tick();reports.push(`${label}: PASS`);
}
function roundTrip(){click('menu');click('save');const saved=localStorage.getItem(keys[0]);click('load');click('menu');click('save');check(localStorage.getItem(keys[0])===saved,'Save/load changed state');click('close');}
async function screen(name){await page(name==='Character'||name==='Inventory'?'Surface':name);
  if(name==='Character')click('character');if(name==='Inventory')click('inventory');
  if(name==='Scroll Items')click('pit-tab','bag');if(name==='Learned magic')click('pit-tab','spells');
}
async function run(){const backup=keys.map(k=>localStorage.getItem(k));reports.length=0;output.textContent='Running…';try{
  frame.style.width='390px';await page();click('new');for(let i=0;i<5;i++)click('opening-next');
  const candidates=savedWorld().globals.hearthvaleSurface.candidates,magicCandidate=candidates.filter(c=>c.loadout.spells.length);
  check(candidates.length===3&&magicCandidate.length===1,'New Game cohort');const starter=magicCandidate[0];
  check(starter.loadout.spells[0]==='spell_fireball'&&starter.loadout.weapons.join(',')==='item_bow'&&starter.loadout.arrows===10,'Magic starter package');
  check(doc().body.textContent.includes('Learned Fireball + Bow starter'),'Obvious magic choice');click('choose',starter.id);click('answer');click('finish-mira');
  click('inventory');click('inventory-tab','spells');check(doc().querySelector('[data-command="magic-introduction-seen"]'),'Starter learned interface did not introduce magic');
  check(!/vs DC|d20|DC 8/.test(doc().querySelector('[aria-label="Essence and Overcast introduction"]').textContent),'Tutorial leaked formula');
  click('magic-introduction-seen');check(savedWorld().globals.hearthvaleSurface.magicIntroductionSeen===true,'Missing seen flag');
  click('close');roundTrip();click('inventory');click('inventory-tab','spells');check(!doc().querySelector('[data-command="magic-introduction-seen"]'),'Tutorial repeated after save/load');
  reports.push('New Game, Bow/Fireball starter, learned-only tutorial and exact seen-state save/load: PASS');
  await page('Scroll Items');click('pit-tab','bag');check(!doc().querySelector('[data-command="magic-introduction-seen"]'),'Scroll triggered learned tutorial');
  intent('pit.scroll');let w=savedWorld();check(w.entities.hv_pit_1.data.expedition.strain===9&&combat(w).phase==='incoming','Scroll changed pressure/turn');
  check(actor(w).data.attributes.resources.sanity===5&&actor(w).data.attributes.resources.essence===100,'Scroll spent Sanity/Essence');
  check(actor(w).data.inventory.bag[0].quantity===2&&combat(w).enemy.hp===43,'Scroll consumption/effect');
  check(w.entities.hv_pit_1.data.expedition.lastResult.check===null,'Scroll made a check');roundTrip();reports.push('Scroll bypasses Overcast at WIS zero/high learned Strain; effect/action/consumption and exact reload: PASS');
  await page('Learned magic');click('pit-tab','spells');check(doc().querySelector('[data-command="magic-introduction-seen"]'),'Learned access missing tutorial');click('magic-introduction-seen');
  intent('pit.cast');w=savedWorld();const result=w.entities.hv_pit_1.data.expedition.lastResult;
  check(w.entities.hv_pit_1.data.expedition.strain===2&&combat(w).phase==='incoming'&&combat(w).enemy.hp===45,'Learned pressure/effect/turn');
  check(result.overcast.dc===8&&actor(w).data.attributes.resources.sanity===(result.overcast.success?5:4),'Learned Overcast');
  check(result.check===null&&!result.dodge&&!result.quality&&/automatic hit/.test(result.text)&&!/Miss/.test(result.text),'Learned offense entered obsolete hit resolution');
  check(!/Strain/.test(doc().querySelector('main').textContent),'Normal Mode exposed obsolete Strain wording');
  check(actor(w).data.attributes.resources.essence===99,'Learned Essence cost');roundTrip();click('pit-tab','spells');check(!doc().querySelector('[data-command="magic-introduction-seen"]'),'Tutorial repeated');
  reports.push('Learned Fireball spends shared Essence, increments expedition count, checks DC8 and retains effect/action/reload: PASS');
  for(const width of [320,390,430,1100]){frame.style.width=`${width}px`;
    for(const name of ['Surface','Character','Inventory','Training','resource','Combat','Scroll Items','Learned magic','Brute ending']){
      for(const insets of [false,true])for(const large of [false,true]){
        await screen(name);setInsets(insets);if(large)doc().documentElement.style.fontSize='36px';
        await measure(`${width} ${name} ${insets?'system insets':'browser'} ${large?'200%':'ordinary'}`,insets);
      }
    }
  }
  output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
}catch(error){output.textContent=`FAIL: ${error.message}\n${reports.join('\n')}`;}finally{keys.forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}}
document.querySelector('#run').onclick=run;document.querySelector('#load').onclick=()=>page(select.value).then(()=>output.textContent=`Loaded ${select.value}.`);
let insetMode=false;document.querySelector('#insets').onclick=()=>{insetMode=!insetMode;setInsets(insetMode);};
const preview=new URLSearchParams(location.search).get('preview');
if(preview&&fixtures[preview]){document.body.classList.add('preview');screen(preview).then(()=>setInsets(true));}
