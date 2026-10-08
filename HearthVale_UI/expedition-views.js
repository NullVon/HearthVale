import { escapeHtml as e, button, tabButton, unavailable } from './surface-views.js';
import { statusDetails } from '../HearthVale_Story/statuses.js';
import { byId } from '../HearthVale_Content/expedition.js';
import { spellCost } from '../HearthVale_Shell/src/expedition-equipment.js';
import { hazardCheckSpecification } from '../HearthVale_Shell/src/expedition-rooms.js';
import { traitBonus, dodgeChance } from '../HearthVale_Shell/src/expedition-checks.js';
import { combatMove, combatPhase, enemyKnockedDown, playerKnockedDown } from '../HearthVale_Shell/src/expedition-combat.js';
import { roomProse, resolvedRoomProse, equipmentEffectText } from '../HearthVale_Story/expedition.js';
import { scrollSpell } from '../HearthVale_Shell/src/scroll-magic.js';
import { spellPressure } from '../HearthVale_Shell/src/magic-pressure.js';

const buttons = choices => choices.map(choice => button(choice.label, 'expedition', JSON.stringify({ type: choice.type, params: choice.params }))).join('');
const itemName = item => item ? byId('items', item.templateId)?.label ?? item.templateId : 'Empty';
const signed = n => n > 0 ? `+${n}` : `${n}`;
const dodgeFormula = d => `Defender DEX ${d.defenderDEX} - (Attacker DEX ${d.attackerDEX} + Speed ${d.speed}) = ${d.difference} → ${d.chance}% Dodge`;
function combatRolls(result) {
  const q = result.quality, d = result.dodge;
  return `${d ? `<p class="check-math">${e(dodgeFormula(d))}. ${d.roll === null ? 'No Dodge draw at 0%.' : `Roll ${d.roll}: ${d.success ? 'Dodged' : 'Connected'}.`}</p>` : ''}
    ${q ? `<p class="check-math">d20 ${q.die} + ${e(q.stat)} ${q.value} = ${q.total}: ${q.quality} ×${q.multiplier} → raw Damage ${q.rawDamage} (rounded up).</p>` : ''}
    ${result.retaliation ? `<p>Retaliation:</p>${combatRolls(result.retaliation)}` : ''}`;
}

function rewardDetails(reward) {
  const item = byId('items', reward.item);
  const destination = ({pending: 'Bag full; decision required', bag: 'Bag', holdings: 'Collectables'})[reward.destination];
  return (destination ? ' — ' + destination : '') + (item?.sellValue ? '; sell for ' + item.sellValue * reward.quantity + 'G at the General Shop' : '') + (item?.category === 'weapon' ? '; replacement weapon' : '');
}

export function resultView(result, devMode = false) {
  if (!result) return '';
  const roll = result.check;
  return `<section class="outcome" aria-label="Resolved outcome">${result.trainingUnlocked ? '<h2>Training with Auron unlocked</h2>' : '<h2 class="outcome-heading">Recent outcome</h2>'}<p>${e(result.text)}</p>${devMode && roll ? `<p class="check-math">d20 ${e(roll.rolls.join(', '))} → ${roll.die} + ${e(roll.stat)} ${roll.value} ${roll.bonus >= 0 ? '+' : '−'} ${Math.abs(roll.bonus)} = ${roll.total} vs DC ${roll.dc}: <strong>${roll.success ? 'Success' : 'Failure'}</strong></p>` : ''}
    ${roll?.reroll ? '<p>Lucky Bastard used its expedition reroll; the better result was kept.</p>' : ''}
    ${result.rewards?.length ? `<ul>${result.rewards.map(reward => `<li>${e(({xp:'XP',gold:'Gold',arrows:'Arrows',essence:'Essence'})[reward.resource] ?? byId('items', reward.item)?.label ?? 'Reward')} +${reward.quantity}${e(rewardDetails(reward))}</li>`).join('')}</ul>` : ''}
    ${devMode && roll?.trigger?`<p>Initial trap check: ${e(roll.trigger.stat)} total ${roll.trigger.total} vs DC ${roll.trigger.dc}: ${roll.trigger.success?'Success':'Failure'}. The roll above is the triggered reaction.</p>`:''}
    ${devMode && result.defense!==undefined?`<p>Defense applied: ${result.defense}. Damage taken: ${result.damage}.</p>`:''}
    ${devMode ? combatRolls(result) : ''}${devMode&&result.overcast?`<p class="check-math">Overcast: d20 ${e(result.overcast.rolls.join(', '))} → ${result.overcast.total} vs DC ${result.overcast.dc}: ${result.overcast.success?'Success':'Failure'}</p>`:''}${devMode&&result.spell?`<p>Scroll effect: ${e(result.spell)} · INT ${result.int}. No Essence cost or Overcast.</p>`:''}
    ${[result.wear, result.retaliation?.wear].filter(Boolean).map(wear => `<p>${e(byId('items', wear.item)?.label)}: ${wear.loss} DUR lost${wear.prevented ? '; 1 wear prevented' : ''}${wear.destroyed ? '; destroyed after the action' : ''}.</p>`).join('')}</section>`;
}

