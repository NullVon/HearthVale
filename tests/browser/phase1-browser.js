import { fixtures } from './phase1-fixtures.js';
import { fixtures as existing } from './m6c1-fixtures.js';
const frame=document.querySelector('#game'),output=document.querySelector('#results');
const keys=['hearthvale.surface.save.v1','hearthvale.surface.autosave.v1'];
const doc=()=>frame.contentDocument;
function check(ok,text){if(!ok)throw Error(text);}
function click(command,value){
 const b=[...doc().querySelectorAll('button[data-command]')].find(b=>b.dataset.command===command&&(value===undefined||b.dataset.value===value));
 check(b,`Missing ${command}`);b.click();check(!doc().querySelector('#status').textContent || command==='load',doc().querySelector('#status').textContent);
}
function intent(type){const b=[...doc().querySelectorAll('[data-command="expedition"]')].find(b=>JSON.parse(b.dataset.value).type===type);check(b,`Missing ${type}`);b.click();}
function noPause(){check(!/Next round|Resolve cancelled round|Resolve committed enemy move|Round outcome/.test(doc().querySelector('main').textContent),'No-choice combat screen');}
async function page(saved){
 if(saved)localStorage.setItem(keys[0],saved);
 await new Promise(resolve=>{frame.onload=resolve;frame.src='../../HearthVale_UI/index.html';});
 if(saved)click('load');
}
document.querySelector('#run').onclick=async()=>{
 const backup=keys.map(k=>localStorage.getItem(k)),reports=[];
 output.textContent='Running…';
 try{
  const candidates=[];
  for(let i=0;i<3;i++){
   await page();click('new');for(let j=0;j<5;j++)click('opening-next');
   candidates.push(doc().querySelector('main').textContent);
  }
  check(new Set(candidates).size===3,'Repeated New Games repeated candidates');reports.push('New Game produces distinct candidates through production clicks');
  await page(existing.Combat);
  check(!doc().querySelector('.check-math')&&!doc().body.textContent.includes('Dodge DEX vs DC'),'Normal mode leaked math');
  const tile=doc().querySelector('.weapon-tile[data-command="expedition"]');check(tile,'Missing weapon attack tile');
  check(!doc().body.textContent.includes('Attack: Sword'),'Duplicate attack button');
  tile.click();noPause();check(/Sword/.test(doc().querySelector('.outcome').textContent),'Tile did not attack');
  check(!doc().querySelector('.check-math'),'Normal result leaked math');
  click('menu');click('settings');check(doc().querySelector('[data-command="dev-mode"]').getAttribute('aria-pressed')==='false','Dev Mode default');
  click('dev-mode');click('menu');click('close');
  check(doc().querySelector('.check-math')&&doc().body.textContent.includes('Defender DEX'),'Dev Mode missing math');
  reports.push('Weapon tile attacks once; Settings toggles Dev Mode from OFF to full math');
  await page(fixtures.attack);
  for(let n=0;doc().querySelector('.telegraph')&&n<30;n++){
   noPause();
   const choices=[...doc().querySelectorAll('[data-command="expedition"]')].map(b=>({b,action:JSON.parse(b.dataset.value)}));
   const c=choices.find(c=>c.action.type==='pit.unarmed')??choices.find(c=>c.action.type==='pit.move')??choices.find(c=>c.action.type==='pit.defend');
   check(c,'No-equipment deadlock');c.b.click();
  }
  check(doc().querySelector('h1').textContent==='Pit Entrance','No-equipment Return did not end');
  reports.push('No-equipment Return Encounter reaches Pit Entrance without round clicks');
  check(doc().querySelector('.outcome'),'Immediate return result missing');
  click('move','loc_surface');click('move','loc_inn');click('sleep-prompt');click('sleep','1');
  click('move','loc_surface');click('move','loc_pit_entrance');
  check(!doc().querySelector('.outcome'),'Previous-Day Pit result still shown');
  reports.push('Immediate return result is visible; sleeping hides it on the next Day');
  for(const phase of ['cancelled','round-result']){
   await page(fixtures[phase]);noPause();check(doc().body.textContent.includes('What do you do?'),'Legacy round was not resumed');
  }
  reports.push('Legacy cancelled and round-result saves normalize before rendering');
  await page(fixtures.pending);
  check(doc().querySelector('h1').textContent==='Pit Entrance','Legacy survival did not resume');
  check(doc().body.textContent.includes('Auron rescued')&&doc().body.textContent.includes('POISONED'),'Legacy rescue result or Poison missing');
  check(!doc().querySelector('[data-command="adjudicate-death"]'),'Normal UI exposed manual survival adjudication');
  reports.push('Legacy final-Heart save automatically resumes Auron rescue without curing Poison');
  output.textContent=`PASS — ${reports.length} checks\n${reports.join('\n')}`;
 }catch(e){output.textContent=`FAIL: ${e.message}\n${reports.join('\n')}`;}
 finally{keys.forEach((k,i)=>backup[i]===null?localStorage.removeItem(k):localStorage.setItem(k,backup[i]));}
};
