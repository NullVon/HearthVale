import { writeFile } from 'node:fs/promises';
import { integratedFixture,sparseFixture } from './helpers/m4-fixture.js';
const fixtures={'M4 integrated Day 1':integratedFixture().save(),'M4 sparse Day 5':sparseFixture().save()};
await writeFile(new URL('./browser/m4-fixtures.js',import.meta.url),`// Test-only Core effect snapshots.\nexport const fixtures=${JSON.stringify(fixtures)};\n`);
console.log('Wrote two M4 browser fixtures using existing Core helpers.');
