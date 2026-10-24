// Sensoren: giver anvisninger på prøveruten og bedømmer din kørsel løbende.
import { judge } from './rules.js';
import { dot, pointAt, projectOn } from './geom.js';
import { lightState, otherHasPriority, relation, bfs } from './network.js';
import { CAR_L } from './traffic.js';

export function createExaminer({ net, traffic, player: p }, opts = {}) {
  const mode = opts.mode || 'exam';
  const E = { t: 0, notes: [], over: false, aborted: null, maxV: 0, result: null, queue: mode === 'exam' ? net.examRoute.slice() : null, pull: null };
  const dd = {};

  function note(criterion, level, text, key, win = 6) {
    const k = key || text;
    if (dd[k] != null && E.t - dd[k] < win) return;
    dd[k] = E.t;
    const n = { criterion, level, text, t: E.t };
    E.notes.push(n);
    opts.onNote && opts.onNote(n);
  }
  const cue = text => opts.onCue && opts.onCue(text);
  const lookedIn = (id, from, to) => (p.lookLog[id] || []).some(v => v >= from && v <= to);

  // tilstand
  let lastLane = null, lastLat = 0, lastS = 0, laneEnterT = 0, prevLimit = 50;
  let curNode = null, snap = null, nodeMaxV = 0, visit = 0, instructedVisit = -1;
  let minVNearEnd = 99, holdT = 0, overT = 0, slowT = 0, followT = 0, leftT = 0, hardT = 0;
  let blinkLongT = 0, pulledOutT = null, startJudged = false, yellowInfo = null, lastLightSt = null, lastBlinkRightT = -99;

  function finish() {
    if (E.result) return;
    E.over = true;
    E.result = { ...judge(E.notes, E.aborted), stats: { time: E.t, distance: p.odo, maxSpeed: E.maxV } };
    opts.onEnd && opts.onEnd(E.result);
  }
  function abort(text, crit) { note(crit, 'critical', text + ' Prøven afbrydes.', 'abort'); E.aborted = text; p.v = 0; finish(); }

  function playerLeader(loc) {
    if (loc.inNode) return null;
    let best = null;
    for (const c of traffic.cars) {
      if (c.conn || c.lane !== loc.lane || c.s <= loc.s) continue;
      const f = c.s - loc.s;
      if (f < 45 && (!best || f < best.f)) best = { f, c };
    }
    return best;
  }

  // ---------- påkørsler og underlag ----------
  function collisions() {
    const fx = Math.cos(p.h), fy = Math.sin(p.h);
    const pc = [{ x: p.x + fx * 1.2, y: p.y + fy * 1.2 }, { x: p.x - fx * 1.2, y: p.y - fy * 1.2 }];
    for (const c of traffic.cars) {
      if (Math.abs(c.x - p.x) > 8 || Math.abs(c.y - p.y) > 8) continue;
      const cx = Math.cos(c.h), cy = Math.sin(c.h);
      const cc = [{ x: c.x + cx * 1.2, y: c.y + cy * 1.2 }, { x: c.x - cx * 1.2, y: c.y - cy * 1.2 }];
      for (const a of pc) for (const b of cc) if (Math.hypot(a.x - b.x, a.y - b.y) < 1.85) return abort('Påkørsel af en anden bil.', 'orientering');
    }
    for (const c of traffic.cyclists) for (const a of pc) if (Math.hypot(a.x - c.x, a.y - c.y) < 1.35) return abort('Påkørsel af en cyklist.', 'orientering');
    if (Math.abs(p.v) > 0.4) for (const q of traffic.allPeds()) for (const a of pc) if (Math.hypot(a.x - q.x, a.y - q.y) < 1.25) return abort('Påkørsel af en fodgænger.', 'vigepligt');
    if (Math.abs(p.v) > 2) for (const c of traffic.cyclists) for (const a of pc) if (Math.hypot(a.x - c.x, a.y - c.y) < 2.4) note('placering', 'serious', 'Alt for tæt på en cyklist.', 'nearcyc', 8);
  }
  function surfaceRules(loc) {
    const s = loc.surface;
    if (s === 'building') return abort('Du kørte ud over fortovet og ind i en have.', 'placering');
    if (Math.abs(p.v) > 1) {
      if (s === 'walk' || s === 'verge') note('placering', 'serious', 'Du kørte op på fortovet.', 'walk', 10);
      else if (s === 'cycle') note('placering', 'serious', 'Du kørte på cykelstien.', 'cyclepath', 10);
      else if (s === 'island') note('placering', 'serious', 'Du kørte op på rundkørslens midterø.', 'island', 10);
    }
  }

  // ---------- løbende regler ----------
  function continuous(loc, dt, kmh) {
    const limit = lastLane ? lastLane.limit : 50;
    const grace = limit < prevLimit && E.t - laneEnterT < 2.5;
    if (!grace && kmh > limit * 1.03 + 1) {
      overT += dt;
      if (overT > 1.5) {
        const pct = (kmh - limit) / limit;
        const lvl = pct < 0.1 ? 'minor' : pct < 0.2 ? 'error' : pct < 0.35 ? 'serious' : 'critical';
        note('hastighed', lvl, `${Math.round(kmh)} km/t, hvor grænsen er ${limit}.`, `over-${lastLane && lastLane.id}-${lvl}`, 25);
        overT = 0;
      }
    } else overT = Math.max(0, overT - dt);

    const lead = playerLeader(loc);
    if (!loc.inNode && lastLane && kmh > 3 && kmh < limit * 0.55 && !E.pull) {
      const d = lastLane.path.len - loc.s;
      const zebraNear = lastLane.zebras.some(z => z.s > loc.s && z.s - loc.s < 40);
      const gate = d < 45 && lastLane.control !== 'none';
      if (!lead && !zebraNear && !gate && !p.blinker) {
        slowT += dt;
        if (slowT > 9) { note('hastighed', 'minor', `Unødig lav hastighed: ${Math.round(kmh)} km/t, hvor ${limit} var muligt.`, 'slow-' + lastLane.id, 40); slowT = 0; }
      } else slowT = 0;
    } else slowT = 0;

    if (lead && p.v > 5) {
      const secs = (lead.f - CAR_L) / p.v;
      if (secs < 1.0) {
        followT += dt;
        if (followT > 1.5) { note('hastighed', secs < 0.6 ? 'serious' : 'error', `For kort afstand til bilen foran (${secs.toFixed(1).replace('.', ',')} s). Hold mindst 2 sekunder.`, 'follow', 15); followT = 0; }
      } else followT = 0;
    } else followT = 0;

    if (!loc.inNode && p.v > 3 && pulledOutT != null && !E.pull) {
      if (loc.lat < -1.5) {
        leftT += dt;
        if (leftT > 0.8) { const wrong = loc.lat < -3.0; note('placering', wrong ? 'serious' : 'error', wrong ? 'Du kørte i modkørende vognbane.' : 'Du kørte over midterstriben.', wrong ? 'wrongside' : 'center', 12); leftT = 0; }
      } else leftT = 0;
      if (loc.lat > 1.4 && loc.surface === 'road') note('placering', 'error', 'Højre hjul på kantstenen.', 'curb', 15);
    }

    if (p.accel < -5 && p.v > 2) {
      hardT += dt;
      if (hardT > 0.35) {
        const fx = Math.cos(p.h), fy = Math.sin(p.h);
        const behind = traffic.cars.some(c => { const dx = c.x - p.x, dy = c.y - p.y, f = dx * fx + dy * fy, l = -dx * fy + dy * fx; return f < -3 && f > -25 && Math.abs(l) < 1.8; });
        if (behind && !lookedIn('rear', E.t - 5, E.t)) note('orientering', 'error', 'Hård opbremsning uden at kigge i bakspejlet, med en bil lige bag dig.', 'hardbrake', 15);
        hardT = 0;
      }
    } else hardT = 0;

    const farFromNode = !loc.inNode && lastLane && lastLane.path.len - loc.s > 55;
    if (p.blinker && p.v > 3 && farFromNode) { blinkLongT += dt; if (blinkLongT > 6) { note('tegngivning', 'minor', 'Blinklyset har været tændt længe uden grund.', 'blinklong', 25); blinkLongT = 0; } }
    else if (!p.blinker) blinkLongT = 0;
  }

  function startRule() {
    if (pulledOutT == null && Math.abs(p.v) > 0.8) {
      pulledOutT = E.t;
      const fx = Math.cos(p.h), fy = Math.sin(p.h);
      const threat = traffic.cars.find(c => { if (c.conn) return false; const dx = c.x - p.x, dy = c.y - p.y, f = dx * fx + dy * fy, l = -dx * fy + dy * fx; return f < -2 && f > -45 && Math.abs(l + 1.2) < 2 && (-f) / Math.max(c.v, 0.5) < 3.5; });
      if (threat) note('vigepligt', 'serious', 'Du trak ud fra kantstenen foran en bil, der kom bagfra.', 'start-yield');
    }
    if (pulledOutT != null && !startJudged && E.t > pulledOutT + 0.8) {
      startJudged = true;
      const t0 = pulledOutT;
      if (!(p.blinker === 'left' || (p.blinkerOffSide === 'left' && p.blinkerOffT > t0 - 1))) note('tegngivning', 'error', 'Igangsætning fra kantstenen uden tegn til venstre.', 'start-blink');
      if (!lookedIn('rear', t0 - 8, t0 + 0.8) || !lookedIn('left', t0 - 8, t0 + 0.8)) note('orientering', 'error', 'Igangsætning uden at kigge i bakspejl og venstre sidespejl.', 'start-mirror');
      if (!lookedIn('shoulderLeft', t0 - 6, t0 + 0.8)) note('orientering', 'serious', 'Igangsætning uden skulderblik til venstre.', 'start-shoulder');
    }
  }

  function zebraCheck(loc) {
    for (const z of loc.lane.zebras) if (lastS < z.s && loc.s >= z.s) {
      const peds = z.zebra.peds;
      if (peds.some(q => q.state === 'cross')) note('vigepligt', 'critical', 'Du kørte over fodgængerfeltet, mens en fodgænger var på vej over.', 'zebra' + z.zebra.id + visit);
      else if (peds.some(q => q.state === 'wait' && q.waitT > 1.5)) note('vigepligt', 'serious', 'En fodgænger ventede ved fodgængerfeltet, og du holdt ikke tilbage.', 'zebraw' + z.zebra.id + visit);
    }
  }

  function lightTrack(lane, d) {
    if (lane.control !== 'light' || d > 70) { lastLightSt = null; return; }
    const st = lightState(lane.to, lane);
    if (st === 'yellow' && lastLightSt !== 'yellow') yellowInfo = { node: lane.to, canStop: d > (p.v * p.v) / (2 * 3.2) + p.v * 0.6 + 1 };
    lastLightSt = st;
  }

  function conflictNow(lane) {
    const node = lane.to, myTurn = p.blinker || 'straight';
    for (const c of traffic.cars) {
      if (c.nodeId === node.id) return true;
      if (c.approachLane && c.approachLane.to === node && c.approachLane !== lane && c.dist < 70 && c.dist / Math.max(c.v, 0.5) < 6 && otherHasPriority(node, lane, myTurn, c.approachLane, c.turnGuess)) return true;
    }
    if (lane.cycle && myTurn === 'right') return true;
    const guess = lane.conns.find(c => c.turn === myTurn) || lane.conns[0];
    if (guess && traffic.cyclistCrossing(guess, 4)) return true;
    for (const z of lane.zebras) if (z.s > lane.path.len - 30 && z.zebra.peds.length) return true;
    return false;
  }
  function hesitation(lane, d, dt) {
    const ctl = lane.control;
    const relevant = ctl === 'yield' || ctl === 'stop' || ctl === 'right' || ctl === 'roundabout' || (ctl === 'light' && lightState(lane.to, lane) === 'green');
    if (relevant && d < 12 && Math.abs(p.v) < 0.3) {
      holdT += dt;
      if (holdT > 7) { if (!conflictNow(lane)) note('hastighed', 'minor', 'Unødig venten ved krydset: der var frit.', 'hes-' + lane.id + visit, 60); holdT = 0; }
    } else holdT = 0;
  }

  // ---------- anvisninger ----------
  function instructionText(node, lane, conn) {
    if (node.type === 'roundabout') return `I rundkørslen tager du ${conn.exitIndex}. vej ud.`;
    if (node.type === 'bend' || node.type === 'pass' || conn.turn === 'straight') return null;
    const side = conn.turn === 'right' ? 'højre' : 'venstre';
    const noStraight = !lane.conns.some(c => c.turn === 'straight');
    const where = node.type === 'light' ? 'I lyskrydset' : lane.control === 'stop' ? 'Ved stopskiltet' : noStraight ? 'For enden af vejen' : 'Ved næste kryds';
    return `${where} drejer du til ${side}.`;
  }
  function instructions(lane, d) {
    const q = E.queue;
    if (!q || E.pull || q.length < 2 || lane.to.id !== q[0] || instructedVisit === visit) return;
    const conn = lane.conns.find(c => c.outLane.to.id === q[1]);
    if (!conn || d > Math.max(55, p.v * 6)) return;
    instructedVisit = visit;
    const txt = instructionText(lane.to, lane, conn);
    if (txt) cue(txt);
  }
  function reroute(node, outLane) {
    const q = E.queue;
    let k = q[0] === node.id ? Math.min(2, q.length - 1) : Math.min(1, q.length - 1);
    if (q[k] === '0,3' && q.includes('0,2')) k = q.lastIndexOf('0,2');
    const path = bfs(net, outLane.to.id, q[k], outLane.from.id, new Set(['0,3>0,2', '1,3>0,3']));
    if (path) E.queue = path.concat(q.slice(k + 1));
  }
  function routeExit(node, outLane) {
    const q = E.queue;
    if (!q || E.pull || !outLane) return;
    if (q[0] === node.id && q[1] === outLane.to.id) q.shift();
    else if (q[0] === node.id) { cue('Det er i orden. Vi finder en anden vej.'); reroute(node, outLane); }
    else reroute(node, outLane);
    if (E.queue.length === 1 && outLane.id === net.finalLaneId) {
      E.pull = { lane: outLane, s: net.target.s, stopT: 0 };
      cue('Kør ind til højre og stands ved den røde postkasse.');
    }
  }
  function pullOver(loc, dt) {
    const pl = E.pull;
    if (!pl || loc.lane !== pl.lane) return;
    pl.stopT = Math.abs(p.v) < 0.15 ? pl.stopT + dt : 0;
    if (pl.stopT > 1.2 && loc.s > pl.s - 30) {
      const t = E.t;
      if (loc.s < pl.s - 12) note('betjening', 'minor', 'Du standsede et stykke før postkassen.', 'pullearly');
      if (loc.lat < 0.3) note('placering', 'error', 'Du standsede for langt ude på vejen.', 'pullx');
      else if (loc.lat < 0.8) note('placering', 'minor', 'Lidt langt fra kantstenen.', 'pullx');
      if (t - lastBlinkRightT > 9) note('tegngivning', 'error', 'Ingen tegn til højre, før du kørte ind til siden.', 'pullsig');
      if (!lookedIn('rear', t - 14, t)) note('orientering', 'error', 'Ingen orientering i bakspejlet, før du kørte ind til siden.', 'pullrear');
      if (!lookedIn('right', t - 14, t) && !lookedIn('shoulderRight', t - 14, t)) note('orientering', 'error', 'Ingen orientering til højre, før du kørte ind til siden.', 'pullright');
      cue('Tak. Så holder vi her.');
      finish();
    } else if (loc.s > pl.s + 22) {
      note('betjening', 'error', 'Du kørte forbi postkassen.', 'pullmiss');
      cue('Vi stopper her.');
      finish();
    }
  }

  // ---------- kryds ----------
  function onEnter(node) {
    nodeMaxV = Math.abs(p.v) * 3.6;
    const lane = lastLane;
    snap = { node, t: E.t, inLane: lane, lat: lastLat, blinker: p.blinker, blinkerSince: p.blinkerSince, v: Math.abs(p.v), minV: minVNearEnd, others: [], cyclists: [], rbRight: p.blinker === 'right' ? E.t : null };
    if (!lane || lane.to !== node) return;
    for (const c of traffic.cars) {
      if (c.conn && c.conn.node === node) snap.others.push({ inside: true, lane: c.conn.inLane, turn: c.conn.turn, conn: c.conn, car: c, eta: 0, cx: c.x, cy: c.y, ch: c.h, cv: c.v, r: Math.hypot(c.x - node.x, c.y - node.y) });
      else if (!c.conn && c.lane.to === node && c.lane !== lane) {
        const d = c.lane.path.len - c.s;
        if (d < 60) snap.others.push({ inside: false, lane: c.lane, turn: c.next ? c.next.turn : 'straight', conn: c.next, car: c, eta: d / Math.max(c.v, 0.5), dist: d });
      }
    }
    snap.cycPred = traffic.cyclists.filter(c => Math.hypot(c.x - node.x, c.y - node.y) < 40).map(c => ({ c, path: c.cp.path, s: c.s, v: c.v }));
    if (lane.cycle) {
      const E0 = lane.path.pts[1];
      for (const cy of traffic.cyclists) {
        if (dot(cy.cp.dir, lane.dir) < 0.9) continue;
        const along = (cy.x - E0.x) * lane.dir.x + (cy.y - E0.y) * lane.dir.y;
        const latc = (cy.x - E0.x) * lane.right.x + (cy.y - E0.y) * lane.right.y;
        if (Math.abs(latc - 2.65) > 1.6) continue;
        if (along > -28 && along < 9) snap.cyclists.push({ eta: along < 0 ? -along / Math.max(cy.v, 1) : 0 });
      }
    }
    const ctl = lane.control;
    if (ctl === 'light') {
      const st = lightState(node, lane);
      if ((st === 'red' || st === 'redyellow') && snap.v > 1.5) note('vigepligt', 'critical', 'Kørsel mod rødt lys.', 'red' + visit);
      else if (st === 'yellow' && yellowInfo && yellowInfo.node === node && yellowInfo.canStop) note('vigepligt', 'serious', 'Du kørte over for gult, selvom du kunne nå at standse.', 'yellow' + visit);
    }
    if (ctl === 'stop' && snap.minV > 0.35) note('vigepligt', 'critical', 'Stopskilt: du standsede ikke helt ved stoplinjen.', 'stop' + visit);
  }

  function priorityText(node, lane, o) {
    if (o.inside) return 'Du kørte ind i krydset, mens en anden bil var midt i det.';
    const rel = relation(lane, o.lane);
    if (rel === 'opposite') return node.type === 'light' ? 'Venstresving foran modkørende i lyskrydset.' : 'Venstresving foran modkørende.';
    if (lane.control === 'yield') return 'Ubetinget vigepligt: du kørte ud foran trafikken, du skulle holde tilbage for.';
    if (lane.control === 'stop') return 'Stopskilt: du kørte ud foran trafikken, du skulle holde tilbage for.';
    if (rel === 'right') return 'Højre vigepligt: bilen fra højre skulle frem først.';
    return 'Du holdt ikke tilbage for trafik med forkørselsret.';
  }

  function judgeJunction(sn, conn, node) {
    const turn = conn.turn, lane = sn.inLane, t0 = sn.t;
    if (turn === 'left' || turn === 'right') {
      const da = turn === 'right' ? 'højre' : 'venstre';
      const offOk = p.blinkerOffSide === turn && p.blinkerOffT >= t0 - 0.5;
      if (sn.blinker !== turn && !offOk) note('tegngivning', sn.blinker ? 'serious' : 'error', sn.blinker ? `Forkert tegn: du blinkede til ${sn.blinker === 'right' ? 'højre' : 'venstre'} og drejede til ${da}.` : `Ingen tegn før ${da}sving.`, 'sig' + visit);
      else if (sn.blinker === turn && t0 - sn.blinkerSince < 1.2) note('tegngivning', 'minor', 'Tegn givet for sent før svinget.', 'siglate' + visit);
      const rear = lookedIn('rear', t0 - 8, t0 + 0.5), mir = lookedIn(turn, t0 - 8, t0 + 0.5);
      const sh = lookedIn(turn === 'right' ? 'shoulderRight' : 'shoulderLeft', t0 - 6, t0 + 1.2);
      if (!rear || !mir) note('orientering', 'error', `Ingen orientering i ${!rear && !mir ? 'bakspejl og sidespejl' : !rear ? 'bakspejlet' : 'sidespejlet'} før svinget.`, 'mir' + visit);
      if (!sh) note('orientering', turn === 'right' && lane.cycle ? 'serious' : 'error', `Manglende skulderblik til ${da} før svinget.`, 'sh' + visit);
      const lim = turn === 'right' ? 22 : 28;
      if (nodeMaxV > lim + 10) note('hastighed', 'serious', `${Math.round(nodeMaxV)} km/t gennem svinget.`, 'tspd' + visit);
      else if (nodeMaxV > lim) note('hastighed', 'error', `${Math.round(nodeMaxV)} km/t gennem svinget. For hurtigt til at kunne se og standse.`, 'tspd' + visit);
      if (turn === 'left' && sn.lat > 0.35) note('placering', 'error', 'Du var ikke placeret mod midten før venstresvinget.', 'pl' + visit);
      if (turn === 'right' && sn.lat < -0.8) note('placering', 'error', 'Du var for langt ude mod midten før højresvinget.', 'pl' + visit);
    } else if (sn.blinker && t0 - sn.blinkerSince > 1) {
      note('tegngivning', 'minor', 'Blinklyset var tændt, selvom du kørte ligeud. Det vildleder andre.', 'sigstr' + visit);
    }
    let worst = null;
    for (const o of sn.others) {
      if (o.inside && o.r > 6.5) continue;
      if (o.conn && !conn.conflicts.has(o.conn.id)) continue;
      const pri = o.inside ? o.lane !== lane : otherHasPriority(node, lane, turn, o.lane, o.turn);
      if (!pri || (!o.inside && o.eta > 3.2)) continue;
      const braked = o.car.hardBrakeT != null && o.car.hardBrakeT >= sn.t - 0.5;
      const lvl = o.inside || o.eta < 1.8 || braked ? 'critical' : 'serious';
      if (!worst || (lvl === 'critical' && worst.lvl !== 'critical')) worst = { o, lvl };
    }
    if (worst) note('vigepligt', worst.lvl, priorityText(node, lane, worst.o), 'pri' + visit);
    if (turn === 'right' && lane.cycle && sn.cyclists.some(c => c.eta < 2.5)) note('vigepligt', 'critical', 'Højresving foran en cyklist på cykelstien.', 'cyc' + visit);
    else if (cyclistCut(sn, conn)) note('vigepligt', 'critical', 'Du holdt ikke tilbage for cyklisten på cykelstien.', 'cyc' + visit);
  }

  // kørte jeg over cyklistens bane lige foran cyklisten?
  function cyclistCut(sn, conn) {
    const dur = Math.max(0.5, E.t - sn.t);
    for (const k of sn.cycPred || []) {
      for (let tt = 0; tt <= dur + 1.2; tt += 0.3) {
        const q = pointAt(k.path, k.s + k.v * tt);
        const pr = projectOn(conn.path, q.x, q.y);
        if (pr.dist < 2.0 && pr.s > 0.5 && pr.s < conn.path.len - 0.5) {
          const myT = (pr.s / conn.path.len) * dur;
          if (Math.abs(myT - tt) < 1.1) return true;
        }
      }
    }
    return false;
  }

  function judgeRoundabout(sn, conn) {
    if (sn.v * 3.6 > 30) note('hastighed', 'serious', `${Math.round(sn.v * 3.6)} km/t ind i rundkørslen.`, 'rbspd' + visit);
    const ring = sn.others.find(o => o.inside && o.lane !== sn.inLane && traffic.ringConflict({ kind: 'car', x: o.cx, y: o.cy, h: o.ch, v: o.cv, conn: o.conn }, conn, 2.2));
    if (ring) note('vigepligt', 'critical', 'Du kørte ind i rundkørslen foran en bil, der allerede var i den.', 'rbpri' + visit);
    else if (sn.others.some(o => o.car.hardBrakeT != null && o.car.hardBrakeT >= sn.t - 0.5)) note('vigepligt', 'critical', 'En bil måtte bremse hårdt for dig i rundkørslen.', 'rbpri' + visit);
    const rb = sn.rbRight;
    const offOk = p.blinkerOffSide === 'right' && E.t - p.blinkerOffT < 3;
    if ((rb == null || E.t - rb > 4) && !offOk) note('tegngivning', 'error', 'Ingen tegn til højre, før du forlod rundkørslen.', 'rbsig' + visit);
    if (!lookedIn('right', E.t - 6, E.t) && !lookedIn('shoulderRight', E.t - 6, E.t)) note('orientering', 'error', 'Ingen orientering til højre, før du forlod rundkørslen.', 'rbmir' + visit);
    if (nodeMaxV > 34) note('hastighed', 'error', `${Math.round(nodeMaxV)} km/t i rundkørslen.`, 'rbmax' + visit);
  }

  function onExit(node, outLane) {
    visit++;
    const sn = snap;
    snap = null;
    if (sn && sn.inLane && outLane && sn.inLane.to === node && outLane.from === node) {
      const conn = sn.inLane.conns.find(c => c.outLane === outLane);
      if (!conn) note('placering', 'error', 'Du vendte i krydset.', 'uturn' + visit);
      else if (node.type === 'roundabout') judgeRoundabout(sn, conn);
      else if (node.type === 'junction' || node.type === 'light') judgeJunction(sn, conn, node);
    }
    routeExit(node, outLane);
  }

  // ---------- hovedløkke ----------
  function update(dt, loc) {
    if (E.over) return;
    E.t += dt;
    const kmh = Math.abs(p.v) * 3.6;
    E.maxV = Math.max(E.maxV, kmh);
    if (p.blinker === 'right') lastBlinkRightT = E.t;
    collisions(); if (E.over) return;
    surfaceRules(loc); if (E.over) return;

    if (!loc.inNode) {
      if (loc.lane !== lastLane) { prevLimit = lastLane ? lastLane.limit : loc.lane.limit; laneEnterT = E.t; minVNearEnd = 99; holdT = 0; lastS = loc.s; }
      else zebraCheck(loc);
      lastLane = loc.lane; lastLat = loc.lat; lastS = loc.s;
      const d = loc.lane.path.len - loc.s;
      if (d < 8) minVNearEnd = Math.min(minVNearEnd, Math.abs(p.v));
      lightTrack(loc.lane, d);
      hesitation(loc.lane, d, dt);
      instructions(loc.lane, d);
      pullOver(loc, dt);
      if (E.over) return;
    }
    if (loc.inNode && curNode !== loc.node) { if (curNode) onExit(curNode, null); curNode = loc.node; onEnter(loc.node); }
    if (!loc.inNode && curNode) { const n = curNode; curNode = null; onExit(n, loc.lane); }
    if (curNode) { nodeMaxV = Math.max(nodeMaxV, kmh); if (p.blinker === 'right' && snap) snap.rbRight = E.t; }
    continuous(loc, dt, kmh);
    startRule();
  }

  return { E, update, finish, cue, get nextNodeId() { return E.queue ? E.queue[0] : null; } };
}
