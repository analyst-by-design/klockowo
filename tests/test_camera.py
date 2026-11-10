"""Telefon, budowanie: dotknięcie z drżeniem palca stawia klocek, dwa palce przesuwają widok „za palcami”,
szybkie machnięcie przesuwa dalej, po oddaleniu kamery nie ma mgły ani chmur nad miejscem budowy."""
import asyncio
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT_TOUCH
SIM = '''(n) => { const B = window.__klockowo.Build3; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); }'''
FOCUS = '(() => { const f = window.__klockowo.Build3.bfocus; return [f.x, f.z]; })()'
async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in pts]})
async def run(pw, w, h, tag):
    b = await pw.chromium.launch(**LAUNCH)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1)
    pg = await ctx.new_page(); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    cdp = await ctx.new_cdp_session(pg)
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    await pg.evaluate(INIT_TOUCH)
    await pg.evaluate('() => { const E = window.__klockowo.Engine; E._r = E.render; E.render = () => {}; }')
    await pg.evaluate('() => { const K = window.__klockowo; K.Build3.setMode("build"); K.Cam.dist = 16; }'); await pg.evaluate(SIM, 90)
    cx, cy = w / 2, h / 2 - 30
    ok = True
    # 1. dotknięcie, podczas którego palec przesunie się o 10 px, nadal stawia klocek (a nie obraca widoku)
    u0 = await pg.evaluate('window.__klockowo.Build3.undo.length'); y0 = await pg.evaluate('window.__klockowo.Cam.yaw')
    await touch(cdp, 'touchStart', [(0, (cx, cy))]); await touch(cdp, 'touchMove', [(0, (cx + 7, cy + 7))]); await touch(cdp, 'touchEnd', [])
    await pg.wait_for_timeout(150)
    u1 = await pg.evaluate('window.__klockowo.Build3.undo.length'); y1 = await pg.evaluate('window.__klockowo.Cam.yaw')
    print(tag, 'jitter tap: undo', u0, '->', u1, 'yaw', round(y0, 3), '->', round(y1, 3))
    ok &= u1 == u0 + 1 and abs(y1 - y0) < 1e-6
    # 2. dwa palce: punkt świata pod palcami zostaje pod palcami
    await pg.evaluate(SIM, 60)
    pts = [(cx - 50 + i * 12, cy + i * 9) for i in range(9)]
    g0 = await pg.evaluate(f'window.__klockowo.Build3.groundAt({pts[0][0]}, {pts[0][1]})')
    await touch(cdp, 'touchStart', [(0, (pts[0][0] - 50, pts[0][1])), (1, (pts[0][0] + 50, pts[0][1]))])
    for x, y in pts[1:]:
        await touch(cdp, 'touchMove', [(0, (x - 50, y)), (1, (x + 50, y))]); await pg.wait_for_timeout(40)
    await pg.wait_for_timeout(300)  # pauza przed puszczeniem: bez rozpędu
    await touch(cdp, 'touchEnd', [])
    await pg.evaluate(SIM, 120)
    g1 = await pg.evaluate(f'window.__klockowo.Build3.groundAt({pts[-1][0]}, {pts[-1][1]})')
    err = ((g0['x'] - g1['x']) ** 2 + (g0['z'] - g1['z']) ** 2) ** .5
    print(tag, 'grab pan: point under fingers drift', round(err, 2), 'panVel', await pg.evaluate('window.__klockowo.Build3.panVel'))
    ok &= err < 1.2
    # 3. szybkie machnięcie dwoma palcami: widok jedzie dalej po puszczeniu
    f0 = await pg.evaluate(FOCUS)
    await touch(cdp, 'touchStart', [(0, (cx - 50, cy - 60)), (1, (cx + 50, cy - 60))])
    for i in range(1, 7):
        await touch(cdp, 'touchMove', [(0, (cx - 50, cy - 60 + i * 20)), (1, (cx + 50, cy - 60 + i * 20))]); await pg.wait_for_timeout(16)
    await touch(cdp, 'touchEnd', [])
    f1 = await pg.evaluate(FOCUS); await pg.evaluate(SIM, 120); f2 = await pg.evaluate(FOCUS)
    d1 = ((f1[0] - f0[0]) ** 2 + (f1[1] - f0[1]) ** 2) ** .5; d2 = ((f2[0] - f0[0]) ** 2 + (f2[1] - f0[1]) ** 2) ** .5
    print(tag, 'fling: moved by fingers', round(d1, 1), 'after glide', round(d2, 1))
    ok &= d2 > d1 * 1.3
    # 4. kamera daleko: mgła zaczyna się za miejscem, na które patrzymy; brak chmur
    await pg.evaluate('() => { const K = window.__klockowo; K.Cam.dist = 80; K.Cam.pitch = 1.1; }'); await pg.evaluate(SIM, 240)
    fog = await pg.evaluate('(() => { const B = window.__klockowo.Build3, C = window.__klockowo.Cam; return [B.scene.fog.near, B.scene.fog.far, C.cur]; })()')
    print(tag, 'far camera fog near/far/cur', [round(v, 1) for v in fog])
    ok &= fog[0] > fog[2]
    await pg.evaluate('() => { const E = window.__klockowo.Engine; E.render = E._r; }')
    await pg.evaluate(SIM, 2); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'shots/cam_{tag}_far.png')
    print(tag, 'errors', errors)
    await b.close()
    if not ok or errors: raise SystemExit(f'{tag}: FAIL')
async def main():
    async with async_playwright() as pw:
        await run(pw, 390, 844, 'port')
        await run(pw, 844, 390, 'land')
asyncio.run(main())
