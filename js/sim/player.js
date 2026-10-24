// Din bil: enkel cykelmodel (forhjulsstyring), automatgear med D/R, blinklys der selv slukker efter svinget.
import { pointAt } from './geom.js';

export const WHEELBASE = 2.7;

export function createPlayer(start) {
  const L = start.lane, p0 = pointAt(L.path, start.s);
  return {
    kind: 'player',
    x: p0.x + L.right.x * start.lat, y: p0.y + L.right.y * start.lat, h: Math.atan2(L.dir.y, L.dir.x),
    v: 0, steer: 0, gear: 'D', accel: 0, odo: 0,
    blinker: null, blinkerSince: -99, blinkerH: 0, blinkerOffT: -99, blinkerOffSide: null,
    looks: {}, lookLog: {}, input: { gas: 0, brake: 0, steer: 0 },
  };
}

export function setBlinker(p, side, t) {
  if (p.blinker === side) { p.blinkerOffSide = side; p.blinkerOffT = t; p.blinker = null; return; }
  p.blinker = side; p.blinkerSince = t; p.blinkerH = p.h; p.blinkerMax = 0;
}

export function stepPlayer(p, dt, surface, t) {
  const inp = p.input;
  p.steer += (inp.steer - p.steer) * Math.min(1, dt * 9);
  const v = p.v, fwd = p.gear === 'D', sign = Math.sign(v);
  let a = -sign * (0.22 + 0.0021 * v * v);
  if (inp.gas > 0) a += fwd ? 3.1 * inp.gas * Math.max(0, 1 - v / 19) : -2.0 * inp.gas * Math.max(0, 1 + v / 3.2);
  if (inp.brake > 0) a -= (sign || (fwd ? 1 : -1)) * 8.5 * inp.brake;
  if (surface === 'walk' || surface === 'cycle' || surface === 'verge') a -= sign * 2.2;
  if (surface === 'island') a -= sign * 6;
  let nv = v + a * dt;
  if (fwd && nv < 0) nv = 0;
  if (!fwd && nv > 0) nv = 0;
  if (inp.brake > 0 && Math.abs(nv) < 0.08) nv = 0;
  p.accel = (nv - v) / dt;
  p.v = nv;
  const delta = (p.steer * 0.62) / (1 + (nv * nv) / 150);
  p.h += (nv / WHEELBASE) * Math.tan(delta) * dt;
  p.x += Math.cos(p.h) * nv * dt;
  p.y += Math.sin(p.h) * nv * dt;
  p.odo += Math.abs(nv) * dt;
  // blinkarmen slår fra, når rattet er drejet tilbage efter at have været drejet til samme side
  if (p.blinker) {
    const dirSteer = p.blinker === 'right' ? p.steer : -p.steer;
    p.blinkerMax = Math.max(p.blinkerMax || 0, dirSteer);
    if (p.blinkerMax > 0.22 && dirSteer < 0.08) { p.blinkerOffSide = p.blinker; p.blinkerOffT = t; p.blinker = null; p.blinkerMax = 0; }
  }
}
