import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { entered,setup,item } from './helpers/m2-fixture.js';
import { worldOf,sleep } from './helpers/m4-fixture.js';
import { routeFloor } from '../HearthVale_Shell/src/expedition-discovery.js';
const pit=g=>worldOf(g).entities.hv_pit_1.data;
const use=(g,type,predicate=()=>true)=>{const c=g.expeditionChoices().find(c=>c.type===type&&predicate(c));assert.ok(c,type);g.perform(c.type,c.params);};
const fixtures={};
let square=setup(entered(),(ctx,rng)=>{
  ctx.pit.sunkenSquare={floor:5,pending:true,remaining:2};ctx.expedition.floor=routeFloor(ctx,5,1,[],rng);
  ctx.expedition.deepestFloor=5;ctx.expedition.roomIndex=-1;
  ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;
});
use(square,'pit.cast');square.perform('Move',{location:'loc_inn'});
for(let i=0;i<10&&!pit(square).sunkenSquare.known;i++){
  const before=square.save();sleep(square);
  if(pit(square).sunkenSquare.known)fixtures['Before autonomous Square discovery']=before;
}
assert.ok(fixtures['Before autonomous Square discovery']);
console.log('Square finder:',pit(square).sunkenSquare.known);

let guardian=setup(entered(),(ctx,rng)=>{
  ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;
  ctx.actor.data.attributes.baseStats.STR=30;ctx.actor.data.inventory.equipped[0]=item(ctx.actor,'item_fang_hammer');
  ctx.actor.data.inventory.spells[0]='spell_teleport';ctx.actor.data.attributes.resources.essence=100;
});
use(guardian,'pit.guardian');guardian=setup(guardian,ctx=>{ctx.expedition.combat.enemy.hp=1;});
fixtures['Player first-clear combat']=guardian.save();
use(guardian,'pit.attack',c=>c.params.slot===0);use(guardian,'pit.cast');guardian.perform('Move',{location:'loc_inn'});
assert.equal(pit(guardian).strata[0].guardian.alive,false);
for(let i=0;i<15&&!pit(guardian).guardianVictories?.length;i++){
  const before=guardian.save();sleep(guardian);
  if(pit(guardian).guardianVictories?.length)fixtures['Before autonomous Guardian report']=before;
}
assert.ok(fixtures['Before autonomous Guardian report']);
console.log('Guardian report:',pit(guardian).guardianVictories[0]);
guardian.perform('Move',{location:'loc_pit_entrance'});use(guardian,'pit.enter');
guardian=setup(guardian,(ctx,rng)=>{
  ctx.expedition.floor=routeFloor(ctx,10,1,[],rng);ctx.expedition.deepestFloor=10;ctx.expedition.roomIndex=0;
});
assert.ok(guardian.expeditionChoices().some(c=>c.type==='pit.guardian'));
fixtures['Player threshold after autonomous report']=guardian.save();
await writeFile(new URL('./browser/m4-closeout-fixtures.js',import.meta.url),`// Core-effect fixtures; outcomes produced by ordinary game actions and RNG.\nexport const fixtures=${JSON.stringify(fixtures)};\n`);
console.log(`Wrote ${Object.keys(fixtures).length} targeted browser fixtures.`);
