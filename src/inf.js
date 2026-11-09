/* =========================================================
   ŚWIAT BEZ GRANIC — kostka 0,5 m, fragmenty generowane na bieżąco
   ========================================================= */
const CS4 = 32, H4 = 64, SEA4 = 15, VIEW_R = 3;

/* ---------- klocki z kilku pól: połączenia między polami jednego klocka ---------- */
const LINK_DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const linkIdx = (dx, dy, dz) => dx > .5 ? 0 : dx < -.5 ? 1 : dy > .5 ? 2 : dy < -.5 ? 3 : dz > .5 ? 4 : 5;
const hasLink = (m, i) => ((m >> (5 + i)) & 1) === 1;
const hasLinkDir = (m, d) => hasLink(m, linkIdx(d[0], d[1], d[2]));
const PIECES = {
  kostka: { name: 'kostka', len: 1 },
  cegielka: { name: 'cegiełka', len: 2 },
  belka: { name: 'belka', len: 4 },
  plytka: { name: 'płytka', len: 2, plate: true },
  skos: { name: 'skos', len: 2, slope: true },
  schodki: { name: 'schodki', len: 1, shape: 2, oriented: true },
  slupek: { name: 'słupek', len: 1, shape: 4 },
  luk: { name: 'łuk', len: 1, shape: 7, oriented: true },
};
const PIECE_KEYS = Object.keys(PIECES);
const FWD = [[0, -1], [1, 0], [0, 1], [-1, 0]], RIGHT = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function pieceLayout(itemKey, pk, ori) {
  const d = BL[BK[itemKey]], R = RIGHT[ori], F = FWD[ori], cells = [];
  if (d.kind === 'window') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cells.push([R[0] * i, j, R[1] * i]); return { cells, base: ori }; }
  if (d.kind === 'door') { for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) cells.push([R[0] * i, j, R[1] * i]); return { cells, base: ori }; }
  if (d.kind !== 'mat' || d.nat) return { cells: [[0, 0, 0]], base: d.oriented ? ori : 0 };
  const P = PIECES[pk] || PIECES.kostka;
  if (P.shape) return { cells: [[0, 0, 0]], base: (P.shape << 2) | (P.oriented ? ori : 0) };
  if (P.slope) { for (let i = 0; i < P.len; i++) cells.push([R[0] * i, 0, R[1] * i]); return { cells, base: (3 << 2) | ori }; }
  if (P.plate) { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cells.push([R[0] * i + F[0] * j, 0, R[1] * i + F[1] * j]); return { cells, base: 6 << 2 }; }
  for (let i = 0; i < P.len; i++) cells.push([R[0] * i, 0, R[1] * i]);
  return { cells, base: 5 << 2 };
}
function withLinks(cells, base) {
  const set = new Set(cells.map(c => c[0] + ',' + c[1] + ',' + c[2]));
  return cells.map(([x, y, z]) => {
    let m = base;
    LINK_DIRS.forEach(([dx, dy, dz], i) => { if (set.has((x + dx) + ',' + (y + dy) + ',' + (z + dz))) m |= 1 << (5 + i); });
    return m;
  });
}
function pieceCellsAt(w, x, y, z) {
  const out = [], seen = new Set([x + ',' + y + ',' + z]), q = [[x, y, z]];
  while (q.length && out.length < 64) {
    const c = q.pop(); out.push(c);
    const m = w.meta(c[0], c[1], c[2]);
    for (let i = 0; i < 6; i++) {
      if (!hasLink(m, i)) continue;
      const D = LINK_DIRS[i], n = [c[0] + D[0], c[1] + D[1], c[2] + D[2]], k = n.join(',');
      if (!seen.has(k) && w.get(n[0], n[1], n[2])) { seen.add(k); q.push(n); }
    }
  }
  return out;
}
const pieceTex = (d, ny) => { const t = d.texP || d.tex; return typeof t === 'string' ? t : ny > .1 ? t[0] : ny < -.1 ? t[2] : t[1]; };

