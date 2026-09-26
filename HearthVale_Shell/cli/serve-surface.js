import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Development-only, loopback static host; no dependencies or build step.
const root = new URL('../../../', import.meta.url);
const allowed = ['/HearthVale/HearthVale_UI/', '/HearthVale/HearthVale_Content/',
  '/HearthVale/HearthVale_Story/', '/HearthVale/HearthVale_Shell/src/', '/LWE-Core/src/', '/LWE-Core/packages/dice/'];
if(process.argv.includes('--fixtures')) allowed.push('/HearthVale/tests/browser/');
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
const port = Number(process.env.PORT ?? 4173);
http.createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/') { response.writeHead(302, { Location: '/HearthVale/HearthVale_UI/index.html' }); response.end(); return; }
    if (path.includes('\\') || path.split('/').includes('..') || !allowed.some(prefix => path.startsWith(prefix))) throw new Error('Unavailable');
    const extension = path.split('.').at(-1);
    if (!mime[extension]) throw new Error('Unavailable');
    const bytes = await readFile(fileURLToPath(new URL(`.${path}`, root)));
    response.writeHead(200, { 'Content-Type': `${mime[extension]}; charset=utf-8`, 'Cache-Control': 'no-store' }); response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`HearthVale Surface: http://127.0.0.1:${port}`));
