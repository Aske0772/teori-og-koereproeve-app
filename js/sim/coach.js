// Kørselstræning: finder de øjeblikke på turen, hvor du skal orientere dig, laver spørgsmålet og retter svaret.
// Ren logik uden DOM, så den kan testes uden browser.
import { projectOn } from './geom.js';
import { lightState } from './network.js';

export const LOOK = {
  rear: 'Bakspejl',
  left: 'Venstre sidespejl',
  right: 'Højre sidespejl',
  shoulderLeft: 'Skulderblik til venstre',
  shoulderRight: 'Skulderblik til højre',
};
const LOOK_WHY = {
  rear: 'Bakspejlet viser, hvad der kommer bag dig.',
  left: 'Venstre sidespejl viser trafikken bag dig og ved siden af dig til venstre.',
  right: 'Højre sidespejl viser cyklister og biler, der kommer op langs din højre side.',
  shoulderLeft: 'Skulderblikket dækker den blinde vinkel, som spejlene ikke viser.',
  shoulderRight: 'Skulderblikket dækker den blinde vinkel, som spejlene ikke viser. Her kommer cyklisterne.',
};
export const BLINK = { left: 'Blink til venstre', right: 'Blink til højre' };
export const CATS = { orientering: 'Orientering', tegngivning: 'Tegngivning', vigepligt: 'Vigepligt', hastighed: 'Hastighed' };
const LIGHT = { green: 'grønt', yellow: 'gult', red: 'rødt', redyellow: 'rødt og gult' };
const side = t => (t === 'right' ? 'højre' : 'venstre');