/* klocek jako prostopadłościan z zaokrąglonymi (ściętymi) krawędziami */
function emitChamfer(bk, side, top, bot, x0, y0, z0, x1, y1, z1, b) {
  const face = (pts, n) => {
    const a = pts[0], c1 = pts[1], c2 = pts[2];
    const ux = c1[0] - a[0], uy = c1[1] - a[1], uz = c1[2] - a[2], vx = c2[0] - a[0], vy = c2[1] - a[1], vz = c2[2] - a[2];
    if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) pts = pts.slice().reverse();
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    const uv = pts.map(p => (ay >= ax && ay >= az) ? [p[0] * .5, -p[2] * .5] : ax >= az ? [p[2] * .5, p[1] * .5] : [p[0] * .5, p[1] * .5]);
    pushPoly(bk, n[1] > .5 ? top : n[1] < -.5 ? bot : side, pts, n, uv, null, false);
  };
  const xa = x0 + b, xb = x1 - b, ya = y0 + b, yb = y1 - b, za = z0 + b, zb = z1 - b;
  face([[x1, ya, za], [x1, yb, za], [x1, yb, zb], [x1, ya, zb]], [1, 0, 0]);
  face([[x0, ya, za], [x0, ya, zb], [x0, yb, zb], [x0, yb, za]], [-1, 0, 0]);
  face([[xa, y1, za], [xa, y1, zb], [xb, y1, zb], [xb, y1, za]], [0, 1, 0]);
  face([[xa, y0, za], [xb, y0, za], [xb, y0, zb], [xa, y0, zb]], [0, -1, 0]);
  face([[xa, ya, z1], [xb, ya, z1], [xb, yb, z1], [xa, yb, z1]], [0, 0, 1]);
  face([[xa, ya, z0], [xa, yb, z0], [xb, yb, z0], [xb, ya, z0]], [0, 0, -1]);
  const s2 = Math.SQRT1_2, s3 = 1 / Math.sqrt(3);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const Y = sy > 0 ? y1 : y0, Yi = sy > 0 ? yb : ya, Z = sz > 0 ? z1 : z0, Zi = sz > 0 ? zb : za;
    face([[xa, Y, Zi], [xb, Y, Zi], [xb, Yi, Z], [xa, Yi, Z]], [0, sy * s2, sz * s2]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const X = sx > 0 ? x1 : x0, Xi = sx > 0 ? xb : xa, Z = sz > 0 ? z1 : z0, Zi = sz > 0 ? zb : za;
    face([[X, ya, Zi], [X, yb, Zi], [Xi, yb, Z], [Xi, ya, Z]], [sx * s2, 0, sz * s2]);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const X = sx > 0 ? x1 : x0, Xi = sx > 0 ? xb : xa, Y = sy > 0 ? y1 : y0, Yi = sy > 0 ? yb : ya;
    face([[X, Yi, za], [X, Yi, zb], [Xi, Y, zb], [Xi, Y, za]], [sx * s2, sy * s2, 0]);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const X = sx > 0 ? x1 : x0, Xi = sx > 0 ? xb : xa, Y = sy > 0 ? y1 : y0, Yi = sy > 0 ? yb : ya, Z = sz > 0 ? z1 : z0, Zi = sz > 0 ? zb : za;
    face([[X, Yi, Zi], [Xi, Y, Zi], [Xi, Yi, Z]], [sx * s3, sy * s3, sz * s3]);
  }
}
function emitPiece(bk, w, x, y, z, t, m) {
  if (hasLink(m, 1) || hasLink(m, 3) || hasLink(m, 5)) return; // rysuje tylko pole startowe klocka
  let lx = 1, ly = 1, lz = 1;
  for (let mm = m, cx = x; hasLink(mm, 0) && lx < 8;) { cx++; lx++; mm = w.meta(cx, y, z); }
  for (let mm = m, cz = z; hasLink(mm, 4) && lz < 8;) { cz++; lz++; mm = w.meta(x, y, cz); }
  for (let mm = m, cy = y; hasLink(mm, 2) && ly < 8;) { cy++; ly++; mm = w.meta(x, cy, z); }
  const d = BL[t], half = ((m >> 2) & 7) === 6;
  emitChamfer(bk, pieceTex(d, 0), pieceTex(d, 1), pieceTex(d, -1), x, y, z, x + lx, y + (half ? .5 : ly), z + lz, half ? .05 : .075);
}

