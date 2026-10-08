import { familyWeights, roomPool, byId } from '../../HearthVale_Content/expedition.js';
import { selectWeighted } from './core.js';
import { enemyWeights } from '../../HearthVale_Content/encounters.js';

export function weighted(entries, rng) {
  const selected = selectWeighted(entries, () => rng.next());
  if (!selected) throw new Error('No eligible weighted choice');
  return selected;
}
export const pick = (values, rng) => values[Math.floor(rng.next() * values.length)];

// Pit-owned remaining order. Only actual generation may initialize/shuffle it.
export function drawRoomFamily(pit, eligible, rng) {
  if (!pit.roomDeck?.length) {
    pit.roomDeck = familyWeights.flatMap(({ id, weight }) => Array(weight).fill(id));
    for (let i = pit.roomDeck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [pit.roomDeck[i], pit.roomDeck[j]] = [pit.roomDeck[j], pit.roomDeck[i]];
    }
  }
  const index = pit.roomDeck.findIndex(family => eligible.includes(family));
  return index < 0 ? null : pit.roomDeck.splice(index, 1)[0];
}

export function validateRoomDeck(pit) {
  if (pit?.roomDeck === undefined) return; // Legacy saves initialize on generation, never load.
  if (!Array.isArray(pit.roomDeck) || pit.roomDeck.some(id => !familyWeights.some(f => f.id === id))
    || familyWeights.some(f => pit.roomDeck.filter(id => id === f.id).length > f.weight))
    throw new Error('Invalid Pit room deck');
}

export function generateFloor(number, attempt, prefixTail, rng, firstRoom = null, pit = {}, sanity = 5) {
  if (!Number.isInteger(number) || number < 1 || number > 10) throw new Error('Only Stratum 1 is playable');
  if (number === 10) return { number, attempt, prefixTail: [...prefixTail], rooms: [{
    id: `floor_10_${attempt}_gate`, templateId: 'room_guardian_gate', encounter: 'guardian_gate', family: 'fixed',
    title: 'The Guardian Threshold', resolved: true,
  }] };
  const count = rng.next() < 0.5 ? 3 : 4, rooms = firstRoom ? [{...firstRoom,resolved:false}] : [];
  for (let index = rooms.length; index < count; index++) {
    // The deck replaces the old cross-floor family-run suppression. Keep
    // actual placement constraints without another hidden pacing mechanism.
    const available = roomPool.filter(room => (room.family !== 'event' || !!byId('events', room.encounter)?.subjective === (sanity === 1 || sanity === 2))
      && !rooms.some(r => r.encounter === room.encounter)
      && !(room.family === 'combat' && rooms.filter(r => r.family === 'combat').length >= 2));
    // If all remaining cards are blocked, preserve them and fill the required
    // floor slot with an unused Empty encounter. Never refill a nonempty deck.
    // With at most four slots and two distinct Empty templates, a blocked
    // family cannot exhaust both fillers before the floor is complete.
    const family = drawRoomFamily(pit, available.map(room => room.family), rng) ?? 'empty';
    const pool=available.filter(room => room.family === family);
    const selectedEnemy = family === 'combat' ? weighted(enemyWeights.filter(entry=>pool.some(room=>room.encounter===entry.target)),rng).target : null;
    const chosen = selectedEnemy ? pool.find(room=>room.encounter===selectedEnemy) : pick(pool, rng);
    rooms.push({ id: `floor_${number}_${attempt}_room_${index + 1}`, templateId: chosen.id,
      encounter: chosen.encounter, title: chosen.title, family, resolved: false });
  }
  return { number, attempt, prefixTail: [...prefixTail], rooms };
}

export const currentRoom = expedition => expedition.floor.rooms[expedition.roomIndex];
export const floorTail = floor => [...floor.prefixTail, ...floor.rooms.map(r => r.family)].slice(-2);
