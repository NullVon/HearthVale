import { statusDetails } from '../HearthVale_Story/statuses.js';
import { sanityLabel } from '../HearthVale_Shell/src/sanity.js';
import { surfaceCatalog } from '../HearthVale_Content/surface.js';
import { expeditionCatalog } from '../HearthVale_Content/expedition.js';
import { derivedActorValues, instantiateSurfaceActor } from '../HearthVale_Shell/src/surface-candidates.js';
import { traitDescriptions, locationDescriptions } from '../HearthVale_Story/surface.js';
import { trainingRequirement } from '../HearthVale_Shell/src/training.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const e = escapeHtml;
export const button = (label, command, value = '') => {
  let op = command;
  if (command === 'service' || command === 'expedition') {
    const action = JSON.parse(value); op = action.op ?? action.type;
  }
  const tone = ['new','choose','choose-successor','begin-succession','sleep','train','pit.enter','pit.forward','pit.guardian'].includes(op) ? 'primary'
    : ['confirm-action','discard','sell','sell-holding','pit.retreat','return-to-title'].includes(op) ? 'caution'
    : ['close','cancel-action','menu'].includes(op) ? 'quiet' : 'standard';
  return `<button type="button" class="control ${tone}" data-command="${e(command)}" data-value="${e(value)}">${e(label)}</button>`;
};
export const tabButton = (label, command, value, selected) => button(`${label}${selected ? ' · Selected' : ''}`,command,value).replace('<button ',`<button aria-pressed="${selected}" `);
export const unavailable = (label, reason) => `<p class="unavailable"><button type="button" disabled>${e(label)}</button><span>${e(reason)}</span></p>`;
const list = values => `<ul>${values.map(value => `<li>${e(value)}</li>`).join('')}</ul>`;
const label = id => [...expeditionCatalog.items, ...expeditionCatalog.spells, ...surfaceCatalog.traits].find(t => t.id === id)?.label ?? id;
export const paragraphs = lines => lines.map(line => `<p>${e(line)}</p>`).join('');

export function statusView(actor) {
  return Object.entries(statusDetails).filter(([key])=>actor.data.statuses?.[key]).map(([,d])=>
    '<details class="status-detail"><summary>'+e(d.name)+'</summary><p>'+e(d.effect+' '+d.timing)+'</p><p>'+e(d.persistence)+'</p><p>'+e(d.removal)+'</p></details>').join('');
}

export function hud(actor, calendar) {
  const r = actor.data.attributes.resources;
  return `<header class="hud" aria-label="Current resources">${[
    [`HP ${r.hp}/${derivedActorValues(actor).maxHp}`, 'Current health; sleep restores HP.'],
    [`Hearts ${r.hearts}`, 'Hearts remaining in this life.'],
    [sanityLabel(r), 'Sanity is separate from HP; sleep does not restore it.'],
  ].map(([text,help]) => `<span class="resource" title="${e(help)}">${e(text)}</span>`).join('')}
    <span class="hud-context">Year ${calendar.year} · Day ${calendar.day}</span><span>AP ${r.ap}/${r.maxAp}</span><span>Gold ${r.gold}</span>${statusView(actor)}</header>`;
}

