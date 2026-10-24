// Autopilot: kører din bil efter reglerne. Bruges bag forsidens titel og til at teste sensoren.
import { pointAt, projectOn, angDiff } from './geom.js';
import { lightState, otherHasPriority } from './network.js';

export function createAutopilot(sim, opts = {}) {
  const { net, player: p } = sim;
  const bad = opts.sloppy || {};
  const look = id => { if (!bad.noLooks) sim.look(id); };
  const blink = side => { if (!bad.noBlink) sim.blink(side); };
  const rnd = opts.rng || Math.random;
  const st = { conn: null, phase: 'start', t: 0, did: {}, stopT: 0, freeNext: null, laneDid: {} };
  const say = k => { if (!st.did[k]) { st.did[k] = true; return true; } return false; };

  function chooseConn(lane) {
    const q = sim.ex.E.queue;
    if (q && lane.to.id === q[0] && q[1]) { const c = lane.conns.find(c => c.outLane.to.id === q[1]); if (c) return c; }
    if (st.freeNext && st.freeNext.inLane === lane) return st.freeNext;
    const cs = lane.conns;
    st.freeNext = cs.find(c => c.turn === 'straight' && rnd() < 0.55) || cs[Math.floor(rnd() * cs.length)];
    return st.freeNext;
  }

  function targetPoint(loc, la) {
    if (!loc.inNode) {
      const lane = loc.lane, rem = lane.path.len - loc.s;
      const latOff = sim.ex.E.pull ? 1.0 : st.phase === 'start' ? 1.15 : 0;
      if (la < rem || !st.next) { const q = pointAt(lane.path, loc.s + la); return { x: q.x + lane.right.x * latOff, y: q.y + lane.right.y * latOff }; }
      const c = st.next, r2 = la - rem;
      if (r2 < c.path.len) return pointAt(c.path, r2);
      return pointAt(c.outLane.path, r2 - c.path.len);
    }
    const c = st.conn;
    if (!c) return { x: p.x + Math.cos(p.h) * la, y: p.y + Math.sin(p.h) * la };
    const pr = projectOn(c.path, p.x, p.y);
    if (pr.s + la < c.path.len) return pointAt(c.path, pr.s + la);
    return pointAt(c.outLane.path, pr.s + la - c.path.len);
  }

  function mustYield(lane, conn) {
    const node = conn.node;
    if (lane.control === 'light') { const s = lightState(node, lane); if (s !== 'green') return true; }
    for (const c of sim.traffic.cars) {
      if (c.nodeId === node.id) {
        if (node.type === 'roundabout') { if (c.inLane !== lane && sim.traffic.ringConflict(c, conn, 4.6)) return true; continue; }
        if (c.inLane !== lane) return true;
        continue;
      }
      if (!c.approachLane || c.approachLane.to !== node || c.approachLane === lane) continue;
      if (node.type === 'roundabout') { if (sim.traffic.upstreamEntering(node, lane, c.approachLane, c)) return true; continue; }
      if (c.dist / Math.max(c.v, 0.8) < 5.5 && c.dist < 70 && otherHasPriority(node, lane, conn.turn, c.approachLane, c.turnGuess)) return true;
    }
    if (sim.traffic.cyclistCrossing(conn, 3.6)) return true;
    if (conn.turn === 'right' && lane.cycle) {
      const E = lane.path.pts[1];
      for (const cy of sim.traffic.cyclists) {
        const along = (cy.x - E.x) * lane.dir.x + (cy.y - E.y) * lane.dir.y, lat = (cy.x - E.x) * lane.right.x + (cy.y - E.y) * lane.right.y;
        if (Math.abs(lat - 2.65) < 1.6 && along > -30 && along < 12 && cy.cp.dir.x * lane.dir.x + cy.cp.dir.y * lane.dir.y > 0.9) return true;
      }
    }
    return false;
  }

  function step(dt) {
    st.t += dt;
    const loc = sim.loc, T = sim.ex.E.t;
    let vT = 0;
    if (!loc.inNode) {
      const lane = loc.lane, d = lane.path.len - loc.s;
      if (lane !== st.lastLane) { st.lastLane = lane; st.stopT = 0; st.laneDid = {}; }
      if (!st.next || st.next.inLane !== lane) st.next = chooseConn(lane);
      st.conn = null;
      const c = st.next;
      vT = (lane.limit / 3.6) * 0.9 * (bad.speed || 1);
      if (p.blinker && loc.s > 12 && (!c || c.turn === 'straight' || c.node.type === 'bend' || c.node.type === 'pass') && !sim.ex.E.pull && st.phase === 'drive' && loc.lat < 0.4) blink(p.blinker);
      if (st.phase === 'start') {
        if (say('s1')) blink('left');
        if (st.t > 0.6 && say('s2')) look('rear');
        if (st.t > 1.0 && say('s3')) look('left');
        if (st.t > 1.6) { look('shoulderLeft'); st.phase = 'drive'; }
        else vT = 0;
      }
      if (c) {
        const turning = c.turn !== 'straight' || c.node.type === 'roundabout';
        if (turning) vT = Math.min(vT, 5.2 + Math.max(0, d - 6) * 0.2);
        if (c.turn !== 'straight' && c.node.type !== 'roundabout' && c.node.type !== 'bend') {
          const L = st.laneDid;
          if (d < 55 && !L.r) { look('rear'); L.r = true; }
          if (d < 50 && !L.b) { if (p.blinker !== c.turn) blink(c.turn); L.b = true; }
          if (d < 42 && !L.m) { look(c.turn); L.m = true; }
          if (d < 10 && !L.sh) { look(c.turn === 'right' ? 'shoulderRight' : 'shoulderLeft'); L.sh = true; }
          // efter at have holdt stille: kig igen, før du kører
          if (d < 12 && L.sh && T - (p.looks.rear || -99) > 4) { look('rear'); look(c.turn); look(c.turn === 'right' ? 'shoulderRight' : 'shoulderLeft'); }
        }
        // stop og vigepligt
        if (lane.control !== 'none' && d < 45) {
          const stopSign = lane.control === 'stop';
          if (stopSign && d < 3.5 && Math.abs(p.v) < 0.1) st.stopT += dt;
          const needStop = bad.ignoreRules ? false : (stopSign && st.stopT < 1.0) || mustYield(lane, c);
          if (needStop && !(d < 0.8 && Math.abs(p.v) > 2)) vT = Math.min(vT, Math.max(0, (d - 1.2) * 0.45));
        }
      }
      for (const z of lane.zebras) {
        const dz = z.s - loc.s;
        if (dz > 3.0 && dz < 40 && z.zebra.peds.some(q => q.state === 'wait' || q.state === 'cross')) vT = Math.min(vT, Math.max(0, (dz - 4) * 0.4));
      }
      if (sim.ex.E.pull) {
        if (say('p1')) { look('rear'); blink('right'); }
        if (st.t > 0 && say('p2')) look('right');
        const dd = sim.ex.E.pull.s - loc.s;
        vT = Math.min(vT, Math.max(0, dd * 0.35));
      }

    } else {
      if (!st.conn && st.next && st.next.node === loc.node) { st.conn = st.next; st.rbDone = false; }
      const c = st.conn;
      vT = c && c.node.type === 'roundabout' ? 7 : c && c.turn !== 'straight' ? 5.5 : 12;
      if (c && c.node.type === 'roundabout') {
        const pr = projectOn(c.path, p.x, p.y);
        if (c.path.len - pr.s < 16 && !st.rbDone) { st.rbDone = true; if (p.blinker !== 'right') blink('right'); look('right'); }
      }
    }
    if (T - (p.looks.rear || -99) > 4 && Math.abs(p.v) > 3) look('rear');
    // følg bilen foran med 2 sekunders afstand (målt langs den vej, bilen skal køre)
    const segs = [];
    if (loc.inNode && st.conn) { const pr = projectOn(st.conn.path, p.x, p.y); segs.push({ path: st.conn.path, from: pr.s, base: 0 }, { path: st.conn.outLane.path, from: 0, base: st.conn.path.len - pr.s }); }
    else if (!loc.inNode) { const lane = loc.lane; segs.push({ path: lane.path, from: loc.s, base: 0 }); if (st.next) { const b = lane.path.len - loc.s; segs.push({ path: st.next.path, from: 0, base: b }, { path: st.next.outLane.path, from: 0, base: b + st.next.path.len }); } }
    const ahead = (x, y, w) => { for (const sg of segs) { const pr = projectOn(sg.path, x, y); if (pr.dist < w && pr.s >= sg.from - 0.3) { const a = sg.base + pr.s - sg.from; if (a > 0.5 && a < 50) return a; } } return null; };
    for (const c of sim.traffic.cars) { if (Math.abs(c.x - p.x) > 55 || Math.abs(c.y - p.y) > 55) continue; const a = ahead(c.x, c.y, 1.7); if (a != null) vT = Math.min(vT, Math.max(0, (a - 6) / 2.2)); }
    for (const c of sim.traffic.cyclists) { if (Math.abs(c.x - p.x) > 30 || Math.abs(c.y - p.y) > 30) continue; const a = ahead(c.x, c.y, 2.2); if (a != null) vT = Math.min(vT, Math.max(0, (a - 4) / 1.5)); }
    for (const q of sim.traffic.allPeds()) { if (Math.abs(q.x - p.x) > 25 || Math.abs(q.y - p.y) > 25) continue; const a = ahead(q.x, q.y, 2.0); if (a != null) vT = Math.min(vT, Math.max(0, (a - 4) / 1.5)); }
    // ratt
    const la = 5 + Math.abs(p.v) * 0.55;
    const tp = targetPoint(loc, la);
    const alpha = angDiff(Math.atan2(tp.y - p.y, tp.x - p.x), p.h);
    const delta = Math.atan2(2 * 2.7 * Math.sin(alpha), la);
    p.input.steer = Math.max(-1, Math.min(1, (delta / 0.62) * (1 + (p.v * p.v) / 150)));
    const aDes = (vT - p.v) * 1.6;
    p.input.gas = aDes > 0 ? Math.min(1, aDes / 2.4) : 0;
    p.input.brake = aDes < -0.15 ? Math.min(1, -aDes / 7) : 0;
  }

  return { step, st };
}
