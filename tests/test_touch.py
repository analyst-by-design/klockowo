"""Telefon (pionowo i poziomo): joystick, szczypanie, stawianie dotykiem, obrót, dwa palce, grupy klocków, misja, garderoba."""
import asyncio, os
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
INIT = INIT_TOUCH
SIM = '''(n) => { const B = window.__klockowo.Build3; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); const p = B.player.pos; return [+p.x.toFixed(2), +p.z.toFixed(2)]; }'''
async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in pts]})
async def run(pw, w, h, tag):
    b = await pw.chromium.launch(**LAUNCH)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1)
    pg = await ctx.new_page(); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    cdp = await ctx.new_cdp_session(pg)
    await pg.goto(URL); await pg.wait_for_timeout(2000)
    print(tag, 'touch:', await pg.evaluate("document.documentElement.classList.contains('touch')"), 'lowGfx:', await pg.evaluate('window.__klockowo.settings.lowGfx'))
    await pg.screenshot(path=f'shots/r_{tag}_menu.png')
    await pg.evaluate(INIT)
    # pause rendering for responsive input in swiftshader
    await pg.evaluate('() => { const E = window.__klockowo.Engine; E._r = E.render; E.render = () => {}; }')
    # joystick walk
    jb = await pg.evaluate("(() => { const r = document.querySelector('#b3-joy').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; })()")
    p0 = await pg.evaluate(SIM, 1)
    await touch(cdp, 'touchStart', [(0, (jb[0], jb[1]))]); await touch(cdp, 'touchMove', [(0, (jb[0], jb[1] - 50))])
    p1 = await pg.evaluate(SIM, 120)
    await touch(cdp, 'touchEnd', [])
    print(tag, 'joystick walk', p0, '->', p1)
    # pinch zoom in walk mode
    d0 = await pg.evaluate('window.__klockowo.Cam.dist')
    cx, cy = w / 2, h / 2 - 40
    await touch(cdp, 'touchStart', [(0, (cx - 40, cy)), (1, (cx + 40, cy))])
    for i in range(1, 6): await touch(cdp, 'touchMove', [(0, (cx - 40 - i * 15, cy)), (1, (cx + 40 + i * 15, cy))])
    await touch(cdp, 'touchEnd', [])
    print(tag, 'pinch out dist', round(d0, 1), '->', round(await pg.evaluate('window.__klockowo.Cam.dist'), 1))
    # build mode: tap places
    await pg.evaluate('() => window.__klockowo.Build3.setMode("build")'); await pg.evaluate(SIM, 60)
    u0 = await pg.evaluate('window.__klockowo.Build3.undo.length')
    await touch(cdp, 'touchStart', [(0, (cx + 30, cy + 20))]); await pg.evaluate(SIM, 2); await touch(cdp, 'touchEnd', [])
    await pg.wait_for_timeout(200)
    print(tag, 'tap place undo', u0, '->', await pg.evaluate('window.__klockowo.Build3.undo.length'))
    # one-finger quick swipe rotates (no placing)
    y0 = await pg.evaluate('window.__klockowo.Cam.yaw'); u1 = await pg.evaluate('window.__klockowo.Build3.undo.length')
    await touch(cdp, 'touchStart', [(0, (cx, cy))])
    for i in range(1, 8): await touch(cdp, 'touchMove', [(0, (cx + i * 14, cy))])
    await touch(cdp, 'touchEnd', [])
    print(tag, 'swipe yaw', round(y0, 2), '->', round(await pg.evaluate('window.__klockowo.Cam.yaw'), 2), 'undo', u1, '->', await pg.evaluate('window.__klockowo.Build3.undo.length'))
    # two-finger pan in build mode
    f0 = await pg.evaluate('(() => { const f = window.__klockowo.Build3.bfocus; return [+f.x.toFixed(1), +f.z.toFixed(1)]; })()')
    await touch(cdp, 'touchStart', [(0, (cx - 50, cy)), (1, (cx + 50, cy))])
    for i in range(1, 6): await touch(cdp, 'touchMove', [(0, (cx - 50, cy + i * 18)), (1, (cx + 50, cy + i * 18))])
    await touch(cdp, 'touchEnd', [])
    print(tag, 'two-finger pan', f0, '->', await pg.evaluate('(() => { const f = window.__klockowo.Build3.bfocus; return [+f.x.toFixed(1), +f.z.toFixed(1)]; })()'), 'undo', await pg.evaluate('window.__klockowo.Build3.undo.length'))
    await pg.evaluate('() => { const E = window.__klockowo.Engine; E.render = E._r; }')
    await pg.evaluate(SIM, 30); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'shots/r_{tag}_build.png')
    # category popover
    await pg.tap('#b3-catbtn'); await pg.wait_for_timeout(600)
    await pg.screenshot(path=f'shots/r_{tag}_cats.png')
    await pg.tap('#b3-cats .cat >> nth=2'); await pg.wait_for_timeout(500)
    print(tag, 'cat after tap:', await pg.evaluate('window.__klockowo.Build3.cat'), 'open:', await pg.evaluate("document.querySelector('#b3-cats').classList.contains('open')"))
    await pg.evaluate('() => window.__klockowo.Build3.setMode("walk")'); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'shots/r_{tag}_walk.png')
    await pg.evaluate('() => window.__klockowo.Missions.talk("kazik")'); await pg.wait_for_timeout(800)
    await pg.screenshot(path=f'shots/r_{tag}_npc.png')
    await pg.tap('.npc-dlg .btn.t-green'); await pg.wait_for_timeout(1200)
    await pg.screenshot(path=f'shots/r_{tag}_quest.png')
    await pg.tap('#b3-shirt'); await pg.wait_for_timeout(1200)
    await pg.screenshot(path=f'shots/r_{tag}_wardrobe.png')
    print(tag, 'errors:', errors[:4])
    await b.close()
async def main():
    async with async_playwright() as pw:
        await run(pw, 844, 390, 'land')
        await run(pw, 390, 844, 'port')
asyncio.run(main())
