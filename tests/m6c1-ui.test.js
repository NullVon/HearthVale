import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceFixture } from './helpers/m3-fixture.js';
import { combatFixture,player,world,setup,entered,roomFixture } from './helpers/m2-fixture.js';
import { character,inventory,surfaceLocation } from '../HearthVale_UI/surface-views.js';
import { serviceView } from '../HearthVale_UI/service-views.js';
import { expeditionView } from '../HearthVale_UI/expedition-views.js';
import { economyState,shopOffers } from '../HearthVale_Shell/src/economy.js';
import { hazardCheckSpecification } from '../HearthVale_Shell/src/expedition-rooms.js';
import { byId } from '../HearthVale_Content/expedition.js';
import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';

test('M6C1 Character and inventory project authoritative state without internal identities or mutation',()=>{
  const g=surfaceFixture((w,a)=>{a.data.relationships={hv_actor_1:2};a.data.scars=[{label:'Old cut'}];});
  const before=g.save(),a=player(g),w=world(g);
  assert.match(character(a,'history',w),/Auron/);assert.doesNotMatch(character(a,'history',w),/hv_actor_1/);
  assert.match(character(a,'traits',w),/Old cut/);assert.doesNotMatch(character(a,'traits',w),/object Object/);
  assert.match(character(a,'stats',w),/Generation 1/);assert.match(character(a,'stats',w),/\d\/\d sessions/);
  const html=inventory(a,'holdings');assert.match(html,/COLLECTABLES · Selected/);assert.match(html,/aria-pressed="true"/);
  assert.doesNotMatch(html,/>holdings</);assert.equal(g.save(),before);
});
test('M6C1 visible shop offers share legal eligibility, including protected and unaffordable stock',()=>{
  const g=surfaceFixture((w,a)=>{a.data.attributes.resources.gold=0;w.globals.hearthvaleServices=economyState(w);w.globals.hearthvaleServices.stock.item_hp_potion_basic=2;});
  const a=player(g),w=world(g),before=g.save(),offers=shopOffers(a,economyState(w));
  assert.ok(offers.some(o=>o.reason==='Protected stock reserve'));
  assert.ok(offers.some(o=>o.reason?.startsWith('Need ')));
  const choices=g.serviceChoices(),html=serviceView(w,a,choices);
  assert.match(html,/disabled/);assert.match(html,/Stock 2/);assert.match(html,/not a sale/);
  assert.equal(offers.filter(o=>!o.reason).length,choices.filter(c=>['buy','buy-used'].includes(c.params.op)).length);
  const location=surfaceLocation(w,a,html);assert.ok(location.indexOf('Formal Turn-In')<location.indexOf('>Leave<'));
  assert.equal(g.save(),before);
});
test('M6C1 combat exposes phase/range/cost/restrictions without hidden Stability or navigation',()=>{
  const g=combatFixture(),html=expeditionView(world(g),player(g),g.expeditionChoices());
  assert.match(html,/Cannot Block/);assert.match(html,/Requires FAR/);assert.match(html,/Dodge DEX vs DC/);
  assert.match(html,/regenerates its start/);assert.doesNotMatch(html,/Stability|data-command="move"/);
  const returned=setup(g,ctx=>{ctx.expedition.combat.kind='return';});
  assert.match(expeditionView(world(returned),player(returned),returned.expeditionChoices()),/Retreat is unavailable/);
});
test('M6C1 hazard preview and resolution use one specification and preserve exact reload',()=>{
  const g=setup(entered(),ctx=>roomFixture(ctx,'hazard','hazard_blocked_passage'));
  const spec=hazardCheckSpecification(player(g),byId('hazards','hazard_blocked_passage'),'primary');
  const html=expeditionView(world(g),player(g),g.expeditionChoices());
  assert.match(html,new RegExp(`vs DC ${spec.dc}`));
  if(spec.advantage)assert.match(html,/Advantage/);
  g.perform('pit.resolve-room',{approach:'primary'});
  assert.equal(world(g).entities.hv_pit_1.data.expedition.lastResult.check.dc,spec.dc);
  assert.equal(createSurfaceGame({saved:g.save()}).save(),g.save());
});
