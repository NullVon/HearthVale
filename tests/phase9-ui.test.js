import test from 'node:test';
import assert from 'node:assert/strict';
import { combatFixture,world,player,item } from './helpers/m2-fixture.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
import { button,candidateCards,inventory } from '../HearthVale_UI/surface-views.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';

const decode = value => value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const actions = html => [...html.matchAll(/data-command="expedition" data-value="([^"]+)"/g)].map(m=>JSON.parse(decode(m[1])));
const key = action => JSON.stringify([action.type,action.params]);

test('Phase 9 every legal combat choice retains its exact payload, with no duplicates in each active panel',()=>{
  for(const phase of ['attack','incoming','advantage','counterattack']){
    const g=combatFixture(undefined,ctx=>{
      ctx.expedition.combat.phase=phase;ctx.expedition.combat.enemy.hp=40;
      ctx.actor.data.inventory.bag[0]=item(ctx.actor,'item_scroll_fireball',2);
      ctx.actor.data.inventory.bag[1]=item(ctx.actor,'item_scroll_heal',2);
      ctx.actor.data.inventory.bag[2]=item(ctx.actor,'item_hp_potion_basic',2);
      ctx.actor.data.attributes.resources.hp=6;
    });
    const before=g.save(),legal=g.expeditionChoices(),seen=new Set();
    for(const tab of ['weapons','spells','bag'])for(const selectedSlot of [0,1,2,3]){
      const html=expeditionView(world(g),player(g),legal,tab,selectedSlot),projected=actions(html);
      assert.equal(new Set(projected.map(key)).size,projected.length,`${phase}/${tab}: duplicated action`);
      for(const action of projected){assert.ok(legal.some(c=>key(c)===key(action)),`${phase}/${tab}: changed action payload`);seen.add(key(action));}
    }
    for(const choice of legal)assert.ok(seen.has(key(choice)),`${phase}: lost ${key(choice)}`);
    assert.equal(g.save(),before,'rendering cannot alter save or RNG');
  }
});

test('Phase 9 next combat actions precede feedback without deleting result, durability or diagnostic information',()=>{
  const g=combatFixture(undefined,ctx=>{ctx.expedition.lastResult={text:'Critical hit. Sword destroyed.',wear:{item:'item_sword',loss:2,destroyed:true}};});
  const html=expeditionView(world(g),player(g),g.expeditionChoices());
  assert.ok(html.indexOf('data-command="expedition"')<html.indexOf('Critical hit. Sword destroyed.'));
  assert.match(html,/destroyed after the action/);assert.match(html,/DUR 12\/12/);
  assert.doesNotMatch(html,/class="check-math"|Next round|Resolve cancelled round/);
});

test('Phase 9 character comparisons retain choices and starting stats while excluding empty lifetime sections',()=>{
  const g=createSurfaceGame({seed:17});for(let n=0;n<5;n++)g.openingNext();
  const before=g.save(),candidates=world(g).globals.hearthvaleSurface.candidates;
  for(const succession of [false,true]){
    const html=candidateCards(candidates,succession,succession?2:null);
    for(const candidate of candidates){assert.ok(html.includes(candidate.id));assert.ok(html.includes(candidate.label));}
    assert.equal((html.match(/<article /g)??[]).length,3);
    assert.doesNotMatch(html,/Training progress|Personal history|Relationships|<h2>Scars/);
    assert.match(html,/Starting stats|Starting loadout/);assert.match(html,/Traits and spell guidance/);
  }
  assert.equal(g.save(),before);
});

test('Phase 9 control styling and compatibility guidance do not alter commands or legal spell access',()=>{
  const payload={type:'pit.retreat',params:{}};
  assert.ok(button('Retreat','expedition',JSON.stringify(payload)).includes('class="control caution"'));
  const g=combatFixture(),before=g.save();
  assert.match(inventory(player(g),'spells'),/Learned spells are reusable/);
  assert.match(inventory(player(g),'spells'),/Scrolls are consumed Items: no Essence cost or Overcast/);
  assert.equal(g.save(),before);
});