/* ---------- generator krainy ---------- */
function colH(x, z, P) {
  const s = P.seed;
  let h;
  if (P.kind === 'meadow') {
    h = 20 + (fbm(x / 110, z / 110, s) - .5) * 7 + (fbm(x / 35, z / 35, s + 3) - .5) * 2.5;
    const lake = fbm(x / 150, z / 150, s + 9); if (lake < .36) h -= (.36 - lake) * 55;
  } else {
    const cont = fbm(x / 220, z / 220, s), hills = fbm(x / 75, z / 75, s + 3), det = fbm(x / 24, z / 24, s + 5);
    h = 19 + (cont - .47) * 34 + Math.max(0, hills - .5) * 44 + (det - .5) * 3;
    if (P.kind === 'winter') h += 3;
  }
  const r = Math.hypot(x - P.sx, z - P.sz);
  if (r < 28) h = lerp(20, h, sstep(12, 28, r));
  return clamp(Math.round(h), 3, H4 - 14);
}
function localMin(x, z, seed, rad) {
  const v = h2(x, z, seed);
  for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) if ((a || b) && h2(x + a, z + b, seed) < v) return false;
  return true;
}
function decoAt(x, z, P, snowy) {
  const s = P.seed, moist = fbm(x / 170, z / 170, s + 31), r = h2(x, z, s + 77);
  const forest = P.kind !== 'meadow' && moist > .56;
  const pTree = snowy ? .03 : forest ? .05 : P.kind === 'meadow' ? .004 : .008;
  if (r < pTree && localMin(x, z, s + 77, 3)) return (snowy || (forest && h2(x, z, s + 5) < .3)) ? 'spruce' : 'tree';
  if (snowy) return r > .994 ? 'rock' : null;
  const r2 = h2(x, z, s + 91);
  if (r2 < (moist > .4 && moist < .62 ? .045 : .014)) return 'flowers';
  if (r2 > .988) return 'bush';
  if (r2 > .5 && r2 < .5035) return 'rock';
  return null;
}
function genChunk4(c, P) {
  const x0 = c.cx * CS4, z0 = c.cz * CS4, s = P.seed, W = CS4 + 2;
  const HM = new Int16Array(W * W);
  for (let lz = -1; lz <= CS4; lz++) for (let lx = -1; lx <= CS4; lx++) HM[(lz + 1) * W + lx + 1] = colH(x0 + lx, z0 + lz, P);
  let maxY = SEA4;
  for (let lz = 0; lz < CS4; lz++) for (let lx = 0; lx < CS4; lx++) {
    const x = x0 + lx, z = z0 + lz, hi = (lz + 1) * W + lx + 1, h = HM[hi];
    const nearW = Math.min(HM[hi - 1], HM[hi + 1], HM[hi - W], HM[hi + W]) <= SEA4;
    const temp = fbm(x / 320, z / 320, s + 21) - (P.kind === 'winter' ? .6 : Math.max(0, 1 - Math.hypot(x - P.sx, z - P.sz) / 140) * -.35);
    const snow = temp < .32 || h > 42;
    const sandy = h - 1 <= SEA4 || (h - 1 <= SEA4 + 1 && nearW);
    const top = sandy ? BK.sand : snow ? BK.snow : BK.grass;
    for (let y = 0; y < h; y++) c.t[(y * CS4 + lz) * CS4 + lx] = y < h - 5 ? BK.stone : y < h - 1 ? (sandy ? BK.sand : BK.dirt) : top;
    for (let y = h; y <= SEA4; y++) c.t[(y * CS4 + lz) * CS4 + lx] = BK.water;
    if (h > maxY) maxY = h;
    const rs = Math.hypot(x - P.sx, z - P.sz);
    if (!sandy && h > SEA4 + 2 && rs > 7) {
      let deco = decoAt(x, z, P, snow);
      if (rs < 18 && (deco === 'tree' || deco === 'spruce')) deco = null;
      if (deco) c.t[(h * CS4 + lz) * CS4 + lx] = BK[deco];
    }
  }
  c.maxY = Math.min(H4 - 1, maxY + 1);
}

