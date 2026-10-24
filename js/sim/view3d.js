// 3D-visning af byen med Three.js. Simulationens (x, y) bliver Three's (x, z); y-aksen er op.
import * as THREE from '../vendor/three.module.min.js';
import { ROAD_HALF, CYCLE_W, WALK_W, LOT, LANE_OFF, lightState } from './network.js';

const COL = {
  sky: 0xc5d3df, lawn: 0x6f8d5a, asphalt: 0x3a3e44, walk: 0xa8aaa6, cycle: 0x51565d, curb: 0x8d908c,
  mark: 0xeceee8, island: 0x5f8a49,
};
const BUILDING_COLORS = ['#b4654a', '#c9b79c', '#d9d3c5', '#8f8a80', '#a8553e', '#e2dbcc', '#6f7680', '#c48a5a', '#9c4a3a', '#bfb6a6'];

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...extra });
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);   // ligger i xz, 1x1
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);    // står på y=0
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

function compose(x, y, z, rotY, sx, sy, sz) {
  tmpE.set(0, rotY, 0); tmpQ.setFromEuler(tmpE);
  tmpV.set(x, y, z); tmpS.set(sx, sy, sz);
  return tmpM.compose(tmpV, tmpQ, tmpS);
}
// lokal +x peger i kørselsretningen h
const rotFor = h => -h;

function instanced(geo, mat, items, fill) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  m.count = items.length;
  items.forEach((it, i) => { fill(it, i); m.setMatrixAt(i, tmpM); if (it.color) m.setColorAt(i, tmpC.set(it.color)); });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
}

// fletter dele til én geometri med farver pr. hjørne (én draw call pr. objekt)
function merged(parts) {
  let count = 0;
  const gs = parts.map(([geo, mat4, color]) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    g.applyMatrix4(mat4);
    count += g.attributes.position.count;
    return [g, new THREE.Color(color)];
  });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  for (const [g, c] of gs) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
const M = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1) => compose(x, y, z, ry, sx, sy, sz).clone();
const VC = lambert(0xffffff, { vertexColors: true });

// ---------- køretøjer ----------
const CYL = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 10).rotateX(Math.PI / 2);
const BOX = new THREE.BoxGeometry(1, 1, 1);
export function carGeometry(color, opts = {}) {
  const parts = [
    [BOX, M(0, 0.62, 0, 0, 4.3, 0.66, 1.8), color],
    [BOX, M(0.15, 0.62, 0, 0, 3.6, 0.7, 1.82), color],
    [BOX, M(-0.25, 1.24, 0, 0, 2.25, 0.6, 1.6), '#26303a'],
    [BOX, M(-0.25, 1.56, 0, 0, 1.9, 0.06, 1.5), color],
    [BOX, M(-2.16, 0.78, 0.62, 0, 0.06, 0.16, 0.4), '#c0261f'],
    [BOX, M(-2.16, 0.78, -0.62, 0, 0.06, 0.16, 0.4), '#c0261f'],
    [BOX, M(2.16, 0.72, 0.62, 0, 0.06, 0.14, 0.38), '#f2efe6'],
    [BOX, M(2.16, 0.72, -0.62, 0, 0.06, 0.14, 0.38), '#f2efe6'],
    [BOX, M(-2.17, 0.45, 0, 0, 0.05, 0.22, 0.6), '#e9e5d6'],
  ];
  for (const [x, z] of [[1.35, 0.82], [1.35, -0.82], [-1.35, 0.82], [-1.35, -0.82]]) parts.push([CYL, M(x, 0.33, z), '#15171a']);
  if (opts.school) parts.push([BOX, M(-0.25, 1.75, 0, 0, 0.9, 0.3, 0.12), '#f4f6f8']);
  return merged(parts);
}
const TORUS = new THREE.TorusGeometry(0.34, 0.035, 5, 14);
const SPH = new THREE.SphereGeometry(1, 8, 6);
function cyclistGeometry(color) {
  return merged([
    [TORUS, M(0.55, 0.34, 0), '#1c1f23'], [TORUS, M(-0.55, 0.34, 0), '#1c1f23'],
    [BOX, M(0, 0.62, 0, 0, 1.0, 0.05, 0.05), '#5b6067'],
    [BOX, M(-0.08, 0.78, 0, 0, 0.22, 0.5, 0.3), '#2a2e33'],
    [BOX, M(-0.05, 1.22, 0, 0, 0.32, 0.6, 0.38), color],
    [SPH, M(0.03, 1.66, 0, 0, 0.14, 0.14, 0.14), '#e2c3a2'],
    [SPH, M(0.03, 1.72, 0, 0, 0.16, 0.1, 0.16), '#c8322b'],
  ]);
}
const CYLV = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
function pedGeometry(color, child) {
  const k = child ? 0.64 : 1;
  return merged([
    [CYLV, M(0, 0, 0, 0, 0.14 * k, 0.82 * k, 0.14 * k), '#2c3036'],
    [CYLV, M(0, 0.8 * k, 0, 0, 0.21 * k, 0.62 * k, 0.21 * k), color],
    [SPH, M(0, 1.6 * k, 0, 0, 0.13 * k, 0.14 * k, 0.13 * k), '#e2c3a2'],
  ]);
}

