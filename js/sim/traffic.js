// Trafikanter: biler (Intelligent Driver Model + vigepligtsregler), cyklister, fodgængere og lyskryds.
import { pointAt, projectOn, dot, rightOf, angDiff, add, mul } from './geom.js';
import { lightState, otherHasPriority, ROAD_HALF, CYCLE_W } from './network.js';

export const CAR_L = 4.3;
const COLORS = ['#c9ccd1', '#2f3a45', '#8b1e1e', '#e6e2d8', '#3d5a80', '#5c6b73', '#23272b', '#a3a8ad', '#6b4f3a', '#2e5e4e', '#b8b2a7', '#7d2f3f'];
const SHIRTS = ['#2f7d9a', '#7a4f9e', '#c8322b', '#3e6b48', '#d08a2c', '#33475b', '#9a3b5c', '#5e6a73'];

function idm(v, v0, gap, dv) {
  const a = 1.7, b = 2.8, s0 = 2.2, T = 1.25;
  const sStar = s0 + Math.max(0, v * T + (v * dv) / (2 * Math.sqrt(a * b)));
  const g = Math.max(gap, 0.1);
  return a * (1 - Math.pow(v / Math.max(v0, 0.3), 4) - (sStar / g) ** 2);
}

export function createTraffic(net, opts = {}) {
  const rnd = opts.rng || Math.random;
  const cars = [], cyclists = [], strollers = [];
  const lanes = [...net.lanes.values()];
  let nextId = 1, t = 0;

  // lyskryds forskydes, så de ikke skifter samtidig (kun ét her, men klar til flere)
  net.lightNodes.forEach((n, i) => { n.light.t = 0; n.light.offset = i * 7; });

  function pickNext(lane) {
    const cs = lane.conns;
    if (!cs.length) return null;
    if (cs.length === 1) return cs[0];
    const w = cs.map(c => (c.turn === 'straight' ? 2.2 : 1));
    let r = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cs.length; i++) { r -= w[i]; if (r <= 0) return cs[i]; }
    return cs[cs.length - 1];
  }

  function spawnCar(avoid) {
    for (let tries = 0; tries < 60; tries++) {
      const lane = lanes[Math.floor(rnd() * lanes.length)];
      if (lane.path.len < 50) continue;
      const s = 12 + rnd() * (lane.path.len - 35);
      const pt = pointAt(lane.path, s);
      if (avoid && Math.hypot(pt.x - avoid.x, pt.y - avoid.y) < 55) continue;
      if (cars.some(c => Math.hypot(c.x - pt.x, c.y - pt.y) < 16)) continue;
      const car = {
        id: nextId++, kind: 'car', lane, conn: null, s, v: (lane.limit / 3.6) * 0.75, x: pt.x, y: pt.y, h: pt.h,
        color: COLORS[Math.floor(rnd() * COLORS.length)], vf: 0.9 + rnd() * 0.13, next: null, committed: false,
        stopDone: false, waitT: 0, waitLimit: 4.5 + rnd() * 3.5, accel: 0, hardBrakeT: null,
      };
      car.next = pickNext(lane);
      cars.push(car);
      derive(car);
      return car;
    }
    return null;
  }

  function derive(c) {
    if (c.conn) { c.approachLane = null; c.nodeId = c.conn.node.id; c.inLane = c.conn.inLane; c.turnGuess = c.conn.turn; c.dist = 0; }
    else { c.approachLane = c.lane; c.nodeId = null; c.inLane = null; c.dist = c.lane.path.len - c.s; c.turnGuess = c.next ? c.next.turn : 'straight'; }
  }

  // ---------- cyklister ----------
  function spawnCyclist(atStart) {
    const cp = net.cyclePaths[Math.floor(rnd() * net.cyclePaths.length)];
    const s = atStart ? 0 : rnd() * cp.path.len * 0.9;
    if (cyclists.some(o => o.cp === cp && Math.abs(o.s - s) < 14)) return null;
    const c = { kind: 'cyclist', cp, s, v: 4.2, vmax: 4.2 + rnd() * 1.6, x: 0, y: 0, h: 0, color: SHIRTS[Math.floor(rnd() * SHIRTS.length)], phase: rnd() * 6 };
    placeCyclist(c);
    cyclists.push(c);
    return c;
  }
  function placeCyclist(c) { const p = pointAt(c.cp.path, c.s); c.x = p.x; c.y = p.y; c.h = p.h; }
  function stepCyclist(c, dt) {
    let target = c.vmax;
    for (const L of c.cp.lights) {
      const d = L.s - 10 - c.s;
      if (d > -1 && d < 22 && lightState(L.node, c.cp) !== 'green') target = Math.min(target, Math.max(0, d * 0.35));
    }
    for (const o of cyclists) if (o !== c && o.cp === c.cp && o.s > c.s && o.s - c.s < 5) target = Math.min(target, o.v);
    c.v += Math.max(-4, Math.min(1.2, (target - c.v) * 2)) * dt;
    c.v = Math.max(0, c.v);
    c.s += c.v * dt;
    c.phase += c.v * dt * 1.8;
    if (c.s > c.cp.path.len) {
      c.cp = net.cyclePaths[Math.floor(rnd() * net.cyclePaths.length)];
      c.s = 0; c.v = 3;
      if (cyclists.some(o => o !== c && o.cp === c.cp && o.s < 14)) c.s = -20;
    }
    placeCyclist(c);
  }
  // krydser en cyklist min bane gennem krydset inden for de næste sekunder?
  function cyclistCrossing(conn, horizon = 3.2) {
    for (const c of cyclists) {
      if (Math.abs(c.x - conn.node.x) > 40 || Math.abs(c.y - conn.node.y) > 40) continue;
      for (let k = 0; k <= horizon; k += 0.4) {
        const q = pointAt(c.cp.path, c.s + c.v * k + 1);
        const pr = projectOn(conn.path, q.x, q.y);
        if (pr.dist < 2.4 && pr.s > 0.5 && pr.s < conn.path.len - 0.5) return c;
        const pr2 = projectOn(conn.inLane.path, q.x, q.y);
        if (pr2.dist < 2.0 && conn.inLane.path.len - pr2.s < 3) return c;
      }
    }
    return null;
  }
  function cyclistNear(lane) {
    const E = lane.path.pts[1];
    for (const c of cyclists) {
      if (dot(c.cp.dir, lane.dir) < 0.9) continue;
      const along = (c.x - E.x) * lane.dir.x + (c.y - E.y) * lane.dir.y;
      const lat = (c.x - E.x) * lane.right.x + (c.y - E.y) * lane.right.y;
      if (Math.abs(lat - 2.65) < 1.6 && along > -26 && along < 5) return true;
    }
    return false;
  }

  // ---------- fodgængere ----------
  for (const z of net.zebras) { z.peds = []; z.timer = 2 + rnd() * 5; }
  function curbOff(z) { return ROAD_HALF + (z.cycle ? CYCLE_W : 0) + 0.4; }
  function spawnZebraPed(z) {
    const n = rightOf(z.dir), side = rnd() < 0.5 ? 1 : -1, co = curbOff(z);
    const curb = { x: z.x + n.x * side * co, y: z.y + n.y * side * co };
    const along = rnd() < 0.5 ? 1 : -1;
    const start = add(add(curb, mul(n, side * 1.3)), mul(z.dir, along * 12));
    z.peds.push({ kind: 'ped', zebra: z, side, x: start.x, y: start.y, h: 0, state: 'approach', target: add(curb, mul(n, side * 0.6)), color: SHIRTS[Math.floor(rnd() * SHIRTS.length)], child: z.edge.school && rnd() < 0.6, phase: rnd() * 6, waitT: 0 });
  }
  function gapOK(z, ents) {
    for (const o of ents) {
      const L = o.approachLane || o.laneOn;
      if (!L || L.edge !== z.edge || o.s == null) continue;
      const zz = L.zebras.find(q => q.zebra === z);
      if (!zz) continue;
      const d = zz.s - o.s;
      if (d < -3 || d > 75) continue;
      if (Math.abs(d) < 2.6) return false;
      if (o.v > 1.2 && d > 0 && d / o.v < 4.5) return false;
    }
    return true;
  }
  function walk(p, speed, dt) {
    const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * dt);
    p.x += (dx / d) * st; p.y += (dy / d) * st; p.h = Math.atan2(dy, dx); p.phase += st * 3.2;
    return d - st < 0.05;
  }
  function stepZebras(dt, ents) {
    for (const z of net.zebras) {
      z.timer -= dt;
      if (z.timer <= 0) { if (z.peds.length < 2) spawnZebraPed(z); z.timer = 6 + rnd() * 9; }
      for (const p of z.peds) {
        const n = rightOf(z.dir), co = curbOff(z);
        if (p.state === 'approach') { if (walk(p, 1.3, dt)) p.state = 'wait'; }
        else if (p.state === 'wait') { p.waitT += dt; p.h = Math.atan2(-n.y * p.side, -n.x * p.side); if (gapOK(z, ents)) { p.state = 'cross'; p.target = { x: z.x - n.x * p.side * (co + 0.6), y: z.y - n.y * p.side * (co + 0.6) }; } }
        else if (p.state === 'cross') { if (walk(p, 1.45, dt)) { p.state = 'leave'; p.target = add(add(p.target, mul(n, -p.side * 1.3)), mul(z.dir, (rnd() < 0.5 ? 1 : -1) * 14)); } }
        else if (p.state === 'leave') { if (walk(p, 1.3, dt)) p.done = true; }
      }
      z.peds = z.peds.filter(p => !p.done);
    }
  }
  function zebraBusy(z) { return z.peds.some(p => p.state === 'wait' || p.state === 'cross'); }

  function spawnStroller() {
    const e = net.edges[Math.floor(rnd() * net.edges.length)];
    const side = rnd() < 0.5 ? 1 : -1, off = ROAD_HALF + (e.cycle ? CYCLE_W : 0) + 1.6;
    const s = { kind: 'ped', e, side, off, t: 0.12 + rnd() * 0.76, dir: rnd() < 0.5 ? 1 : -1, x: 0, y: 0, h: 0, color: SHIRTS[Math.floor(rnd() * SHIRTS.length)], child: e.school && rnd() < 0.5, phase: rnd() * 6, speed: 1.0 + rnd() * 0.5 };
    placeStroller(s);
    strollers.push(s);
  }
  function placeStroller(s) {
    const n = rightOf(s.e.dir);
    s.x = s.e.a.x + (s.e.b.x - s.e.a.x) * s.t + n.x * s.side * s.off;
    s.y = s.e.a.y + (s.e.b.y - s.e.a.y) * s.t + n.y * s.side * s.off;
    s.h = Math.atan2(s.e.dir.y * s.dir, s.e.dir.x * s.dir);
  }
  function stepStroller(s, dt) {
    s.t += (s.dir * s.speed * dt) / s.e.len;
    s.phase += s.speed * dt * 3.2;
    if (s.t > 0.88 || s.t < 0.12) { s.dir *= -1; s.t = Math.max(0.12, Math.min(0.88, s.t)); }
    placeStroller(s);
  }

  // ---------- biler ----------
  // Bilens vej de næste ~50 m: resten af nuværende sti + kryds + næste vognbane.
  function lookahead(c) {
    const segs = [];
    if (c.conn) {
      segs.push({ path: c.conn.path, from: c.s, base: 0 });
      segs.push({ path: c.conn.outLane.path, from: 0, base: c.conn.path.len - c.s });
    } else {
      segs.push({ path: c.lane.path, from: c.s, base: 0 });
      if (c.next) {
        const b = c.lane.path.len - c.s;
        segs.push({ path: c.next.path, from: 0, base: b });
        segs.push({ path: c.next.outLane.path, from: 0, base: b + c.next.path.len });
      }
    }
    return segs;
  }
  function aheadOnPath(segs, x, y) {
    for (const sg of segs) {
      const pr = projectOn(sg.path, x, y);
      if (pr.dist < 1.7 && pr.s >= sg.from - 0.3) {
        const ahead = sg.base + pr.s - sg.from;
        if (ahead > 0.6 && ahead < 55) return ahead;
      }
    }
    return null;
  }
  function leader(c, ents) {
    let best = null;
    const fx = Math.cos(c.h), fy = Math.sin(c.h);
    for (const o of ents) {
      if (o === c) continue;
      if (Math.abs(o.x - c.x) > 60 || Math.abs(o.y - c.y) > 60) continue;
      const ahead = aheadOnPath(c._segs, o.x, o.y);
      if (ahead == null) continue;
      // to biler midt i samme kryds, der står i vejen for hinanden: den, der kom først, kører
      if (o.kind === 'car' && c.conn && o.conn && o.conn.node === c.conn.node && o.inLane !== c.inLane && c.enterT < o.enterT && o._segs && aheadOnPath(o._segs, c.x, c.y) != null) continue;
      const ov = o.v * (Math.cos(o.h) * fx + Math.sin(o.h) * fy);
      const gap = ahead - CAR_L;
      if (!best || gap < best.gap) best = { gap, v: Math.max(0, ov), ent: o };
    }
    return best;
  }

  // rundkørsel: når en bil i ringen frem til mit indkørselspunkt inden for ca. 3 sekunder?
  function ringConflict(o, conn, margin = 3.4) {
    const n = conn.node, E = conn.path.pts[1];
    const r = Math.hypot(o.x - n.x, o.y - n.y);
    const radial = r > 0.5 ? (Math.cos(o.h) * (o.x - n.x) + Math.sin(o.h) * (o.y - n.y)) / r : 0;
    if (r > 12 && radial < -0.3) {
      // på vej ind i ringen fra en anden arm: kommer den forbi mit indkørselspunkt snart?
      let d = Math.atan2(o.y - n.y, o.x - n.x) - Math.atan2(E.y - n.y, E.x - n.x);
      while (d < 0) d += 2 * Math.PI;
      while (d >= 2 * Math.PI) d -= 2 * Math.PI;
      return d < 2.3 && o.v > 0.8;
    }
    if (r > 14) return false;
    // den, der kører ud ad min arm, passerer ikke mit indkørselspunkt
    if (o.conn && o.conn.outLane.to === conn.inLane.from) return false;
    if (!o.conn && r > 12 && (Math.cos(o.h) * (o.x - n.x) + Math.sin(o.h) * (o.y - n.y)) / r > 0.5) return false;
    let d = Math.atan2(o.y - n.y, o.x - n.x) - Math.atan2(E.y - n.y, E.x - n.x);
    while (d < 0) d += 2 * Math.PI;
    while (d >= 2 * Math.PI) d -= 2 * Math.PI;
    if (d > 2 * Math.PI - 0.3) return true;
    const arc = d * 10;
    return arc < 36 && arc / Math.max(o.v, 2) < (o.kind === 'player' ? 3.4 : margin);
  }

  function mayEnter(c, conn, distToEnd, ents) {
    const node = conn.node, lane = conn.inLane, ctl = lane.control;
    if (ctl === 'light') {
      const st = lightState(node, lane);
      if (st === 'red' || st === 'redyellow') return false;
      if (st === 'yellow' && distToEnd > (c.v * c.v) / (2 * 3.0) + 1.5) return false;
    }
    if (ctl === 'stop' && !c.stopDone) return false;
    if ((conn.turn === 'right' && lane.cycle && cyclistNear(lane)) || cyclistCrossing(conn)) return false;
    for (const o of ents) {
      if (o === c) continue;
      if (o.nodeId === node.id) {
        if (node.type === 'roundabout') { if (o.inLane !== lane && ringConflict(o, conn)) return false; continue; }
        if (o.inLane !== lane && Math.hypot(o.x - node.x, o.y - node.y) < node.R && (!o.conn || conn.conflicts.has(o.conn.id))) return false;
        continue;
      }
      const oIn = o.approachLane;
      if (!oIn || oIn.to !== node || oIn === lane) continue;
      if (node.type === 'roundabout') { if (upstreamEntering(node, lane, oIn, o)) return false; continue; }
      if (o.dist > 60) continue;
      if (o.v < 0.5 && o.dist > 4) continue;
      const eta = o.dist / Math.max(o.v, 1.0);
      if (eta > 4.0) continue;
      if (o.next && !conn.conflicts.has(o.next.id)) continue;
      if (otherHasPriority(node, lane, conn.turn, oIn, o.turnGuess)) return false;
    }
    return true;
  }

  // rundkørsel: en bil, der er ved at køre ind fra armen før min, kommer forbi foran mig
  function upstreamEntering(node, myLane, oIn, o) {
    const am = Math.atan2(myLane.from.y - node.y, myLane.from.x - node.x);
    const ao = Math.atan2(oIn.from.y - node.y, oIn.from.x - node.x);
    let d = ao - am; while (d <= 0) d += 2 * Math.PI;
    return d < 2.2 && o.dist < 14 && o.v > 1.5 && o.dist / o.v < 2.6;
  }

  function occupied(node, c, ents) { return ents.some(o => o !== c && o.nodeId === node.id); }

  function stepCar(c, dt, ents) {
    const onConn = !!c.conn;
    const lane = c.lane;
    const limit = (onConn ? c.conn.outLane.limit : lane.limit) / 3.6;
    let v0 = limit * c.vf;
    if (onConn) {
      if (c.conn.node.type === 'roundabout') v0 = Math.min(v0, 7.5);
      else if (c.conn.turn !== 'straight') v0 = Math.min(v0, 6.0);
    } else if (c.next && (c.next.turn !== 'straight' || c.next.node.type === 'roundabout')) {
      v0 = Math.min(v0, 6.0 + (lane.path.len - c.s) * 0.22);
    }
    let acc = 1.7 * (1 - Math.pow(c.v / Math.max(v0, 0.3), 4));
    const obstacle = (gap, ov) => { const a = idm(c.v, v0, gap, c.v - ov); if (a < acc) acc = a; };
    const lead = leader(c, ents);
    if (lead) obstacle(lead.gap, lead.v);

    if (!onConn) {
      const d = lane.path.len - c.s;
      const nx = c.next;
      if (nx && lane.control !== 'none') {
        if (lane.control === 'stop' && d < 4 && c.v < 0.3) c.stopDone = true;
        if (!c.committed) {
          let may = d < 50 ? mayEnter(c, nx, d, ents) : true;
          if (!may && c.v < 0.3 && d < 9) {
            c.waitT += dt;
            const lightOk = lane.control !== 'light' || lightState(nx.node, lane) === 'green';
            const stopOk = lane.control !== 'stop' || c.stopDone;
            if (c.waitT > c.waitLimit && lightOk && stopOk && !occupied(nx.node, c, ents)) may = true;
          } else if (may) c.waitT = 0;
          if (may && d < (lane.control === 'roundabout' ? 1.5 : 7)) c.committed = true;
          if (!may) obstacle(d - 1.0, 0);
        }
      }
      for (const z of lane.zebras) {
        const dz = z.s - c.s;
        if (dz > 3.0 && dz < 40 && zebraBusy(z.zebra)) obstacle(dz - 4.0, 0);
      }
    }

    c.accel = Math.max(-8, Math.min(acc, 2.5));
    if (c.accel < -4.0 && c.v > 3.5 && lead && lead.ent.kind === 'player') c.hardBrakeT = t;
    c.v = Math.max(0, c.v + c.accel * dt);
    c.s += c.v * dt;
    if (!onConn && c.s >= lane.path.len) {
      if (c.next) { c.s -= lane.path.len; c.conn = c.next; c.enterT = t; }
      else { c.s = lane.path.len; c.v = 0; }
    } else if (onConn && c.s >= c.conn.path.len) {
      c.s -= c.conn.path.len;
      c.lane = c.conn.outLane; c.conn = null;
      c.next = pickNext(c.lane); c.committed = false; c.stopDone = false; c.waitT = 0;
    }
    const pt = pointAt(c.conn ? c.conn.path : c.lane.path, c.s);
    c.x = pt.x; c.y = pt.y;
    c.h += angDiff(pt.h, c.h) * Math.min(1, dt * 10);
    derive(c);
  }

  // ---------- start ----------
  const count = opts.count ?? 16;
  for (let i = 0; i < count; i++) spawnCar(opts.avoid);
  for (let i = 0; i < (opts.cyclists ?? 7); i++) spawnCyclist(false);
  for (let i = 0; i < (opts.strollers ?? 14); i++) spawnStroller();

  function step(dt, pl) {
    t += dt;
    for (const n of net.lightNodes) n.light.t += dt;
    const ents = pl ? cars.concat([pl]) : cars;
    for (const c of cars) c._segs = lookahead(c);
    for (const c of cars) stepCar(c, dt, ents);
    for (const c of cyclists) stepCyclist(c, dt);
    stepZebras(dt, ents);
    for (const s of strollers) stepStroller(s, dt);
  }

  return {
    cars, cyclists, strollers, step, upstreamEntering, cyclistCrossing, ringConflict,
    allPeds: () => strollers.concat(...net.zebras.map(z => z.peds)),
    get t() { return t; },
  };
}