/* ---------- zapis zmienionych fragmentów (IndexedDB, awaryjnie localStorage) ---------- */
const IDB = {
  db: null, tried: false,
  open() {
    if (this.tried) return Promise.resolve(!!this.db);
    this.tried = true;
    return new Promise(res => {
      try {
        const rq = indexedDB.open('klockowo', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('chunks');
        rq.onsuccess = () => { this.db = rq.result; res(true); };
        rq.onerror = () => res(false);
      } catch (e) { res(false); }
    });
  },
  async put(k, v) {
    await this.open();
    if (!this.db) { Store.set('c.' + k, v); return; }
    try { this.db.transaction('chunks', 'readwrite').objectStore('chunks').put(v, k); } catch (e) { Store.set('c.' + k, v); }
  },
  async loadPrefix(prefix) {
    await this.open();
    const out = new Map();
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('klockowo.c.' + prefix)) out.set(k.slice(('klockowo.c.' + prefix).length), JSON.parse(localStorage.getItem(k))); } } catch (e) {}
    if (!this.db) return out;
    return new Promise(res => {
      try {
        const rq = this.db.transaction('chunks').objectStore('chunks').openCursor(IDBKeyRange.bound(prefix, prefix + '￿'));
        rq.onsuccess = () => { const cur = rq.result; if (cur) { out.set(String(cur.key).slice(prefix.length), cur.value); cur.continue(); } else res(out); };
        rq.onerror = () => res(out);
      } catch (e) { res(out); }
    });
  },
  async delPrefix(prefix) {
    await this.open();
    try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('klockowo.c.' + prefix)) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (!this.db) return;
    try { this.db.transaction('chunks', 'readwrite').objectStore('chunks').delete(IDBKeyRange.bound(prefix, prefix + '￿')); } catch (e) {}
  },
};

/* ---------- fragment świata i widok do siatkowania ---------- */
class Chunk4 {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.t = new Uint8Array(CS4 * CS4 * H4); this.m = new Uint16Array(CS4 * CS4 * H4);
    this.maxY = 0; this.meshes = null; this.dirty = true; this.edited = false; this.doorKeys = []; this.lod = 0; this.lodWant = 0;
  }
}
class ChunkView {
  constructor(w, c) {
    const P = CS4 + 2; this.w = w; this.P = P; this.ms = w.ms; this.H = H4; this.chunkMode = true;
    this.x0 = c.cx * CS4 - 1; this.z0 = c.cz * CS4 - 1;
    this.t = new Uint8Array(P * P * H4); this.m = new Uint16Array(P * P * H4);
    const ny = Math.min(H4, c.maxY + 3);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = w.chunks.get((c.cx + dx) + ',' + (c.cz + dz)); if (!n) continue;
      const lx0 = dx < 0 ? CS4 - 1 : 0, lx1 = dx > 0 ? 0 : CS4 - 1, lz0 = dz < 0 ? CS4 - 1 : 0, lz1 = dz > 0 ? 0 : CS4 - 1;
      for (let y = 0; y < ny; y++) for (let lz = lz0; lz <= lz1; lz++) {
        const pz = lz + (dz + 1) * CS4 - CS4 + 1, src = (y * CS4 + lz) * CS4, dst = (y * P + pz) * P;
        for (let lx = lx0; lx <= lx1; lx++) { const px = lx + (dx + 1) * CS4 - CS4 + 1; this.t[dst + px] = n.t[src + lx]; this.m[dst + px] = n.m[src + lx]; }
      }
    }
  }
  li(x, y, z) { const lx = x - this.x0, lz = z - this.z0; return (lx < 0 || lz < 0 || lx >= this.P || lz >= this.P || y < 0 || y >= H4) ? -1 : (y * this.P + lz) * this.P + lx; }
  get(x, y, z) { const i = this.li(x, y, z); return i < 0 ? this.w.get(x, y, z) : this.t[i]; }
  meta(x, y, z) { const i = this.li(x, y, z); return i < 0 ? this.w.meta(x, y, z) : this.m[i]; }
  opaque(x, y, z) {
    if (y < 0) return true;
    const i = this.li(x, y, z); if (i < 0) return this.w.opaque(x, y, z);
    const t = this.t[i]; return !!t && BL[t].kind === 'mat' && (this.m[i] & (7 << 2 | LOW)) === 0;
  }
  in(x, y, z) { return y >= 0 && y < H4; }
}

