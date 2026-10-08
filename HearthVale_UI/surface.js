import { createSurfaceGame } from '../HearthVale_Shell/src/surface.js';
import { openingCards, miraOpening, miraResponses, miraClosing } from '../HearthVale_Story/surface.js';
import { escapeHtml as e, button, tabButton, paragraphs, hud, character, inventory, candidateCards, surfaceLocation } from './surface-views.js';
import { expeditionHud, expeditionView, pitEntrance, resultView } from './expedition-views.js';
import { serviceView,inventoryControls,recordCards,weeklySnapshots } from './service-views.js';
import { deathView,archivedLives } from './death-views.js';
import { completionView } from './completion-views.js';
import { freshGameSeed } from './new-game.js';
import { progressionCheckpoint,importantProgress,persistProgress } from './save-feedback.js';
import { advanceArrival } from './automatic-flow.js';
import { worldUpdates } from './world-updates.js';
import { magicIntroduction } from './magic-onboarding.js';
import { sellOffers } from '../HearthVale_Shell/src/economy.js';

const app = document.querySelector('#app'), status = document.querySelector('#status');
const manualKey = 'hearthvale.surface.save.v1', autoKey = 'hearthvale.surface.autosave.v1';
// Text-only zoom can enlarge the frame without changing the viewport width.
// Keep enough room for content, including when the larger-text setting is off.
function fitFrame() {
  const height=[...app.querySelectorAll('.hud,.utilities')].reduce((sum,node)=>sum+node.getBoundingClientRect().height,0);
  document.documentElement.classList.toggle('flow-frame',height>window.innerHeight*.45);
}
new ResizeObserver(fitFrame).observe(app);
window.addEventListener('resize',fitFrame);
let game = null, title = true, panel = null;
let expeditionTab = 'weapons', swapSlot = 0;
let inventoryTab='equipment',characterTab='stats';
let pendingAction=null;
let devMode=false;
let selectedSale=new Set(),saleOwner=null;
const message = text => { status.textContent = text; };
function persist(key = autoKey, confirm = false) {
  return persistProgress(game,localStorage,key,message,confirm);
}
function load(key) {
  const saved = localStorage.getItem(key);
  if (!saved) throw new Error('No saved game in this slot.');
  const loaded = createSurfaceGame({ saved });
  loaded.resumeFlow();
  advanceArrival(loaded,devMode);
  game = loaded; title = false; panel = null; pendingAction=null;
  selectedSale.clear();saleOwner=null;
  message('Saved game loaded.');
  // Persist completed compatibility/automatic transitions, without changing the
  // manual slot or claiming success when browser storage rejects the write.
  if(loaded.save()!==saved)persist();
}
function render() {
  document.body.dataset.theme='surface';
  document.body.dataset.devMode=String(devMode);
  if (title) {
    app.innerHTML = `<main class="opening title-screen"><p class="eyebrow">A town. A Pit. A life of your own.</p><h1>HEARTHVALE</h1><p class="muted">One adventurer. Forty days. A town that carries on.</p><div class="actions">${button('New Game', 'new')}${button('Continue', 'continue')}${button('Load Saved Game', 'load')}</div><p class="helper">Continue opens your latest automatic checkpoint. Load opens your manual save.</p></main>`;
    return;
  }
  const world = game.snapshot().world, s = world.globals.hearthvaleSurface, actor = world.entities[s.playerId];
  const owner=actor?.primaryLocation==='loc_shop'?actor.id:null;
  if(owner!==saleOwner){selectedSale.clear();saleOwner=owner;}
  const sellable=new Set(owner?sellOffers(actor).map(offer=>offer.item):[]);
  selectedSale=new Set([...selectedSale].filter(item=>sellable.has(item)));
  if(world.globals.hearthvaleCompletion?.completed){app.innerHTML=completionView(world);return;}
  const transition=world.globals.hearthvaleDeathTransition;
  if(transition?.status==='choosing-successor'){
    app.innerHTML=`<main>${candidateCards(transition.candidates,true,(actor.data.generation??1)+1)}<div class="actions">${button('Save','save')}${button('Load','load')}${button('Return to Title','return-to-title')}</div></main>`;
    return;
  }
  if(actor?.data.death){
    app.innerHTML=`<main class="death-takeover">${deathView(actor,world.globals.hearthvaleDeathTransition,world)}</main>`;
    return;
  }
  const normal = s.stage === 'surface';
  const pit = world.entities.hv_pit_1, expedition = pit.data.expedition;
  document.body.dataset.theme=expedition?.active?'pit':'surface';
  let content;
  if (panel === 'confirm-action') content=`<h1>Confirm action</h1><p>${e(pendingAction.label)}</p><p>${e(pendingAction.warning)}</p><div class="actions">${button('Confirm','confirm-action')}${button('Cancel','cancel-action')}</div>`;
  else if (panel === 'character') content = character(actor,characterTab,world) + (characterTab==='history'?'<h2>Life archive</h2>'+archivedLives(world):'') + button('Close', 'close');
  else if (panel === 'inventory') content = inventory(actor,inventoryTab) + (expedition?.active?'<p>Tomes are learned, not equipped. Between combats, close Inventory, open the expedition Bag tab, and choose Learn for the Tome. Combat swaps spend the Attack phase.</p>':inventoryTab==='bag'?inventoryControls(actor,game.serviceChoices()):'') + button('Close', 'close');
  else if (panel === 'menu') content = `<h1>Menu</h1><div class="actions">${['Journal','Save','Load','Settings','Help','Return to Title','Close'].map(label => button(label, label.toLowerCase().replaceAll(' ', '-'))).join('')}</div>`;
  else if (panel === 'journal') content = '<h1>Journal</h1>'+weeklySnapshots(world,actor)+recordCards(world,actor)+archivedLives(world) + button('Back to Menu', 'menu');
  else if (panel === 'settings') content = '<h1>Settings</h1><p>Text size can also be changed using browser zoom. Reduced motion follows your device preference.</p>' + tabButton('Larger text', 'text-size', '', document.documentElement.classList.contains('large-text')) + tabButton('Dev Mode', 'dev-mode', '', devMode) + button('Back to Menu', 'menu');
  else if (panel === 'help') content = '<h1>Help</h1><p>Explore the five Surface destinations. Moving and inspecting cost no AP. Sleep at the Inn to end the Day, heal HP, and reset AP. Sleep does not restore Sanity.</p><p>Continue restores your latest autosave. Save and Load use a separate manual slot in this browser. Closing a panel never undoes an action.</p>' + button('Back to Menu', 'menu');
  else if (panel === 'sleep') content = `<h1>End Day ${e(s.calendar.day)}?</h1><p>Sleeping ends this Day and advances the world, allowing other people to act. It restores HP and resets AP. Sanity stays the same.</p><div class="actions">${button('Confirm sleep', 'sleep', s.calendar.day)}${button('Cancel', 'close')}</div>`;
  else if (s.stage === 'history') content = `<p class="eyebrow">Before your arrival</p><h1>${e(openingCards[s.openingCard])}</h1>${button('Continue', 'opening-next')}`;
  else if (s.stage === 'candidates') content = candidateCards(s.candidates);
  else if (s.stage === 'arrival') content = `<h1>${e(actor.data.identity.name)} — Year 1, Day 1</h1>${button('Enter the Inn', 'arrive')}`;
  else if (s.stage === 'mira') content = `<h1>The Inn</h1><p>${e(actor.data.identity.name)} — Year ${s.calendar.year}, Day ${s.calendar.day}</p>` + paragraphs(miraOpening) + `<div class="actions">${miraResponses.map(r => button(r.label, 'answer', r.id)).join('')}</div>`;
  else if (s.stage === 'mira-reply') content = '<h1>Mira</h1>' + paragraphs([`Mira: “${miraResponses.find(r => r.id === s.miraResponse).reply}”`, ...miraClosing]) + button('Continue', 'finish-mira');
  else if (pit.data.pendingFinalHeart || pit.data.pendingDeath || actor.data.attributes.resources.hearts<=0
    ||actor.data.attributes.resources.sanity<=0) content = '<h1>At the edge</h1>' + resultView(pit.data.lastResult, devMode) + (devMode ? button('Resolve survival outcome','adjudicate-death') : '<p>Survival recovery could not complete. Open Settings and enable Dev Mode to retry.</p>');
  else if (expedition?.active) content = expeditionView(world, actor, game.expeditionChoices(), expeditionTab, swapSlot, devMode);
  else if (actor.primaryLocation === 'loc_pit_entrance') content = pitEntrance(world, actor, game.expeditionChoices(), devMode);
  else content = (actor.data.generation>1&&actor.primaryLocation==='loc_inn'?`<p class="eyebrow">${e(actor.data.identity.name)} · Generation ${e(actor.data.generation)}</p><p>You now follow ${e(actor.data.identity.name)}. HearthVale's story continues.</p>`:'')+surfaceLocation(world, actor,serviceView(world,actor,game.serviceChoices(),selectedSale));
  const viewingLearnedMagic=normal && (panel==='inventory' && inventoryTab==='spells'
    || !panel && expedition?.active && expeditionTab==='spells');
  if(viewingLearnedMagic)content=content.replace('</h1>',`</h1>${magicIntroduction(actor,s.magicIntroductionSeen)}`);
  app.innerHTML = `${normal ? hud(actor, s.calendar) : ''}${expedition?.active ? expeditionHud(actor, expedition) : ''}<main class="${normal || s.stage === 'candidates' ? '' : 'opening'}">${normal&&!panel&&!expedition?.active?worldUpdates(world,actor):''}${content}</main>${normal ? `<nav class="utilities" aria-label="Utilities">${button('Character', 'character')}${button('Inventory', 'inventory')}${button('Menu', 'menu')}</nav>` : ''}`;
}

