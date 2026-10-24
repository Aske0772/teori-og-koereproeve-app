// Ruter. Hændelser ("events") er det, sensoren bedømmer; sprites er kulisser.
import { RouteBuilder, LANE } from '../engine/world.js';

// Bytur: ca. 3,2 km, 5–6 minutter. Alt det, køreskolerne siger folk dumper på.
export function bytur() {
  const r = new RouteBuilder().setEnv('by').setLimit(50);

  // 0–60: igangsætning fra kantstenen på en villavej med parkerede biler
  r.straight(60, { parkedRight: true });
  r.event(0, { type: 'start', text: 'Goddag. Sæt i gang, når du er klar. Vi kører ligeud.' });
  r.decorate(6, 58, 9, 'parkedCar', 1.12);
  r.decorate(2, 60, 14, 'lamp', LANE.far);
  r.actor({ type: 'car', lane: LANE.own, z: -60, speed: 0, follow: true, color: '#4b5563' });   // bilen bag dig
  // almindelig modkørende trafik i byen
  for (const [z, c] of [[150, '#9aa3ab'], [320, '#d9d5cc'], [900, '#3b4650'], [1250, '#b8b0a2'], [1700, '#9aa3ab'], [2150, '#d9d5cc'], [3100, '#7a8891']]) r.actor({ type: 'car', lane: LANE.oncoming, z, speed: -38, color: c, oncoming: true });

  // 60–100: fodgængerfelt
  r.straight(40);
  r.sprite(78, 'sign', LANE.sidewalk, { sign: 'fodgaenger' });
  r.event(84, { type: 'zebra', pedestrianFrom: 'right', text: null });
  r.decorate(62, 100, 12, 'tree', LANE.far, { size: 0.8 });

  // 100–150: højresving med cykelsti og cyklist bagfra
  r.straight(28, { cyclePath: true });
  r.sprite(104, 'sign', LANE.sidewalk, { sign: 'cykelsti' });
  r.event(104, { type: 'cue', text: 'Ved næste vej drejer du til højre.' });
  r.event(128, { type: 'turn', dir: 'right', cyclist: true });
  r.actor({ type: 'cyclist', lane: LANE.cycle, z: 128 * 5 - 90, speed: 22, until: 140 });
  r.curve(22, 1.6, { cyclePath: true });

  // 150–195: skolevej, børn ved vejen
  r.straight(45);
  r.sprite(156, 'sign', LANE.sidewalk, { sign: 'skole' });
  r.sprite(168, 'child', LANE.sidewalk + 0.1);
  r.sprite(171, 'child', LANE.sidewalk + 0.25, { color: '#2f7d9a' });
  r.sprite(176, 'child', LANE.sidewalk);
  r.event(160, { type: 'zone', from: 160, to: 185, maxSpeed: 40, criterion: 'hastighed', level: 'error', text: 'Børn ved vejen: farten skal ned, også selv om skiltet siger 50.' });
  r.decorate(150, 195, 15, 'lamp', LANE.far);

  // 195–235: stopskilt i kryds
  r.straight(40);
  r.sprite(224, 'sign', LANE.sidewalk, { sign: 'stop' });
  r.event(226, { type: 'cue', text: 'Kør ligeud over krydset.' });
  r.event(230, { type: 'stop', crossCar: true });
  r.decorate(196, 230, 10, 'tree', LANE.far, { size: 0.9 });

  // 235–290: venstresving med modkørende
  r.straight(32);
  r.event(240, { type: 'cue', text: 'Ved næste kryds drejer du til venstre.' });
  r.event(267, { type: 'turn', dir: 'left', oncoming: true });
  r.actor({ type: 'car', lane: LANE.oncoming, z: 267 * 5 + 230, speed: -40, color: '#d9d5cc', oncoming: true });
  r.curve(24, -1.6);

  // 290–340: lyskryds (gult)
  r.straight(50);
  r.sprite(330, 'light', LANE.sidewalk, { id: 'L1' });
  r.event(331, { type: 'light', id: 'L1', yellowAt: 318 });
  r.decorate(292, 330, 12, 'lamp', LANE.far);

  // 340–400: rundkørsel, anden vej ud
  r.straight(30);
  r.sprite(360, 'sign', LANE.sidewalk, { sign: 'rundkoersel' });
  r.event(344, { type: 'cue', text: 'I rundkørslen tager du anden vej ud.' });
  r.event(370, { type: 'roundabout', exitAt: 392 });
  r.actor({ type: 'car', lane: LANE.oncoming, z: 370 * 5 + 120, speed: -22, color: '#2f7d9a', oncoming: true, until: 372 });
  r.curve(12, 1.2).curve(16, -1.8).curve(12, 1.2);

  // 400–450: busstoppested
  r.straight(50);
  r.sprite(428, 'sign', LANE.sidewalk, { sign: 'busstop' });
  r.event(412, { type: 'bus', busAt: 430 });
  r.actor({ type: 'bus', lane: LANE.edge + 0.12, z: 430 * 5, speed: 0, id: 'bus1' });
  r.decorate(402, 450, 11, 'tree', LANE.far, { size: 0.7 });

  // 450–560: ud af byen, landevej med cyklist og modkørende
  r.sprite(452, 'sign', LANE.sidewalk, { sign: 'byzoneSlut' });
  r.event(452, { type: 'limit', limit: 80 });
  r.setEnv('land').setLimit(80);
  r.straight(30);
  r.curve(30, 0.8);
  r.straight(50);
  r.event(500, { type: 'overtake', cyclistZ: 505 * 5 });
  r.actor({ type: 'cyclist', lane: LANE.edge + 0.05, z: 505 * 5, speed: 20, until: 560, color: '#1d3a9e' });
  r.actor({ type: 'car', lane: LANE.oncoming, z: 560 * 5, speed: -70, color: '#9aa3ab', oncoming: true });
  r.actor({ type: 'car', lane: LANE.oncoming, z: 600 * 5, speed: -70, color: '#b33b3b', oncoming: true });
  r.decorate(452, 560, 7, 'tree', LANE.far + 0.2, { size: 1.3 });
  r.decorate(455, 560, 9, 'tree', -(LANE.far + 0.3), { size: 1.1 });

  // 560–600: ind i byen igen, hajtænder med bil fra venstre
  r.sprite(562, 'sign', LANE.sidewalk, { sign: 'byzone' });
  r.event(562, { type: 'limit', limit: 50 });
  r.setEnv('by').setLimit(50);
  r.straight(40);
  r.sprite(586, 'sign', LANE.sidewalk, { sign: 'vigepligt' });
  r.event(592, { type: 'yield', crossCar: true });
  r.decorate(564, 600, 13, 'lamp', LANE.far);

  // 600–650: kør ind til siden og stands
  r.straight(50, { parkedRight: true });
  r.decorate(602, 618, 8, 'parkedCar', 1.12);
  r.event(612, { type: 'cue', text: 'Kør ind til siden og stands bag den sidste parkerede bil.' });
  r.event(626, { type: 'park', until: 648 });
  r.sprite(648, 'sign', LANE.sidewalk, { sign: 'busstop' });
  houses(r, 0, 60); houses(r, 62, 128, 3); houses(r, 150, 235, 1); houses(r, 236, 290, 4); houses(r, 345, 400, 2); houses(r, 290, 345, 2); houses(r, 400, 450, 1); houses(r, 562, 650, 2);
  return r.build();
}

function houses(r, from, to, seed = 0) {
  const palette = ['#8a8f96', '#a39a8c', '#7f858c', '#9c8f83', '#6f767d'];
  for (let sgm = from; sgm < to; sgm += 7) {
    const k = (sgm * 31 + seed * 7) % 5;
    r.sprite(sgm, 'house', -(LANE.far + 0.9), { w: 7 + (k % 3) * 2, h: 5 + ((k * 3) % 4) * 1.6, color: palette[k], seed: k });
    r.sprite(sgm + 3, 'house', LANE.far + 0.9, { w: 7 + ((k + 1) % 3) * 2, h: 5 + (((k + 2) * 3) % 4) * 1.6, color: palette[(k + 2) % 5], seed: k + 1 });
  }
}

export const ROUTES = { bytur: { id: 'bytur', name: 'Bytur', length: '3,2 km', minutes: '5–6 min', build: bytur } };