/* ---------- świat bez granic ---------- */
class InfWorld {
  constructor(P, edits) {
    this.P = P; this.edits = edits || new Map(); this.chunks = new Map();
    this.group = new THREE.Group(); this.animals = []; this.doors = new Map();
    this.ms = 2; this.H = H4; this.R = settings.lowGfx ? 2 : VIEW_R; this.saveQ = new Set(); this.chunkMode = true; this._lc = null; this.order = []; this.lastC = '';
  }
  chunkAt(x, z) {
    const cx = Math.floor(x / CS4), cz = Math.floor(z / CS4), L = this._lc;
    if (L && L.cx === cx && L.cz === cz) return L;
    const c = this.chunks.get(cx + ',' + cz); if (c) this._lc = c; return c;
  }
  get(x, y, z) { if (y < 0 || y >= H4) return 0; const c = this.chunkAt(x, z); return c ? c.t[(y * CS4 + (z - c.cz * CS4)) * CS4 + (x - c.cx * CS4)] : 0; }
  meta(x, y, z) { if (y < 0 || y >= H4) return 0; const c = this.chunkAt(x, z); return c ? c.m[(y * CS4 + (z - c.cz * CS4)) * CS4 + (x - c.cx * CS4)] : 0; }
  in(x, y, z) { return y >= 0 && y < H4 && !!this.chunkAt(x, z); }
  opaque(x, y, z) {
    if (y < 0) return true; if (y >= H4) return false;
    const c = this.chunkAt(x, z); if (!c) return true;
    const i = (y * CS4 + (z - c.cz * CS4)) * CS4 + (x - c.cx * CS4), t = c.t[i];
    return !!t && BL[t].kind === 'mat' && (c.m[i] & (7 << 2 | LOW)) === 0;
  }
  set(x, y, z, t, m = 0) {
    if (y < 0 || y >= H4) return;
    const c = this.chunkAt(x, z); if (!c) return;
    const lx = x - c.cx * CS4, lz = z - c.cz * CS4, i = (y * CS4 + lz) * CS4 + lx;
    if (c.t[i] === t && c.m[i] === m) return;
    c.t[i] = t; c.m[i] = t ? m : 0;
    if (t && y + 1 > c.maxY) c.maxY = Math.min(H4 - 1, y + 1);
    c.edited = true; this.saveQ.add(c.cx + ',' + c.cz);
    const mk = (a, b) => { const n = this.chunks.get(a + ',' + b); if (n) n.dirty = true; };
    c.dirty = true;
    if (lx === 0) mk(c.cx - 1, c.cz); if (lx === CS4 - 1) mk(c.cx + 1, c.cz);
    if (lz === 0) mk(c.cx, c.cz - 1); if (lz === CS4 - 1) mk(c.cx, c.cz + 1);
    if (lx < 4) mk(c.cx - 1, c.cz); if (lz < 4) mk(c.cx, c.cz - 1);
  }
  ensureData(cx, cz) {
    const k = cx + ',' + cz; let c = this.chunks.get(k); if (c) return c;
    c = new Chunk4(cx, cz);
    const e = this.edits.get(k), L = CS4 * CS4 * H4;
    if (e) {
      c.t = rleDec(e.t, L); c.m = new Uint16Array(rleDec(e.m, L * 2).buffer); c.edited = true;
      let my = 0; for (let i = c.t.length - 1; i >= 0; i--) if (c.t[i]) { my = Math.floor(i / (CS4 * CS4)); break; }
      c.maxY = Math.min(H4 - 1, my + 1);
    } else genChunk4(c, this.P);
    this.chunks.set(k, c);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = this.chunks.get((cx + dx) + ',' + (cz + dz)); if (n) n.dirty = true; }
    return c;
  }
  neighborsReady(c) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!this.chunks.has((c.cx + dx) + ',' + (c.cz + dz))) return false; return true; }
  meshChunk(c) {
    if (c.meshes) for (const me of c.meshes) { this.group.remove(me); me.geometry.dispose(); }
    for (const k of c.doorKeys) { const o = this.doors.get(k); if (o) { this.group.remove(o); this.doors.delete(k); } }
    c.doorKeys = [];
    const v = new ChunkView(this, c); v.lod = c.lodWant; c.lod = c.lodWant;
    const bk = new Buckets(), x0 = c.cx * CS4, z0 = c.cz * CS4, top = Math.min(H4 - 1, c.maxY + 1);
    for (let y = 0; y <= top; y++) for (let lz = 0; lz < CS4; lz++) for (let lx = 0; lx < CS4; lx++) {
      const i = (y * CS4 + lz) * CS4 + lx, t = c.t[i]; if (!t) continue;
      const x = x0 + lx, z = z0 + lz, m = c.m[i];
      if (BL[t].kind === 'door') { if (!hasLink(m, 1) && !hasLink(m, 3) && !hasLink(m, 5)) this.addDoor(c, x, y, z, m); continue; }
      emitCellAt(bk, v, x, y, z, t, m);
    }
    const keys = [...bk.m.keys()], out = [];
    const op = bucketsToMesh(bk, keys.filter(k => !TRANSPARENT.has(k)));
    if (op) { op.receiveShadow = true; out.push(op); }
    const tr = bucketsToMesh(bk, keys.filter(k => TRANSPARENT.has(k)));
    if (tr) { tr.receiveShadow = true; tr.renderOrder = 2; out.push(tr); }
    out.forEach(me => this.group.add(me));
    c.meshes = out; c.dirty = false;
  }
  addDoor(c, x, y, z, m) {
    const k = m & 3, o = buildModel('door', k, 1), wide = k % 2 === 0;
    o.scale.setScalar(2); o.position.set(x + (wide ? 1 : .5), y - (m & LOW ? .5 : 0), z + (wide ? .5 : 1));
    o.userData.cell = [x, y, z]; o.userData.center = [x + (wide ? 1 : .5), z + (wide ? .5 : 1)];
    o.traverse(n => { if (n.isMesh) n.castShadow = true; });
    const key = x + ',' + y + ',' + z; this.group.add(o); this.doors.set(key, o); c.doorKeys.push(key);
  }
  unload(c) {
    if (c.meshes) for (const me of c.meshes) { this.group.remove(me); me.geometry.dispose(); }
    for (const k of c.doorKeys) { const o = this.doors.get(k); if (o) { this.group.remove(o); this.doors.delete(k); } }
    c.meshes = null; c.doorKeys = []; c.dirty = true;
  }
  stream(fx, fz, budget = 6) {
    const t0 = performance.now(), ccx = Math.floor(fx / CS4), ccz = Math.floor(fz / CS4), R = this.R, key = ccx + ',' + ccz;
    if (key !== this.lastC) {
      this.lastC = key; this.order = [];
      for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) this.order.push([ccx + dx, ccz + dz, Math.max(Math.abs(dx), Math.abs(dz)), Math.hypot(dx, dz)]);
      this.order.sort((a, b) => a[3] - b[3]);
      for (const c of [...this.chunks.values()]) {
        const d = Math.max(Math.abs(c.cx - ccx), Math.abs(c.cz - ccz));
        if (d > R + 1 && c.meshes) this.unload(c);
        if (d > R + 2 && !this.saveQ.has(c.cx + ',' + c.cz)) { this.chunks.delete(c.cx + ',' + c.cz); if (this._lc === c) this._lc = null; }
      }
    }
    let done = true;
    for (const [cx, cz, d] of this.order) {
      if (performance.now() - t0 > budget) return false;
      let c = this.chunks.get(cx + ',' + cz);
      if (!c) { this.ensureData(cx, cz); done = false; continue; }
      if (d > R) continue;
      const lw = d <= 1 ? 0 : d >= 3 ? 1 : (c.meshes ? c.lod : 1);
      if (c.meshes && lw !== c.lod) c.dirty = true;
      c.lodWant = lw;
      if (!c.dirty || !this.neighborsReady(c)) continue;
      this.meshChunk(c); done = false;
    }
    for (const c of this.chunks.values()) if (c.meshes) { const d = Math.max(Math.abs(c.cx - ccx), Math.abs(c.cz - ccz)); for (const me of c.meshes) me.castShadow = d <= 1; }
    return done;
  }
  ready(x, z) { const c = this.chunkAt(x, z); return !!(c && c.meshes && !c.dirty); }
  progress(fx, fz) {
    const ccx = Math.floor(fx / CS4), ccz = Math.floor(fz / CS4); let n = 0, ok = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { n++; const c = this.chunks.get((ccx + dx) + ',' + (ccz + dz)); if (c && c.meshes) ok++; }
    return ok / n;
  }
  saveDirty(slot) {
    for (const k of this.saveQ) {
      const c = this.chunks.get(k); if (!c) continue;
      const e = { t: rleEnc(c.t), m: rleEnc(new Uint8Array(c.m.buffer)) };
      this.edits.set(k, e); IDB.put(slot + '|' + k, e);
    }
    this.saveQ.clear();
  }
  addAnimal(a) { a.ms = this.ms; a.obj.scale.setScalar(this.ms); this.animals.push(a); this.group.add(a.obj); }
  removeAnimal(a) { const i = this.animals.indexOf(a); if (i >= 0) this.animals.splice(i, 1); this.group.remove(a.obj); }
  dispose() { for (const c of this.chunks.values()) if (c.meshes) for (const me of c.meshes) me.geometry.dispose(); }
}

