"""Wspólne ustawienia testów Klockowa (Playwright, Python).

Testy otwierają zbudowany plik dist/klockowo.html w Chromium bez okna.
Grafika liczona jest programowo (SwiftShader), więc jedna klatka trwa około sekundy:
testy wstrzymują rysowanie (Engine.render = () => {}) i same wołają Build3.update().
Wnętrze gry jest dostępne w przeglądarce jako window.__klockowo.

Zmienne środowiskowe:
  CHROME_PATH   ścieżka do własnej przeglądarki Chrome/Chromium (domyślnie Chromium z Playwright)
  KLOCKOWO_GPU  ustaw na 1, żeby nie wymuszać SwiftShadera (szybciej na komputerze z kartą graficzną)
"""
import os, sys, pathlib

TESTS = pathlib.Path(__file__).resolve().parent
ROOT = TESTS.parent
DIST = ROOT / 'dist' / 'klockowo.html'
URL = DIST.as_uri()
SHOTS = TESTS / 'shots'
SHOTS.mkdir(exist_ok=True)
os.chdir(TESTS)  # zrzuty ekranu lądują w tests/shots/

if not DIST.exists():
    sys.exit('Brak dist/klockowo.html. Najpierw: npm run build')

_args = [] if os.environ.get('KLOCKOWO_GPU') == '1' else ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
if sys.platform.startswith('linux'):
    _args.append('--no-sandbox')
LAUNCH = {'args': _args}
if os.environ.get('CHROME_PATH'):
    LAUNCH['executable_path'] = os.environ['CHROME_PATH']

# Nowy świat "łąka" (ziarno 4242) w slocie 1, samouczek pominięty, wszystkie nagrody odblokowane.
INIT = '''async () => { const K = window.__klockowo, B = K.Build3; localStorage.setItem('klockowo.tut4', 'true'); K.settings.unlockAll = true;
  localStorage.setItem('klockowo.w4_1', JSON.stringify({ v: 4, P: { seed: 4242, kind: 'meadow', sx: 0, sz: 0 } })); await K.IDB.delPrefix('1|'); B.open(1);
  for (let i = 0; i < 50 && !B.world; i++) await new Promise(r => setTimeout(r, 100)); let n = 0; while (!B.ready && n < 500) { B.update(1/60, 1); n++; }
  B.setMode('build'); K.Cam.yaw = 0; K.Cam.cy = 0; for (let i = 0; i < 30; i++) B.update(1/60, 1); return B.ready; }'''

# To samo dla testów dotykowych (bez odblokowywania nagród).
INIT_TOUCH = '''async () => { const K = window.__klockowo, B = K.Build3; localStorage.setItem('klockowo.tut4', 'true');
  localStorage.setItem('klockowo.w4_1', JSON.stringify({ v: 4, P: { seed: 4242, kind: 'meadow', sx: 0, sz: 0 } })); await K.IDB.delPrefix('1|'); B.open(1);
  for (let i = 0; i < 50 && !B.world; i++) await new Promise(r => setTimeout(r, 100)); let n = 0; while (!B.ready && n < 500) { B.update(1/60, 1); n++; } return B.ready; }'''