export function expeditionHud(actor, expedition) {
  const r = actor.data.attributes.resources;
  return `<aside class="expedition-hud" aria-label="Expedition resources"><span>Floor ${expedition.floor.number} · ${expedition.roomIndex < 0 ? 'Start' : `Room ${expedition.roomIndex + 1}/${expedition.floor.rooms.length}`}</span>
    <span>Arrows ${r.arrows}</span><span>Essence ${r.essence}</span>${actor.data.inventory.spells.some(Boolean)?`<span>Next learned cast ${spellCost(actor,expedition)} Essence</span>`:''}
    ${expedition.combat?.barrier ? `<span class="status-badge">Barrier ${expedition.combat.barrier} (next enemy offensive action)</span>` : ''}${actor.data.expeditionHp?`<span>Bigshroom +${actor.data.expeditionHp} Max HP</span>`:''}</aside>`;
}

export function pitEntrance(world, actor, choices, devMode = false) {
  const pit = world.entities.hv_pit_1, r = actor.data.attributes.resources;
  return `<p class="eyebrow">Stratum 1</p><h1>Pit Entrance</h1><p>Swallowed HearthVale Ruins</p>
    <h2>Supplies and status</h2><p>Arrows ${r.arrows} · HP Potions ${actor.data.inventory.bag.filter(i => i?.templateId === 'item_hp_potion_basic').reduce((sum,i) => sum + i.quantity, 0)} · AP ${r.ap}/${r.maxAp}</p>
    <p>Bag ${actor.data.inventory.bag.filter(Boolean).length}/8. The entire expedition costs 1 AP; Rooms and Floors cost no further AP. Return costs 0 AP and may involve an encounter.</p><p>${actor.data.statuses?.poison ? statusDetails.poison.name : 'No Poison'}. Expeditions begin with 0 Essence and fresh casting pressure.</p>
      ${currentPitResult(world, actor) ? resultView(pit.data.lastResult, devMode) : ''}<div class="actions primary-actions">${buttons(choices)}</div>
    ${!choices.length ? '<p>You have no available entry action. Check your AP and condition.</p>' : ''}
    <div class="leave">${button('Leave', 'move', 'loc_surface')}</div>`;
}

export function currentPitResult(world, actor) {
  const pit = world.entities.hv_pit_1.data, result = pit.lastResult, calendar = world.globals.hearthvaleSurface.calendar;
  if (!result || (result.actor !== actor.id && !(result.actor === undefined && (actor.data.generation ?? 1) === 1))) return false;
  // Older return saves have the timestamp on lastExpedition instead.
  const day = result.day ?? pit.lastExpedition?.day;
  return day === calendar.day && (result.year ?? 1) === calendar.year;
}

