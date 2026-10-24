// 2D-geometri. Koordinater: x mod øst, y mod syd (som et kort med nord opad og y nedad).
// Retning h måles fra +x mod +y. Højre side af en kørselsretning d er (-d.y, d.x).

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const len = a => Math.hypot(a.x, a.y);
export const norm = a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
export const rightOf = d => ({ x: -d.y, y: d.x });
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function makePath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1] };
}

export function pointAt(path, s) {
  const { pts, cum } = path, n = pts.length;
  if (s <= 0) {
    const h = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    return { x: pts[0].x + Math.cos(h) * s, y: pts[0].y + Math.sin(h) * s, h };
  }
  if (s >= path.len) {
    const h = Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x), e = s - path.len;
    return { x: pts[n - 1].x + Math.cos(h) * e, y: pts[n - 1].y + Math.sin(h) * e, h };
  }
  let i = 1;
  while (cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, h: Math.atan2(b.y - a.y, b.x - a.x) };
}

// Nærmeste punkt på en sti: s (buelængde), lat (fortegn: positiv = højre for kørselsretningen), dist.
export function projectOn(path, x, y) {
  let best = null;
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    let t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + dx * t, py = a.y + dy * t, d2 = (x - px) ** 2 + (y - py) ** 2;
    if (!best || d2 < best.d2) {
      const L = Math.sqrt(L2);
      best = { d2, s: path.cum[i - 1] + t * L, lat: ((x - a.x) * -dy + (y - a.y) * dx) / L, h: Math.atan2(dy, dx) };
    }
  }
  best.dist = Math.sqrt(best.d2);
  return best;
}

export function bezierPts(p0, c, p2, n = 12) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y });
  }
  return out;
}

export function lineIntersect(p, d, q, e) {
  const den = cross(d, e);
  if (Math.abs(den) < 1e-6) return null;
  const t = cross(sub(q, p), e) / den;
  return add(p, mul(d, t));
}
