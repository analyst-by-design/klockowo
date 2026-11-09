// Składa całą grę w jeden plik: dist/klockowo.html (three.js + moduły gry + interfejs).
// Użycie: node scripts/build.mjs [--three]   (--three wymusza ponowne zbudowanie three.js)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = p => join(root, p);

// Kolejność ma znaczenie: pliki są sklejane w jeden skrypt i dzielą zasięg (top-level const).
export const SOURCES = ['src/world3d.js', 'src/inf.js', 'src/prefabs.js', 'src/build3.js', 'src/tools.js', 'src/missions.js'];

// 1) three.js jako IIFE z globalną zmienną THREE (budowane raz z node_modules, potem z cache w build/)
const threeOut = r('build/three.iife.js');
if (!existsSync(threeOut) || process.argv.includes('--three')) {
  let esbuild;
  try { esbuild = await import('esbuild'); } catch { console.error('Brak esbuild. Uruchom najpierw: npm install'); process.exit(1); }
  await esbuild.build({ entryPoints: [r('src/three-entry.js')], bundle: true, format: 'iife', globalName: 'THREE', minify: true, legalComments: 'inline', outfile: threeOut, logLevel: 'warning' });
  console.log('three.js →', threeOut);
}

// 2) wstawienie modułów gry w znacznik /*@@WORLD3D@@*/ i three.js przed głównym skryptem
const html = readFileSync(r('src/game.html'), 'utf8');
const world = SOURCES.map(f => readFileSync(r(f), 'utf8')).join('\n');
const three = readFileSync(threeOut, 'utf8').replace(/<\/script/gi, '<\\/script');
if (!html.includes('/*@@WORLD3D@@*/')) throw new Error('src/game.html: brak znacznika /*@@WORLD3D@@*/');
const marker = '<script>\n(() => {';
if (!html.includes(marker)) throw new Error('src/game.html: brak głównego skryptu "<script>\\n(() => {"');

let out = html.replace('/*@@WORLD3D@@*/', () => world);
out = out.replace(marker, () => '<script>/* three.js r187 (MIT, zob. THIRD_PARTY_NOTICES.md) */\n' + three + '</script>\n' + marker);

mkdirSync(r('dist'), { recursive: true });
writeFileSync(r('dist/klockowo.html'), out);

// 3) kontrola składni głównego skryptu (gra + moduły), żeby literówka nie wyszła dopiero w przeglądarce
const main = out.slice(out.lastIndexOf(marker) + '<script>'.length, out.lastIndexOf('</script>'));
writeFileSync(r('dist/main-check.js'), main);
const chk = spawnSync(process.execPath, ['--check', r('dist/main-check.js')], { encoding: 'utf8' });
if (chk.status !== 0) { console.error(chk.stderr); console.error('BŁĄD SKŁADNI — numer linii dotyczy dist/main-check.js'); process.exit(1); }

console.log('OK dist/klockowo.html', (out.length / 1024).toFixed(0) + ' KB');
