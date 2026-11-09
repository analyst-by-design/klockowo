"""Misja z planem (przezroczyste klocki): widoczność planu, przycisk "weź", zły klocek, postęp."""
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
        await pg.evaluate("() => { localStorage.setItem('klockowo.progress', JSON.stringify({ copy: {}, code: {} })); }")
        await pg.evaluate(INIT)
        await pg.evaluate("() => { window.__klockowo.settings.unlockAll = false; window.__klockowo.Build3.setMode('walk'); }")
        await pg.evaluate('() => { const M = window.__klockowo.Missions, B = window.__klockowo.Build3; if (!M.npcOf("bolek")) M.addNpc("bolek", M.spawnSpot(true) || M.findSpot(Math.floor(B.player.pos.x) + 8, Math.floor(B.player.pos.z))); M.talk("bolek"); }'); await pg.wait_for_timeout(500)
        await pg.click('.npc-dlg .btn.t-green'); await pg.wait_for_timeout(300)
        SIM = '''(n) => { const B = window.__klockowo.Build3; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); }'''
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, s = K.Missions.active.steps[0], c = s.cells[0];
          B.player.pos.set(c[0] + 3.5, c[1], c[2] + 5.5); K.Cam.yaw = 0.5; K.Cam.pitch = .38; K.Cam.dist = 11; K.Cam.snap(B.player.focus()); }''')
        await pg.evaluate(SIM, 90); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/p01_bp_walk.png')
        # tracker click takes the needed block and switches to build mode
        await pg.click('#b3-quest', force=True); await pg.wait_for_timeout(500)
        print('after tracker click:', await pg.evaluate('() => { const B = window.__klockowo.Build3; return [B.mode, B.item, B.piece]; }'))
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, s = K.Missions.active.steps[0], c = s.cells[0]; B.bfocus.set(c[0] + 1, c[1], c[2]); K.Cam.yaw = 0.5; K.Cam.pitch = .55; K.Cam.dist = 16; }''')
        await pg.evaluate(SIM, 90); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/p02_bp_build.png')
        # place the next cell correctly and another cell wrongly
        r = await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, M = K.Missions, s = M.active.steps[0];
          const n = M.bpNext, rec = B.rec(); B.setR(rec, n[0], n[1], n[2], n[3], 5 << 2);
          const other = s.cells.find(c => c !== n && c[1] === n[1]); B.setR(rec, other[0], other[1], other[2], K.BK.brick, 5 << 2); B.endRec(rec);
          return { next: n, other }; }''')
        await pg.evaluate(SIM, 40); await pg.wait_for_timeout(1500)
        print('progress:', await pg.evaluate('() => { const s = window.__klockowo.Missions.active.steps[0]; return [s.prog, s.goal, s._wrong]; }'))
        await pg.screenshot(path='shots/p03_bp_wrong.png')
        print('errors', errors[:5])
        await b.close()
asyncio.run(main())
