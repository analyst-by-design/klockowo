"""Płytki: kolejne warstwy nie wiszą w powietrzu (płytka na płytce, dach z płytek na murze, podłogi przeciągane)."""
import asyncio
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT

# Stawia warstwy w jednym słupku (kliknięciem albo przeciągnięciem podłogi 4×4) i zwraca fizyczne [dół, góra] każdej kratki.
RUN = '''([layers, x0, drag]) => {
  const K = window.__klockowo, B = K.Build3, w = B.world, LOWB = 1 << 11, z0 = -10;
  const solid = y => { const t = w.get(x0, y, z0); return t && K.BL[t].kind === 'mat'; };
  let g = 60; while (g > 0 && !solid(g)) g--;
  for (const [item, piece] of layers) {
    let y = g + 12; while (y > g && !solid(y)) y--;
    B.selectItem(item); B.piece = piece; B.rotOff = 0;
    B.hit = { x: x0, y, z: z0, n: [0, 1, 0] }; B.pl = B.placement(B.hit);
    if (!B.pl) return 'brak miejsca: ' + item;
    if (!drag) { B.place(B.pl); continue; }
    const rs = B.rectStart(); if (!rs) return 'brak przeciągania: ' + item;
    rs.end = [x0 + 3, rs.anchor[1], z0 + 3]; B.rectBuild(rs); B.rectApply(rs);
  }
  const col = [];
  for (let y = g + 1; y < g + 10; y++) { const t = w.get(x0, y, z0); if (!solid(y)) continue; const m = w.meta(x0, y, z0), sh = (m >> 2) & 7, lo = y - (m & LOWB ? .5 : 0); col.push([lo, lo + (sh === 1 || sh === 6 ? .5 : 1)]); }
  return { g, col };
}'''
CASES = [
    ('płytka ×3 + kostka', [['planks', 'plytka']] * 3 + [['planks', 'kostka']], 5),
    ('podłoga, mur, dach z płytek, mur', [['planks', 'plytka'], ['stone', 'kostka'], ['stone', 'kostka'], ['planks', 'plytka'], ['stone', 'kostka']], 13),
    ('różne materiały', [['planks', 'plytka'], ['darkwood', 'plytka'], ['planks', 'plytka'], ['brick', 'cegielka']], 21),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(**LAUNCH); pg = await (await b.new_context(viewport={'width': 900, 'height': 600})).new_page()
        errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1500); await pg.evaluate(INIT)
        bad = 0
        for drag in (False, True):
            for name, layers, x0 in CASES:
                r = await pg.evaluate(RUN, [layers, x0 + (40 if drag else 0), drag])
                if isinstance(r, str): print('BŁĄD', name, r); bad += 1; continue
                col, g = r['col'], r['g']
                gaps = [round(col[i + 1][0] - col[i][1], 2) for i in range(len(col) - 1)]
                ok = col and col[0][0] == g + 1 and all(abs(x) < 1e-6 for x in gaps)
                print('ok ' if ok else 'BŁĄD', 'przeciąganie' if drag else 'klik', name, col, 'szpary', gaps)
                bad += not ok
        # cofanie zdejmuje sklejone płytki z powrotem do jednej płytki
        u = await pg.evaluate('''() => { const B = window.__klockowo.Build3; let n = 0; while (B.undo.length && n < 200) { B.doUndo(); n++; } return n; }''')
        print('cofnięto', u, 'błędy JS', errors)
        await b.close()
        if bad or errors: raise SystemExit(f'płytki: {bad} błędów')
asyncio.run(main())
