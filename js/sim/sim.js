// Samler vejnet, trafik, din bil og sensoren i én simulation med fast tidsskridt.
import { buildCity } from './network.js';
import { createTraffic } from './traffic.js';
import { createPlayer, stepPlayer, setBlinker } from './player.js';
import { createExaminer } from './examiner.js';

export const STEP = 1 / 60;

export function createSim(opts = {}) {
  const net = buildCity();
  const player = createPlayer(net.start);
  const traffic = createTraffic(net, { rng: opts.rng, avoid: player, count: opts.cars ?? 16, cyclists: opts.cyclists, strollers: opts.strollers });
  const ex = createExaminer({ net, traffic, player }, { mode: opts.mode || 'exam', onCue: opts.onCue, onNote: opts.onNote, onEnd: opts.onEnd });
  let loc = net.locate(player.x, player.y, player.h);
  let lastLane = loc.lane || null;
  let acc = 0;

  function playerEntity() {
    const e = { kind: 'player', x: player.x, y: player.y, h: player.v < 0 ? player.h + Math.PI : player.h, v: Math.abs(player.v), turnGuess: player.blinker || 'straight' };
    if (loc.inNode) { e.nodeId = loc.node.id; e.inLane = lastLane; e.approachLane = null; }
    else { e.nodeId = null; e.approachLane = loc.lane; e.laneOn = loc.lane; e.s = loc.s; e.dist = loc.lane.path.len - loc.s; }
    return e;
  }

  function step(dt) {
    stepPlayer(player, dt, loc.surface, ex.E.t);
    loc = net.locate(player.x, player.y, player.h);
    if (!loc.inNode) lastLane = loc.lane;
    traffic.step(dt, ex.E.over ? null : playerEntity());
    ex.update(dt, loc);
  }

  // kører simulationen frem med fast skridt, uanset billedfrekvens
  function advance(frameDt, before) {
    acc += Math.min(frameDt, 0.1);
    let n = 0;
    while (acc >= STEP && n < 6) { if (before) before(STEP); step(STEP); acc -= STEP; n++; }
  }

  return {
    net, player, traffic, ex, step, advance,
    get loc() { return loc; },
    get lastLane() { return lastLane; },
    look(id) { const t = ex.E.t; player.looks[id] = t; (player.lookLog[id] ||= []).push(t); if (player.lookLog[id].length > 40) player.lookLog[id].shift(); },
    blink(side) { setBlinker(player, side, ex.E.t); },
  };
}
