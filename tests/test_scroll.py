"""Telefon: przewijanie list palcem (sloty światów, wybór świata, pasek klocków)."""
import asyncio, os
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
INIT = INIT_TOUCH
async def touchdrag(cdp, pg, x0, y0, x1, y1, n=8):
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for i in range(1, n + 1):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / n, 'y': y0 + (y1 - y0) * i / n}]})
        await pg.wait_for_timeout(16)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    await pg.wait_for_timeout(400)
async def run(pw, w, h, tag):
    b = await pw.chromium.launch(**LAUNCH)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1)
    pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
    await pg.goto(URL); await pg.wait_for_timeout(1800)
    await pg.evaluate('''() => { for (let i = 0; i < 3; i++) localStorage.removeItem('klockowo.w4_' + i); }''')
    await pg.tap('[data-go=build]'); await pg.wait_for_timeout(700)
    sc = await pg.evaluate("(() => { const e = document.querySelector('#s-cards'); return [e.scrollWidth, e.clientWidth, e.scrollHeight, e.clientHeight]; })()")
    print(tag, 'slots scroll dims', sc)
    await touchdrag(cdp, pg, w * .7, h * .6, w * .2, h * .3)
    print(tag, 'slots after drag', await pg.evaluate("(() => { const e = document.querySelector('#s-cards'); return [e.scrollLeft, e.scrollTop]; })()"))
    await pg.screenshot(path=f'shots/t_{tag}_slots.png')
    # choice dialog
    await pg.evaluate("() => document.querySelector('.wcard').click()"); await pg.wait_for_timeout(700)
    d = await pg.evaluate("(() => { const e = document.querySelector('.overlay .dialog'); return e ? [e.scrollHeight, e.clientHeight, e.scrollWidth, e.clientWidth] : null; })()")
    print(tag, 'choice dialog dims', d)
    await pg.screenshot(path=f'shots/t_{tag}_choice.png')
    await pg.evaluate("() => document.querySelector('#modal-root').innerHTML = ''")
    # build items row
    await pg.evaluate(INIT); await pg.evaluate('() => window.__klockowo.Build3.setMode("build")'); await pg.wait_for_timeout(800)
    r = await pg.evaluate("(() => { const e = document.querySelector('#b3-items'), r = e.getBoundingClientRect(); return [e.scrollWidth, e.clientWidth, r.left, r.top, r.width, r.height]; })()")
    print(tag, 'items dims', r)
    await touchdrag(cdp, pg, r[2] + r[4] * .8, r[3] + r[5] / 2, r[2] + r[4] * .1, r[3] + r[5] / 2)
    print(tag, 'items scrollLeft after drag', await pg.evaluate("document.querySelector('#b3-items').scrollLeft"))
    await b.close()
async def main():
    async with async_playwright() as pw:
        await run(pw, 844, 390, 'land')
        await run(pw, 390, 844, 'port')
asyncio.run(main())