app.addEventListener('click', event => {
  const target = event.target.closest('button[data-command]');
  if (!target) return;
  let command = target.dataset.command, value = target.dataset.value;
  const selling=['sell-select','sell-selected'].includes(command);
  const shopSections=[...app.querySelectorAll('[data-shop-section]')].map(node=>({name:node.dataset.shopSection,open:node.open}));
  const shopScroll={main:app.querySelector('main')?.scrollTop??0,x:window.scrollX,y:window.scrollY};
  const previousPanel=panel;
  message('');
  try {
    const beforeProgress=progressionCheckpoint(game?.snapshot().world);
    let changed = false;
    if(command==='confirm-action') { ({command,value}=pendingAction);panel=pendingAction.panel;pendingAction=null; }
    else if(command==='cancel-action') { panel=pendingAction.panel;pendingAction=null;command='cancelled'; }
    else if(['service','expedition'].includes(command)) {
      const action=JSON.parse(value),op=action.op??action.type;
      const warnings={'pit.retreat':'This abandons current Floor progress and regenerates its start. Spent resources remain spent.',discard:'This permanently removes the listed Bag contents.',sell:'This sells the listed item from your inventory.',learn:'This consumes the Tome and may replace the named spell.', 'pit.learn':'This consumes the Tome and may replace the named spell.'};
      if(warnings[op]){pendingAction={command,value,panel,label:target.textContent,warning:warnings[op]};panel='confirm-action';command='prompted';}
    }
    if(['cancelled','prompted'].includes(command)) {}
    else if (command === 'new') { game = createSurfaceGame({ seed: freshGameSeed() }); title = false; panel = null; selectedSale.clear();saleOwner=null; changed = true; }
    else if (command === 'continue') load(autoKey);
    else if (command === 'load') load(manualKey);
    else if (command === 'save') persist(manualKey,true);
    else if (command === 'magic-introduction-seen') { game.acknowledgeMagicIntroduction(); persist(); }
    else if (command === 'return-to-title') { title = true; panel = null; }
    else if (command === 'close') panel = null;
    else if (['character','inventory','menu','journal','settings','help'].includes(command)) panel = command;
    else if (command === 'sleep-prompt') panel = 'sleep';
    else if (command === 'text-size') document.documentElement.classList.toggle('large-text');
    else if (command === 'dev-mode') devMode = !devMode;
    else if (command === 'pit-tab') expeditionTab = value;
    else if (command === 'inventory-tab') inventoryTab=value;
    else if (command === 'character-tab') characterTab=value;
    else if (command === 'swap-slot') swapSlot = Number(value);
    else if (command === 'sell-select') {
      if(!sellOffers(game.snapshot().world.entities[saleOwner]).some(offer=>offer.item===value))throw new Error('Item is no longer sellable');
      if(selectedSale.has(value))selectedSale.delete(value);else selectedSale.add(value);
    }
    else if (command === 'sell-selected') {
      if(!selectedSale.size)return;
      game.perform('service.act',{op:'sell-bulk',items:[...selectedSale]});
      selectedSale.clear();changed=true;
    }
    else {
      if (command === 'service') game.perform('service.act',JSON.parse(value));
      else if (command === 'expedition') { const intention = JSON.parse(value); game.perform(intention.type, intention.params); }
      else if (command === 'opening-next') game.openingNext();
      else if (command === 'choose') game.choose(value);
      else if (command === 'begin-succession') { game.beginSuccession(); panel=null; }
      else if (command === 'choose-successor') { game.chooseSuccessor(value); panel=null; pendingAction=null;characterTab='stats';inventoryTab='equipment';expeditionTab='weapons';swapSlot=0; }
      else if (command === 'arrive') game.perform('surface.arrive');
      else if (command === 'answer') game.perform('surface.answer-mira', { response: value });
      else if (command === 'finish-mira') game.perform('surface.finish-mira');
      else if (command === 'adjudicate-death') game.adjudicateDeath();
      else if (command === 'move') game.perform('Move', { location: value });
      else if (command === 'sleep') { game.perform('surface.sleep', { day: Number(value), confirmed: true }); panel = null; }
      else throw new Error('Unknown interface command');
      changed = true;
    }
    if (changed) {
      advanceArrival(game,devMode);
      persist(autoKey,importantProgress(beforeProgress,progressionCheckpoint(game.snapshot().world),{command,value}));
    }
    render();
    if(selling)for(const section of app.querySelectorAll('[data-shop-section]'))section.open=shopSections.find(saved=>saved.name===section.dataset.shopSection)?.open??section.open;
    const keepControl=['save','text-size','dev-mode','pit-tab','inventory-tab','character-tab','swap-slot'].includes(command);
    const restore=command==='close'&&['character','inventory','menu'].includes(previousPanel)?previousPanel:null;
    const control=(keepControl||restore)&&[...app.querySelectorAll('button[data-command]')].find(b=>b.dataset.command===(restore??command)&&(restore||b.dataset.value===value));
    // A selected slot lives inside a disclosure recreated by render(). Keep its
    // ancestors open so the retained focus never targets an invisible control.
    if(control)for(let parent=control.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    const saleControl=selling&&([...app.querySelectorAll('button[data-command]')].find(b=>!b.disabled&&b.dataset.command===command&&(command==='sell-selected'||b.dataset.value===value))||app.querySelector('[data-shop-section="Sell"] summary'));
    const focusTarget=saleControl||control||app.querySelector('h1');
    if (focusTarget) { if(!control&&!saleControl)focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:!!control||selling}); }
    if(selling){app.querySelector('main').scrollTop=shopScroll.main;window.scrollTo(shopScroll.x,shopScroll.y);}
    else if(!control)window.scrollTo(0, 0);
  } catch (error) { message(error.message); }
});
render();
