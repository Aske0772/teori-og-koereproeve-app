// Spilmotor: fysik, aktører, hændelser og sensorens bedømmelse i realtid.
import { SEG, LANE } from './world.js';

export const LEVELS = { minor: 'Mindre fejl', error: 'Fejl', serious: 'Alvorlig fejl', critical: 'Meget alvorlig fejl' };
export const CRITERIA = { orientering: 'Orientering', vigepligt: 'Vigepligt', hastighed: 'Hastighedstilpasning', placering: 'Placering', tegngivning: 'Tegngivning', betjening: 'Betjening' };

const KMH = 3.6;
const MAX_SPEED = 110 / KMH;   // m/s
const ACCEL = 2.6, BRAKE = 7.5, COAST = 0.9, OFFROAD = 9;

export function createGame(route, opts = {}) {
  const g = {
    route, t: 0, over: false, finished: false, abortReason: null,
    player: { z: 0, x: 0.74, speed: 0, steer: 0, blinker: null, blinkerSince: 0 },
    input: { gas: false, brake: false, steer: 0 },
    actors: opts.ghost ? [] : route.actors.map(a => ({ ...a, hidden: false })),
    looks: {},            // 'rear' | 'left' | 'right' | 'shoulderLeft' | 'shoulderRight' -> tidspunkt
    notes: [],            // sensorens notater
    cue: null, cueUntil: 0,
    flash: null, flashUntil: 0,
    lights: {},           // id -> state
    bgShift: 0, curveAtPlayer: 0,
    stats: { maxSpeed: 0, distance: 0, time: 0 },
    showFaults: opts.showFaults !== false,
    onCue: opts.onCue || (() => {}),
    onNote: opts.onNote || (() => {}),
    onEnd: opts.onEnd || (() => {}),
  };
  const ev = route.events.map(e => ({ ...e, state: {} }));
  const dedupe = {};

  function note(criterion, level, text, key, extra = {}) {
    const k = key || text;
    if (dedupe[k] && g.t - dedupe[k] < 8) return;
    dedupe[k] = g.t;
    const n = { criterion, level, text, t: g.t, seg: Math.floor(g.player.z / SEG), ...extra };
    g.notes.push(n);
    if (g.showFaults) { g.flash = n; g.flashUntil = g.t + 3.2; }
    g.onNote(n);
  }
  function cue(text, ms = 4500) { g.cue = text; g.cueUntil = g.t + ms / 1000; g.onCue(text); }
  function look(id) { g.looks[id] = g.t; }
  const lookedSince = (id, secs) => g.looks[id] != null && g.t - g.looks[id] <= secs;
  const seg = () => route.segs[Math.min(route.segs.length - 1, Math.max(0, Math.floor(g.player.z / SEG)))];
  const kmh = () => g.player.speed * KMH;

  function setBlinker(side) {
    const p = g.player;
    p.blinker = p.blinker === side ? null : side;
    p.blinkerSince = g.t;
  }

  // ---------- fysik ----------
  function physics(dt) {
    const p = g.player, inp = g.input;
    const s = seg();
    g.curveAtPlayer = s.curve;
    if (inp.gas) p.speed += ACCEL * dt;
    else if (inp.brake) p.speed -= BRAKE * dt;
    else p.speed -= COAST * dt;
    const offroad = Math.abs(p.x) > 1.0;
    if (offroad && p.speed > 8) p.speed -= OFFROAD * dt;
    p.speed = Math.max(0, Math.min(MAX_SPEED, p.speed));
    // styring + centrifugal
    const sr = p.speed / MAX_SPEED;
    p.steer += (inp.steer - p.steer) * Math.min(1, dt * 10);
    p.x += p.steer * dt * (0.55 + sr * 1.1);
    p.x -= s.curve * sr * sr * dt * 1.9;
    p.x = Math.max(-1.6, Math.min(1.75, p.x));
    p.z += p.speed * dt;
    g.bgShift += s.curve * p.speed * dt * 2.2;
    g.stats.maxSpeed = Math.max(g.stats.maxSpeed, kmh());
    g.stats.distance = p.z; g.stats.time = g.t;
    // automatisk slukning af blink efter sving
    if (p.blinker && g.t - p.blinkerSince > 14) { p.blinker = null; }
  }

  // ---------- aktører ----------
  function actors(dt) {
    const p = g.player;
    for (const a of g.actors) {
      if (a.until != null && p.z / SEG > a.until) { a.hidden = true; continue; }
      if (a.follow) {
        // bilen bag: holder ca. 2,5 s afstand
        const target = p.z - Math.max(12, p.speed * 2.4);
        a.z += (target - a.z) * Math.min(1, dt * 1.5);
        a.x = p.x > 0.2 ? LANE.own : a.x;
        continue;
      }
      if (a.walking) {
        a.x += a.walking * dt * 0.22;
        if ((a.walking > 0 && a.x > 1.7) || (a.walking < 0 && a.x < -1.7)) a.hidden = true;
        continue;
      }
      a.z += a.speed * dt;
      if (a.oncoming && a.z < p.z - 20) a.hidden = true;
      if (!a.oncoming && a.speed > 0 && a.z > p.z + 400) a.hidden = true;
    }
    // kollision
    for (const a of g.actors) {
      if (a.hidden) continue;
      const dz = a.z - p.z, dx = a.x - p.x;
      const w = a.type === 'bus' ? 0.75 : a.type === 'car' ? 0.52 : 0.3;
      const l = a.type === 'bus' ? 11 : a.type === 'car' ? 4.4 : 1.8;
      if (Math.abs(dx) < w && dz > -1.5 && dz < l) {
        abort(a.type === 'cyclist' ? 'Påkørsel af cyklist.' : a.type === 'person' ? 'Påkørsel af fodgænger.' : 'Påkørsel.', a.oncoming ? 'placering' : 'orientering');
        return;
      }
    }
  }

  function abort(text, criterion = 'orientering') {
    if (g.over) return;
    note(criterion, 'critical', `${text} Prøven afbrydes.`, 'abort');
    g.over = true; g.abortReason = text;
    g.player.speed = 0;
    g.onEnd(result());
  }

  // ---------- løbende bedømmelse ----------
  let overLimitSince = null, slowSince = null, lastLimitChange = -99, wrongLaneSince = null, followWarn = 0;
  function continuous(dt) {
    const p = g.player, s = seg(), v = kmh();
    // hastighed over grænsen (3 s nåde efter skilt)
    if (g.t - lastLimitChange > 4) {
      const over = v - s.limit;
      if (over > 2) {
        overLimitSince ??= g.t;
        if (g.t - overLimitSince > 1.5) {
          const pct = over / s.limit;
          const level = pct < 0.1 ? 'minor' : pct < 0.3 ? 'error' : 'serious';
          note('hastighed', level, `${Math.round(v)} km/t i en ${s.limit}-zone.`, 'overlimit' + s.limit + level);
          overLimitSince = g.t;
        }
      } else overLimitSince = null;
      // unødigt langsomt uden grund
      const blocked = g.actors.some(a => !a.hidden && !a.oncoming && a.z > p.z && a.z - p.z < 40 && Math.abs(a.x - p.x) < 0.5);
      const nearEvent = ev.some(e => !e.state.done && Math.abs(e.seg * SEG - p.z) < 60 && ['stop', 'yield', 'zebra', 'light', 'turn', 'roundabout', 'park', 'bus'].includes(e.type));
      if (v < s.limit * 0.6 && v > 5 && !blocked && !nearEvent && !p.blinker) {
        slowSince ??= g.t;
        if (g.t - slowSince > 7) { note('hastighed', 'error', `Unødigt lav hastighed: ${Math.round(v)} km/t, hvor ${s.limit} var muligt.`, 'slow'); slowSince = g.t; }
      } else slowSince = null;
    }
    // placering: i modkørende bane uden grund
    const parkedAhead = s.parkedRight;
    if (p.x < 0.05 && v > 10 && !parkedAhead && !p.blinker) {
      wrongLaneSince ??= g.t;
      if (g.t - wrongLaneSince > 1.2) { note('placering', p.x < -0.3 ? 'serious' : 'error', 'Du kører over midten uden grund.', 'wronglane'); wrongLaneSince = g.t; }
    } else wrongLaneSince = null;
    // placering: i rabatten/fortovet
    if (p.x > 1.0 && v > 8 && !s.cyclePath) note('placering', 'serious', 'Højre hjul uden for kørebanen.', 'offroadR');
    if (p.x > 1.0 && v > 8 && s.cyclePath) note('placering', 'critical', 'Du kører på cykelstien.', 'oncycle');
    if (p.x < -1.0 && v > 8) note('placering', 'serious', 'Venstre hjul uden for kørebanen.', 'offroadL');
    // afstand til forankørende: under 2 sekunder
    for (const a of g.actors) {
      if (a.hidden || a.oncoming || a.z <= p.z || Math.abs(a.x - p.x) > 0.45) continue;
      const gap = a.z - p.z, secs = gap / Math.max(0.1, p.speed);
      if (p.speed > 6 && secs < 1.4 && a.speed > 2) {
        if (g.t - followWarn > 6) { note('hastighed', 'error', `Afstand til forankørende under ${secs.toFixed(1).replace('.', ',')} sekund.`, 'follow'); followWarn = g.t; }
      }
    }
    // blink glemt tændt i lang tid
    if (p.blinker && g.t - p.blinkerSince > 11) note('tegngivning', 'minor', 'Blinklyset har været tændt uden grund.', 'blinkon');
  }

  // ---------- hændelser ----------
  function events() {
    const p = g.player, v = kmh(), zSeg = p.z / SEG;
    for (const e of ev) {
      const st = e.state;
      if (st.done) continue;
      const d = e.seg - zSeg;   // segmenter til hændelsen
      switch (e.type) {
        case 'start':
          if (!st.said) { st.said = true; cue(e.text, 6000); }
          if (p.speed > 1.5 && !st.checked) {
            st.checked = true;
            if (!lookedSince('rear', 6) || !lookedSince('left', 6)) note('orientering', 'error', 'Igangsætning uden at kigge i spejlene.', 'start-mirror');
            if (!lookedSince('shoulderLeft', 6)) note('orientering', 'serious', 'Igangsætning uden skulderblik til venstre.', 'start-shoulder');
            if (p.blinker !== 'left') note('tegngivning', 'error', 'Igangsætning uden at blinke til venstre.', 'start-blink');
            st.done = true;
          }
          break;
        case 'cue':
          if (d < 0.5) { cue(e.text); st.done = true; }
          break;
        case 'limit':
          if (d < 0.5) { lastLimitChange = g.t; st.done = true; }
          break;
        case 'zone':
          if (zSeg >= e.from && zSeg <= e.to && v > e.maxSpeed && !st.noted) { st.noted = true; note(e.criterion, e.level, e.text, 'zone' + e.seg); }
          if (zSeg > e.to) st.done = true;
          break;
        case 'zebra': {
          if (d < 24 && !st.ped) {
            st.ped = { type: 'person', x: e.pedestrianFrom === 'right' ? 1.5 : -1.5, z: e.seg * SEG, speed: 0, walking: e.pedestrianFrom === 'right' ? -1 : 1, color: '#7a4f9e' };
            g.actors.push(st.ped);
            route.segs[e.seg].mark = 'zebra'; route.segs[e.seg + 1].mark = 'zebra';
          }
          if (st.ped && d < 0.6) {
            const onRoad = Math.abs(st.ped.x) < 1.05 && !st.ped.hidden;
            if (onRoad && v > 6) note('vigepligt', 'critical', 'Fodgængeren var i feltet, og du kørte igennem.', 'zebra');
            else if (st.ped.x > 1.05 && st.ped.x < 1.5 && v > 25) note('vigepligt', 'serious', 'Fodgænger på vej ud i feltet, og du satte ikke farten ned.', 'zebra-slow');
            st.done = true;
          }
          break;
        }
        case 'turn': {
          if (d < 14 && !st.armed) st.armed = true;
          if (st.armed && d < 0.8) {
            const side = e.dir, mirror = side, shoulder = side === 'right' ? 'shoulderRight' : 'shoulderLeft';
            if (p.blinker !== side) note('tegngivning', 'error', `Ingen tegn før ${side === 'right' ? 'højre' : 'venstre'}sving.`, 'turn-blink' + e.seg);
            else if (g.t - p.blinkerSince < 1.2) note('tegngivning', 'minor', 'Tegn givet for sent før svinget.', 'turn-late' + e.seg);
            if (!lookedSince('rear', 7)) note('orientering', 'error', 'Ingen orientering i bakspejlet før svinget.', 'turn-rear' + e.seg);
            if (!lookedSince(mirror, 7)) note('orientering', 'error', `Ingen orientering i ${side === 'right' ? 'højre' : 'venstre'} sidespejl før svinget.`, 'turn-mirror' + e.seg);
            if (!lookedSince(shoulder, 5)) note('orientering', 'serious', `Manglende skulderblik til ${side === 'right' ? 'højre' : 'venstre'} før svinget.`, 'turn-shoulder' + e.seg);
            if (v > 32) note('hastighed', v > 45 ? 'serious' : 'error', `${Math.round(v)} km/t ind i svinget.`, 'turn-speed' + e.seg);
            if (side === 'left' && p.x > 0.45) note('placering', 'error', 'Ikke placeret mod midten før venstresving.', 'turn-place' + e.seg);
            if (side === 'right' && p.x < 0.3) note('placering', 'error', 'For langt mod midten før højresving.', 'turn-place' + e.seg);
            if (e.cyclist) {
              const cyc = g.actors.find(a => a.type === 'cyclist' && !a.hidden && Math.abs(a.z - p.z) < 14);
              if (cyc && v > 6) note('vigepligt', 'critical', 'Cyklisten på cykelstien var ved siden af dig, da du drejede.', 'turn-cyc');
            }
            if (e.oncoming) {
              const onc = g.actors.find(a => a.oncoming && !a.hidden && a.z - p.z > -4 && a.z - p.z < 45);
              if (onc && v > 6) note('vigepligt', 'critical', 'Venstresving foran modkørende.', 'turn-onc');
            }
            st.done = true;
          }
          break;
        }
        case 'stop': {
          if (!st.marked) { st.marked = true; route.segs[e.seg].mark = 'stopline'; for (let i = 1; i <= 6; i++) route.segs[e.seg + i].mark = 'cross'; }
          if (d < 26 && !st.car && e.crossCar) { st.car = { type: 'car', x: 2.6, z: (e.seg + 3) * SEG, speed: 0, lateral: -0.55, color: '#b33b3b', cross: true }; g.actors.push(st.car); }
          if (st.car && d < 20) { st.car.x += st.car.lateral * 0.016 * 60 * (1 / 60); if (st.car.x < -2.6) st.car.hidden = true; }
          if (d < 3 && v < 1) st.stopped = true;
          if (d < -0.5) {
            if (!st.stopped) note('vigepligt', 'critical', 'Stopskilt uden fuldt stop.', 'stop' + e.seg);
            const carIn = st.car && !st.car.hidden && Math.abs(st.car.x) < 1.2;
            if (carIn) note('vigepligt', 'critical', 'Du kørte ud foran bilen på den krydsende vej.', 'stop-car');
            st.done = true;
          }
          break;
        }
        case 'yield': {
          if (!st.marked) { st.marked = true; route.segs[e.seg].mark = 'shark'; for (let i = 1; i <= 6; i++) route.segs[e.seg + i].mark = 'cross'; }
          if (d < 22 && !st.car && e.crossCar) { st.car = { type: 'car', x: -2.6, z: (e.seg + 3) * SEG, speed: 0, lateral: 0.5, color: '#7a8891', cross: true }; g.actors.push(st.car); }
          if (st.car && d < 18 && !st.car.hidden) { st.car.x += st.car.lateral / 60; if (st.car.x > 2.6) st.car.hidden = true; }
          if (d < -0.5) {
            const carIn = st.car && !st.car.hidden && st.car.x > -1.6 && st.car.x < 1.2;
            if (carIn) note('vigepligt', 'critical', 'Ubetinget vigepligt: du kørte ud foran bilen fra venstre.', 'yield-car');
            else if (v > 22) note('vigepligt', 'error', `${Math.round(v)} km/t over hajtænderne, uden at have vist, at du kunne standse.`, 'yield-speed');
            st.done = true;
          }
          break;
        }
        case 'light': {
          const L = (g.lights[e.id] ??= { state: 'green', since: 0 });
          const sp = route.segs.flatMap(s => s.sprites).find(s => s.type === 'light' && s.id === e.id);
          if (!st.marked) { st.marked = true; route.segs[e.seg].mark = 'stopline'; for (let i = 1; i <= 6; i++) route.segs[e.seg + i].mark = 'cross'; }
          if (L.state === 'green' && zSeg >= e.yellowAt && !st.turned) { st.turned = true; L.state = 'yellow'; L.since = g.t; st.vAtYellow = v; st.dAtYellow = d; }
          if (L.state === 'yellow' && g.t - L.since > 2.2) { L.state = 'red'; L.since = g.t; }
          if (L.state === 'red' && d < 3 && v < 1) { st.waited ??= g.t; if (g.t - st.waited > 2.5) { L.state = 'redyellow'; L.since = g.t; } }
          if (L.state === 'redyellow' && g.t - L.since > 1) { L.state = 'green'; }
          if (sp) sp.state = L.state;
          if (d < -0.5) {
            if (L.state === 'red') note('vigepligt', 'critical', 'Kørsel mod rødt.', 'red');
            else if (L.state === 'yellow' && st.dAtYellow > 7 && st.vAtYellow < 55) note('vigepligt', 'serious', 'Gult lys, hvor du kunne have standset.', 'yellow');
            st.done = true;
          }
          break;
        }
        case 'roundabout': {
          if (!st.marked) { st.marked = true; route.segs[e.seg].mark = 'shark'; for (let i = 2; i <= 14; i++) route.segs[e.seg + i].mark = i === 8 ? 'islandCenter' : 'island'; }
          if (d < 0.5 && !st.entered) {
            st.entered = true;
            const circ = g.actors.find(a => a.oncoming && !a.hidden && a.z - p.z > -6 && a.z - p.z < 30);
            if (circ && v > 5) note('vigepligt', 'critical', 'Du kørte ind i rundkørslen foran en bil, der var i den.', 'rb-car');
            if (v > 30) note('hastighed', 'serious', `${Math.round(v)} km/t ind i rundkørslen.`, 'rb-speed');
            if (!lookedSince('left', 6)) note('orientering', 'error', 'Ingen orientering til venstre før rundkørslen.', 'rb-look');
          }
          if (st.entered && zSeg > e.exitAt - 4 && !st.exitChecked) {
            st.exitChecked = true;
            if (p.blinker !== 'right') note('tegngivning', 'error', 'Ingen tegn til højre før udkørsel af rundkørslen.', 'rb-blink');
            if (!lookedSince('right', 5)) note('orientering', 'error', 'Ingen orientering i højre sidespejl før udkørsel.', 'rb-mirror');
          }
          if (zSeg > e.exitAt + 2) st.done = true;
          break;
        }
        case 'bus': {
          const bus = g.actors.find(a => a.id === 'bus1');
          if (d < 0.5 && bus && !st.blink) { st.blink = true; bus.blinker = 'left'; st.blinkAt = g.t; }
          if (st.blink && g.t - st.blinkAt > 1.6 && bus.speed === 0) { bus.speed = 6; }
          if (st.blink && bus.speed > 0) { bus.x += (LANE.own - bus.x) * 0.02; bus.speed = Math.min(12, bus.speed + 0.05); }
          if (st.blink && p.z > bus.z - 2 && !st.judged) {
            st.judged = true;
            if (v > 30 && p.x < 0.15) note('vigepligt', 'serious', 'Bussen blinkede ud, og du pressede dig forbi.', 'bus');
            else if (v > 38) note('vigepligt', 'error', 'Du gav ikke bussen plads til at køre ud.', 'bus2');
            st.done = true;
          }
          if (st.blink && p.z > bus.z + 40) st.done = true;
          break;
        }
        case 'overtake': {
          const cyc = g.actors.find(a => a.type === 'cyclist' && !a.hidden && a.z > p.z - 6 && a.z < p.z + 60);
          if (cyc && Math.abs(cyc.z - p.z) < 3 && !st.judged) {
            st.judged = true;
            const gap = cyc.x - p.x;
            const onc = g.actors.find(a => a.oncoming && !a.hidden && a.z - p.z > -8 && a.z - p.z < 90);
            if (gap < 0.55) note('placering', 'critical', 'Overhaling af cyklist uden sikker afstand (under 1,5 m).', 'ot-gap');
            else if (onc) note('placering', 'serious', 'Overhaling af cyklist med modkørende.', 'ot-onc');
          }
          if (cyc && cyc.z - p.z > 0 && cyc.z - p.z < 25 && p.speed > 12 && Math.abs(cyc.x - p.x) < 0.4) note('hastighed', 'error', 'For tæt på cyklisten uden at sætte farten ned.', 'ot-close');
          if (p.z > e.cyclistZ + 200) st.done = true;
          break;
        }
        case 'park': {
          if (d < 0.5 && !st.armed) st.armed = true;
          if (st.armed && v < 0.5 && p.speed === 0 && !st.judged) {
            st.judged = true;
            if (p.x < 0.72) note('placering', 'error', 'Standset for langt fra kantstenen.', 'park-x');
            if (p.blinker !== 'right' && !(g.t - p.blinkerSince < 4)) note('tegngivning', 'error', 'Ingen tegn til højre før standsning.', 'park-blink');
            if (!lookedSince('rear', 8)) note('orientering', 'error', 'Ingen orientering i bakspejlet før standsning.', 'park-rear');
            if (!lookedSince('right', 8) && !lookedSince('shoulderRight', 8)) note('orientering', 'error', 'Ingen orientering til højre før standsning.', 'park-right');
            cue('Tak. Så holder vi her.');
            st.done = true; finish();
          }
          if (zSeg > e.until && !st.judged) { note('betjening', 'error', 'Du kørte forbi stedet, hvor du skulle standse.', 'park-miss'); st.done = true; finish(); }
          break;
        }
      }
    }
    if (p.z / SEG >= route.segs.length - 2 && !g.finished) finish();
  }

  function finish() {
    if (g.finished) return;
    g.finished = true; g.over = true;
    g.onEnd(result());
  }

  // ---------- dom ----------
  function result() {
    const n = k => g.notes.filter(x => x.level === k).length;
    const critical = n('critical'), serious = n('serious'), error = n('error'), minor = n('minor');
    const byCrit = {};
    for (const x of g.notes) byCrit[x.criterion] = (byCrit[x.criterion] || 0) + (x.level === 'minor' ? 0.5 : 1);
    const repeated = Object.entries(byCrit).find(([, v]) => v >= 3.5);
    let reason = null;
    if (g.abortReason) reason = 'Prøven blev afbrudt: ' + g.abortReason;
    else if (critical) reason = 'En meget alvorlig fejl er i sig selv afgørende.';
    else if (serious >= 2) reason = 'To alvorlige fejl bliver tilsammen afgørende.';
    else if (serious === 1 && error + minor >= 3) reason = 'En alvorlig fejl sammen med flere andre fejl bliver afgørende.';
    else if (error >= 5) reason = 'Mange fejl, selv om ingen var alvorlig.';
    else if (repeated) reason = `Gentagne fejl i samme område (${CRITERIA[repeated[0]]}).`;
    const score = Math.max(0, Math.round(100 - minor * 3 - error * 7 - serious * 18 - critical * 45));
    const perCrit = {};
    for (const c of Object.keys(CRITERIA)) perCrit[c] = { minor: 0, error: 0, serious: 0, critical: 0 };
    for (const x of g.notes) perCrit[x.criterion][x.level]++;
    return { passed: !reason, reason, score, critical, serious, error, minor, perCrit, notes: g.notes, stats: { ...g.stats }, aborted: !!g.abortReason };
  }

  // ---------- tick ----------
  function update(dt) {
    if (g.over) { g.t += dt; return; }
    g.t += dt;
    if (opts.ghost) { physics(dt); if (g.player.z / SEG >= route.segs.length - 3) { g.player.z = 0; } return; }
    physics(dt);
    actors(dt);
    if (g.over) return;
    continuous(dt);
    events();
  }

  return { g, update, look, setBlinker, result, cue };
}
