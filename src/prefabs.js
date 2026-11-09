/* =========================================================
   GOTOWE ELEMENTY — budowle z tych samych klocków, stawiane jednym kliknięciem
   Układ: x w prawo, z do przodu (przód budowli = największe z), y = 0 to pierwsza warstwa nad ziemią.
   ========================================================= */
function prefabMaker() {
  const cells = new Map();
  const key = (x, y, z) => x + ',' + y + ',' + z;
  const M = {
    cells,
    has: (x, y, z) => cells.has(key(x, y, z)),
    reserve(x, y, z) { cells.set(key(x, y, z), null); },
    piece(item, pk, x, y, z, o = 0) {
      const L = pieceLayout(item, pk, o), cs = L.cells.map(c => [x + c[0], y + c[1], z + c[2]]), ms = withLinks(cs, L.base);
      cs.forEach((c, i) => cells.set(key(c[0], c[1], c[2]), [BK[item], ms[i]]));
    },
    cube(item, x, y, z) { const d = BL[BK[item]]; cells.set(key(x, y, z), [BK[item], d.kind === 'mat' && !d.nat ? 5 << 2 : 0]); },
    one(item, x, y, z, o = 0) { cells.set(key(x, y, z), [BK[item], BL[BK[item]].oriented ? o : 0]); },
  };
  return M;
}

