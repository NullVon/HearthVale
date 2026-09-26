import { escapeHtml as e,button } from './surface-views.js';
import { archivedLives,lifeRecordView } from './death-views.js';
import { completionStory } from '../HearthVale_Story/completion.js';

export function completionView(world) {
  const story=completionStory(world),s=world.globals.hearthvaleSurface;
  const actor=world.entities[s.playerId],record=actor.data.lifeRecord;
  const finalDeath=!!world.globals.hearthvaleCompletion.death;
  return `<main class="demo-complete"><p class="eyebrow">HearthVale · Year ${e(s.calendar.year)} · Day ${e(s.calendar.day)}</p>
    ${finalDeath?`<h1>${e(record.name)} has died</h1><p>This player-facing Life Record is not a public report.</p>${lifeRecordView(record)}<p>This Life Record closes the final Day. No successor begins.</p><h2>Demo complete</h2>`:'<h1>Demo complete</h1>'}<p>${e(story.context)}</p>
    <h2>HearthVale remembers</h2><ul>${story.facts.slice(0,5).map(f=>`<li>${e(f)}</li>`).join('')}</ul>
    ${story.facts.length>5?`<details><summary>More recorded history</summary><ul>${story.facts.slice(5).map(f=>`<li>${e(f)}</li>`).join('')}</ul></details>`:''}
    ${archivedLives(world,finalDeath?actor.id:null)}<h2>${e(story.thanks)}</h2>
    <div class="actions">${button('Save','save')}${button('Load','load')}${button('Return to Title','return-to-title')}</div></main>`;
}