export function character(actor, tab = 'all', world = null) {
  const { baseStats, traits, resources: r } = actor.data.attributes;
  const d = derivedActorValues(actor);
  return `<h1>${e(actor.data.identity.name)}</h1><p>Generation ${e(actor.data.generation??1)} · ${actor.data.identity.age === undefined ? '' : `Age ${e(actor.data.identity.age)} · `}Hearts ${e(r.hearts)} · HP ${e(r.hp)}/${e(d.maxHp)} · ${e(sanityLabel(r))}</p>
    ${tab !== 'all' ? `<nav class="combat-tabs" aria-label="Character tabs">${['stats','traits','history'].map(t=>tabButton(t,'character-tab',t,t===tab)).join('')}</nav>` : ''}
    ${['all','stats'].includes(tab)?`<dl>${Object.entries(baseStats).map(([key,value]) => `<dt>${e(key)}</dt><dd>${e(value)}</dd>`).join('')}
    <dt>Max HP</dt><dd>${e(d.maxHp)}</dd><dt>Natural Armor</dt><dd>${e(d.naturalArmor)}</dd></dl><p>Level ${e(actor.data.attributes.level??1)} · XP ${e(r.xp)}</p><h2>Training progress</h2>${list(Object.keys(baseStats).map(stat=>`${stat}: ${actor.data.training?.progress?.[stat]??0}/${trainingRequirement(actor,stat)} sessions`))}`:''}
    ${['all','traits'].includes(tab)?`<h2>Innate Traits</h2>${list(traits.map(id => `${label(id)} — ${traitDescriptions[id]}`))}
    <h2>Scars</h2>${actor.data.scars.length ? list(actor.data.scars.map(s=>typeof s==='string'?s:s.label??'Scar')) : '<p>None.</p>'}`:''}
    ${['all','history'].includes(tab)?`<h2>Personal history</h2>${actor.data.memories?.length?list(actor.data.memories.map(m=>`${m.event} · Day ${m.day}`)):'<p>No personal history yet.</p>'}${world?`<h2>Relationships</h2>${list(Object.entries(actor.data.relationships??{}).filter(([id])=>world.entities[id]?.data.identity?.name).map(([id,value])=>`${world.entities[id].data.identity.name}: ${value}`))}`:''}`:''}`;
}

export function inventory(actor, tab = 'all') {
  const { inventory: inv, attributes: { resources: r } } = actor.data;
  const itemText = item => {
    if (!item) return 'Empty';
    const definition = expeditionCatalog.items.find(d=>d.id===item.templateId);
    return `${label(item.templateId)} ×${item.quantity}${!definition?.maxDurability || item.durability === undefined ? '' : ` · DUR ${item.durability}`}${definition?.category === 'tome' ? ' · Learn to add this spell; Tomes are not equipped' : ''}`;
  };
  const slots = (values,grid=true) => `<ol class="${grid?'slot-grid':'bag-slots'}">${values.map(value => `<li>${e(value)}</li>`).join('')}</ol>`;
  return `<h1>Inventory</h1>${tab!=='all'?`<nav class="inventory-tabs" aria-label="Inventory tabs">${[['equipment','EQUIPPED'],['bag','BAG'],['holdings','COLLECTABLES'],['spells','SPELLS']].map(([t,name])=>tabButton(name,'inventory-tab',t,t===tab)).join('')}</nav>`:''}
    ${['all','equipment'].includes(tab)?`<h2>Equipped · 4 slots</h2>${slots(inv.equipped.map(itemText))}<h2>Chest Armor</h2><p>${e(itemText(inv.chest))}</p>`:''}
    ${['all','bag'].includes(tab)?`<h2>Bag · ${inv.bag.filter(Boolean).length}/8 slots</h2>${slots(inv.bag.map(itemText),false)}`:''}
    ${['all','spells'].includes(tab)?`<h2>Spell Slots · 4 slots</h2><p class="helper">Learned spells are reusable. Their shared Essence cost increases with repeated casting during an expedition, and casting beyond your WIS limit risks Overcast. Cast from the expedition Spells tab when a target and enough Essence are available. Scrolls are consumed Items: no Essence cost or Overcast.</p>${slots(inv.spells.map(id => id ? label(id) : 'Empty'))}`:''}
    ${['all','holdings'].includes(tab)?`<h2>Resources</h2>${list([`Arrows: ${r.arrows}`, `Gold: ${r.gold}`, `XP: ${r.xp}`, `Essence: ${r.essence}`])}
    <h2>Materials</h2>${list(Object.entries(actor.data.holdings?.materials ?? {}).map(([id,quantity]) => `${label(id)} ×${quantity}`))}
    <h2>Valuables</h2>${list(Object.entries(actor.data.holdings?.valuables ?? {}).map(([id,quantity]) => `${label(id)} ×${quantity}`))}`:''}`;
}

