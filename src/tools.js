/* =========================================================
   PRZYRODA — sadzenie (drzewo, choinka, krzak, kwiatki), łopata, górka, wyrównanie, woda.
   Wycinanie drzew robi teraz Zabierz (patrz build3.js: erase).
   ========================================================= */
const TOOLS = {
  tree:    { name: 'drzewo', icon: 'tree', plant: 'tree', say: 'Drzewo. Dotknij trawy, żeby posadzić.', col: 0x7cc96a, brush: true },
  spruce:  { name: 'choinka', icon: 'spruce', plant: 'spruce', say: 'Choinka. Dotknij trawy, żeby posadzić.', col: 0x5aa86a, brush: true },
  bush:    { name: 'krzak', icon: 'bush', plant: 'bush', say: 'Krzak. Dotknij trawy, żeby posadzić.', col: 0x8fd17a, brush: true },
  flowers: { name: 'kwiatki', icon: 'flowers', plant: 'flowers', say: 'Kwiatki. Dotknij trawy, żeby posadzić.', col: 0xf29bb8, brush: true },
  dig:     { name: 'łopata', em: '⛏️', say: 'Łopata. Kop dołki.', col: 0xb07a4a, brush: true },
  raise:   { name: 'górka', em: '⛰️', say: 'Górka. Usyp ziemię.', col: 0x7cc96a, brush: true },
  flat:    { name: 'wyrównaj', em: '🟰', say: 'Wyrównaj teren.', col: 0xf2c14e, brush: true },
  water:   { name: 'woda', em: '🪣', say: 'Woda. Nalej wody do dołka.', col: 0x5cb6e4 },
};
for (const k in TOOLS) TOOLS[k].key = '~' + k;
const BRUSHES = [{ r: .5, name: 'mały', plant: 'jedno', em: '•' }, { r: 1.6, name: 'średni', plant: 'kilka', em: '●' }, { r: 3.1, name: 'duży', plant: 'dużo', em: '⬤' }];
const CUTTABLE = new Set(['tree', 'spruce', 'bush', 'mushroom']);
const isNatT = t => t && BL[t].kind === 'mat' && BL[t].nat;
const isDeco = t => t && BL[t].kind === 'model';

