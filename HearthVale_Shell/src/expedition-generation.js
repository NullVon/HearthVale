import { familyWeights, roomPool } from '../../HearthVale_Content/expedition.js';
import { selectWeighted } from './core.js';
import { enemyWeights } from '../../HearthVale_Content/encounters.js';

export function weighted(entries, rng) {
  const selected = selectWeighted(entries, () => rng.next());
  if (!selected) throw new Error('No eligible weighted choice');
  return selected;
}
export const pick = (values, rng) => values[Math.floor(rng.next() * values.length)];

export function generateFloor(number, attempt, prefixTail, rng, firstRoom = null) {
  if (!Number.isInteger(number) || number < 1 || number > 10) throw new Error('Only Stratum 1 is playable');
  if (number === 10) return { number, attempt, prefixTail: [...prefixTail], rooms: [{
    id: `floor_10_${attempt}_gate`, templateId: 'room_guardian_gate', encounter: 'guardian_gate', family: 'fixed',
    title: 'The Guardian Threshold', resolved: true,
  }] };
  const count = rng.next() < 0.5 ? 3 : 4, rooms = firstRoom ? [{...firstRoom,resolved:false}] : [], tail = [...prefixTail,...(firstRoom?[firstRoom.family]:[])];
  for (let index = rooms.length; index < count; index++) {
    const available = roomPool.filter(room => !rooms.some(r => r.encounter === room.encounter)
      && !(room.family === 'combat' && rooms.filter(r => r.family === 'combat').length >= 2)
      && !(index === count - 1 && room.family === 'discovery' && tail.at(-1) === 'discovery')
      && !(tail.length >= 2 && tail.at(-1) === room.family && tail.at(-2) === room.family));
    const family = weighted(familyWeights.filter(entry => available.some(room => room.family === entry.id)), rng).id;
    const pool=available.filter(room => room.family === family);
    const selectedEnemy = family === 'combat' ? weighted(enemyWeights.filter(entry=>pool.some(room=>room.encounter===entry.target)),rng).target : null;
    const chosen = selectedEnemy ? pool.find(room=>room.encounter===selectedEnemy) : pick(pool, rng);
    rooms.push({ id: `floor_${number}_${attempt}_room_${index + 1}`, templateId: chosen.id,
      encounter: chosen.encounter, title: chosen.title, family, resolved: false });
    tail.push(family);
  }
  return { number, attempt, prefixTail: [...prefixTail], rooms };
}

export const currentRoom = expedition => expedition.floor.rooms[expedition.roomIndex];
export const floorTail = floor => [...floor.prefixTail, ...floor.rooms.map(r => r.family)].slice(-2);