const PREFABS = {
  house: {
    name: 'domek', found: true,
    make(M) {
      const W = 10, D = 8, H = 5, F = D - 1;
      // drzwi i okna najpierw, ściany omijają ich pola
      M.piece('door', '', 4, 0, F, 0);
      M.piece('window', '', 1, 1, F, 0); M.piece('window', '', 7, 1, F, 0);
      M.piece('window', '', 4, 1, 0, 0);
      M.piece('window', '', 0, 1, 3, 1); M.piece('window', '', W - 1, 1, 3, 1);
      for (let y = 0; y < H; y++) {
        const st = y % 2 === 1;
        M.row('brick', 0, 0, 0, W, y, st); M.row('brick', 0, F, 0, W, y, st);
        M.row('brick', 0, 1, 1, D - 2, y, !st); M.row('brick', W - 1, 1, 1, D - 2, y, !st);
      }
      // podłoga z desek
      for (let x = 1; x + 1 < W - 1; x += 2) for (let z = 1; z + 1 < F; z += 2) M.piece('planks', 'plytka', x, 0, z + 1, 0);
      // szczyty z tynku
      for (let k = 0; k < 4; k++) { M.row('plaster', 0, k, 1, D - 2 * k, H + k, false); M.row('plaster', W - 1, k, 1, D - 2 * k, H + k, false); }
      // dach: dwa skosy schodzące na boki, z okapem
      for (let k = 0; k < 5; k++) {
        for (let x = 0; x <= W; x += 2) M.piece('roofRed', 'skos', x, H + k, -1 + k, 2);
        for (let x = -1; x < W; x += 2) M.piece('roofRed', 'skos', x, H + k, D - k, 0);
      }
      // komin
      for (let y = H + 4; y < H + 7; y++) M.cube('stoneB', 7, y, 2);
    },
  },
  tower: {
    name: 'wieża', found: true, unlock: 5,
    make(M) {
      const S = 6, H = 13, F = S - 1;
      M.piece('door', '', 2, 0, F, 0);
      for (const y of [5, 9]) { M.piece('window', '', 2, y, F, 0); M.piece('window', '', 2, y, 0, 0); M.piece('window', '', 0, y, 2, 1); M.piece('window', '', F, y, 2, 1); }
      for (let y = 0; y < H; y++) {
        const st = y % 2 === 1;
        M.row('stoneB', 0, 0, 0, S, y, st); M.row('stoneB', 0, F, 0, S, y, st);
        M.row('stoneB', 0, 1, 1, S - 2, y, !st); M.row('stoneB', F, 1, 1, S - 2, y, !st);
      }
      for (let x = 1; x < F; x += 2) for (let z = 1; z < F; z += 2) M.piece('planks', 'plytka', x, 0, z + 1, 0);
      // podest na górze i blanki
      for (let x = 1; x < F; x += 2) for (let z = 1; z < F; z += 2) M.piece('planks', 'plytka', x, H - 1, z + 1, 0);
      for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) if ((x === 0 || z === 0 || x === F || z === F) && (x + z) % 2 === 0) M.cube('stoneB', x, H, z);
    },
  },
  bridge: {
    name: 'mostek', found: false, unlock: 3,
    make(M) {
      const Wd = 5, L = 16, prof = [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0];
      for (let z = 0; z < L; z++) {
        const y = prof[z];
        M.row('planks', 0, z, 0, Wd, y, z % 2 === 1);
        if (z >= 1 && z <= L - 2) { M.one('fence', 0, y + 1, z); M.one('fence', Wd - 1, y + 1, z); }
        // podpory pod wyższą częścią
        for (let yy = 0; yy < y; yy++) if (z === 4 || z === L - 5) { M.cube('log', 0, yy, z); M.cube('log', Wd - 1, yy, z); }
      }
    },
  },
  pen: {
    name: 'zagroda', found: false,
    make(M) {
      const W = 12, D = 10;
      for (let x = 0; x < W; x++) for (const z of [0, D - 1]) if (!(z === D - 1 && (x === 5 || x === 6))) M.one('fence', x, 0, z);
      for (let z = 1; z < D - 1; z++) { M.one('fence', 0, 0, z); M.one('fence', W - 1, 0, z); }
      M.one('bench', 2, 0, 2, 2); M.one('bush', W - 2, 0, 1); M.one('flowers', W - 3, 0, 1); M.one('tree', W - 3, 0, D - 4);
    },
  },
  garden: {
    name: 'ogródek', found: false,
    make(M) {
      const W = 9, D = 7;
      for (let x = 0; x < W; x++) for (const z of [0, D - 1]) if (!(z === D - 1 && x === 4)) M.cube('hedge', x, 0, z);
      for (let z = 1; z < D - 1; z++) { M.cube('hedge', 0, 0, z); M.cube('hedge', W - 1, 0, z); }
      for (let z = 1; z < D - 1; z++) M.reserve(4, 0, z);
      for (let x = 1; x < W - 1; x++) for (let z = 1; z < D - 1; z++) if (x !== 4 && (x + z) % 2 === 0) M.one('flowers', x, 0, z);
      M.one('bench', 2, 0, 1, 2); M.one('lamp', 6, 0, 1); M.one('bush', 7, 0, 4); M.one('mushroom', 1, 0, 4);
    },
  },
  playground: {
    name: 'plac zabaw', found: false,
    make(M) {
      M.one('slide', 2, 0, 2, 1); M.one('swing', 8, 0, 2, 0);
      // piaskownica z desek
      for (let x = 1; x <= 5; x++) for (const z of [5, 9]) M.cube('planks', x, 0, z);
      for (let z = 6; z <= 8; z++) { M.cube('planks', 1, 0, z); M.cube('planks', 5, 0, z); for (let x = 2; x <= 4; x++) M.one('sand', x, 0, z); }
      M.one('bench', 8, 0, 8, 2); M.one('bench', 10, 0, 8, 2); M.one('lamp', 7, 0, 6); M.one('tree', 11, 0, 0); M.one('flowers', 0, 0, 0); M.one('bush', 11, 0, 5);
    },
  },
  farm: {
    name: 'farma', found: false,
    make(M) {
      const W = 13, D = 11;
      for (let x = 0; x < W; x++) for (const z of [0, D - 1]) if (!(z === D - 1 && (x === 6 || x === 7))) M.one('fence', x, 0, z);
      for (let z = 1; z < D - 1; z++) { M.one('fence', 0, 0, z); M.one('fence', W - 1, 0, z); }
      for (let x = 1; x <= 4; x++) for (let z = 1; z <= 8; z++) if (z % 2) M.one('carrots', x, 0, z);
      for (let x = 7; x <= 11; x++) for (let z = 1; z <= 4; z++) M.one('wheat', x, 0, z);
      M.one('well', 10, 0, 7); M.one('barrel', 11, 0, 8); M.one('barrel', 11, 0, 6); M.one('chest', 8, 0, 8, 2);
    },
  },
  stall: {
    name: 'stragan', found: false,
    make(M) {
      for (const [x, z] of [[0, 0], [5, 0], [0, 3], [5, 3]]) for (let y = 0; y < 4; y++) M.piece('log', 'slupek', x, y, z);
      M.row('planks', 1, 3, 0, 4, 0, false); M.row('planks', 1, 3, 0, 4, 1, false);
      for (let x = 0; x < 6; x += 2) for (let z = 0; z < 4; z += 2) M.piece(((x + z) / 2) % 2 ? 'white' : 'pink', 'plytka', x, 4, z + 1, 0);
      M.one('carrots', 1, 2, 3); M.one('pot', 3, 2, 3); M.one('flowers', 4, 2, 3); M.one('barrel', 6, 0, 1); M.one('chest', 2, 0, 1, 0);
    },
  },
  castle: {
    name: 'zamek', found: true, unlock: 8,
    make(M) {
      const S = 18, F = S - 1, H = 7, T = 4, TH = 11;
      // brama z łukami w przedniej ścianie
      for (let y = 0; y < 5; y++) { M.reserve(8, y, F); M.reserve(9, y, F); }
      M.piece('stoneB', 'luk', 8, 4, F, 3); M.piece('stoneB', 'luk', 9, 4, F, 1);
      for (let y = 0; y < H; y++) {
        const st = y % 2 === 1;
        M.row('stoneB', T, 0, 0, S - 2 * T, y, st); M.row('stoneB', T, F, 0, S - 2 * T, y, st);
        M.row('stoneB', 0, T, 1, S - 2 * T, y, !st); M.row('stoneB', F, T, 1, S - 2 * T, y, !st);
      }
      for (let i = T; i < S - T; i++) if (i % 2 === 0) { M.cube('stoneB', i, H, 0); M.cube('stoneB', i, H, F); M.cube('stoneB', 0, H, i); M.cube('stoneB', F, H, i); }
      // cztery wieże w rogach
      for (const [ox, oz] of [[0, 0], [S - T, 0], [0, S - T], [S - T, S - T]]) {
        for (let y = 0; y < TH; y++) {
          const st = y % 2 === 1;
          M.row('stoneB', ox, oz, 0, T, y, st); M.row('stoneB', ox, oz + T - 1, 0, T, y, st);
          M.row('stoneB', ox, oz + 1, 1, T - 2, y, !st); M.row('stoneB', ox + T - 1, oz + 1, 1, T - 2, y, !st);
        }
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) if ((x === 0 || z === 0 || x === T - 1 || z === T - 1) && (x + z) % 2 === 0) M.cube('stoneB', ox + x, TH, oz + z);
      }
      M.one('flowers', 5, 0, 5); M.one('tree', 12, 0, 6); M.one('bench', 6, 0, 12, 1); M.one('lamp', 11, 0, 12);
    },
  },
};
for (const k in PREFABS) PREFABS[k].key = '!' + k;