Object.assign(Build3, {
  brushI: 1, toolAnims: [],
  toolKey() { return this.item.slice(1); },
  toolName() { const T = TOOLS[this.toolKey()]; return T && T.plant ? 'plant' : this.toolKey(); },
  // najwyższy naturalny klocek w kolumnie (w pobliżu wysokości y0); zwraca y klocka albo null, gdy na górze stoi budowla
  topNat(x, z, y0) {
    const w = this.world; if (!w.chunkAt(x, z)) return null;
    for (let y = Math.min(w.H - 2, y0 + 6); y >= Math.max(1, y0 - 8); y--) {
      const t = w.get(x, y, z); if (!t || t === BK.water || isDeco(t)) continue;
      return isNatT(t) && !(w.meta(x, y, z) & ~3) ? y : null;
    }
    return null;
  },
  brushCols(cx, cz) {
    const r = TOOLS[this.toolKey()].brush ? BRUSHES[this.brushI].r : .5, out = [], R = Math.ceil(r);
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (dx * dx + dz * dz <= r * r + .01) out.push([cx + dx, cz + dz]);
    return out;
  },
  // drzewo pod kursorem (dla Zabierz): idziemy wzdłuż promienia i szukamy korony
  pickTree() {
    const w = this.world, o = this.ray.ray.origin, d = this.ray.ray.direction;
    for (let t = 1; t < 110; t += .6) {
      const px = o.x + d.x * t, py = o.y + d.y * t, pz = o.z + d.z * t, bx = Math.floor(px), bz = Math.floor(pz);
      for (let ax = bx - 2; ax <= bx + 2; ax++) for (let az = bz - 2; az <= bz + 2; az++) for (let y = Math.floor(py) - 9; y <= Math.floor(py); y++) {
        const k = w.get(ax, y, az); if (!k || !CUTTABLE.has(BL[k].key)) continue;
        const key = BL[k].key, top = key === 'bush' || key === 'mushroom' ? 1.6 : 8.5, rad = key === 'bush' ? 1.3 : 2.4;
        if (py >= y && py <= y + top && Math.hypot(px - ax - .5, pz - az - .5) < rad) return { x: ax, y, z: az, n: [0, 1, 0], t };
      }
      if (t > 4 && w.opaque(bx, Math.floor(py), bz)) break;
    }
    return null;
  },
  toolTarget(hit) {
    const tool = this.toolName();
    if (!hit) return null;
    const w = this.world, side = hit.n[1] === 0;
    let cx = hit.x, cz = hit.z, cy = hit.y;
    const ht = w.get(hit.x, hit.y, hit.z);
    if (isDeco(ht)) cy = hit.y - 1;                       // kliknięto w roślinkę: liczy się ziemia pod nią
    else if (side) { cx = hit.x + hit.n[0]; cz = hit.z + hit.n[2]; const t = this.topNat(cx, cz, hit.y); if (t !== null) cy = t; }
    return { tool, key: this.toolKey(), x: cx, y: cy, z: cz, hit, cols: this.brushCols(cx, cz) };
  },
  showBrush(pl) {
    if (!this.brush) {
      this.brush = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .32, depthWrite: false }));
      disc.rotation.x = -PI / 2; disc.renderOrder = 3;
      const ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }));
      ring.rotation.x = -PI / 2; ring.renderOrder = 3;
      this.brush.add(disc, ring); this.brush.userData = { disc, ring };
      this.scene.add(this.brush);
    }
    if (!pl) return;
    const T = TOOLS[pl.key], r = T.brush ? BRUSHES[this.brushI].r : .7, U = this.brush.userData;
    U.disc.material.color.setHex(T.col); U.ring.material.color.setHex(T.col);
    this.brush.visible = true;
    this.brush.position.set(pl.x + .5, pl.y + 1.04, pl.z + .5);
    this.brush.scale.setScalar(Math.max(.7, r + .2));
  },
  renderToolShapes(row) {
    const T = TOOLS[this.toolKey()];
    const add = (label, em, sel, fn) => { const b = document.createElement('button'); b.className = 'btn shape-btn' + (sel ? ' sel' : ''); b.innerHTML = `<span class="tool-em small">${em}</span>${label}`; b.onclick = fn; row.appendChild(b); };
    if (T.brush) BRUSHES.forEach((B, i) => { const nm = T.plant ? B.plant : B.name; add(nm, B.em, i === this.brushI, () => { this.brushI = i; Snd.click(); Voice.say(nm); this.renderShapes(); }); });
  },

  /* ----- wykonanie narzędzia na zestawie kolumn ----- */
  applyTool(pl, rec, seen, strokeY) {
    const own = !rec; rec = rec || this.rec(); seen = seen || new Set();
    const w = this.world, tool = pl.tool;
    let n = 0;
    const cols = pl.cols.filter(([x, z]) => { const k = x + ',' + z; if (seen.has(k)) return false; seen.add(k); return true; });
    const clearDecoAbove = (x, y, z) => { for (let yy = y; yy < y + 2; yy++) { const t = w.get(x, yy, z); if (isDeco(t)) this.setR(rec, x, yy, z, 0, 0); } };
    if (tool === 'dig') {
      for (const [x, z] of cols) {
        const y = this.topNat(x, z, pl.y); if (y === null || y < 2 || Math.abs(y - pl.y) > 4 || this.playerAt(x, y + 1, z)) continue;
        clearDecoAbove(x, y + 1, z);
        this.setR(rec, x, y, z, 0, 0);
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => w.get(x + a, y, z + b) === BK.water) || w.get(x, y + 1, z) === BK.water) this.setR(rec, x, y, z, BK.water, 0);
        n++;
      }
      if (n) { Snd.remove(); Parts3.burst(pl.x, pl.y, pl.z, '#b4875b', 8); }
    } else if (tool === 'raise') {
      for (const [x, z] of cols) {
        const y = this.topNat(x, z, pl.y); if (y === null || Math.abs(y - pl.y) > 4 || y >= w.H - 4) continue;
        const above = w.get(x, y + 1, z);
        if (above && !isDeco(above) && above !== BK.water) continue;
        if (above && BL[above].solid) continue;                       // drzewa i głazy zostają
        if (this.playerAt(x, y + 1, z) || w.animals.some(a => a.cx === x && a.cz === z && Math.abs(a.cy - y - 1) < 2)) continue;
        const top = w.get(x, y, z), cover = top === BK.grass || top === BK.snow || top === BK.sand ? top : BK.grass;
        clearDecoAbove(x, y + 1, z);
        if (top === BK.grass || top === BK.snow) this.setR(rec, x, y, z, BK.dirt, 0);
        this.setR(rec, x, y + 1, z, cover, 0);
        n++;
      }
      if (n) { Snd.place(BK.grass); Parts3.burst(pl.x, pl.y + 1, pl.z, '#88c868', 8); }
    } else if (tool === 'flat') {
      const target = strokeY != null ? strokeY : pl.y;
      for (const [x, z] of cols) {
        let y = this.topNat(x, z, target); if (y === null) continue;
        if (y === target) continue;
        if (this.playerAt(x, target + 1, z) && y < target) continue;
        const top = w.get(x, y, z), cover = top === BK.snow || top === BK.sand ? top : BK.grass;
        if (y > target) {
          for (let yy = y; yy > target; yy--) { clearDecoAbove(x, yy + 1, z); const t = w.get(x, yy, z); if (isNatT(t)) this.setR(rec, x, yy, z, 0, 0); else break; }
          const t2 = w.get(x, target, z); if (t2 === BK.dirt) this.setR(rec, x, target, z, cover, 0);
        } else {
          if (target - y > 8) continue;
          clearDecoAbove(x, y + 1, z);
          if (top === BK.grass || top === BK.snow) this.setR(rec, x, y, z, BK.dirt, 0);
          for (let yy = y + 1; yy <= target; yy++) { const t = w.get(x, yy, z); if (t && !isDeco(t) && t !== BK.water) break; this.setR(rec, x, yy, z, yy === target ? cover : BK.dirt, 0); }
        }
        n++;
      }
      if (n) { Snd.place(BK.dirt); Parts3.burst(pl.x, target + 1, pl.z, '#f2c14e', 6); }
    } else if (tool === 'plant') {
      const kinds = [TOOLS[pl.key].plant];
      const big = this.brushI > 0;
      for (const [x, z] of cols) {
        const y = this.topNat(x, z, pl.y); if (y === null || Math.abs(y - pl.y) > 4) continue;
        const ground = w.get(x, y, z); if (ground !== BK.grass && ground !== BK.dirt && ground !== BK.snow) continue;
        let key = kinds[Math.floor(Math.random() * kinds.length)];
        if (ground === BK.snow && key !== 'spruce') key = 'spruce';
        const tall = key === 'tree' || key === 'spruce';
        if (big && Math.random() > (tall ? .28 : .6)) continue;
        if (w.get(x, y + 1, z) || this.playerAt(x, y + 1, z)) continue;
        if (tall) { let near = false; for (let a = -2; a <= 2 && !near; a++) for (let b = -2; b <= 2; b++) { const t = w.get(x + a, y + 1, z + b); if (t === BK.tree || t === BK.spruce) { near = true; break; } } if (near) continue; }
        if (ground === BK.dirt) this.setR(rec, x, y, z, BK.grass, 0);
        this.growAnim(key, x, y + 1, z, rec);
        n++;
      }
      if (n) { Snd.pop(); Parts3.sparkle(pl.x, pl.y + 1, pl.z, 3, 1.5); }
    } else if (tool === 'water') {
      n = this.fillWater(pl, rec);
    }
    if (own) {
      if (tool !== 'plant') this.endRec(rec); else this.pendingRec = rec;
      if (n) { this.dirty = true; this.emit('tool', { tool, n }); this.tut('place', 1); }
      else if (tool !== 'plant' || !this.toolAnims.length) Snd.soft();
    }
    return n;
  },
  playerAt(x, y, z) { const p = this.player.pos; return Math.floor(p.x) === x && Math.floor(p.z) === z && Math.abs(p.y - y) < 3.5; },
  fillWater(pl, rec) {
    const w = this.world, sx = pl.x, sz = pl.z, base = pl.y + 1;
    // najwyższy poziom wody, który nie wycieka poza dołek
    const fill = L => {
      const seen = new Set(), q = [[sx, base, sz]], out = [];
      while (q.length) {
        const [x, y, z] = q.pop(), k = x + ',' + y + ',' + z;
        if (seen.has(k)) continue; seen.add(k);
        if (Math.abs(x - sx) > 14 || Math.abs(z - sz) > 14 || out.length > 700) return null;
        const t = w.get(x, y, z);
        if (t && t !== BK.water && !isDeco(t)) { if (!isNatT(t)) return null; continue; }
        out.push([x, y, z]);
        for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0]]) if (y + b <= L) q.push([x + a, y + b, z + c]);
      }
      return out;
    };
    let best = null;
    for (let L = base; L < base + 6; L++) { const r = fill(L); if (!r) break; best = r; }
    if (!best) { this.toast('Najpierw wykop dołek łopatą'); return 0; }
    let n = 0;
    for (const [x, y, z] of best) if (w.get(x, y, z) !== BK.water && !this.playerAt(x, y, z)) { this.setR(rec, x, y, z, BK.water, 0); n++; }
    if (n) { Snd.place(BK.water); Parts3.burst(sx, base, sz, '#5cb6e4', 10); }
    return n;
  },
  // drzewko rośnie, a do świata trafia dopiero na końcu animacji
  growAnim(key, x, y, z, rec) {
    const o = buildModel(key, 0, (cellSeed(x, y, z) % 5) + 1); o.scale.multiplyScalar(key === 'tree' || key === 'spruce' ? 2.6 : 2);
    o.position.set(x + .5, y, z + .5); this.scene.add(o);
    const s0 = o.scale.x;
    this.toolAnims.push({ o, t: 0, life: 1.1 + Math.random() * .3, kind: 'grow', s0, done: () => {
      const r2 = this.pendingRec || rec;
      if (!this.world.get(x, y, z)) this.setR(r2, x, y, z, BK[key], 0);
    } });
  },
  fallAnim(key, x, y, z, m) {
    const o = buildModel(key, m & 3, (cellSeed(x, y, z) % 5) + 1); o.scale.multiplyScalar(key === 'tree' || key === 'spruce' ? 2.6 : 2);
    const pivot = new THREE.Group(); pivot.position.set(x + .5, y, z + .5); pivot.add(o); this.scene.add(pivot);
    const a = Math.random() * PI * 2; pivot.userData.ax = new V3(Math.cos(a), 0, Math.sin(a));
    this.toolAnims.push({ o: pivot, t: 0, life: .9, kind: 'fall', s0: 1 });
    Parts3.burst(x, y + 2, z, '#6fbf5e', 10);
  },
  updateToolAnims(dt) {
    if (!this.toolAnims.length) return;
    let finished = false;
    this.toolAnims = this.toolAnims.filter(A => {
      A.t += dt; const k = Math.min(1, A.t / A.life);
      if (A.kind === 'grow') { const e = k < 1 ? 1 - Math.pow(1 - k, 3) * Math.cos(k * 7) * .9 : 1; A.o.scale.setScalar(A.s0 * Math.max(.05, e)); }
      else { A.o.setRotationFromAxisAngle(A.o.userData.ax, k * k * 1.45); if (k > .75) A.o.scale.setScalar(1 - (k - .75) * 4); }
      if (k >= 1) {
        this.scene.remove(A.o);
        if (A.done) { A.done(); finished = true; }
        if (A.kind === 'fall') Parts3.burst(A.o.position.x - .5, A.o.position.y, A.o.position.z - .5, '#c9a36f', 6);
        return false;
      }
      return true;
    });
    if (finished && !this.toolAnims.some(A => A.kind === 'grow') && this.pendingRec) { this.endRec(this.pendingRec); this.pendingRec = null; this.dirty = true; }
  },

  /* ----- przytrzymanie i przeciąganie: malowanie terenu ----- */
  strokeStart() {
    const pl = this.pl; if (!pl || !pl.tool || pl.tool === 'water') return null;
    return { mode: 'terrain', pl, anchor: [pl.x, pl.y, pl.z], seen: new Set(), rec: null, y: pl.y, last: null, n: 0 };
  },
  strokeMove(rs) {
    this.ray.setFromCamera(this.mouse, this.cam);
    const hit = voxelRay(this.world, this.ray.ray.origin, this.ray.ray.direction, 170);
    const pl = this.toolTarget(hit ? { x: hit.x, y: hit.y, z: hit.z, n: hit.n } : null); if (!pl) return;
    this.showBrush(pl);
    const key = pl.x + ',' + pl.z; if (rs.last === key) return; rs.last = key;
    if (!rs.rec) { rs.rec = this.rec(); if (pl.tool === 'plant') this.pendingRec = rs.rec; this.applyTool(rs.pl, rs.rec, rs.seen, rs.y); }
    rs.n += this.applyTool(pl, rs.rec, rs.seen, rs.y);
  },
  strokeEnd(rs) {
    if (this.brush) this.brush.visible = false;
    if (!rs.rec) return;
    if (rs.pl.tool !== 'plant') this.endRec(rs.rec);
    this.dirty = true; this.emit('tool', { tool: rs.pl.tool, n: rs.n });
  },
});
