import { createRuntime } from '../../HearthVale_Shell/src/core.js';
import { createSurfaceGame, createSurfaceShell } from '../../HearthVale_Shell/src/surface.js';
import { startCombat } from '../../HearthVale_Shell/src/expedition-combat.js';
import { byId } from '../../HearthVale_Content/expedition.js';

export const world = game => game.snapshot().world;
export const player = game => world(game).entities[world(game).globals.hearthvaleSurface.playerId];
export const pit = game => world(game).entities.hv_pit_1.data;
export const expedition = game => pit(game).expedition;
const saves = new Map();
export function entered(seed = 17) {
  if (!saves.has(seed)) {
    const game = createSurfaceGame({ seed });
    for (let i = 0; i < 5; i++) game.openingNext();
    game.choose(world(game).globals.hearthvaleSurface.candidates[0].id);
    game.perform('surface.arrive'); game.perform('surface.answer-mira', { response: 'looking' }); game.perform('surface.finish-mira');
    game.perform('Move', { location: 'loc_pit_entrance' }); game.perform('pit.enter');
    saves.set(seed, game.save());
  }
  return createSurfaceGame({ saved: saves.get(seed) });
}

// All fixture changes pass through Core effects. No production setup command,
// save rewriting or alternative game RNG is exposed to the browser.
export function setup(game, mutate) {
  const shell = createSurfaceShell();
  const runtime = createRuntime({ saved: game.save(), shell: { ...shell, actions: { ...shell.actions,
    'fixture.m2': { resolve: ({ world, attempt }, { rng }) => {
      const actor = structuredClone(world.entities[attempt.actor]), data = structuredClone(world.entities.hv_pit_1.data);
      const ctx = { actor, pit: data, pitId: 'hv_pit_1', expedition: data.expedition, day: world.globals.hearthvaleSurface.calendar.day };
      mutate(ctx, rng);
      return { effects: [
        ...Object.entries(actor.data).map(([key,value]) => ({ type: 'data', entity: actor.id, key, value })),
        ...Object.entries(data).map(([key,value]) => ({ type: 'data', entity: 'hv_pit_1', key, value })),
        { type: 'move', entity: actor.id, location: actor.primaryLocation },
      ] };
    } },
  } } });
  runtime.startScene(); runtime.submit({ actor: player(game).id, type: 'fixture.m2' }); runtime.resolveScene({ offscreenBudget: 0 });
  return createSurfaceGame({ saved: runtime.save() });
}

export function roomFixture(ctx, family = 'combat', encounter = 'enemy_slime') {
  ctx.expedition.floor = { number: 1, attempt: 1, prefixTail: [], rooms: [
    { id: 'fixture_room_1', templateId: 'fixture_m2_room', family, encounter, title: 'M2 acceptance encounter', resolved: false },
    { id: 'fixture_room_2', templateId: 'fixture_empty', family: 'empty', encounter: 'fixture_empty', title: 'Empty', resolved: false },
    { id: 'fixture_room_3', templateId: 'fixture_resource', family: 'resource', encounter: 'fixture_resource', title: 'Resource', resolved: false },
  ] };
  ctx.expedition.roomIndex = 0; ctx.expedition.combat = null;
}
export function combatFixture(game = entered(), mutate = () => {}) {
  return setup(game, (ctx, rng) => {
    roomFixture(ctx);
    ctx.actor.data.attributes.traits = ['trait_charming', 'trait_curious'];
    ctx.actor.data.attributes.baseStats = { STR: 3, DEX: 2, CON: 3, INT: 2, WIS: 2, CHA: 1 };
    ctx.actor.data.attributes.resources.hp = 16;
    ctx.actor.data.inventory.equipped = [item(ctx.actor, 'item_sword'), item(ctx.actor, 'item_bow'), item(ctx.actor, 'item_hammer'), item(ctx.actor, 'item_shield')];
    startCombat(ctx, 'enemy_slime', 'room', rng);
    ctx.expedition.combat.committed = { ...structuredClone(byId('moves', 'move_slime_bash')), offensive: true, damageType: 'physical' };
    mutate(ctx);
  });
}
export function item(actor, templateId, quantity = 1) {
  const definition = byId('items', templateId);
  return { id: `${actor.id}_item_${actor.data.inventory.nextItemInstance++}`, templateId, quantity,
    ...(definition.maxDurability ? { durability: definition.maxDurability } : {}) };
}
export function context(game = combatFixture()) {
  const actor = structuredClone(player(game)), data = structuredClone(pit(game));
  return { actor, pit: data, pitId: 'hv_pit_1', expedition: data.expedition, day: 1 };
}
export function dice(...values) {
  let index = 0;
  return { next: () => values[index++] ?? values.at(-1) ?? 0 };
}
export function use(game, type, predicate = () => true) {
  const option = game.expeditionChoices().find(choice => choice.type === type && predicate(choice));
  if (!option) throw new Error(`Missing legal option ${type}`);
  game.perform(option.type, option.params);
}
