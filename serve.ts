import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT || 5197);
createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent((req.url || '/').split('?')[0] === '/' ? '/index.html' : (req.url || '/').split('?')[0]));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); }
  catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`STARFORGE RAILGUNNER http://127.0.0.1:${port}`));
