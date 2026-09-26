import { writeFile } from 'node:fs/promises';
import { richLifeFixture,finalHeartFixture } from './helpers/m5-fixture.js';
import { entered,world } from './helpers/m2-fixture.js';
import { configure } from './helpers/m3-fixture.js';
const sanity=configure(entered(),w=>{w.entities[w.globals.hearthvaleSurface.playerId].data.attributes.resources.sanity=0;});
const fixtures={'Before Heart death — major history':richLifeFixture().save(),
  'Before Heart death — sparse life':finalHeartFixture().save(),'Sanity death':sanity.save()};
await writeFile(new URL('./browser/m5-fixtures.js',import.meta.url),`// Test-only Core snapshots.\nexport const fixtures=${JSON.stringify(fixtures)};\n`);
console.log(`Wrote ${Object.keys(fixtures).length} M5B browser fixtures.`);
