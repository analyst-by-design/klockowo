/* =========================================================
   ŚWIAT 3D (Three.js) — tryb budowania z ludzikiem
   ========================================================= */
const N3 = 64, H3 = 28, CS = 16, SEA = 4, PI = Math.PI;
const V3 = THREE.Vector3;
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), s = t => t * t * (3 - 2 * t), u = s(x - xi), v = s(y - yi);
  return lerp(lerp(h2(xi, yi, seed), h2(xi + 1, yi, seed), u), lerp(h2(xi, yi + 1, seed), h2(xi + 1, yi + 1, seed), u), v);
}
function fbm(x, y, seed) { return vnoise(x, y, seed) * .6 + vnoise(x * 2.1, y * 2.1, seed + 7) * .3 + vnoise(x * 4.3, y * 4.3, seed + 13) * .1; }
function sstep(a, b, t) { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function angLerp(a, b, t) { const d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * t; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function rleEnc(u8) {
  const out = [];
  for (let i = 0; i < u8.length;) { const v = u8[i]; let n = 1; while (i + n < u8.length && u8[i + n] === v && n < 255) n++; out.push(n, v); i += n; }
  return b64enc(new Uint8Array(out));
}
function rleDec(str, len) {
  const s = atob(str), u = new Uint8Array(len);
  for (let i = 0, p = 0; i + 1 < s.length; i += 2) { const n = s.charCodeAt(i); u.fill(s.charCodeAt(i + 1), p, p + n); p += n; }
  return u;
}

/* ---------- tekstury (rysowane w kodzie) ---------- */
const TEX = {};
function mkTex(name, draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size, mulberry(hashStr(name)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TEX[name] = t);
}
function speckle(g, s, r, cols, n, a, b) { for (let i = 0; i < n; i++) { g.fillStyle = pick(r, cols); const z = a + r() * (b - a); g.fillRect(r() * s, r() * s, z, z); } }
function blobs(g, s, r, cols, n, a, b, alpha) {
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(r, cols); const x = r() * s, y = r() * s, rad = a + r() * (b - a);
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { g.beginPath(); g.arc(x + ox, y + oy, rad, 0, PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
}
function makeTextures() {
  const DIRT = ['#c0925f', '#d3a673', '#ddb683', '#b88a5a'];
  const dirt = (g, s, r) => { g.fillStyle = '#c99c69'; g.fillRect(0, 0, s, s); blobs(g, s, r, DIRT, 26, 5, 14, .45); speckle(g, s, r, DIRT.concat('#a87d52'), 200, 2, 4); };
  mkTex('dirt', dirt);
  mkTex('grassTop', (g, s, r) => {
    g.fillStyle = '#88c868'; g.fillRect(0, 0, s, s);
    blobs(g, s, r, ['#7dbd5d', '#95d273', '#83c463', '#9ad87a'], 40, 8, 18, .5);
    g.lineWidth = 1.6;
    for (let i = 0; i < 380; i++) { g.strokeStyle = pick(r, ['#70b153', '#9ad877', '#7fc05e', '#a6dd82']); const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 3, y - 2 - r() * 4); g.stroke(); }
  });
  mkTex('grassSide', (g, s, r) => {
    dirt(g, s, r);
    g.fillStyle = '#88c868'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0);
    for (let x = s; x >= 0; x -= 6) g.lineTo(x, s * .16 + r() * s * .12);
    g.closePath(); g.fill();
    g.strokeStyle = '#74b556'; g.lineWidth = 1.6;
    for (let i = 0; i < 60; i++) { const x = r() * s, y = r() * s * .2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 2, y + 3 + r() * 3); g.stroke(); }
  });
  mkTex('sand', (g, s, r) => { g.fillStyle = '#efdca6'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#e7d196', '#f5e7bd'], 30, 5, 14, .5); speckle(g, s, r, ['#d9c287', '#f8edc9', '#e0ca8e'], 300, 1, 3); });
  mkTex('stone', (g, s, r) => {
    g.fillStyle = '#b6b9c1'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#a9acb5', '#c3c6cd', '#b0b3bb'], 30, 8, 20, .55);
    g.strokeStyle = 'rgba(120,124,134,.55)'; g.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - .5) * 26; y += (r() - .5) * 26; g.lineTo(x, y); } g.stroke(); }
    speckle(g, s, r, ['#9fa2ab', '#cdd0d6'], 160, 1, 3);
  });
  mkTex('cobble', (g, s, r) => {
    g.fillStyle = '#868892'; g.fillRect(0, 0, s, s);
    const n = 4, c = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i + .5) * c + (r() - .5) * 5, y = (j + .5) * c + (r() - .5) * 5, rx = c * (.4 + r() * .06), ry = c * (.38 + r() * .06);
      g.fillStyle = pick(r, ['#b7bac2', '#aeb1ba', '#c3c5cb', '#a7aab3']); g.beginPath(); g.ellipse(x, y, rx, ry, r() * PI, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - rx * .25, y - ry * .3, rx * .5, ry * .35, 0, 0, PI * 2); g.fill();
    }
  });
  mkTex('brick', (g, s, r) => {
    g.fillStyle = '#e4d6c6'; g.fillRect(0, 0, s, s);
    const rows = 4, bh = s / rows, bw = s / 2;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw + off; x < s; x += bw) {
        g.fillStyle = pick(r, ['#cf7b63', '#c9735c', '#d6856c', '#c66f58']); g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(x + 2, row * bh + 2, bw - 4, 3);
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 2, row * bh + bh - 5, bw - 4, 3);
      }
    }
    speckle(g, s, r, ['rgba(120,60,40,.25)', 'rgba(255,230,210,.25)'], 120, 1, 3);
  });
  mkTex('planks', (g, s, r) => {
    const rows = 4, h = s / rows;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = pick(r, ['#ddb27a', '#d5a86f', '#e2b983', '#d9ad74']); g.fillRect(0, i * h, s, h);
      g.strokeStyle = 'rgba(150,100,55,.35)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const y0 = i * h + 3 + r() * (h - 6); g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= s; x += 16) g.lineTo(x, y0 + Math.sin(x * .05 + k) * 1.5); g.stroke(); }
      g.fillStyle = '#a97a49'; g.fillRect(0, i * h + h - 2, s, 2);
      const jx = (i * 37 + 20) % s; g.fillRect(jx, i * h, 2, h);
      g.fillStyle = '#8f6a45'; g.fillRect(jx + 6, i * h + h / 2 - 1, 2, 2); g.fillRect(jx - 7, i * h + h / 2 - 1, 2, 2);
    }
  });
  mkTex('plaster', (g, s, r) => { g.fillStyle = '#f3ebdd'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#ebe1d1', '#faf5ec'], 40, 6, 16, .5); speckle(g, s, r, ['#e2d7c6', '#fffaf2'], 200, 1, 2); });
  mkTex('bark', (g, s, r) => {
    g.fillStyle = '#8b6446'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { g.strokeStyle = pick(r, ['#6f4e34', '#a07a57', '#7d593d']); g.lineWidth = 2 + r() * 3; let x = r() * s; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= s; y += 16) { x += (r() - .5) * 4; g.lineTo(x, y); } g.stroke(); }
  });
  mkTex('logTop', (g, s, r) => {
    g.fillStyle = '#8b6446'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#dcb784'; g.beginPath(); g.arc(s / 2, s / 2, s * .44, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(160,115,70,.6)'; g.lineWidth = 2;
    for (let rr = s * .38; rr > 4; rr -= s * .07) { g.beginPath(); g.arc(s / 2 + (r() - .5) * 2, s / 2 + (r() - .5) * 2, rr, 0, PI * 2); g.stroke(); }
  });
  mkTex('leaves', (g, s, r) => {
    g.fillStyle = '#58a24c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) { g.fillStyle = pick(r, ['#6fbf5e', '#4c9443', '#7cc96a', '#5daa50', '#87d175']); g.beginPath(); g.ellipse(r() * s, r() * s, 3 + r() * 4, 2 + r() * 2, r() * PI, 0, PI * 2); g.fill(); }
  });
  const roof = (base, dark, light) => (g, s, r) => {
    g.fillStyle = dark; g.fillRect(0, 0, s, s);
    const rows = 4, rh = s / rows, tw = s / 4;
    for (let row = rows - 1; row >= 0; row--) {
      const y0 = row * rh - 2;
      for (let i = -1; i <= 4; i++) {
        const x = i * tw + (row % 2 ? tw / 2 : 0);
        g.fillStyle = pick(r, [base, base, light]);
        g.beginPath(); g.moveTo(x + 1, y0); g.lineTo(x + tw - 1, y0); g.lineTo(x + tw - 1, y0 + rh - tw / 2); g.arc(x + tw / 2, y0 + rh - tw / 2, tw / 2 - 1, 0, PI); g.closePath(); g.fill();
        g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, y0 + 2, 3, rh - tw / 2);
      }
    }
  };
  mkTex('roofRed', roof('#d6705a', '#a5503f', '#e2856d'));
  mkTex('roofBlue', roof('#6f9cd6', '#4b72aa', '#86afe2'));
  mkTex('snow', (g, s, r) => { g.fillStyle = '#f5f9fe'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#e6eef7', '#ffffff'], 30, 6, 16, .6); speckle(g, s, r, ['#dce6f1', '#ffffff'], 140, 1, 3); });
  const toy = (base, lt, dk) => (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.fillStyle = lt; g.fillRect(0, 0, s, 6); g.fillRect(0, 0, 6, s);
    g.fillStyle = dk; g.fillRect(0, s - 6, s, 6); g.fillRect(s - 6, 0, 6, s);
    g.strokeStyle = lt; g.lineWidth = 3; g.strokeRect(18, 18, s - 36, s - 36);
  };
  mkTex('pink', toy('#f5b7ca', '#fad3df', '#e9a2b8'));
  mkTex('blue', toy('#a8cef2', '#c9e1f8', '#90bce8'));
  mkTex('yellow', toy('#f8dd8e', '#fcebb8', '#efcd71'));
  mkTex('frame', (g, s, r) => { g.fillStyle = '#f5f0e6'; g.fillRect(0, 0, s, s); speckle(g, s, r, ['#ece4d6', '#fffaf3'], 120, 1, 3); });
  mkTex('darkwood', (g, s, r) => {
    const n = 3, w = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = pick(r, ['#9b6b45', '#a5744c', '#93653f']); g.fillRect(i * w, 0, w, s);
      g.strokeStyle = 'rgba(80,50,25,.3)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const x0 = i * w + 4 + r() * (w - 8); g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + (r() - .5) * 6, s); g.stroke(); }
      g.fillStyle = '#7a5233'; g.fillRect(i * w, 0, 2, s);
    }
  });
  mkTex('fenceWood', (g, s, r) => { g.fillStyle = '#e2b67f'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(160,110,60,.35)'; g.lineWidth = 1; for (let k = 0; k < 14; k++) { const y0 = r() * s; g.beginPath(); g.moveTo(0, y0); g.lineTo(s, y0 + (r() - .5) * 6); g.stroke(); } });
  mkTex('water', (g, s, r) => {
    g.fillStyle = '#5cb6e4'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(205,238,252,.6)'; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const x = r() * s, y = r() * s; for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { g.beginPath(); g.arc(x + ox, y + oy, 6 + (i % 4) * 2, PI * 1.15, PI * 1.85); g.stroke(); } }
  });
  // gładkie tekstury dla klocków (krawędzie robi zaokrąglenie klocka)
  const plain = (base, cols, n = 160) => (g, s, r) => { g.fillStyle = base; g.fillRect(0, 0, s, s); blobs(g, s, r, cols, 26, 8, 20, .35); speckle(g, s, r, cols, n, 1, 3); };
  mkTex('brickP', plain('#d27d64', ['#c9735c', '#db8a70', '#c56e57', '#e09478'], 260));
  mkTex('stoneP', plain('#c3c6cd', ['#b7bac2', '#ced0d6', '#babdc5'], 200));
  mkTex('pinkP', plain('#f5b7ca', ['#f2aec3', '#f8c4d4']));
  mkTex('blueP', plain('#a8cef2', ['#9fc7ee', '#b5d6f5']));
  mkTex('yellowP', plain('#f8dd8e', ['#f5d683', '#fae5a3']));
  mkTex('whiteP', plain('#f7f4ee', ['#efe9e0', '#fdfbf7']));
  mkTex('greenP', plain('#a8dc95', ['#9fd48c', '#b6e3a6'])); mkTex('greenT', toy('#a8dc95', '#c6eab9', '#90cc7c'));
  mkTex('orangeP', plain('#f7b886', ['#f3ad78', '#f9c69b'])); mkTex('orangeT', toy('#f7b886', '#fbd2b0', '#eea06a'));
  mkTex('purpleP', plain('#c9b2ef', ['#c0a7ea', '#d4c1f3'])); mkTex('purpleT', toy('#c9b2ef', '#dccdf6', '#b59ce6'));
  mkTex('goldP', (g, s, r) => { plain('#f2cc5b', ['#eec04a', '#f7da7c', '#e9b93e'], 220)(g, s, r); speckle(g, s, r, ['rgba(255,255,255,.8)', 'rgba(255,250,220,.9)'], 40, 1, 2); });
  mkTex('sandstone', (g, s, r) => {
    g.fillStyle = '#e8cf9a'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#e1c48c', '#efd9aa', '#e4c992'], 26, 8, 20, .4);
    g.strokeStyle = 'rgba(190,150,90,.35)'; g.lineWidth = 2;
    for (let i = 1; i < 5; i++) { const y0 = i * s / 5 + (r() - .5) * 6; g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= s; x += 16) g.lineTo(x, y0 + (r() - .5) * 3); g.stroke(); }
    speckle(g, s, r, ['#d6b97e', '#f4e2bb'], 160, 1, 3);
  });
  mkTex('marble', (g, s, r) => {
    g.fillStyle = '#f4f3f1'; g.fillRect(0, 0, s, s); blobs(g, s, r, ['#ecebe8', '#fbfbfa'], 30, 10, 24, .5);
    for (let i = 0; i < 6; i++) { g.strokeStyle = pick(r, ['rgba(160,160,175,.45)', 'rgba(190,185,200,.4)']); g.lineWidth = 1 + r() * 1.5; let x = r() * s, y = 0; g.beginPath(); g.moveTo(x, y); while (y < s) { x += (r() - .5) * 22; y += 10 + r() * 12; g.lineTo(x, y); } g.stroke(); }
  });
  mkTex('glassT', (g, s, r) => {
    g.fillStyle = '#d7eefa'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6;
    for (const o of [.25, .42]) { g.beginPath(); g.moveTo(s * o, 0); g.lineTo(0, s * o); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(s, s * .55); g.lineTo(s * .55, s); g.stroke();
    g.strokeStyle = 'rgba(160,200,225,.9)'; g.lineWidth = 6; g.strokeRect(3, 3, s - 6, s - 6);
  });
  mkTex('thatch', (g, s, r) => {
    g.fillStyle = '#c99a4c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) { g.strokeStyle = pick(r, ['#e2b866', '#d7a956', '#b8863e', '#ecc77b']); g.lineWidth = 1.5 + r(); const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 4, y + 10 + r() * 10); g.stroke(); }
    g.fillStyle = 'rgba(120,80,30,.25)'; for (let i = 1; i < 4; i++) g.fillRect(0, i * s / 4 - 2, s, 3);
  });
  mkTex('roofGreen', roof('#7fb86a', '#5a8f4a', '#95c982'));
  mkTex('heart', (g, s) => drawHeart(g, s / 2, s / 2, s * .32, '#f59ab0'), 64);
  mkTex('spark', (g, s) => {
    const c = s / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.25, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * PI / 4, rr = i % 2 ? s * .13 : s * .5; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }, 64);
}
const MAT = {};
const TRANSPARENT = new Set(['water', 'glass']);
function makeMaterials() {
  for (const k of Object.keys(TEX)) if (k !== 'water' && k !== 'heart') MAT[k] = new THREE.MeshLambertMaterial({ map: TEX[k], vertexColors: true });
  MAT.water = new THREE.MeshLambertMaterial({ map: TEX.water, vertexColors: true, transparent: true, opacity: .8, depthWrite: false });
  MAT.glass = new THREE.MeshLambertMaterial({ color: 0xd7eefa, vertexColors: true, transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide });
  MAT.glassT = new THREE.MeshLambertMaterial({ map: TEX.glassT, vertexColors: true, transparent: true, opacity: .55, depthWrite: false });
  MAT.doorM = new THREE.MeshLambertMaterial({ map: TEX.darkwood });
  MAT.frameM = new THREE.MeshLambertMaterial({ map: TEX.frame });
  MAT.model = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  MAT.model.onBeforeCompile = sh => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uAmp = WIND.uAmp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 wp = modelMatrix * vec4(position, 1.0); float ph = uTime * 1.5 + wp.x * .29 + wp.z * .21;
        transformed.x += sin(ph) * uv.x * .14 * uAmp; transformed.z += cos(ph * .83) * uv.x * .1 * uAmp; }`);
  };
}
// wiatr: trawa, kwiatki i korony drzew kołyszą się (przesunięcie w shaderze, waga w uv.x)
const WIND = { uTime: { value: 0 }, uAmp: { value: 1 } };
const SWAY = { tree: 1, spruce: .6, bush: .35, flowers: 1.3, mushroom: .15, wheat: 1.2, carrots: .5, pot: .2 };
/* scala grupę obiektów w jedną geometrię z kolorami wierzchołków (szybsze rysowanie) */
function bakeGroup(root) {
  root.updateMatrixWorld(true);
  const P = [], Nn = [], C = [], I = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, mt = o.material;
    const col = mt.color || new THREE.Color(1, 1, 1), em = mt.emissive || new THREE.Color(0, 0, 0);
    const cr = Math.min(1, col.r + em.r * .7), cg = Math.min(1, col.g + em.g * .7), cb = Math.min(1, col.b + em.b * .7);
    nm.getNormalMatrix(o.matrixWorld);
    const base = P.length / 3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); P.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); Nn.push(v.x, v.y, v.z);
      C.push(cr, cg, cb);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(base + g.index.getX(i));
    else for (let i = 0; i < pos.count; i++) I.push(base + i);
  });
  return { p: P, n: Nn, c: C, i: I };
}
const MODEL_BAKE = {};
function emitModel(bk, x, y, z, key, ori, seed, ms = 1, lo = false) {
  if (lo && key === 'flowers') return;
  const id = key + '|' + ori + '|' + (seed % 5) + '|' + ms + (lo ? '|lo' : '');
  const sc = ms * (ms === 2 && (key === 'tree' || key === 'spruce') ? 1.3 : 1);
  let M = MODEL_BAKE[id];
  if (!M) {
    M = MODEL_BAKE[id] = bakeGroup((() => { const g = buildModel(key, ori, (seed % 5) + 1, lo); g.scale.multiplyScalar(sc); return g; })());
    let hm = .01; for (let i = 1; i < M.p.length; i += 3) hm = Math.max(hm, M.p[i]);
    const f = SWAY[key] || 0; M.w = [];
    for (let i = 1; i < M.p.length; i += 3) { const t = Math.max(0, M.p[i] / hm); M.w.push(f * t * t); }
  }
  const B = bk.get('model'), base = B.p.length / 3, ox = x + .5, oz = z + .5;
  for (let i = 0, j = 0; i < M.p.length; i += 3, j++) { B.p.push(M.p[i] + ox, M.p[i + 1] + y, M.p[i + 2] + oz); B.uv.push(M.w[j], 0); }
  for (let i = 0; i < M.n.length; i++) { B.n.push(M.n[i]); B.c.push(M.c[i]); }
  for (let i = 0; i < M.i.length; i++) B.i.push(M.i[i] + base);
}
function bakedMesh(group, material) {
  const M = bakeGroup(group), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(M.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(M.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(M.c, 3)); g.setIndex(M.i); g.computeBoundingSphere();
  return new THREE.Mesh(g, material);
}

/* ---------- klocki, kształty, przedmioty ---------- */
const BL = [null], BK = {};
function defB(key, d) { d.key = key; d.id = BL.length; BL.push(d); BK[key] = d.id; }
defB('grass',   { kind: 'mat', nat: true, name: 'trawa', tex: ['grassTop', 'grassSide', 'dirt'], c: '#88c868' });
defB('dirt',    { kind: 'mat', nat: true, name: 'ziemia', tex: 'dirt', c: '#b4875b' });
defB('sand',    { kind: 'mat', nat: true, name: 'piasek', tex: 'sand', c: '#efdca6' });
defB('stone',   { kind: 'mat', nat: true, name: 'skała', tex: 'stone', c: '#b6b9c1' });
defB('cobble',  { kind: 'mat', name: 'bruk', tex: 'cobble', c: '#a7aab3' });
defB('brick',   { kind: 'mat', name: 'cegła', tex: 'brick', texP: 'brickP', c: '#cf7b63' });
defB('planks',  { kind: 'mat', name: 'deski', tex: 'planks', c: '#ddb27a' });
defB('plaster', { kind: 'mat', name: 'tynk', tex: 'plaster', c: '#f3ebdd' });
defB('log',     { kind: 'mat', name: 'pień', tex: ['logTop', 'bark', 'logTop'], c: '#8b6446' });
defB('hedge',   { kind: 'mat', name: 'żywopłot', tex: 'leaves', c: '#58a24c' });
defB('roofRed', { kind: 'mat', name: 'dachówka', tex: ['roofRed', 'plaster', 'plaster'], shape: 3, c: '#d6705a' });
defB('roofBlue',{ kind: 'mat', name: 'niebieski dach', tex: ['roofBlue', 'plaster', 'plaster'], shape: 3, unlock: 10, c: '#6f9cd6' });
defB('pink',    { kind: 'mat', name: 'różowy', tex: 'pink', texP: 'pinkP', unlock: 6, c: '#f5b7ca' });
defB('blue',    { kind: 'mat', name: 'niebieski', tex: 'blue', texP: 'blueP', unlock: 6, c: '#a8cef2' });
defB('yellow',  { kind: 'mat', name: 'żółty', tex: 'yellow', texP: 'yellowP', unlock: 6, c: '#f8dd8e' });
defB('snow',    { kind: 'mat', nat: true, name: 'śnieg', tex: 'snow', c: '#f5f9fe' });
defB('water',   { kind: 'water', name: 'woda', c: '#5cb6e4' });
defB('window',  { kind: 'window', name: 'okno', oriented: true, c: '#f5f0e6' });
defB('door',    { kind: 'door', name: 'drzwi', oriented: true, unlock: 1, c: '#9b6b45' });
defB('doorTop', { kind: 'doorTop', c: '#9b6b45' });
defB('fence',   { kind: 'fence', name: 'płotek', unlock: 4, c: '#e2b67f' });
defB('tree',    { kind: 'model', name: 'drzewo', solid: true, c: '#6fbf5e' });
defB('spruce',  { kind: 'model', name: 'choinka', solid: true, c: '#4e9a5a' });
defB('bush',    { kind: 'model', name: 'krzaczek', c: '#6fbf5e' });
defB('flowers', { kind: 'model', name: 'kwiatki', c: '#f7a8bd' });
defB('rock',    { kind: 'model', name: 'głaz', solid: true, c: '#a9adb6' });
defB('bench',   { kind: 'model', name: 'ławka', solid: true, oriented: true, c: '#c98f58' });
defB('lamp',    { kind: 'model', name: 'latarnia', solid: true, unlock: 12, c: '#5d6475' });
defB('mushroom',{ kind: 'model', name: 'grzybek', unlock: 14, c: '#f2a2b5' });
defB('stoneB',  { kind: 'mat', name: 'kamień', tex: 'stoneP', c: '#c3c6cd' });
defB('white',   { kind: 'mat', name: 'biały', tex: 'whiteP', unlock: 16, c: '#f7f4ee' });
defB('darkwood',  { kind: 'mat', name: 'ciemne deski', tex: 'darkwood', c: '#9b6b45' });
defB('sandstone', { kind: 'mat', name: 'piaskowiec', tex: 'sandstone', c: '#e8cf9a' });
defB('marble',    { kind: 'mat', name: 'marmur', tex: 'marble', unlock: 8, c: '#f4f3f1' });
defB('glassB',    { kind: 'mat', name: 'szkło', tex: 'glassT', unlock: 3, c: '#d7eefa' });
defB('thatch',    { kind: 'mat', name: 'strzecha', tex: ['thatch', 'plaster', 'plaster'], shape: 3, c: '#c99a4c' });
defB('roofGreen', { kind: 'mat', name: 'zielony dach', tex: ['roofGreen', 'plaster', 'plaster'], shape: 3, c: '#7fb86a' });
defB('green',     { kind: 'mat', name: 'zielony', tex: 'greenT', texP: 'greenP', c: '#a8dc95' });
defB('orange',    { kind: 'mat', name: 'pomarańczowy', tex: 'orangeT', texP: 'orangeP', c: '#f7b886' });
defB('purple',    { kind: 'mat', name: 'fioletowy', tex: 'purpleT', texP: 'purpleP', c: '#c9b2ef' });
defB('gold',      { kind: 'mat', name: 'złoty', tex: 'goldP', unlock: 20, c: '#f2cc5b' });
defB('table',   { kind: 'model', name: 'stół', solid: true, c: '#c98f58' });
defB('chair',   { kind: 'model', name: 'krzesło', oriented: true, c: '#c98f58' });
defB('bed',     { kind: 'model', name: 'łóżko', solid: true, oriented: true, c: '#8fb7e8' });
defB('pot',     { kind: 'model', name: 'doniczka', c: '#e08a63' });
defB('barrel',  { kind: 'model', name: 'beczka', solid: true, c: '#a0703f' });
defB('chest',   { kind: 'model', name: 'skrzynia', solid: true, oriented: true, c: '#b57a42' });
defB('mailbox', { kind: 'model', name: 'skrzynka na listy', oriented: true, c: '#e86a5a' });
defB('well',    { kind: 'model', name: 'studnia', solid: true, unlock: 4, c: '#a7aab3' });
defB('slide',   { kind: 'model', name: 'zjeżdżalnia', solid: true, oriented: true, unlock: 2, c: '#f2c14e' });
defB('swing',   { kind: 'model', name: 'huśtawka', oriented: true, unlock: 2, c: '#e86a5a' });
defB('carrots', { kind: 'model', name: 'marchewki', c: '#f39a4a' });
defB('wheat',   { kind: 'model', name: 'zboże', c: '#e8c867' });
const SHAPES = ['kostka', 'połówka', 'schodek', 'skos', 'słupek'];
const ANIM3 = {
  dog: { name: 'piesek' }, sheep: { name: 'owieczka', unlock: 2 }, cat: { name: 'kotek', unlock: 8 },
  chicken: { name: 'kurka', unlock: 18 }, bunny: { name: 'króliczek', unlock: 20 },
};
/* Dolny pasek: pięć dużych przycisków "co robię", a pod Buduj cztery grupy klocków */
const CATS = [
  { name: 'Klocki', icon: '🧱', items: ['brick', 'planks', 'darkwood', 'plaster', 'stoneB', 'sandstone', 'marble', 'cobble', 'log', 'hedge', 'glassB', 'roofRed', 'roofBlue', 'roofGreen', 'thatch'] },
  { name: 'Kolory', icon: '🎨', items: ['pink', 'blue', 'yellow', 'green', 'orange', 'purple', 'white', 'gold'] },
  { name: 'Dom', icon: '🏠', items: ['window', 'door', 'fence', 'table', 'chair', 'bed', 'pot', 'barrel', 'chest', 'mailbox', 'bench', 'lamp', 'well', 'slide', 'swing'] },
  { name: 'Gotowe', icon: '🎁', items: ['!house', '!garden', '!pen', '!playground', '!farm', '!stall', '!bridge', '!tower', '!castle'] },
];
const NATURE = ['~tree', '~spruce', '~bush', '~flowers', '~dig', '~raise', '~flat', '~water', 'rock', 'mushroom', 'carrots', 'wheat', 'grass', 'dirt', 'sand', 'stone', 'snow'];
const ANIMAL_ITEMS = ['@dog', '@sheep', '@cat', '@chicken', '@bunny'];
const PAINTS = CATS[1].items.concat(CATS[0].items);
const GROUPS = [
  { id: 'build', name: 'Buduj', em: '🔨', tool: 'build', say: 'Buduj. Klocki, meble i gotowe budowle.' },
  { id: 'nature', name: 'Przyroda', em: '🌳', tool: 'build', items: NATURE, say: 'Przyroda. Sadź drzewa, kop dołki, usyp górki, nalej wody.' },
  { id: 'animals', name: 'Zwierzaki', em: '🐑', tool: 'build', items: ANIMAL_ITEMS, say: 'Zwierzaki.' },
  { id: 'paint', name: 'Maluj', em: '🖌️', tool: 'paint', items: PAINTS, say: 'Maluj. Wybierz kolor i dotknij klocka.' },
  { id: 'erase', name: 'Zabierz', em: '✋', tool: 'erase', items: [], say: 'Zabierz. Dotknij klocka, drzewa albo zwierzaka.' },
];
const groupOf = k => CATS.some(c => c.items.includes(k)) ? 'build' : NATURE.includes(k) ? 'nature' : ANIMAL_ITEMS.includes(k) ? 'animals' : 'build';
const ALL_ITEMS = CATS.flatMap(c => c.items).concat(NATURE, ANIMAL_ITEMS);
const itemInfo = k => k[0] === '@' ? ANIM3[k.slice(1)] : k[0] === '!' ? PREFABS[k.slice(1)] : k[0] === '~' ? TOOLS[k.slice(1)] : BL[BK[k]];
const unlocked3 = k => settings.unlockAll || !itemInfo(k).unlock || stars() >= itemInfo(k).unlock || (typeof Missions !== 'undefined' && Missions.needs(k));
const isModelType = t => t && BL[t].kind === 'door';
const needsGround = t => t && (BL[t].kind === 'model' || BL[t].kind === 'door');
const replaceable = t => t && BL[t].kind === 'model' && !BL[t].solid;
const texFor = (d, ny) => typeof d.tex === 'string' ? d.tex : ny > .1 ? d.tex[0] : ny < -.1 ? d.tex[2] : d.tex[1];

/* ---------- modele (drzewa, dekoracje, postacie) ---------- */
const GEO = {};
const geo = (k, f) => GEO[k] || (GEO[k] = f());
const MCOL = {};
function cmat(col, o = {}) {
  const k = col + '|' + (o.e || '') + (o.flat === false ? 's' : 'f');
  return MCOL[k] || (MCOL[k] = new THREE.MeshLambertMaterial({ color: col, flatShading: o.flat !== false, emissive: o.e || '#000000' }));
}
function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; me.receiveShadow = true; return me;
}
const GREENS = ['#6fbf5e', '#7cc96a', '#63b456', '#82cf70'];
const rot = (o, ax, v) => { o.rotation[ax] = v; return o; };
function buildModel(key, ori, seed, lo = false) {
  const g = new THREE.Group(), r = mulberry(seed || 7);
  const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  const blob = lo ? geo('blob0', () => new THREE.IcosahedronGeometry(1, 0)) : geo('blob', () => new THREE.IcosahedronGeometry(1, 1));
  const sph = geo('sph', () => new THREE.SphereGeometry(1, 14, 10));
  switch (key) {
    case 'tree': {
      const s = .85 + r() * .35;
      g.add(mesh(geo('trunk', () => new THREE.CylinderGeometry(.12, .18, 1.6, 7)), cmat('#8b6446'), 0, .8 * s, 0, s));
      for (const [x, y, z, sc] of [[0, 1.95, 0, .9], [.45, 1.65, .2, .62], [-.4, 1.7, -.25, .66], [.05, 2.45, -.05, .6], [-.2, 1.6, .42, .55]])
        g.add(mesh(blob, cmat(pick(r, GREENS)), x * s, y * s, z * s, sc * s));
      g.rotation.y = r() * PI * 2; break;
    }
    case 'spruce': {
      const s = .85 + r() * .3, gr = pick(r, ['#4e9a5a', '#4a9155', '#559f60']);
      g.add(mesh(geo('trunkS', () => new THREE.CylinderGeometry(.1, .14, .8, 6)), cmat('#7a573b'), 0, .4, 0));
      const cone = geo('cone', () => new THREE.ConeGeometry(1, 1, 8));
      for (const [y, rad, h] of [[.95, .95, 1.1], [1.6, .75, .95], [2.15, .52, .8]]) g.add(mesh(cone, cmat(gr), 0, y * s, 0, rad * s, h * s, rad * s));
      g.rotation.y = r() * PI * 2; break;
    }
    case 'bush':
      for (const [x, y, z, sc] of [[0, .3, 0, .42], [.25, .25, .1, .3], [-.22, .24, -.08, .32], [.05, .46, -.05, .3]]) g.add(mesh(blob, cmat(pick(r, GREENS)), x, y, z, sc));
      g.rotation.y = r() * PI * 2; break;
    case 'flowers': {
      if (lo) break;
      const stem = geo('stem', () => new THREE.CylinderGeometry(.014, .014, 1, 3, 1, true)), head = geo('fhead', () => new THREE.OctahedronGeometry(.075, 0)), dot = geo('fdot', () => new THREE.TetrahedronGeometry(.04, 0)), tuft = geo('tuft', () => new THREE.ConeGeometry(.045, .26, 3, 1, true));
      for (let i = 0; i < 6; i++) {
        const x = (r() - .5) * .7, z = (r() - .5) * .7, h = .22 + r() * .2;
        g.add(mesh(stem, cmat('#5fa64f'), x, h / 2, z, 1, h, 1));
        g.add(mesh(head, cmat(pick(r, ['#f7a8bd', '#fbd46d', '#c9a8f2', '#ffffff', '#f6a38f', '#9ec9f5', '#f58f8f'])), x, h, z, 1.15, .7, 1.15));
        g.add(mesh(dot, cmat('#f7cf55'), x, h + .04, z));
      }
      for (let i = 0; i < 6; i++) g.add(mesh(tuft, cmat('#78bf62'), (r() - .5) * .8, .12, (r() - .5) * .8));
      break;
    }
    case 'rock': {
      const d = geo('rock', () => new THREE.DodecahedronGeometry(.42, 0));
      g.add(mesh(d, cmat('#a9adb6'), 0, .25, 0, 1, .7, .9)); g.add(mesh(d, cmat('#bfc2c9'), .3, .1, .25, .4, .35, .4));
      g.rotation.y = r() * PI * 2; break;
    }
    case 'bench': {
      const w = cmat('#c98f58'), m = cmat('#5f6676');
      g.add(mesh(box, w, 0, .42, .05, .9, .06, .32)); g.add(mesh(box, w, 0, .68, -.14, .9, .2, .05));
      for (const x of [-.38, .38]) { g.add(mesh(box, m, x, .21, .05, .06, .42, .3)); g.add(mesh(box, m, x, .58, -.14, .05, .34, .05)); }
      break;
    }
    case 'lamp': {
      const m = cmat('#5d6475');
      g.add(mesh(geo('post', () => new THREE.CylinderGeometry(.045, .065, 1.7, 8)), m, 0, .85, 0));
      g.add(mesh(box, cmat('#fff1bf', { e: '#ffcf66' }), 0, 1.82, 0, .22, .26, .22));
      const cap = mesh(geo('lcap', () => new THREE.ConeGeometry(.2, .16, 4)), m, 0, 2.02, 0); cap.rotation.y = PI / 4; g.add(cap);
      break;
    }
    case 'mushroom': {
      g.add(mesh(geo('mstem', () => new THREE.CylinderGeometry(.07, .09, .26, 8)), cmat('#fbf1df', { flat: false }), 0, .13, 0));
      g.add(mesh(geo('mcap', () => new THREE.SphereGeometry(.21, 14, 6, 0, PI * 2, 0, PI / 2)), cmat('#f2a2b5', { flat: false }), 0, .24, 0, 1, .8, 1));
      for (const [x, z] of [[.08, .05], [-.07, .08], [0, -.1], [-.1, -.04]]) g.add(mesh(sph, cmat('#ffffff', { flat: false }), x, .36 - Math.hypot(x, z) * .5, z, .025));
      break;
    }
    case 'table': {
      const w = cmat('#c98f58'), d = cmat('#a5723f');
      g.add(mesh(box, w, 0, .74, 0, .92, .07, .92));
      for (const [x, z] of [[-.38, -.38], [.38, -.38], [-.38, .38], [.38, .38]]) g.add(mesh(box, d, x, .36, z, .07, .72, .07));
      g.add(mesh(geo('vase', () => new THREE.CylinderGeometry(.06, .05, .16, 8)), cmat('#9ec9f5', { flat: false }), 0, .86, 0));
      g.add(mesh(sph, cmat('#f7a8bd', { flat: false }), 0, .99, 0, .06));
      break;
    }
    case 'chair': {
      const w = cmat('#c98f58'), d = cmat('#a5723f');
      g.add(mesh(box, w, 0, .44, .04, .5, .06, .5)); g.add(mesh(box, w, 0, .78, -.19, .5, .5, .06));
      for (const [x, z] of [[-.2, -.18], [.2, -.18], [-.2, .24], [.2, .24]]) g.add(mesh(box, d, x, .21, z, .06, .42, .06));
      break;
    }
    case 'bed': {
      const w = cmat('#c98f58');
      g.add(mesh(box, w, 0, .2, 0, .95, .28, 1.9)); g.add(mesh(box, w, 0, .45, -.92, .95, .6, .08));
      g.add(mesh(box, cmat('#fbf6ee'), 0, .38, .05, .88, .12, 1.75));
      g.add(mesh(box, cmat('#8fb7e8'), 0, .43, .3, .9, .1, 1.2));
      g.add(mesh(sph, cmat('#ffffff', { flat: false }), 0, .48, -.62, .3, .1, .18));
      break;
    }
    case 'pot': {
      g.add(mesh(geo('potC', () => new THREE.CylinderGeometry(.2, .14, .3, 10)), cmat('#e08a63', { flat: false }), 0, .15, 0));
      g.add(rot(mesh(geo('potR', () => new THREE.TorusGeometry(.2, .03, 6, 14)), cmat('#d27a55', { flat: false }), 0, .3, 0), 'x', PI / 2));
      g.add(mesh(blob, cmat('#6fbf5e'), 0, .45, 0, .16));
      for (let i = 0; i < 3; i++) g.add(mesh(sph, cmat(pick(r, ['#f7a8bd', '#fbd46d', '#c9a8f2', '#f6a38f'])), Math.cos(i * 2.1) * .1, .55 + i * .03, Math.sin(i * 2.1) * .1, .06));
      break;
    }
    case 'barrel': {
      g.add(mesh(geo('barrelB', () => new THREE.CylinderGeometry(.32, .32, .8, 12)), cmat('#a0703f'), 0, .4, 0, 1, 1, 1));
      g.add(mesh(geo('barrelM', () => new THREE.CylinderGeometry(.35, .35, .55, 12)), cmat('#a0703f'), 0, .4, 0));
      for (const y of [.14, .66]) g.add(mesh(geo('hoop', () => new THREE.CylinderGeometry(.345, .345, .05, 12)), cmat('#6b6f7a'), 0, y, 0));
      break;
    }
    case 'chest': {
      const w = cmat('#b57a42'), m = cmat('#f3cf6b');
      g.add(mesh(box, w, 0, .22, 0, .8, .44, .52));
      g.add(rot(mesh(geo('chestLid', () => new THREE.CylinderGeometry(.26, .26, .8, 12, 1, false, 0, PI)), w, 0, .44, 0, 1, .7, 1), 'z', PI / 2));
      for (const x of [-.3, .3]) g.add(mesh(box, m, x, .32, 0, .06, .66, .56));
      g.add(mesh(box, m, 0, .4, .27, .12, .14, .04));
      break;
    }
    case 'mailbox': {
      g.add(mesh(geo('post', () => new THREE.CylinderGeometry(.045, .065, 1.7, 8)), cmat('#8b6446'), 0, .45, 0, 1, .55, 1));
      g.add(mesh(box, cmat('#e86a5a'), 0, 1.0, 0, .3, .26, .46));
      g.add(rot(mesh(geo('mbTop', () => new THREE.CylinderGeometry(.15, .15, .46, 10, 1, false, 0, PI)), cmat('#e86a5a'), 0, 1.13, 0), 'x', PI / 2));
      g.add(mesh(box, cmat('#f3cf6b'), .17, 1.15, -.1, .03, .2, .06));
      break;
    }
    case 'well': {
      const st = cmat('#b7bac2'), w = cmat('#a5723f');
      g.add(mesh(geo('wellR', () => new THREE.CylinderGeometry(.45, .48, .6, 12, 1, true)), st, 0, .3, 0));
      g.add(mesh(geo('wellW', () => new THREE.CylinderGeometry(.4, .4, .05, 12)), cmat('#5cb6e4', { flat: false }), 0, .45, 0));
      for (const x of [-.42, .42]) g.add(mesh(box, w, x, .9, 0, .07, 1.2, .07));
      g.add(rot(mesh(geo('wellRoof', () => new THREE.ConeGeometry(.75, .45, 4)), cmat('#d6705a'), 0, 1.65, 0), 'y', PI / 4));
      g.add(rot(mesh(geo('crank', () => new THREE.CylinderGeometry(.04, .04, .9, 6)), w, 0, 1.15, 0), 'z', PI / 2));
      g.add(mesh(geo('bucket', () => new THREE.CylinderGeometry(.09, .07, .14, 8)), cmat('#8b6446'), 0, .85, 0));
      break;
    }
    case 'slide': {
      const c1 = cmat('#f2c14e'), c2 = cmat('#6fa8dc'), m = cmat('#e86a5a');
      for (const x of [-.25, .25]) { g.add(mesh(box, c2, x, .6, -.55, .06, 1.2, .06)); g.add(mesh(box, c2, x, .55, -.05, .06, 1.1, .06)); }
      for (let i = 0; i < 4; i++) g.add(mesh(box, m, 0, .2 + i * .27, -.55, .5, .04, .1));
      g.add(mesh(box, c1, 0, 1.1, -.3, .56, .06, .56));
      const sl = mesh(box, c1, 0, .62, .45, .5, .05, 1.4); sl.rotation.x = .62; g.add(sl);
      for (const x of [-.27, .27]) { const rl = mesh(box, m, x, .7, .45, .04, .12, 1.4); rl.rotation.x = .62; g.add(rl); }
      break;
    }
    case 'swing': {
      const f = cmat('#e86a5a'), w = cmat('#c98f58');
      for (const x of [-.6, .6]) for (const z of [-.25, .25]) { const l = mesh(box, f, x, .75, z * .6, .06, 1.55, .06); l.rotation.x = z > 0 ? -.3 : .3; g.add(l); }
      g.add(mesh(box, f, 0, 1.5, 0, 1.3, .07, .07));
      for (const x of [-.22, .22]) g.add(mesh(box, cmat('#6b6f7a'), x, 1.0, 0, .02, 1.0, .02));
      g.add(mesh(box, w, 0, .5, 0, .55, .05, .22));
      break;
    }
    case 'carrots': {
      g.add(mesh(box, cmat('#a97c52'), 0, .04, 0, .9, .08, .9));
      for (let i = 0; i < 6; i++) {
        const x = ((i % 3) - 1) * .28, z = (Math.floor(i / 3) - .5) * .4;
        g.add(mesh(geo('carrot', () => new THREE.ConeGeometry(.05, .14, 6)), cmat('#f39a4a'), x, .1, z, 1, 1, 1));
        for (const a of [-.4, 0, .4]) { const lf = mesh(geo('leafT', () => new THREE.ConeGeometry(.025, .22, 4)), cmat('#6fbf5e'), x + a * .05, .26, z); lf.rotation.z = a; g.add(lf); }
      }
      break;
    }
    case 'wheat': {
      g.add(mesh(box, cmat('#b8925e'), 0, .03, 0, .92, .06, .92));
      for (let i = 0; i < 12; i++) {
        const x = (r() - .5) * .8, z = (r() - .5) * .8, h = .45 + r() * .2;
        g.add(mesh(geo('stem', () => new THREE.CylinderGeometry(.014, .014, 1, 3, 1, true)), cmat('#d9b95a'), x, h / 2, z, 1, h, 1));
        g.add(mesh(geo('ear', () => new THREE.CapsuleGeometry(.03, .1, 2, 5)), cmat('#efd27a'), x, h + .04, z));
      }
      break;
    }
    case 'door': {
      const pivot = new THREE.Group(); pivot.position.set(-.44, 0, 0); g.add(pivot);
      const panel = mesh(geo('doorPanel', () => new THREE.BoxGeometry(.88, 1.92, .08)), MAT.doorM, .44, .97, 0); pivot.add(panel);
      for (const z of [-.06, .06]) pivot.add(mesh(sph, cmat('#f3cf6b', { flat: false }), .76, .95, z, .045));
      for (const [x, y, sx, sy] of [[-.47, 1, .06, 2], [.47, 1, .06, 2], [0, 1.97, 1, .06]]) g.add(mesh(box, MAT.frameM, x, y, 0, sx, sy, .14));
      g.userData.pivot = pivot; g.userData.open = 0; g.userData.side = 1;
      break;
    }
  }
  if (BL[BK[key]] && BL[BK[key]].oriented) g.rotation.y = -ori * PI / 2;
  return g;
}

const LOOK = {
  kind: [{ k: 'human', name: 'ludzik', em: '🧒' }, { k: 'fox', name: 'lisek', em: '🦊' }, { k: 'bear', name: 'miś', em: '🐻' }, { k: 'cat', name: 'kotek', em: '🐱' }, { k: 'bunny', name: 'królik', em: '🐰' }, { k: 'panda', name: 'panda', em: '🐼' }, { k: 'robot', name: 'robot', em: '🤖' }],
  skin: ['#f4cfae', '#e8b48f', '#c98d68', '#9a6648', '#6e4630'],
  fur: { fox: ['#f08a3c', '#d9a35f', '#f4f1ec'], bear: ['#a8754b', '#7a5236', '#e3c08e'], cat: ['#b8b8c4', '#f2a65a', '#3d3a44'], bunny: ['#f7f1ea', '#c8b4a0', '#d6d0dc'], panda: ['#f7f5f0'], robot: ['#b9c6d6', '#f2c14e', '#a8dc95'] },
  shirt: ['#6fa8dc', '#e98f7f', '#7fbf73', '#f2c14e', '#b48ad8', '#f29bb8', '#f6f2ea', '#3f4a5f'],
  pattern: [{ k: 'plain', name: 'gładka', em: '⬜' }, { k: 'stripes', name: 'paski', em: '〰️' }, { k: 'star', name: 'gwiazdka', em: '⭐' }, { k: 'heart', name: 'serduszko', em: '💗' }],
  pants: ['#4d5f8f', '#7a5a43', '#4f8a6a', '#8a64a8', '#5d636e', '#e98f7f'],
  hair: ['#7a5236', '#3d2b22', '#e3b65c', '#c8693b', '#25222a', '#f29bb8', '#8fb7e8'],
  style: [{ k: 'short', name: 'krótkie', em: '👦' }, { k: 'tails', name: 'kucyki', em: '👧' }, { k: 'long', name: 'długie', em: '👩' }, { k: 'curly', name: 'loczki', em: '🧑‍🦱' }, { k: 'bun', name: 'kok', em: '👱‍♀️' }, { k: 'cap', name: 'czapka', em: '🧢' }],
  eyes: [{ k: 'round', name: 'kropki', em: '👀' }, { k: 'big', name: 'duże', em: '🥺' }, { k: 'happy', name: 'wesołe', em: '😊' }],
  acc: [{ k: 'none', name: 'nic', em: '➖', need: 0 }, { k: 'flower', name: 'kwiatek', em: '🌸', need: 0 }, { k: 'bow', name: 'kokarda', em: '🎀', need: 0 }, { k: 'backpack', name: 'plecak', em: '🎒', need: 0 },
    { k: 'headphones', name: 'słuchawki', em: '🎧', need: 3 }, { k: 'cape', name: 'peleryna', em: '🦸', need: 6 }, { k: 'crown', name: 'korona', em: '👑', need: 10 }],
};
const HEROES = [
  { name: 'Zosia', look: { kind: 'human', skin: '#f4cfae', hair: '#e3b65c', style: 'tails', shirt: '#f29bb8', pattern: 'heart', pants: '#6fa8dc', eyes: 'big', acc: 'bow' } },
  { name: 'Antek', look: { kind: 'human', skin: '#e8b48f', hair: '#3d2b22', style: 'cap', shirt: '#6fa8dc', pattern: 'stripes', pants: '#4d5f8f', eyes: 'round', acc: 'backpack' } },
  { name: 'Maja', look: { kind: 'human', skin: '#9a6648', hair: '#25222a', style: 'curly', shirt: '#f2c14e', pattern: 'star', pants: '#8a64a8', eyes: 'happy', acc: 'flower' } },
  { name: 'Lisek', look: { kind: 'fox', skin: '#f08a3c', shirt: '#7fbf73', pattern: 'plain', pants: '#4d5f8f' } },
  { name: 'Miś', look: { kind: 'bear', skin: '#a8754b', shirt: '#f2c14e', pattern: 'stripes', pants: '#e98f7f' } },
  { name: 'Kotek', look: { kind: 'cat', skin: '#b8b8c4', shirt: '#b48ad8', pattern: 'star', pants: '#5d636e' } },
  { name: 'Królik', look: { kind: 'bunny', skin: '#f7f1ea', shirt: '#f29bb8', pattern: 'heart', pants: '#6fa8dc' } },
  { name: 'Panda', look: { kind: 'panda', skin: '#f7f5f0', shirt: '#7fbf73', pattern: 'plain', pants: '#3f4a5f' } },
  { name: 'Robot', look: { kind: 'robot', skin: '#b9c6d6', shirt: '#6fa8dc', pattern: 'plain', pants: '#5d636e' } },
];
const DEFAULT_LOOK = { kind: 'human', skin: '#f4cfae', shirt: LOOK.shirt[0], pattern: 'plain', pants: LOOK.pants[0], hair: LOOK.hair[0], style: 'short', eyes: 'round', glasses: false, acc: 'none' };
const SHIRT_TEX = {};
function shirtTex(col, pat) {
  const k = col + pat; if (SHIRT_TEX[k]) return SHIRT_TEX[k];
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = col; g.fillRect(0, 0, 128, 64);
  if (pat === 'stripes') { g.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 6; y < 64; y += 14) g.fillRect(0, y, 128, 6); }
  const motif = fn => { for (let i = 0; i < 5; i++) for (const [dx, y] of [[0, 20], [16, 46]]) fn(i * 32 + dx, y); };
  if (pat === 'star') motif((x, y) => { g.fillStyle = '#fff6c9'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 3.5 : 8; g.lineTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r); } g.closePath(); g.fill(); });
  if (pat === 'heart') motif((x, y) => drawHeart(g, x, y, 5.5, '#ffffff'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return (SHIRT_TEX[k] = t);
}
function buildPerson(look) {
  if (typeof look === 'string') look = { ...DEFAULT_LOOK, shirt: look };
  look = { ...DEFAULT_LOOK, ...(look || {}) };
  const K = look.kind || 'human', animal = K !== 'human';
  const g = new THREE.Group(), U = {};
  const skin = cmat(look.skin, { flat: false });
  const sh = look.pattern && look.pattern !== 'plain' ? new THREE.MeshLambertMaterial({ map: shirtTex(look.shirt, look.pattern) }) : new THREE.MeshLambertMaterial({ color: look.shirt });
  const pants = cmat(look.pants, { flat: false });
  const shoe = cmat(K === 'robot' ? '#5d636e' : '#5b4a3f'), hair = cmat(look.hair, { flat: false }), dark = cmat('#2c2730', { flat: false }), white = cmat('#ffffff', { flat: false });
  const cap = (r, l) => geo('cap' + r + l, () => new THREE.CapsuleGeometry(r, l, 4, 12));
  const limb = (x, y, r, l, m, end) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(mesh(cap(r, l), m, 0, -(l / 2 + r * .6), 0)); if (end) p.add(end); g.add(p); return p; };
  const shoeG = geo('shoe', () => new THREE.BoxGeometry(.17, .1, .27));
  U.legL = limb(-.11, .52, .1, .26, pants, mesh(shoeG, shoe, 0, -.46, .04));
  U.legR = limb(.11, .52, .1, .26, pants, mesh(shoeG, shoe, 0, -.46, .04));
  U.body = mesh(cap(.21, .24), sh, 0, .82, 0, 1, 1, .78); g.add(U.body);
  const hand = geo('hand', () => new THREE.SphereGeometry(.075, 10, 8));
  U.armL = limb(-.29, 1.02, .075, .28, sh, mesh(hand, skin, 0, -.44, 0));
  U.armR = limb(.29, 1.02, .075, .28, sh, mesh(hand, skin, 0, -.44, 0));
  U.head = new THREE.Group(); U.head.position.y = 1.4; U.head.scale.setScalar(1.2); g.add(U.head);
  const H = U.head, sph = geo('sphU', () => new THREE.SphereGeometry(1, 16, 12));
  if (K === 'robot') {
    H.add(mesh(geo('rHead', () => new THREE.BoxGeometry(.46, .4, .42)), skin, 0, 0, 0));
    H.add(mesh(geo('rFace', () => new THREE.BoxGeometry(.38, .28, .02)), cmat('#3d4a5c', { flat: false }), 0, 0, .21));
    H.add(mesh(geo('rAnt', () => new THREE.CylinderGeometry(.015, .015, .16, 6)), dark, 0, .28, 0), mesh(sph, cmat('#e86a5a', { e: '#a83a2a', flat: false }), 0, .37, 0, .045));
    for (const sx of [-1, 1]) H.add(rot(mesh(geo('rBolt', () => new THREE.CylinderGeometry(.05, .05, .05, 10)), cmat('#8a96a8', { flat: false }), sx * .25, 0, 0), 'z', PI / 2));
  } else {
    H.add(mesh(geo('headS', () => new THREE.SphereGeometry(.25, 20, 16)), skin));
  }
  const ear = (gm, m, x, y, z, rz, sc = [1, 1, 1]) => { const e = mesh(gm, m, x, y, z, ...sc); e.rotation.z = rz; H.add(e); return e; };
  if (K === 'fox') {
    const cone = geo('earC', () => new THREE.ConeGeometry(.08, .2, 4));
    for (const sx of [-1, 1]) { ear(cone, skin, sx * .15, .25, -.02, -sx * .35); ear(cone, cmat('#3d2b22'), sx * .155, .33, -.01, -sx * .35, [.45, .4, .45]); }
    H.add(mesh(sph, white, 0, -.08, .17, .14, .1, .14), mesh(sph, dark, 0, -.05, .3, .035));
  } else if (K === 'bear' || K === 'panda') {
    const em = K === 'panda' ? dark : skin;
    for (const sx of [-1, 1]) { H.add(mesh(sph, em, sx * .18, .19, -.02, .085)); H.add(mesh(sph, K === 'panda' ? dark : cmat('#e3b893', { flat: false }), sx * .18, .19, .01, .05, .05, .03)); }
    H.add(mesh(sph, K === 'panda' ? white : cmat('#e3c39b', { flat: false }), 0, -.08, .19, .11, .08, .08), mesh(sph, dark, 0, -.04, .26, .035, .027, .03));
    if (K === 'panda') for (const sx of [-1, 1]) H.add(rot(mesh(sph, dark, sx * .085, 0, .2, .07, .09, .04), 'z', sx * .5));
  } else if (K === 'cat') {
    const cone = geo('earC', () => new THREE.ConeGeometry(.08, .2, 4));
    for (const sx of [-1, 1]) { ear(cone, skin, sx * .15, .24, -.02, -sx * .28); ear(cone, cmat('#f3a7ae', { flat: false }), sx * .148, .235, .005, -sx * .28, [.5, .55, .3]); }
    H.add(mesh(sph, white, 0, -.08, .2, .09, .06, .06), mesh(sph, cmat('#f3a7ae', { flat: false }), 0, -.04, .25, .025));
    for (const sx of [-1, 1]) for (const dy of [-.02, .02]) { const wsk = mesh(geo('whisk', () => new THREE.BoxGeometry(.16, .006, .006)), dark, sx * .17, -.07 + dy, .2); wsk.rotation.z = sx * dy * 4; H.add(wsk); }
  } else if (K === 'bunny') {
    const earG = geo('bEar', () => new THREE.CapsuleGeometry(.05, .24, 4, 8));
    for (const sx of [-1, 1]) { ear(earG, skin, sx * .09, .36, -.03, -sx * .12); ear(earG, cmat('#f3a7ae', { flat: false }), sx * .09, .35, .0, -sx * .12, [.55, .8, .4]); }
    H.add(mesh(sph, white, 0, -.09, .2, .08, .06, .06), mesh(sph, cmat('#f3a7ae', { flat: false }), 0, -.05, .245, .025));
  } else if (K === 'human') {
    const hairS = look.style;
    if (hairS === 'cap') {
      const cm = cmat('#e8735f', { flat: false });
      H.add(mesh(geo('hairS', () => new THREE.SphereGeometry(.262, 20, 10, 0, PI * 2, 0, PI * .5)), hair, 0, -.02, -.03, 1, .9, 1));
      H.add(mesh(geo('capD', () => new THREE.SphereGeometry(.272, 20, 10, 0, PI * 2, 0, PI * .4)), cm, 0, .035, -.01));
      H.add(mesh(geo('capB', () => new THREE.CylinderGeometry(.17, .17, .025, 18, 1, false, -PI / 2, PI)), cm, 0, .1, .2));
    } else {
      H.add(mesh(geo('hair', () => new THREE.SphereGeometry(.266, 20, 10, 0, PI * 2, 0, PI * .47)), hair, 0, .025, -.025));
      if (hairS === 'tails') {
        const ball = geo('tail', () => new THREE.SphereGeometry(.085, 12, 10)), tie = cmat('#f28aa5', { flat: false });
        for (const sx of [-1, 1]) { H.add(mesh(ball, hair, sx * .26, -.04, -.1, 1, 1.25, 1)); H.add(mesh(geo('tie', () => new THREE.SphereGeometry(.035, 8, 6)), tie, sx * .21, .03, -.08)); }
      }
      if (hairS === 'long') H.add(mesh(geo('longH', () => new THREE.SphereGeometry(.27, 18, 12, 0, PI * 2, PI * .3, PI * .55)), hair, 0, -.06, -.06, 1.02, 1.15, .95));
      if (hairS === 'curly') for (let i = 0; i < 14; i++) { const a = i * 2.4, t = .25 + (i % 5) * .13; H.add(mesh(sph, hair, Math.cos(a) * .24 * Math.sin(t * PI), .1 + Math.cos(t * PI) * .16, Math.sin(a) * .22 * Math.sin(t * PI) - .03, .075)); }
      if (hairS === 'bun') H.add(mesh(sph, hair, 0, .27, -.1, .1));
    }
  }
  // oczy
  const eyeR = look.eyes === 'big' && !animal ? .048 : .036, eyeY = K === 'robot' ? .03 : 0, eyeZ = K === 'robot' ? .225 : .222;
  const eyeM = K === 'robot' ? cmat('#9ff0ff', { e: '#3ac7e0', flat: false }) : dark;
  if (look.eyes === 'happy' && !animal) {
    U.eyes = [-1, 1].map(sx => rot(mesh(geo('happyE', () => new THREE.TorusGeometry(.035, .011, 6, 12, PI)), dark, sx * .085, -.01, .225), 'z', 0));
  } else U.eyes = [mesh(geo('eye' + eyeR, () => new THREE.SphereGeometry(eyeR, 10, 8)), eyeM, -.085, eyeY, eyeZ), mesh(geo('eye' + eyeR, () => new THREE.SphereGeometry(eyeR, 10, 8)), eyeM, .085, eyeY, eyeZ)];
  if (K !== 'robot' && look.eyes !== 'happy') { const shine = geo('shine', () => new THREE.SphereGeometry(.012, 6, 5)); U.eyes.forEach(e => e.add(mesh(shine, white, .012, .014, .03, eyeR > .04 ? 1.5 : 1))); }
  U.eyes.forEach(e => H.add(e));
  if (K === 'human' || K === 'robot') {
    if (K === 'human') { const ck = geo('cheek', () => new THREE.SphereGeometry(.045, 10, 8)), ckm = cmat('#f3a7ae', { flat: false }); H.add(mesh(ck, ckm, -.15, -.07, .185, 1, .6, .4), mesh(ck, ckm, .15, -.07, .185, 1, .6, .4)); }
    const smile = mesh(geo('smile', () => new THREE.TorusGeometry(.06, .014, 6, 14, PI)), K === 'robot' ? cmat('#9ff0ff', { e: '#3ac7e0', flat: false }) : dark, 0, -.075, K === 'robot' ? .225 : .232); smile.rotation.z = PI; H.add(smile);
  } else { const smile = mesh(geo('smileS', () => new THREE.TorusGeometry(.04, .01, 6, 12, PI)), dark, 0, -.11, .24); smile.rotation.z = PI; H.add(smile); }
  if (look.glasses && !animal) { const gm = cmat('#3d3a44', { flat: false }), ring = geo('glass', () => new THREE.TorusGeometry(.055, .009, 6, 16)); for (const sx of [-1, 1]) H.add(mesh(ring, gm, sx * .085, 0, .235)); H.add(mesh(geo('bridge', () => new THREE.BoxGeometry(.06, .01, .01)), gm, 0, .005, .238)); }
  // ogon zwierzaków
  if (K === 'fox') { const t = mesh(geo('foxTail', () => new THREE.CapsuleGeometry(.08, .28, 4, 8)), skin, 0, .62, -.27); t.rotation.x = -.9; g.add(t); g.add(mesh(sph, white, 0, .5, -.41, .07)); }
  if (K === 'cat') { const t = mesh(geo('catTail', () => new THREE.CapsuleGeometry(.035, .36, 4, 8)), skin, 0, .7, -.26); t.rotation.x = -.5; g.add(t); }
  if (K === 'bunny' || K === 'bear' || K === 'panda') g.add(mesh(sph, K === 'panda' ? dark : skin, 0, .62, -.2, K === 'bunny' ? .08 : .06));
  // dodatki
  const acc = look.acc;
  if (acc === 'crown') { const cm = cmat('#f2cc5b', { e: '#5a4210' }); H.add(mesh(geo('crown', () => new THREE.CylinderGeometry(.15, .13, .09, 10, 1, true)), cm, 0, .3, 0)); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; H.add(mesh(geo('crownS', () => new THREE.ConeGeometry(.03, .08, 4)), cm, Math.cos(a) * .14, .38, Math.sin(a) * .14)); } }
  if (acc === 'flower') { const fm = cmat('#f7a8bd', { flat: false }); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; H.add(mesh(sph, fm, .2 + Math.cos(a) * .04, .16 + Math.sin(a) * .04, .08, .03)); } H.add(mesh(sph, cmat('#f7cf55', { flat: false }), .2, .16, .09, .025)); }
  if (acc === 'bow') { const bm = cmat('#f28aa5', { flat: false }); for (const sx of [-1, 1]) H.add(rot(mesh(geo('bowL', () => new THREE.ConeGeometry(.06, .12, 8)), bm, sx * .06, .29, -.02), 'z', sx * PI / 2)); H.add(mesh(sph, bm, 0, .29, -.02, .03)); }
  if (acc === 'headphones') { const hm = cmat('#3f4a5f', { flat: false }); H.add(rot(mesh(geo('hpBand', () => new THREE.TorusGeometry(.27, .018, 6, 20, PI)), hm, 0, .02, 0), 'z', 0)); for (const sx of [-1, 1]) H.add(rot(mesh(geo('hpCup', () => new THREE.CylinderGeometry(.07, .07, .06, 12)), cmat('#e86a5a', { flat: false }), sx * .27, -.01, 0), 'z', PI / 2)); }
  if (acc === 'cape') { U.cape = new THREE.Group(); U.cape.position.set(0, 1.08, -.17); const cp = mesh(geo('cape', () => { const p = new THREE.PlaneGeometry(.5, .72); p.translate(0, -.36, 0); return p; }), new THREE.MeshLambertMaterial({ color: '#e8735f', side: THREE.DoubleSide }), 0, 0, 0); U.cape.add(cp); g.add(U.cape); }
  if (acc === 'backpack') { g.add(mesh(geo('bpack', () => new THREE.BoxGeometry(.3, .32, .14)), cmat('#f2c14e'), 0, .86, -.22)); g.add(mesh(geo('bpackP', () => new THREE.BoxGeometry(.22, .12, .04)), cmat('#e8a33c'), 0, .78, -.3)); }
  g.userData = U; U.shirt = sh; U.blinkOff = Math.random() * 4;
  return g;
}
function animPerson(U, phase, amt, action, time, wave) {
  const s = Math.sin(phase) * amt, bob = Math.abs(Math.sin(phase)) * .03 * amt + Math.sin(time * 2) * .006;
  U.legL.rotation.x = s * .75; U.legR.rotation.x = -s * .75;
  U.armL.rotation.x = -s * .65; U.armR.rotation.x = s * .65;
  U.armL.rotation.z = -.08; U.armR.rotation.z = .08;
  if (action > 0) U.armR.rotation.x = -2.1 * Math.sin(action * PI);
  if (wave) { U.armR.rotation.z = 2.6 + Math.sin(time * 7) * .35; U.armR.rotation.x = 0; }
  U.body.position.y = .82 + bob; U.head.position.y = 1.4 + bob;
  if (U.cape) U.cape.rotation.x = .12 + Math.abs(Math.sin(phase)) * amt * .35 + Math.sin(time * 2.3) * .03;
  // mruganie co kilka sekund
  if (U.eyes) { const bt = (time + U.blinkOff) % 3.9, sc = bt < .14 ? Math.max(.12, Math.abs(bt - .07) / .07) : 1; U.eyes[0].scale.y = U.eyes[1].scale.y = sc; }
}

function buildAnimal(kind) {
  const g = new THREE.Group(), P = { legs: [] };
  const sph = geo('sph', () => new THREE.SphereGeometry(1, 14, 10)), blob = geo('blob', () => new THREE.IcosahedronGeometry(1, 1));
  const dark = cmat('#2c2730', { flat: false });
  const add = (gm, m, x, y, z, sx = 1, sy = sx, sz = sx) => { const me = mesh(gm, m, x, y, z, sx, sy, sz); g.add(me); return me; };
  const leg = (x, z, len, r, m) => { const p = new THREE.Group(); p.position.set(x, len, z); p.add(mesh(geo('leg' + r + len, () => new THREE.CylinderGeometry(r, r * .85, len, 6)), m, 0, -len / 2, 0)); g.add(p); P.legs.push(p); };
  const head = (x, y, z) => { const h = new THREE.Group(); h.position.set(x, y, z); g.add(h); P.head = h; return h; };
  switch (kind) {
    case 'sheep': {
      const wool = cmat('#fbf9f3'), face = cmat('#5e5868', { flat: false });
      leg(-.13, .17, .3, .045, face); leg(.13, -.17, .3, .045, face); leg(.13, .17, .3, .045, face); leg(-.13, -.17, .3, .045, face);
      for (const [x, y, z, s] of [[0, .48, 0, .3], [0, .5, .18, .25], [0, .5, -.19, .26], [.13, .56, 0, .22], [-.13, .56, 0, .22], [0, .62, .02, .22]]) add(blob, wool, x, y, z, s, s * .9, s);
      const h = head(0, .58, .36);
      h.add(mesh(sph, face, 0, 0, .04, .12, .13, .15), mesh(blob, wool, 0, .1, -.02, .1));
      h.add(mesh(sph, face, -.12, .03, -.02, .07, .03, .04), mesh(sph, face, .12, .03, -.02, .07, .03, .04));
      h.add(mesh(sph, dark, -.06, .03, .16, .022), mesh(sph, dark, .06, .03, .16, .022));
      break;
    }
    case 'dog': {
      const fur = cmat('#c48b55', { flat: false }), dk = cmat('#8a5d36', { flat: false }), lt = cmat('#f1dcc0', { flat: false });
      leg(-.1, .16, .28, .05, fur); leg(.1, -.16, .28, .05, fur); leg(.1, .16, .28, .05, fur); leg(-.1, -.16, .28, .05, fur);
      const body = add(geo('dogBody', () => new THREE.CapsuleGeometry(.15, .3, 4, 12)), fur, 0, .42, 0); body.rotation.x = PI / 2;
      add(sph, lt, 0, .38, .12, .11, .1, .15);
      const h = head(0, .62, .28);
      h.add(mesh(sph, fur, 0, 0, 0, .14), mesh(sph, lt, 0, -.04, .12, .08, .065, .09), mesh(sph, dark, 0, -.01, .2, .03));
      for (const s of [-1, 1]) { const ear = mesh(sph, dk, s * .12, .02, -.02, .045, .1, .07); ear.rotation.z = s * .4; h.add(ear); h.add(mesh(sph, dark, s * .055, .04, .12, .024)); }
      const tail = new THREE.Group(); tail.position.set(0, .5, -.28); g.add(tail); P.tail = tail;
      const tm = mesh(geo('tail', () => new THREE.CylinderGeometry(.025, .04, .25, 6)), fur, 0, .1, -.05); tm.rotation.x = -.6; tail.add(tm);
      break;
    }
    case 'cat': {
      const fur = cmat('#f0b06a', { flat: false }), lt = cmat('#fbe3c4', { flat: false });
      leg(-.07, .12, .2, .035, fur); leg(.07, -.12, .2, .035, fur); leg(.07, .12, .2, .035, fur); leg(-.07, -.12, .2, .035, fur);
      const body = add(geo('catBody', () => new THREE.CapsuleGeometry(.1, .22, 4, 12)), fur, 0, .28, 0); body.rotation.x = PI / 2;
      const h = head(0, .42, .2);
      h.add(mesh(sph, fur, 0, 0, 0, .11, .1, .1), mesh(sph, lt, 0, -.03, .07, .05, .035, .04));
      const ear = geo('ear', () => new THREE.ConeGeometry(.04, .08, 4));
      for (const s of [-1, 1]) { h.add(mesh(ear, fur, s * .06, .1, 0)); h.add(mesh(sph, cmat('#4a8a4a', { flat: false }), s * .045, .02, .09, .02)); }
      const tail = new THREE.Group(); tail.position.set(0, .3, -.2); g.add(tail); P.tail = tail;
      const tm = mesh(geo('ctail', () => new THREE.CylinderGeometry(.02, .025, .32, 6)), fur, 0, .14, -.04); tm.rotation.x = -.35; tail.add(tm);
      break;
    }
    case 'chicken': {
      const wh = cmat('#fffdf7', { flat: false }), or = cmat('#f2b04d');
      leg(-.05, 0, .14, .016, or); leg(.05, 0, .14, .016, or);
      add(sph, wh, 0, .27, 0, .15, .14, .18);
      add(geo('ctl', () => new THREE.ConeGeometry(.08, .16, 6)), wh, 0, .36, -.15).rotation.x = -.8;
      const h = head(0, .43, .1);
      h.add(mesh(sph, wh, 0, 0, 0, .085), mesh(sph, cmat('#ef7f7f', { flat: false }), 0, .08, 0, .03, .04, .05));
      const beak = mesh(geo('beak', () => new THREE.ConeGeometry(.025, .06, 4)), or, 0, -.01, .09); beak.rotation.x = PI / 2; h.add(beak);
      h.add(mesh(sph, dark, -.05, .02, .055, .015), mesh(sph, dark, .05, .02, .055, .015));
      break;
    }
    case 'bunny': {
      const fur = cmat('#dcd6e6', { flat: false }), pink = cmat('#f4c1cf', { flat: false });
      add(sph, fur, 0, .17, 0, .14, .13, .18); add(sph, cmat('#ffffff', { flat: false }), 0, .2, -.18, .05);
      for (const s of [-1, 1]) add(sph, fur, s * .08, .06, .1, .045, .04, .07);
      const h = head(0, .3, .14);
      h.add(mesh(sph, fur, 0, 0, 0, .1, .09, .1), mesh(sph, pink, 0, -.02, .1, .015));
      for (const s of [-1, 1]) {
        const e1 = mesh(sph, fur, s * .04, .14, -.02, .03, .11, .02); e1.rotation.z = s * .15; h.add(e1);
        const e2 = mesh(sph, pink, s * .041, .14, -.003, .017, .08, .01); e2.rotation.z = s * .15; h.add(e2);
        h.add(mesh(sph, dark, s * .045, .02, .085, .016));
      }
      break;
    }
  }
  g.userData.parts = P;
  return g;
}

/* ---------- siatkowanie (budowa geometrii fragmentów świata) ---------- */
const FACES = [
  { n: [1, 0, 0], o: [1, 0, 1], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], o: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], o: [0, 1, 1], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], o: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], o: [1, 0, 0], u: [-1, 0, 0], v: [0, 1, 0] },
];
const AOL = [.52, .7, .85, 1], CORN = [[0, 0], [1, 0], [1, 1], [0, 1]];
function rotP(p, k) { let [x, y, z] = p; for (let i = 0; i < k; i++) [x, z] = [1 - z, x]; return [x, y, z]; }
function rotN(n, k) { let [x, y, z] = n; for (let i = 0; i < k; i++) [x, z] = [-z, x]; return [x, y, z]; }
class Buckets {
  constructor() { this.m = new Map(); }
  get(k) { let b = this.m.get(k); if (!b) this.m.set(k, b = { p: [], n: [], uv: [], c: [], i: [] }); return b; }
}
function pushPoly(bk, key, pts, n, uvs, cols, flip) {
  const B = bk.get(key), base = B.p.length / 3;
  for (let k = 0; k < pts.length; k++) {
    B.p.push(pts[k][0], pts[k][1], pts[k][2]); B.n.push(n[0], n[1], n[2]); B.uv.push(uvs[k][0], uvs[k][1]);
    const c = cols ? cols[k] : 1; B.c.push(c, c, c);
  }
  if (pts.length === 3) B.i.push(base, base + 1, base + 2);
  else if (flip) B.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
  else B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
function emitCube(bk, w, x, y, z, d) {
  for (const F of FACES) {
    const [nx, ny, nz] = F.n;
    if (w.opaque(x + nx, y + ny, z + nz)) continue;
    const pts = [], uvs = [], cols = [], bx = x + nx, by = y + ny, bz = z + nz;
    for (const [a, b] of CORN) {
      pts.push([x + F.o[0] + F.u[0] * a + F.v[0] * b, y + F.o[1] + F.u[1] * a + F.v[1] * b, z + F.o[2] + F.u[2] * a + F.v[2] * b]);
      uvs.push(ny ? [(x + F.o[0] + F.u[0] * a + F.v[0] * b) * .5, -(z + F.o[2] + F.u[2] * a + F.v[2] * b) * .5] : [a, b]);
      const su = a ? 1 : -1, sv = b ? 1 : -1;
      const s1 = w.opaque(bx + F.u[0] * su, by + F.u[1] * su, bz + F.u[2] * su) ? 1 : 0;
      const s2 = w.opaque(bx + F.v[0] * sv, by + F.v[1] * sv, bz + F.v[2] * sv) ? 1 : 0;
      const cc = w.opaque(bx + F.u[0] * su + F.v[0] * sv, by + F.u[1] * su + F.v[1] * sv, bz + F.u[2] * su + F.v[2] * sv) ? 1 : 0;
      cols.push(AOL[s1 && s2 ? 0 : 3 - s1 - s2 - cc]);
    }
    pushPoly(bk, texFor(d, ny), pts, F.n, uvs, cols, cols[0] + cols[2] < cols[1] + cols[3]);
  }
}
function emitBox(bk, w, x, y, z, lo, hi, d, k, opt = {}) {
  for (let fi = 0; fi < 6; fi++) {
    if (opt.skip && opt.skip.includes(fi)) continue;
    if (opt.only && !opt.only.includes(fi)) continue;
    const F = FACES[fi], ax = F.n[0] ? 0 : F.n[1] ? 1 : 2, onB = F.n[ax] > 0 ? hi[ax] >= 1 : lo[ax] <= 0;
    const rn = rotN(F.n, k);
    if (onB && !opt.noCull && w.opaque(x + rn[0], y + rn[1], z + rn[2])) continue;
    const pts = [], uvs = [];
    for (const [a, b] of CORN) {
      const c = [F.o[0] + F.u[0] * a + F.v[0] * b, F.o[1] + F.u[1] * a + F.v[1] * b, F.o[2] + F.u[2] * a + F.v[2] * b];
      const P = [lo[0] + c[0] * (hi[0] - lo[0]), lo[1] + c[1] * (hi[1] - lo[1]), lo[2] + c[2] * (hi[2] - lo[2])];
      const dd = [P[0] - F.o[0], P[1] - F.o[1], P[2] - F.o[2]];
      const uu = dd[0] * F.u[0] + dd[1] * F.u[1] + dd[2] * F.u[2];
      const vv = F.n[1] ? dd[0] * F.v[0] + dd[1] * F.v[1] + dd[2] * F.v[2] : 1 - (hi[1] - P[1]);
      const R = rotP(P, k);
      pts.push([x + R[0], y + R[1], z + R[2]]); uvs.push([uu, vv]);
    }
    pushPoly(bk, opt.key || texFor(d, F.n[1]), pts, rn, uvs, null, false);
  }
}
function emitStairs(bk, w, x, y, z, d, k) {
  emitBox(bk, w, x, y, z, [0, 0, 0], [1, .5, 1], d, k, { skip: [2] });
  emitBox(bk, w, x, y, z, [0, 0, .5], [1, .5, 1], d, k, { only: [2] });
  emitBox(bk, w, x, y, z, [0, .5, 0], [1, 1, .5], d, k, { skip: [3] });
}
const ROOF_POLYS = [
  { p: [[0, 0, 1], [1, 0, 1], [1, 1, 0], [0, 1, 0]], n: [0, .7071, .7071], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], top: true },
  { p: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], n: [0, 0, -1], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], cull: true },
  { p: [[0, 0, 0], [0, 0, 1], [0, 1, 0]], n: [-1, 0, 0], uv: [[0, 0], [1, 0], [0, 1]] },
  { p: [[1, 0, 1], [1, 0, 0], [1, 1, 0]], n: [1, 0, 0], uv: [[0, 0], [1, 0], [1, 1]] },
  { p: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], n: [0, -1, 0], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], cull: true },
];
function emitRoof(bk, w, x, y, z, d, k, m = 0) {
  for (const P of ROOF_POLYS) {
    const rn = rotN(P.n, k);
    if (P.cull && w.opaque(x + Math.round(rn[0]), y + Math.round(rn[1]), z + Math.round(rn[2]))) continue;
    if (!P.cull && !P.top && hasLinkDir(m, rn)) continue;
    pushPoly(bk, texFor(d, P.top ? 1 : P.n[1]), P.p.map(q => { const R = rotP(q, k); return [x + R[0], y + R[1], z + R[2]]; }), rn, P.uv, null, false);
  }
}
// łuk (ćwiartka): kostka z wyciętą ćwiartką koła od dołu; dwa łuki naprzeciw siebie tworzą sklepienie
const ARCH_R = .85, ARCH_N = 8;
function pushTri(bk, key, a, b, c, n, ua, ub, uc) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) pushPoly(bk, key, [a, c, b], n, [ua, uc, ub], null); else pushPoly(bk, key, [a, b, c], n, [ua, ub, uc], null);
}
function emitArch(bk, w, x, y, z, d, k) {
  const side = texFor(d, 0), top = texFor(d, 1), P = (lx, ly, lz) => { const R = rotP([lx, ly, lz], k); return [x + R[0], y + R[1], z + R[2]]; };
  // profil w płaszczyźnie (z, y): kwadrat bez ćwiartki koła o środku (1, 0)
  const arc = []; for (let i = 0; i <= ARCH_N; i++) { const t = PI - (i / ARCH_N) * PI / 2; arc.push([1 + Math.cos(t) * ARCH_R, Math.sin(t) * ARCH_R]); }
  const prof = [[0, 0], ...arc, [1, 1], [0, 1]];
  for (const lx of [0, 1]) {
    const n = rotN([lx ? 1 : -1, 0, 0], k), apex = prof[prof.length - 1];
    for (let i = 0; i < prof.length - 2; i++) { const a = prof[i], b = prof[i + 1]; pushTri(bk, side, P(lx, apex[1], apex[0]), P(lx, a[1], a[0]), P(lx, b[1], b[0]), n, [apex[0], apex[1]], [a[0], a[1]], [b[0], b[1]]); }
  }
  const quad = (key, a, b, c, dd, n, uv) => { pushTri(bk, key, a, b, c, n, uv[0], uv[1], uv[2]); pushTri(bk, key, a, c, dd, n, uv[0], uv[2], uv[3]); };
  const U4 = [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad(top, P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1), rotN([0, 1, 0], k), U4);
  if (!w.opaque(...(() => { const r = rotN([0, 0, -1], k); return [x + r[0], y + r[1], z + r[2]]; })())) quad(side, P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), rotN([0, 0, -1], k), U4);
  quad(side, P(0, ARCH_R, 1), P(1, ARCH_R, 1), P(1, 1, 1), P(0, 1, 1), rotN([0, 0, 1], k), [[0, ARCH_R], [1, ARCH_R], [1, 1], [0, 1]]);
  quad(top, P(0, 0, 0), P(1, 0, 0), P(1, 0, 1 - ARCH_R), P(0, 0, 1 - ARCH_R), rotN([0, -1, 0], k), [[0, 0], [1, 0], [1, 1 - ARCH_R], [0, 1 - ARCH_R]]);
  for (let i = 0; i < ARCH_N; i++) {
    const a = arc[i], b = arc[i + 1], mz = (a[0] + b[0]) / 2 - 1, my = (a[1] + b[1]) / 2, l = Math.hypot(mz, my);
    quad(side, P(0, a[1], a[0]), P(1, a[1], a[0]), P(1, b[1], b[0]), P(0, b[1], b[0]), rotN([0, -my / l, -mz / l], k), [[0, i / ARCH_N], [1, i / ARCH_N], [1, (i + 1) / ARCH_N], [0, (i + 1) / ARCH_N]]);
  }
}
function emitColumn(bk, w, x, y, z, d) {
  const n = 8, r = .4, side = texFor(d, 0), top = texFor(d, 1);
  const pt = (i, yy) => { const a = (i / n) * PI * 2 + PI / 8; return [x + .5 + Math.cos(a) * r, y + yy, z + .5 + Math.sin(a) * r]; };
  for (let i = 0; i < n; i++) {
    const am = ((i + .5) / n) * PI * 2 + PI / 8;
    pushPoly(bk, side, [pt(i + 1, 0), pt(i, 0), pt(i, 1), pt(i + 1, 1)], [Math.cos(am), 0, Math.sin(am)], [[(i + 1) / 4, 0], [i / 4, 0], [i / 4, 1], [(i + 1) / 4, 1]], null, false);
  }
  const isCol = (yy) => { const t = w.get(x, yy, z); return t && BL[t].kind === 'mat' && ((w.meta(x, yy, z) >> 2) & 7) === 4; };
  const uvOf = p => [p[0] - x, 1 - (p[2] - z)], c1 = [x + .5, y + 1, z + .5], c0 = [x + .5, y, z + .5];
  if (!isCol(y + 1) && !w.opaque(x, y + 1, z)) for (let i = 0; i < n; i++) { const a = pt(i + 1, 1), b = pt(i, 1); pushPoly(bk, top, [c1, a, b], [0, 1, 0], [uvOf(c1), uvOf(a), uvOf(b)], null); }
  if (!isCol(y - 1) && !w.opaque(x, y - 1, z)) for (let i = 0; i < n; i++) { const a = pt(i, 0), b = pt(i + 1, 0); pushPoly(bk, top, [c0, a, b], [0, -1, 0], [uvOf(c0), uvOf(a), uvOf(b)], null); }
}
const WIN_BARS = [[[0, 0, .42], [.1, 1, .58]], [[.9, 0, .42], [1, 1, .58]], [[.1, 0, .42], [.9, .1, .58]], [[.1, .9, .42], [.9, 1, .58]], [[.47, .1, .45], [.53, .9, .55]], [[.1, .47, .45], [.47, .53, .55]], [[.53, .47, .45], [.9, .53, .55]]];
function emitWindow(bk, w, x, y, z, k, m = 0) {
  const d = { tex: 'frame' };
  const px = hasLinkDir(m, rotN([1, 0, 0], k)), nx = hasLinkDir(m, rotN([-1, 0, 0], k)), py = hasLinkDir(m, [0, 1, 0]), ny = hasLinkDir(m, [0, -1, 0]);
  if (!px && !nx && !py && !ny) for (const [lo, hi] of WIN_BARS) emitBox(bk, w, x, y, z, lo, hi, d, k);
  else {
    const T = .12, t = .035;
    emitBox(bk, w, x, y, z, [0, 0, nx ? .46 : .42], [nx ? t : T, 1, nx ? .54 : .58], d, k);
    emitBox(bk, w, x, y, z, [px ? 1 - t : 1 - T, 0, px ? .46 : .42], [1, 1, px ? .54 : .58], d, k);
    emitBox(bk, w, x, y, z, [0, 0, ny ? .46 : .42], [1, ny ? t : T, ny ? .54 : .58], d, k);
    emitBox(bk, w, x, y, z, [0, py ? 1 - t : 1 - T, py ? .46 : .42], [1, 1, py ? .54 : .58], d, k);
  }
  const g = [[0, 0, .5], [1, 0, .5], [1, 1, .5], [0, 1, .5]].map(p => { const R = rotP(p, k); return [x + R[0], y + R[1], z + R[2]]; });
  pushPoly(bk, 'glass', g, rotN([0, 0, 1], k), [[0, 0], [1, 0], [1, 1], [0, 1]], null, false);
}
function emitFence(bk, w, x, y, z) {
  const d = { tex: 'fenceWood' }, H = w.ms === 2 ? 1.6 : 1;
  emitBox(bk, w, x, y, z, [.38, 0, .38], [.62, H, .62], d, 0, { noCull: H > 1 });
  const conn = (dx, dz) => { const t = w.get(x + dx, y, z + dz); return t === BK.fence || t === BK.window || w.opaque(x + dx, y, z + dz) || (t && BL[t].kind === 'mat' && ((w.meta(x + dx, y, z + dz) >> 2) & 7) >= 5); };
  for (const [a, b] of [[.22 * H, .36 * H], [.6 * H, .74 * H]]) {
    if (conn(1, 0)) emitBox(bk, w, x, y, z, [.6, a, .45], [1, b, .55], d, 0);
    if (conn(-1, 0)) emitBox(bk, w, x, y, z, [0, a, .45], [.4, b, .55], d, 0);
    if (conn(0, 1)) emitBox(bk, w, x, y, z, [.45, a, .6], [.55, b, 1], d, 0);
    if (conn(0, -1)) emitBox(bk, w, x, y, z, [.45, a, 0], [.55, b, .4], d, 0);
  }
}
function emitWater(bk, w, x, y, z) {
  const W = BK.water, aboveW = w.get(x, y + 1, z) === W, h = aboveW ? 1 : .88, d = { tex: 'water' };
  if (!aboveW && !w.opaque(x, y + 1, z)) {
    const pts = [[x, y + h, z + 1], [x + 1, y + h, z + 1], [x + 1, y + h, z], [x, y + h, z]];
    pushPoly(bk, 'water', pts, [0, 1, 0], pts.map(p => [p[0] * .5, -p[2] * .5]), null, false);
  }
  for (const fi of [0, 1, 4, 5]) {
    const n = FACES[fi].n, nx = x + n[0], nz = z + n[2];
    if (!w.in(nx, y, nz) || w.get(nx, y, nz) === W || w.opaque(nx, y, nz)) continue;
    emitBox(bk, w, x, y, z, [0, 0, 0], [1, h, 1], d, 0, { only: [fi], noCull: true });
  }
  if (y > 0 && !w.get(x, y - 1, z)) emitBox(bk, w, x, y, z, [0, 0, 0], [1, h, 1], d, 0, { only: [3], noCull: true });
}
// LOW: klocek postawiony na płytce jest obniżony o pół kratki, żeby leżał na niej, a nie wisiał w powietrzu
const LOW = 1 << 11;
function emitCellAt(bk, w, x, y, z, t, m) {
  if (!(m & LOW)) return emitCell(bk, w, x, y, z, t, m);
  const before = new Map(); for (const [k, B] of bk.m) before.set(k, B.p.length);
  emitCell(bk, w, x, y, z, t, m);
  for (const [k, B] of bk.m) for (let i = (before.get(k) || 0) + 1; i < B.p.length; i += 3) B.p[i] -= .5;
}
function emitCell(bk, w, x, y, z, t, m) {
  const d = BL[t];
  switch (d.kind) {
    case 'mat': {
      const sh = (m >> 2) & 7, k = m & 3;
      if (sh === 0) emitCube(bk, w, x, y, z, d);
      else if (sh === 1) emitBox(bk, w, x, y, z, [0, 0, 0], [1, .5, 1], d, 0);
      else if (sh === 2) emitStairs(bk, w, x, y, z, d, k);
      else if (sh === 3) emitRoof(bk, w, x, y, z, d, k, m);
      else if (sh === 7) emitArch(bk, w, x, y, z, d, k);
      else if (sh >= 5) emitPiece(bk, w, x, y, z, t, m);
      else emitColumn(bk, w, x, y, z, d);
      break;
    }
    case 'water': emitWater(bk, w, x, y, z); break;
    case 'window': emitWindow(bk, w, x, y, z, m & 3, m); break;
    case 'fence': emitFence(bk, w, x, y, z); break;
    case 'model': if (w.chunkMode) emitModel(bk, x, y, z, d.key, m & 3, cellSeed(x, y, z), w.ms || 1, !!w.lod); break;
  }
}
function bucketsToMesh(bk, keys, matFn) {
  let nv = 0, ni = 0;
  for (const k of keys) { const B = bk.m.get(k); nv += B.p.length / 3; ni += B.i.length; }
  if (!ni) return null;
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new Uint32Array(ni);
  const g = new THREE.BufferGeometry(), mats = []; g.userData.keys = keys;
  let vo = 0, io = 0;
  keys.forEach((k, mi) => {
    const B = bk.m.get(k);
    P.set(B.p, vo * 3); Nn.set(B.n, vo * 3); UV.set(B.uv, vo * 2); C.set(B.c, vo * 3);
    for (let j = 0; j < B.i.length; j++) I[io + j] = B.i[j] + vo;
    g.addGroup(io, B.i.length, mi); mats.push(matFn ? matFn(k) : MAT[k]);
    vo += B.p.length / 3; io += B.i.length;
  });
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingSphere();
  return new THREE.Mesh(g, mats);
}

/* ---------- świat ---------- */
const FULLB = [[0, 0, 0, 1, 1, 1]];
const STAIRB = [0, 1, 2, 3].map(k => [[0, 0, 0, 1, .5, 1], [0, .5, 0, 1, 1, .5]].map(b => {
  const a = rotP([b[0], b[1], b[2]], k), c = rotP([b[3], b[4], b[5]], k);
  return [Math.min(a[0], c[0]), b[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), b[4], Math.max(a[2], c[2])];
}));
const MODELB = { tree: [[.3, 0, .3, .7, 1, .7]], spruce: [[.3, 0, .3, .7, 1, .7]], rock: [[.1, 0, .1, .9, .7, .9]], bench: [[.05, 0, .05, .95, .5, .95]], lamp: [[.4, 0, .4, .6, 1.8, .6]] };
const MODELB2 = { tree: [[.1, 0, .1, .9, 2, .9]], spruce: [[.15, 0, .15, .85, 2, .85]], rock: [[0, 0, 0, 1, 1.3, 1]], bench: [[0, 0, 0, 1, .95, 1]], lamp: [[.3, 0, .3, .7, 3.6, .7]],
  table: [[0, 0, 0, 1, 1.5, 1]], bed: [[0, 0, 0, 1, .9, 1]], barrel: [[.1, 0, .1, .9, 1.6, .9]], chest: [[.05, 0, .05, .95, 1, .95]], well: [[0, 0, 0, 1, 1.2, 1]], slide: [[0, 0, 0, 1, 1.2, 1]] };
const ARCHB = [0, 1, 2, 3].map(k => [[0, 0, 0, 1, 1, 1 - ARCH_R], [0, ARCH_R, 0, 1, 1, 1]].map(b => {
  const a = rotP([b[0], b[1], b[2]], k), c = rotP([b[3], b[4], b[5]], k);
  return [Math.min(a[0], c[0]), b[1], Math.min(a[2], c[2]), Math.max(a[0], c[0]), b[4], Math.max(a[2], c[2])];
}));
const HALFB = [[0, 0, 0, 1, .5, 1]], FENCEB2 = [[.3, 0, .3, .7, 1.6, .7]];
const LOWB = new Map();
const lowBoxes = bs => { let r = LOWB.get(bs); if (!r) LOWB.set(bs, r = bs.map(b => [b[0], b[1] - .5, b[2], b[3], b[4] - .5, b[5]])); return r; };
function cellBoxes(w, x, y, z) {
  const t = w.get(x, y, z); if (!t) return null;
  const d = BL[t], m = w.meta(x, y, z);
  let bs = null;
  if (d.kind === 'mat') { const sh = (m >> 2) & 7; bs = (sh === 1 || sh === 6) ? HALFB : (sh === 2 || sh === 3) ? STAIRB[m & 3] : sh === 7 ? ARCHB[m & 3] : FULLB; }
  else if (d.kind === 'window') bs = FULLB;
  else if (d.kind === 'fence') bs = w.ms === 2 ? FENCEB2 : FULLB;
  else if (d.kind === 'model' && d.solid) bs = (w.ms === 2 ? MODELB2 : MODELB)[d.key] || null;
  return bs && (m & LOW) ? lowBoxes(bs) : bs;
}
function overlaps(w, x0, y0, z0, x1, y1, z1) {
  const res = [];
  for (let x = Math.floor(x0); x <= Math.floor(x1); x++) for (let z = Math.floor(z0); z <= Math.floor(z1); z++) for (let y = Math.floor(y0) - 1; y <= Math.floor(y1) + 1; y++) {
    const bs = cellBoxes(w, x, y, z); if (!bs) continue;
    for (const b of bs) {
      const bx0 = x + b[0], by0 = y + b[1], bz0 = z + b[2], bx1 = x + b[3], by1 = y + b[4], bz1 = z + b[5];
      if (x0 < bx1 && x1 > bx0 && y0 < by1 && y1 > by0 && z0 < bz1 && z1 > bz0) res.push([bx0, by0, bz0, bx1, by1, bz1]);
    }
  }
  return res;
}
function cellSeed(x, y, z) { return ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0) || 1; }

class World3D {
  constructor(N, H) {
    this.N = N; this.H = H; const L = N * N * H;
    this.t = new Uint8Array(L); this.m = new Uint8Array(L);
    this.animals = []; this.group = new THREE.Group();
    this.chunks = new Map(); this.models = new Map(); this.doors = new Map(); this.dirty = new Set();
    this.chunkMode = true; this.ms = 1;
  }
  idx(x, y, z) { return (y * this.N + z) * this.N + x; }
  in(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.N && z < this.N && y < this.H; }
  get(x, y, z) { return this.in(x, y, z) ? this.t[this.idx(x, y, z)] : 0; }
  meta(x, y, z) { return this.in(x, y, z) ? this.m[this.idx(x, y, z)] : 0; }
  opaque(x, y, z) {
    if (y < 0) return true;
    if (x < 0 || z < 0 || x >= this.N || z >= this.N) return y <= SEA;
    if (y >= this.H) return false;
    const i = this.idx(x, y, z), t = this.t[i];
    return !!t && BL[t].kind === 'mat' && ((this.m[i] >> 2) & 7) === 0;
  }
  set(x, y, z, t, m = 0) {
    if (!this.in(x, y, z)) return;
    const i = this.idx(x, y, z), old = this.t[i];
    if (old === t && this.m[i] === m) return;
    const key = x + ',' + y + ',' + z;
    if (isModelType(old)) this.removeModel(key);
    this.t[i] = t; this.m[i] = t ? m : 0;
    if (isModelType(t)) this.addModel(key, x, y, z, t, this.m[i]);
    this.markDirty(x, z);
  }
  markDirty(x, z) {
    const add = (cx, cz) => { if (cx >= 0 && cz >= 0 && cx * CS < this.N && cz * CS < this.N) this.dirty.add(cx + ',' + cz); };
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    add(cx, cz);
    if (x % CS === 0) add(cx - 1, cz); if (x % CS === CS - 1) add(cx + 1, cz);
    if (z % CS === 0) add(cx, cz - 1); if (z % CS === CS - 1) add(cx, cz + 1);
  }
  addModel(key, x, y, z, t, m) {
    const d = BL[t], o = buildModel(d.key, m & 3, cellSeed(x, y, z));
    o.position.set(x + .5, y, z + .5); o.userData.cell = [x, y, z];
    this.group.add(o); this.models.set(key, o);
    if (d.kind === 'door') this.doors.set(key, o);
  }
  removeModel(key) { const o = this.models.get(key); if (o) { this.group.remove(o); this.models.delete(key); this.doors.delete(key); } }
  initModels() {
    for (let y = 0; y < this.H; y++) for (let z = 0; z < this.N; z++) for (let x = 0; x < this.N; x++) {
      const i = this.idx(x, y, z), t = this.t[i];
      if (isModelType(t)) this.addModel(x + ',' + y + ',' + z, x, y, z, t, this.m[i]);
    }
  }
  addAnimal(a) { a.ms = this.ms; a.obj.scale.setScalar(this.ms); this.animals.push(a); this.group.add(a.obj); }
  removeAnimal(a) { const i = this.animals.indexOf(a); if (i >= 0) this.animals.splice(i, 1); this.group.remove(a.obj); }
  buildChunk(cx, cz) {
    const key = cx + ',' + cz, old = this.chunks.get(key);
    if (old) for (const me of old) { this.group.remove(me); me.geometry.dispose(); }
    const bk = new Buckets(), x0 = cx * CS, z0 = cz * CS, x1 = Math.min(this.N, x0 + CS), z1 = Math.min(this.N, z0 + CS);
    for (let y = 0; y < this.H; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const i = this.idx(x, y, z), t = this.t[i];
      if (t) emitCell(bk, this, x, y, z, t, this.m[i]);
    }
    const keys = [...bk.m.keys()], out = [];
    const op = bucketsToMesh(bk, keys.filter(k => !TRANSPARENT.has(k)));
    if (op) { op.castShadow = op.receiveShadow = true; out.push(op); }
    const tr = bucketsToMesh(bk, keys.filter(k => TRANSPARENT.has(k)));
    if (tr) { tr.receiveShadow = true; tr.renderOrder = 2; out.push(tr); }
    out.forEach(me => this.group.add(me));
    this.chunks.set(key, out);
  }
  rebuildDirty(max = 3) {
    let n = 0;
    for (const k of this.dirty) { this.dirty.delete(k); const [cx, cz] = k.split(',').map(Number); this.buildChunk(cx, cz); if (++n >= max) break; }
  }
  buildAll() {
    for (let cx = 0; cx * CS < this.N; cx++) for (let cz = 0; cz * CS < this.N; cz++) this.dirty.add(cx + ',' + cz);
    this.rebuildDirty(1e9);
  }
  dispose() { for (const arr of this.chunks.values()) for (const me of arr) me.geometry.dispose(); }
  serialize() { return { v: 3, N: this.N, H: this.H, t: rleEnc(this.t), m: rleEnc(this.m), a: this.animals.map(a => [a.kind, a.cx, a.cy, a.cz]) }; }
  static load(o) {
    const w = new World3D(o.N, o.H), L = o.N * o.N * o.H;
    w.t = rleDec(o.t, L); w.m = rleDec(o.m, L); w.initModels();
    (o.a || []).forEach(([k, x, y, z]) => { if (ANIM3[k]) w.addAnimal(new Animal3(k, x, y, z)); });
    return w;
  }
}

/* ---------- generowanie światów ---------- */
function genWorld(kind) {
  const N = N3, w = new World3D(N, H3), seed = 1 + Math.floor(Math.random() * 99999), r = mulberry(seed);
  const HM = new Int16Array(N * N);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    let h;
    const nx = (x + .5 - N / 2) / (N / 2), nz = (z + .5 - N / 2) / (N / 2), d = Math.hypot(nx, nz);
    if (kind === 'meadow') {
      const e = Math.min(x, z, N - 1 - x, N - 1 - z);
      h = 6 + Math.round((fbm(x / 12, z / 12, seed) - .5) * 2.4 * sstep(10, 20, e));
      if (e < 5) h = Math.round(lerp(2, h, sstep(0, 5, e)));
      const pd = Math.hypot(x - N * .74, z - N * .28);
      if (pd < 6) h = Math.min(h, Math.round(lerp(3, 6, sstep(3.5, 6, pd))));
    } else {
      let e = 6.4 + (fbm(x / 22, z / 22, seed) - .45) * 7;
      e = lerp(6.2, e, sstep(.16, .38, d));
      e -= sstep(.62, .98, d) * 9;
      h = Math.round(e);
    }
    HM[z * N + x] = clamp(h, 1, H3 - 8);
  }
  for (let pass = 0; pass < 3; pass++) for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const i = z * N + x, nb = [HM[i - 1], HM[i + 1], HM[i - N], HM[i + N]];
    const mx = Math.max(...nb), mn = Math.min(...nb), higher = nb.filter(v => v > HM[i]).length, lower = nb.filter(v => v < HM[i]).length;
    if (HM[i] > mx || lower >= 3) HM[i] = Math.max(mn, HM[i] - 1);
    else if (HM[i] < mn || higher >= 3) HM[i] = Math.min(mx, HM[i] + 1);
  }
  const top = kind === 'winter' ? BK.snow : BK.grass;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const h = HM[z * N + x];
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2], [-2, 0], [0, -2], [1, 1], [-1, -1]].some(([a, b]) => {
      const xx = x + a, zz = z + b; return xx < 0 || zz < 0 || xx >= N || zz >= N || HM[zz * N + xx] - 1 < SEA;
    });
    for (let y = 0; y < h; y++) w.t[w.idx(x, y, z)] = y < h - 3 ? BK.stone : y < h - 1 ? BK.dirt : ((h - 1 <= SEA || (h - 1 <= SEA + 1 && nearWater)) ? BK.sand : top);
    for (let y = h; y <= SEA; y++) w.t[w.idx(x, y, z)] = BK.water;
  }
  const occ = new Uint8Array(N * N);
  const free = (x, z, rad) => { for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) { const xx = x + a, zz = z + b; if (xx >= 0 && zz >= 0 && xx < N && zz < N && occ[zz * N + xx]) return false; } return true; };
  for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const h = HM[z * N + x];
    if (w.t[w.idx(x, h - 1, z)] !== top) continue;
    const d = Math.hypot((x + .5 - N / 2) / (N / 2), (z + .5 - N / 2) / (N / 2));
    if (d < .24) continue;
    const q = r();
    let what = null;
    if (kind === 'winter') { if (q < .045) what = 'spruce'; else if (q < .055) what = 'rock'; }
    else if (kind === 'island') { if (q < .03) what = 'tree'; else if (q < .038) what = 'spruce'; else if (q < .09) what = 'flowers'; else if (q < .105) what = 'bush'; else if (q < .111) what = 'rock'; }
    else { if (q < .012) what = 'tree'; else if (q < .05) what = 'flowers'; else if (q < .058) what = 'bush'; else if (q < .061) what = 'rock'; }
    if (!what) continue;
    if (!free(x, z, (what === 'tree' || what === 'spruce') ? 2 : 0)) continue;
    w.set(x, h, z, BK[what], 0); occ[z * N + x] = 1;
  }
  const cx = N >> 1, cz = N >> 1;
  const standAt = (x, z) => { const h = HM[z * N + x]; return (!w.get(x, h, z) && w.t[w.idx(x, h - 1, z)] !== BK.water && w.t[w.idx(x, h - 1, z)] !== BK.sand) ? h : -1; };
  if (standAt(cx + 2, cz + 1) > 0) w.addAnimal(new Animal3('dog', cx + 2, standAt(cx + 2, cz + 1), cz + 1));
  if (kind !== 'winter') for (let i = 0, n = 0; i < 80 && n < 3; i++) {
    const x = 10 + Math.floor(r() * (N - 20)), z = 10 + Math.floor(r() * (N - 20)), h = standAt(x, z);
    if (h > 0 && Math.hypot(x - cx, z - cz) > 6) { w.addAnimal(new Animal3('sheep', x, h, z)); n++; }
  }
  return { w, spawn: [cx + .5, HM[cz * N + cx], cz + .5] };
}
function buildDiorama() {
  const w = new World3D(14, 10);
  for (let z = 0; z < 14; z++) for (let x = 0; x < 14; x++) {
    const d = Math.hypot(x - 6.5, z - 6.5); if (d > 7.1) continue;
    const depth = d > 6.2 ? 1 : d > 5.2 ? 2 : 3;
    for (let y = 3 - depth; y < 3; y++) w.set(x, y, z, y === 2 ? BK.grass : BK.dirt);
  }
  for (const [x, z] of [[2, 4], [3, 4], [2, 5], [3, 5], [1, 5]]) w.set(x, 2, z, BK.water);
  for (const [x, z] of [[1, 4], [4, 4], [4, 5], [2, 6], [3, 6], [1, 6], [2, 3], [3, 3]]) if (w.get(x, 2, z) === BK.grass) w.set(x, 2, z, BK.sand);
  for (let x = 6; x <= 9; x++) for (let z = 5; z <= 8; z++) {
    if (x > 6 && x < 9 && z > 5 && z < 8) continue;
    w.set(x, 3, z, BK.plaster); w.set(x, 4, z, BK.plaster);
  }
  w.set(7, 3, 8, BK.door, 0); w.set(7, 4, 8, BK.doorTop, 0);
  w.set(8, 3, 8, BK.window, 0); w.set(9, 4, 6, BK.window, 1); w.set(9, 4, 7, BK.window, 1); w.set(6, 4, 6, BK.window, 1);
  for (let x = 6; x <= 9; x++) {
    w.set(x, 5, 5, BK.roofRed, (3 << 2) | 2); w.set(x, 5, 8, BK.roofRed, (3 << 2) | 0);
    w.set(x, 6, 6, BK.roofRed, (3 << 2) | 2); w.set(x, 6, 7, BK.roofRed, (3 << 2) | 0);
  }
  for (const z of [6, 7]) { w.set(6, 5, z, BK.plaster); w.set(9, 5, z, BK.plaster); }
  for (let x = 5; x <= 9; x++) w.set(x, 3, 11, BK.fence);
  w.set(2, 3, 9, BK.tree); w.set(10, 3, 2, BK.tree); w.set(11, 3, 9, BK.spruce); w.set(4, 3, 2, BK.spruce);
  w.set(5, 3, 9, BK.bush); w.set(1, 3, 8, BK.rock); w.set(10, 3, 6, BK.lamp);
  for (const [x, z] of [[3, 8], [9, 10], [4, 11], [11, 4], [8, 3], [12, 7]]) w.set(x, 3, z, BK.flowers);
  w.set(4, 3, 7, BK.bench, 1);
  w.addAnimal(new Animal3('dog', 9, 3, 10)); w.addAnimal(new Animal3('sheep', 3, 3, 10));
  return w;
}

/* ---------- zwierzaki ---------- */
const ASPD = { dog: .42, sheep: .95, cat: .6, chicken: .5, bunny: .5 };
class Animal3 {
  constructor(kind, x, y, z) {
    Object.assign(this, { kind, cx: x, cy: y, cz: z, px: x + .5, py: y, pz: z + .5, moving: false, t: 0, wait: Math.random() * 3, yaw: Math.random() * PI * 2, tyaw: 0, phase: 0, hop: 0 });
    this.tyaw = this.yaw;
    this.obj = buildAnimal(kind); this.obj.userData.animal = this; this.obj.position.set(this.px, this.py, this.pz);
  }
}
function passable3(w, x, y, z) { const t = w.get(x, y, z); if (!t) return true; const d = BL[t]; return (d.kind === 'model' && !d.solid) || d.kind === 'door' || d.kind === 'doorTop'; }
function floorAt(w, x, y, z) {
  const b = w.get(x, y - 1, z); if (!b) return null;
  const d = BL[b]; if (d.kind !== 'mat') return null;
  const m = w.meta(x, y - 1, z), sh = (m >> 2) & 7; if (sh === 4) return null;
  return ((sh === 1 || sh === 6) ? y - .5 : y) - (m & LOW ? .5 : 0);
}
function canStand3(w, x, y, z, self) {
  if (!w.in(x, y, z) || y < 1 || !passable3(w, x, y, z) || floorAt(w, x, y, z) === null) return false;
  for (let k = 1; k < (self && self.ms || 1); k++) if (!passable3(w, x, y + k, z)) return false;
  for (const o of w.animals) if (o !== self && ((o.cx === x && o.cy === y && o.cz === z) || (o.moving && o.tx === x && o.ty === y && o.tz === z))) return false;
  return true;
}
function chooseStep(w, a, focus) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - .5);
  let follow = false, far = 0;
  const ms = a.ms || 1;
  if ((a.kind === 'dog' || a.follow) && focus) {
    far = Math.hypot(focus.x - a.px, focus.z - a.pz) / ms;
    if (far > 2.6 && far < 30) {
      follow = true;
      const dist = ([dx, dz]) => Math.hypot(focus.x - (a.cx + dx + .5), focus.z - (a.cz + dz + .5));
      dirs.sort((p, q) => dist(p) - dist(q));
    } else if (far <= 2.6) { a.wait = .5 + Math.random(); if (Math.random() < .7) a.tyaw = Math.atan2(focus.x - a.px, focus.z - a.pz); return; }
    if (far >= 30) { a.wait = 1; return; }
  } else if (Math.random() < .3) { a.wait = 1 + Math.random() * 2; return; }
  for (const [dx, dz] of dirs.slice(0, follow ? 2 : 4)) {
    for (const dy of [0, 1, -1, -2]) {
      const nx = a.cx + dx, ny = a.cy + dy, nz = a.cz + dz;
      if (!canStand3(w, nx, ny, nz, a) || (dy > 0 && !passable3(w, a.cx, a.cy + ms, a.cz))) continue;
      Object.assign(a, { moving: true, t: 0, fx: a.px, fz: a.pz, fy: a.py, tx: nx, ty: ny, tz: nz, ty2: floorAt(w, nx, ny, nz), tyaw: Math.atan2(dx, dz) });
      a.dur = (follow && far > 6 ? .26 : ASPD[a.kind]) * (dy ? 1.25 : 1) / ms;
      return;
    }
  }
  a.wait = .6 + Math.random();
}
function updateAnimals3(w, dt, time, focus) {
  for (const a of w.animals) {
    if (w.chunkAt && !w.chunkAt(a.px, a.pz)) continue;
    const ms = a.ms || 1;
    if (a.moving) {
      a.t += dt / a.dur;
      const t = Math.min(1, a.t), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      a.px = lerp(a.fx, a.tx + .5, e); a.pz = lerp(a.fz, a.tz + .5, e);
      a.py = lerp(a.fy, a.ty2, e) + Math.sin(PI * t) * (a.kind === 'bunny' ? .32 : .05) * ms;
      a.phase += dt * 14;
      if (a.t >= 1) { a.moving = false; a.cx = a.tx; a.cy = a.ty; a.cz = a.tz; a.py = a.ty2; a.wait = a.kind === 'dog' ? .1 + Math.random() * .3 : 1 + Math.random() * 3.5; }
    } else {
      const f = floorAt(w, a.cx, a.cy, a.cz);
      if (f === null || !passable3(w, a.cx, a.cy, a.cz)) {
        let y = a.cy;
        if (!passable3(w, a.cx, y, a.cz)) { while (y < w.H - 2 && !passable3(w, a.cx, y, a.cz)) y++; }
        else { while (y > 1 && floorAt(w, a.cx, y, a.cz) === null) y--; }
        a.cy = y; const f2 = floorAt(w, a.cx, y, a.cz); a.py = f2 === null ? y : f2;
      } else a.py += (f - a.py) * Math.min(1, dt * 10);
      a.wait -= dt;
      if (a.wait <= 0) chooseStep(w, a, focus);
    }
    a.yaw = angLerp(a.yaw, a.tyaw, Math.min(1, dt * 9));
    if (a.hop > 0) a.hop = Math.max(0, a.hop - dt * 2.2);
    const o = a.obj, P = o.userData.parts;
    o.position.set(a.px, a.py + (a.hop > 0 ? Math.sin(a.hop * PI) * .45 * ms : 0), a.pz); o.rotation.y = a.yaw;
    P.legs.forEach((l, i) => { l.rotation.x = a.moving ? Math.sin(a.phase + (i % 2 ? PI : 0)) * .55 : l.rotation.x * .8; });
    if (P.tail) P.tail.rotation.z = Math.sin(time * (a.kind === 'dog' ? 12 : 3)) * (a.kind === 'dog' ? .6 : .25);
    if (P.head) P.head.rotation.x = a.moving ? 0 : Math.sin(time * .8 + a.cx) * .12;
  }
}

/* ---------- ludzik ---------- */
// świat 0,5 m: 1 jednostka = 1 kostka = 0,5 m; ludzik ma 1,62 m = 3,24 kostki
const P_R = .45, P_H = 3.24, PS = 2;
const SHIRTS = ['#6fa8dc', '#e98f7f', '#7fbf73', '#f2c14e', '#b48ad8', '#f29bb8'];
class Player {
  constructor() {
    this.pos = new V3(); this.vel = new V3(); this.yaw = PI; this.onGround = false;
    this.phase = 0; this.amt = 0; this.action = 0; this.stepOff = 0;
    this.setLook(DEFAULT_LOOK);
  }
  setLook(look) {
    this.look = { ...DEFAULT_LOOK, ...look };
    const old = this.obj, parent = old && old.parent;
    this.obj = buildPerson(this.look); this.obj.scale.setScalar(PS);
    if (old) { this.obj.position.copy(old.position); this.obj.rotation.copy(old.rotation); if (parent) { parent.remove(old); parent.add(this.obj); } }
    // sylwetka ludzika widoczna przez drzewa i ściany (bufor szablonu: tylko tam, gdzie ludzik jest zasłonięty)
    const ud = this.obj.userData, meshes = [];
    this.obj.traverse(o => { if (o.isMesh) meshes.push(o); });
    const XR = new THREE.MeshBasicMaterial({ color: 0x4f78b8, transparent: true, opacity: .42, depthWrite: false, depthFunc: THREE.GreaterDepth,
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    for (const o of meshes) {
      const m = o.material.clone(); if (o.material === ud.shirt) ud.shirt = m;
      Object.assign(m, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
      o.material = m; o.renderOrder = 10;
      const x = new THREE.Mesh(o.geometry, XR); x.renderOrder = 11; x.castShadow = false; x.receiveShadow = false; o.add(x);
    }
  }
  setShirt(c) { this.setLook({ ...this.look, shirt: c }); }
  spawn(w, at) {
    const x = Math.floor(at ? at[0] : 0), z = Math.floor(at ? at[2] : 0);
    let y = w.H - 6;
    while (y > 1 && !cellBoxes(w, x, y - 1, z) && w.get(x, y - 1, z) !== BK.water) y--;
    this.pos.set(x + .5, y + .01, z + .5); this.vel.set(0, 0, 0);
  }
  focus() { return new V3(this.pos.x, this.pos.y - this.stepOff + 1.2 * PS, this.pos.z); }
  act(tx, tz) { this.action = 1; this.yaw = Math.atan2(tx - this.pos.x, tz - this.pos.z); }
  update(dt, w, K, camYaw, auto) {
    const p = this.pos;
    let ix = (K.r ? 1 : 0) - (K.l ? 1 : 0), iz = (K.b ? 1 : 0) - (K.f ? 1 : 0), mag = 1, joy = false;
    if (K.ax || K.az) { ix = K.ax; iz = K.az; mag = Math.min(1, Math.hypot(ix, iz)); joy = true; }
    const len = Math.hypot(ix, iz); let dx = 0, dz = 0;
    if (len) {
      ix /= len; iz /= len;
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      dx = rx * ix - fx * iz; dz = rz * ix - fz * iz;
    } else if (auto) {
      const l = Math.hypot(auto.x, auto.z);
      if (l > 1e-4) { dx = auto.x / l; dz = auto.z / l; }
    }
    const inside = overlaps(w, p.x - P_R, p.y, p.z - P_R, p.x + P_R, p.y + P_H, p.z + P_R);
    if (inside.length) { const top = Math.max(...inside.map(h => h[4])); if (top - p.y < 4.4) { this.stepOff += top - p.y; p.y = top + .001; } }
    const cx = Math.floor(p.x), cz = Math.floor(p.z);
    const wet = w.get(cx, Math.floor(p.y + .4), cz) === BK.water, deep = w.get(cx, Math.floor(p.y + 2.0), cz) === BK.water;
    const base = joy ? (mag > .92 ? 6.4 : 4.3 * Math.max(.35, mag)) : (K.run ? 6.4 : 4.3);
    const spd = base * PS * (wet ? .62 : 1), k = 1 - Math.exp(-(this.onGround || wet ? 14 : 4) * dt);
    this.vel.x += (dx * spd - this.vel.x) * k; this.vel.z += (dz * spd - this.vel.z) * k;
    if (dx || dz) this.yaw = angLerp(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
    if (auto && auto.up && this.onGround && Math.hypot(this.vel.x, this.vel.z) < 1.5) this.vel.y = 15;
    this.vel.y -= 48 * dt;
    if (deep) { this.vel.y += 64 * dt; this.vel.y *= 1 - Math.min(1, 3 * dt); }
    if (K.jump && (this.onGround || deep)) { this.vel.y = deep ? 9 : 15; this.onGround = false; }
    this.vel.y = Math.max(this.vel.y, -56);
    if (this.bump && (dx || dz) && this.onGround) this.vel.y = 15.5;
    this.bump = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.y), Math.abs(this.vel.z)) * dt / .3)), sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const was = this.onGround;
      this.moveH(w, 'x', this.vel.x * sdt, was); this.moveH(w, 'z', this.vel.z * sdt, was);
      this.onGround = false; this.moveV(w, this.vel.y * sdt);
    }
    if (w.N) { p.x = clamp(p.x, P_R, w.N - P_R); p.z = clamp(p.z, P_R, w.N - P_R); }
    if (p.y < -8) this.spawn(w, [p.x, 0, p.z]);
    this.stepOff *= Math.exp(-14 * dt);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.amt += ((this.onGround || wet ? Math.min(1, hs / (4 * PS)) : .35) - this.amt) * Math.min(1, dt * 10);
    this.phase += dt * hs * 2.6 / PS;
    if (this.action > 0) this.action = Math.max(0, this.action - dt * 3.2);
    this.obj.position.set(p.x, p.y - this.stepOff, p.z); this.obj.rotation.y = this.yaw;
    animPerson(this.obj.userData, this.phase, this.amt, this.action, now(), false);
  }
  moveH(w, ax, d, was) {
    if (!d) return;
    const p = this.pos, np = p.clone(); np[ax] += d;
    const hits = overlaps(w, np.x - P_R, np.y, np.z - P_R, np.x + P_R, np.y + P_H, np.z + P_R);
    if (!hits.length) { p.copy(np); return; }
    if (was) {
      const top = Math.max(...hits.map(h => h[4])), rise = top - p.y;
      if (rise > 0 && rise <= 1.05 && !overlaps(w, np.x - P_R, top + .001, np.z - P_R, np.x + P_R, top + P_H, np.z + P_R).length) {
        this.stepOff += rise; np.y = top + .001; p.copy(np); return;
      }
    }
    if (was) {
      const top = Math.max(...hits.map(h => h[4])), rise = top - p.y;
      if (rise > 1.05 && rise <= 2.3 && !overlaps(w, np.x - P_R, top + .001, np.z - P_R, np.x + P_R, top + P_H, np.z + P_R).length) this.bump = true;
    }
    const i0 = ax === 'x' ? 0 : 2, i1 = ax === 'x' ? 3 : 5;
    if (d > 0) p[ax] = clamp(Math.min(...hits.map(h => h[i0])) - P_R - .001, p[ax], np[ax]);
    else p[ax] = clamp(Math.max(...hits.map(h => h[i1])) + P_R + .001, np[ax], p[ax]);
    this.vel[ax] = 0;
  }
  moveV(w, d) {
    const p = this.pos, ny = p.y + d;
    const hits = overlaps(w, p.x - P_R, ny, p.z - P_R, p.x + P_R, ny + P_H, p.z + P_R);
    if (!hits.length) { p.y = ny; return; }
    if (d < 0) { p.y = Math.max(...hits.map(h => h[4])) + .0005; this.onGround = true; }
    else p.y = Math.min(p.y, Math.min(...hits.map(h => h[1])) - P_H - .001);
    this.vel.y = 0;
  }
}

/* ---------- kamera: cele ustawiane przez gracza, obraz dochodzi do nich płynnie ---------- */
const Cam = {
  yaw: 0, pitch: .42, dist: 8.5,            // cele
  cy: 0, cp: .42, cd: 8.5, cur: 8.5,        // bieżące, wygładzone
  target: new V3(), slow: 0, free: false, lift: 0,
  snap(focus) { this.target.copy(focus); this.cy = this.yaw; this.cp = this.pitch; this.cd = this.dist; this.cur = this.dist; this.lift = 0; },
  tweenTo(p, d) { this.pitch = p; this.dist = d; this.slow = .9; },
  fwd() { return [-Math.sin(this.cy), -Math.cos(this.cy)]; },
  update(dt, w, focus, cam) {
    const k = 1 - Math.exp(-(this.slow > 0 ? 5 : 11) * dt); this.slow -= dt;
    let dy = ((this.yaw - this.cy + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    this.cy += dy * k; this.cp += (this.pitch - this.cp) * k; this.cd += (this.dist - this.cd) * k;
    const t = this.target, fr = 1 - Math.exp(-(this.slow > 0 ? 5 : 10) * dt);
    t.x += (focus.x - t.x) * fr; t.z += (focus.z - t.z) * fr; t.y += (focus.y - t.y) * (1 - Math.exp(-6 * dt));
    const cp = Math.cos(this.cp), ox = Math.sin(this.cy) * cp, oy = Math.sin(this.cp), oz = Math.cos(this.cy) * cp;
    let d = this.cd;
    if (!this.free) {
      // spacer: kamera nie wchodzi w teren; przybliża się szybko, ale bez szarpnięcia
      const solidNear = (px, py, pz, r) => {
        for (const [a, b, c] of [[0, 0, 0], [r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]])
          if (w.opaque(Math.floor(px + a), Math.floor(py + b), Math.floor(pz + c))) return true;
        return false;
      };
      const st = this.cd > 20 ? .3 : .15, rr = w.ms === 2 ? .5 : .32;
      for (let s = .5; s < this.cd; s += st) {
        if (solidNear(t.x + ox * s, t.y + oy * s, t.z + oz * s, s > 1.2 ? rr : 0)) { d = Math.max(.9, s - .3); break; }
      }
      this.cur += (d - this.cur) * (1 - Math.exp(-(d < this.cur ? 22 : 5) * dt));
    } else this.cur = d;
    let px = t.x + ox * this.cur, py = t.y + oy * this.cur, pz = t.z + oz * this.cur;
    if (this.free && w.chunkAt) {
      // budowanie: kamera nie przenika terenu, tylko łagodnie się nad nim unosi
      let gy = 0; const cx = Math.floor(px), cz = Math.floor(pz);
      for (let y = Math.min(w.H - 1, Math.ceil(py) + 2); y >= 0; y--) if (w.opaque(cx, y, cz)) { gy = y + 1; break; }
      const need = Math.max(0, gy + 2 - py);
      this.lift += (need - this.lift) * (1 - Math.exp(-(need > this.lift ? 12 : 4) * dt));
      py += this.lift;
    }
    cam.position.set(px, py, pz);
    cam.lookAt(t);
  },
};
function voxelRay(w, o, d, maxD) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
  let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
  let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
  let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
  let n = [0, 1, 0], t = 0;
  for (let i = 0; i < 400 && t <= maxD; i++) {
    if (i > 0) { const c = w.get(x, y, z); if (c && BL[c].kind !== 'water') return { x, y, z, n, dist: t }; }
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
    else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
    else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
    if (y < 0 && sy <= 0) break;
  }
  return null;
}

/* ---------- otoczenie: niebo, słońce, chmury, morze ---------- */
function makeEnv(scene, opts = {}) {
  const env = {}, cx = opts.cx || 0, cz = opts.cz || 0;
  const hemi = new THREE.HemisphereLight(0xe3f1ff, 0xa7b98a, 1.7);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const R = opts.shadowR || 26, sc = sun.shadow.camera;
  sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; sun.shadow.radius = 3;
  scene.add(hemi, sun, sun.target);
  const skyGeo = new THREE.SphereGeometry(450, 32, 16);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog(0xcfe7f4, opts.fogNear || 55, opts.fogFar || 190);
  const clouds = new THREE.Group(), cr = mulberry(5);
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa8b8, flatShading: true });
  const cg = geo('cloud', () => new THREE.IcosahedronGeometry(1, 1));
  const cmV = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x9aa8b8, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(), n = 4 + Math.floor(cr() * 3);
    for (let j = 0; j < n; j++) { const m = new THREE.Mesh(cg, cm); m.position.set((j - n / 2) * 2.4 + cr() * 1.5, cr() * 1.2, cr() * 2 - 1); const s = 1.7 + cr() * 1.6; m.scale.set(s * 1.3, s * .75, s); c.add(m); }
    const baked = bakedMesh(c, cmV);
    if (opts.roam) { baked.position.set(cx + (cr() - .5) * 440, 100 + cr() * 26, cz + (cr() - .5) * 440); baked.scale.setScalar(2.4); }
    else baked.position.set(cx + (cr() - .5) * 240, 42 + cr() * 22, cz + (cr() - .5) * 240);
    clouds.add(baked);
  }
  if (opts.roam) cmV.fog = false;
  const CW = opts.roam ? 220 : 140;
  scene.add(clouds);
  if (opts.sea) {
    const S = 600, shape = new THREE.Shape();
    shape.moveTo(-S, -S); shape.lineTo(S, -S); shape.lineTo(S, S); shape.lineTo(-S, S); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(0, 0); hole.lineTo(0, -opts.n); hole.lineTo(opts.n, -opts.n); hole.lineTo(opts.n, 0); hole.closePath();
    shape.holes.push(hole);
    const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-PI / 2);
    const st = TEX.water.clone(); st.repeat.set(.5, .5); st.needsUpdate = true; env.seaTex = st;
    const sea = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ map: st, transparent: true, opacity: .8, depthWrite: false }));
    sea.position.y = SEA + .88; sea.renderOrder = 2; scene.add(sea);
    const bed = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ map: TEX.sand }));
    bed.position.y = 2; scene.add(bed);
    TEX.sand.repeat.set(1, 1);
  }
  const DAY = { top: '#76b6e6', hor: '#d2ebf7', fog: '#cfe6f3', sun: '#fff1dc', hemi: '#e3f1ff' };
  const EVE = { top: '#5b62a6', hor: '#f3b18a', fog: '#e8b694', sun: '#ffb27a', hemi: '#dcc4e0' };
  env.setEvening = t => {
    const C = k => new THREE.Color(mixHex(DAY[k], EVE[k], t));
    const top = C('top'), hor = C('hor'), pos = skyGeo.attributes.position, col = skyGeo.attributes.color, tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const h = Math.max(0, pos.getY(i) / 450); tmp.copy(hor).lerp(top, Math.pow(h, .55)); col.setXYZ(i, tmp.r, tmp.g, tmp.b); }
    col.needsUpdate = true;
    scene.fog.color = C('fog'); sun.color = C('sun'); hemi.color = C('hemi');
    sun.intensity = lerp(2.7, 1.4, t); hemi.intensity = lerp(1.7, 1.15, t);
  };
  const so = opts.sunOff || [22, 40, 14];
  env.sun = sun; env.hemi = hemi;
  env.follow = p => { sun.position.set(p.x + so[0], p.y + so[1], p.z + so[2]); sun.target.position.copy(p); if (opts.roam) { clouds.position.x = p.x - cx; clouds.position.z = p.z - cz; } };
  env.update = (dt, time, camPos) => {
    if (camPos) sky.position.copy(camPos);
    for (const c of clouds.children) { c.position.x += dt * .8; if (c.position.x > cx + CW) c.position.x -= CW * 2; }
    if (env.seaTex) env.seaTex.offset.set(time * .012, time * .008);
  };
  env.setEvening(0);
  return env;
}

/* ---------- silnik ---------- */
const Engine = {
  ok: false, r: null, host: null, scene: null, cam: null,
  init() {
    try {
      const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: true });
      r.setPixelRatio(settings.lowGfx ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
      r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1;
      Object.assign(r.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
      this.r = r; this.ok = true;
    } catch (e) { console.warn('Brak WebGL', e); this.ok = false; }
  },
  attach(host, scene, cam) { if (!this.ok) return; this.host = host; this.scene = scene; this.cam = cam; host.appendChild(this.r.domElement); this.resize(); },
  resize() {
    if (!this.ok || !this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight; if (w < 2 || h < 2) return;
    this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  },
  render() { if (this.ok && this.host) this.r.render(this.scene, this.cam); },
};

/* ---------- ikonki przedmiotów (renderowane w 3D) ---------- */
function stubWorld(t, m) { return { get: (x, y, z) => (x | y | z) === 0 ? t : 0, meta: (x, y, z) => (x | y | z) === 0 ? m : 0, opaque: () => false, in: () => true }; }
const GHOSTM = new Map();
function ghostMat(src) {
  let g = GHOSTM.get(src);
  if (!g) { g = src.clone(); g.transparent = true; g.opacity = .58; g.depthWrite = false; GHOSTM.set(src, g); }
  return g;
}
function setGhostOpacity(o) { for (const g of GHOSTM.values()) g.opacity = o * (g.userData.base || 1); }
function buildItemObject(key, piece, ori = 0, ghost = false) {
  const root = new THREE.Group();
  let obj;
  if (key[0] === '@') { obj = buildAnimal(key.slice(1)); obj.scale.setScalar(2); obj.position.set(.5, 0, .5); }
  else if (key[0] === '!') obj = buildPrefabObject(key.slice(1), ori);
  else {
    const d = BL[BK[key]];
    if (d.kind === 'model') { obj = buildModel(d.key, ori, 11); obj.scale.setScalar((d.key === 'tree' || d.key === 'spruce') ? 2.6 : 2); obj.position.set(.5, 0, .5); if (!d.oriented) obj.rotation.y = .4; }
    else obj = buildPieceObject(key, piece, ori);
  }
  root.add(obj);
  if (ghost) root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = false; o.receiveShadow = false;
    o.material = Array.isArray(o.material) ? o.material.map(ghostMat) : ghostMat(o.material);
  });
  return root;
}
const defaultPiece = k => { const d = k[0] === '@' ? null : BL[BK[k]]; return d && d.kind === 'mat' && !d.nat ? (d.shape === 3 ? 'skos' : 'cegielka') : 'kostka'; };
const Icons = {
  r: null, cache: {},
  init() {
    if (!Engine.ok) return;
    try { this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { this.r = null; return; }
    this.r.setPixelRatio(1); this.r.setSize(128, 128); this.r.toneMapping = THREE.NeutralToneMapping; this.r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bfa8, 2.3));
    const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(3, 6, 4); this.scene.add(d);
    this.cam = new THREE.PerspectiveCamera(26, 1, .05, 100);
  },
  get(id, make) {
    if (this.cache[id]) return this.cache[id];
    if (!this.r) return '';
    const obj = make(); this.scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new V3()), s = box.getSize(new V3());
    const R = Math.max(s.x, s.y, s.z, .3);
    this.cam.position.copy(c).addScaledVector(new V3(1.2, .95, 1.6).normalize(), R * 3.3); this.cam.lookAt(c);
    this.r.render(this.scene, this.cam);
    const url = this.r.domElement.toDataURL('image/png');
    this.scene.remove(obj);
    return (this.cache[id] = url);
  },
  snap(obj, dir, zoom = 1) {
    if (!this.r) return '';
    this.scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new V3()), s = box.getSize(new V3());
    const R = Math.max(s.x, s.y, s.z, .3);
    this.cam.position.copy(c).addScaledVector((dir || new V3(1.2, .95, 1.6)).clone().normalize(), R * 3.3 / zoom); this.cam.lookAt(c);
    this.r.render(this.scene, this.cam);
    const url = this.r.domElement.toDataURL('image/png');
    this.scene.remove(obj);
    return url;
  },
  item(key, piece) {
    const pk = piece || defaultPiece(key);
    return this.get(key + '|' + pk, () => buildItemObject(key, pk, 0));
  },
};

/* ---------- cząsteczki ---------- */
const Parts3 = {
  list: [],
  init(scene) { this.scene = scene; this.geo = new THREE.BoxGeometry(.12, .12, .12); },
  burst(x, y, z, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geo, cmat(color)); m.position.set(x + .2 + Math.random() * .6, y + .3 + Math.random() * .5, z + .2 + Math.random() * .6);
      this.scene.add(m);
      this.list.push({ m, v: new V3((Math.random() - .5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - .5) * 3), t: 0, life: .55 + Math.random() * .3, g: 9 });
    }
  },
  heart(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.heart, transparent: true, depthWrite: false }));
      s.position.set(x + (Math.random() - .5) * .4, y + i * .15, z + (Math.random() - .5) * .4); s.scale.setScalar(.35);
      this.scene.add(s);
      this.list.push({ m: s, v: new V3((Math.random() - .5) * .4, 1 + Math.random() * .4, (Math.random() - .5) * .4), t: -i * .12, life: 1.2, g: 0, sprite: true });
    }
  },
  sparkle(x, y, z, n = 4, spread = 1) {
    if (settings.lowGfx) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.spark, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x + .5 + (Math.random() - .5) * spread, y + .3 + Math.random() * spread * .8, z + .5 + (Math.random() - .5) * spread); s.scale.setScalar(.01);
      this.scene.add(s);
      this.list.push({ m: s, v: new V3((Math.random() - .5) * .6, .8 + Math.random() * .8, (Math.random() - .5) * .6), t: -i * .06, life: .9 + Math.random() * .4, g: 0, sprite: true, spark: .7 + Math.random() * .6 });
    }
  },
  update(dt) {
    this.list = this.list.filter(p => {
      p.t += dt; if (p.t < 0) return true;
      p.v.y -= p.g * dt; p.m.position.addScaledVector(p.v, dt);
      const k = 1 - p.t / p.life;
      if (p.spark) { p.m.material.opacity = Math.max(0, k); p.m.scale.setScalar(p.spark * Math.sin(Math.min(1, p.t / p.life) * PI) + .01); p.m.material.rotation += dt * 2; }
      else if (p.sprite) p.m.material.opacity = Math.max(0, k); else p.m.scale.setScalar(Math.max(.01, k));
      if (p.t >= p.life) { this.scene.remove(p.m); if (p.sprite) p.m.material.dispose(); return false; }
      return true;
    });
  },
};

/* Build3 — w pliku build3.js */

function no3d() {
  const m = modal(`<div class="dialog"><h2>Ups!</h2><p>Ta przeglądarka nie pokazuje grafiki 3D. Spróbuj w Chrome albo Edge. Zagadki działają normalnie.</p><div class="row"><button class="btn t-green" id="n3-ok">OK</button></div></div>`);
  $('#n3-ok', m.el).onclick = m.close;
}

/* =========================================================
   MENU Z DIORAMĄ 3D
   ========================================================= */
const Menu3 = {
  init() {
    const t = $('#m-title'), cols = ['#e98f7f', '#f2b45e', '#7fbf73', '#6fa8dc', '#b48ad8', '#ea8fb0', '#e98f7f', '#f2b45e'];
    t.innerHTML = [...'Klockowo'].map((ch, i) => `<span style="color:${cols[i % cols.length]};transform:rotate(${(i % 2 ? 3 : -3)}deg)">${ch}</span>`).join('');
    $$('[data-go]').forEach(b => b.onclick = () => {
      Snd.click();
      const g = b.dataset.go;
      if (g === 'build') { show('slots'); Voice.say('Buduj swój świat. Wybierz miejsce.'); }
      else { Levels.mode = g; show('levels'); Voice.say(g === 'copy' ? 'Wzory. Zbuduj to samo, co na obrazku.' : 'Jeżyk. Pomóż jeżykowi wrócić do domku.'); }
    });
    $('#m-parent').onclick = () => parentGate(openParentPanel);
    $('#m-fs').onclick = () => { Snd.click(); FullScr.toggle(); }; FullScr.sync();
    if (!Engine.ok) return;
    const s = this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(36, 1, .1, 900);
    this.env = makeEnv(s, { shadowR: 12, cx: 7, cz: 7, fogNear: 80, fogFar: 300 });
    this.env.follow(new V3(7, 3, 7));
    this.world = buildDiorama(); s.add(this.world.group); this.world.buildAll();
    this.person = buildPerson(SHIRTS[0]); this.person.position.set(8.5, 3, 9.7); this.person.rotation.y = .5; s.add(this.person);
  },
  onShow() {
    if (Engine.ok) Engine.attach($('#menu-host'), this.scene, this.cam);
    $('#m-stars').innerHTML = STAR_SVG + ' ' + stars();
    const nu = nextUnlock(), box = $('#m-next');
    box.innerHTML = '';
    if (nu) {
      box.style.display = '';
      box.append('Nagroda za ' + (itemInfo(nu).unlock - stars()) + ' ');
      box.insertAdjacentHTML('beforeend', STAR_SVG);
      const img = new Image(); img.src = Icons.item(nu); box.appendChild(img);
    } else box.style.display = 'none';
  },
  resize() { Engine.resize(); },
  update(dt, time) {
    WIND.uTime.value = time;
    if (!Engine.ok) return;
    const a = .7 + Math.sin(time * .07) * .35, R = 21;
    const narrow = Engine.cam && Engine.cam.aspect < 1.2;
    this.cam.position.set(7 + Math.sin(a) * R * (narrow ? 1.3 : 1), 12.5, 7 + Math.cos(a) * R * (narrow ? 1.3 : 1));
    this.cam.lookAt(7, 2.2, 7);
    updateAnimals3(this.world, dt, time, this.person.position);
    animPerson(this.person.userData, 0, 0, 0, time, Math.sin(time * .4) > -.2);
    this.env.update(dt, time);
    TEX.water.offset.set(time * .03, time * .02);
  },
};
screens.menu = Menu3;

/* =========================================================
   MOJE ŚWIATY
   ========================================================= */
const SLOT_COLS = ['#f6bccb', '#b4d8f5', '#fae29a'];
const Slots3 = {
  onShow() {
    const box = $('#s-cards'); box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const has = !!Store.get('w4_' + i, null), card = document.createElement('div'); card.className = 'wcard';
      if (has) {
        const th = Store.get('w4t_' + i, null);
        if (th) { const img = new Image(); img.src = th; img.className = 'thumb'; card.appendChild(img); }
        else card.insertAdjacentHTML('beforeend', '<div class="plus">🏡</div>');
        card.insertAdjacentHTML('beforeend', `<div><span class="wdot" style="background:${SLOT_COLS[i]}"></span>Świat ${i + 1}</div>`);
        const del = document.createElement('button'); del.className = 'btn icon del'; del.innerHTML = ICON.trash; del.title = 'Usuń (dla rodzica)';
        del.onclick = e => { e.stopPropagation(); parentGate(() => confirmBox('Usunąć ten świat?', 'Tak, usuń', () => { Store.del('w4_' + i); Store.del('w4t_' + i); IDB.delPrefix(i + '|'); Slots3.onShow(); })); };
        card.appendChild(del);
        card.onclick = () => { Snd.click(); Build3.open(i); };
      } else {
        card.innerHTML = '<div class="plus">+</div><div>Nowy świat</div>';
        card.onclick = () => { Snd.click(); this.choose(i); };
      }
      box.appendChild(card);
    }
  },
  choose(i) {
    const m = modal(`<div class="dialog"><h2>Jaki świat?</h2><div class="choice-row" id="tpl"></div>
      <div class="row"><button class="btn" id="tpl-no">Wróć</button></div></div>`);
    const row = $('#tpl', m.el);
    [['island', 'Kraina', '🌍'], ['meadow', 'Wielka łąka', '🌾'], ['winter', 'Zima', '⛄']].forEach(([k, name, em]) => {
      const b = document.createElement('button'); b.className = 'btn choice';
      b.innerHTML = `<span style="font-size:76px;line-height:1.1">${em}</span>${name}`;
      b.onclick = () => { m.close(); Build3.open(i, k); };
      row.appendChild(b);
    });
    $('#tpl-no', m.el).onclick = m.close;
    Voice.say('Jaki świat? Kraina, wielka łąka, czy zima? Każdy świat nie ma końca.');
  },
};
screens.slots = Slots3;
