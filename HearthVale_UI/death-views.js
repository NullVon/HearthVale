import { escapeHtml as e,button } from './surface-views.js';
import { deathDescription,continuityFacts } from '../HearthVale_Story/death.js';

export function lifeRecordView(record) {
  return `<section aria-label="Life Record"><h2>Life Record</h2><p>${e(record.name)} · Generation ${e(record.generation)}</p>
    ${record.arrived?`<p>Arrived Year ${e(record.arrived.year)}, Day ${e(record.arrived.day)}.</p>`:''}
    ${record.facts.length?`<ul>${record.facts.map(f=>`<li>${e(f.text)}${f.day===undefined?'':` <span class="muted">— ${f.year===undefined?'':`Year ${e(f.year)}, `}Day ${e(f.day)}</span>`}</li>`).join('')}</ul>`:''}
    <p><strong>Life ended:</strong> ${e(deathDescription(record.death))} Year ${e(record.death.year)}, Day ${e(record.death.day)}.</p></section>`;
}

export function archivedLives(world,excludeActor=null) {
  const records=Object.values(world.entities).filter(a=>a.actor&&a.data.lifeRecord&&a.id!==excludeActor)
    .map(a=>a.data.lifeRecord).sort((a,b)=>a.generation-b.generation||a.actor.localeCompare(b.actor));
  if(!records.length)return '';
  // Player-facing archive, not the current Actor's knowledge or an institutional
  // record. Reading this projection never grants claims or copies memories.
  return '<h2>Lives followed</h2><p>Earlier lives in the same HearthVale. This player-facing archive does not give the current adventurer private knowledge.</p>'
    +records.map(r=>`<details><summary>Generation ${e(r.generation)} — ${e(r.name)}</summary>
      ${lifeRecordView(r)}</details>`).join('');
}

export function deathView(actor,transition,world) {
  const record=actor.data.lifeRecord,death=record?.death??actor.data.death;
  return `<p class="eyebrow">A life in HearthVale</p><h1>${e(record?.name??actor.data.identity.name)} has died</h1>
    <p>This is the record of the life you followed, not a public report. HearthVale may not yet know how this life ended.</p>
    ${record?lifeRecordView(record):`<p>${e(deathDescription(death))}</p>`+button('Prepare Life Record','adjudicate-death')}
    <h2>HearthVale continues.</h2>
    <p>Continuity is shown for you as the player; it does not transfer private knowledge to a new adventurer.</p>
    ${world&&transition?.status!=='completion-pending'?`<ul>${continuityFacts(world).map(f=>`<li>${e(f)}</li>`).join('')}</ul>`:''}
    <p>${transition?.status==='completion-pending'?'This is the final Day. Chapter completion awaits; no successor begins.':record?'This life is recorded. You may follow a new adventurer in the same world.':''}</p>
    <div class="actions">${record&&world?.globals.hearthvaleSurface.calendar.day===40?button('Complete Chapter','adjudicate-death'):record&&transition?.status==='succession-ready'?button('Choose Who Comes Next','begin-succession'):''}${button('Save','save')}${button('Load','load')}${button('Return to Title','return-to-title')}</div>`;
}
