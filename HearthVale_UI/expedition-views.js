import { escapeHtml as e, button, tabButton, unavailable } from './surface-views.js';
import { byId } from '../HearthVale_Content/expedition.js';
import { spellCost } from '../HearthVale_Shell/src/expedition-equipment.js';
import { hazardCheckSpecification } from '../HearthVale_Shell/src/expedition-rooms.js';
import { traitBonus } from '../HearthVale_Shell/src/expedition-checks.js';
import { roomProse, resolvedRoomProse, equipmentEffectText } from '../HearthVale_Story/expedition.js';

const buttons = choices => choices.map(choice => button(choice.label, 'expedition', JSON.stringify({ type: choice.type, params: choice.params }))).join('');
const itemName = item => item ? byId('items', item.templateId)?.label ?? item.templateId : 'Empty';

export function resultView(result) {
  if (!result) return '';
  const roll = result.check;
  return `<section class="outcome" aria-label="Resolved outcome"><p>${e(result.text)}</p>${roll ? `<p class="check-math">d20 ${e(roll.rolls.join(', '))} → ${roll.die} + ${e(roll.stat)} ${roll.value} ${roll.bonus >= 0 ? '+' : '−'} ${Math.abs(roll.bonus)} = ${roll.total} vs DC ${roll.dc}: <strong>${roll.success ? 'Success' : 'Failure'}</strong></p>${roll.reroll ? '<p>Lucky Bastard used its expedition reroll; the better result was kept.</p>' : ''}` : ''}
    ${result.rewards?.length ? `<ul>${result.rewards.map(reward => `<li>${e(({xp:'XP',gold:'Gold',arrows:'Arrows',essence:'Essence'})[reward.resource] ?? byId('items', reward.item)?.label ?? 'Reward')} +${reward.quantity}${reward.destination === 'pending' ? ' — Bag full; decision required' : ''}</li>`).join('')}</ul>` : ''}
    ${roll?.trigger?`<p>Initial trap check: ${e(roll.trigger.stat)} total ${roll.trigger.total} vs DC ${roll.trigger.dc}: ${roll.trigger.success?'Success':'Failure'}. The roll above is the triggered reaction.</p>`:''}
    ${result.defense!==undefined?`<p>Defense applied: ${result.defense}. Damage taken: ${result.damage}.</p>`:''}
    ${result.wear ? `<p>${e(byId('items', result.wear.item)?.label)}: ${result.wear.loss} DUR lost${result.wear.prevented ? '; 1 wear prevented' : ''}${result.wear.destroyed ? '; destroyed after the action' : ''}.</p>` : ''}</section>`;
}

export function expeditionHud(actor, expedition) {
  const r = actor.data.attributes.resources;
  return `<aside class="expedition-hud" aria-label="Expedition resources"><span>Floor ${expedition.floor.number} · ${expedition.roomIndex < 0 ? 'Start' : `Room ${expedition.roomIndex + 1}/${expedition.floor.rooms.length}`}</span>
    <span>Arrows ${r.arrows}</span><span>Essence ${r.essence}</span><span>Strain ${expedition.strain}</span>
    <span>${actor.data.statuses?.poison ? 'Poisoned: −1 HP after each round or noncombat Room' : 'No Poison'}${expedition.combat?.barrier ? ` · Barrier ${expedition.combat.barrier} (this round)` : ''}${actor.data.expeditionHp?` · Bigshroom +${actor.data.expeditionHp} Max HP`:''}</span></aside>`;
}

export function pitEntrance(world, actor, choices) {
  const pit = world.entities.hv_pit_1, r = actor.data.attributes.resources;
  return `<p class="eyebrow">Stratum 1</p><h1>Pit Entrance</h1><p>Swallowed HearthVale Ruins</p>
    <h2>Supplies and status</h2><p>Arrows ${r.arrows} · HP Potions ${actor.data.inventory.bag.filter(i => i?.templateId === 'item_hp_potion_basic').reduce((sum,i) => sum + i.quantity, 0)} · AP ${r.ap}/${r.maxAp}</p>
    <p>Bag ${actor.data.inventory.bag.filter(Boolean).length}/8. The entire expedition costs 1 AP; Rooms and Floors cost no further AP. Return costs 0 AP and may involve an encounter.</p><p>${actor.data.statuses?.poison ? 'Poisoned' : 'No Poison'}. Essence and Strain begin at 0.</p>
      ${pit.data.lastResult?.actor===actor.id||pit.data.lastResult?.actor===undefined&&(actor.data.generation??1)===1?resultView(pit.data.lastResult):''}<div class="actions">${buttons(choices)}</div>
    ${!choices.length ? '<p>You have no available entry action. Check your AP and condition.</p>' : ''}
    <div class="leave">${button('Leave', 'move', 'loc_surface')}</div>`;
}

