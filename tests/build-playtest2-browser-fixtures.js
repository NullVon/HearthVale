import { writeFile } from 'node:fs/promises';
import { combatFixture,item } from './helpers/m2-fixture.js';
const learned=combatFixture(undefined,c=>{
  c.actor.data.inventory.spells=['spell_fireball','spell_force','spell_heal','spell_barrier'];
  c.actor.data.attributes.resources.essence=100;c.actor.data.attributes.baseStats.INT=30;
  c.actor.data.attributes.baseStats.WIS=1;c.actor.data.attributes.traits=[];
  c.expedition.combat.enemy.hp=50;c.expedition.strain=1;
});
const scrolls=combatFixture(undefined,c=>{
  c.actor.data.inventory.spells.fill(null);c.actor.data.inventory.bag.fill(null);
  c.actor.data.inventory.bag[0]=item(c.actor,'item_scroll_fireball',3);
  c.actor.data.attributes.resources.essence=100;c.actor.data.attributes.baseStats.WIS=0;
  c.actor.data.attributes.traits=[];c.expedition.combat.enemy.hp=50;c.expedition.strain=9;
});
await writeFile(new URL('./browser/playtest2-fixtures.js',import.meta.url),`// Test-only Core-effect prerequisites, never loaded by production.\nexport const fixtures=${JSON.stringify({'Learned magic':learned.save(),'Scroll Items':scrolls.save()})};\n`);
