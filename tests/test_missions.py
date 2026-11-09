"""Mieszkańcy: pojawianie się na trasie spaceru, różnorodność misji, wszystkie szablony, nowe typy kroków, zapis."""
import asyncio, os, json
from playwright.async_api import async_playwright
from common import URL, LAUNCH, INIT, INIT_TOUCH
SIM = '''(n) => { const B = window.__klockowo.Build3; for (let i = 0; i < n; i++) B.update(1/60, performance.now()/1000 + i/60); }'''
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
        await pg.evaluate("() => { const E = window.__klockowo.Engine; E._r = E.render; E.render = () => {}; window.__klockowo.Build3.setMode('walk'); }")
        await pg.evaluate(SIM, 120)
        NPCS = '''() => { const M = window.__klockowo.Missions, p = window.__klockowo.Build3.player.pos; return M.npcs.map(n => [n.R.id, Math.round(Math.hypot(n.pos.x - p.x, n.pos.z - p.z)), !!n.leaving]); }'''
        print('start npcs:', await pg.evaluate(NPCS))
        # 1) kazik first, intro mission
        await pg.evaluate('() => window.__klockowo.Missions.talk("kazik")'); await pg.wait_for_timeout(300)
        print('dialog:', await pg.evaluate("document.querySelector('.npc-say').textContent"))
        await pg.click('.npc-dlg .btn.t-green'); await pg.wait_for_timeout(200)
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world; B.setMode('build'); B.selectItem('brick'); B.piece = 'kostka';
           const p = B.player.pos; for (let i = 0; i < 3; i++) { const x = Math.floor(p.x) + 3 + i * 2, z = Math.floor(p.z) + 3; let y = 63; while (y > 0 && !w.get(x, y - 1, z)) y--; B.hit = { x, y: y - 1, z, n: [0, 1, 0] }; const pl = B.placement(B.hit); if (pl) B.place(pl); } B.setMode('walk'); }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(700); await pg.evaluate(SIM, 10)
        print('after kazik1:', await pg.evaluate(NPCS), await pg.evaluate('() => [window.__klockowo.Missions.active, window.__klockowo.Missions.idx]'))
        await pg.evaluate("() => document.querySelectorAll('#modal-root .btn.t-green').forEach(b => b.click())")
        await pg.evaluate(SIM, 480)
        print('kazik left:', await pg.evaluate(NPCS))
        # 2) walk east in steps, record spawns relative to the walking direction
        spawns = await pg.evaluate('''async () => { const K = window.__klockowo, B = K.Build3, M = K.Missions, out = [], seen = new Set(M.npcs);
          for (let k = 0; k < 24; k++) {
            const p = B.player.pos; B.teleportNear(p.x + 7, p.z + 1);
            for (let i = 0; i < 100; i++) B.update(1/60, k * 2 + i / 60);
            for (const N of M.npcs) if (!seen.has(N)) { seen.add(N); const q = B.player.pos; out.push([N.R.id, Math.round(N.pos.x - q.x), Math.round(N.pos.z - q.z)]); }
            await new Promise(r => setTimeout(r, 0));
          }
          return { out, now: M.npcs.map(n => n.R.id), px: Math.round(B.player.pos.x) }; }''')
        print('walk spawns:', spawns)
        ahead = sum(1 for s in spawns['out'] if s[1] > 0)
        print('ahead (dx>0):', ahead, 'of', len(spawns['out']))
        # 3) variety: simulate 40 missions, count repeats among the last 8
        var = await pg.evaluate('''() => { const M = window.__klockowo.Missions, seq = [], per = {}; const st = JSON.stringify({ idx: M.idx, hist: M.hist, used: M.used, mcount: M.mcount });
          for (let i = 0; i < 40; i++) { const id = M.pickNpcId() || 'kazik', X = M.next(id); M.markUsed(X); M.idx[id] = (M.idx[id] || 0) + 1; M.lastDone = id; seq.push(X.tpl); (per[id] = per[id] || []).push(X.tpl + ':' + X.title); }
          let rep = 0; seq.forEach((t, i) => { if (seq.slice(Math.max(0, i - 8), i).includes(t)) rep++; });
          const o = JSON.parse(st); Object.assign(M, o); M.lastDone = null;
          return { rep, uniq: new Set(seq).size, seq: seq.join(' '), per }; }''')
        print('variety: repeats-in-8 =', var['rep'], 'unique =', var['uniq']); print(' seq:', var['seq'])
        for k, v in var['per'].items(): print('  ', k, v[:6])
        # 4) every template generates at every age, with no leftover placeholders
        gen = await pg.evaluate('''() => { const K = window.__klockowo, M = K.Missions, bad = []; let n = 0;
          for (const age of [0, 1, 2]) { K.settings.age = age; for (const id of Object.keys(M.TPL)) { const t = M.TPL[id]; for (const npc of t.npcs) { const X = JSON.parse(JSON.stringify(t.gen())); X.npc = npc; M.dirFill(X); n++;
            const txt = X.text + X.steps.map(s => s.short + (s.q || '')).join(' ');
            if (/DIR|DIST|undefined|NaN|null/.test(txt) || !X.steps.length) bad.push([age, id, txt.slice(0, 120)]);
            for (const s of X.steps) { if (s.type === 'blueprint' && !M.BP_FOR[s.bp]) bad.push([age, id, 'bp ' + s.bp]); if (s.ids) for (const k of s.ids) if (!K.BK[k]) bad.push([age, id, 'id ' + k]); if (s.type === 'prefab' && !K.PREFABS[s.name]) bad.push([age, id, 'pf ' + s.name]); if (s.type === 'quiz' && !s.choices.includes(s.answer)) bad.push([age, id, 'quiz']); } } } }
          K.settings.age = 0; return { n, bad }; }''')
        print('templates checked:', gen['n'], 'bad:', gen['bad'][:6])
        # 5) new step types end to end
        async def force(tpl, npc, age=0):
            return await pg.evaluate(f'''() => {{ const K = window.__klockowo, M = K.Missions, B = K.Build3; K.settings.age = {age}; if (M.active) M.abandon();
               let N = M.npcOf("{npc}"); if (!N) {{ const q = M.spawnSpot(true) || M.findSpot(Math.floor(B.player.pos.x) + 8, Math.floor(B.player.pos.z)); N = M.addNpc("{npc}", q); }}
               const X = JSON.parse(JSON.stringify(M.TPL["{tpl}"].gen())); Object.assign(X, {{ npc: "{npc}", tpl: "{tpl}", si: 0, n: 1 }}); M.dirFill(X); M.accept(X); const s = X.steps[0]; return [X.title, X.text, s.type, s.goal]; }}''')
        st = '''() => { const M = window.__klockowo.Missions, A = M.active; return A ? [A.tpl, A.si, A.steps[A.si] && A.steps[A.si].type, A.steps[A.si] && A.steps[A.si].prog] : ['done', window.__klockowo.Missions.idx]; }'''
        close = "() => document.querySelectorAll('#modal-root .btn.t-green').forEach(b => b.click())"
        # collect
        print('collect:', await force('p_collect', 'pola', 1))
        await pg.evaluate('''async () => { const K = window.__klockowo, B = K.Build3, M = K.Missions; B.setMode('walk'); const s = M.active.steps[0];
          for (const c of s.list.slice()) { B.player.pos.set(c[0] + .5, c[1], c[2] + .5); for (let i = 0; i < 20; i++) B.update(1/60, i / 60); } }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(800); await pg.evaluate(SIM, 5); print(' ->', await pg.evaluate(st)); await pg.evaluate(close)
        # reach (9+, text with direction)
        print('reach:', await force('p_reach', 'feliks', 2))
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, s = K.Missions.active.steps[0]; B.teleportNear(s.pos[0] + 1, s.pos[2]); }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(800); await pg.evaluate(SIM, 5); print(' ->', await pg.evaluate(st)); await pg.evaluate(close)
        # paint
        print('paint:', await force('h_paint', 'hela', 0))
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world, s = K.Missions.active.steps[0]; B.setMode('build'); B.selectItem('brick'); B.piece = 'kostka';
          const p = B.player.pos; const xs = []; for (let i = 0; i < 2; i++) { const x = Math.floor(p.x) - 3 - i * 2, z = Math.floor(p.z) - 3; let y = 63; while (y > 0 && !w.get(x, y - 1, z)) y--; B.hit = { x, y: y - 1, z, n: [0, 1, 0] }; const pl = B.placement(B.hit); if (pl) { B.place(pl); xs.push([x, y, z]); } }
          B.setTool('paint'); B.selectItem(s.ids[0]); for (const c of xs) B.paint(c[0], c[1], c[2]); B.setTool('build'); }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(800); await pg.evaluate(SIM, 5); print(' ->', await pg.evaluate(st)); await pg.evaluate(close)
        # shape (słupki)
        r = await force('k_shape', 'kazik', 0); print('shape:', r)
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world, s = K.Missions.active.steps[0]; const pk = { 4: 'slupek', 2: 'schodki', 7: 'luk', 3: 'skos' }[s.shape];
          B.setMode('build'); B.selectItem('planks'); B.piece = 'kostka'; const p = B.player.pos; let x = Math.floor(p.x) + 4, z = Math.floor(p.z) - 4; let y = 63; while (y > 0 && !w.get(x, y - 1, z)) y--;
          B.hit = { x, y: y - 1, z, n: [0, 1, 0] }; let pl = B.placement(B.hit); if (pl) B.place(pl);   // kostka: nie liczy się
          B.piece = pk; for (let i = 0; i < s.goal; i++) { B.hit = { x: x + 2 + i * 2, y: y - 1, z, n: [0, 1, 0] }; pl = B.placement(B.hit); if (pl) B.place(pl); } }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(800); await pg.evaluate(SIM, 5); print(' ->', await pg.evaluate(st)); await pg.evaluate(close)
        # overwater (pomost)
        print('pier:', await force('j_pier', 'jozek', 0))
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, w = B.world; B.setMode('build'); const p = B.player.pos; const x0 = Math.floor(p.x) + 6, z0 = Math.floor(p.z) + 6;
          let y = 63; while (y > 0 && !w.get(x0, y - 1, z0)) y--; const rec = B.rec(); for (let x = x0; x < x0 + 4; x++) for (let z = z0; z < z0 + 2; z++) { B.setR(rec, x, y - 1, z, K.BK.water, 0); } B.endRec(rec);
          B.selectItem('planks'); B.piece = 'kostka'; for (let x = x0; x < x0 + 3; x++) { B.hit = { x, y: y - 1, z: z0, n: [0, 1, 0] }; const pl = B.placement(B.hit); if (pl) B.place(pl); } }''')
        await pg.evaluate(SIM, 60); await pg.wait_for_timeout(800); await pg.evaluate(SIM, 5); print(' ->', await pg.evaluate(st)); await pg.evaluate(close)
        # compass without a mission points to the nearest NPC
        await pg.evaluate('() => { const B = window.__klockowo.Build3; B.setMode("walk"); }'); await pg.evaluate(SIM, 120)
        print('target (no mission):', await pg.evaluate('() => window.__klockowo.Missions.target()'))
        # 6) save & reload keeps nearby NPCs and history
        await pg.evaluate('() => window.__klockowo.Build3.save(false)')
        before = await pg.evaluate('() => window.__klockowo.Missions.save()')
        await pg.evaluate('() => window.__klockowo.Build3.open(1)'); await pg.wait_for_timeout(800)
        await pg.evaluate('''() => { const B = window.__klockowo.Build3; let n = 0; while (!B.ready && n < 500) { B.update(1/60, 1); n++; } }''')
        after = await pg.evaluate('() => window.__klockowo.Missions.save()')
        print('reload npcs:', [n['id'] for n in before['npcs']], '->', [n['id'] for n in after['npcs']], 'hist kept:', before['hist'][:4] == after['hist'][:4])
        # book & screenshot of an NPC with marker
        await pg.evaluate("() => { const E = window.__klockowo.Engine; E.render = E._r; }")
        await pg.evaluate('''() => { const K = window.__klockowo, B = K.Build3, M = K.Missions, N = M.nearestNew(); if (N) { B.player.pos.set(N.pos.x - 6, N.pos.y, N.pos.z - 6); } K.Cam.yaw = Math.atan2(-6, -6) + Math.PI; K.Cam.pitch = .3; K.Cam.dist = 14; for (let i = 0; i < 40; i++) B.update(1/60, i/60); K.Cam.snap(B.player.focus()); }''')
        await pg.wait_for_timeout(2500); await pg.screenshot(path='shots/p01_npc.png')
        await pg.click('#b3-book', force=True); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/p02_book.png')
        print('errors:', errors[:8])
        await b.close()
asyncio.run(main())
