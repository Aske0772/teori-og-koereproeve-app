// Byens vejnet som graf: kryds (knuder), vejstykker (kanter), vognbaner og baner gennem krydsene.
// Reglerne for hvem der holder tilbage ligger også her, så trafikken og sensoren bruger præcis de samme.
import { makePath, projectOn, bezierPts, lineIntersect, norm, sub, add, mul, rightOf, cross, dot } from './geom.js';

export const SP = 110;            // meter mellem kryds
export const LANE_OFF = 1.75;     // vognbanens midte fra vejens midte
export const ROAD_HALF = 3.5;
export const CYCLE_W = 1.8;
export const WALK_W = 3.0;
export const LOT = 11.5;          // husenes forhaver begynder her (fra vejmidte)
const COLS = 5, ROWS = 4;
const REMOVED_V = new Set(['1,2', '3,0']);   // lodret vejstykke fra (i,j) til (i,j+1) findes ikke
const LIGHTS = new Set(['2,1']);
const ROUNDABOUTS = new Set(['2,3']);
const STOPS = new Set(['3,2>3,1']);
const ZEBRAS = [{ a: '0,1', b: '1,1', t: 0.55 }, { a: '1,0', b: '1,1', t: 0.5 }];
const RC = 10;                    // rundkørslens kørebane, radius
const RB_EPS = 0.42;

function meta(a, b) {
  if (a.j === b.j) {
    if (a.j === 1) return { name: 'Hovedgaden', priority: true, cycle: true, limit: 50, busy: true };
    if (a.j === 0) return { name: 'Nordre Ringvej', limit: 60 };
    if (a.j === 2) return { name: 'Engvej', limit: 50 };
    return { name: 'Søndergade', limit: 50 };
  }
  const jmin = Math.min(a.j, b.j);
  if (a.i === 2) return { name: 'Ringgade', priority: true, cycle: true, limit: 50, busy: true };
  if (a.i === 1 && jmin === 0) return { name: 'Skolevej', limit: 30, school: true };
  if (a.i === 1) return { name: 'Skolevej', limit: 50 };
  if (a.i === 0) return { name: 'Vestergade', limit: 50 };
  if (a.i === 3) return { name: 'Kirkevej', limit: 50 };
  return { name: 'Østervej', limit: 50 };
}

