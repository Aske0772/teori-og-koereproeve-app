// Stiliseret forrude-scene i SVG. Ingen 3D-motor — kun geometri der ligner.
// Dybde d: 0 = lige foran bilen, 1 = horisont.

const W = 400, H = 250, HORIZON = 112;

const yAt = d => HORIZON + (H - HORIZON) * Math.pow(1 - d, 1.7);
const scaleAt = d => 0.08 + 0.92 * Math.pow(1 - d, 1.5);
// vejkanter
const xl = d => 34 + (183 - 34) * d;
const xr = d => 366 - (366 - 217) * d;
const roadW = d => xr(d) - xl(d);

export const laneX = (lane, d) => {
  const w = roadW(d);
  switch (lane) {
    case 'own': return xr(d) - w * 0.26;
    case 'oncoming': return xl(d) + w * 0.26;
    case 'cycleR': return xr(d) + w * 0.08;
    case 'cycleL': return xl(d) - w * 0.08;
    case 'sidewalkR': return xr(d) + w * 0.19;
    case 'sidewalkL': return xl(d) - w * 0.19;
    case 'center': return (xl(d) + xr(d)) / 2;
    case 'edgeR': return xr(d) - w * 0.06;
    default: return laneX('own', d);
  }
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- objekter ---------- */

function car(x, y, s, o) {
  const w = 70 * s, h = 46 * s, r = 7 * s;
  const color = o.color || '#9AA3AB';
  const lights = o.oncoming
    ? `<rect x="${x - w / 2 + 5 * s}" y="${y - h * 0.45}" width="${14 * s}" height="${8 * s}" rx="${2 * s}" fill="#FFF3B0"/>
       <rect x="${x + w / 2 - 19 * s}" y="${y - h * 0.45}" width="${14 * s}" height="${8 * s}" rx="${2 * s}" fill="#FFF3B0"/>`
    : `<rect x="${x - w / 2 + 5 * s}" y="${y - h * 0.45}" width="${12 * s}" height="${7 * s}" rx="${2 * s}" fill="${o.braking ? '#FF3B2F' : '#C8322B'}"/>
       <rect x="${x + w / 2 - 17 * s}" y="${y - h * 0.45}" width="${12 * s}" height="${7 * s}" rx="${2 * s}" fill="${o.braking ? '#FF3B2F' : '#C8322B'}"/>`;
  const blink = o.blinker ? `<rect x="${o.blinker === 'left' ? x - w / 2 : x + w / 2 - 8 * s}" y="${y - h * 0.5}" width="${8 * s}" height="${6 * s}" fill="#FFB400"/>` : '';
  return `<g>
    <rect x="${x - w / 2 - 3 * s}" y="${y - 4 * s}" width="${w + 6 * s}" height="${6 * s}" rx="${2 * s}" fill="#1a1d20" opacity=".5"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${r}" fill="${color}"/>
    <rect x="${x - w * 0.36}" y="${y - h + 5 * s}" width="${w * 0.72}" height="${h * 0.42}" rx="${4 * s}" fill="#2A2E33" opacity=".85"/>
    ${lights}${blink}
  </g>`;
}

function bus(x, y, s) {
  const w = 86 * s, h = 90 * s;
  return `<g>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${6 * s}" fill="#E8C13A"/>
    <rect x="${x - w * 0.4}" y="${y - h + 6 * s}" width="${w * 0.8}" height="${h * 0.3}" rx="${3 * s}" fill="#2A2E33" opacity=".85"/>
    <rect x="${x - w * 0.4}" y="${y - h * 0.55}" width="${w * 0.8}" height="${h * 0.22}" rx="${3 * s}" fill="#2A2E33" opacity=".6"/>
    <rect x="${x - w / 2 + 6 * s}" y="${y - 14 * s}" width="${12 * s}" height="${7 * s}" fill="#C8322B"/>
    <rect x="${x + w / 2 - 18 * s}" y="${y - 14 * s}" width="${12 * s}" height="${7 * s}" fill="#C8322B"/>
  </g>`;
}

function cyclist(x, y, s, o) {
  const h = 56 * s, dir = o.facing === 'left' ? -1 : 1;
  return `<g>
    <ellipse cx="${x}" cy="${y}" rx="${10 * s}" ry="${3 * s}" fill="#1a1d20" opacity=".4"/>
    <circle cx="${x}" cy="${y - 11 * s}" r="${11 * s}" fill="none" stroke="#2A2E33" stroke-width="${3 * s}"/>
    <path d="M${x} ${y - 20 * s} L${x + 4 * s * dir} ${y - 34 * s}" stroke="#2A2E33" stroke-width="${3 * s}"/>
    <rect x="${x - 8 * s}" y="${y - h + 14 * s}" width="${16 * s}" height="${24 * s}" rx="${5 * s}" fill="${o.color || '#2F7D9A'}"/>
    <circle cx="${x}" cy="${y - h + 8 * s}" r="${7 * s}" fill="#E9C9A8"/>
    <path d="M${x - 7 * s} ${y - h + 6 * s} a7 7 0 0 1 ${14 * s} 0" fill="#C8322B" transform="scale(1)"/>
  </g>`;
}

function person(x, y, s, o) {
  const k = o.child ? 0.62 : 1, h = 52 * s * k;
  return `<g>
    <ellipse cx="${x}" cy="${y}" rx="${8 * s * k}" ry="${2.5 * s}" fill="#1a1d20" opacity=".4"/>
    <rect x="${x - 7 * s * k}" y="${y - h * 0.55}" width="${14 * s * k}" height="${h * 0.55}" rx="${3 * s}" fill="#3B3F46"/>
    <rect x="${x - 9 * s * k}" y="${y - h + 10 * s * k}" width="${18 * s * k}" height="${h * 0.42}" rx="${5 * s}" fill="${o.color || (o.child ? '#F2A33A' : '#7A4F9E')}"/>
    <circle cx="${x}" cy="${y - h + 6 * s * k}" r="${7 * s * k}" fill="#E9C9A8"/>
    ${o.child ? `<circle cx="${x + 11 * s * k}" cy="${y - 6 * s}" r="${6 * s * k}" fill="#C8322B"/>` : ''}
  </g>`;
}

function sign(x, y, s, o) {
  const poleH = 70 * s, r = 16 * s;
  const top = y - poleH;
  let face = '';
  switch (o.sign) {
    case 'speed30': case 'speed40': case 'speed50': case 'speed60': case 'speed70': case 'speed80': {
      const n = o.sign.replace('speed', '');
      face = `<circle cx="${x}" cy="${top}" r="${r}" fill="#fff" stroke="#C8322B" stroke-width="${4 * s}"/>
        <text x="${x}" y="${top + 6 * s}" font-size="${17 * s}" font-weight="700" text-anchor="middle" fill="#111" font-family="Barlow Condensed, Arial Narrow, sans-serif">${n}</text>`;
      break;
    }
    case 'vigepligt':
      face = `<path d="M${x - r} ${top - r * 0.8} L${x + r} ${top - r * 0.8} L${x} ${top + r} Z" fill="#fff" stroke="#C8322B" stroke-width="${4 * s}" stroke-linejoin="round"/>`;
      break;
    case 'stop':
      face = `<polygon points="${oct(x, top, r)}" fill="#C8322B" stroke="#fff" stroke-width="${1.5 * s}"/>
        <text x="${x}" y="${top + 4 * s}" font-size="${9 * s}" font-weight="700" text-anchor="middle" fill="#fff" font-family="Barlow Condensed, sans-serif">STOP</text>`;
      break;
    case 'fodgaenger':
      face = `<rect x="${x - r}" y="${top - r}" width="${2 * r}" height="${2 * r}" fill="#1D3A9E"/>
        <polygon points="${x - r},${top + r} ${x + r},${top + r} ${x + r},${top - r}" fill="#fff" opacity=".9"/>
        <circle cx="${x + 3 * s}" cy="${top - 7 * s}" r="${3 * s}" fill="#111"/>
        <path d="M${x + 3 * s} ${top - 4 * s} l-3 ${8 * s} m3 ${-8 * s} l4 ${8 * s}" stroke="#111" stroke-width="${2 * s}"/>`;
      break;
    case 'rundkoersel':
      face = `<circle cx="${x}" cy="${top}" r="${r}" fill="#1D3A9E"/>
        <circle cx="${x}" cy="${top}" r="${r * 0.55}" fill="none" stroke="#fff" stroke-width="${3 * s}" stroke-dasharray="${8 * s} ${5 * s}"/>`;
      break;
    case 'cykelsti':
      face = `<circle cx="${x}" cy="${top}" r="${r}" fill="#1D3A9E"/>
        <circle cx="${x - 5 * s}" cy="${top + 4 * s}" r="${5 * s}" fill="none" stroke="#fff" stroke-width="${2 * s}"/>
        <circle cx="${x + 6 * s}" cy="${top + 4 * s}" r="${5 * s}" fill="none" stroke="#fff" stroke-width="${2 * s}"/>
        <path d="M${x - 5 * s} ${top + 4 * s} L${x} ${top - 5 * s} L${x + 6 * s} ${top + 4 * s}" fill="none" stroke="#fff" stroke-width="${2 * s}"/>`;
      break;
    case 'skole':
      face = `<path d="M${x} ${top - r} L${x + r} ${top + r * 0.8} L${x - r} ${top + r * 0.8} Z" fill="#fff" stroke="#C8322B" stroke-width="${4 * s}" stroke-linejoin="round"/>
        <circle cx="${x - 3 * s}" cy="${top - 2 * s}" r="${3 * s}" fill="#111"/><circle cx="${x + 4 * s}" cy="${top}" r="${2.3 * s}" fill="#111"/>`;
      break;
    case 'byzone':
      face = `<rect x="${x - r * 1.3}" y="${top - r * 0.7}" width="${r * 2.6}" height="${r * 1.4}" fill="#fff" stroke="#111" stroke-width="${1.5 * s}"/>
        <path d="M${x - r * 0.9} ${top + r * 0.4} h${r * 0.5} v-${r * 0.6} h${r * 0.3} v-${r * 0.3} h${r * 0.3} v${r * 0.9} h${r * 0.7}" fill="none" stroke="#111" stroke-width="${1.6 * s}"/>`;
      break;
    case 'byzoneSlut':
      face = `<rect x="${x - r * 1.3}" y="${top - r * 0.7}" width="${r * 2.6}" height="${r * 1.4}" fill="#fff" stroke="#111" stroke-width="${1.5 * s}"/>
        <path d="M${x - r * 0.9} ${top + r * 0.4} h${r * 0.5} v-${r * 0.6} h${r * 0.3} v-${r * 0.3} h${r * 0.3} v${r * 0.9} h${r * 0.7}" fill="none" stroke="#111" stroke-width="${1.6 * s}"/>
        <path d="M${x - r * 1.2} ${top + r * 0.6} L${x + r * 1.2} ${top - r * 0.6}" stroke="#C8322B" stroke-width="${3 * s}"/>`;
      break;
    case 'hovedvej':
      face = `<rect x="${x - r * 0.9}" y="${top - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" transform="rotate(45 ${x} ${top})" fill="#fff" stroke="#111" stroke-width="${1.2 * s}"/>
        <rect x="${x - r * 0.5}" y="${top - r * 0.5}" width="${r}" height="${r}" transform="rotate(45 ${x} ${top})" fill="#E8C13A"/>`;
      break;
    case 'busstop':
      face = `<rect x="${x - r}" y="${top - r}" width="${2 * r}" height="${2 * r}" rx="${2 * s}" fill="#1D3A9E"/>
        <rect x="${x - r * 0.6}" y="${top - r * 0.5}" width="${r * 1.2}" height="${r * 0.9}" rx="${2 * s}" fill="#fff"/>`;
      break;
    default:
      face = `<circle cx="${x}" cy="${top}" r="${r}" fill="#fff" stroke="#111" stroke-width="${2 * s}"/>`;
  }
  return `<g><rect x="${x - 1.5 * s}" y="${top}" width="${3 * s}" height="${poleH}" fill="#5c6166"/>${face}</g>`;
}
function oct(cx, cy, r) {
  return Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
}

function trafficLight(x, y, s, o) {
  const poleH = 80 * s, top = y - poleH, w = 16 * s, h = 42 * s;
  const on = c => (o.state === c ? 1 : 0.18);
  return `<g>
    <rect x="${x - 1.5 * s}" y="${top}" width="${3 * s}" height="${poleH}" fill="#5c6166"/>
    <rect x="${x - w / 2}" y="${top - h}" width="${w}" height="${h}" rx="${4 * s}" fill="#2A2E33"/>
    <circle cx="${x}" cy="${top - h + 8 * s}" r="${5 * s}" fill="#E53B2F" opacity="${on('red')}"/>
    <circle cx="${x}" cy="${top - h / 2}" r="${5 * s}" fill="#F2B233" opacity="${on('yellow')}"/>
    <circle cx="${x}" cy="${top - 8 * s}" r="${5 * s}" fill="#3CB55A" opacity="${on('green')}"/>
  </g>`;
}

function ball(x, y, s) {
  return `<circle cx="${x}" cy="${y - 6 * s}" r="${7 * s}" fill="#C8322B" stroke="#fff" stroke-width="${1.5 * s}"/>`;
}

function parkedDoor(x, y, s) {
  // åben bildør mod kørebanen (vist som parkeret bil set skråt bagfra)
  return `${car(x, y, s, { color: '#D9D5CC' })}
    <path d="M${x - 35 * s} ${y - 40 * s} l-${26 * s} ${8 * s} l0 ${26 * s} l${26 * s} ${-2 * s} Z" fill="#D9D5CC" stroke="#2A2E33" stroke-width="${1.5 * s}"/>`;
}

const DRAW = { car, bus, cyclist, person, sign, trafficLight, ball, parkedDoor };

/* ---------- vej og omgivelser ---------- */

function roadLayer(scene) {
  const parts = [];
  // sidevej (kryds) som gråt bånd på tværs
  if (scene.junction) {
    const d0 = scene.junction.d ?? 0.45, d1 = Math.min(1, d0 + 0.12);
    const y0 = yAt(d0), y1 = yAt(d1);
    const side = scene.junction.side || 'both';
    if (side !== 'right') parts.push(`<polygon points="0,${y0} ${xl(d0)},${y0} ${xl(d1)},${y1} 0,${y1}" fill="#2A2E33"/>`);
    if (side !== 'left') parts.push(`<polygon points="${W},${y0} ${xr(d0)},${y0} ${xr(d1)},${y1} ${W},${y1}" fill="#2A2E33"/>`);
    if (scene.junction.stopLine || scene.junction.sharkTeeth) {
      const d = d0 - 0.02, y = yAt(d);
      if (scene.junction.stopLine) parts.push(`<line x1="${laneX('center', d)}" y1="${y}" x2="${xr(d)}" y2="${y}" stroke="#fff" stroke-width="3"/>`);
      if (scene.junction.sharkTeeth) {
        const x0 = laneX('center', d), x1 = xr(d), n = 5, w = (x1 - x0) / n;
        for (let i = 0; i < n; i++) parts.push(`<polygon points="${x0 + i * w},${y} ${x0 + (i + 1) * w},${y} ${x0 + (i + 0.5) * w},${y - 6}" fill="#fff"/>`);
      }
    }
  }
  // fodgængerfelt
  if (scene.zebra != null) {
    const d = scene.zebra, y0 = yAt(d), y1 = yAt(Math.min(1, d + 0.06));
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t0 = i / n + 0.05, t1 = (i + 1) / n - 0.05;
      const ax = xl(d) + roadW(d) * t0, bx = xl(d) + roadW(d) * t1;
      const cx = xl(d + 0.06) + roadW(d + 0.06) * t1, dx = xl(d + 0.06) + roadW(d + 0.06) * t0;
      parts.push(`<polygon points="${ax},${y0} ${bx},${y0} ${cx},${y1} ${dx},${y1}" fill="#fff" opacity=".95"/>`);
    }
  }
  // rundkørsel: central ø
  if (scene.roundabout) {
    const d = scene.roundabout.d ?? 0.5, y = yAt(d), r = 60 * scaleAt(d);
    parts.push(`<ellipse cx="${laneX('center', d)}" cy="${y - r * 0.15}" rx="${r * 1.9}" ry="${r * 0.5}" fill="#2A2E33"/>`);
    parts.push(`<ellipse cx="${laneX('center', d)}" cy="${y - r * 0.2}" rx="${r}" ry="${r * 0.28}" fill="#4E8A3E" stroke="#fff" stroke-width="2"/>`);
    const dd = d - 0.05, yy = yAt(dd), x0 = laneX('center', dd), x1 = xr(dd), n = 5, w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) parts.push(`<polygon points="${x0 + i * w},${yy} ${x0 + (i + 1) * w},${yy} ${x0 + (i + 0.5) * w},${yy - 6}" fill="#fff"/>`);
  }
  return parts.join('');
}