/* ---------- podgląd klocka (duch, ikonki) ---------- */
class MiniWorld {
  constructor() { this.c = new Map(); this.ms = 2; this.H = H4; this.chunkMode = true; }
  setc(x, y, z, t, m) { this.c.set(x + ',' + y + ',' + z, [t, m]); }
  get(x, y, z) { const v = this.c.get(x + ',' + y + ',' + z); return v ? v[0] : 0; }
  meta(x, y, z) { const v = this.c.get(x + ',' + y + ',' + z); return v ? v[1] : 0; }
  opaque(x, y, z) { const v = this.c.get(x + ',' + y + ',' + z); return !!v && BL[v[0]].kind === 'mat' && (v[1] & (7 << 2 | LOW)) === 0; }
  in() { return true; }
}
function meshCells(list) { // list: [[x,y,z,t,m], ...]
  const mw = new MiniWorld(), bk = new Buckets(), doors = [];
  for (const [x, y, z, t, m] of list) mw.setc(x, y, z, t, m);
  for (const [x, y, z, t, m] of list) {
    if (BL[t].kind === 'door') { if (!hasLink(m, 1) && !hasLink(m, 3) && !hasLink(m, 5)) doors.push([x, y, z, m]); continue; }
    emitCellAt(bk, mw, x, y, z, t, m);
  }
  const g = new THREE.Group();
  const keys = [...bk.m.keys()];
  if (keys.length) { const me = bucketsToMesh(bk, keys); me.castShadow = true; g.add(me); }
  for (const [x, y, z, m] of doors) {
    const k = m & 3, o = buildModel('door', k, 1), wide = k % 2 === 0;
    o.scale.setScalar(2); o.position.set(x + (wide ? 1 : .5), y - (m & LOW ? .5 : 0), z + (wide ? .5 : 1)); g.add(o);
  }
  return g;
}
function buildPieceObject(key, pk, ori) {
  const d = BL[BK[key]], L = pieceLayout(key, pk, ori), metas = withLinks(L.cells, L.base);
  return meshCells(L.cells.map((c, i) => [c[0], c[1], c[2], d.id, metas[i]]));
}
function buildFlag() {
  const g = new THREE.Group();
  g.add(mesh(geo('flagPole', () => new THREE.CylinderGeometry(.03, .04, 1.6, 8)), cmat('#f2ede4', { flat: false }), 0, .8, 0));
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.55, -.17); sh.lineTo(0, -.34); sh.closePath();
  const fl = mesh(geo('flag', () => new THREE.ShapeGeometry(sh)), new THREE.MeshLambertMaterial({ color: '#f29bb8', side: THREE.DoubleSide }), .03, 1.58, 0);
  g.add(fl); g.add(mesh(geo('flagTop', () => new THREE.SphereGeometry(.05, 10, 8)), cmat('#f9cf5a', { flat: false }), 0, 1.62, 0));
  g.userData.flag = fl; g.scale.setScalar(2);
  return g;
}
