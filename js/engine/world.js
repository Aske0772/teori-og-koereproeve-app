// Verden: en rute er en liste af segmenter (5 m hver) med kurver, sprites og hændelser.
// Koordinater: x er normaliseret til vejbredden (-1 = venstre kant, +1 = højre kant).
// Egen bane har centrum +0.5, modkørende -0.5. Cykelsti ligger ved ~1.2, fortov ved ~1.6.

export const SEG = 5;                 // meter pr. segment
export const LANE = { own: 0.5, oncoming: -0.5, edge: 0.82, cycle: 1.2, sidewalk: 1.62, far: 2.3 };

export class RouteBuilder {
  constructor() { this.segs = []; this.events = []; this.actors = []; this.limit = 50; this.env = 'by'; }
  get n() { return this.segs.length; }
  // tilføj n segmenter med kurve c (positiv = højre)
  add(n, c = 0, extra = {}) {
    for (let i = 0; i < n; i++) this.segs.push({ curve: c, env: this.env, limit: this.limit, cyclePath: !!extra.cyclePath, parkedRight: !!extra.parkedRight, sprites: [], ...extra.seg });
    return this;
  }
  straight(n, extra) { return this.add(n, 0, extra); }
  // blød kurve: ind, hold, ud
  curve(n, c, extra) {
    const e = Math.max(2, Math.floor(n / 4));
    for (let i = 0; i < n; i++) {
      const t = i < e ? i / e : i > n - e ? (n - i) / e : 1;
      this.add(1, c * t, extra);
    }
    return this;
  }
  sprite(seg, type, x, props = {}) { (this.segs[seg] || this.segs[this.segs.length - 1]).sprites.push({ type, x, ...props }); return this; }
  // gentag sprites over et stræk
  decorate(from, to, every, type, x, props = {}) { for (let s = from; s < to; s += every) this.sprite(s, type, x, props); return this; }
  setLimit(l) { this.limit = l; return this; }
  setEnv(e) { this.env = e; return this; }
  event(seg, ev) { this.events.push({ seg, ...ev }); return this; }
  actor(a) { this.actors.push(a); return this; }
  build() { return { segs: this.segs, events: this.events.sort((a, b) => a.seg - b.seg), actors: this.actors }; }
}

export function segAt(route, z) {
  const i = Math.floor(z / SEG);
  return route.segs[Math.max(0, Math.min(route.segs.length - 1, i))];
}