export function buildCity() {
  const nodes = new Map(), edges = [], lanes = new Map(), conns = [];
  const N = (i, j) => nodes.get(`${i},${j}`);
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const id = `${i},${j}`;
    nodes.set(id, { id, i, j, x: i * SP, y: j * SP, arms: [] });
  }
  const addEdge = (a, b) => {
    const e = { id: `${a.id}-${b.id}`, a, b, ...meta(a, b) };
    e.len = Math.hypot(b.x - a.x, b.y - a.y);
    e.dir = norm(sub(b, a));
    edges.push(e);
    a.arms.push({ edge: e, other: b });
    b.arms.push({ edge: e, other: a });
  };
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS - 1; i++) addEdge(N(i, j), N(i + 1, j));
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS - 1; j++) if (!REMOVED_V.has(`${i},${j}`)) addEdge(N(i, j), N(i, j + 1));

  for (const n of nodes.values()) {
    const deg = n.arms.length;
    for (const arm of n.arms) arm.phi = Math.atan2(arm.other.y - n.y, arm.other.x - n.x);
    if (ROUNDABOUTS.has(n.id)) n.type = 'roundabout';
    else if (LIGHTS.has(n.id)) n.type = 'light';
    else if (deg >= 3) n.type = 'junction';
    else {
      const [a, b] = n.arms;
      n.type = Math.abs(Math.cos(a.phi - b.phi) + 1) < 0.05 ? 'pass' : 'bend';
    }
    n.R = n.type === 'roundabout' ? 18 : 8;
    n.hasPriority = n.arms.some(a => a.edge.priority);
    if (n.type === 'light') n.light = { t: 0 };
  }

  // vognbaner
  for (const e of edges) {
    for (const [from, to] of [[e.a, e.b], [e.b, e.a]]) {
      const dir = norm(sub(to, from)), r = rightOf(dir);
      const start = add(add(from, mul(dir, from.R)), mul(r, LANE_OFF));
      const end = add(sub(to, mul(dir, to.R)), mul(r, LANE_OFF));
      const lane = {
        id: `${from.id}>${to.id}`, from, to, edge: e, dir, right: r, path: makePath([start, end]),
        limit: e.limit, cycle: !!e.cycle, priority: !!e.priority, name: e.name, school: !!e.school, zebras: [], conns: [],
      };
      lanes.set(lane.id, lane);
    }
  }
  for (const n of nodes.values()) for (const arm of n.arms) {
    arm.inLane = lanes.get(`${arm.other.id}>${n.id}`);
    arm.outLane = lanes.get(`${n.id}>${arm.other.id}`);
  }
  for (const lane of lanes.values()) lane.control = controlFor(lane.to, lane);

  // baner gennem krydsene
  for (const n of nodes.values()) {
    for (const ai of n.arms) for (const ao of n.arms) {
      if (ai === ao) continue;
      const inL = ai.inLane, outL = ao.outLane;
      const p0 = inL.path.pts[1], p2 = outL.path.pts[0];
      const cr = cross(inL.dir, outL.dir), dt = dot(inL.dir, outL.dir);
      const turn = cr > 0.3 ? 'right' : cr < -0.3 ? 'left' : dt > 0 ? 'straight' : 'uturn';
      let pts, exitIndex = null;
      if (n.type === 'roundabout') {
        const aIn = ai.phi - RB_EPS;
        let aOut = ao.phi + RB_EPS;
        while (aOut >= aIn) aOut -= 2 * Math.PI;
        while (aIn - aOut > 2 * Math.PI) aOut += 2 * Math.PI;
        pts = [p0];
        for (let a = aIn; a > aOut; a -= 0.12) pts.push({ x: n.x + RC * Math.cos(a), y: n.y + RC * Math.sin(a) });
        pts.push({ x: n.x + RC * Math.cos(aOut), y: n.y + RC * Math.sin(aOut) }, p2);
        const order = n.arms.filter(k => k !== ai).map(k => { let a = k.phi + RB_EPS; while (a >= aIn) a -= 2 * Math.PI; return { k, a }; }).sort((x, y) => y.a - x.a);
        exitIndex = order.findIndex(o => o.k === ao) + 1;
      } else if (turn === 'straight') {
        pts = [p0, p2];
      } else if (turn === 'uturn') {
        continue;
      } else {
        const c = lineIntersect(p0, inL.dir, p2, outL.dir) || mul(add(p0, p2), 0.5);
        pts = bezierPts(p0, c, p2, 12);
      }
      const conn = { id: `${inL.id}|${outL.id}`, node: n, inLane: inL, outLane: outL, turn, exitIndex, path: makePath(pts) };
      inL.conns.push(conn);
      conns.push(conn);
    }
  }

  // hvilke baner gennem samme kryds krydser eller fletter ind i hinanden?
  const segX = (a, b, c, d) => {
    const d1 = cross(sub(b, a), sub(c, a)), d2 = cross(sub(b, a), sub(d, a)), d3 = cross(sub(d, c), sub(a, c)), d4 = cross(sub(d, c), sub(b, c));
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  const pathsCross = (P, Q) => {
    for (let i = 1; i < P.pts.length; i++) for (let j = 1; j < Q.pts.length; j++) if (segX(P.pts[i - 1], P.pts[i], Q.pts[j - 1], Q.pts[j])) return true;
    return false;
  };
  for (const n of nodes.values()) {
    const cs = conns.filter(c => c.node === n);
    for (const c of cs) c.conflicts = new Set();
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const A = cs[a], B = cs[b];
      if (A.inLane === B.inLane) continue;
      if (n.type === 'roundabout' || A.outLane === B.outLane || pathsCross(A.path, B.path)) { A.conflicts.add(B.id); B.conflicts.add(A.id); }
    }
  }

  // fodgængerfelter
  const zebras = ZEBRAS.map((z, k) => {
    const e = edges.find(x => (x.a.id === z.a && x.b.id === z.b) || (x.a.id === z.b && x.b.id === z.a));
    const pos = add(e.a, mul(sub(e.b, e.a), z.t));
    const zb = { id: k, edge: e, x: pos.x, y: pos.y, dir: e.dir, cycle: !!e.cycle, peds: [] };
    for (const lane of [lanes.get(`${e.a.id}>${e.b.id}`), lanes.get(`${e.b.id}>${e.a.id}`)]) lane.zebras.push({ zebra: zb, s: projectOn(lane.path, pos.x, pos.y).s });
    return zb;
  });

  // cykelstier: én lang sti pr. retning langs Hovedgaden og Ringgade
  const cyclePaths = [];
  const off = ROAD_HALF + CYCLE_W / 2;
  const addCycle = (p, q, lightNodes) => {
    const dir = norm(sub(q, p)), r = rightOf(dir);
    const a = add(p, mul(r, off)), b = add(q, mul(r, off));
    const path = makePath([a, b]);
    cyclePaths.push({ path, dir, right: r, lights: lightNodes.map(n => ({ node: n, s: projectOn(path, n.x, n.y).s })) });
  };
  const L = [...nodes.values()].filter(n => n.type === 'light');
  addCycle({ x: 6, y: SP }, { x: 4 * SP - 6, y: SP }, L);
  addCycle({ x: 4 * SP - 6, y: SP }, { x: 6, y: SP }, L);
  addCycle({ x: 2 * SP, y: 6 }, { x: 2 * SP, y: 3 * SP - 24 }, L);
  addCycle({ x: 2 * SP, y: 3 * SP - 24 }, { x: 2 * SP, y: 6 }, L);

  // skilte og afmærkning
  const signs = [], marks = [], lightPoles = [];
  const sideOff = lane => (lane.cycle ? ROAD_HALF + CYCLE_W + 0.7 : ROAD_HALF + 0.9);
  const atLane = (lane, s, extra = 0) => { const p = lane.path.pts[0]; const q = add(p, mul(lane.dir, s)); return add(q, mul(lane.right, sideOff(lane) - LANE_OFF + extra)); };
  for (const lane of lanes.values()) {
    const len = lane.path.len, end = lane.path.pts[1], h = Math.atan2(lane.dir.y, lane.dir.x);
    switch (lane.control) {
      case 'yield': signs.push({ type: 'vigepligt', ...atLane(lane, len - 1.5), h }); marks.push({ type: 'shark', x: end.x, y: end.y, h }); break;
      case 'stop': signs.push({ type: 'stop', ...atLane(lane, len - 1.0), h }); marks.push({ type: 'stopline', x: end.x, y: end.y, h }); break;
      case 'roundabout': signs.push({ type: 'rundkoersel', ...atLane(lane, len - 18), h }); marks.push({ type: 'shark', x: end.x, y: end.y, h }); break;
      case 'light': lightPoles.push({ node: lane.to, lane, ...atLane(lane, len - 0.5), h }); marks.push({ type: 'stopline', x: end.x, y: end.y, h }); break;
    }
    const inbound = lane.from.arms.map(a => a.inLane).filter(l => l && l.edge !== lane.edge);
    if (inbound.some(l => l.limit !== lane.limit)) signs.push({ type: `speed${lane.limit}`, ...atLane(lane, 7), h });
    if (lane.priority && lane.from.type !== 'light') signs.push({ type: 'hovedvej', ...atLane(lane, 14), h });
    if (lane.school) signs.push({ type: 'skole', ...atLane(lane, 20), h });
    for (const z of lane.zebras) signs.push({ type: 'fodgaenger', ...atLane(lane, z.s + 1.5), h });
  }

  // prøverute og slutpunkt
  const examRoute = ['0,2', '0,1', '1,1', '2,1', '2,2', '2,3', '3,3', '4,3', '4,2', '4,1', '4,0', '3,0', '2,0', '1,0', '1,1', '1,2', '2,2', '3,2', '3,1', '2,1', '1,1', '0,1', '0,2', '0,3'];
  const startLane = lanes.get('0,3>0,2');
  const finalLane = lanes.get('0,2>0,3');
  const targetS = 52;
  const tp = add(finalLane.path.pts[0], mul(finalLane.dir, targetS));
  const target = { lane: finalLane, s: targetS, x: tp.x + finalLane.right.x * (ROAD_HALF + 1.4 - LANE_OFF), y: tp.y + finalLane.right.y * (ROAD_HALF + 1.4 - LANE_OFF), h: Math.atan2(finalLane.dir.y, finalLane.dir.x) };

  const net = {
    nodes, edges, lanes, conns, zebras, cyclePaths, signs, marks, lightPoles,
    lightNodes: [...nodes.values()].filter(n => n.type === 'light'),
    examRoute, start: { lane: startLane, s: 22, lat: 1.15 }, finalLaneId: finalLane.id, target,
    bounds: { x0: 0, y0: 0, x1: (COLS - 1) * SP, y1: (ROWS - 1) * SP },
    cols: COLS, rows: ROWS, removedV: REMOVED_V,
  };
  net.locate = (x, y, h) => locate(net, x, y, h);
  return net;
}