export function equipmentPanels(actor, choices, tab, swapSlot, expedition, devMode = false) {
  const inventory = actor.data.inventory;
  const groups = tab === 'bag' ? ['bag'] : [tab];
  const content = buttons(choices.filter(c => groups.includes(c.group) && c.type !== 'pit.attack'));
  const inspection = tab === 'weapons' ? inventory.equipped.map((item,i) => {
      const d=item&&byId('items',item.templateId);
      const attack=choices.find(c=>c.type==='pit.attack'&&c.params.slot===i);
      const reactions=choices.filter(c=>c.type==='pit.defend'&&c.params.slot===i);
      const enemy=expedition.combat && byId('enemies',expedition.combat.enemy.templateId);
      const details=d?[d.damage!==undefined?`Damage ${d.damage}`:null,d.impact!==undefined?`Impact ${d.impact}`:null,d.defense!==undefined?`Block ${d.defense}`:null,d.speed!==undefined?`Speed ${signed(d.speed)}`:null,enemy&&d.category==='weapon'?`Enemy Dodge ${dodgeChance(enemy.combatStats.DEX,actor.data.attributes.baseStats.DEX,d.speed,enemyKnockedDown(expedition.combat)).chance}%`:null,d.maxDurability!==undefined&&item.durability!==undefined?`DUR ${item.durability}/${d.maxDurability}`:null,d.ammo?`Arrows ${actor.data.attributes.resources.arrows} · 1 Arrow per shot · No DUR · Cannot Block`:null].filter(Boolean).join(' · '):'';
      if(reactions.length) return `<li><div class="weapon-tile reaction-tile"><strong>${e(d.label)}</strong><span>${e(details)}</span><div class="actions">${buttons(reactions.map(c=>({...c,label:c.params.mode==='block'?'Block':'Counterattack'})))}</div></div></li>`;
      if(d?.category==='weapon') return `<li><button class="weapon-tile" ${attack?`data-command="expedition" data-value="${e(JSON.stringify({type:attack.type,params:attack.params}))}"`:'disabled'}><strong>${e(d.label)}</strong><span>${e(details)}</span>${attack||!expedition.combat?'':'<span>Unavailable: check ammunition and condition.</span>'}</button></li>`;
      return `<li>${e(itemName(item))}${d?`<p>${e(details)}</p>${d.category==='shield'?'<p>Block during the incoming attack.</p>':''}`:''}</li>`;
    }).join('')
    : tab === 'spells' ? inventory.spells.map((id,i) => {const d=id&&byId('spells',id),cast=choices.filter(c=>c.type==='pit.cast'&&c.params.slot===i);return `<li>${d?`${cast.length?buttons(cast):unavailable(d.label,'Unavailable: check Essence, phase and whether this spell has a valid target here.')}<p>${spellCost(actor,expedition,d)} Essence · ${e(equipmentEffectText(d.effects))}</p>`:'Empty'}</li>`;}).join('')
      : inventory.bag.map((item,i) => `<li>${i + 1}. ${e(itemName(item))}${item ? ` ×${item.quantity}` : ''}</li>`).join('');
  const tomeHint = !expedition.combat && tab === 'bag' && inventory.bag.some(item => item && byId('items', item.templateId)?.category === 'tome')
    ? '<p>Tomes are learned, not equipped. Choose Learn below when you are between combats.</p>' : '';
  const swapping = tab === 'bag' && choices.some(c => c.group === 'swap') ? `<details><summary>Swap one Equipped ↔ Bag slot</summary>
    <p>A combat swap spends the Attack phase. Outside combat it is free.</p><div class="actions">${inventory.equipped.map((item,i) => tabButton(`Equipped ${i + 1}: ${itemName(item)}`, 'swap-slot', i, i===swapSlot)).join('')}</div>
    <p>Selected Equipped slot: ${swapSlot + 1}</p><div class="actions">${buttons(choices.filter(c => c.group === 'swap' && c.params.equipped === swapSlot))}</div></details>` : '';
  const items=tab==='bag'&&expedition.combat;
  const itemList=items?inventory.bag.map((item,slot)=>{
    if(!item)return '';
    const actions=choices.filter(c=>c.group==='bag'&&(c.type==='pit.use'&&c.params.slot===slot||c.type==='pit.scroll'&&c.params.container==='bag'&&c.params.slot===slot));
    const spell=scrollSpell(item);
    return `<li>${actions.length?buttons(actions):unavailable(`${itemName(item)} ×${item.quantity}`,spell?.explorationOnly?'Use between combats when its exploration target is available.':'Unavailable during this combat action.')}${spell?`<p class="helper">${e(spell.effects.map(effect=>effect.tag==='effect_damage'?`${effect.value} base damage, increased by INT; automatic hit`:equipmentEffectText([effect])).join(' · '))}</p>`:''}</li>`;
  }).join('')+Object.entries(actor.data.holdings?.valuables??{}).filter(([,q])=>q>0).map(([id,q])=>`<li>${unavailable(`${byId('items',id).label} ×${q}`,'Not usable in combat.')}</li>`).join(''):inspection;
  const pressure=tab==='spells'?spellPressure(actor,expedition):null;
  const magicHint=pressure?`<section class="magic-pressure ${pressure.dc===null?'safe':'warning'}" aria-label="Learned magic pressure"><p><strong>Next learned cast: ${spellCost(actor,expedition)} Essence · ${pressure.dc===null?'within your WIS limit':`Overcast — WIS check vs DC ${pressure.dc}; failure costs 1 Sanity`}.</strong></p><p class="helper">Learned spells are reusable. Repeated casting increases their shared Essence cost. WIS allows ${pressure.safeCasts} safe casts per expedition. Casting pressure resets when you return from the expedition.</p>${devMode?`<p class="diagnostic">Learned Cast Count ${expedition.strain} · INT ${actor.data.attributes.baseStats.INT} · next cost 2 ^ max(0, count - INT + 1).</p>`:''}</section>`:items?'<p class="helper">Scrolls consume one action and one item, without Essence cost or Overcast. Scroll damage scales with INT.</p>':'';
  const itemControls=tab==='spells'?'':items?buttons(choices.filter(c=>c.type==='pit.scroll'&&!c.params.container)):content;
  return `<nav class="combat-tabs" aria-label="Expedition equipment">${(expedition.combat&&!devMode&&!inventory.spells.some(Boolean)?['weapons','bag']:['weapons','spells','bag']).map(name => tabButton(name==='bag'?'Items':name[0].toUpperCase() + name.slice(1), 'pit-tab', name,name===tab)).join('')}</nav>
    <section aria-label="${items?'Items':e(tab)}">${magicHint}<ol class="${tab==='bag'?'bag-slots':'slot-grid'}">${itemList}</ol>${items&&!inventory.bag.some(Boolean)?'<p class="helper">Your Bag is empty.</p>':''}${tomeHint}<div class="actions">${itemControls || (!devMode || tab==='spells'&&choices.some(c=>c.type==='pit.cast') || choices.some(c => c.type === 'pit.attack' || c.type === 'pit.defend' && c.params.slot !== undefined) && tab === 'weapons' ? '' : '<p class="diagnostic">No usable action in this tab. Check the current phase and item condition.</p>')}</div>${swapping}</section>`;
}

