import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceGame,createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { world,player,use } from './m2-fixture.js';
import { configure,service } from './m3-fixture.js';
import { apply,sleep } from './m4-fixture.js';
import { richLifeFixture,finalHeartFixture } from './m5-fixture.js';
import { makeMaterialRequest } from '../../HearthVale_Shell/src/living-situations.js';
import { livingSituationDefinitions } from '../../HearthVale_Content/living-situations.js';
import { resolveAutonomousPit } from '../../HearthVale_Shell/src/autonomous-pit.js';
export {world,player,use,configure,service,apply,sleep};
export const person=(w,template)=>Object.values(w.entities).find(a=>a.data?.templateId===template);
export const r=a=>a.data.attributes.resources;

export function applyAs(game,actor,fn){
  const base=createSurfaceShell(),runtime=createRuntime({saved:game.save(),shell:{...base,actions:{...base.actions,
    'fixture.m5d':{resolve:({world},{rng})=>({effects:fn(world,rng)})}}}});
  runtime.startScene();runtime.submit({actor,type:'fixture.m5d'});runtime.resolveScene({offscreenBudget:0});
  return createSurfaceGame({saved:runtime.save()});
}
export function succeed(g,index=0){g.beginSuccession();const c=world(g).globals.hearthvaleDeathTransition.candidates[index];g.chooseSuccessor(c.id);return c;}
export function sanityDeath(g){return configure(g,w=>{r(w.entities[w.globals.hearthvaleSurface.playerId]).sanity=0;});}

let richSave;
// Controlled prerequisites are explicit; discoveries, first clear, turn-ins,
// Town resolution, rescues, weekly processing, filing and succession use production.
export function persistenceFixture(){
  if(richSave)return createSurfaceGame({saved:richSave});
  let g=richLifeFixture();
  for(let i=0;i<2;i++){
    if(i)g=finalHeartFixture(g);
    g=configure(g,w=>{person(w,'actor_auron').data.protectionUnavailable=false;});
    use(g,'pit.resolve-room');
  }
  g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId];r(a).gold=300;
    a.data.holdings.materials.item_moonleaf=4;});
  g.perform('Move',{location:'loc_shop'});service(g,'turn-in',p=>p.item==='item_moonleaf');
  service(g,'order',p=>p.recipe==='recipe_hp_potion_greater');
  service(g,'sell',p=>p.container==='equipped'&&p.slot===1);
  // An existing provenance-bearing report of the real formal turn-in, filed
  // through ordinary Talk. This fixture does not add a production report producer.
  g=apply(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId],m=w.globals.hearthvaleServices.materialRecords.at(-1);
    return [{type:'learn',actor:a.id,claim:{subject:'loc_shop',key:'formal-moonleaf',value:{...m,topic:'formal-moonleaf',domain:'materials',observedDay:m.day,text:m.event}}}];});
  service(g,'talk',p=>world(g).entities[p.actor].data.templateId==='actor_tavi');
  g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>world(g).entities[p.actor].data.templateId==='actor_lina');
  g.perform('Move',{location:'loc_inn'});
  g=configure(g,w=>{w.globals.hearthvaleSurface.calendar={year:2,day:5,week:1};});sleep(g);
  g=apply(g,initial=>{const w=structuredClone(initial),a=person(w,'actor_rook');a.primaryLocation='loc_guild';
    const effects=resolveAutonomousPit(w,a,{op:'guardian-repeat',params:{week:2}},new Set());
    return [...effects,{type:'move',entity:a.id,location:'loc_guild'},...Object.entries(a.data).map(([key,value])=>({type:'data',entity:a.id,key,value}))];});
  g=configure(g,w=>{const a=w.entities[w.globals.hearthvaleSurface.playerId],s=w.globals.hearthvaleServices;
    s.stock.item_hp_potion_basic=2;s.stock.item_arrows=10;
    // Existing actors remember the predecessor independently of the successor.
    for(const template of ['actor_mira','actor_rook']){const other=person(w,template);
      other.data.relationships={...other.data.relationships,[a.id]:7};
      (other.data.memories??=[]).push({id:`fixture-history:${other.id}`,actor:a.id,day:4,year:2,event:`Prior shared history with ${a.data.identity.name}.`});}
    const ch=w.entities[w.globals.hearthvaleSurface.couldHaveId];r(ch).gold=81;r(ch).xp=9;
    ch.data.scars=[{id:'fixture-could-have-scar',label:'Old injury',day:3,year:2}];
    ch.data.memories=[{id:'fixture-could-have-memory',actor:ch.id,day:3,year:2,event:'Earlier independent history.'}];
    a.data.relationships={[person(w,'actor_mira').id]:12};a.data.reputation=17;
    a.data.observations=[{text:'Predecessor-only observation',day:3}];a.data.rumors=[{text:'Private unshared rumor',day:3}];
    a.data.trackedOpportunities=['m5_town_supply','m5d_active'];a.data.training={progress:{STR:4}};
    a.data.dialogueUsed=['private-conversation'];a.data.talkCount=2;a.data.storyTags=['private-tag'];
    r(a).xp=90;r(a).arrows=31;
  });
  const definition=livingSituationDefinitions.find(d=>d.id==='situation_moonleaf_shortage');
  g=apply(g,w=>{
    const a=w.entities[w.globals.hearthvaleSurface.playerId],active=makeMaterialRequest(definition,'m5d_active',6),expired=makeMaterialRequest(definition,'m5d_expired',1);
    const escalated=makeMaterialRequest({...definition,id:'fixture_escalation',label:'Fixture escalated request'},'m5d_escalated',6);
    escalated.lifecycle='escalated';escalated.data.escalated=true;
    return [active,expired,escalated].map(entity=>({type:'create',entity})).concat([
      {type:'learn',actor:a.id,claim:{subject:'hv_pit_1',key:'private-m5d',value:{topic:'private-m5d',private:true,domain:'pit',text:'Private unshared evidence',observedDay:6}}},
      {type:'learn',actor:a.id,claim:{subject:'hv_pit_1',key:'dated-m5d',certainty:'uncertain',value:{topic:'dated-m5d',domain:'pit',text:'Old uncertain evidence',observedDay:4}}},
    ]);
  });
  g=apply(g,w=>[{type:'learn',actor:w.globals.hearthvaleSurface.playerId,claim:{subject:'hv_pit_1',key:'dated-m5d',certainty:'certain',value:{topic:'dated-m5d',domain:'pit',text:'Later confirmed evidence',observedDay:6}}}]);
  g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter');
  richSave=g.save();return createSurfaceGame({saved:richSave});
}
