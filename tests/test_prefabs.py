"""Kształty klocków (płytki, schodki, słupki, łuki, obniżenie), dachy i gotowe budowle (Gotowe)."""
import asyncio, os
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
async def main():
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await b.new_page(viewport={'width': 1366, 'height': 768})
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        print('ready', await pg.evaluate(INIT))
        # every group and every Buduj tab renders its tiles
        r = await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, out = {}, n = () => document.querySelectorAll('#b3-items .ptile').length;
          for (let i = 0; i < 4; i++) { B.setGroup('build', true); B.cat = i; B.renderHud(); out['cat' + i] = n(); }
          for (const g of ['nature', 'animals', 'paint']) { B.setGroup(g, true); out[g] = n(); }
          B.setGroup('build', true); B.selectItem('brick'); return out; }''')
        print('tiles per group:', r)
        # pieces row for brick
        r = await pg.evaluate('''() => { const B = window.__klockowo.Build3; B.selectItem('brick'); return [...document.querySelectorAll('#b3-shapes .shape-btn')].map(b => b.textContent); }''')
        print('shapes:', r)
        await pg.screenshot(path='shots/m00_shapes.png')
        r = await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world, out = {};
          const ground = (x, z) => { for (let y = 63; y > 0; y--) { const t = w.get(x, y - 1, z); if (t && K.BL[t].kind !== 'model') return y; } };
          const put = (item, pk, x, z, rot = 0) => { B.selectItem(item); if (pk) B.piece = pk; B.rotOff = (rot - B.autoOri() + 8) % 4; const y = ground(x, z); B.hit = { x, y: y - 1, z, n: [0, 1, 0] }; const pl = B.placement(B.hit); if (!pl) return 'null'; if (pl.blocked) return 'blocked'; if (pl.prefab) B.placePrefab(pl); else B.place(pl); return 'ok'; };
          // gallery of new items in a row
          const items = ['table', 'chair', 'bed', 'pot', 'barrel', 'chest', 'mailbox', 'well', 'slide', 'swing', 'carrots', 'wheat'];
          out.models = items.map((k, i) => put(k, null, -10 + i * 2, 8));
          out.mats = ['darkwood', 'sandstone', 'marble', 'glassB', 'green', 'orange', 'purple', 'gold'].map((k, i) => put(k, 'kostka', -10 + i * 2, 12));
          out.pieces = ['schodki', 'slupek', 'luk'].map((pk, i) => put('stoneB', pk, -10 + i * 2, 15));
          out.roofs = ['thatch', 'roofGreen'].map((k, i) => put(k, 'skos', 6 + i * 3, 15));
          out.prefabs = { playground: put('!playground', null, 26, -10), farm: put('!farm', null, -26, -14), stall: put('!stall', null, 8, 26), castle: put('!castle', null, -6, -40) };
          // arch over two columns
          const y0 = ground(14, 12);
          for (let y = y0; y < y0 + 4; y++) { w.set(14, y, 12, K.BK.stoneB, 4 << 2); w.set(17, y, 12, K.BK.stoneB, 4 << 2); }
          w.set(15, y0 + 4, 12, K.BK.stoneB, (7 << 2) | 3); w.set(16, y0 + 4, 12, K.BK.stoneB, (7 << 2) | 1);
          w.set(14, y0 + 4, 12, K.BK.stoneB, 5 << 2); w.set(17, y0 + 4, 12, K.BK.stoneB, 5 << 2);
          B.bfocus.set(-2, 20, 12); K.Cam.yaw = 0.25; K.Cam.pitch = .55; K.Cam.dist = 30; K.Cam.snap(B.bfocus);
          for (let i = 0; i < 150; i++) B.update(1/60, i / 60);
          return out; }''')
        for k, v in r.items(): print(k, v)
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path='shots/m01_items.png')
        await pg.evaluate('() => { const K = window.__klockowo, B = K.Build3; B.bfocus.set(0, 20, -20); K.Cam.yaw = 0.6; K.Cam.pitch = .75; K.Cam.dist = 75; for (let i = 0; i < 150; i++) B.update(1/60, i / 60); }')
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path='shots/m02_prefabs.png')
        print('errors:', errors[:8])
        await b.close()
asyncio.run(main())