export function equipmentPanels(actor, choices, tab, swapSlot, expedition) {
  const inventory = actor.data.inventory;
  const groups = tab === 'bag' ? ['bag'] : [tab];
  const content = buttons(choices.filter(c => groups.includes(c.group)));
  const inspection = tab === 'weapons' ? inventory.equipped.map((item,i) => {
      const d=item&&byId('items',item.templateId);
      return `<li>${e(itemName(item))}${d?`<p>${e([d.damage!==undefined?`DMG ${d.damage}`:null,d.defense!==undefined?`DEF ${d.defense}`:null,d.range,item.durability!==undefined?`DUR ${item.durability}/${d.maxDurability}`:null,d.ammo?`Arrows ${actor.data.attributes.resources.arrows}; each shot spends 1 Arrow and applies 1 DUR wear, hit or miss. Cannot Block.`:null].filter(Boolean).join(' · '))}</p>${!choices.some(c=>['pit.attack','pit.scroll'].includes(c.type)&&c.params.slot===i)?unavailable(d.label,d.category==='shield'?'Block is offered during the incoming enemy phase.':`No attack available here. ${d.range?`Requires ${d.range} range. `:''}Check phase, ammunition and condition.`):''}`:''}</li>`;
    }).join('')
    : tab === 'spells' ? inventory.spells.map((id,i) => {const d=id&&byId('spells',id);return `<li>${e(d?.label??'Empty')}${d?`<p>${spellCost(actor,expedition,d)} Essence · ${e(equipmentEffectText(d.effects))}</p>${!choices.some(c=>c.type==='pit.cast'&&c.params.slot===i)?unavailable(d.label,'Unavailable: check Essence, phase and whether this spell has a valid target here.'):''}`:''}</li>`;}).join('')
      : inventory.bag.map((item,i) => `<li>${i + 1}. ${e(itemName(item))}${item ? ` ×${item.quantity}` : ''}</li>`).join('');
  const swapping = tab === 'bag' && choices.some(c => c.group === 'swap') ? `<details><summary>Swap one Equipped ↔ Bag slot</summary>
    <p>A combat swap spends the Attack phase. Outside combat it is free.</p><div class="actions">${inventory.equipped.map((item,i) => tabButton(`Equipped ${i + 1}: ${itemName(item)}`, 'swap-slot', i, i===swapSlot)).join('')}</div>
    <p>Selected Equipped slot: ${swapSlot + 1}</p><div class="actions">${buttons(choices.filter(c => c.group === 'swap' && c.params.equipped === swapSlot))}</div></details>` : '';
  return `<nav class="combat-tabs" aria-label="Expedition equipment">${['weapons','spells','bag'].map(name => tabButton(name[0].toUpperCase() + name.slice(1), 'pit-tab', name,name===tab)).join('')}</nav>
    <section aria-label="${e(tab)}"><ol class="${tab==='bag'?'bag-slots':'slot-grid'}">${inspection}</ol><div class="actions">${content || '<p>No usable action in this tab. Check the current phase and item condition.</p>'}</div>${swapping}</section>`;
}

