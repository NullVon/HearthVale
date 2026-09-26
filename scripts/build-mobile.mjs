import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'www');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'HearthVale_UI', 'surface.js')],
  outfile: resolve(out, 'surface.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  logLevel: 'info',
});

await copyFile(resolve(root, 'HearthVale_UI', 'index.html'), resolve(out, 'index.html'));
await copyFile(resolve(root, 'HearthVale_UI', 'surface.css'), resolve(out, 'surface.css'));

console.log('Built HearthVale mobile web assets in www/.');
