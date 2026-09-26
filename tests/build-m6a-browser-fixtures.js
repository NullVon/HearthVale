import { writeFile } from 'node:fs/promises';
import { bruteFixture,chapterFixture,death40Fixture } from './helpers/m6-fixture.js';
const fixtures={
  'Before player Ruin Brute first-clear':bruteFixture().save(),
  'Day 40 before sleep':chapterFixture().save(),
  'Day 40 before terminal Poison death':death40Fixture().save(),
};
await writeFile(new URL('./browser/m6a-fixtures.js',import.meta.url),`export const fixtures=${JSON.stringify(fixtures)};\n`);
console.log('Wrote M6A controlled prerequisites; completion uses normal production controls.');
