import { byId } from '../HearthVale_Content/expedition.js';
import { button } from './surface-views.js';

export function hasLearnedMagic(actor) {
  return (actor?.data.inventory?.spells??[]).some(id=>{const spell=byId('spells',id);return spell && !spell.explorationOnly;});
}

export function magicIntroduction(actor, seen) {
  if(seen || !hasLearnedMagic(actor))return '';
  return `<section class="magic-pressure" aria-label="Essence and Overcast introduction"><h2>Essence &amp; Overcast</h2><p>Learned magic draws on Essence. Repeated casting during an expedition becomes increasingly expensive, and your WIS determines how long you can cast safely. Push beyond your limit and you risk Overcasting; a failed Overcast costs 1 Sanity, though the spell still takes effect. Casting pressure resets when you return from the expedition. Scrolls cost no Essence and avoid Overcast, but are consumed when used.</p>${button('Got it','magic-introduction-seen')}</section>`;
}