// komórki gotowca po obrocie o rot ćwiartek, wyśrodkowane w poziomie: { list:[[x,y,z,t,m]], clear:[[x,y,z]], foot:[[x,z]], box }
const PREFAB_CACHE = {};
function prefabCells(name, rot = 0) {
  const ck = name + '|' + rot; if (PREFAB_CACHE[ck]) return PREFAB_CACHE[ck];
  const P = PREFABS[name], M = prefabMaker();
  // obrót: (x, z) -> (-z, x) i orientacja +1 — spójne z RIGHT/FWD, więc wystarczy obrócić kotwice
  const tr = (x, z) => { for (let i = 0; i < rot; i++) [x, z] = [-z, x]; return [x, z]; };
  const R = {
    cells: M.cells, has: (x, y, z) => { const [a, b] = tr(x, z); return M.has(a, y, b); },
    reserve: (x, y, z) => { const [a, b] = tr(x, z); M.reserve(a, y, b); },
    piece: (item, pk, x, y, z, o = 0) => { const [a, b] = tr(x, z); M.piece(item, pk, a, y, b, (o + rot) % 4); },
    cube: (item, x, y, z) => { const [a, b] = tr(x, z); M.cube(item, a, y, b); },
    one: (item, x, y, z, o = 0) => { const [a, b] = tr(x, z); M.one(item, a, y, b, (o + rot) % 4); },
  };
  R.row = (item, x0, z0, axis, len, y, stagger) => {
    const at = i => axis === 0 ? [x0 + i, z0] : [x0, z0 + i];
    let i = 0;
    if (stagger && len > 1 && !R.has(at(0)[0], y, at(0)[1])) { R.piece(item, 'kostka', at(0)[0], y, at(0)[1]); i = 1; }
    for (; i < len; i++) {
      const [x, z] = at(i); if (R.has(x, y, z)) continue;
      const [x2, z2] = at(i + 1);
      // cegiełka zawsze od mniejszej współrzędnej: kotwica w (x,z), druga połowa w (x2,z2)
      if (i + 1 < len && !R.has(x2, y, z2)) {
        const [a, b] = tr(x, z), [a2, b2] = tr(x2, z2), cs = [[a, y, b], [a2, y, b2]], ms = withLinks(cs, 5 << 2);
        cs.forEach((c, j) => M.cells.set(c.join(','), [BK[item], ms[j]])); i++;
      } else R.piece(item, 'kostka', x, y, z);
    }
  };
  P.make(R);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, h = 0;
  for (const k of M.cells.keys()) { const [x, y, z] = k.split(',').map(Number); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); h = Math.max(h, y + 1); }
  const ox = -Math.floor((x0 + x1) / 2), oz = -Math.floor((z0 + z1) / 2), list = [], foot = new Set();
  for (const [k, v] of M.cells) {
    if (!v) continue;
    const [x, y, z] = k.split(',').map(Number);
    list.push([x + ox, y, z + oz, v[0], v[1]]);
    if (y === 0) foot.add((x + ox) + ',' + (z + oz));
  }
  const filled = new Set(list.map(c => c[0] + ',' + c[1] + ',' + c[2])), clear = [];
  for (let x = x0 + ox; x <= x1 + ox; x++) for (let z = z0 + oz; z <= z1 + oz; z++) for (let y = 0; y < h; y++) if (!filled.has(x + ',' + y + ',' + z)) clear.push([x, y, z]);
  const res = { list, clear, foot: [...foot].map(s => s.split(',').map(Number)), box: [x0 + ox, 0, z0 + oz, x1 + ox + 1, h, z1 + oz + 1], found: P.found };
  PREFAB_CACHE[ck] = res;
  return res;
}
function buildPrefabObject(name, rot = 0) { return meshCells(prefabCells(name, rot).list); }
