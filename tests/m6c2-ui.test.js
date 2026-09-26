import test from 'node:test';
import assert from 'node:assert/strict';
import { finalHeartFixture,richLifeFixture } from './helpers/m5-fixture.js';
import { bruteFixture,chapterFixture,death40Fixture,world,player,use } from './helpers/m6-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { deathView,lifeRecordView,archivedLives } from '../HearthVale_UI/death-views.js';
import { completionView } from '../HearthVale_UI/completion-views.js';
import { candidateCards } from '../HearthVale_UI/surface-views.js';
import { continuityFacts } from '../HearthVale_Story/death.js';

test('M6C2 death record keeps actual history separate from public knowledge and hides gameplay',()=>{
  const g=richLifeFixture();use(g,'pit.resolve-room');const w=world(g),a=player(g),before=g.save();
  const html=deathView(a,w.globals.hearthvaleDeathTransition,w);
  assert.match(html,/not a public report/);assert.match(html,/may not yet know/);assert.match(html,/Discovered Sunken Square/);
  assert.match(html,/Life ended:.*Final Heart lost after Poison/);assert.doesNotMatch(html,/class="hud"|class="utilities"|data-command="move"/);
  assert.ok(html.indexOf('Life Record')<html.indexOf('Life ended:'));
  assert.equal(g.save(),before);assert.equal(createSurfaceGame({saved:before}).save(),before);
});
test('M6C2 continuity omits unknown discoveries and does not mutate holder knowledge',()=>{
  const g=finalHeartFixture(),w=structuredClone(world(g)),a=player(g);
  w.entities.hv_pit_1.data.discoveries={private:{title:'Hidden chamber',actor:'someone-else'},owned:{title:'Known well',actor:a.id}};
  const before=JSON.stringify(w),facts=continuityFacts(w).join(' ');
  assert.doesNotMatch(facts,/Hidden chamber/);assert.match(facts,/Known well/);assert.equal(JSON.stringify(w),before);
});
test('M6C2 successor cards expose only starting decision data and correct generation',()=>{
  const g=finalHeartFixture();use(g,'pit.resolve-room');g.beginSuccession();
  const w=world(g),cards=candidateCards(w.globals.hearthvaleDeathTransition.candidates,true,2),before=g.save();
  assert.equal((cards.match(/<article /g)??[]).length,3);assert.equal((cards.match(/data-command="choose-successor"/g)??[]).length,3);
  assert.match(cards,/Generation 2/);assert.doesNotMatch(cards,/Generation 1|Personal history|Training progress|Relationships|<h2>Scars/);
  assert.match(cards,/Starting stats/);assert.match(cards,/Traits/);assert.match(cards,/Starting loadout/);assert.match(cards,/Spell Slots/);
  assert.equal(g.save(),before);assert.equal(createSurfaceGame({saved:before}).save(),before);
});
test('M6C2 Day-40 death presents expanded Life Record before completion exactly once without successor',()=>{
  const g=death40Fixture();use(g,'pit.resolve-room');const w=world(g),html=completionView(w);
  assert.ok(html.indexOf('Life Record</h2>')<html.indexOf('<h2>Demo complete'));
  assert.equal((html.match(/<h2>Life Record<\/h2>/g)??[]).length,1);
  assert.match(html,/No successor begins/);assert.doesNotMatch(html,/begin-succession|choose-successor|Choose Who|class="hud"/);
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});
test('M6C2 endings retain truthful credit and bound initial history; sparse records omit empty lists',()=>{
  const brute=bruteFixture();use(brute,'pit.attack',c=>c.params.slot===0);
  const html=completionView(world(brute));assert.match(html,/Waystone/);assert.match(html,/Stratum 2 is not playable/);
  const day=chapterFixture();day.perform('surface.sleep',{day:40,confirmed:true});
  const w=structuredClone(world(day));w.entities.hv_pit_1.data.discoveries=Object.fromEntries(Array.from({length:12},(_,i)=>[`test_${i}`,{title:`Known place ${i}`,actor:player(day).id,day:1}]));
  const long=completionView(w);assert.match(long,/More recorded history/);assert.match(long,/Ruin Brute remains undefeated/);
  assert.match(long,/Thank you for completing the demo/);assert.doesNotMatch(long,/score|rank|grade|ending tier/i);
  const record={name:'<long-name>',generation:1,death:{cause:'sanity',year:1,day:1},facts:[]};
  assert.doesNotMatch(lifeRecordView(record),/<ul>|<long-name>/);assert.match(lifeRecordView(record),/&lt;long-name&gt;/);
  assert.equal(archivedLives(world(day)),'');
});