export function candidateCards(candidates, succession=false, generation=null) {
  return (succession?'<h1>Who will you follow next?</h1><p>Three more adventurers arrive in HearthVale. A different person, in the same town.</p>'
    :'<h1>Choose your adventurer</h1><p>Three arrivals. A different life ahead of each.</p>') + (succession&&generation?`<p>Generation ${e(generation)} · Choose one adventurer to follow.</p>`:'') + candidates.map(candidate => {
    const actor = instantiateSurfaceActor(candidate);
    const r=actor.data.attributes.resources,d=derivedActorValues(actor);
    const profile=`<h2>${e(candidate.label)}</h2><p class="muted">Age ${candidate.age} · Hearts ${r.hearts} · HP ${r.hp}/${d.maxHp} · Sanity ${r.sanity}/${r.maxSanity}</p><h3>Starting stats</h3><dl class="candidate-stats">${Object.entries(actor.data.attributes.baseStats).map(([stat,value])=>`<div><dt>${e(stat)}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="candidate-traits">${actor.data.attributes.traits.map(label).map(e).join(' · ')}</p>`;
    const magicStarter=!succession && candidate.loadout.weapons.length===1 && candidate.loadout.weapons[0]==='item_bow' && candidate.loadout.spells[0]==='spell_fireball';
    return `<article class="candidate-card" aria-label="${e(candidate.label)} candidate">${profile}${magicStarter?'<p class="status-badge">Learned Fireball + Bow starter</p>':''}
      <h3>Starting loadout</h3>${list([...candidate.loadout.weapons.map(label), 'Chest Armor', '1 Basic HP Potion',
        `${candidate.loadout.arrows} Arrows · 45 Gold · 0 XP · 0 Essence`,
        `4 Spell Slots · ${candidate.loadout.spells.length ? candidate.loadout.spells.map(label).join(', ') : 'No starting spell'}`])}
      ${button(`Choose ${candidate.label}`, succession?'choose-successor':'choose', candidate.id)}
      <details><summary>Traits and spell guidance</summary>${list(actor.data.attributes.traits.map(id=>`${label(id)} — ${traitDescriptions[id]}`))}<p class="helper">Learned spells are reusable; repeated casting during an expedition increases Essence cost and risks Overcast beyond your WIS limit. Scrolls are carried Items: consumed on use, with no Essence cost or Overcast.</p></details></article>`;
  }).join('');
}

export function surfaceLocation(world, actor, services = '') {
  if (actor.primaryLocation === 'loc_surface') return `<p class="eyebrow">The town beside the Pit</p><h1>HearthVale</h1>
    <p>The streets are yours to explore. Moving costs no AP.</p><nav class="actions destination-grid" aria-label="Surface destinations">${surfaceCatalog.locations.map(l => button(l.id==='loc_guild'&&world.globals.hearthvaleServices?.auronTrainingUnlocked?`${l.label} — Training with Auron`:l.label, 'move', l.id)).join('')}</nav>`;
  const place = surfaceCatalog.locations.find(l => l.id === actor.primaryLocation);
  const people = Object.values(world.entities).filter(a => a.actor && a.id !== actor.id && a.lifecycle === 'active' && a.primaryLocation === actor.primaryLocation);
  return `<p class="eyebrow">HearthVale · Surface</p><h1>${e(place.label)}</h1><p>${e(locationDescriptions[place.id])}</p>
    <p class="here-now"><strong>Here now:</strong> ${people.length ? people.map(a=>e(a.data.identity.name)).join(' · ') : 'No one else nearby.'}</p>
    ${place.id === 'loc_inn' ? `<div class="actions">${button('Sleep / End Day', 'sleep-prompt')}</div>` : ''}
    ${services}<div class="leave">${button('Leave','move','loc_surface')}</div>`;
}
