import test from 'node:test';
import assert from 'node:assert/strict';
import { byId,expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { equipmentEffectText } from '../HearthVale_Story/expedition.js';
import { traitDescriptions } from '../HearthVale_Story/surface.js';
import { comparison } from '../HearthVale_UI/service-views.js';
import { equipmentPanels,resultView } from '../HearthVale_UI/expedition-views.js';
import { combatFixture,player,world } from './helpers/m2-fixture.js';

test('M6C3 item and spell descriptions convey actual effects without raw schema values',()=>{
  assert.match(comparison(byId('items','item_antidote')),/Cure Poison/);
  assert.match(comparison(byId('items','item_bigshroom_tonic')),/\+8 Max HP for this expedition/);
  assert.match(equipmentEffectText(byId('spells','spell_heal').effects),/Restore up to 8 HP/);
  assert.match(equipmentEffectText(byId('spells','spell_barrier').effects),/Barrier 3 for this round/);
  assert.match(equipmentEffectText(byId('spells','spell_teleport').effects),/without a Return encounter/);
  for(const d of [...expeditionCatalog.spells,...expeditionCatalog.items.filter(i=>i.effects.length)]){
    const text=equipmentEffectText(d.effects);assert.ok(text,d.id);assert.doesNotMatch(text,/effect_|expedition_hp|cure 1|return 1|unlock 1/);
  }
});
test('M6C3 equipment slot choices identify exactly one selected slot without changing game state',()=>{
  const g=combatFixture(),a=player(g),before=g.save(),exp=world(g).entities.hv_pit_1.data.expedition;
  const choices=[...g.expeditionChoices(),{type:'pit.swap',group:'swap',params:{equipped:2,bag:0},label:'Swap test item'}];
  const html=equipmentPanels(a,choices,'bag',2,exp);
  const controls=html.match(/<button[^>]*data-command="swap-slot"[^>]*>[^<]*<\/button>/g);
  assert.equal(controls.length,4);assert.equal(controls.filter(x=>x.includes('aria-pressed="true"')).length,1);
  assert.match(controls[2],/Equipped 3: Hammer · Selected/);assert.match(controls[1],/aria-pressed="false"/);
  assert.equal(g.save(),before);
});
test('M6C3 public resource names and personality descriptions omit internal identifiers and weights',()=>{
  const html=resultView({text:'Found supplies.',rewards:[{resource:'xp',quantity:2},{resource:'essence',quantity:1},{resource:'arrows',quantity:3},{resource:'gold',quantity:4}]});
  for(const label of ['XP +2','Essence +1','Arrows +3','Gold +4'])assert.ok(html.includes(label));
  for(const id of ['careful','reckless','greedy','curious','fearless','cowardly'])assert.doesNotMatch(traitDescriptions[`trait_${id}`],/70%|autonomous|goals allow/i);
  assert.match(traitDescriptions.trait_fearless,/\+2 WIS/);
  assert.match(traitDescriptions.trait_cowardly,/−2 WIS/);
});