export function controlFor(node, lane) {
  if (node.type === 'light') return 'light';
  if (node.type === 'roundabout') return 'roundabout';
  if (node.type === 'bend' || node.type === 'pass') return 'none';
  if (STOPS.has(`${lane.from.id}>${node.id}`)) return 'stop';
  if (node.hasPriority) return lane.priority ? 'priority' : 'yield';
  return 'right';
}

// Lyskryds: faste faser. 'H' = vandrette veje (øst-vest), 'V' = lodrette.
const PHASES = [['H', 'green', 14], ['H', 'yellow', 3], ['A', 'red', 1.5], ['V', 'redyellow', 1.2], ['V', 'green', 14], ['V', 'yellow', 3], ['A', 'red', 1.5], ['H', 'redyellow', 1.2]];
const CYCLE = PHASES.reduce((a, p) => a + p[2], 0);
export function lightState(node, laneLike) {
  const axis = Math.abs(laneLike.dir.x) > Math.abs(laneLike.dir.y) ? 'H' : 'V';
  let t = (node.light.t + (node.light.offset || 0)) % CYCLE;
  for (const [ax, st, d] of PHASES) {
    if (t < d) return ax === axis ? st : 'red';
    t -= d;
  }
  return 'red';
}

// Hvordan kommer den anden ind i krydset, set fra mig?
export function relation(myLane, oLane) {
  const d = dot(myLane.dir, oLane.dir), c = cross(myLane.dir, oLane.dir);
  if (d < -0.7) return 'opposite';
  if (c < -0.5) return 'right';
  if (c > 0.5) return 'left';
  return 'same';
}