function markings(scene) {
  const parts = [];
  // midterstribe, stiplet
  const solid = scene.centerLine === 'solid';
  let d = 0.02;
  while (d < 0.98) {
    const len = 0.045 * (1 - d) + 0.01;
    const y0 = yAt(d), y1 = yAt(Math.min(0.99, d + len));
    const x0 = laneX('center', d), x1 = laneX('center', d + len);
    parts.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#fff" stroke-width="${Math.max(0.6, 3 * scaleAt(d))}"/>`);
    d += solid ? len : len * 2.2;
  }
  // kantlinjer
  parts.push(`<line x1="${xl(0)}" y1="${yAt(0)}" x2="${xl(1)}" y2="${yAt(1)}" stroke="#fff" stroke-width="1.5" opacity=".8"/>`);
  parts.push(`<line x1="${xr(0)}" y1="${yAt(0)}" x2="${xr(1)}" y2="${yAt(1)}" stroke="#fff" stroke-width="1.5" opacity=".8"/>`);
  return parts.join('');
}

function surroundings(scene) {
  const env = scene.env || 'by';
  const skyTop = scene.dusk ? '#4D5B74' : '#BFD4E6';
  const skyBot = scene.dusk ? '#9C8A8A' : '#E6EEF5';
  const grass = env === 'land' ? '#5E9148' : '#7F8C8D';
  const parts = [`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient></defs>`,
    `<rect width="${W}" height="${HORIZON}" fill="url(#sky)"/>`,
    `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="${grass}"/>`];
  if (env === 'by') {
    // husrække i horisonten
    const hs = [[0, 60, 40], [60, 35, 55], [95, 50, 48], [145, 30, 62], [255, 40, 58], [295, 55, 44], [350, 50, 60]];
    for (const [x, w, h] of hs) parts.push(`<rect x="${x}" y="${HORIZON - h}" width="${w}" height="${h}" fill="${scene.dusk ? '#3A3F48' : '#C9C3B9'}"/>`);
    // fortove
    parts.push(`<polygon points="0,${H} ${xl(0)},${H} ${xl(0.9)},${yAt(0.9)} 0,${yAt(0.9)}" fill="#B9B5AD"/>`);
    parts.push(`<polygon points="${W},${H} ${xr(0)},${H} ${xr(0.9)},${yAt(0.9)} ${W},${yAt(0.9)}" fill="#B9B5AD"/>`);
  } else {
    // træer
    for (const [d, side] of [[0.3, -1], [0.55, 1], [0.75, -1], [0.85, 1]]) {
      const s = scaleAt(d), x = side < 0 ? xl(d) - 40 * s : xr(d) + 40 * s, y = yAt(d);
      parts.push(`<rect x="${x - 3 * s}" y="${y - 40 * s}" width="${6 * s}" height="${40 * s}" fill="#5a4635"/><circle cx="${x}" cy="${y - 48 * s}" r="${22 * s}" fill="#3E7A33"/>`);
    }
  }
  if (scene.cyclePath) {
    // cykelsti i højre side
    parts.push(`<polygon points="${xr(0)},${H} ${xr(0) + roadW(0) * 0.15},${H} ${xr(0.95) + roadW(0.95) * 0.15},${yAt(0.95)} ${xr(0.95)},${yAt(0.95)}" fill="#3A3F45"/>`);
    parts.push(`<line x1="${xr(0) + roadW(0) * 0.15}" y1="${H}" x2="${xr(0.95) + roadW(0.95) * 0.15}" y2="${yAt(0.95)}" stroke="#D8DCE0" stroke-width="2"/>`);
  }
  // vejbanen
  parts.push(`<polygon points="${xl(0)},${H} ${xr(0)},${H} ${xr(1)},${yAt(1)} ${xl(1)},${yAt(1)}" fill="#2A2E33"/>`);
  return parts.join('');
}

