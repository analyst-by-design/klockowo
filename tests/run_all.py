"""Uruchamia testy Klockowa i zbiera wynik.

  python tests/run_all.py              wszystkie testy (kilkanaście minut: grafika jest liczona programowo)
  python tests/run_all.py menu touch   tylko wybrane (nazwa bez przedrostka test_)
  python tests/run_all.py --no-build   bez wcześniejszego npm run build

Testy wypisują wyniki pomiarów i zapisują zrzuty ekranu w tests/shots/.
Test nie przechodzi, gdy kończy się wyjątkiem albo gdy w przeglądarce pojawił się błąd JavaScript.
Wartości liczbowe (np. ile klocków postawiono) trzeba przeczytać w wypisanym wyniku.
"""
import os, re, subprocess, sys, time, pathlib

TESTS = pathlib.Path(__file__).resolve().parent
ROOT = TESTS.parent
ORDER = ['smoke', 'menu', 'prefabs', 'terrain', 'plates', 'blueprint', 'missions', 'touch', 'camera', 'scroll']
ERR = re.compile(r"(?:errors?:\s*\[\s*['\"])|pageerror|Traceback|TimeoutError")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    names = args or ORDER
    if '--no-build' not in sys.argv:
        b = subprocess.run(['node', str(ROOT / 'scripts' / 'build.mjs')], cwd=ROOT)
        if b.returncode: sys.exit('Build nie przeszedł.')
    failed = []
    for n in names:
        f = TESTS / f'test_{n}.py'
        if not f.exists(): print(f'?? brak {f.name}'); failed.append(n); continue
        t0 = time.time()
        try:
            r = subprocess.run([sys.executable, str(f)], cwd=TESTS, capture_output=True, text=True, timeout=1500)
            out = r.stdout + r.stderr; code = r.returncode
        except subprocess.TimeoutExpired:
            out, code = 'TIMEOUT', 1
        bad = code != 0 or bool(ERR.search(out))
        print(f"{'FAIL' if bad else 'ok  '} {n:10} {time.time() - t0:5.0f} s")
        if bad or os.environ.get('VERBOSE'): print('   ' + out.strip().replace('\n', '\n   ')[-3000:])
        if bad: failed.append(n)
    print('\nWszystko przeszło.' if not failed else f"\nNie przeszły: {', '.join(failed)}")
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()
