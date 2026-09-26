import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedFixture,worldOf,player,sleep } from './helpers/m4-fixture.js';
import { service } from './helpers/m3-fixture.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { heldInformation,knowledgeState } from '../HearthVale_Shell/src/information.js';
import { livingSituations,requestChoices } from '../HearthVale_Shell/src/living-situations.js';
import { activeSituation } from '../HearthVale_Shell/src/situations.js';
const guild='integration_situation_verify_hound_report',town='integration_situation_town_supply';
const notice=(w,holder,id)=>heldInformation(w,holder).find(c=>c.claim.subject===id&&c.claim.value?.topic==='public-request')?.claim.value;

test('M4F A19/A20 ten-Day integrated replay preserves daily caps, knowledge, credit and two weekly boundaries',()=>{
  const a=integratedFixture(),b=createSurfaceGame({saved:a.save()});let replay=b;
  for(const g of [a,replay]){
    service(g,'talk',p=>p.actor==='hv_actor_5');
    assert.equal(knowledgeState(worldOf(g),player(worldOf(g)).id,'hv_pit_1','pit-hound-report'),'Rumor');
    service(g,'track-opportunity',p=>p.situation===guild);g.perform('Move',{location:'loc_inn'});
  }
  let resolved=false;
  for(let day=1;day<=10;day++){
    const before=worldOf(a),count=livingSituations(before).length;
    sleep(a);sleep(replay);assert.equal(a.save(),replay.save());
    const w=worldOf(a);
    if(day===1)assert.equal(notice(w,player(w).id,guild).status,'active','remote tracking must not auto-refresh');
    assert.ok(Object.values(w.entities).filter(activeSituation).length<=8);
    assert.ok(livingSituations(w).length-count<=2);
    for(const actor of Object.values(w.entities).filter(e=>e.actor)){
      assert.ok((actor.data.memories?.length??0)-(before.entities[actor.id].data.memories?.length??0)<=1);
    }
    if(w.entities[guild].lifecycle==='resolved'){
      resolved=true;assert.equal(w.entities[guild].data.resolver,'hv_actor_2');
      assert.equal(notice(w,'loc_guild',guild).resolver,'hv_actor_2');
      assert.equal(notice(w,'loc_town_hall',guild),undefined);
      assert.ok(!requestChoices(w,w.entities.hv_actor_2).some(c=>c.params.situation===guild));
    }
    if(day===1)for(const g of [a,replay]){
      g.perform('Move',{location:'loc_town_hall'});service(g,'fulfill-request',p=>p.situation===town);
      g.perform('Move',{location:'loc_guild'});service(g,'talk',p=>p.actor==='hv_actor_5');
      g.perform('Move',{location:'loc_inn'});
    }
    if(day===3)for(const g of [a,replay]){g.perform('Move',{location:'loc_guild'});g.perform('Move',{location:'loc_inn'});}
    replay=createSurfaceGame({saved:replay.save()});assert.equal(a.save(),replay.save());
  }
  assert.ok(resolved,'deterministic real daily gate must allow Rook to complete within the deadline');
  const w=worldOf(a),id=player(w).id;
  assert.equal(w.entities[town].data.resolver,id);
  assert.equal(notice(w,id,guild).resolver,'hv_actor_2');
  assert.deepEqual(player(w).data.trackedOpportunities,[guild]);
  assert.deepEqual(w.globals.hearthvaleWeekly.snapshots.map(s=>s.completedDay),[5,10]);
  assert.ok(w.globals.hearthvaleWeekly.snapshots[0].facts.some(f=>f.actor==='hv_actor_2'));
  assert.ok(w.globals.hearthvaleWeekly.records.guild.some(r=>r.id===`situation:${guild}`));
  assert.ok(!w.globals.hearthvaleWeekly.records.town.some(r=>r.id===`situation:${guild}`));
  assert.equal(w.entities.hv_actor_2.data.memories.filter(m=>m.situation===guild).length,1);
  assert.ok(livingSituations(w).some(s=>s.data.sourceDefinitionId==='situation_moonleaf_shortage'&&s.lifecycle==='expired'));
  const other=w.entities[w.globals.hearthvaleSurface.couldHaveId];
  assert.equal(other.data.holdings.materials.item_iron_ore,0);
  assert.equal(other.data.memories.filter(m=>m.kind==='turn-in'&&m.item==='item_iron_ore').length,1);
  assert.equal(w.globals.hearthvaleServices.materialRecords.find(m=>m.item==='item_iron_ore').actor,other.id);
  assert.equal(w.globals.hearthvaleServices.stock.item_hp_potion_basic,8);
  assert.equal(w.globals.hearthvaleWeekly.snapshots[0].facts.some(f=>f.actor===other.id),false,'unreported discovery is not global knowledge');
});