export function createCoach(sim, ap) {
  const asked = new Set();
  const log = [];
  let curLane = null, prevLane = null, laneN = 0;
  const mark = (k, q) => { asked.add(k); q.id = k; return q; };

  // ---------- spørgsmålene ----------
  const Q = {
    start: () => ({
      kind: 'start', title: 'Udkørsel fra kantsten',
      text: 'Du holder ved kantstenen og skal køre ud på vejen. Hvad gør du, før du kører?',
      looks: [{ id: 'rear' }, { id: 'left' }, { id: 'shoulderLeft', why: 'Skulderblikket til venstre tager du lige før, du kører. Det dækker den blinde vinkel, hvor en cyklist eller bil kan være.' }],
      blink: 'left',
      tip: 'Rækkefølgen: spejle, blink, skulderblik. Kør først, når der er frit.',
    }),
    turn: (lane, c, d) => {
      const where = c.node.type === 'light' ? 'I lyskrydset' : lane.control === 'stop' ? 'Ved stopskiltet' : !lane.conns.some(k => k.turn === 'straight') ? 'For enden af vejen' : 'Ved næste kryds';
      return {
        kind: 'turn', title: `${where} skal du til ${side(c.turn)}`,
        text: `${where} drejer du til ${side(c.turn)}. Der er ${Math.round(d / 5) * 5} meter til krydset. Hvad gør du nu?`,
        looks: [{ id: 'rear' }, { id: c.turn }],
        blink: c.turn,
        tip: 'Spejle først, så blink i god tid. Skulderblikket tager du lige før svinget.',
      };
    },
    junction: (lane, c) => {
      const nt = c.node.type, turn = c.turn, ctl = lane.control;
      const reason = ap.mustYield(lane, c);
      const rb = nt === 'roundabout';
      const looks = !rb && turn !== 'straight' ? [{ id: turn === 'right' ? 'shoulderRight' : 'shoulderLeft', why: turn === 'right' && lane.cycle ? 'Lige før et højresving kigger du over skulderen efter cyklister på cykelstien. Det er den vigtigste orientering i byen.' : 'Lige før svinget kigger du over skulderen og dækker den blinde vinkel.' }] : [];
      const blink = rb && c.exitIndex === 1 ? 'right' : null;
      const goal = rb ? `Du skal ${c.exitIndex}. vej ud.` : turn === 'straight' ? 'Du skal ligeud.' : `Du skal til ${side(turn)}.`;
      let title, rule, decision;
      if (ctl === 'stop') {
        title = 'Stopskilt';
        decision = {
          q: 'Hvad gør du ved stopskiltet?',
          options: [{ t: 'Standser helt ved stoplinjen', ok: true }, { t: 'Sætter farten ned og kører, hvis der er frit', ok: false }],
          why: 'Ved et stopskilt holder du altid helt stille ved stoplinjen, også når der er frit. ' + (reason ? reason + ' Du venter, til der er frit.' : 'Lige nu er der frit, så du kører, når du har holdt stille.'),
        };
      } else {
        if (ctl === 'light') { const s = lightState(c.node, lane); title = `Lyskryds, lyset er ${LIGHT[s] || s}`; rule = 'I et lyskryds bestemmer lyset. Når du drejer til venstre for grønt, holder du stadig tilbage for modkørende.'; }
        else if (ctl === 'yield') { title = 'Hajtænder'; rule = 'Hajtænderne betyder ubetinget vigepligt: du holder tilbage for al trafik på vejen, du skal ud på.'; }
        else if (ctl === 'right') { title = 'Kryds uden skilte'; rule = 'Krydset har ingen skilte eller hajtænder, så der er højre vigepligt: du holder tilbage for trafik fra højre.'; }
        else if (rb) { title = 'Rundkørsel'; rule = 'Trafikken, der allerede kører rundt i rundkørslen, har forkørselsret.'; }
        else { title = 'Du har forkørselsret'; rule = turn === 'left' ? 'Du kører på en vej med forkørselsret, men når du drejer til venstre, holder du tilbage for modkørende.' : 'Du kører på en vej med forkørselsret, men når du drejer til højre, holder du tilbage for cyklister og fodgængere, der kører ligeud.'; }
        decision = {
          q: 'Kører du, eller holder du tilbage?',
          options: [{ t: 'Kører', ok: !reason }, { t: 'Holder tilbage', ok: !!reason }],
          why: rule + ' ' + (reason || 'Lige nu er der frit, så du kører.'),
        };
      }
      return {
        kind: 'junction', title, text: `${goal} Kig dig omkring.`, looks, blink, decision,
        tip: rb && c.exitIndex === 1 ? 'Skal du første vej ud, blinker du til højre allerede før rundkørslen.' : rb ? 'Du blinker ikke, når du kører ind i rundkørslen. Blinket til højre kommer, før du kører ud.' : '',
      };
    },
    rbExit: () => ({
      kind: 'rbexit', title: 'Ud af rundkørslen',
      text: 'Du skal ud ved den næste vej. Hvad gør du, før du kører ud?',
      looks: [{ id: 'right', alt: ['shoulderRight'], why: 'Kig i højre sidespejl efter cyklister, før du kører ud. De kører uden om rundkørslen på cykelstien.' }],
      blink: 'right',
      tip: 'Blink til højre, når du har passeret vejen før den, du skal ud ad.',
    }),
    zebra: () => ({
      kind: 'zebra', title: 'Fodgængerfelt',
      text: 'Der står en fodgænger ved fodgængerfeltet foran dig.',
      looks: [{ id: 'rear', why: 'Kig i bakspejlet, før du bremser, så du ved, om der er en bil lige bag dig.' }],
      blink: null,
      decision: {
        q: 'Hvad gør du?',
        options: [{ t: 'Kører videre, fodgængeren kan vente', ok: false }, { t: 'Sætter farten ned og holder tilbage', ok: true }],
        why: 'Fodgængere, der er på vej ud i et fodgængerfelt eller går i det, skal du holde tilbage for, så de kan gå over.',
      },
      tip: '',
    }),
    speed: lane => ({
      kind: 'speed', title: `Du kører ind på ${lane.name}`,
      text: 'Se efter skiltet. Hvor hurtigt må du køre her?',
      looks: [], blink: null,
      decision: {
        q: 'Hastighedsgrænsen er …', cat: 'hastighed',
        options: [30, 40, 50, 60].map(v => ({ t: `${v} km/t`, ok: v === lane.limit })),
        why: lane.school ? 'Ved skolen er grænsen 30 km/t. Skiltet "Skole" betyder, at der kan komme børn, så vær klar til at standse.' : lane.limit === 60 ? 'Skiltet viser 60 km/t. Det er en større vej, hvor du må køre hurtigere end i byen.' : `Skiltet viser ${lane.limit} km/t.${lane.limit === 50 ? ' 50 km/t er også grænsen i byzone, når der ikke er skiltet noget andet.' : ''}`,
      },
      tip: '',
    }),
    pull: () => ({
      kind: 'pull', title: 'Ind til siden',
      text: 'Kør ind til højre, og stands ved den røde postkasse. Hvad gør du først?',
      looks: [{ id: 'rear' }, { id: 'right', alt: ['shoulderRight'] }],
      blink: 'right',
      tip: 'Spejle, blink til højre, og kør roligt ind til kantstenen.',
    }),
  };

  // ---------- hvornår stopper bilen? ----------
  function detect() {
    const E = sim.ex.E, loc = sim.loc, P = sim.player, st = ap.st;
    if (!asked.has('start')) return mark('start', Q.start());
    if (E.over) return null;
    if (E.pull && !asked.has('pull')) return mark('pull', Q.pull());
    if (loc.inNode) {
      const c = st.conn;
      if (c && c.node.type === 'roundabout' && !st.rbDone) {
        const k = 'rbx' + laneN, pr = projectOn(c.path, P.x, P.y);
        if (c.path.len - pr.s < 19 && !asked.has(k)) return mark(k, Q.rbExit());
      }
      return null;
    }
    const lane = loc.lane;
    if (lane !== curLane) { prevLane = curLane; curLane = lane; laneN++; }
    const key = '@' + laneN, d = lane.path.len - loc.s;
    if (prevLane && lane.limit !== prevLane.limit && loc.s > 1 && !asked.has('spd' + key)) return mark('spd' + key, Q.speed(lane));
    for (const z of lane.zebras) {
      const dz = z.s - loc.s, k = 'z' + z.zebra.id + key;
      if (dz > 6 && dz < 32 && !asked.has(k) && z.zebra.peds.some(q => q.state === 'wait' || q.state === 'cross')) return mark(k, Q.zebra());
    }
    const c = st.next && st.next.inLane === lane ? st.next : null;
    if (!c || E.pull) return null;
    const nt = c.node.type;
    if (nt !== 'junction' && nt !== 'light' && nt !== 'roundabout') return null;
    if (nt !== 'roundabout' && c.turn !== 'straight' && d < 58 && d > 18 && !asked.has('t' + key)) return mark('t' + key, Q.turn(lane, c, d));
    const relevant = c.turn !== 'straight' || ['right', 'yield', 'stop', 'light', 'roundabout'].includes(lane.control);
    if (relevant && d < 15 && d > 3 && !asked.has('j' + key)) return mark('j' + key, Q.junction(lane, c));
    return null;
  }

  // ---------- ret svaret ----------
  // taps: de blik, du trykkede på, i rækkefølge. blinkBefore/blinkNow: blinklyset før og efter. choice: valgt svar.
  function grade(q, { taps = [], blinkBefore = null, blinkNow = null, choice = null } = {}) {
    const res = [];
    const used = new Set();
    for (const L of q.looks) {
      const ids = [L.id, ...(L.alt || [])];
      const hit = ids.find(id => taps.includes(id));
      if (hit) used.add(hit);
      res.push({ cat: 'orientering', ok: !!hit, label: LOOK[hit || L.id], why: L.why || LOOK_WHY[L.id] });
    }
    if (q.blink) {
      const ok = blinkNow === q.blink;
      res.push({ cat: 'tegngivning', ok, label: BLINK[q.blink], why: ok ? '' : blinkNow ? `Du blinkede til ${side(blinkNow)}. Her skal du til ${side(q.blink)}.` : 'Blinket fortæller de andre trafikanter, hvad du vil, før du gør det.' });
    } else if (blinkNow && blinkNow !== blinkBefore) {
      res.push({ cat: 'tegngivning', ok: false, label: `${BLINK[blinkNow]}, uden grund`, why: 'Et blink, der ikke passer til det, du gør, vildleder de andre trafikanter.' });
    }
    if (q.decision) {
      const o = q.decision.options[choice];
      const right = q.decision.options.find(x => x.ok);
      res.push({ cat: q.decision.cat || 'vigepligt', ok: !!(o && o.ok), label: o && o.ok ? o.t : `Rigtigt svar: ${right.t}`, why: q.decision.why, decision: true });
    }
    const extra = [...new Set(taps)].filter(id => !used.has(id) && !q.looks.some(L => L.id === id || (L.alt || []).includes(id)));
    if (extra.length) res.push({ info: true, label: `Ikke nødvendigt lige her: ${extra.map(id => LOOK[id].toLowerCase()).join(', ')}`, why: '' });
    for (const r of res) if (!r.info) log.push({ ...r, title: q.title, kind: q.kind });
    return res;
  }

  function summary() {
    const per = {};
    for (const k of Object.keys(CATS)) per[k] = { ok: 0, n: 0 };
    for (const r of log) { per[r.cat].n++; if (r.ok) per[r.cat].ok++; }
    const ok = log.filter(r => r.ok).length;
    return { per, ok, n: log.length, pct: log.length ? Math.round((ok / log.length) * 100) : 0, misses: log.filter(r => !r.ok) };
  }

  return { detect, grade, summary, log, get stops() { return asked.size; } };
}