// ---------- skilte ----------
function signTexture(type) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const F = 'Arial Black, Arial, sans-serif';
  const tri = (up, fill, stroke) => { g.beginPath(); if (up) { g.moveTo(64, 10); g.lineTo(120, 112); g.lineTo(8, 112); } else { g.moveTo(8, 16); g.lineTo(120, 16); g.lineTo(64, 118); } g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 12; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); };
  switch (type) {
    case 'stop':
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(64 + 58 * Math.cos(a), 64 + 58 * Math.sin(a)); } g.closePath();
      g.fillStyle = '#c8322b'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#f4f6f8'; g.stroke();
      g.fillStyle = '#f4f6f8'; g.font = `900 34px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 64, 66); break;
    case 'vigepligt': tri(false, '#f4f6f8', '#c8322b'); break;
    case 'skole': tri(true, '#f4f6f8', '#c8322b'); g.fillStyle = '#16181b'; g.beginPath(); g.arc(52, 58, 8, 0, 7); g.fill(); g.fillRect(46, 68, 12, 26); g.beginPath(); g.arc(78, 66, 6, 0, 7); g.fill(); g.fillRect(73, 74, 10, 20); break;
    case 'fodgaenger':
      g.fillStyle = '#1d4fa0'; g.fillRect(6, 6, 116, 116); g.fillStyle = '#f4f6f8'; g.beginPath(); g.moveTo(64, 14); g.lineTo(116, 112); g.lineTo(12, 112); g.closePath(); g.fill();
      g.fillStyle = '#16181b'; g.beginPath(); g.arc(66, 50, 7, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#16181b'; g.beginPath(); g.moveTo(66, 58); g.lineTo(62, 82); g.lineTo(52, 100); g.moveTo(62, 82); g.lineTo(74, 100); g.moveTo(54, 70); g.lineTo(78, 66); g.stroke(); break;
    case 'rundkoersel':
      g.fillStyle = '#1d4fa0'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#f4f6f8';
      for (let k = 0; k < 3; k++) { const a = k * 2.094; g.beginPath(); g.arc(64, 64, 30, a + 0.3, a + 1.7); g.stroke(); } break;
    case 'hovedvej':
      g.translate(64, 64); g.rotate(Math.PI / 4); g.fillStyle = '#f4f6f8'; g.fillRect(-42, -42, 84, 84); g.strokeStyle = '#16181b'; g.lineWidth = 3; g.strokeRect(-42, -42, 84, 84); g.fillStyle = '#f2c230'; g.fillRect(-26, -26, 52, 52); break;
    case 'skolevogn':
      c.width = 256; c.height = 64; const h = c.getContext('2d'); h.fillStyle = '#f4f6f8'; h.fillRect(0, 0, 256, 64); h.fillStyle = '#c8322b'; h.font = `900 34px ${F}`; h.textAlign = 'center'; h.textBaseline = 'middle'; h.fillText('SKOLEVOGN', 128, 34); break;
    default: {
      const n = String(type).replace('speed', '');
      g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = '#c8322b'; g.stroke();
      g.fillStyle = '#16181b'; g.font = `900 50px ${F}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 64, 68);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- huse med vinduer i skyggeren ----------