function mirrors(scene) {
  const parts = [];
  // bakspejl
  const m = scene.mirrorRear || 'empty';
  parts.push(`<rect x="150" y="6" width="100" height="26" rx="6" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>`);
  parts.push(`<rect x="153" y="9" width="94" height="20" rx="4" fill="#9fb4c7"/>`);
  if (m === 'car' || m === 'close') parts.push(car(200, 29, m === 'close' ? 0.42 : 0.26, { color: '#3B4650', oncoming: true }));
  if (m === 'motorcycle') parts.push(cyclist(200, 29, 0.3, { color: '#111' }));
  // højre sidespejl
  const r = scene.mirrorRight || 'empty';
  const my = H - 44;
  parts.push(`<rect x="${W - 62}" y="${my}" width="56" height="30" rx="6" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>`);
  parts.push(`<rect x="${W - 59}" y="${my + 3}" width="50" height="24" rx="4" fill="#9fb4c7"/>`);
  if (r === 'cyclist') parts.push(cyclist(W - 34, my + 27, 0.42, { color: '#1D3A9E' }));
  if (r === 'car') parts.push(car(W - 34, my + 25, 0.3, { color: '#7a8891', oncoming: true }));
  // venstre sidespejl
  const l = scene.mirrorLeft || 'empty';
  parts.push(`<rect x="6" y="${my}" width="56" height="30" rx="6" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>`);
  parts.push(`<rect x="9" y="${my + 3}" width="50" height="24" rx="4" fill="#9fb4c7"/>`);
  if (l === 'car') parts.push(car(34, my + 25, 0.3, { color: '#7a8891', oncoming: true }));
  if (l === 'close') parts.push(car(34, my + 25, 0.44, { color: '#3B4650', oncoming: true }));
  return parts.join('');
}

