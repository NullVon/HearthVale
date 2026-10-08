import { writeFile } from 'node:fs/promises';
import { combatFixture,item } from './helpers/m2-fixture.js';
const magic=combatFixture(undefined,ctx=>{
  ctx.actor.data.inventory.bag.fill(null);
  for(const [slot,id] of ['fireball','force','heal','barrier'].entries())ctx.actor.data.inventory.bag[slot]=item(ctx.actor,`item_scroll_${id}`,3);
  ctx.actor.data.inventory.bag[4]=item(ctx.actor,'item_antidote',2);
  ctx.actor.data.inventory.bag[5]=item(ctx.actor,'item_scroll_teleport',2);
  ctx.actor.data.inventory.bag[6]=item(ctx.actor,'item_tome_fireball');
  ctx.actor.data.attributes.baseStats.DEX=30;
  ctx.actor.data.attributes.resources.hp=4;
  ctx.actor.data.statuses={poison:true};
  ctx.expedition.combat.enemy.hp=50;
});
const heartLoss=combatFixture(undefined,ctx=>{
  ctx.actor.data.attributes.resources.hp=1;
  ctx.actor.data.attributes.baseStats.DEX=0;
  ctx.actor.data.statuses={poison:true};
  ctx.expedition.combat.phase='incoming';
});
heartLoss.perform('pit.defend',{mode:'dodge'});
await writeFile(new URL('./browser/phase9-fixtures.js',import.meta.url),`// Generated via existing Core fixture effects; never loaded by production.\nexport const fixtures=${JSON.stringify({Magic:magic.save(),'Heart-loss return':heartLoss.save()})};\n`);