// Har den anden forkørselsret over mig? Samme funktion bruges af trafikken og af sensoren.
export function otherHasPriority(node, myLane, myTurn, oLane, oTurn) {
  if (!oLane || oLane === myLane || oLane.to !== node) return false;
  const rel = relation(myLane, oLane);
  if (rel === 'same') return false;
  if (node.type === 'light') return rel === 'opposite' && myTurn === 'left' && oTurn !== 'left';
  const mc = myLane.control, oc = oLane.control;
  const minor = c => c === 'yield' || c === 'stop';
  if (mc === 'priority' && minor(oc)) return false;
  if (minor(mc) && oc === 'priority') return true;
  if (rel === 'opposite') return myTurn === 'left' && oTurn !== 'left';
  if (mc === 'priority' && oc === 'priority') return false;
  return rel === 'right';
}

// Hvor er et punkt i byen? Bruges til bilen: vognbane, sideforskydning og underlag.
export function locate(net, x, y, h) {
  for (const n of net.nodes.values()) {
    const d = Math.hypot(x - n.x, y - n.y);
    if (d < n.R) {
      let surface = 'road';
      if (n.type === 'roundabout' && d < 6.6) surface = 'island';
      return { inNode: true, node: n, d, surface };
    }
  }
  let best = null;
  for (const e of net.edges) {
    const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
    let t = ((x - e.a.x) * dx + (y - e.a.y) * dy) / (e.len * e.len);
    const tc = Math.max(0, Math.min(1, t));
    const px = e.a.x + dx * tc, py = e.a.y + dy * tc;
    const d = Math.hypot(x - px, y - py);
    if (!best || d < best.d) best = { e, d, side: ((x - e.a.x) * -dy + (y - e.a.y) * dx) / e.len };
  }
  const e = best.e;
  const forward = Math.cos(h) * e.dir.x + Math.sin(h) * e.dir.y >= 0;
  const lane = net.lanes.get(forward ? `${e.a.id}>${e.b.id}` : `${e.b.id}>${e.a.id}`);
  const latRoad = forward ? best.side : -best.side;
  const pr = projectOn(lane.path, x, y);
  const cd = best.d;
  let surface;
  if (cd < ROAD_HALF) surface = 'road';
  else if (e.cycle && cd < ROAD_HALF + CYCLE_W) surface = 'cycle';
  else if (cd < ROAD_HALF + (e.cycle ? CYCLE_W : 0) + WALK_W) surface = 'walk';
  else if (cd < LOT) surface = 'verge';
  else surface = 'building';
  return { inNode: false, edge: e, lane, s: pr.s, lat: latRoad - LANE_OFF, centerDist: cd, surface };
}

// Korteste vej i antal kryds, uden at vende i første kryds.
export function bfs(net, fromId, toId, prevId, forbidden = new Set()) {
  if (fromId === toId) return [fromId];
  const q = [[fromId]], seen = new Set([fromId]);
  while (q.length) {
    const path = q.shift(), cur = path[path.length - 1], node = net.nodes.get(cur);
    for (const arm of node.arms) {
      const nx = arm.other.id;
      if (path.length === 1 && nx === prevId) continue;
      if (path.length > 1 && nx === path[path.length - 2]) continue;
      if (forbidden.has(`${cur}>${nx}`)) continue;
      if (seen.has(nx)) continue;
      const np = path.concat(nx);
      if (nx === toId) return np;
      seen.add(nx);
      q.push(np);
    }
  }
  return null;
}
