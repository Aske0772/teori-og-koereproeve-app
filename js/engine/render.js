// Pseudo-3D-renderer til canvas. Flad vej (Danmark), kurver, sprites, aktører, spejle.
import { SEG } from './world.js';

export const VIEW = { W: 480, H: 600 };
const HALF_ROAD = 3.5;         // meter fra midte til kant
const CAM_H = 2.1;             // kamerahøjde i meter (hævet, som i klassiske pseudo-3D-spil)
const DEPTH = 1.0;             // 1/tan(fov/2)
const DRAW = 110;              // segmenter frem
const HORIZON = 0.42;          // andel af højden

const ENV = {
  by: { grass: '#5d6670', grass2: '#58616b', sidewalk: '#9aa0a6', sidewalk2: '#8f959b', sky0: '#8da2b8', sky1: '#d8dfe6', skyline: '#6f7a86', fog: '#b9c3cc' },
  land: { grass: '#4f7a3d', grass2: '#497238', sidewalk: '#7a6a52', sidewalk2: '#73644e', sky0: '#8fa6bd', sky1: '#dfe6ec', skyline: '#5a7a4c', fog: '#c2cdd2' },
};

// ---------- sprites (tegnes med fod i (x,y), s = px pr. meter) ----------
function makeSprites(ctx) {
const S = {
  tree(x, y, s, p) {
    const size = p.size || 1, h = 5.5 * size * s;
    ctx.fillStyle = '#5a4635'; ctx.fillRect(x - 0.18 * s, y - h * 0.45, 0.36 * s, h * 0.45);
    ctx.fillStyle = p.env === 'land' ? '#3e7a33' : '#4d7745';
    ctx.beginPath(); ctx.arc(x, y - h * 0.62, 1.9 * size * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(x - 0.6 * size * s, y - h * 0.7, 1.0 * size * s, 0, Math.PI * 2); ctx.fill();
  },
  house(x, y, s, p) {
    const w = (p.w || 9) * s, h = (p.h || 7) * s, col = p.color || '#8a8f96';
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - w / 2, y - h, w * 0.12, h);
    ctx.fillStyle = p.roof || '#5a5f66'; ctx.fillRect(x - w / 2 - 0.2 * s, y - h - 0.5 * s, w + 0.4 * s, 0.55 * s);
    ctx.fillStyle = 'rgba(255,241,200,0.55)';
    const cols = Math.max(1, Math.round(w / (2.2 * s))), rows = Math.max(1, Math.round(h / (2.6 * s)));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { if (((i * 7 + j * 3 + (p.seed || 0)) % 5) === 0) continue; ctx.fillRect(x - w / 2 + (i + 0.3) * (w / cols), y - h + (j + 0.35) * (h / rows), (w / cols) * 0.4, (h / rows) * 0.45); }
  },
  lamp(x, y, s) {
    ctx.fillStyle = '#6b7178'; ctx.fillRect(x - 0.07 * s, y - 6 * s, 0.14 * s, 6 * s);
    ctx.fillRect(x - 0.07 * s, y - 6 * s, 0.9 * s, 0.12 * s);
    ctx.fillStyle = '#f3e4b0'; ctx.fillRect(x + 0.55 * s, y - 6.05 * s, 0.4 * s, 0.22 * s);
  },
  parkedCar(x, y, s, p) { car(x, y, s, { color: p.color || ['#d9d5cc', '#9aa3ab', '#3b4650', '#b8b0a2'][p.v || 0], rear: true }); },
  car(x, y, s, p) { car(x, y, s, p); },
  bus(x, y, s, p) { bus(x, y, s, p); },
  cyclist(x, y, s, p) { cyclist(x, y, s, p); },
  person(x, y, s, p) { person(x, y, s, p); },
  child(x, y, s, p) { person(x, y, s, { ...p, child: true }); },
  sign(x, y, s, p) { sign(x, y, s, p); },
  light(x, y, s, p) { trafficLight(x, y, s, p); },
};

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function car(x, y, s, p = {}) {
  const w = 1.75 * s, h = 1.45 * s, col = p.color || '#9aa3ab';
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.6, 0.12 * s + 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col; rr(x - w / 2, y - h, w, h, 0.18 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x - w / 2, y - h, w, h * 0.35, 0.18 * s); ctx.fill();
  ctx.fillStyle = '#1e2226'; rr(x - w * 0.38, y - h * 0.95, w * 0.76, h * 0.42, 0.1 * s); ctx.fill();
  if (p.oncoming) {
    ctx.fillStyle = '#fff3b0'; rr(x - w / 2 + 0.12 * s, y - h * 0.42, 0.32 * s, 0.16 * s, 0.04 * s); ctx.fill(); rr(x + w / 2 - 0.44 * s, y - h * 0.42, 0.32 * s, 0.16 * s, 0.04 * s); ctx.fill();
  } else {
    ctx.fillStyle = p.braking ? '#ff4538' : '#b8322b'; rr(x - w / 2 + 0.12 * s, y - h * 0.42, 0.3 * s, 0.15 * s, 0.04 * s); ctx.fill(); rr(x + w / 2 - 0.42 * s, y - h * 0.42, 0.3 * s, 0.15 * s, 0.04 * s); ctx.fill();
  }
  if (p.blinker) { ctx.fillStyle = '#f5b82e'; const bx = p.blinker === 'left' ? x - w / 2 : x + w / 2 - 0.2 * s; ctx.fillRect(bx, y - h * 0.5, 0.2 * s, 0.14 * s); }
}
function bus(x, y, s, p = {}) {
  const w = 2.5 * s, h = 3.1 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.6, 0.14 * s + 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c13a'; rr(x - w / 2, y - h, w, h, 0.15 * s); ctx.fill();
  ctx.fillStyle = '#1e2226'; rr(x - w * 0.42, y - h * 0.95, w * 0.84, h * 0.3, 0.08 * s); ctx.fill(); rr(x - w * 0.42, y - h * 0.58, w * 0.84, h * 0.22, 0.06 * s); ctx.fill();
  ctx.fillStyle = '#b8322b'; ctx.fillRect(x - w / 2 + 0.15 * s, y - 0.4 * s, 0.35 * s, 0.18 * s); ctx.fillRect(x + w / 2 - 0.5 * s, y - 0.4 * s, 0.35 * s, 0.18 * s);
  if (p.blinker) { ctx.fillStyle = '#f5b82e'; ctx.fillRect(x - w / 2, y - 0.7 * s, 0.3 * s, 0.2 * s); ctx.fillRect(x - w / 2, y - h + 0.2 * s, 0.3 * s, 0.2 * s); }
}
function cyclist(x, y, s, p = {}) {
  const h = 1.7 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 0.3 * s, 0.08 * s + 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2e33'; ctx.lineWidth = Math.max(1, 0.06 * s);
  ctx.beginPath(); ctx.arc(x, y - 0.33 * s, 0.33 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = p.color || '#2f7d9a'; rr(x - 0.22 * s, y - h + 0.42 * s, 0.44 * s, 0.7 * s, 0.12 * s); ctx.fill();
  ctx.fillStyle = '#e9c9a8'; ctx.beginPath(); ctx.arc(x, y - h + 0.22 * s, 0.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8322b'; ctx.beginPath(); ctx.arc(x, y - h + 0.16 * s, 0.21 * s, Math.PI, 0); ctx.fill();
}
function person(x, y, s, p = {}) {
  const kf = p.child ? 0.62 : 1, h = 1.75 * s * kf;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 0.25 * s * kf, 0.07 * s + 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b3f46'; rr(x - 0.17 * s * kf, y - h * 0.5, 0.34 * s * kf, h * 0.5, 0.06 * s); ctx.fill();
  ctx.fillStyle = p.color || (p.child ? '#f2a33a' : '#7a4f9e'); rr(x - 0.24 * s * kf, y - h + 0.3 * s * kf, 0.48 * s * kf, h * 0.42, 0.1 * s); ctx.fill();
  ctx.fillStyle = '#e9c9a8'; ctx.beginPath(); ctx.arc(x, y - h + 0.17 * s * kf, 0.17 * s * kf, 0, Math.PI * 2); ctx.fill();
}
function sign(x, y, s, p) {
  const r = 0.45 * s, top = y - 2.4 * s;
  ctx.fillStyle = '#6b7178'; ctx.fillRect(x - 0.05 * s, top, 0.1 * s, 2.4 * s);
  const F = 'Unbounded, Arial Black, sans-serif';
  switch (p.sign) {
    case 'stop':
      ctx.fillStyle = '#c8322b'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(x + r * Math.cos(a), top + r * Math.sin(a)); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${0.26 * s}px ${F}`; ctx.textAlign = 'center'; ctx.fillText('STOP', x, top + 0.1 * s); break;
    case 'vigepligt':
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c8322b'; ctx.lineWidth = 0.12 * s; ctx.beginPath(); ctx.moveTo(x - r, top - r * 0.8); ctx.lineTo(x + r, top - r * 0.8); ctx.lineTo(x, top + r); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'skole':
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c8322b'; ctx.lineWidth = 0.12 * s; ctx.beginPath(); ctx.moveTo(x, top - r); ctx.lineTo(x + r, top + r * 0.8); ctx.lineTo(x - r, top + r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - 0.1 * s, top, 0.09 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 0.12 * s, top + 0.06 * s, 0.07 * s, 0, 7); ctx.fill(); break;
    case 'fodgaenger':
      ctx.fillStyle = '#1d3a9e'; ctx.fillRect(x - r, top - r, 2 * r, 2 * r); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - r, top + r); ctx.lineTo(x + r, top + r); ctx.lineTo(x + r, top - r); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 0.08 * s, top - 0.18 * s, 0.08 * s, 0, 7); ctx.fill(); ctx.fillRect(x + 0.02 * s, top - 0.1 * s, 0.12 * s, 0.3 * s); break;
    case 'rundkoersel':
      ctx.fillStyle = '#1d3a9e'; ctx.beginPath(); ctx.arc(x, top, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.09 * s; ctx.setLineDash([0.22 * s, 0.14 * s]); ctx.beginPath(); ctx.arc(x, top, r * 0.55, 0, 7); ctx.stroke(); ctx.setLineDash([]); break;
    case 'cykelsti':
      ctx.fillStyle = '#1d3a9e'; ctx.beginPath(); ctx.arc(x, top, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.06 * s; ctx.beginPath(); ctx.arc(x - 0.15 * s, top + 0.1 * s, 0.14 * s, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 0.17 * s, top + 0.1 * s, 0.14 * s, 0, 7); ctx.stroke(); break;
    case 'busstop':
      ctx.fillStyle = '#1d3a9e'; rr(x - r, top - r, 2 * r, 2 * r, 0.06 * s); ctx.fill(); ctx.fillStyle = '#fff'; rr(x - r * 0.6, top - r * 0.5, r * 1.2, r * 0.9, 0.05 * s); ctx.fill(); break;
    case 'byzone': case 'byzoneSlut':
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 0.04 * s; ctx.fillRect(x - r * 1.3, top - r * 0.7, r * 2.6, r * 1.4); ctx.strokeRect(x - r * 1.3, top - r * 0.7, r * 2.6, r * 1.4);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 0.05 * s; ctx.beginPath(); ctx.moveTo(x - r * 0.9, top + r * 0.4); ctx.lineTo(x - r * 0.4, top + r * 0.4); ctx.lineTo(x - r * 0.4, top - r * 0.2); ctx.lineTo(x - r * 0.1, top - r * 0.2); ctx.lineTo(x - r * 0.1, top - r * 0.5); ctx.lineTo(x + r * 0.2, top - r * 0.5); ctx.lineTo(x + r * 0.2, top + r * 0.4); ctx.lineTo(x + r * 0.9, top + r * 0.4); ctx.stroke();
      if (p.sign === 'byzoneSlut') { ctx.strokeStyle = '#c8322b'; ctx.lineWidth = 0.1 * s; ctx.beginPath(); ctx.moveTo(x - r * 1.2, top + r * 0.6); ctx.lineTo(x + r * 1.2, top - r * 0.6); ctx.stroke(); }
      break;
    default: {
      const n = String(p.sign).replace('speed', '');
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c8322b'; ctx.lineWidth = 0.12 * s; ctx.beginPath(); ctx.arc(x, top, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = `700 ${0.42 * s}px ${F}`; ctx.textAlign = 'center'; ctx.fillText(n, x, top + 0.15 * s);
    }
  }
}
function trafficLight(x, y, s, p) {
  const top = y - 3.2 * s, w = 0.5 * s, h = 1.3 * s;
  ctx.fillStyle = '#6b7178'; ctx.fillRect(x - 0.06 * s, top, 0.12 * s, 3.2 * s);
  ctx.fillStyle = '#1e2226'; rr(x - w / 2, top - h, w, h, 0.1 * s); ctx.fill();
  const st = p.state || 'green';
  const dot = (c, oy, on) => { ctx.fillStyle = c; ctx.globalAlpha = on ? 1 : 0.18; ctx.beginPath(); ctx.arc(x, top - h + oy, 0.16 * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; };
  dot('#e53b2f', 0.25 * s, st === 'red' || st === 'redyellow'); dot('#f2b233', 0.65 * s, st === 'yellow' || st === 'redyellow'); dot('#3cb55a', 1.05 * s, st === 'green');
}


  return { S, car, bus, cyclist, person, sign, trafficLight };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW.W * dpr; canvas.height = VIEW.H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const W = VIEW.W, H = VIEW.H, cx = W / 2, hy = H * HORIZON, k = W / 2;
  const { S, car, bus, cyclist } = makeSprites(ctx);
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // projektion: afstand dz (m), lateral verden-x (m) -> skærm
  const project = (worldX, dz) => {
    const scale = DEPTH / Math.max(0.2, dz);
    return { x: cx + scale * worldX * k, y: hy + scale * CAM_H * k, s: scale * k, scale };
  };

  function sky(env, t) {
    const e = ENV[env];
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, e.sky0); g.addColorStop(1, e.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 2);
    // lette skyer
    for (let i = 0; i < 4; i++) {
      const x = ((i * 191 + t * 3) % (W + 300)) - 150, y = 36 + (i * 41) % 80;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, 150); cg.addColorStop(0, 'rgba(255,255,255,0.16)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, y, 150, 28, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function skyline(env, shift) {
    const e = ENV[env];
    ctx.fillStyle = e.skyline;
    if (env === 'by') {
      // husrække, gentaget
      const base = -((shift * 0.5) % 160);
      for (let x = base - 160; x < W + 160; x += 160) {
        const hs = [[0, 34, 40], [34, 22, 58], [56, 40, 46], [96, 26, 66], [122, 38, 50]];
        for (const [ox, w, h] of hs) ctx.fillRect(x + ox, hy - h, w, h + 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = base - 160; x < W + 160; x += 160) for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * 24, hy - 30 + (i % 3) * 9, 6, 6);
    } else {
      const base = -((shift * 0.35) % 240);
      for (let x = base - 240; x < W + 240; x += 240) {
        ctx.beginPath(); ctx.moveTo(x, hy + 2); ctx.quadraticCurveTo(x + 60, hy - 26, x + 120, hy - 10); ctx.quadraticCurveTo(x + 180, hy - 34, x + 240, hy + 2); ctx.fill();
        for (let i = 0; i < 7; i++) { const tx = x + 15 + i * 34; ctx.beginPath(); ctx.arc(tx, hy - 8 - (i % 2) * 5, 7, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  // ---------- hovedtegning ----------
  function draw(game) {
    const { route, player, actors, t } = game;
    const baseIdx = Math.floor(player.z / SEG);
    const baseSeg = route.segs[Math.min(baseIdx, route.segs.length - 1)];
    const env = baseSeg.env;
    const e = ENV[env];
    ctx.clearRect(0, 0, W, H);
    sky(env, t);
    skyline(env, game.bgShift);

    // segmenter: beregn projektion fra nær til fjern
    const pts = [];
    let xOff = 0, dx = -game.curveAtPlayer * (player.z % SEG) / SEG; // start lidt "inde" i segmentet
    const camX = player.x * HALF_ROAD;
    const frac = (player.z % SEG);
    for (let n = 0; n <= DRAW; n++) {
      const idx = baseIdx + n;
      const seg = route.segs[Math.min(idx, route.segs.length - 1)];
      const dz = n * SEG - frac;                       // nær kant af segment n
      const p = project(xOff - camX, Math.max(0.4, dz));
      pts.push({ p, seg, idx, xOff, dz: Math.max(0.4, dz) });
      dx += seg.curve * 0.055 * SEG;
      xOff += dx;
    }
    // jord
    ctx.fillStyle = e.grass; ctx.fillRect(0, hy, W, H - hy);
    // tegn fjern -> nær
    for (let n = pts.length - 2; n >= 0; n--) {
      const a = pts[n], b = pts[n + 1];
      if (b.p.y < hy) continue;
      const fog = Math.min(1, Math.max(0, (n - DRAW * 0.45) / (DRAW * 0.55)));
      const alt = (a.idx % 2) === 0;
      const y1 = a.p.y, y2 = b.p.y, h = Math.max(1, y1 - y2 + 0.5);
      // græs/fortov striber
      ctx.fillStyle = alt ? e.grass : e.grass2; ctx.fillRect(0, y2, W, h);
      // vejens kanter
      const l1 = a.p.x - a.p.s * HALF_ROAD, r1 = a.p.x + a.p.s * HALF_ROAD;
      const l2 = b.p.x - b.p.s * HALF_ROAD, r2 = b.p.x + b.p.s * HALF_ROAD;
      // fortov / rabat
      const swW = env === 'by' ? 2.4 : 1.3;
      ctx.fillStyle = alt ? e.sidewalk : e.sidewalk2;
      quad(l1 - a.p.s * swW, y1, l1, y1, l2, y2, l2 - b.p.s * swW, y2);
      quad(r1, y1, r1 + a.p.s * swW, y1, r2 + b.p.s * swW, y2, r2, y2);
      // cykelsti
      if (a.seg.cyclePath) {
        ctx.fillStyle = alt ? '#3a3f45' : '#363b41';
        quad(r1, y1, r1 + a.p.s * 1.3, y1, r2 + b.p.s * 1.3, y2, r2, y2);
        ctx.fillStyle = '#d8dce0'; quad(r1 + a.p.s * 1.25, y1, r1 + a.p.s * 1.32, y1, r2 + b.p.s * 1.32, y2, r2 + b.p.s * 1.25, y2);
      }
      // asfalt
      ctx.fillStyle = alt ? '#2a2e33' : '#2d3136';
      quad(l1, y1, r1, y1, r2, y2, l2, y2);
      // kantlinjer
      ctx.fillStyle = 'rgba(240,242,244,0.85)';
      quad(l1, y1, l1 + a.p.s * 0.12, y1, l2 + b.p.s * 0.12, y2, l2, y2);
      quad(r1 - a.p.s * 0.12, y1, r1, y1, r2, y2, r2 - b.p.s * 0.12, y2);
      // midterstribe (stiplet, 1 af 3 segmenter)
      if (a.seg.centerSolid || (a.idx % 3) === 0) {
        ctx.fillStyle = 'rgba(240,242,244,0.9)';
        quad(a.p.x - a.p.s * 0.07, y1, a.p.x + a.p.s * 0.07, y1, b.p.x + b.p.s * 0.07, y2, b.p.x - b.p.s * 0.07, y2);
      }
      // særlig afmærkning
      if (a.seg.mark === 'stopline') { ctx.fillStyle = '#f0f2f4'; quad(a.p.x, y1, r1, y1, r2, y2 + h * 0.5, b.p.x, y2 + h * 0.5); }
      if (a.seg.mark === 'shark') { ctx.fillStyle = '#f0f2f4'; const n5 = 5, w = (r1 - a.p.x) / n5, th = Math.min(h * 1.6, a.p.s * 0.6); for (let i = 0; i < n5; i++) { ctx.beginPath(); ctx.moveTo(a.p.x + i * w, y1); ctx.lineTo(a.p.x + (i + 1) * w, y1); ctx.lineTo(a.p.x + (i + 0.5) * w, y1 - th); ctx.closePath(); ctx.fill(); } }
      if (a.seg.mark === 'zebra') { ctx.fillStyle = '#f0f2f4'; const n7 = 7, w = (r1 - l1) / n7; for (let i = 0; i < n7; i++) { if (i % 2) continue; quad(l1 + i * w + w * 0.1, y1, l1 + (i + 1) * w - w * 0.1, y1, l2 + (i + 1) * ((r2 - l2) / n7) - w * 0.1, y2, l2 + i * ((r2 - l2) / n7) + w * 0.1, y2); } }
      if (a.seg.mark === 'cross') { ctx.fillStyle = alt ? '#2a2e33' : '#2d3136'; ctx.fillRect(0, y2, W, h); }
      if (a.seg.mark === 'island') { ctx.fillStyle = alt ? '#2a2e33' : '#2d3136'; ctx.fillRect(0, y2, W, h); }
      if (a.seg.mark === 'islandCenter') { ctx.fillStyle = alt ? '#2a2e33' : '#2d3136'; ctx.fillRect(0, y2, W, h); const ry = Math.max(2, (a.p.y - b.p.y) * 2.6); ctx.fillStyle = '#f0f2f4'; ctx.beginPath(); ctx.ellipse(a.p.x - a.p.s * 2.4, y2, a.p.s * 2.3, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4e8a3e'; ctx.beginPath(); ctx.ellipse(a.p.x - a.p.s * 2.4, y2, a.p.s * 2.0, ry * 0.85, 0, 0, Math.PI * 2); ctx.fill(); }
      if (fog > 0) { ctx.fillStyle = e.fog; ctx.globalAlpha = fog * 0.85; ctx.fillRect(0, y2, W, h); ctx.globalAlpha = 1; }
    }

    // sprites + aktører, fjern -> nær
    const drawables = [];
    for (let n = 0; n < pts.length; n++) {
      const a = pts[n];
      for (const sp of a.seg.sprites) drawables.push({ z: a.dz, x: a.xOff + sp.x * HALF_ROAD, p: a.p, type: sp.type, props: { ...sp, env } });
    }
    for (const ac of actors) {
      if (ac.hidden) continue;
      const dzRaw = ac.z - player.z;
      if (dzRaw < -2 || dzRaw > DRAW * SEG) continue;
      const n = Math.max(0, Math.floor((dzRaw + frac) / SEG));
      const a = pts[Math.min(n, pts.length - 1)];
      const p = project(a.xOff - camX + 0, Math.max(0.6, dzRaw + 0.5));
      drawables.push({ z: dzRaw, x: a.xOff + ac.x * HALF_ROAD, p, type: ac.type, props: ac, actor: true });
    }
    drawables.sort((a, b) => b.z - a.z);
    for (const d of drawables) {
      if (d.z < 0.3) continue;
      const pr = project(d.x - camX, Math.max(0.6, d.z + 0.5));
      if (pr.y < hy - 2) continue;
      const fog = Math.min(1, Math.max(0, (d.z / SEG - DRAW * 0.45) / (DRAW * 0.55)));
      ctx.globalAlpha = 1 - fog * 0.8;
      const fn = S[d.type]; if (fn) fn(pr.x, pr.y, pr.s, d.props);
      ctx.globalAlpha = 1;
    }

    // forrude-tone øverst
    const wt = ctx.createLinearGradient(0, 0, 0, 70); wt.addColorStop(0, 'rgba(10,12,16,0.55)'); wt.addColorStop(1, 'rgba(10,12,16,0)');
    ctx.fillStyle = wt; ctx.fillRect(0, 0, W, 70);
    // motorhjelm
    ctx.fillStyle = '#1e2226';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 46); ctx.quadraticCurveTo(cx, H - 78, W, H - 46); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(0, H - 46); ctx.quadraticCurveTo(cx, H - 78, W, H - 46); ctx.lineTo(W, H - 40); ctx.quadraticCurveTo(cx, H - 70, 0, H - 40); ctx.closePath(); ctx.fill();
    // vignet
    const vg = ctx.createRadialGradient(cx, H * 0.5, H * 0.35, cx, H * 0.5, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    mirrors(game);
  }

  function quad(x1, y1, x2, y2, x3, y3, x4, y4) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }

  // ---------- spejle ----------
  function mirrorFrame(x, y, w, h, glow) {
    ctx.fillStyle = '#17191c'; rr(x - 3, y - 3, w + 6, h + 6, 9); ctx.fill();
    if (glow) { ctx.strokeStyle = `rgba(245,184,46,${glow})`; ctx.lineWidth = 3; rr(x - 3, y - 3, w + 6, h + 6, 9); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#aebfcf'); g.addColorStop(1, '#8fa3b5');
    ctx.fillStyle = g; rr(x, y, w, h, 6); ctx.fill();
  }
  function mirrors(game) {
    const { player, actors } = game;
    const glow = id => Math.max(0, 1 - (game.t - (game.looks[id] || -9)) / 0.6);
    // bakspejl
    const mw = 150, mh = 40, mx = cx - mw / 2, my = 10;
    mirrorFrame(mx, my, mw, mh, glow('rear'));
    ctx.save(); rr(mx, my, mw, mh, 6); ctx.clip();
    ctx.fillStyle = '#2a2e33'; ctx.fillRect(mx, my + mh * 0.55, mw, mh);
    for (const ac of actors) {
      const back = player.z - ac.z;
      if (ac.type !== 'car' || back < 2 || back > 60 || Math.abs(ac.x - player.x) > 0.5) continue;
      const s = 22 * (6 / Math.max(6, back)); car(cx, my + mh * 0.95, s, { color: ac.color, oncoming: true });
    }
    ctx.restore();
    // sidespejle
    const sw = 78, sh = 44, sy = H - 66;
    for (const side of ['left', 'right']) {
      const sx = side === 'left' ? 12 : W - sw - 12;
      mirrorFrame(sx, sy, sw, sh, glow(side));
      ctx.save(); rr(sx, sy, sw, sh, 6); ctx.clip();
      ctx.fillStyle = '#2a2e33'; ctx.fillRect(sx, sy + sh * 0.55, sw, sh);
      ctx.fillStyle = '#1e2226'; ctx.fillRect(side === 'left' ? sx + sw - 10 : sx, sy, 10, sh);   // bilens egen side
      for (const ac of actors) {
        const back = player.z - ac.z;
        if (back < -3 || back > 45) continue;
        const lateral = ac.x - player.x;
        const inSide = side === 'right' ? lateral > 0.35 : lateral < -0.35;
        if (!inSide) continue;
        const s = 20 * (5 / Math.max(5, back + 3));
        const px = side === 'left' ? sx + sw * 0.45 : sx + sw * 0.55;
        if (ac.type === 'cyclist') cyclist(px, sy + sh * 0.98, s, ac);
        else if (ac.type === 'car') car(px, sy + sh * 0.98, s, { ...ac, oncoming: !ac.oncoming });
        else if (ac.type === 'bus') bus(px, sy + sh * 0.98, s * 0.7, ac);
      }
      ctx.restore();
    }
  }

  // ---------- skulderblik: lille kig ud ad sideruden ----------
  function drawShoulder(c2, side, game) {
    const g = c2.getContext('2d'), w = c2.width, h = c2.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky2 = g.createLinearGradient(0, 0, 0, h); sky2.addColorStop(0, '#9fb3c6'); sky2.addColorStop(1, '#d8dfe6');
    g.fillStyle = sky2; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5d6670'; g.fillRect(0, h * 0.62, w, h);
    g.fillStyle = '#2a2e33'; g.fillRect(0, h * 0.7, w, h);
    const sub = makeSprites(g);
    let seen = null;
    for (const ac of game.actors) {
      if (ac.hidden) continue;
      const back = game.player.z - ac.z, lateral = ac.x - game.player.x;
      const inSide = side === 'right' ? lateral > 0.3 : lateral < -0.3;
      if (!inSide || back < -6 || back > 14) continue;
      seen = ac;
      const s = 34 * (6 / Math.max(6, back + 4));
      const px = w * 0.5 + (side === 'right' ? -1 : 1) * back * 4;
      if (ac.type === 'cyclist') sub.cyclist(px, h * 0.92, s, ac);
      else if (ac.type === 'car') sub.car(px, h * 0.92, s, { ...ac, oncoming: !ac.oncoming });
      else if (ac.type === 'bus') sub.bus(px, h * 0.92, s * 0.7, ac);
    }
    // vinduesramme
    g.fillStyle = '#17191c'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    return seen;
  }

  return { draw, drawShoulder, resize, ctx };
}