function dashboard(scene) {
  const speed = scene.speed ?? 50, limit = scene.limit ?? 50;
  const over = speed > limit;
  return `<g>
    <path d="M0 ${H} L0 ${H - 48} Q${W / 2} ${H - 62} ${W} ${H - 48} L${W} ${H} Z" fill="#1E2226"/>
    <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="24" fill="${over ? '#FF6B5E' : '#F4F6F8'}">${speed}<tspan font-size="11" font-weight="500" fill="#AEB7BF"> km/t</tspan></text>
    ${scene.blinker ? `<path d="M${scene.blinker === 'left' ? W / 2 - 60 : W / 2 + 60} ${H - 26} ${scene.blinker === 'left' ? 'l-10 6 l10 6' : 'l10 6 l-10 6'} z" fill="#3CB55A"/>` : ''}
  </g>`;
}

function weather(scene) {
  if (scene.rain) {
    let s = '';
    for (let i = 0; i < 60; i++) { const x = (i * 67) % W, y = (i * 43) % H; s += `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 12}" stroke="#D7E3EE" stroke-width="1" opacity=".7"/>`; }
    return `<g>${s}</g>`;
  }
  return '';
}

export function renderScene(scene = {}) {
  const objs = [...(scene.objects || [])].sort((a, b) => (b.d ?? 0) - (a.d ?? 0));
  const drawn = objs.map(o => {
    const d = Math.min(0.98, Math.max(0, o.d ?? 0.5));
    const x = o.x != null ? o.x : laneX(o.lane || 'own', d);
    const y = yAt(d) + (o.dy || 0);
    const fn = DRAW[o.type];
    return fn ? fn(x, y, scaleAt(d) * (o.scale || 1), o) : '';
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(scene.alt || 'Udsyn gennem forruden')}" class="scene-svg">
    ${surroundings(scene)}${roadLayer(scene)}${markings(scene)}${drawn}${weather(scene)}${dashboard(scene)}${mirrors(scene)}
  </svg>`;
}

export const SCENE_SIZE = { W, H };
export const depthY = yAt;
