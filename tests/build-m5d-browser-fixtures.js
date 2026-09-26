import { writeFile } from 'node:fs/promises';
import { persistenceFixture,sanityDeath,succeed,world,use,sleep } from './helpers/m5d-fixture.js';
let g=sanityDeath(persistenceFixture());
const fixtures={'Generation 1 archive — before handoff':g.save()};
succeed(g);sleep(g);g.perform('Move',{location:'loc_pit_entrance'});use(g,'pit.enter');g=sanityDeath(g);
fixtures['Generation 2 archive — before second handoff']=g.save();
await writeFile(new URL('./browser/m5d-fixtures.js',import.meta.url),`// Explicit Core prerequisites and production resolution/succession.\nexport const fixtures=${JSON.stringify(fixtures)};\n`);
console.log(`Wrote ${Object.keys(fixtures).length} M5D fixtures; Year ${world(g).globals.hearthvaleSurface.calendar.year}, Day ${world(g).globals.hearthvaleSurface.calendar.day}.`);
