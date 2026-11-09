"""Dolny pasek: pięć dużych przycisków (Buduj, Przyroda, Zwierzaki, Maluj, Zabierz), "weź" przy misjach, układ na telefonie."""
import asyncio, os
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
SIM = '''(n) => { const B = window.__klockowo.Build3; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); }'''
STATE = '''() => { const B = window.__klockowo.Build3; return [B.group, B.tool, B.item, B.cat, document.querySelectorAll('#b3-items .ptile').length,
   getComputedStyle(document.querySelector('#b3-cats')).display, [...document.querySelectorAll('#b3-tools .sel')].map(b => b.dataset.group).join()]; }'''
async def main():
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**LAUNCH)
        pg = await b.new_page(viewport={'width': 1366, 'height': 768})
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate("() => { localStorage.setItem('klockowo.progress', JSON.stringify({ copy: {}, code: {} })); }")
        print('ready', await pg.evaluate(INIT))
        await pg.evaluate("() => { window.__klockowo.settings.unlockAll = false; window.__klockowo.Build3.setMode('build'); window.__klockowo.Build3.selectItem('brick'); }")
        print('build  ', await pg.evaluate(STATE))
        for g in ['nature', 'animals', 'paint', 'erase', 'build']:
            await pg.click(f'#b3-tools [data-group="{g}"]'); await pg.wait_for_timeout(1200)
            print(f'{g:8}', await pg.evaluate(STATE))
            await pg.screenshot(path=f'shots/g_{g}.png', clip={'x': 0, 'y': 560, 'width': 1366, 'height': 208})
        # dock fits on screen
        print('dock rect', await pg.evaluate("(() => { const r = document.querySelector('#b3-dock').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width)]; })()"))
        # selecting an animal from Buduj switches to Zwierzaki; colors in Maluj stay in Maluj
        print('sel @sheep ->', await pg.evaluate("() => { const B = window.__klockowo.Build3; B.setGroup('build'); B.selectItem('@sheep'); return [B.group, B.tool]; }"))
        print('paint+orange ->', await pg.evaluate("() => { const B = window.__klockowo.Build3; B.setGroup('paint'); B.selectItem('orange'); return [B.group, B.tool, B.item]; }"))
        print('paint+planks ->', await pg.evaluate("() => { const B = window.__klockowo.Build3; B.selectItem('planks'); return [B.group, B.tool, B.item]; }"))
        print('back to build keeps item ->', await pg.evaluate("() => { const B = window.__klockowo.Build3; B.setGroup('nature'); B.setGroup('build'); return [B.group, B.item, B.cat]; }"))
        await pg.keyboard.press('KeyX'); x1 = await pg.evaluate('window.__klockowo.Build3.group')
        await pg.keyboard.press('KeyX'); x2 = await pg.evaluate('window.__klockowo.Build3.group')
        print('X toggles:', x1, x2)
        # one tap with "drzewo" plants exactly one tree; Zabierz on the crown cuts it
        r = await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world; B.setGroup('nature'); B.selectItem('~tree');
           const p = B.player.pos; const x = Math.floor(p.x) + 2, z = Math.floor(p.z) - 6; let y = 63; while (y > 0 && !(w.get(x, y, z) && K.BL[w.get(x, y, z)].kind === 'mat')) y--;
           const brush = B.brushI; B.hit = { x, y, z, n: [0, 1, 0] }; const pl = B.placement(B.hit); const n = B.applyTool(pl); for (let i = 0; i < 120; i++) B.update(1/60, i / 60);
           return { brush, n, tree: w.get(x, y + 1, z) === K.BK.tree, pos: [x, y + 1, z], shapes: [...document.querySelectorAll('#b3-shapes .shape-btn')].map(b => b.textContent) }; }''')
        print('plant one:', r)
        await pg.evaluate("() => { const E = window.__klockowo.Engine; E._r = E.render; E.render = () => {}; }")
        cut = await pg.evaluate(f'''() => {{ const K = window.__klockowo, B = K.Build3, w = B.world, ev = []; B.on('tool', e => ev.push(e.tool + ':' + e.n));
           const [x, y, z] = {r['pos']}; B.setGroup('erase'); K.Cam.yaw = 0; K.Cam.pitch = .5; K.Cam.dist = 16; B.bfocus.set(x + .5, y, z + 8); K.Cam.snap(B.bfocus); B.cam.updateMatrixWorld();
           const v = new THREE.Vector3(x + .5, y + 3, z + .5).project(B.cam); B.mouse.x = v.x; B.mouse.y = v.y; B.mouse.in = true; B.updateTarget();
           const h = B.hit && {{ ...B.hit }}; B.click('erase'); const gone = !w.get(x, y, z); for (let i = 0; i < 80; i++) B.update(1/60, i / 60);
           return {{ hit: h, gone, ev }}; }}''')
        print('Zabierz on crown:', cut)
        await pg.evaluate("() => { const E = window.__klockowo.Engine; E.render = E._r; }")
        # mission "Wycinka": tracker shows a "weź ✋" button that switches to Zabierz
        mi = await pg.evaluate('''() => { const K = window.__klockowo, M = K.Missions, B = K.Build3; B.setGroup('build'); B.setMode('walk');
           const N = M.npcOf('ola') || M.addNpc('ola', M.spawnSpot(true) || M.findSpot(Math.floor(B.player.pos.x) + 8, Math.floor(B.player.pos.z)));
           const X = JSON.parse(JSON.stringify(M.TPL.ola3.gen())); Object.assign(X, { npc: 'ola', tpl: 'ola3', si: 0, n: 1 }); M.accept(X);
           return [X.text, M.needItem(), !!document.querySelector('#b3-quest .q-need')]; }''')
        print('wycinka:', mi)
        await pg.wait_for_timeout(800); await pg.screenshot(path='shots/g_quest.png', clip={'x': 300, 'y': 0, 'width': 766, 'height': 90})
        await pg.click('#b3-quest', force=True); await pg.wait_for_timeout(400)
        print('after tracker click:', await pg.evaluate('() => { const B = window.__klockowo.Build3; return [B.mode, B.group, !!document.querySelector("#b3-quest .q-need")]; }'))
        # paint and plant missions point to the right button too
        for tpl, npc in [('h_paint', 'hela'), ('m_plant', 'bartek'), ('m_animals', 'bartek'), ('k_prefab', 'kazik')]:
            r = await pg.evaluate(f'''() => {{ const K = window.__klockowo, M = K.Missions, B = K.Build3; if (M.active) M.abandon(); B.setGroup('erase', true);
               const X = JSON.parse(JSON.stringify(M.TPL.{tpl}.gen())); Object.assign(X, {{ npc: '{npc}', tpl: '{tpl}', si: 0, n: 1 }}); if (!M.npcOf('{npc}')) M.addNpc('{npc}', M.spawnSpot(true) || M.findSpot(Math.floor(B.player.pos.x) + 9, Math.floor(B.player.pos.z) + 3)); M.accept(X);
               const k = M.needItem(); M.takeNeeded(); return [k, B.group, B.tool, B.item, M.holds(k)]; }}''')
            print(f'{tpl:9}', r)
        print('errors:', errors[:6])
        await b.close()
        # phone portrait and landscape
        for (w, h, tag) in [(390, 844, 'port'), (844, 390, 'land')]:
            b = await p.chromium.launch(**LAUNCH)
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(1500)
            await pg.evaluate("() => { localStorage.setItem('klockowo.progress', JSON.stringify({ copy: {}, code: {} })); }")
            await pg.evaluate(INIT)
            await pg.evaluate("() => { window.__klockowo.Build3.setMode('build'); }")
            for g in ['build', 'nature', 'erase']:
                await pg.tap(f'#b3-tools [data-group="{g}"]'); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=f'shots/g_{tag}_{g}.png')
                print(tag, g, await pg.evaluate('''(() => { const r = document.querySelector('#b3-dock').getBoundingClientRect(), t = document.querySelector('#b3-tools').getBoundingClientRect(), i = document.querySelector('#b3-items').getBoundingClientRect();
                   return { dock: [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.height)], tools: [Math.round(t.left), Math.round(t.right), Math.round(t.top)], items: [Math.round(i.left), Math.round(i.right), Math.round(i.top), Math.round(i.width)] }; })()'''))
            await pg.tap('#b3-tools [data-group="build"]'); await pg.wait_for_timeout(300)
            await pg.tap('#b3-catbtn'); await pg.wait_for_timeout(800)
            await pg.screenshot(path=f'shots/g_{tag}_cats.png')
            print(tag, 'errors:', errs[:4])
            await b.close()
asyncio.run(main())
