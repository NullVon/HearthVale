import { writeFile } from 'node:fs/promises';
import { richLifeFixture } from './helpers/m5-fixture.js';
const fixtures={'Living Generation 1 — resolve the poisoned room':richLifeFixture().save()};
await writeFile(new URL('./browser/m5e-fixtures.js',import.meta.url),`export const fixtures=${JSON.stringify(fixtures)};\n`);
console.log('Wrote living M5E checkpoint; all death and succession steps remain normal UI actions.');
