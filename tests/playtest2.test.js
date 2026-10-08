import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCandidates,generateNewGameCandidates,instantiateSurfaceActor } from '../HearthVale_Shell/src/surface-candidates.js';
import { validateCandidate } from '../HearthVale_Content/validation.js';
import { surfaceCatalog } from '../HearthVale_Content/surface.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { candidateCards } from '../HearthVale_UI/surface-views.js';
import { hasLearnedMagic,magicIntroduction } from '../HearthVale_UI/magic-onboarding.js';
import { combatFixture,item,player,world } from './helpers/m2-fixture.js';

const rng=seed=>({next(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}});

test('Playtest 2 varies the selected magic person without altering random identities/stats/traits or resources',()=>{
  const positions=new Set(),names=new Set(),stats=new Set(),traits=new Set();
  for(let seed=0;seed<30;seed++){
    const originalRng=rng(seed),cohortRng=rng(seed);
    const original=generateCandidates(originalRng),cohort=generateNewGameCandidates(cohortRng);
    assert.equal(originalRng.next(),cohortRng.next(),'Starter package must not shift later world RNG');
    assert.equal(cohort.length,3);
    const magic=cohort.filter(c=>c.loadout.spells.length);
    assert.equal(magic.length,1);positions.add(cohort.indexOf(magic[0]));
    for(const [index,c] of cohort.entries()){
      const {loadout,...person}=c,{loadout:originalLoadout,...originalPerson}=original[index];
      assert.deepEqual(person,originalPerson);
      names.add(c.label);stats.add(JSON.stringify(c.stats));traits.add(c.traits.join(','));
      validateCandidate(c,surfaceCatalog);
      assert.deepEqual(loadout.armor,['item_chest_armor']);
      assert.deepEqual(loadout.items,[{item:'item_hp_potion_basic',quantity:1}]);
      assert.equal(loadout.gold,45);assert.equal(loadout.spellSlots,4);
      if(c===magic[0]){assert.deepEqual(loadout.weapons,['item_bow']);assert.equal(loadout.arrows,10);assert.deepEqual(loadout.spells,['spell_fireball']);}
      else {assert.deepEqual(loadout.weapons,originalLoadout.weapons);assert.equal(new Set(loadout.weapons).size,2);assert.deepEqual(loadout.spells,[]);assert.equal(loadout.arrows,originalLoadout.arrows);}
      const actor=instantiateSurfaceActor(c),r=actor.data.attributes.resources;
      assert.equal(r.hearts,3);assert.equal(r.ap,4);assert.equal(r.sanity,5);assert.equal(r.xp,0);assert.equal(r.essence,0);
      assert.deepEqual(actor.data.inventory.spells.filter(Boolean),loadout.spells);
      assert.equal(actor.data.inventory.bag.filter(Boolean).length,1);
    }
    assert.equal((candidateCards(cohort).match(/Learned Fireball \+ Bow starter/g)??[]).length,1);
  }
  assert.equal(positions.size,3);assert.ok(names.size>15);assert.ok(stats.size>30);assert.ok(traits.size>30);
});

test('Playtest 2 New Game cohort survives exact save/load, without changing the shared ordinary generator',()=>{
  const g=createSurfaceGame({seed:37}),saved=g.save(),loaded=createSurfaceGame({saved});
  assert.equal(loaded.save(),saved);
  const cohort=world(loaded).globals.hearthvaleSurface.candidates;
  assert.equal(cohort.length,3);assert.equal(cohort.filter(c=>c.loadout.spells.length).length,1);
  assert.ok(generateCandidates(rng(37)).every(c=>c.loadout.weapons.length===2));
});

test('Playtest 2 validation accepts the explicit magic package but still rejects malformed starters',()=>{
  const magic=generateNewGameCandidates(rng(4)).find(c=>c.loadout.spells.length);
  for(const change of [c=>c.loadout.weapons=['item_sword'],c=>c.loadout.weapons=[],
    c=>c.loadout.spells=[],c=>c.loadout.spells=['spell_force'],c=>c.loadout.arrows=0,
    c=>c.loadout.gold=46,c=>c.loadout.items[0].quantity=2,c=>c.loadout.armor=[]]){
    const c=structuredClone(magic);change(c);assert.throws(()=>validateCandidate(c,surfaceCatalog));
  }
  const normal=generateCandidates(rng(4))[0];normal.loadout.weapons=['item_bow','item_bow'];
  assert.throws(()=>validateCandidate(normal,surfaceCatalog));
});

test('Magic introduction requires learned combat magic; Scrolls, Tomes and exploration spells alone do not trigger it',()=>{
  const g=combatFixture(undefined,ctx=>{ctx.actor.data.inventory.bag.fill(null);ctx.actor.data.inventory.spells.fill(null);});
  const actor=structuredClone(player(g));
  assert.equal(hasLearnedMagic(actor),false);assert.equal(magicIntroduction(actor,false),'');
  for(const id of ['item_tome_fireball','item_scroll_fireball','item_scroll_teleport','item_scroll_unlock']){
    actor.data.inventory.bag[0]=item(actor,id);assert.equal(magicIntroduction(actor,false),'');
  }
  actor.data.inventory.spells[0]='spell_unlock';assert.equal(magicIntroduction(actor,false),'');
  actor.data.inventory.spells[0]='spell_teleport';assert.match(magicIntroduction(actor,false),/Essence &amp; Overcast/);
  actor.data.inventory.spells[0]='spell_fireball';
  const html=magicIntroduction(actor,false);
  assert.match(html,/Essence &amp; Overcast/);assert.match(html,/costs 1 Sanity/);assert.match(html,/spell still takes effect/);
  assert.match(html,/return from the expedition/);assert.doesNotMatch(html,/DC|d20|8 → 11/);
  assert.equal(magicIntroduction(actor,true),'');
  actor.data.inventory.spells.fill(null);assert.equal(magicIntroduction(actor,false),'');
});

test('Magic acknowledgement persists in the existing save and consumes no resources, RNG, turn or time',()=>{
  const g=combatFixture(),before=g.snapshot();
  g.acknowledgeMagicIntroduction();const after=g.snapshot();
  assert.equal(after.random,before.random);
  const s=world(g).globals.hearthvaleSurface;
  assert.equal(s.magicIntroductionSeen,true);assert.deepEqual(s.calendar,before.world.globals.hearthvaleSurface.calendar);
  assert.deepEqual(player(g),before.world.entities[s.playerId]);
  assert.deepEqual(world(g).entities.hv_pit_1,before.world.entities.hv_pit_1);
  const saved=g.save(),loaded=createSurfaceGame({saved});assert.equal(loaded.save(),saved);
  assert.equal(world(loaded).globals.hearthvaleSurface.magicIntroductionSeen,true);
  assert.equal(loaded.acknowledgeMagicIntroduction(),null);assert.equal(loaded.save(),saved);
});
