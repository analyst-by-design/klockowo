// npm test → uruchamia tests/run_all.py tym Pythonem, który jest w systemie (python3, python albo py).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const runner = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'run_all.py');
for (const py of ['python3', 'python', 'py']) {
  if (spawnSync(py, ['--version']).status !== 0) continue;
  const r = spawnSync(py, [runner, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
console.error('Nie znaleziono Pythona. Zainstaluj Python 3, potem: pip install playwright && python -m playwright install chromium');
process.exit(1);