export function expeditionView(world, actor, choices, tab = 'weapons', swapSlot = 0) {
  const expedition = world.entities.hv_pit_1.data.expedition, room = expedition.floor.rooms[expedition.roomIndex], combat = expedition.combat;
  const hazard=room?.family==='hazard'&&!room.resolved?byId('hazards',room.encounter):null;
  const hazardPreview=hazard?`<section aria-label="Hazard approaches">${['primary','alternate'].filter(a=>hazard[a]).map(a=>{const spec=hazardCheckSpecification(actor,hazard,a);return `<p>${a==='primary'?'Approach':'Alternate'}: ${spec.stat} ${actor.data.attributes.baseStats[spec.stat]}, modifier ${traitBonus(actor,spec.scope)} vs DC ${spec.dc}${spec.advantage?' · Advantage':''}.</p>`;}).join('')}</section>`:'';
  if (expedition.pendingLoot.length) return `<h1>Bag full</h1><p>Choose whether to keep ${e(itemName(expedition.pendingLoot[0]))}. Replacing a Bag slot discards its previous contents.</p>${resultView(expedition.lastResult)}<div class="actions">${buttons(choices)}</div>`;
  if (combat) {
    const enemy = byId('enemies', combat.enemy.templateId);
    return `<p class="eyebrow">${combat.kind === 'return' ? 'Return Encounter' : 'Combat'} · Round ${combat.round}</p><h1>${e(enemy.label)}</h1>
      <p>Enemy HP ${combat.enemy.hp}/${enemy.hp} · Range <strong>${combat.range}</strong></p>
      <p>${e([actor.data.statuses?.poison ? 'Poisoned' : null, combat.barrier ? `Barrier ${combat.barrier}` : null,
        combat.enemyKnockdown ? 'Enemy Knockdown: next offensive move prevented' : null,
        combat.playerKnockdown || combat.skippedAttack ? 'Player Knockdown: next Attack phase lost' : null].filter(Boolean).join(' · ') || 'No active combat statuses')}</p>
      <section class="telegraph" aria-label="Committed enemy move"><h2>${combat.moveCancelled || combat.phase === 'cancelled' ? 'Cancelled' : 'Committed'}: ${e(combat.committed.label)}</h2>
      <p>${combat.committed.range} · ${combat.committed.damage} ${e(combat.committed.damageType)} damage · ${combat.committed.impact} Impact · Dodge DEX vs DC ${combat.committed.dodgeDC}</p>${combat.committed.movement!=='none'?`<p>After resolving at its committed range, the enemy moves to ${e(combat.committed.movement)}.</p>`:''}${combat.moveCancelled?'<p>Stagger or Knockdown cancelled this prepared move.</p>':''}</section>
      <p>Last enemy move: ${e(combat.lastMove ?? 'None')}</p>${resultView(expedition.lastResult)}
      ${combat.phase === 'incoming' ? `<h2>Incoming enemy phase${combat.skippedAttack ? ' · Attack skipped by Knockdown' : ''}</h2><div class="actions">${buttons(choices.filter(c => c.group === 'defense'))}</div>`
        : combat.phase === 'attack' ? '<h2>Player Attack phase</h2>' : '<h2>Round outcome</h2>'}
      ${equipmentPanels(actor, choices, tab, swapSlot, expedition)}
      <div class="actions">${buttons(choices.filter(c => c.group === 'combat'))}</div>
      ${combat.kind === 'return' ? '<p>Retreat is unavailable during a Return Encounter.</p>' : '<p>Retreat abandons this Floor attempt and regenerates its start; spent resources remain spent.</p>'}`;
  }
  return `<p class="eyebrow">Stratum 1 · Swallowed HearthVale Ruins</p><h1>${e(room?.title ?? `Floor ${expedition.floor.number} — Start`)}</h1>
    <p>${e(room ? room.resolved && room.family !== 'fixed' ? resolvedRoomProse : byId('texts',byId('events',room.encounter)?.opening ?? byId('hazards',room.encounter)?.text)?.text ?? roomProse[room.family] : 'A new stretch of ruins lies ahead. Movement is forward only.')}</p>
    ${hazardPreview}${resultView(expedition.lastResult)}<div class="actions">${buttons(choices.filter(c => c.group === 'exploration'))}</div>
    ${equipmentPanels(actor, choices, tab, swapSlot, expedition)}
    <p>Forward only through Rooms. Return ends this expedition through a WIS check and possible encounter; it does not retrace Rooms.</p>
    <div class="return-control">${buttons(choices.filter(c => c.group === 'return'))}</div>`;
}