export function expeditionView(world, actor, choices, tab = 'weapons', swapSlot = 0, devMode = false) {
  const expedition = world.entities.hv_pit_1.data.expedition, room = expedition.floor.rooms[expedition.roomIndex], combat = expedition.combat;
  const hazard=room?.family==='hazard'&&!room.resolved?byId('hazards',room.encounter):null;
  const hazardPreview=devMode && hazard?`<section aria-label="Hazard approaches">${['primary','alternate'].filter(a=>hazard[a]).map(a=>{const spec=hazardCheckSpecification(actor,hazard,a);return `<p>${a==='primary'?'Approach':'Alternate'}: ${spec.stat} ${actor.data.attributes.baseStats[spec.stat]}, modifier ${traitBonus(actor,spec.scope)} vs DC ${spec.dc}${spec.advantage?' · Advantage':''}.</p>`;}).join('')}</section>`:'';
  if (expedition.pendingLoot.length) return `<h1>Bag full</h1><p>Choose whether to keep ${e(itemName(expedition.pendingLoot[0]))}. Replacing a Bag slot discards its previous contents.</p>${resultView(expedition.lastResult, devMode)}<div class="actions">${buttons(choices)}</div>`;
  if (combat) {
    const enemy = byId('enemies', combat.enemy.templateId);
    const move = combatMove(combat.committed);
    const dodge = dodgeChance(actor.data.attributes.baseStats.DEX, enemy.combatStats.DEX, move.speed, playerKnockedDown(combat));
    // Keep reaction tiles visible even when the previous choice used another tab.
    if (combatPhase(combat) === 'incoming') tab = 'weapons';
    return `<p class="eyebrow">${combat.kind === 'return' ? 'Return Encounter' : 'Combat'} · Round ${combat.round}</p><h1>${e(enemy.label)}</h1>
      <p class="enemy-health"><strong>Enemy HP ${combat.enemy.hp}/${enemy.hp}</strong></p>
      <p class="combat-status">${e([
        enemyKnockedDown(combat) ? 'Enemy KNOCKED DOWN — Dodge is 0% against your next offensive action, then Knockdown clears' : null,
        playerKnockedDown(combat) ? 'You are KNOCKED DOWN — your turn is not skipped. Dodge is 0% against the next enemy offensive action, then Knockdown clears' : null].filter(Boolean).join(' · '))}</p>
      <section class="telegraph" aria-label="Committed enemy move"><h2>${combat.moveCancelled || combat.phase === 'cancelled' ? 'Cancelled' : 'Committed'}: ${e(move.label)}</h2>
      <p>Damage ${move.damage} (${e(move.damageType ?? 'physical')}) · Impact ${move.impact} · Speed ${signed(move.speed)}${move.offensive ? ` · Your Dodge chance: ${dodge.chance}%` : ' · Legacy nonoffensive commitment'}</p>${devMode && move.offensive ? `<p class="check-math">${e(dodgeFormula(dodge))}</p>` : ''}</section>
      <section class="combat-decisions" aria-label="Current combat choices">
      ${combatPhase(combat) === 'incoming' ? `<h2>${devMode ? "Incoming enemy phase" : "How do you defend?"}</h2><div class="actions defense-grid">${buttons(choices.filter(c => c.group === 'defense' && c.params.slot === undefined).map(c => c.params.mode === 'dodge' ? {...c,label:`Dodge — ${dodge.chance}%`} : c))}</div><p class="helper">Counterattack — Take the incoming attack first. If you survive, choose one offensive response. Block uses the equipped item and wears its durability on physical contact.</p>`
        : combatPhase(combat) === 'advantage' ? `<h2>${combat.interrupt === 'Knockdown' || !combat.interrupt && combat.enemyKnockdown ? 'KNOCKED DOWN' : 'STAGGERED'} — ${e(move.label)} cancelled.</h2><p>Press the Advantage: choose one immediate offensive action.</p>${enemyKnockedDown(combat) ? '<p>Enemy Dodge is 0% against the next offensive action.</p>' : ''}`
        : combatPhase(combat) === 'counterattack' ? '<h2>Counterattack — choose one offensive response.</h2>' : combatPhase(combat) === 'attack' ? `<h2>${devMode ? 'Player Attack phase' : 'What do you do?'}</h2>` : ''}
      ${tab==='weapons'?`<div class="actions bare-hands">${buttons(choices.filter(c=>c.type==='pit.unarmed'))}</div>`:''}
      ${equipmentPanels(actor, choices, tab, swapSlot, expedition, devMode)}
      <div class="actions combat-secondary">${buttons(choices.filter(c => c.group === 'combat'&&(tab!=='weapons'||c.type!=='pit.unarmed')))}</div></section>
      ${resultView(expedition.lastResult, devMode)}<p class="helper">Last enemy move: ${e(combat.lastMove ?? 'None')}</p>
      ${combat.kind === 'return' ? '<p class="helper">Retreat is unavailable during a Return Encounter.</p>' : '<p class="helper">Retreat abandons this Floor attempt and regenerates its start; spent resources remain spent.</p>'}`;
  }
  return `<p class="eyebrow">Stratum 1 · Swallowed HearthVale Ruins</p><h1>${e(room?.title ?? `Floor ${expedition.floor.number} — Start`)}</h1>
    <p>${e(room ? room.resolved && room.family !== 'fixed' ? resolvedRoomProse : byId('texts',byId('events',room.encounter)?.opening ?? byId('hazards',room.encounter)?.text)?.text ?? roomProse[room.family] : 'A new stretch of ruins lies ahead. Movement is forward only.')}</p>
    ${hazardPreview}<div class="actions primary-actions">${buttons(choices.filter(c => c.group === 'exploration').map(c => devMode ? c : {...c,label:c.label.replace(/ vs DC \d+/g,'')}))}</div>${resultView(expedition.lastResult, devMode)}
    ${equipmentPanels(actor, choices, tab, swapSlot, expedition, devMode)}
    <p>Forward only through Rooms. Return ends this expedition through a WIS check and possible encounter; it does not retrace Rooms.</p>
    <div class="return-control">${buttons(choices.filter(c => c.group === 'return'))}</div>`;
}
