/* ---------- chodzenie: wyszukiwanie drogi ---------- */
const HEAD = Math.ceil(P_H);
function pCanStand(w, x, y, z) {
  if (y < 1 || y >= w.H - HEAD || !w.in(x, y, z)) return false;
  for (let k = 0; k < HEAD; k++) if (cellBoxes(w, x, y + k, z)) return false;
  return !!cellBoxes(w, x, y - 1, z) || w.get(x, y - 1, z) === BK.water || w.get(x, y, z) === BK.water;
}
function standNear(w, x, z, fromY) {
  for (const dy of [0, 1, -1, 2, -2, -3, 3, -4, 4, -5, -6]) if (pCanStand(w, x, fromY + dy, z)) return fromY + dy;
  return null;
}
function stepTo(w, x, y, z, nx, nz) {
  for (const dy of [0, 1, -1, 2, -2, -3, -4, -5, -6]) {
    if (dy > 0) { let ok = true; for (let k = 0; k < dy; k++) if (cellBoxes(w, x, y + HEAD + k, z)) ok = false; if (!ok) continue; }
    if (pCanStand(w, nx, y + dy, nz)) return y + dy;
  }
  return null;
}
const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function findPath(w, sx, sy, sz, tx, ty, tz) {
  const K = (x, z) => (x - sx + 4096) * 8192 + (z - sz + 4096), start = K(sx, sz), goal = K(tx, tz);
  if (start === goal) return [{ x: tx, y: ty, z: tz }];
  if (Math.abs(tx - sx) > 90 || Math.abs(tz - sz) > 90) return null;
  const open = [{ x: sx, y: sy, z: sz, g: 0, f: Math.hypot(tx - sx, tz - sz) }];
  const gS = new Map([[start, 0]]), came = new Map(), pos = new Map([[start, [sx, sy, sz]]]);
  for (let it = 0; open.length && it < 9000; it++) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const c = open.splice(bi, 1)[0], ck = K(c.x, c.z);
    if (ck === goal) {
      const path = []; let k = goal;
      while (k !== start) { const p = pos.get(k); path.push({ x: p[0], y: p[1], z: p[2] }); k = came.get(k); }
      return path.reverse();
    }
    if (c.g > gS.get(ck)) continue;
    for (const [dx, dz] of DIR8) {
      const nx = c.x + dx, nz = c.z + dz;
      if (Math.abs(nx - sx) > 100 || Math.abs(nz - sz) > 100) continue;
      const ny = stepTo(w, c.x, c.y, c.z, nx, nz);
      if (ny === null) continue;
      if (dx && dz && (stepTo(w, c.x, c.y, c.z, c.x + dx, c.z) === null || stepTo(w, c.x, c.y, c.z, c.x, c.z + dz) === null)) continue;
      const g = c.g + (dx && dz ? 1.414 : 1) + (w.get(nx, ny, nz) === BK.water ? 2 : 0) + (ny > c.y ? .5 : 0), nk = K(nx, nz);
      if (gS.has(nk) && gS.get(nk) <= g) continue;
      gS.set(nk, g); came.set(nk, ck); pos.set(nk, [nx, ny, nz]);
      open.push({ x: nx, y: ny, z: nz, g, f: g + Math.hypot(tx - nx, tz - nz) });
    }
  }
  return null;
}
function surfaceY(w, x, z) {
  for (let y = w.H - 1; y >= 0; y--) if (cellBoxes(w, x, y, z) || w.get(x, y, z) === BK.water) return y + 1;
  return 1;
}
function terrainTop(w, x, z) {
  if (!w.chunkAt(x, z)) return null;
  for (let y = w.H - 1; y >= 0; y--) if (w.opaque(x, y, z) || w.get(x, y, z) === BK.water) return y + 1;
  return 0;
}
const HOLD = .35;
const VIEWS = [{ pitch: .95, em: '📐', say: 'Widok z ukosa' }, { pitch: 1.34, em: '🗺️', say: 'Widok z góry' }, { pitch: .42, em: '👀', say: 'Widok z boku' }];
function floorTop(w, x, y, z) {
  const bs = cellBoxes(w, x, y - 1, z);
  return bs ? y - 1 + Math.max(...bs.map(b => b[4])) : y;
}
function klockiWord(n) { const a = n % 10, b = n % 100; if (n === 1) return 'klocek'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'klocki'; return 'klocków'; }
const isBlock = k => k[0] !== '@' && k[0] !== '!' && k[0] !== '~';
const isPieceItem = k => isBlock(k) && BL[BK[k]].kind === 'mat' && !BL[BK[k]].nat;
const draggable = k => isBlock(k) && ['mat', 'fence', 'water'].includes(BL[BK[k]].kind);

/* ---------- samouczek czytany na głos ---------- */
const TUT = [
  { id: 'walk', em: '🚶', say: 'Cześć! To twój ludzik. Chodź strzałkami albo kliknij w trawę, a ludzik sam tam pójdzie.', t: 'Cześć! To twój ludzik. Dotknij trawy, a ludzik sam tam pójdzie. Możesz też chodzić kółkiem w rogu.' },
  { id: 'mode', em: '🔨', say: 'Świetnie! Teraz naciśnij duży przycisk Buduj.', hl: '#b3-tobuild' },
  { id: 'place', em: '🧱', say: 'Kliknij w trawę, żeby postawić cegiełkę.', t: 'Dotknij trawy, żeby postawić cegiełkę.' },
  { id: 'drag', em: '👉', say: 'Brawo! Teraz przytrzymaj przycisk myszki na trawie, aż pojawi się żółta liczba, i dopiero wtedy przeciągnij. Postawisz cały rząd. Szybkie przeciągnięcie obraca widok.', t: 'Brawo! Teraz przytrzymaj palec na trawie, aż pojawi się żółta liczba, i dopiero wtedy przesuń. Postawisz cały rząd. Szybkie przesunięcie palcem obraca widok.' },
  { id: 'erase', em: '✋', say: 'Prawym przyciskiem myszki zabierasz klocek. Spróbuj!', t: 'Żeby zabrać klocek, wybierz na dole Zabierz i dotknij klocka. Spróbuj!', hlT: '[data-tool="erase"]' },
  { id: 'walk2', em: '🚶', say: 'Naciśnij Spacer, żeby znowu pospacerować.', hl: '#b3-towalk' },
  { id: 'end', em: '⭐', say: 'Super! Świat nie ma końca, możesz iść, gdzie chcesz. Strzałka w rogu pokazuje drogę. Mieszkańcy z wykrzyknikiem nad głową mają dla ciebie misje!' },
];

/* ---------- życie w świecie: motyle przy ziemi i ptaki wysoko na niebie ---------- */
const Life = {
  bugs: [], birds: [],
  init(scene) {
    this.g = new THREE.Group(); scene.add(this.g);
    const wingG = new THREE.CircleGeometry(.24, 10); wingG.scale(1, .8, 1); wingG.translate(.2, 0, 0); wingG.rotateX(-PI / 2);
    const cols = ['#f7a8bd', '#fbd46d', '#a8cef2', '#c9a8f2', '#ffffff', '#f6a38f', '#b9e6a5'];
    const bodyG = new THREE.CapsuleGeometry(.03, .2, 2, 6); bodyG.rotateX(PI / 2);
    for (let i = 0; i < 7; i++) {
      const c = cols[i % cols.length], m = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, emissive: new THREE.Color(c).multiplyScalar(.3) });
      const o = new THREE.Group(), L = new THREE.Mesh(wingG, m), R = new THREE.Mesh(wingG, m); R.scale.x = -1;
      o.add(L, R, new THREE.Mesh(bodyG, cmat('#5a4b5c'))); o.visible = false; this.g.add(o);
      this.bugs.push({ o, L, R, pos: new V3(), tgt: new V3(), ph: Math.random() * 9, t: 0, live: false });
    }
    const bw = new THREE.BufferGeometry(); bw.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.35, 0, 0, .3, 1.5, 0, .1], 3)); bw.computeVertexNormals();
    const bm = new THREE.MeshBasicMaterial({ color: '#7d8292', side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const o = new THREE.Group(), L = new THREE.Mesh(bw, bm), R = new THREE.Mesh(bw, bm); R.scale.x = -1;
      o.add(L, R, new THREE.Mesh(new THREE.SphereGeometry(.22, 6, 4), bm)); o.scale.setScalar(1.3); this.g.add(o);
      this.birds.push({ o, L, R, a: i * .42, r: 34 + (i % 3) * 5, dh: (i % 2) * 3, ph: i * 1.7 });
    }
  },
  pick(w, near, rad, b) {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * PI * 2, r = rad[0] + Math.random() * (rad[1] - rad[0]), x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
      const h = terrainTop(w, Math.floor(x), Math.floor(z));
      if (h === null || w.get(Math.floor(x), h - 1, Math.floor(z)) === BK.water) continue;
      b.set(x, h + 1.2 + Math.random() * 2.2, z); return true;
    }
    return false;
  },
  update(dt, time, w, focus) {
    const low = !!settings.lowGfx;
    this.bugs.forEach((b, i) => {
      if (low && i > 1) { b.o.visible = false; return; }
      if (!b.live || b.pos.distanceTo(focus) > 36) { if (!this.pick(w, focus, [6, 20], b.pos)) return; b.tgt.copy(b.pos); b.live = true; b.o.visible = true; }
      b.t -= dt;
      if (b.t <= 0 || b.pos.distanceTo(b.tgt) < .4) { this.pick(w, b.pos.distanceTo(focus) > 22 ? focus : b.pos, [2, 7], b.tgt); b.t = 2 + Math.random() * 3; }
      const d = b.tgt.clone().sub(b.pos), l = d.length();
      if (l > .01) { b.pos.addScaledVector(d, Math.min(1, 2.2 * dt / l)); b.o.rotation.y = angLerp(b.o.rotation.y, Math.atan2(d.x, d.z), Math.min(1, dt * 4)); }
      b.o.position.set(b.pos.x, b.pos.y + Math.sin(time * 3 + b.ph) * .25, b.pos.z);
      const f = Math.sin(time * 17 + b.ph) * .9; b.L.rotation.z = f; b.R.rotation.z = -f;
    });
    this.birds.forEach((b, i) => {
      b.o.visible = !low;
      if (low) return;
      b.a += dt * (.18 + (i % 3) * .02);
      const x = focus.x + Math.cos(b.a) * b.r, z = focus.z + Math.sin(b.a) * b.r;
      b.o.position.set(x, focus.y + 30 + b.dh + Math.sin(time * .5 + b.ph) * 1.5, z);
      b.o.rotation.y = -b.a;
      const f = Math.sin(time * 4 + b.ph) * .5; b.L.rotation.z = f; b.R.rotation.z = -f;
    });
  },
};
function applyQuality() {
  const low = !!settings.lowGfx;
  WIND.uAmp.value = low ? 0 : 1;
  if (Engine.ok) { Engine.r.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)); Engine.resize(); }
  for (const S of [Build3, Menu3]) if (S.env && S.env.sun) S.env.sun.castShadow = !low;
  if (Build3.world) Build3.world.R = low ? 2 : VIEW_R;
  if (Build3.scene && Build3.scene.fog) { Build3.scene.fog.near = low ? 30 : 42; Build3.scene.fog.far = low ? 68 : 100; }
}

/* =========================================================
   TRYB BUDOWANIA 3D — Spacer i Budowanie, świat bez granic
   ========================================================= */
