// Prosty serwer do grania i testów na tablecie/telefonie w tej samej sieci Wi-Fi.
// Użycie: npm run serve  (albo: node scripts/serve.mjs 8080)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'klockowo.html');
const port = +(process.argv[2] || process.env.PORT || 8080);
if (!existsSync(file)) { console.error('Brak dist/klockowo.html. Najpierw: npm run build'); process.exit(1); }

createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (path === '/' || path === '/index.html' || path === '/klockowo.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file)); // czytane przy każdym żądaniu: po npm run build wystarczy odświeżyć stronę
  } else { res.writeHead(404); res.end(); }
}).listen(port, '0.0.0.0', () => {
  console.log(`Klockowo: http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces())) for (const a of list || [])
    if (a.family === 'IPv4' && !a.internal) console.log(`  w sieci domowej: http://${a.address}:${port}`);
});
