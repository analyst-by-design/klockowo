"""Przyroda: łopata, górka, wyrównanie, woda, sadzenie pędzlem, wycinanie przez Zabierz, cofanie."""
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
        r = await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world, out = {}, ev = [];
          B.on('tool', e => ev.push(e.tool + ':' + e.n));
          const top = (x, z) => { for (let y = 63; y > 0; y--) { const t = w.get(x, y, z); if (t && K.BL[t].kind === 'mat') return y; } };
          const use = (tool, x, z, brush = 1) => { B.selectItem('~' + tool); B.brushI = brush; const y = top(x, z); B.hit = { x, y, z, n: [0, 1, 0] }; const pl = B.placement(B.hit); return B.applyTool(pl); };
          // dig a 7x7 pond 2 deep at (10, 10)
          const h0 = top(10, 10);
          out.dig1 = use('dig', 10, 10, 2); out.dig2 = use('dig', 10, 10, 2);
          out.depth = h0 - top(10, 10);
          out.water = use('water', 10, 10, 0);
          out.waterTop = w.get(10, top(10, 10) + 1, 10) === K.BK.water || w.get(10, h0, 10) === K.BK.water;
          // raise a hill at (-10, 10) three times
          const h1 = top(-10, 10); use('raise', -10, 10, 2); use('raise', -10, 10, 1); use('raise', -10, 10, 0);
          out.hill = top(-10, 10) - h1;
          // flatten around the hill
          use('flat', -14, 10, 2);
          // axe: find a tree near spawn
          let tree = null; for (let x = -30; x < 30 && !tree; x++) for (let z = -30; z < 30 && !tree; z++) for (let y = 15; y < 40; y++) if (w.get(x, y, z) === K.BK.tree) { tree = [x, y, z]; break; }
          if (tree) { B.setGroup('erase'); out.cut = B.erase(...tree); out.treeGone = w.get(...tree) === 0; }
          // plant trees with big brush
          out.plant = use('tree', 0, 16, 2);
          for (let i = 0; i < 120; i++) B.update(1/60, i / 60);
          let planted = 0; for (let x = -4; x <= 4; x++) for (let z = 12; z <= 20; z++) for (let y = 15; y < 30; y++) { const t = w.get(x, y, z); if (t && K.BL[t].kind === 'model') planted++; }
          out.planted = planted;
          out.undoLen = B.undo.length; out.events = ev;
          // undo the plant
          B.doUndo(); let after = 0; for (let x = -4; x <= 4; x++) for (let z = 12; z <= 20; z++) for (let y = 15; y < 30; y++) { const t = w.get(x, y, z); if (t && K.BL[t].kind === 'model') after++; }
          out.afterUndoPlants = after;
          B.selectItem('~dig'); B.brushI = 1; B.renderShapes(); out.toolShapes = [...document.querySelectorAll('#b3-shapes .shape-btn')].map(b => b.textContent);
          B.bfocus.set(0, 20, 10); K.Cam.yaw = 0.2; K.Cam.pitch = .7; K.Cam.dist = 34; K.Cam.snap(B.bfocus);
          for (let i = 0; i < 120; i++) B.update(1/60, i / 60);
          return out; }''')
        for k, v in r.items(): print(k, v)
        await pg.mouse.move(700, 380); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/m10_terrain.png')
        # hold+drag stroke with raise via real mouse (rendering paused for responsiveness)
        await pg.evaluate('() => { const E = window.__klockowo.Engine; E._r = E.render; E.render = () => {}; const B = window.__klockowo.Build3; B.selectItem("~raise"); B.brushI = 1; }')
        u0 = await pg.evaluate('window.__klockowo.Build3.undo.length')
        await pg.mouse.move(600, 450); await pg.wait_for_timeout(300)
        await pg.mouse.down(); await pg.wait_for_timeout(700)
        for i in range(1, 12): await pg.mouse.move(600 + i * 15, 450); await pg.wait_for_timeout(30)
        await pg.mouse.up(); await pg.wait_for_timeout(200)
        await pg.evaluate('() => { const E = window.__klockowo.Engine; E.render = E._r; }')
        print('stroke undo', u0, '->', await pg.evaluate('window.__klockowo.Build3.undo.length'))
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/m11_stroke.png')
        print('errors:', errors[:8])
        await b.close()
asyncio.run(main())