const CAMW = { pitch: .42, dist: 16 }, CAMB = { pitch: .95, dist: 30 };
const Build3 = {
  slot: 0, world: null, ready: false, mode: 'walk', tool: 'build', group: 'build', itemBy: {}, cat: 0, item: 'brick', piece: 'cegielka', rotOff: 0, undo: [], keys: {},
  mouse: { x: 0, y: 0, in: false }, mclient: { x: 0, y: 0 }, drag: null, pl: null, hit: null, saveAcc: 0, dirty: false,
  shirtIdx: 0, ghostKey: '', path: null, pathI: 0, pathStuck: 0, camUserT: -9, lastMouseMove: 0, panning: false,
  home: null, tutI: -1, walkCam: null,
  on(ev, fn) { (this.evs[ev] || (this.evs[ev] = [])).push(fn); },
  emit(ev, data) { (this.evs[ev] || []).forEach(f => { try { f(data); } catch (e) { console.error(e); } }); },
  evs: {},
  init() {
    if (!Engine.ok) return;
    const s = this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, 1, .2, 900);
    this.env = makeEnv(s, { cx: 0, cz: 0, fogNear: 42, fogFar: 100, shadowR: 40, sunOff: [44, 80, 28], roam: true });
    Parts3.init(s);
    this.ghost = new THREE.Group(); s.add(this.ghost);
    this.rectG = new THREE.Group(); this.rectG.visible = false; s.add(this.rectG);
    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95 }));
    this.outline.visible = false; s.add(this.outline);
    // dotyk: strzałka nad miejscem, gdzie stanie klocek (palec zasłania podgląd pod sobą)
    {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffc83d, depthTest: false, transparent: true }), rim = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.42, .9, 20), mat); cone.rotation.x = Math.PI; cone.position.y = .45;
      const edge = new THREE.Mesh(new THREE.ConeGeometry(.52, 1.08, 20), rim); edge.rotation.x = Math.PI; edge.position.y = .5;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12), mat); ball.position.y = 1.15;
      const ballE = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), rim); ballE.position.y = 1.15;
      this.pin = new THREE.Group(); [edge, ballE, cone, ball].forEach((m, i) => { m.renderOrder = 998 + (i > 1 ? 1 : 0); this.pin.add(m); });
      this.pin.visible = false; s.add(this.pin);
    }
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false });
    this.boxGeo = new THREE.BoxGeometry(1.03, 1.03, 1.03); this.boxGeo.translate(.5, .5, .5);
    this.markMat = {
      erase: new THREE.MeshBasicMaterial({ color: 0xff8a7a, transparent: true, opacity: .42, depthWrite: false }),
      paint: new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: .42, depthWrite: false }),
    };
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.5, .8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }));
    this.ring.rotation.x = -PI / 2; this.ring.visible = false; s.add(this.ring);
    this.flag = buildFlag(); s.add(this.flag);
    this.player = new Player(); s.add(this.player.obj);
    Life.init(s); Missions.init(s);
    this.bfocus = new V3(); this.lastP = new V3();
    this.ray = new THREE.Raycaster();
    this.bindUI(); this.bindInput();
  },
  open(slot, newKind) {
    if (!Engine.ok) { no3d(); return; }
    this.openAsync(slot, newKind);
  },
  async openAsync(slot, newKind) {
    this.slot = slot; this.ready = false;
    const meta = newKind ? null : Store.get('w4_' + slot, null);
    const P = meta && meta.P ? meta.P : { seed: 1 + Math.floor(Math.random() * 999999), kind: newKind || 'island', sx: 0, sz: 0 };
    this.meta0 = meta;
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); this.world = null; }
    Missions.reset();
    this.undo = []; this.keys = {}; this.rotOff = 0; this.mode = 'walk'; this.stopPath(); this.clearRect(); this.tutI = -1;
    show('build'); this.loading(0); this.renderHud();
    if (newKind) await IDB.delPrefix(slot + '|');
    const edits = newKind ? new Map() : await IDB.loadPrefix(slot + '|');
    const w = new InfWorld(P, edits);
    this.world = w; this.scene.add(w.group);
    const sp = meta && meta.p ? meta.p : [P.sx + .5, 40, P.sz + .5];
    this.player.pos.set(sp[0], sp[1], sp[2]); this.player.vel.set(0, 0, 0); this.player.yaw = meta && meta.p ? (meta.p[3] || 0) : PI;
    this.bfocus.set(sp[0], 20, sp[2]);
  },
  finishLoad() {
    const w = this.world, P = w.P, meta = this.meta0;
    if (!meta || !meta.p) this.player.spawn(w, [P.sx + .5, 0, P.sz + .5]);
    else if (overlaps(w, this.player.pos.x - P_R, this.player.pos.y, this.player.pos.z - P_R, this.player.pos.x + P_R, this.player.pos.y + P_H, this.player.pos.z + P_R).length) this.teleportNear(this.player.pos.x, this.player.pos.z);
    const p = this.player.pos;
    this.home = (meta && meta.home) || [p.x, p.y, p.z];
    { const fx = Math.floor(this.home[0]) + 4, fz = Math.floor(this.home[2]) - 4; this.flag.position.set(fx + .5, surfaceY(w, fx, fz), fz + .5); }
    if (meta && meta.a) meta.a.forEach(([k, x, y, z]) => { if (ANIM3[k]) w.addAnimal(new Animal3(k, x, y, z)); });
    else this.spawnAnimals();
    Missions.load(meta && meta.mis);
    this.player.setLook(meta && meta.look ? meta.look : { shirt: SHIRTS[(meta && meta.shirt) || 0] });
    if (meta && meta.cam) [Cam.yaw, Cam.pitch, Cam.dist] = meta.cam; else { Cam.yaw = this.player.yaw + PI; Cam.pitch = CAMW.pitch; Cam.dist = CAMW.dist; }
    Cam.free = false; Cam.snap(this.player.focus());
    this.ready = true; this.loading(-1);
    if (!meta) this.save(false);
    if (!Store.get('tut4', false)) setTimeout(() => this.tutStart(), 400);
    else Voice.say('Spacer. Naciśnij Buduj, kiedy chcesz budować.');
  },
  spawnAnimals() {
    const w = this.world, h = this.home;
    const place = (k, dx, dz) => {
      const x = Math.floor(h[0]) + dx, z = Math.floor(h[2]) + dz, y = surfaceY(w, x, z);
      if (w.get(x, y - 1, z) === BK.grass && !w.get(x, y, z) && !w.get(x, y + 1, z)) { w.addAnimal(new Animal3(k, x, y, z)); return true; }
      return false;
    };
    place('dog', 4, 3) || place('dog', -4, 3);
    for (let i = 0; i < 20 && w.animals.length < 4; i++) { const a = Math.random() * PI * 2, r = 8 + Math.random() * 12; place('sheep', Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)); }
  },
  loading(p) {
    const el = $('#b3-loading');
    if (p < 0) { el.classList.remove('on'); return; }
    el.classList.add('on'); $('#b3-loadbar').style.width = Math.round(p * 100) + '%';
  },
  resize() { Engine.resize(); },
  onShow() { if (Engine.ok) Engine.attach($('#build-host'), this.scene, this.cam); },
  onHide() { if (this.ready) this.save(true); this.keys = {}; this.drag = null; },

  /* ----- interfejs ----- */
  bindUI() {
    $('#b3-home').innerHTML = ICON.home; $('#b3-undo').innerHTML = ICON.undo;
    $('#b3-camL').innerHTML = ICON.rotL; $('#b3-camR').innerHTML = ICON.rotR;
    $('#b3-compass').innerHTML = '<svg viewBox="0 0 40 40"><path d="M20 4 30 30 20 24 10 30z" fill="#f29b6b" stroke="#c96f45" stroke-width="2" stroke-linejoin="round"/></svg><span>🏠</span>';
    $('#b3-home').onclick = () => show('menu');
    $('#b3-undo').onclick = () => this.doUndo();
    $('#b3-camL').onclick = () => { Cam.yaw += PI / 4; this.camUserT = now(); Snd.click(); };
    $('#b3-camR').onclick = () => { Cam.yaw -= PI / 4; this.camUserT = now(); Snd.click(); };
    $('#b3-catbtn').onclick = () => { $('#b3-cats').classList.toggle('open'); Snd.click(); };
    this.bindJoy();
    $('#b3-zin').onclick = () => { this.zoom(1 / 1.35); Snd.click(); };
    $('#b3-zout').onclick = () => { this.zoom(1.35); Snd.click(); };
    $('#b3-view').onclick = () => this.nextView();
    $('#b3-shirt').onclick = () => this.wardrobe();
    $('#b3-help').onclick = () => this.help();
    $('#b3-tobuild').onclick = () => this.setMode('build');
    $('#b3-towalk').onclick = () => this.setMode('walk');
    $('#b3-tohome').onclick = () => this.goHome();
    $('#b3-compass').onclick = () => { if (Missions.target()) Missions.showWay(); else this.goHome(); };
    $('#b3-book').onclick = () => Missions.book();
    $('#b3-quest').onclick = () => {
      const A = Missions.active; if (!A) return;
      const k = Missions.needItem();
      if (k && !Missions.holds(k) && Missions.takeNeeded()) Voice.say(k === '#erase' ? 'Masz Zabierz. Dotknij drzewa.' : A.steps[A.si].type === 'blueprint' ? 'Weź: ' + itemInfo(k).name + '. Postaw go tam, gdzie miga strzałka.' : 'Masz: ' + itemInfo(k).name + '.', true);
      else Voice.say(Missions.stepText(A), true);
    };
    $$('#b3-tools [data-group]').forEach(b => b.onclick = () => this.setGroup(b.dataset.group));
    const items = $('#b3-items');
    items.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { items.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    $('#scr-build').addEventListener('click', e => { if (e.target.closest('button,.ptile')) setTimeout(() => { const a = document.activeElement; if (a && a.blur) a.blur(); }, 0); });
  },
  bindInput() {
    const host = $('#build-host');
    host.addEventListener('contextmenu', e => e.preventDefault());
    this.ptrs = new Map();
    const two = () => { const [a, b] = [...this.ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    host.addEventListener('pointerdown', e => {
      $('#b3-cats').classList.remove('open');
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ready && this.ptrs.size === 2) {
        // dwa palce: szczypanie = przybliżanie, obrót palcami = obrót widoku, przesuwanie = przesuwanie widoku
        if (this.drag) { this.drag = null; this.clearRect(); }
        try { host.setPointerCapture(e.pointerId); } catch (_) {}
        const g = two(); this.gest = { ...g, dist: Cam.dist, yaw: Cam.yaw, pitch: Cam.pitch, lmx: g.mx, lmy: g.my };
        return;
      }
      if (this.ptrs.size > 2 || this.gest) return;
      if (!this.ready || this.drag) return;
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
      this.setMouse(e); Snd.ensure();
      this.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, btn: e.button, moved: false, rs: null, t0: now(), ts: e.timeStamp, timer: false, touch: e.pointerType === 'touch' };
      if (this.mode === 'build' && e.button === 0) {
        this.updateTarget();
        // dotyk: cel z chwili dotknięcia; drżenie palca podczas przytrzymania nie przesuwa początku rzędu na sąsiednią kratkę
        if (this.drag.touch) this.drag.frozen = true;
        // Shift + przeciągnięcie: rząd od razu (bez czekania)
        if (e.shiftKey) this.armRect();
      }
    });
    host.addEventListener('pointermove', e => {
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.gest) {
        if (this.ptrs.size < 2) return;
        const g = two(), G = this.gest, build = this.mode === 'build';
        Cam.dist = clamp(G.dist * G.d / Math.max(20, g.d), build ? 8 : 5, build ? 80 : 40);
        let da = g.a - G.a; da = ((da + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
        Cam.yaw = G.yaw - da;
        if (build) this.panBy(g.mx - G.lmx, g.my - G.lmy);
        else Cam.pitch = clamp(G.pitch + (g.my - (G.my)) * .005, .08, 1.38);
        G.lmx = g.mx; G.lmy = g.my; this.camUserT = now();
        return;
      }
      this.setMouse(e); this.lastMouseMove = now();
      const d = this.drag; if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
        d.moved = true;
        // o tym, czy to obrót, czy rząd, decyduje czas od wciśnięcia do pierwszego ruchu (znacznik czasu zdarzenia)
        const held = e.timeStamp - d.ts >= HOLD * 1000;
        if (d.rs && d.timer && !held) { d.rs = null; this.clearRect(); }
        else if (!d.rs && held && this.mode === 'build' && d.btn === 0) this.armRect();
      }
      if (d.moved) {
        const mx = e.clientX - d.lx, my = e.clientY - d.ly;
        if (d.rs) this.rectMove(d.rs);
        else if (d.btn === 1 && this.mode === 'build') this.panBy(mx, my);
        else this.rotateBy(mx, my);
      }
      d.lx = e.clientX; d.ly = e.clientY;
    });
    host.addEventListener('pointerup', e => {
      this.ptrs.delete(e.pointerId);
      if (this.gest) { if (this.ptrs.size < 2) this.gest = null; this.drag = null; return; }
      const d = this.drag; this.drag = null; if (!d) return;
      if (d.rs && d.moved) { this.rectApply(d.rs); return; }
      this.clearRect();
      if (d.moved) return;
      if (this.mode === 'walk') { if (d.btn === 0) this.walkClick(); return; }
      if (d.btn === 2) { if (now() - d.t0 < .6) this.click('erase'); }
      else if (d.btn === 0) this.click(this.tool);
    });
    host.addEventListener('pointercancel', e => { this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.gest = null; this.drag = null; this.clearRect(); });
    host.addEventListener('pointerleave', () => { if (!this.drag) this.mouse.in = false; });
    host.addEventListener('wheel', e => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      this.setMouse(e);
      this.zoom(Math.exp(clamp(dy, -150, 150) * .0015), true);
    }, { passive: false });
    window.addEventListener('keydown', e => this.key(e, true));
    window.addEventListener('keyup', e => this.key(e, false));
    window.addEventListener('blur', () => { this.keys = {}; });
  },
  // kółko do chodzenia i przycisk skoku (ekran dotykowy)
  bindJoy() {
    const joy = $('#b3-joy'), knob = joy.querySelector('.joy-k'), R = 46;
    let id = null, c = null;
    const set = (x, y) => {
      let dx = x - c.x, dy = y - c.y; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const ax = dx / R, az = dy / R, mag = Math.hypot(ax, az);
      this.keys.ax = mag > .15 ? ax : 0; this.keys.az = mag > .15 ? az : 0;
      if (mag > .15) { this.stopPath(); this.camUserT = now() - 1; }
    };
    joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (id !== null) return; id = e.pointerId; try { joy.setPointerCapture(id); } catch (_) {} const r = joy.getBoundingClientRect(); c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; set(e.clientX, e.clientY); Snd.ensure(); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === id) set(e.clientX, e.clientY); });
    const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.keys.ax = this.keys.az = 0; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    const jb = $('#b3-jump');
    jb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.keys.jump = true; Snd.ensure(); });
    const jEnd = () => { this.keys.jump = false; };
    jb.addEventListener('pointerup', jEnd); jb.addEventListener('pointercancel', jEnd); jb.addEventListener('pointerleave', jEnd);
  },
  // przytrzymanie przycisku w miejscu: gotowość do przeciągania rzędu
  armRect() {
    const d = this.drag; if (!d || d.rs) return false;
    const rs = this.rectStart(); if (!rs) return false;
    d.rs = rs;
    if (rs.mode !== 'terrain') { rs.end = rs.anchor.slice(); this.rectBuild(rs); }
    this.placeCount();
    Snd.click();
    return true;
  },
  // liczba klocków przy palcu: na dotyku wyżej, żeby palec jej nie zasłaniał
  placeCount() {
    const lab = $('#b3-count'), t = this.drag && this.drag.touch;
    lab.classList.toggle('big', !!t);
    lab.style.left = (this.mclient.x + (t ? -120 : 18)) + 'px'; lab.style.top = (this.mclient.y - (t ? 110 : 44)) + 'px';
  },
  rotateBy(mx, my) {
    Cam.yaw -= mx * .0052;
    Cam.pitch = clamp(Cam.pitch + my * .0042, .08, 1.38);
    this.camUserT = now();
  },
  panBy(mx, my) {
    const s = Cam.cd * .0018, fx = -Math.sin(Cam.cy), fz = -Math.cos(Cam.cy), rx = Math.cos(Cam.cy), rz = -Math.sin(Cam.cy);
    this.bfocus.x += (-rx * mx + fx * my) * s; this.bfocus.z += (-rz * mx + fz * my) * s;
    this.clampFocus();
  },
  clampFocus() {
    const p = this.player.pos, dx = this.bfocus.x - p.x, dz = this.bfocus.z - p.z, d = Math.hypot(dx, dz);
    if (d > 70) { this.bfocus.x = p.x + dx / d * 70; this.bfocus.z = p.z + dz / d * 70; }
  },
  zoom(f, toCursor) {
    const build = this.mode === 'build', nd = clamp(Cam.dist * f, build ? 8 : 5, build ? 80 : 40);
    // w budowaniu przybliżamy się do miejsca pod kursorem
    if (build && toCursor && this.hit && !this.hit.animal && Cam.dist > 0) {
      const k = 1 - nd / Cam.dist, h = this.hit;
      this.bfocus.x += (h.x + .5 - this.bfocus.x) * k; this.bfocus.z += (h.z + .5 - this.bfocus.z) * k;
      this.clampFocus();
    }
    Cam.dist = nd;
  },
  nextView() {
    if (this.mode !== 'build') return;
    this.viewI = ((this.viewI || 0) + 1) % VIEWS.length;
    const v = VIEWS[this.viewI]; Cam.tweenTo(v.pitch, Cam.dist); Snd.click(); Voice.say(v.say);
    $('#b3-view').innerHTML = `<span class="em">${VIEWS[(this.viewI + 1) % VIEWS.length].em}</span>`;
  },
  setMouse(e) {
    const r = $('#build-host').getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; this.mouse.in = true;
    this.mclient.x = e.clientX; this.mclient.y = e.clientY;
  },
  key(e, down) {
    if (current !== 'build' || !this.ready || $('#modal-root').children.length) return;
    const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'jump', ShiftLeft: 'run', ShiftRight: 'run', KeyQ: 'camL', KeyE: 'camR' };
    const c = e.code, mv = MOVE[c];
    if (mv) { this.keys[mv] = down; e.preventDefault(); if (down && mv.length === 1 && 'fblr'.includes(mv)) this.stopPath(); return; }
    if (!down || e.repeat) return;
    if (c === 'KeyB' || (c === 'Escape' && this.mode === 'build')) { this.setMode(this.mode === 'build' ? 'walk' : 'build'); return; }
    if (c === 'Equal' || c === 'NumpadAdd') { this.zoom(1 / 1.25); return; }
    if (c === 'Minus' || c === 'NumpadSubtract') { this.zoom(1.25); return; }
    if (c === 'KeyV') { this.nextView(); return; }
    if (this.mode === 'walk') { if (c === 'KeyH') this.goHome(); return; }
    if (c === 'KeyR') this.rotate();
    else if (c.startsWith('Digit')) { const n = +c.slice(5), items = this.groupItems(); if (n >= 1 && n <= items.length) this.selectItem(items[n - 1]); }
    else if (c === 'Tab') { e.preventDefault(); if (this.group !== 'build') this.setGroup('build', true); else { this.cat = (this.cat + 1) % CATS.length; Snd.click(); this.renderHud(); } }
    else if (c === 'KeyZ' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.doUndo(); }
    else if (c === 'KeyX') this.setGroup(this.group === 'erase' ? (this.prevGroup || 'build') : 'erase');
    else if (c === 'KeyP') this.setGroup(this.group === 'paint' ? (this.prevGroup || 'build') : 'paint');
  },
  help() {
    if (IS_TOUCH) return this.helpTouch();
    const k = s => `<span class="kbd">${s}</span>`;
    const m = modal(`<div class="dialog help3"><h2>Jak grać?</h2>
      <h3>🚶 Spacer</h3><div class="keys">
      <div>${k('W')}${k('A')}${k('S')}${k('D')} albo strzałki</div><div>chodzenie</div>
      <div>🖱️ klik w trawę</div><div>ludzik sam tam idzie</div>
      <div>🖱️ przeciągnij</div><div>obróć widok (też ${k('Q')} ${k('E')})</div>
      <div>🖱️ kółko, ${k('+')} ${k('−')}</div><div>bliżej / dalej</div>
      <div>👕</div><div>twoja postać: bohaterowie i kreator</div>
      <div>❗ mieszkańcy, 📖</div><div>mieszkańcy pojawiają się w różnych miejscach podczas spaceru; kliknij tego z wykrzyknikiem, żeby dostać misję; bez misji strzałka prowadzi do najbliższego</div>
      <div>${k('Spacja')} ${k('Shift')}</div><div>skok, bieg</div>
      <div>${k('H')} albo strzałka-kompas</div><div>wróć do domu</div>
      <div>${k('B')}</div><div>przejdź do budowania</div></div>
      <h3>🔨 Budowanie</h3><div class="keys">
      <div>🖱️ klik</div><div>postaw klocek</div>
      <div>🖱️ przeciągnij (szybko)</div><div>obróć widok</div>
      <div>🖱️ przytrzymaj chwilę, potem przeciągnij</div><div>rząd albo podłoga; po ścianie: mur na zakładkę (od razu: ${k('Shift')} + przeciągnij)</div>
      <div>🖱️ prawy klik</div><div>zabierz cały klocek</div>
      <div>🖱️ kółko, ${k('+')} ${k('−')}</div><div>bliżej / dalej (do miejsca pod kursorem)</div>
      <div>🖱️ środkowy przycisk, strzałki</div><div>przesuń widok</div>
      <div>${k('V')} albo 📐</div><div>widok z ukosa / z góry / z boku</div>
      <div>🔨 🌳 🐑 🖌️ ✋</div><div>na dole: Buduj (klocki, meble, gotowe), Przyroda (drzewa, łopata, górka, woda), Zwierzaki, Maluj, Zabierz (też wycina drzewa)</div>
      <div>${k('R')} · ${k('1')}…${k('9')} ${k('Tab')} · ${k('P')} ${k('X')}</div><div>obróć klocek · wybór klocka i grupy · maluj, zabierz</div>
      <div>${k('B')} albo ${k('Esc')}</div><div>wróć na spacer</div></div>
      <div class="row"><button class="btn" id="h-tut">Samouczek od nowa</button><button class="btn t-green" id="h-ok" style="font-size:24px">Gramy!</button></div></div>`);
    $('#h-ok', m.el).onclick = m.close;
    $('#h-tut', m.el).onclick = () => { m.close(); this.setMode('walk'); this.tutStart(); };
  },
  wardrobe() {
    Snd.pop();
    let L = { ...DEFAULT_LOOK, ...this.player.look }, tab = 'heroes';
    const done = progress.mdone || 0, FRONT = new V3(.55, .35, 1.6);
    const m = modal(`<div class="dialog wardrobe"><h2>Twoja postać</h2>
      <div class="wr-tabs"><button class="btn small" data-tab="heroes">⭐ Bohaterowie</button><button class="btn small" data-tab="make">✏️ Kreator</button></div>
      <div class="wr"><img id="wr-prev" alt=""><div class="wr-body"></div></div>
      <div class="row"><button class="btn t-green" id="wr-ok" style="font-size:24px">Gotowe</button></div></div>`);
    const body = $('.wr-body', m.el);
    const prev = () => { $('#wr-prev', m.el).src = Icons.snap(buildPerson(L), FRONT, 1.35); };
    const apply = () => { prev(); this.player.setLook(L); this.dirty = true; };
    const sw = (k, cols) => cols.map(c => `<button class="sw-b${L[k] === c ? ' sel' : ''}" data-k="${k}" data-v="${c}" style="background:${c}"></button>`).join('');
    const opts = (k, list) => list.map(o => {
      const lock = o.need && done < o.need;
      return `<button class="btn st-b${L[k] === o.k ? ' sel' : ''}${lock ? ' locked' : ''}" data-k="${k}" data-v="${o.k}" ${lock ? `data-need="${o.need}"` : ''}><span class="em">${lock ? '🔒' : o.em}</span>${lock ? 'misje: ' + o.need : o.name}</button>`;
    }).join('');
    if (!this.heroImgs) this.heroImgs = HEROES.map(h => Icons.snap(buildPerson({ ...DEFAULT_LOOK, ...h.look }), FRONT, 1.5));
    const render = () => {
      $$('[data-tab]', m.el).forEach(b => b.classList.toggle('sel', b.dataset.tab === tab));
      if (tab === 'heroes') {
        body.innerHTML = `<div class="hero-grid">${HEROES.map((h, i) => `<button class="hero-c" data-hero="${i}"><img src="${this.heroImgs[i]}" alt=""><span>${h.name}</span></button>`).join('')}</div>`;
        $$('[data-hero]', body).forEach(b => b.onclick = () => { const h = HEROES[+b.dataset.hero]; L = { ...DEFAULT_LOOK, ...h.look }; Snd.click(); Voice.say(h.name); apply(); });
        return;
      }
      const animal = L.kind !== 'human';
      body.innerHTML = `<div class="wr-opts">
        <div class="wr-l">🙂 Postać</div><div class="wr-s">${opts('kind', LOOK.kind)}</div>
        ${animal ? `<div class="wr-l">🎨 Futerko</div><div class="wr-s">${sw('skin', LOOK.fur[L.kind] || [L.skin])}</div>` : `
        <div class="wr-l">✋ Skóra</div><div class="wr-s">${sw('skin', LOOK.skin)}</div>
        <div class="wr-l">👀 Oczy</div><div class="wr-s">${opts('eyes', LOOK.eyes)}<button class="btn st-b${L.glasses ? ' sel' : ''}" data-k="glasses" data-v="${L.glasses ? '' : '1'}"><span class="em">👓</span>okulary</button></div>
        <div class="wr-l">✂️ Fryzura</div><div class="wr-s">${opts('style', LOOK.style)}</div>
        <div class="wr-l">💇 Włosy</div><div class="wr-s">${sw('hair', LOOK.hair)}</div>`}
        <div class="wr-l">👕 Koszulka</div><div class="wr-s">${sw('shirt', LOOK.shirt)}</div>
        <div class="wr-l">🖌️ Wzór</div><div class="wr-s">${opts('pattern', LOOK.pattern)}</div>
        <div class="wr-l">👖 Spodnie</div><div class="wr-s">${sw('pants', LOOK.pants)}</div>
        <div class="wr-l">🎁 Dodatek</div><div class="wr-s">${opts('acc', LOOK.acc)}</div>
      </div>`;
      $$('[data-k]', body).forEach(b => b.onclick = () => {
        if (b.dataset.need) { Snd.soft(); Voice.say(`To nagroda za ${b.dataset.need} misji. Wykonuj misje u mieszkańców!`); return; }
        const k = b.dataset.k, v = b.dataset.v;
        if (k === 'kind') { L.kind = v; L.skin = v === 'human' ? LOOK.skin[0] : LOOK.fur[v][0]; Voice.say(LOOK.kind.find(o => o.k === v).name); }
        else if (k === 'glasses') L.glasses = !!v;
        else L[k] = v;
        Snd.click(); apply(); render();
      });
    };
    $$('[data-tab]', m.el).forEach(b => b.onclick = () => { tab = b.dataset.tab; Snd.click(); render(); });
    render(); prev();
    $('#wr-ok', m.el).onclick = () => { m.close(); Snd.success(); Voice.say('Super wyglądasz!'); };
  },
  helpTouch() {
    const m = modal(`<div class="dialog help3"><h2>Jak grać?</h2>
      <h3>🚶 Spacer</h3><div class="keys">
      <div>👆 dotknij trawy</div><div>ludzik sam tam idzie</div>
      <div>🕹️ kółko w rogu</div><div>chodzenie (mocno wychylone: bieg)</div>
      <div>⤒</div><div>skok</div>
      <div>☝️ przesuń palcem</div><div>obróć widok</div>
      <div>🤏 dwa palce</div><div>szczypanie: bliżej i dalej; obrót dwoma palcami: obrót widoku</div>
      <div>👆 mieszkaniec z ❗</div><div>misja</div></div>
      <h3>🔨 Budowanie</h3><div class="keys">
      <div>👆 dotknij</div><div>postaw klocek</div>
      <div>☝️ przytrzymaj, potem przesuń</div><div>rząd, podłoga albo mur</div>
      <div>✋ Zabierz + dotknij</div><div>zabierz klocek</div>
      <div>☝️ szybko przesuń</div><div>obróć widok</div>
      <div>🤏 dwa palce</div><div>szczypanie: bliżej i dalej; przesuwanie: przesuń widok</div>
      <div>🔨 🌳 🐑 🖌️ ✋</div><div>Buduj, Przyroda, Zwierzaki, Maluj, Zabierz</div>
      <div>🧱 przycisk przy klockach</div><div>w Buduj: klocki, kolory, dom, gotowe</div></div>
      <div class="row"><button class="btn" id="h-tut">Samouczek od nowa</button><button class="btn t-green" id="h-ok" style="font-size:22px">Gramy!</button></div></div>`);
    $('#h-ok', m.el).onclick = m.close;
    $('#h-tut', m.el).onclick = () => { m.close(); this.setMode('walk'); this.tutStart(); };
  },
  toast(msg) {
    const t = $('#b3-toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), 1700);
    if (!this.lastSay || now() - this.lastSay > 4) { this.lastSay = now(); Voice.say(msg); }
  },
  setMode(m) {
    if (m === this.mode || !this.ready) return;
    const p = this.player.pos;
    this.mode = m; this.stopPath(); this.keys = {}; this.clearRect(); this.drag = null;
    if (m === 'build') {
      const fx = -Math.sin(Cam.cy), fz = -Math.cos(Cam.cy);
      this.bfocus.set(p.x + fx * 6, p.y, p.z + fz * 6); this.bfocusY = null;
      this.walkCam = { pitch: Cam.pitch, dist: Cam.dist };
      this.viewI = 0; $('#b3-view').innerHTML = `<span class="em">${VIEWS[1].em}</span>`;
      Cam.free = true; Cam.tweenTo(CAMB.pitch, CAMB.dist);
      Snd.pop(); Voice.say('Budowanie');
    } else {
      if (Math.hypot(this.bfocus.x - p.x, this.bfocus.z - p.z) > 20) this.teleportNear(this.bfocus.x, this.bfocus.z);
      Cam.free = false; Cam.cur = Cam.cd;
      Cam.tweenTo(this.walkCam ? Math.min(this.walkCam.pitch, .6) : CAMW.pitch, this.walkCam ? Math.min(this.walkCam.dist, 24) : CAMW.dist);
      Snd.pop(); Voice.say('Spacer');
    }
    this.renderHud();
    this.tut('mode', m);
  },
  // pięć dużych przycisków: Buduj, Przyroda, Zwierzaki, Maluj, Zabierz
  setGroup(g, quiet) {
    const G = GROUPS.find(x => x.id === g); if (!G) return;
    if (g !== this.group) { if (this.group !== 'erase') { this.itemBy[this.group] = this.item; this.prevGroup = this.group; } }
    this.group = g; this.tool = G.tool;
    if (G.items && G.items.length) {
      const k = this.itemBy[g];
      if (!(G.items.includes(this.item) && g !== 'paint' && groupOf(this.item) === g) && !(g === 'paint' && PAINTS.includes(this.item) && isBlock(this.item) && BL[BK[this.item]].kind === 'mat'))
        this.item = k && G.items.includes(k) && unlocked3(k) ? k : G.items.find(unlocked3) || G.items[0];
    } else if (g === 'build' && groupOf(this.item) !== 'build') {
      const k = this.itemBy.build; this.item = k && groupOf(k) === 'build' && unlocked3(k) ? k : 'brick';
    }
    if (g === 'build') { const ci = CATS.findIndex(c => c.items.includes(this.item)); if (ci >= 0) this.cat = ci; }
    this.syncBrush(); this.ghostKey = null; this.ghost.visible = false; this.rotOff = 0;
    $('#b3-items').scrollLeft = 0; $('#b3-cats').classList.remove('open');
    Snd.click(); if (!quiet) Voice.say(G.say);
    this.renderHud();
  },
  setTool(t) { this.setGroup(t === 'build' ? (this.group === 'paint' || this.group === 'erase' ? this.prevGroup || 'build' : this.group) : t, true); },
  groupItems() { return this.group === 'build' ? CATS[this.cat].items : (GROUPS.find(g => g.id === this.group).items || []); },
  // sadzenie zaczyna od jednej rośliny, łopata i górka od średniego pędzla
  syncBrush() {
    if (this.item[0] !== '~') return;
    const plant = !!TOOLS[this.item.slice(1)].plant;
    if (plant !== this.brushPlant) { this.brushI = plant ? 0 : 1; this.brushPlant = plant; }
  },
  rotate() { this.rotOff = (this.rotOff + 1) % 4; Snd.click(); },
  renderHud() {
    const build = this.mode === 'build';
    $('#b3-dock').style.display = build ? '' : 'none';
    $('#b3-walkbar').style.display = build ? 'none' : '';
    $('#b3-undo').style.display = build ? '' : 'none';
    $('#b3-view').style.display = build ? '' : 'none';
    $('#b3-shirt').style.display = build ? 'none' : '';
    $('#build-host').classList.toggle('building', build);
    $('#scr-build').classList.toggle('walking', !build);
    $('#b3-joy').classList.toggle('on', !build); $('#b3-jump').classList.toggle('on', !build);
    { const c = CATS[this.cat]; $('#b3-catbtn').innerHTML = `${c.icon}<small>${c.name}</small>`; }
    $$('#b3-tools [data-group]').forEach(b => b.classList.toggle('sel', b.dataset.group === this.group));
    $('#b3-dock').dataset.group = this.group;
    const cb = $('#b3-cats'); cb.innerHTML = '';
    CATS.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'btn cat' + (i === this.cat ? ' sel' : '');
      b.innerHTML = `<span class="em">${c.icon}</span>${c.name}`;
      b.onclick = () => { this.cat = i; Snd.click(); Voice.say(c.name); cb.classList.remove('open'); this.renderHud(); };
      cb.appendChild(b);
    });
    const ib = $('#b3-items'); ib.innerHTML = '';
    if (build && this.group === 'erase') ib.innerHTML = `<div class="erase-hint"><span class="em">✋</span><span>Dotknij klocka, drzewa albo zwierzaka, żeby go zabrać.<small>Przytrzymaj i przesuń, żeby zabrać dużo naraz.</small></span></div>`;
    if (build) this.groupItems().forEach((k, i) => {
      const info = itemInfo(k), un = unlocked3(k), d = document.createElement('div');
      d.className = 'ptile' + (k === this.item ? ' sel' : '') + (un ? '' : ' locked');
      if (k[0] === '~' && !info.icon) { const e = document.createElement('span'); e.className = 'tool-em'; e.textContent = info.em; d.appendChild(e); }
      else { const img = new Image(); img.src = Icons.item(k[0] === '~' ? info.icon : k); img.alt = ''; d.appendChild(img); }
      d.append(info.name);
      if (i < 9) d.insertAdjacentHTML('beforeend', `<span class="key">${i + 1}</span>`);
      if (!un) d.insertAdjacentHTML('beforeend', `<span class="lock">${info.unlock}${STAR_SVG}</span>`);
      d.onclick = () => this.selectItem(k);
      ib.appendChild(d);
    });
    this.renderShapes();
    if (Missions.active) Missions.renderTracker();
  },
  renderShapes() {
    const row = $('#b3-shapes'); row.innerHTML = '';
    if (this.item[0] === '~') { if (this.mode === 'build' && this.tool === 'build') this.renderToolShapes(row); row.style.display = row.children.length ? '' : 'none'; return; }
    const d = isBlock(this.item) ? BL[BK[this.item]] : null, build = this.mode === 'build' && this.tool === 'build';
    if (build && isPieceItem(this.item)) PIECE_KEYS.forEach(pk => {
      const b = document.createElement('button'); b.className = 'btn shape-btn' + (pk === this.piece ? ' sel' : '');
      const img = new Image(); img.src = Icons.item(this.item, pk); b.appendChild(img); b.append(PIECES[pk].name);
      b.onclick = () => { this.piece = pk; this.rotOff = 0; Snd.click(); Voice.say(PIECES[pk].name); this.renderShapes(); };
      row.appendChild(b);
    });
    const canRot = build && ((d && ((isPieceItem(this.item) && this.piece !== 'kostka') || d.oriented || d.kind === 'window' || d.kind === 'door')) || this.item[0] === '!');
    if (canRot) {
      const b = document.createElement('button'); b.className = 'btn shape-btn rot';
      b.innerHTML = `${ICON.rotR}<span>obróć (R)</span>`; b.onclick = () => this.rotate();
      row.appendChild(b);
    }
    row.style.display = row.children.length ? '' : 'none';
  },
  selectItem(k) {
    if (!unlocked3(k)) { Snd.soft(); Voice.say(`To jest nagroda. Zbierz ${itemInfo(k).unlock} gwiazdek w zagadkach.`); this.toast(`Nagroda za ${itemInfo(k).unlock} ⭐`); return; }
    const prev = this.item; this.item = k;
    const d = isBlock(k) ? BL[BK[k]] : null, pd = isBlock(prev) ? BL[BK[prev]] : null;
    if (isPieceItem(k)) { if (d.shape === 3) this.piece = 'skos'; else if (pd && pd.shape === 3) this.piece = 'cegielka'; }
    // wybrany przedmiot przełącza na właściwy duży przycisk (Maluj zostaje, jeśli to kolor albo materiał)
    const stayPaint = this.group === 'paint' && PAINTS.includes(k) && d && d.kind === 'mat';
    if (!stayPaint) { const g = groupOf(k); if (g !== this.group) { if (this.group !== 'erase') this.prevGroup = this.group; this.group = g; } this.tool = 'build'; }
    if (this.group === 'build') { const ci = CATS.findIndex(c => c.items.includes(k)); if (ci >= 0) this.cat = ci; }
    this.syncBrush();
    this.rotOff = 0;
    Snd.click(); Voice.say(itemInfo(k).name); this.renderHud();
  },

  /* ----- spacer ----- */
  walkClick() {
    const h = this.hit; if (!h) return;
    if (h.npc) { Missions.talk(h.npc); return; }
    if (h.chest !== undefined) { Missions.openChest(h.chest); return; }
    if (h.animal) { const a = h.animal; a.hop = 1; Snd.animal(a.kind); Parts3.heart(a.px, a.py + 1.6, a.pz); this.emit('pet', a); return; }
    const w = this.world, side = h.n[1] === 0;
    const cx = h.x + (side ? h.n[0] : 0), cz = h.z + (side ? h.n[2] : 0), fromY = h.y + (h.n[1] > 0 ? 1 : 0);
    const ty = standNear(w, cx, cz, fromY);
    if (ty === null) { Snd.soft(); return; }
    const p = this.player.pos, path = findPath(w, Math.floor(p.x), Math.floor(p.y + .05), Math.floor(p.z), cx, ty, cz);
    if (!path) { Snd.soft(); this.toast('Tam nie dojdę'); return; }
    this.path = path; this.pathI = 0; this.pathStuck = 0; this.lastP.copy(p);
    this.ring.position.set(cx + .5, floorTop(w, cx, ty, cz) + .05, cz + .5); this.ring.visible = true;
    Snd.click();
  },
  followPath(dt) {
    const P = this.path; if (!P) return null;
    const p = this.player.pos;
    let wp = P[this.pathI];
    while (wp && Math.hypot(wp.x + .5 - p.x, wp.z + .5 - p.z) < (this.pathI === P.length - 1 ? .25 : .55)) { this.pathI++; wp = P[this.pathI]; }
    if (!wp) { this.stopPath(); return null; }
    const moved = Math.hypot(p.x - this.lastP.x, p.z - this.lastP.z);
    this.pathStuck = moved < dt * 1.2 ? this.pathStuck + dt : 0; this.lastP.copy(p);
    if (this.pathStuck > 1.4) { this.stopPath(); Snd.soft(); return null; }
    return { x: wp.x + .5 - p.x, z: wp.z + .5 - p.z, up: wp.y > p.y + 1.2 };
  },
  stopPath() { this.path = null; if (this.ring) this.ring.visible = false; },
  autoCam(dt) {
    if (now() - this.camUserT < 1.8) return;
    const v = this.player.vel, hs = Math.hypot(v.x, v.z);
    if (hs < 3) return;
    const moveYaw = Math.atan2(v.x, v.z), fwdYaw = Cam.yaw + PI;
    const diff = Math.abs(((moveYaw - fwdYaw + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI);
    if (this.path || diff < 1.0) Cam.yaw = angLerp(Cam.yaw, moveYaw + PI, 1 - Math.exp(-(this.path ? 1.6 : 1.0) * dt));
  },
  goHome() {
    if (!this.home) return;
    this.teleportNear(this.home[0], this.home[2]);
    Cam.snap(this.player.focus()); Snd.pop(); Voice.say('Jesteś w domu!');
  },
  teleportNear(x, z) {
    const w = this.world, bx = Math.floor(x), bz = Math.floor(z);
    for (let k = 0; k < 40 && !w.chunkAt(bx, bz); k++) w.ensureData(Math.floor(bx / CS4), Math.floor(bz / CS4));
    for (let r = 0; r <= 8; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const cx = bx + dx, cz = bz + dz; if (!w.chunkAt(cx, cz)) continue;
      const y = surfaceY(w, cx, cz);
      if (pCanStand(w, cx, y, cz)) {
        this.player.pos.set(cx + .5, floorTop(w, cx, y, cz) + .001, cz + .5); this.player.vel.set(0, 0, 0); this.stopPath();
        Parts3.heart(cx + .5, y + 2.6, cz + .5, 2);
        return true;
      }
    }
    return false;
  },
  updateCompass() {
    const el = $('#b3-compass');
    if (!this.home || this.mode !== 'walk') { el.classList.remove('on'); return; }
    const tg = Missions.target(), tx = tg ? tg[0] : this.home[0], tz = tg ? tg[1] : this.home[2];
    const p = this.player.pos, dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    const icon = tg ? tg[2] : '🏠', sp = el.querySelector('span'); if (sp.textContent !== icon) sp.textContent = icon;
    if (dist < (tg ? 5 : 14)) { el.classList.remove('on'); return; }
    const fx = -Math.sin(Cam.cy), fz = -Math.cos(Cam.cy), rx = Math.cos(Cam.cy), rz = -Math.sin(Cam.cy);
    const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
    el.classList.add('on'); el.querySelector('svg').style.transform = `rotate(${ang}rad)`;
  },

  /* ----- budowanie ----- */
  panBuild(dt) {
    const k = this.keys, ix = (k.r ? 1 : 0) - (k.l ? 1 : 0), iz = (k.b ? 1 : 0) - (k.f ? 1 : 0);
    this.panning = !!(ix || iz);
    if (this.panning) {
      const sp = Cam.cd * (k.run ? 1.4 : .75) * dt, fx = -Math.sin(Cam.cy), fz = -Math.cos(Cam.cy), rx = Math.cos(Cam.cy), rz = -Math.sin(Cam.cy);
      this.bfocus.x += (rx * ix - fx * iz) * sp; this.bfocus.z += (rz * ix - fz * iz) * sp;
      this.clampFocus();
    }
    // wysokość punktu widzenia: średnia wysokość terenu w okolicy (bez drzew i budowli), zmienia się powoli
    const w = this.world, bx = Math.floor(this.bfocus.x), bz = Math.floor(this.bfocus.z);
    if (w.chunkAt(bx, bz)) {
      let sum = 0, n = 0;
      for (const [ox, oz] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]]) { const h = terrainTop(w, bx + ox, bz + oz); if (h !== null) { sum += h; n++; } }
      if (n) {
        const gy = sum / n;
        if (this.bfocusY == null) this.bfocusY = gy;
        this.bfocusY += (gy - this.bfocusY) * Math.min(1, dt * 2.5);
        this.bfocus.y = this.bfocusY;
      }
    }
  },
  autoOri() {
    const fx = -Math.sin(Cam.cy), fz = -Math.cos(Cam.cy);
    return Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : (fz > 0 ? 2 : 0);
  },
  playerOver(x, y, z) { const p = this.player.pos; return p.x + P_R > x && p.x - P_R < x + 1 && p.z + P_R > z && p.z - P_R < z + 1 && p.y + P_H > y && p.y < y + 1; },
  cellFree(c) {
    const w = this.world, t = w.get(c[0], c[1], c[2]);
    return w.in(c[0], c[1], c[2]) && c[1] >= 1 && c[1] < w.H - 1 && (!t || t === BK.water || replaceable(t));
  },
  blockedBy(cells, solid) {
    if (!solid) return false;
    return cells.some(c => this.playerOver(c[0], c[1], c[2]) || this.world.animals.some(a => a.cx === c[0] && a.cz === c[2] && (a.cy === c[1] || a.cy + 1 === c[1])));
  },
  placement(hit) {
    if (this.item[0] === '!') return this.prefabPlacement(hit);
    if (this.item[0] === '~') return this.toolTarget(hit);
    const w = this.world, k = this.item, isA = k[0] === '@', d = isA ? null : BL[BK[k]];
    let x = hit.x + hit.n[0], y = hit.y + hit.n[1], z = hit.z + hit.n[2];
    const ht = w.get(hit.x, hit.y, hit.z);
    if (replaceable(ht) && k !== BL[ht].key) { x = hit.x; y = hit.y; z = hit.z; }
    const ori = (this.autoOri() + this.rotOff) % 4;
    if (isA || d.kind === 'model') {
      if (!this.cellFree([x, y, z])) return null;
      const b = w.get(x, y - 1, z);
      if (!b || BL[b].kind !== 'mat' || w.get(x, y, z) === BK.water) return null;
      const cells = [[x, y, z]], sup = isA ? { low: 0 } : this.support(cells, d.id, 0, hit), low = sup.low;
      return { x, y, z, cells, metas: [(d && d.oriented ? ori : 0) | low], low, id: isA ? 0 : d.id, animal: isA ? k.slice(1) : null, ori, blocked: this.blockedBy(cells, !isA && d.solid), thick: sup.thick };
    }
    const L = pieceLayout(k, this.piece, ori), cells = L.cells.map(c => [x + c[0], y + c[1], z + c[2]]);
    if (!cells.every(c => this.cellFree(c))) return null;
    if (d.kind === 'door' && !cells.filter(c => c[1] === y).every(c => { const b = w.get(c[0], y - 1, c[2]); return b && BL[b].kind === 'mat'; })) return null;
    let base = L.base;
    const sup = d.kind === 'water' ? { low: 0 } : this.support(cells, d.id, base, hit), low = sup.low;
    // naturalny klocek obniżony na płytkę rysuje się jak klocek z zaokrągleniem (nie zasłania sąsiadów)
    if (low && d.nat && ((base >> 2) & 7) === 0) base |= 5 << 2;
    return { x, y, z, cells, metas: withLinks(cells, base | low), low, id: d.id, ori, blocked: this.blockedBy(cells, d.kind !== 'door' && d.kind !== 'water'), door: d.kind === 'door', merge: sup.merge, thick: sup.thick };
  },
  /* Co jest pod nowym klockiem. Siatka trzyma jeden klocek w kratce, więc płytka położona na obniżonym klocku
     (LOW) kończy się równo z kratką, a następny klocek wisiałby pół kratki nad nią. Dlatego:
     - merge: płytka na płytce z tego samego materiału (tak samo ułożonej) = jeden pełny klocek w kratce niżej;
     - thick: klocek stawiany na obniżonej płytce pogrubia ją do pełnego klocka (wtedy leży równo, też obniżony). */
  support(cells, id, base, hit) {
    const w = this.world, by = Math.min(...cells.map(c => c[1])), res = { low: this.lowFor(cells, hit), merge: null, thick: null };
    const halfAt = (x, y, z) => { const t = w.get(x, y, z); if (!t || BL[t].kind !== 'mat') return false; const sh = (w.meta(x, y, z) >> 2) & 7; return sh === 1 || sh === 6; };
    if (((base >> 2) & 7) === 6 && cells.every(c => c[1] === by)) {
      const under = cells.map(c => [c[0], by - 1, c[2]]), foot = new Set(under.map(u => u.join(',')));
      if (under.every(u => w.get(u[0], u[1], u[2]) === id && halfAt(u[0], u[1], u[2]))
        && under.every(u => pieceCellsAt(w, u[0], u[1], u[2]).every(c => foot.has(c.join(','))))) {
        res.merge = { cells: under, metas: withLinks(under, 5 << 2).map((m, i) => m | (w.meta(under[i][0], under[i][1], under[i][2]) & LOW)) };
        return res;
      }
    }
    if (res.low) {
      const seen = new Set(), thick = [];
      for (const c of cells) if (c[1] === by && halfAt(c[0], by - 1, c[2]) && (w.meta(c[0], by - 1, c[2]) & LOW))
        for (const p of pieceCellsAt(w, c[0], by - 1, c[2])) { const k = p.join(','); if (!seen.has(k) && halfAt(p[0], p[1], p[2])) { seen.add(k); thick.push(p); } }
      if (thick.length) res.thick = thick;
    }
    return res;
  },
  // pod spodem: zamiana płytek (sklejenie albo pogrubienie), z zapisem do cofania
  applySupport(rec, pc) {
    const w = this.world;
    if (pc.merge) { pc.merge.cells.forEach((c, i) => this.setR(rec, c[0], c[1], c[2], pc.id, pc.merge.metas[i])); return true; }
    if (pc.thick) for (const c of pc.thick) {
      const m = w.meta(c[0], c[1], c[2]), sh = (m >> 2) & 7;
      if (sh === 1 || sh === 6) this.setR(rec, c[0], c[1], c[2], w.get(c[0], c[1], c[2]), (m & ~(7 << 2)) | (5 << 2));
    }
    return false;
  },
  // czy klocek leży na płytce (albo na klocku już obniżonym)? wtedy obniżamy go o pół kratki
  lowFor(cells, hit) {
    const w = this.world, by = Math.min(...cells.map(c => c[1]));
    let low = 0, full = 0;
    for (const c of cells) if (c[1] === by) {
      const t = w.get(c[0], by - 1, c[2]); if (!t) continue;
      const d = BL[t]; if (d.kind === 'water' || (d.kind === 'model' && !d.solid)) continue;
      const m = w.meta(c[0], by - 1, c[2]), sh = (m >> 2) & 7;
      const top = (d.kind === 'mat' && (sh === 1 || sh === 6) ? .5 : 1) - (m & LOW ? .5 : 0);
      if (top < 1) low++; else full++;
    }
    if (low && !full) return LOW;
    // dokładany z boku do obniżonego klocka, bez podparcia pod spodem: też obniżony
    if (!low && !full && hit && hit.n[1] === 0 && (w.meta(hit.x, hit.y, hit.z) & LOW)) return LOW;
    return 0;
  },
  prefabPlacement(hit) {
    const w = this.world, name = this.item.slice(1), ori = (this.autoOri() + this.rotOff) % 4, pf = prefabCells(name, ori);
    const x = hit.x + hit.n[0], z = hit.z + hit.n[2];
    let y = hit.y + hit.n[1];
    // nad wodą gotowiec stoi na jej powierzchni
    for (let it = 0; it < 8; it++) { if (pf.foot.some(([fx, fz]) => w.get(x + fx, y, z + fz) === BK.water)) y++; else break; }
    const b = pf.box, cells = [[x + b[0], y, z + b[2]], [x + b[3] - 1, y + b[4] - 1, z + b[5] - 1]];
    let ok = true, blocked = false;
    const free = (cx, cy, cz) => {
      if (cy < 1 || cy >= w.H - 1 || !w.in(cx, cy, cz)) return false;
      const t = w.get(cx, cy, cz); return !t || t === BK.water || BL[t].nat || BL[t].kind === 'model';
    };
    for (const c of pf.list) if (!free(x + c[0], y + c[1], z + c[2])) { ok = false; break; }
    if (ok) for (const c of pf.clear) if (!free(x + c[0], y + c[1], z + c[2])) { ok = false; break; }
    return { prefab: name, x, y, z, ori, cells, pf, blocked: !ok, why: !ok ? 'space' : '' };
  },
  placePrefab(pl) {
    const w = this.world, rec = this.rec(), { x, y, z, pf } = pl;
    for (const c of pf.clear) { const cx = x + c[0], cy = y + c[1], cz = z + c[2], t = w.get(cx, cy, cz); if (t && t !== BK.water) this.setR(rec, cx, cy, cz, 0, 0); }
    for (const c of pf.list) this.setR(rec, x + c[0], y + c[1], z + c[2], c[3], c[4]);
    if (pf.found) for (const [fx, fz] of pf.foot) {
      for (let d = 1; d <= 10; d++) {
        const cy = y - d, t = w.get(x + fx, cy, z + fz);
        if (t && t !== BK.water && !(BL[t].kind === 'model' && !BL[t].solid)) break;
        this.setR(rec, x + fx, cy, z + fz, BK.cobble, 0);
      }
    }
    this.endRec(rec); this.dirty = true;
    // ludzik i zwierzaki, które stały w tym miejscu, grzecznie wychodzą przed budowlę
    const B0 = pf.box, X0 = x + B0[0], X1 = x + B0[3], Z0 = z + B0[2], Z1 = z + B0[5], Y0 = y - 1, Y1 = y + B0[4];
    const inBox = (px, py, pz) => px > X0 - .5 && px < X1 + .5 && pz > Z0 - .5 && pz < Z1 + .5 && py > Y0 - 3 && py < Y1;
    const outside = (px, pz) => {
      let best = null, bd = 1e9;
      for (let r = 1; r <= 6 && !best; r++) for (let cx = X0 - r; cx < X1 + r; cx++) for (let cz = Z0 - r; cz < Z1 + r; cz++) {
        if (cx >= X0 - r + 1 && cx < X1 + r - 1 && cz >= Z0 - r + 1 && cz < Z1 + r - 1) continue;
        const cy = surfaceY(w, cx, cz); if (!pCanStand(w, cx, cy, cz)) continue;
        const d = Math.hypot(cx + .5 - px, cz + .5 - pz); if (d < bd) { bd = d; best = [cx, cy, cz]; }
      }
      return best;
    };
    const pp = this.player.pos;
    if (inBox(pp.x, pp.y, pp.z)) { const o = outside(pp.x, pp.z); if (o) { pp.set(o[0] + .5, floorTop(w, o[0], o[1], o[2]) + .001, o[2] + .5); this.player.vel.set(0, 0, 0); } }
    for (const a of w.animals) if (inBox(a.px, a.py, a.pz)) {
      const o = outside(a.px, a.pz); if (!o) continue;
      Object.assign(a, { cx: o[0], cy: o[1], cz: o[2], px: o[0] + .5, py: o[1], pz: o[2] + .5, moving: false, hop: 1 });
    }
    Snd.success();
    const b = pf.box;
    for (let i = 0; i < 6; i++) Parts3.burst(x + b[0] + Math.random() * (b[3] - b[0]), y + Math.random() * b[4], z + b[2] + Math.random() * (b[5] - b[2]), '#fff3b0', 4);
    for (let i = 0; i < 5; i++) Parts3.sparkle(x + b[0] + Math.random() * (b[3] - b[0]), y + Math.random() * b[4], z + b[2] + Math.random() * (b[5] - b[2]), 3, 2);
    Voice.say('Gotowe! ' + PREFABS[pl.prefab].name);
    this.emit('prefab', { name: pl.prefab, x, y, z });
  },
  canPaint(x, y, z) {
    const t = this.world.get(x, y, z), d = isBlock(this.item) ? BL[BK[this.item]] : null;
    return t && d && d.kind === 'mat' && BL[t].kind === 'mat' && t !== d.id && !!BL[t].nat === !!d.nat;
  },
  setOutlineCells(cells, color, dy = 0) {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const c of cells) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); z0 = Math.min(z0, c[2]); x1 = Math.max(x1, c[0] + 1); y1 = Math.max(y1, c[1] + 1); z1 = Math.max(z1, c[2] + 1); }
    const o = this.outline; o.visible = true; o.position.set((x0 + x1) / 2, (y0 + y1) / 2 - dy, (z0 + z1) / 2);
    o.scale.set(x1 - x0 + .04, y1 - y0 + .04, z1 - z0 + .04); o.material.color.set(color);
  },
  updateTarget() {
    if (this.drag && this.drag.frozen && !this.drag.moved) return;
    this.outline.visible = false; this.ghost.visible = false; this.pl = null; this.hit = null; if (this.brush) this.brush.visible = false;
    const host = $('#build-host'); host.style.cursor = '';
    if (!this.mouse.in || (this.drag && this.drag.moved)) return;
    if (this.mode === 'build' && this.panning && now() - this.lastMouseMove > .25) return;
    this.ray.setFromCamera(this.mouse, this.cam);
    const hit = voxelRay(this.world, this.ray.ray.origin, this.ray.ray.direction, 170);
    {
      const xs = this.ray.intersectObjects(Missions.pickables(), true);
      if (xs.length && (!hit || xs[0].distance < hit.dist)) {
        const u = xs[0].object.userData;
        if (u.npc) { this.hit = { npc: u.npc }; host.style.cursor = 'pointer'; return; }
        if (u.chest !== undefined) { this.hit = { chest: u.chest }; host.style.cursor = 'pointer'; return; }
      }
    }
    if (this.world.animals.length) {
      const xs = this.ray.intersectObjects(this.world.animals.map(a => a.obj), true);
      if (xs.length && (!hit || xs[0].distance < hit.dist)) {
        let o = xs[0].object; while (o && !o.userData.animal) o = o.parent;
        if (o) {
          const a = o.userData.animal; this.hit = { animal: a }; host.style.cursor = 'pointer';
          if (this.mode === 'build') {
            const o2 = this.outline; o2.visible = true; o2.position.set(a.px, a.py + .8, a.pz); o2.scale.set(1.6, 1.6, 1.6);
            o2.material.color.set(this.tool === 'erase' ? 0xff8a7a : 0xffffff);
          }
          return;
        }
      }
    }
    const toolOn = this.mode === 'build' && this.tool === 'build' && this.item[0] === '~';
    if (this.mode === 'build' && this.tool === 'erase') {
      const tr = this.pickTree();
      if (tr && (!hit || tr.t <= hit.dist + 1)) {
        this.hit = { x: tr.x, y: tr.y, z: tr.z, n: [0, 1, 0], tree: true };
        this.setOutlineCells([[tr.x, tr.y, tr.z], [tr.x, tr.y + (BL[this.world.get(tr.x, tr.y, tr.z)].key === 'bush' || BL[this.world.get(tr.x, tr.y, tr.z)].key === 'mushroom' ? 1 : 4), tr.z]], 0xff8a7a);
        host.style.cursor = 'pointer'; return;
      }
    }
    if (!hit) return;
    this.hit = hit ? { x: hit.x, y: hit.y, z: hit.z, n: hit.n } : null;
    if (this.mode !== 'build') return;
    if (toolOn) { this.pl = this.toolTarget(this.hit); this.showBrush(this.pl); return; }
    if (!hit) return;
    if (this.tool === 'build') {
      const pl = this.placement(hit);
      if (pl) {
        this.pl = pl;
        const key = this.item + '|' + this.piece + '|' + pl.ori;
        if (this.ghostKey !== key) { this.ghost.clear(); this.ghost.add(buildItemObject(this.item, this.piece, pl.ori, true)); this.ghostKey = key; }
        this.ghost.visible = true; this.ghost.position.set(pl.x, pl.y - (pl.low ? .5 : 0), pl.z); setGhostOpacity(pl.blocked ? .22 : .65);
        this.setOutlineCells(pl.cells, pl.blocked ? 0xffb07a : 0xffffff, pl.low ? .5 : 0);
      } else this.setOutlineCells([[hit.x, hit.y, hit.z]], 0xa0a6b0, this.world.meta(hit.x, hit.y, hit.z) & LOW ? .5 : 0);
    } else {
      const ok = this.tool === 'erase' ? hit.y >= 1 : this.canPaint(hit.x, hit.y, hit.z);
      this.setOutlineCells(pieceCellsAt(this.world, hit.x, hit.y, hit.z), !ok ? 0xa0a6b0 : this.tool === 'erase' ? 0xff8a7a : 0xfff0a0, this.world.meta(hit.x, hit.y, hit.z) & LOW ? .5 : 0);
    }
  },
  click(tool) {
    const h = this.hit;
    if (!h && tool === 'build' && this.pl && this.pl.tool) { this.applyTool(this.pl); return; }
    if (!h) return;
    if (h.npc) { Missions.talk(h.npc); return; }
    if (h.chest !== undefined) { Missions.openChest(h.chest); return; }
    if (h.animal) {
      const a = h.animal;
      if (tool === 'erase') { const rec = this.rec(); this.world.removeAnimal(a); rec.remA.push(a); this.endRec(rec); Snd.remove(); Parts3.burst(a.px - .5, a.py, a.pz - .5, '#ffffff', 8); this.dirty = true; }
      else { a.hop = 1; Snd.animal(a.kind); Parts3.heart(a.px, a.py + 1.6, a.pz, 2); this.emit('pet', a); }
      return;
    }
    if (tool === 'build') {
      const pl = this.pl;
      if (!pl) { Snd.soft(); return; }
      if (pl.tool) { this.applyTool(pl); return; }
      if (pl.blocked) { Snd.soft(); this.toast(pl.why === 'space' ? 'Tu się nie zmieści' : 'Tu ktoś stoi!'); return; }
      if (pl.prefab) { this.placePrefab(pl); this.tut('place', 1); return; }
      this.place(pl); this.tut('place', 1);
    } else if (tool === 'erase') { if (this.erase(h.x, h.y, h.z)) this.tut('erase', 1); }
    else this.paint(h.x, h.y, h.z);
  },

  /* ----- przeciąganie: rząd, podłoga, mur na zakładkę ----- */
  rectStart() {
    if (this.tool === 'build' && this.item[0] === '~') return this.strokeStart();
    const h = this.hit; if (!h || h.animal) return null;
    const axis = h.n[0] ? 0 : h.n[1] ? 1 : 2;
    if (this.tool === 'build') {
      const pl = this.pl; if (!pl || pl.blocked || !draggable(this.item)) return null;
      return { mode: 'place', anchor: [pl.x, pl.y, pl.z], axis, ori: pl.ori, low: pl.low || 0 };
    }
    if (this.tool === 'erase') return h.y >= 1 ? { mode: 'erase', anchor: [h.x, h.y, h.z], axis } : null;
    return this.canPaint(h.x, h.y, h.z) ? { mode: 'paint', anchor: [h.x, h.y, h.z], axis } : null;
  },
  rectMove(rs) {
    if (rs.mode === 'terrain') { this.strokeMove(rs); return; }
    this.ray.setFromCamera(this.mouse, this.cam);
    const o = this.ray.ray.origin, dr = this.ray.ray.direction, a = rs.axis, A = rs.anchor, oc = [o.x, o.y, o.z], dc = [dr.x, dr.y, dr.z];
    this.placeCount();
    if (Math.abs(dc[a]) < 1e-4) return;
    const t = (A[a] + .5 - oc[a]) / dc[a]; if (t < 0) return;
    const E = [0, 1, 2].map(i => i === a ? A[i] : Math.floor(oc[i] + dc[i] * t));
    if (rs.end && E.every((v, i) => v === rs.end[i])) return;
    rs.end = E; this.rectBuild(rs);
  },
  rectBuild(rs) {
    const w = this.world, a = rs.axis, A = rs.anchor, E = rs.end, lo = A.slice(), hi = A.slice();
    for (let i = 0; i < 3; i++) {
      if (i === a) continue;
      lo[i] = Math.min(A[i], E[i]); hi[i] = Math.max(A[i], E[i]);
      if (hi[i] - lo[i] > 31) { if (E[i] > A[i]) hi[i] = lo[i] + 31; else lo[i] = hi[i] - 31; }
    }
    rs.lo = lo; rs.hi = hi;
    if (rs.mode === 'place') rs.pieces = this.tilePieces(rs);
    else {
      const seen = new Set(), pieces = [];
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
        const t = w.get(x, y, z); if (!t || t === BK.water || y < 1 || seen.has(x + ',' + y + ',' + z)) continue;
        if (rs.mode === 'paint' && !this.canPaint(x, y, z)) continue;
        const cells = pieceCellsAt(w, x, y, z); cells.forEach(c => seen.add(c.join(',')));
        pieces.push({ cells });
      }
      rs.pieces = pieces;
    }
    const G = this.rectG; G.clear();
    this.ghost.visible = false; this.outline.visible = false;
    if (rs.mode === 'place') {
      const list = [];
      for (const pc of rs.pieces) pc.cells.forEach((c, i) => list.push([c[0] - A[0], c[1] - A[1], c[2] - A[2], pc.id, pc.metas[i]]));
      if (list.length) {
        const g = list[0][3] && BL[list[0][3]].kind === 'model' ? new THREE.Group() : meshCells(list);
        g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.material = Array.isArray(o.material) ? o.material.map(ghostMat) : ghostMat(o.material); } });
        g.position.set(A[0], A[1], A[2]); G.add(g);   // obniżenie (LOW) jest już w metadanych komórek
      }
      setGhostOpacity(.75);
    } else {
      const cells = rs.pieces.flatMap(p => p.cells);
      if (cells.length) {
        const im = new THREE.InstancedMesh(this.boxGeo, this.markMat[rs.mode], cells.length), mt = new THREE.Matrix4();
        cells.forEach((c, i) => im.setMatrixAt(i, mt.makeTranslation(c[0] - .015, c[1] - .015 - (w.meta(c[0], c[1], c[2]) & LOW ? .5 : 0), c[2] - .015)));
        G.add(im);
      }
    }
    G.visible = true;
    // obrys całego prostokąta: od razu widać, gdzie rząd się kończy
    const all = rs.pieces.flatMap(p => p.cells);
    if (all.length) this.setOutlineCells(all, rs.mode === 'erase' ? 0xff8a7a : rs.mode === 'paint' ? 0xfff0a0 : 0xffc83d, rs.mode === 'place' ? (rs.pieces[0].low ? .5 : 0) : (w.meta(A[0], A[1], A[2]) & LOW ? .5 : 0));
    const n = rs.pieces.length, lab = $('#b3-count'); lab.textContent = n; lab.classList.toggle('on', n > 0);
  },
  tilePieces(rs) {
    const k = this.item, d = BL[BK[k]], a = rs.axis, A = rs.anchor, lo = rs.lo, hi = rs.hi, ori = rs.ori, out = [];
    const add = (cells, base) => {
      if (!cells.every(c => this.cellFree(c)) || this.blockedBy(cells, d.kind !== 'water')) return;
      // podłoga (przeciąganie po wierzchu): każdy kawałek patrzy, na czym leży; mur: dolny rząd tak jak pierwszy klocek
      const sup = d.kind === 'water' ? { low: 0 } : a === 1 ? this.support(cells, d.id, base, null) : { low: rs.low || 0 };
      const low = a === 1 && !sup.low && !sup.merge && !cells.some(c => this.world.get(c[0], c[1] - 1, c[2])) ? rs.low || 0 : sup.low;
      if (low && d.nat && ((base >> 2) & 7) === 0) base |= 5 << 2;
      out.push({ cells, metas: withLinks(cells, base | low), id: d.id, low, merge: sup.merge, thick: sup.thick });
    };
    const P = isPieceItem(k) ? PIECES[this.piece] : null;
    const singleBase = !P ? (d.oriented ? ori : 0) : P.shape ? (P.shape << 2) | (P.oriented ? ori : 0) : P.plate ? 6 << 2 : P.slope ? (3 << 2) | ori : 5 << 2;
    const each = base => { for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) add([[x, y, z]], base); };
    if (!P || P.len === 1) { each(singleBase); return out; }
    if (P.plate) {
      if (a !== 1) { each(6 << 2); return out; }
      const used = new Set();
      for (let x = lo[0]; x <= hi[0]; x += 2) for (let z = lo[2]; z <= hi[2]; z += 2) {
        const cells = [[x, A[1], z], [x + 1, A[1], z], [x, A[1], z + 1], [x + 1, A[1], z + 1]];
        if (x + 1 <= hi[0] && z + 1 <= hi[2] && cells.every(c => this.cellFree(c))) { const before = out.length; add(cells, 6 << 2); if (out.length > before) { cells.forEach(c => used.add(c.join(','))); continue; } }
        for (const c of cells) if (c[0] <= hi[0] && c[2] <= hi[2] && !used.has(c.join(','))) { const before = out.length; add([c], 6 << 2); if (out.length > before) used.add(c.join(',')); }
      }
      return out;
    }
    // cegiełki, belki, skosy: rzędy wzdłuż poziomej osi, mur na zakładkę
    const rightAx = Math.abs(RIGHT[ori][0]) ? 0 : 2, ex = hi[0] - lo[0], ez = hi[2] - lo[2];
    const hAx = a !== 1 ? (a === 0 ? 2 : 0) : P.slope || ex === ez ? rightAx : ex > ez ? 0 : 2;
    const vAx = [0, 1, 2].find(i => i !== a && i !== hAx);
    const base = P.slope ? (3 << 2) | ori : 5 << 2, L = P.slope && hAx !== rightAx ? 1 : P.len;
    for (let rv = lo[vAx]; rv <= hi[vAx]; rv++) {
      const off = !P.slope && (rv - lo[vAx]) % 2 ? Math.floor(L / 2) : 0;
      for (let u = lo[hAx] - off; u <= hi[hAx]; u += L) {
        const s0 = Math.max(u, lo[hAx]), s1 = Math.min(u + L - 1, hi[hAx]);
        const mk = i => { const c = A.slice(); c[hAx] = i; c[vAx] = rv; return c; };
        const seg = []; for (let i = s0; i <= s1; i++) seg.push(mk(i));
        if (seg.length === L) { const before = out.length; add(seg, base); if (out.length > before) continue; }
        for (const c of seg) add([c], P.slope ? base : 5 << 2);
      }
    }
    return out;
  },
  rectApply(rs) {
    if (rs.mode === 'terrain') { this.strokeEnd(rs); return; }
    const pieces = rs.pieces || []; this.clearRect();
    if (!pieces.length) { Snd.soft(); return; }
    const w = this.world, rec = this.rec();
    if (rs.mode === 'place') {
      for (const pc of pieces) if (pc.cells.every(c => this.cellFree(c))) { if (!this.applySupport(rec, pc)) pc.cells.forEach((c, i) => this.setR(rec, c[0], c[1], c[2], pc.id, pc.metas[i])); }
      this.flashCells(pieces.flatMap(p => p.merge ? p.merge.cells : p.cells), 0);
    }
    else if (rs.mode === 'erase') {
      let cut = 0;
      for (const pc of pieces) {
        const [x, y, z] = pc.cells[0], t = w.get(x, y, z); if (!t) continue;
        if (CUTTABLE.has(BL[t].key)) { if (cut < 12) this.fallAnim(BL[t].key, x, y, z, w.meta(x, y, z)); cut++; }
        this.removeCell(rec, x, y, z);
      }
      if (cut) setTimeout(() => this.emit('tool', { tool: 'axe', n: cut }), 0);
    }
    else { const id = BK[this.item]; for (const pc of pieces) pc.cells.forEach(c => { if (this.canPaint(c[0], c[1], c[2])) this.setR(rec, c[0], c[1], c[2], id, w.meta(c[0], c[1], c[2])); }); }
    this.endRec(rec); this.dirty = true;
    pieces.slice(0, 6).forEach((p, i) => setTimeout(() => (rs.mode === 'erase' ? Snd.remove() : Snd.place(i)), i * 70));
    const col = rs.mode === 'erase' ? '#ffffff' : BL[rs.mode === 'place' ? pieces[0].id : BK[this.item]].c;
    for (let i = 0; i < pieces.length; i += Math.max(1, Math.floor(pieces.length / 6))) { const c = pieces[i].cells[0]; Parts3.burst(c[0], c[1], c[2], col, 3); if (rs.mode !== 'erase') Parts3.sparkle(c[0], c[1], c[2], 1); }
    const n = pieces.length; Voice.say(n + ' ' + klockiWord(n));
    if (rs.mode === 'place') { this.tut('place', n); this.tut('drag', n); this.emit('place', pieces.map(p => p.merge ? { id: p.id, cells: p.merge.cells, m: p.merge.metas[0] } : { id: p.id, cells: p.cells, m: p.metas[0] })); }
    else { this.tut(rs.mode, n); this.emit(rs.mode, rs.mode === 'paint' ? { id: BK[this.item], n } : n); }
  },
  clearRect() { if (this.rectG) { this.rectG.visible = false; this.rectG.clear(); } if (this.outline) this.outline.visible = false; const l = $('#b3-count'); if (l) l.classList.remove('on'); },
  // strzałka nad celem, tylko gdy palec jest na ekranie w budowaniu
  updatePin(time) {
    const d = this.drag, P = this.pin; if (!P) return;
    let c = null, top = 1;
    if (d && d.touch && this.mode === 'build' && !this.gest) {
      if (d.rs && d.rs.end && d.rs.mode !== 'terrain') { const E = d.rs.end; c = [E[0] + .5, E[1], E[2] + .5]; top = 1 - (d.rs.low ? .5 : 0); if (d.rs.mode !== 'place') top = 1; }
      else if (!d.moved && this.pl && !this.pl.tool && this.pl.cells) {
        const cs = this.pl.cells, mx = Math.max(...cs.map(q => q[1]));
        c = [cs.reduce((a, q) => a + q[0], 0) / cs.length + .5, mx, cs.reduce((a, q) => a + q[2], 0) / cs.length + .5]; top = 1 - (this.pl.low ? .5 : 0);
      } else if (!d.moved && this.hit && this.hit.x !== undefined && this.tool !== 'build') { c = [this.hit.x + .5, this.hit.y, this.hit.z + .5]; }
    }
    if (!c) { P.visible = false; return; }
    const k = clamp(Cam.dist / 9, .8, 6);
    P.visible = true; P.scale.setScalar(k);
    P.position.set(c[0], c[1] + top + .35 * k + Math.abs(Math.sin(time * 5)) * .25 * k, c[2]);
  },
  // krótki błysk na świeżo postawionych klockach
  flashCells(cells, dy) {
    if (!cells || !cells.length || !this.flashMat) return;
    if (this.flash) { this.scene.remove(this.flash.m); this.flash.m.dispose(); }
    const w = this.world, im = new THREE.InstancedMesh(this.boxGeo, this.flashMat, cells.length), mt = new THREE.Matrix4();
    cells.forEach((c, i) => im.setMatrixAt(i, mt.makeTranslation(c[0] - .015, c[1] - .015 - (w.meta(c[0], c[1], c[2]) & LOW ? .5 : 0), c[2] - .015)));
    im.renderOrder = 5; this.scene.add(im); this.flash = { m: im, t: 0 };
  },
  updateFlash(dt) {
    const f = this.flash; if (!f) return;
    f.t += dt; this.flashMat.opacity = .55 * Math.max(0, 1 - f.t / .6);
    if (f.t > .6) { this.scene.remove(f.m); f.m.dispose(); this.flash = null; }
  },

  /* ----- zmiany świata z cofaniem ----- */
  rec() { return { c: [], addA: [], remA: [] }; },
  setR(rec, x, y, z, t, m) { const w = this.world; rec.c.push([x, y, z, w.get(x, y, z), w.meta(x, y, z)]); w.set(x, y, z, t, m); },
  endRec(rec) { if (rec.c.length || rec.addA.length || rec.remA.length) { this.undo.push(rec); if (this.undo.length > 80) this.undo.shift(); } },
  place(pl) {
    const w = this.world, rec = this.rec();
    if (pl.animal) { const a = new Animal3(pl.animal, pl.x, pl.y, pl.z); w.addAnimal(a); rec.addA.push(a); Snd.animal(pl.animal); Parts3.heart(pl.x + .5, pl.y + 1.6, pl.z + .5, 2); this.emit('animal', pl.animal); }
    else {
      const merged = this.applySupport(rec, pl);
      if (!merged) pl.cells.forEach((c, i) => this.setR(rec, c[0], c[1], c[2], pl.id, pl.metas[i]));
      Snd.place(pl.id); pl.cells.slice(0, 3).forEach(c => Parts3.burst(c[0], c[1], c[2], BL[pl.id].c, 4));
      Parts3.sparkle(pl.x, pl.y, pl.z, 3);
      this.flashCells(merged ? pl.merge.cells : pl.cells, pl.low ? .5 : 0);
      this.emit('place', [merged ? { id: pl.id, cells: pl.merge.cells, m: pl.merge.metas[0] } : { id: pl.id, cells: pl.cells, m: pl.metas[0] }]);
    }
    this.endRec(rec); this.dirty = true;
    if (this.player.pos.distanceTo(new V3(pl.x + .5, pl.y, pl.z + .5)) < 24) this.player.act(pl.x + .5, pl.z + .5);
  },
  removeCell(rec, x, y, z) {
    const w = this.world; if (!w.get(x, y, z)) return;
    const cells = pieceCellsAt(w, x, y, z);
    for (const c of cells) this.setR(rec, c[0], c[1], c[2], 0, 0);
    for (const c of cells) {
      if (c[1] <= SEA4 && [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, d]) => w.get(c[0] + a, c[1] + b, c[2] + d) === BK.water)) this.setR(rec, c[0], c[1], c[2], BK.water, 0);
      const up = w.get(c[0], c[1] + 1, c[2]);
      if (needsGround(up)) this.removeCell(rec, c[0], c[1] + 1, c[2]);
    }
  },
  erase(x, y, z) {
    const w = this.world, t = w.get(x, y, z);
    if (!t) return false;
    if (y < 1) { Snd.soft(); this.toast('Tego nie da się zabrać'); return false; }
    const key = BL[t].key, m = w.meta(x, y, z), tree = CUTTABLE.has(key);
    const rec = this.rec(); this.removeCell(rec, x, y, z); this.endRec(rec);
    Snd.remove(); this.dirty = true;
    if (tree) { this.fallAnim(key, x, y, z, m); this.emit('tool', { tool: 'axe', n: 1 }); }
    else Parts3.burst(x, y, z, BL[t].c, 10);
    return true;
  },
  paint(x, y, z) {
    if (!this.canPaint(x, y, z)) { Snd.soft(); return; }
    const w = this.world, rec = this.rec(), id = BK[this.item];
    for (const c of pieceCellsAt(w, x, y, z)) if (this.canPaint(c[0], c[1], c[2])) this.setR(rec, c[0], c[1], c[2], id, w.meta(c[0], c[1], c[2]));
    this.endRec(rec);
    Snd.place(id + 2); Parts3.burst(x, y, z, BL[id].c, 6); this.dirty = true;
    this.emit('paint', { id, n: 1 });
  },
  doUndo() {
    const r = this.undo.pop(); if (!r) { Snd.soft(); return; }
    for (let i = r.c.length - 1; i >= 0; i--) { const [x, y, z, t, m] = r.c[i]; this.world.set(x, y, z, t, m); }
    r.addA.forEach(a => this.world.removeAnimal(a)); r.remA.forEach(a => this.world.addAnimal(a));
    Snd.remove(); this.dirty = true;
  },
  updateDoors(dt) {
    const p = this.player.pos;
    for (const o of this.world.doors.values()) {
      const U = o.userData, [cx, cz] = U.center, y = U.cell[1];
      const near = Math.hypot(p.x - cx, p.z - cz) < 3.2 && Math.abs(p.y - y) < 3;
      if (near && U.open < .05) { const lp = o.worldToLocal(p.clone()); U.side = lp.z > 0 ? 1 : -1; }
      U.open += ((near ? 1 : 0) - U.open) * (1 - Math.exp(-8 * dt));
      U.pivot.rotation.y = U.open * 1.45 * U.side;
    }
  },

  /* ----- samouczek ----- */
  tutStart() { this.tutI = 0; this.tutP = this.player.pos.clone(); this.tutShow(); },
  tutShow() {
    const el = $('#b3-tut'), s = TUT[this.tutI];
    $$('.pulse').forEach(e => e.classList.remove('pulse'));
    if (!s || this.tutI < 0) { el.classList.remove('on'); return; }
    const say = IS_TOUCH && s.t ? s.t : s.say;
    el.innerHTML = `<span class="em">${s.em}</span><span class="tt">${say}</span><button class="btn icon small" id="tut-say" title="Powtórz">${ICON.speaker}</button><button class="btn small" id="tut-skip">Pomiń</button>`;
    el.classList.add('on');
    $('#tut-say').onclick = () => Voice.say(say, true);
    $('#tut-skip').onclick = () => this.tutEnd();
    const hl = IS_TOUCH && s.hlT ? s.hlT : s.hl;
    if (hl) { const t = $(hl); if (t) t.classList.add('pulse'); }
    Voice.say(say);
    if (s.id === 'end') setTimeout(() => { if (TUT[this.tutI] && TUT[this.tutI].id === 'end') this.tutEnd(); }, 8000);
  },
  tut(ev, val) {
    if (this.tutI < 0) return;
    const s = TUT[this.tutI]; if (!s) return;
    const ok = (s.id === 'walk' && ev === 'moved') || (s.id === 'mode' && ev === 'mode' && val === 'build') ||
      (s.id === 'place' && ev === 'place') || (s.id === 'drag' && ev === 'drag' && val >= 2) ||
      (s.id === 'erase' && ev === 'erase') || (s.id === 'walk2' && ev === 'mode' && val === 'walk');
    if (!ok) return;
    this.tutI++;
    if (TUT[this.tutI] && ['place', 'drag', 'erase'].includes(TUT[this.tutI].id) && this.mode !== 'build') this.tutI = 1;
    clearTimeout(this.tutT);
    this.tutT = setTimeout(() => { Snd.success(); this.tutShow(); }, 900);
  },
  tutEnd() { this.tutI = -1; Store.set('tut4', true); $('#b3-tut').classList.remove('on'); $$('.pulse').forEach(e => e.classList.remove('pulse')); },

  /* ----- pętla ----- */
  update(dt, time) {
    const w = this.world; if (!w) return;
    const sf = this.mode === 'build' ? this.bfocus : this.player.pos;
    w.stream(sf.x, sf.z, this.ready ? 6 : 30);
    if (!this.ready) {
      const pr = w.progress(this.player.pos.x, this.player.pos.z); this.loading(pr);
      if (pr >= 1) this.finishLoad();
      this.env.follow(this.player.pos); this.env.update(dt, time, this.cam.position);
      this.cam.position.set(this.player.pos.x + 20, 45, this.player.pos.z + 20); this.cam.lookAt(this.player.pos.x, 18, this.player.pos.z);
      return;
    }
    const dg = this.drag;
    if (dg && this.mode === 'build' && dg.btn === 0 && !dg.moved && !dg.rs && now() - dg.t0 > HOLD) { if (this.armRect()) dg.timer = true; else dg.t0 = 1e9; }
    if (this.keys.camL) { Cam.yaw += dt * 1.8; this.camUserT = now(); }
    if (this.keys.camR) { Cam.yaw -= dt * 1.8; this.camUserT = now(); }
    const physOK = w.ready(this.player.pos.x, this.player.pos.z);
    let focus;
    if (this.mode === 'walk') {
      const auto = this.followPath(dt);
      if (physOK) this.player.update(dt, w, this.keys, Cam.cy, auto);
      this.autoCam(dt);
      focus = this.player.focus();
      if (this.tutI === 0 && this.tutP && Math.hypot(this.player.pos.x - this.tutP.x, this.player.pos.z - this.tutP.z) > 5) this.tut('moved');
    } else {
      if (physOK) this.player.update(dt, w, {}, Cam.cy, null);
      this.panBuild(dt);
      focus = this.bfocus;
    }
    if (this.ring.visible) this.ring.scale.setScalar(1 + Math.sin(time * 6) * .12);
    if (this.flag.userData.flag) this.flag.userData.flag.rotation.y = Math.sin(time * 2) * .25;
    updateAnimals3(w, dt, time, this.player.pos);
    Missions.update(dt, time);
    this.updateDoors(dt);
    Cam.update(dt, w, focus, this.cam);
    this.env.follow(focus); this.env.update(dt, time, this.cam.position);
    TEX.water.offset.set(time * .03, time * .02);
    Parts3.update(dt);
    this.updateToolAnims(dt);
    WIND.uTime.value = time;
    Life.update(dt, time, w, this.mode === 'walk' ? this.player.pos : this.bfocus);
    if (!(this.drag && this.drag.rs)) this.updateTarget();
    this.updatePin(time); this.updateFlash(dt);
    this.updateCompass();
    this.saveAcc += dt;
    if (this.dirty && this.saveAcc > 4) { this.saveAcc = 0; this.dirty = false; this.save(false); }
  },
  save(thumb) {
    if (!this.world || !this.ready) return;
    const p = this.player, walk = this.mode === 'walk', w = this.world;
    w.saveDirty(this.slot);
    Store.set('w4_' + this.slot, {
      v: 4, P: w.P, home: this.home, look: this.player.look,
      p: [p.pos.x, p.pos.y, p.pos.z, p.yaw],
      cam: [Cam.yaw, walk ? Cam.pitch : (this.walkCam ? this.walkCam.pitch : CAMW.pitch), walk ? Cam.dist : (this.walkCam ? this.walkCam.dist : CAMW.dist)],
      a: w.animals.map(a => [a.kind, a.cx, a.cy, a.cz]),
      mis: Missions.save(),
    });
    if (thumb && Engine.ok && Engine.host === $('#build-host')) {
      try {
        this.outline.visible = false; this.ghost.visible = false; this.rectG.visible = false; this.ring.visible = false; Engine.render();
        const src = Engine.r.domElement, c = document.createElement('canvas'); c.width = 320; c.height = 200;
        const sw = src.width, sh = src.height, ar = 1.6; let cw = sw, ch = sw / ar; if (ch > sh) { ch = sh; cw = sh * ar; }
        c.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 320, 200);
        Store.set('w4t_' + this.slot, c.toDataURL('image/jpeg', .72));
      } catch (e) {}
    }
  },
};
screens.build = Build3;