function buildingMaterial() {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW; varying vec3 vBN;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        vec4 bwp = vec4(transformed, 1.0);
        vec3 bn = objectNormal;
        #ifdef USE_INSTANCING
          bwp = instanceMatrix * bwp; bn = mat3(instanceMatrix) * bn;
        #endif
        bwp = modelMatrix * bwp; vBW = bwp.xyz; vBN = normalize(mat3(modelMatrix) * bn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW; varying vec3 vBN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 an = abs(vBN);
          if (an.y < 0.5) {
            float u = an.x > an.z ? vBW.z : vBW.x;
            float fx = fract(u / 3.1);
            float fy = fract((vBW.y - 0.4) / 3.0);
            float win = step(0.24, fx) * step(fx, 0.74) * step(0.34, fy) * step(fy, 0.84) * step(1.2, vBW.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.29, 0.36, 0.44), win * 0.92);
            diffuseColor.rgb *= 0.9 + 0.1 * step(0.95, fract((vBW.y - 0.4) / 3.0));
          } else { diffuseColor.rgb *= 0.62; }
        }`);
  };
  return m;
}

// ---------- byen ----------
export function createView(canvas, net, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.sky);
  scene.fog = new THREE.Fog(COL.sky, 70, 330);
  scene.add(new THREE.HemisphereLight(0xe6edf3, 0x59604f, 1.25));
  const sun = new THREE.DirectionalLight(0xfff6e6, 1.5);
  sun.position.set(-120, 220, -60);
  scene.add(sun);

  const { x1, y1 } = net.bounds;
  const cx = x1 / 2, cz = y1 / 2;

  // jord
  const ground = new THREE.Mesh(UNIT_PLANE, lambert(COL.lawn));
  ground.scale.set(1600, 1, 1600); ground.position.set(cx, -0.05, cz);
  scene.add(ground);

  // veje
  const asphalt = lambert(COL.asphalt);
  scene.add(instanced(UNIT_PLANE, asphalt, net.edges, e => compose((e.a.x + e.b.x) / 2, 0.06, (e.a.y + e.b.y) / 2, rotFor(Math.atan2(e.dir.y, e.dir.x)), e.len, 1, ROAD_HALF * 2)));
  const circle = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  const nodes = [...net.nodes.values()];
  scene.add(instanced(circle, asphalt, nodes, n => compose(n.x, 0.064, n.y, 0, n.type === 'roundabout' ? 14 : 8.6, 1, n.type === 'roundabout' ? 14 : 8.6)));
  for (const n of nodes) if (n.type === 'roundabout') {
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.9, 0.26, 32), lambert(COL.curb)); curb.position.set(n.x, 0.13, n.y); scene.add(curb);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.36, 32), lambert(COL.island)); isl.position.set(n.x, 0.18, n.y); scene.add(isl);
  }

  // fortove og haver: én flise pr. karré, med afrundede hjørner ved kryds
  const X = [-80, ...Array.from({ length: net.cols }, (_, i) => i * 110), (net.cols - 1) * 110 + 80];
  const Y = [-80, ...Array.from({ length: net.rows }, (_, j) => j * 110), (net.rows - 1) * 110 + 80];
  const hasV = (i, j) => i >= 0 && i < net.cols && j >= 0 && j < net.rows - 1 && !net.removedV.has(`${i},${j}`);
  const hasH = (i, j) => j >= 0 && j < net.rows && i >= 0 && i < net.cols - 1;
  const nodeAt = (i, j) => net.nodes.get(`${i},${j}`);
  const slabParts = [], lotParts = [], buildings = [], trees = [], lamps = [];
  for (let ci = -1; ci < net.cols; ci++) for (let cj = -1; cj < net.rows; cj++) {
    const xa = X[ci + 1], xb = X[ci + 2], ya = Y[cj + 1], yb = Y[cj + 2];
    const L = hasV(ci, cj), R = hasV(ci + 1, cj), T = hasH(ci, cj), B = hasH(ci, cj + 1);
    const corner = (i, j, a, b) => { const n = nodeAt(i, j); if (!n || !a || !b) return 0; return n.type === 'roundabout' ? 22 : 5; };
    const rects = [
      { inset: ROAD_HALF, mat: slabParts, h: 0.15 },
      { inset: LOT, mat: lotParts, h: 0.17 },
    ];
    for (const r of rects) {
      const x0 = xa + (L ? r.inset : 0), x2 = xb - (R ? r.inset : 0), y0 = ya + (T ? r.inset : 0), y2 = yb - (B ? r.inset : 0);
      if (x2 - x0 < 4 || y2 - y0 < 4) continue;
      const k = r.inset === ROAD_HALF ? 0 : 6;
      const rTL = corner(ci, cj, L, T) && corner(ci, cj, L, T) + k, rTR = corner(ci + 1, cj, R, T) && corner(ci + 1, cj, R, T) + k;
      const rBL = corner(ci, cj + 1, L, B) && corner(ci, cj + 1, L, B) + k, rBR = corner(ci + 1, cj + 1, R, B) && corner(ci + 1, cj + 1, R, B) + k;
      const s = new THREE.Shape();
      s.moveTo(x0 + rTL, -y0); s.lineTo(x2 - rTR, -y0); if (rTR) s.quadraticCurveTo(x2, -y0, x2, -y0 - rTR);
      s.lineTo(x2, -y2 + rBR); if (rBR) s.quadraticCurveTo(x2, -y2, x2 - rBR, -y2);
      s.lineTo(x0 + rBL, -y2); if (rBL) s.quadraticCurveTo(x0, -y2, x0, -y2 + rBL);
      s.lineTo(x0, -y0 - rTL); if (rTL) s.quadraticCurveTo(x0, -y0, x0 + rTL, -y0);
      const g = new THREE.ExtrudeGeometry(s, { depth: r.h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2);
      r.mat.push(g);
      if (r.inset === LOT) {
        // huse langs de sider, der vender mod en vej
        const sides = [];
        if (T) sides.push({ ax: x0, ay: y0, bx: x2, by: y0, nx: 0, ny: 1, road: hasH(ci, cj) && net.edges.find(e => e.a.id === `${ci},${cj}` && e.b.id === `${ci + 1},${cj}`) });
        if (B) sides.push({ ax: x2, ay: y2, bx: x0, by: y2, nx: 0, ny: -1, road: net.edges.find(e => e.a.id === `${ci},${cj + 1}` && e.b.id === `${ci + 1},${cj + 1}`) });
        if (L) sides.push({ ax: x0, ay: y2, bx: x0, by: y0, nx: 1, ny: 0, road: net.edges.find(e => e.a.id === `${ci},${cj}` && e.b.id === `${ci},${cj + 1}`) });
        if (R) sides.push({ ax: x2, ay: y0, bx: x2, by: y2, nx: -1, ny: 0, road: net.edges.find(e => e.a.id === `${ci + 1},${cj}` && e.b.id === `${ci + 1},${cj + 1}`) });
        for (const sd of sides) {
          const len = Math.hypot(sd.bx - sd.ax, sd.by - sd.ay), ux = (sd.bx - sd.ax) / len, uy = (sd.by - sd.ay) / len;
          const busy = sd.road && sd.road.busy;
          let t = 10 + hash(ci * 7 + cj * 13 + sd.nx * 3) * 4;
          while (t < len - 12) {
            const w = busy ? 12 + hash(t + ci) * 8 : 9 + hash(t * 1.3 + cj) * 5;
            if (t + w > len - 10) break;
            const d = busy ? 11 + hash(t + 3) * 4 : 9 + hash(t + 7) * 3;
            const h = busy ? 11 + Math.floor(hash(t + ci + cj) * 4) * 3 : 6.5 + Math.floor(hash(t * 2 + ci) * 2) * 3;
            const mx = sd.ax + ux * (t + w / 2) + sd.nx * (d / 2 + 1.5), my = sd.ay + uy * (t + w / 2) + sd.ny * (d / 2 + 1.5);
            buildings.push({ x: mx, y: my, w, d, h, rot: Math.atan2(uy, ux), color: BUILDING_COLORS[Math.floor(hash(mx * 0.13 + my * 0.07) * BUILDING_COLORS.length)] });
            t += w + 2 + hash(t + 11) * 3;
          }
        }
      }
    }
  }
  scene.add(new THREE.Mesh(mergeIndexed(slabParts), lambert(COL.walk)));
  scene.add(new THREE.Mesh(mergeIndexed(lotParts), lambert(0x7a9763)));
  scene.add(instanced(UNIT_BOX, buildingMaterial(), buildings, b => compose(b.x, 0.16, b.y, rotFor(b.rot), b.w, b.h, b.d)));

  // cykelstier
  const cyc = [];
  for (const e of net.edges) if (e.cycle) {
    const r = { x: -e.dir.y, y: e.dir.x }, off = ROAD_HALF + CYCLE_W / 2, L = e.len - e.a.R - e.b.R + 2;
    for (const sd of [1, -1]) cyc.push({ x: (e.a.x + e.b.x) / 2 + r.x * off * sd, y: (e.a.y + e.b.y) / 2 + r.y * off * sd, L, h: Math.atan2(e.dir.y, e.dir.x) });
  }
  scene.add(instanced(UNIT_PLANE, lambert(COL.cycle), cyc, c => compose(c.x, 0.165, c.y, rotFor(c.h), c.L, 1, CYCLE_W)));

  // vejstriber
  const markMat = lambert(COL.mark);
  const dashes = [];
  for (const e of net.edges) {
    const start = e.a.R + 2, end = e.len - e.b.R - 2;
    for (let s = start; s + 3 < end; s += 9) dashes.push({ x: e.a.x + e.dir.x * (s + 1.5), y: e.a.y + e.dir.y * (s + 1.5), h: Math.atan2(e.dir.y, e.dir.x) });
  }
  scene.add(instanced(UNIT_PLANE, markMat, dashes, d => compose(d.x, 0.09, d.y, rotFor(d.h), 3, 1, 0.13)));
  const stops = net.marks.filter(m => m.type === 'stopline');
  scene.add(instanced(UNIT_PLANE, markMat, stops, m => compose(m.x - Math.cos(m.h) * 0.3, 0.092, m.y - Math.sin(m.h) * 0.3, rotFor(m.h), 0.45, 1, 3.4)));
  const teeth = [];
  for (const m of net.marks.filter(q => q.type === 'shark')) {
    const r = { x: -Math.sin(m.h), y: Math.cos(m.h) };
    for (let k = -2.5; k <= 2.5; k += 1) teeth.push({ x: m.x + r.x * k * 0.58 - Math.cos(m.h) * 0.6, y: m.y + r.y * k * 0.58 - Math.sin(m.h) * 0.6, h: m.h });
  }
  const triGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.3, 0, -0.22), new THREE.Vector3(0.3, 0, 0.22), new THREE.Vector3(-0.35, 0, 0)]);
  triGeo.computeVertexNormals();
  scene.add(instanced(triGeo, markMat, teeth, t => compose(t.x, 0.094, t.y, rotFor(t.h), 1, 1, 1)));
  const zebra = [];
  for (const z of net.zebras) {
    const r = { x: -z.dir.y, y: z.dir.x }, h = Math.atan2(z.dir.y, z.dir.x);
    for (let k = -3.0; k <= 3.01; k += 1.0) zebra.push({ x: z.x + r.x * k, y: z.y + r.y * k, h });
  }
  scene.add(instanced(UNIT_PLANE, markMat, zebra, z => compose(z.x, 0.096, z.y, rotFor(z.h), 3.0, 1, 0.5)));

  // træer og lygtepæle
  for (const e of net.edges) {
    const r = { x: -e.dir.y, y: e.dir.x };
    const offT = ROAD_HALF + (e.cycle ? CYCLE_W : 0) + WALK_W - 0.4;
    for (let s = e.a.R + 12; s < e.len - e.b.R - 10; s += 21) for (const sd of [1, -1]) {
      if (net.zebras.some(z => Math.hypot(z.x - (e.a.x + e.dir.x * s), z.y - (e.a.y + e.dir.y * s)) < 8)) continue;
      if (hash(s * 3 + e.a.x + sd) < 0.25) continue;
      trees.push({ x: e.a.x + e.dir.x * s + r.x * offT * sd, y: e.a.y + e.dir.y * s + r.y * offT * sd, k: 0.8 + hash(s + e.b.y) * 0.5, color: ['#3f7a35', '#4c8240', '#5a8a3c', '#36693a'][Math.floor(hash(s * 1.7 + sd) * 4)] });
    }
    for (let s = e.a.R + 6; s < e.len - e.b.R; s += 34) {
      const sd = (Math.round(s / 34) % 2) ? 1 : -1, off = ROAD_HALF + 0.5 + (e.cycle ? CYCLE_W : 0);
      lamps.push({ x: e.a.x + e.dir.x * s + r.x * off * sd, y: e.a.y + e.dir.y * s + r.y * off * sd, h: Math.atan2(r.y * -sd, r.x * -sd) });
    }
  }
  for (const n of nodes) if (n.type === 'roundabout') trees.push({ x: n.x, y: n.y, k: 1.5, color: '#3f7a35' });
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 6).translate(0, 1.2, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.6, 0);
  scene.add(instanced(trunkGeo, lambert(0x5a4635), trees, t => compose(t.x, 0.15, t.y, 0, t.k, t.k, t.k)));
  scene.add(instanced(crownGeo, lambert(0xffffff), trees, t => compose(t.x, 0.15, t.y, hash(t.x) * 3, t.k, t.k * (0.9 + hash(t.y) * 0.3), t.k)));
  const lampGeo = merged([[CYLV, M(0, 0, 0, 0, 0.07, 5.6, 0.07), '#686d73'], [BOX, M(0.45, 5.55, 0, 0, 1.0, 0.1, 0.12), '#686d73'], [BOX, M(0.85, 5.48, 0, 0, 0.42, 0.1, 0.22), '#f1e7c2']]);
  scene.add(instanced(lampGeo, VC, lamps, l => compose(l.x, 0.15, l.y, rotFor(l.h), 1, 1, 1)));

  // skilte: én instans-gruppe pr. type
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.4, 6).translate(0, 1.2, 0);
  scene.add(instanced(poleGeo, lambert(0x6d7278), net.signs, s => compose(s.x, 0.15, s.y, 0, 1, 1, 1)));
  const faceGeo = new THREE.PlaneGeometry(0.78, 0.78);
  const backMat = lambert(0x9aa0a6);
  const byType = {};
  for (const s of net.signs) (byType[s.type] ||= []).push(s);
  // skiltet vender mod de biler, det gælder for: normal = -kørselsretning
  const faceRot = h => Math.atan2(-Math.cos(h), -Math.sin(h));
  for (const [type, list] of Object.entries(byType)) {
    const mat = new THREE.MeshBasicMaterial({ map: signTexture(type), transparent: true, alphaTest: 0.4 });
    scene.add(instanced(faceGeo, mat, list, s => compose(s.x - Math.cos(s.h) * 0.03, 2.55, s.y - Math.sin(s.h) * 0.03, faceRot(s.h), 1, 1, 1)));
    scene.add(instanced(faceGeo, backMat, list, s => compose(s.x + Math.cos(s.h) * 0.01, 2.55, s.y + Math.sin(s.h) * 0.01, faceRot(s.h), 0.96, 0.96, 1)));
  }

  // lyskryds
  const lp = net.lightPoles;
  scene.add(instanced(new THREE.CylinderGeometry(0.07, 0.07, 3.3, 6).translate(0, 1.65, 0), lambert(0x4a4f55), lp, l => compose(l.x, 0.15, l.y, 0, 1, 1, 1)));
  scene.add(instanced(new THREE.BoxGeometry(0.36, 1.05, 0.3), lambert(0x1c1f23), lp, l => compose(l.x, 3.6, l.y, faceRot(l.h), 1, 1, 1)));
  const bulbs = [];
  for (const l of lp) for (let k = 0; k < 3; k++) bulbs.push({ l, k });
  const bulbMesh = instanced(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs, b => compose(b.l.x - Math.cos(b.l.h) * 0.17, 3.95 - b.k * 0.34, b.l.y - Math.sin(b.l.h) * 0.17, 0, 1, 1, 1));
  scene.add(bulbMesh);
  const BULB = [[0xff3b30, 0x3a1512], [0xffc400, 0x3a2e0a], [0x30d158, 0x0f2a16]];
  function updateLights() {
    bulbs.forEach((b, i) => {
      const st = lightState(b.l.node, b.l.lane);
      const on = b.k === 0 ? (st === 'red' || st === 'redyellow') : b.k === 1 ? (st === 'yellow' || st === 'redyellow') : st === 'green';
      bulbMesh.setColorAt(i, tmpC.setHex(BULB[b.k][on ? 0 : 1]));
    });
    bulbMesh.instanceColor.needsUpdate = true;
  }

  // postkassen ved slutpunktet
  if (net.target) {
    const pb = new THREE.Mesh(merged([[BOX, M(0, 0.55, 0, 0, 0.5, 1.1, 0.45), '#c8322b'], [BOX, M(0, 1.15, 0, 0, 0.56, 0.12, 0.5), '#9e241f'], [CYLV, M(0, 0, 0, 0, 0.06, 0.2, 0.06), '#333']]), VC);
    pb.position.set(net.target.x, 0.15, net.target.y);
    pb.rotation.y = rotFor(net.target.h);
    scene.add(pb);
  }

  // ---------- dynamiske ting ----------
  const carMeshes = new Map();
  const cycMeshes = [], pedMeshes = [];
  const pedPool = new Map();
  const player = new THREE.Group();
  const playerBody = new THREE.Mesh(carGeometry('#f5b82e', { school: true }), VC);
  player.add(playerBody);
  const roofSign = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.24), new THREE.MeshBasicMaterial({ map: signTexture('skolevogn') }));
  roofSign.position.set(-0.31, 1.75, 0); roofSign.rotation.y = -Math.PI / 2; player.add(roofSign);
  const roofSign2 = roofSign.clone(); roofSign2.position.x = -0.19; roofSign2.rotation.y = Math.PI / 2; player.add(roofSign2);
  scene.add(player);

  // kabine set indefra: kun motorhjelm, instrumentbræt-kant og tynde stolper, så vejen fylder mest
  const cabin = new THREE.Group();
  const dark = '#16191c';
  cabin.add(new THREE.Mesh(merged([
    [BOX, M(1.72, 0.6, 0, 0, 1.25, 0.44, 1.6), '#d99a1f'],
    [BOX, M(0.78, 0.5, 0, 0, 0.75, 0.5, 1.74), dark],
    [BOX, M(1.14, 0.76, 0, 0, 0.06, 0.03, 1.6), '#2a2f35'],
    [BOX, M(-0.2, 0.98, 0.9, 0, 2.2, 0.1, 0.05), '#22262b'],
    [BOX, M(-0.2, 0.98, -0.9, 0, 2.2, 0.1, 0.05), '#22262b'],
    [BOX, M(-0.3, 1.66, 0, 0, 1.4, 0.04, 1.7), '#24282d'],
  ]), VC));
  for (const z of [0.9, -0.9]) { const a = new THREE.Mesh(BOX, lambert(0x16191c)); a.scale.set(0.035, 0.8, 0.035); a.position.set(0.66, 1.3, z); a.rotation.z = 0.9; cabin.add(a); }
  const wheelMesh = new THREE.Group();
  player.add(cabin);

  // kameraer
  const cam = new THREE.PerspectiveCamera(70, 1, 0.18, 700);
  const mirrorCams = { rear: new THREE.PerspectiveCamera(24, 3.3, 0.3, 300), left: new THREE.PerspectiveCamera(30, 1.6, 0.3, 300), right: new THREE.PerspectiveCamera(30, 1.6, 0.3, 300) };
  const flip = c => { c.updateProjectionMatrix(); c.projectionMatrix.elements[0] *= -1; c.projectionMatrixInverse.copy(c.projectionMatrix).invert(); };
  Object.values(mirrorCams).forEach(flip);

  let camMode = opts.camera || 'cockpit', yaw = 0, yawTarget = 0, chase = null, follow = null;
  const lookAt = new THREE.Vector3(), camPos = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    const aspect = w / h;
    cam.aspect = aspect;
    const hfov = camMode === 'cockpit' ? 92 : 78;
    let vfov = 2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / aspect) * (180 / Math.PI);
    cam.fov = Math.max(46, Math.min(camMode === 'cockpit' ? 76 : 72, vfov));
    cam.updateProjectionMatrix();
  }

  function syncDynamic(sim) {
    const { traffic } = sim;
    for (const c of traffic.cars) {
      let m = carMeshes.get(c.id);
      if (!m) { m = new THREE.Mesh(carGeometry(c.color), VC); carMeshes.set(c.id, m); scene.add(m); }
      m.position.set(c.x, 0, c.y); m.rotation.y = rotFor(c.h);
    }
    traffic.cyclists.forEach((c, i) => {
      let m = cycMeshes[i];
      if (!m) { m = new THREE.Mesh(cyclistGeometry(c.color), VC); cycMeshes[i] = m; scene.add(m); }
      m.position.set(c.x, 0.16 + Math.abs(Math.sin(c.phase)) * 0.02, c.y); m.rotation.y = rotFor(c.h); m.visible = c.s >= 0;
    });
    const peds = traffic.allPeds();
    const seen = new Set();
    for (const q of peds) {
      let m = pedPool.get(q);
      if (!m) { m = new THREE.Mesh(pedGeometry(q.color, q.child), VC); pedPool.set(q, m); scene.add(m); }
      seen.add(q);
      m.position.set(q.x, 0.16 + Math.abs(Math.sin(q.phase)) * 0.04, q.y); m.rotation.y = rotFor(q.h);
    }
    for (const [q, m] of pedPool) if (!seen.has(q)) { scene.remove(m); m.geometry.dispose(); pedPool.delete(q); }
  }

  function placeCamera(sim, dt) {
    const p = follow || sim.player;
    const h = p.h, fx = Math.cos(h), fz = Math.sin(h), rx = -fz, rz = fx;
    player.visible = !follow;
    player.position.set(sim.player.x, 0, sim.player.y);
    player.rotation.y = rotFor(sim.player.h);
    wheelMesh.rotation.z = -sim.player.steer * 2.3;
    yaw += (yawTarget - yaw) * Math.min(1, dt * 14);
    const cockpit = !follow && (camMode === 'cockpit' || Math.abs(yaw) > 0.05);
    playerBody.visible = !cockpit; roofSign.visible = roofSign2.visible = !cockpit; cabin.visible = cockpit;
    if (cockpit) {
      camPos.set(p.x - fx * 0.2 - rx * 0.37, 1.3, p.y - fz * 0.2 - rz * 0.37);
      const a = h - yaw;
      lookAt.set(camPos.x + Math.cos(a) * 10, 1.3 - 0.5, camPos.z + Math.sin(a) * 10);
      cam.position.copy(camPos); cam.lookAt(lookAt);
    } else {
      const back = follow ? 9 : 6.8, up = follow ? 4.2 : 2.7;
      const target = new THREE.Vector3(p.x - fx * back, up, p.y - fz * back);
      if (!chase) chase = target.clone();
      chase.lerp(target, Math.min(1, dt * (follow ? 2.2 : 5)));
      cam.position.copy(chase);
      lookAt.set(p.x + fx * 5, 1.1, p.y + fz * 5);
      cam.lookAt(lookAt);
    }
    // spejlkameraer
    const hx = sim.player.x, hz = sim.player.y, ph = sim.player.h, f2x = Math.cos(ph), f2z = Math.sin(ph), r2x = -f2z, r2z = f2x;
    const setM = (c, px, pz, py, dirx, dirz) => { c.position.set(px, py, pz); c.lookAt(px + dirx, py - 0.04, pz + dirz); };
    setM(mirrorCams.rear, hx + f2x * 0.4, hz + f2z * 0.4, 1.35, -f2x, -f2z);
    const ca = Math.cos(0.2), sa = Math.sin(0.2);
    setM(mirrorCams.left, hx + f2x * 0.7 - r2x * 1.0, hz + f2z * 0.7 - r2z * 1.0, 1.05, -f2x * ca - r2x * sa, -f2z * ca - r2z * sa);
    setM(mirrorCams.right, hx + f2x * 0.7 + r2x * 1.0, hz + f2z * 0.7 + r2z * 1.0, 1.05, -f2x * ca + r2x * sa, -f2z * ca + r2z * sa);
  }

  function render(sim, dt, mirrorRects) {
    resize();
    syncDynamic(sim);
    updateLights();
    placeCamera(sim, dt);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
    renderer.render(scene, cam);
    if (mirrorRects && !follow) {
      const cabinVis = cabin.visible; cabin.visible = false; playerBody.visible = false;
      renderer.setScissorTest(true);
      for (const [k, r] of Object.entries(mirrorRects)) {
        if (!r || r.w < 4) continue;
        const c = mirrorCams[k];
        const asp = r.w / r.h;
        if (Math.abs(c.aspect - asp) > 0.01) { c.aspect = asp; flip(c); }
        const y = h - r.y - r.h;
        renderer.setViewport(r.x, y, r.w, r.h);
        renderer.setScissor(r.x, y, r.w, r.h);
        renderer.render(scene, c);
      }
      renderer.setScissorTest(false);
      cabin.visible = cabinVis;
    }
  }

  return {
    render,
    setCamera(m) { camMode = m; chase = null; },
    get camera() { return camMode; },
    shoulder(side) { yawTarget = side === 'left' ? 1.95 : side === 'right' ? -1.95 : 0; },
    followEntity(e) { follow = e; chase = null; },
    dispose() { renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
    renderer,
    lowerQuality() { const pr = renderer.getPixelRatio(); if (pr > 0.75) { renderer.setPixelRatio(Math.max(0.75, pr - 0.35)); return true; } return false; },
  };
}

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function mergeIndexed(geos) {
  const parts = geos.map(g => [g, new THREE.Matrix4(), '#ffffff']);
  const m = merged(parts);
  m.deleteAttribute('color');
  return m;
}
