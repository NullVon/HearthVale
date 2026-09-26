import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceGame,createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { entered,player } from './m2-fixture.js';
export function configure(game,mutate){
  const shell=createSurfaceShell();
  const runtime=createRuntime({saved:game.save(),shell:{...shell,actions:{...shell.actions,'fixture.m3':{resolve:({world},{rng})=>{
    const next=structuredClone(world);mutate(next,rng);
    return {effects:[...Object.values(next.entities).flatMap(entity=>[...Object.entries(entity.data).map(([key,value])=>({type:'data',entity:entity.id,key,value})),...(entity.primaryLocation?[{type:'move',entity:entity.id,location:entity.primaryLocation}]:[])]),...Object.entries(next.globals).map(([key,value])=>({type:'global',key,value}))]};
  }}}}});
  runtime.startScene();runtime.submit({actor:player(game).id,type:'fixture.m3'});runtime.resolveScene({offscreenBudget:0});return createSurfaceGame({saved:runtime.save()});
}
export function surfaceFixture(mutate=()=>{}){return configure(entered(),world=>{
  const actor=world.entities[world.globals.hearthvaleSurface.playerId];actor.primaryLocation='loc_shop';
  world.entities.hv_pit_1.data.expedition=null;actor.data.attributes.resources.gold=500;actor.data.attributes.resources.xp=50;
  mutate(world,actor);
});}
export function service(game,op,predicate=()=>true){const choice=game.serviceChoices().find(c=>c.params.op===op&&predicate(c.params));if(!choice)throw new Error(`No ${op} choice`);game.perform(choice.type,choice.params);}
