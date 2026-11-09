"""Dymny test całej gry: menu, poziom z kopiowaniem, gwiazdki, nowy świat, budowanie myszką, prawy klik, dach z obrotem."""
import asyncio, os
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
OUT = 'shots'
SIM = '''([n, keys]) => { const B = window.__klockowo.Build3; B.keys = keys || {}; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); B.keys = {}; const p = B.player.pos; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; }'''

async def main():
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await b.new_page(viewport={'width': 1366, 'height': 768})
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{OUT}/f01_menu.png')

        # --- Wzory poziom 1: prawdziwe kliknięcia ---
        await pg.click('[data-go=copy]'); await pg.wait_for_timeout(300)
        await pg.click('.lvl >> nth=0', force=True); await pg.wait_for_timeout(600)
        box = await pg.locator('#copy-canvas').bounding_box()
        pts = await pg.evaluate('(() => { const v = window.__klockowo.Copy.view; return [v.proj(2.5,2.5,1), v.proj(2.5,2.5,2)]; })()')
        for pt in pts:
            await pg.mouse.click(box['x'] + pt[0], box['y'] + pt[1]); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(1400)
        unl = await pg.evaluate("(() => { const i = document.querySelector('.unlock img'); return i ? i.src.length : 0; })()")
        print('copy L1 solved, unlock icon bytes:', unl)
        await pg.screenshot(path=f'{OUT}/f02_copy_win.png')
        await pg.click('#cel-list'); await pg.wait_for_timeout(300)

        # --- Jeżyk poziom 1 ---
        await pg.evaluate('() => window.__klockowo.Code.start(0)'); await pg.wait_for_timeout(300)
        for _ in range(3): await pg.click('[data-cmd=R]')
        await pg.click('#k-go'); await pg.wait_for_timeout(3500)
        print('stars:', await pg.evaluate('Object.keys(window.__klockowo.progress.copy).length + Object.keys(window.__klockowo.progress.code).length'))
        if await pg.locator('#cel-list').count(): await pg.click('#cel-list')

        # --- budowanie ---
        await pg.evaluate('() => window.__klockowo.show("menu")'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'{OUT}/f03_menu_reward.png')
        await pg.click('[data-go=build]'); await pg.wait_for_timeout(300)
        await pg.click('.wcard >> nth=2'); await pg.wait_for_timeout(300)
        await pg.click('.choice >> nth=0'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/f03b_loading.png')
        for _ in range(60):
            if await pg.evaluate('window.__klockowo.Build3.ready'): break
            await pg.wait_for_timeout(500)
        print('world ready:', await pg.evaluate('window.__klockowo.Build3.ready'))
        await pg.wait_for_timeout(1200)
        if await pg.locator('#h-ok').count():
            await pg.screenshot(path=f'{OUT}/f04_help.png')
            await pg.click('#h-ok')
        if await pg.locator('#tut-skip').count(): await pg.click('#tut-skip')
        print('walk:', await pg.evaluate(SIM, [60, {'f': True}]))
        await pg.keyboard.press('KeyB'); await pg.wait_for_timeout(1500)
        # door is unlocked now (1 star) — check Dom category
        await pg.click('.cats3 .cat >> nth=2'); await pg.wait_for_timeout(300)
        locked = await pg.evaluate("[...document.querySelectorAll('#b3-items .ptile')].map(d => d.classList.contains('locked'))")
        print('Dom items locked:', locked)
        await pg.click('.cats3 .cat >> nth=0'); await pg.wait_for_timeout(200)
        # build a wall of 4 by real mouse clicks along the ground in front
        await pg.evaluate("() => { const K = window.__klockowo; K.Cam.yaw = 0; K.Cam.pitch = .9; K.Cam.dist = 14; K.Build3.bfocus.copy(K.Build3.player.pos); }")
        await pg.evaluate(SIM, [40, {}])
        P = await pg.evaluate('(() => { const p = window.__klockowo.Build3.player.pos; return [p.x, p.y, p.z]; })()')
        async def scr(x, y, z):
            return await pg.evaluate(f'''(() => {{ const K = window.__klockowo; const v = new THREE.Vector3({x},{y},{z}).project(K.Build3.cam);
                const r = document.querySelector('#build-host').getBoundingClientRect(); return [r.left + (v.x+1)/2*r.width, r.top + (1-v.y)/2*r.height]; }})()''')
        n0 = await pg.evaluate('window.__klockowo.Build3.undo.length')
        import math
        gx, gz, gy = math.floor(P[0]), math.floor(P[2]) - 3, math.floor(P[1])
        for dx in range(-4, 4, 2):
            sx, sy = await scr(gx + dx + .5, gy - .001, gz + .5)
            await pg.mouse.move(sx, sy); await pg.wait_for_timeout(120)
            await pg.mouse.click(sx, sy); await pg.wait_for_timeout(120)
        n1 = await pg.evaluate('window.__klockowo.Build3.undo.length')
        print('blocks placed by mouse:', n1 - n0)
        # right click to remove one
        sx, sy = await scr(gx + .5, gy + .5, gz + 1.001)
        await pg.mouse.move(sx, sy); await pg.wait_for_timeout(150)
        await pg.mouse.click(sx, sy, button='right'); await pg.wait_for_timeout(200)
        print('after right-click remove, undo stack:', await pg.evaluate('window.__klockowo.Build3.undo.length'))
        # select roof + shape row + rotate with R
        await pg.click('#b3-items .ptile >> nth=10'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('KeyR'); await pg.wait_for_timeout(100)
        sx, sy = await scr(gx - 1 + .5, gy + 1 - .001, gz + .5)
        await pg.mouse.move(sx, sy); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/f05_build_roof_ghost.png')
        await pg.click('#b3-home'); await pg.wait_for_timeout(600)
        await b.close()
    print('errors:', errors[:20])
asyncio.run(main())
