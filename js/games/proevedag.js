// Prøvedagen som level: venteværelse, papirer, kontrolprøve, kørsel, dom.
// Nerverne trænes ved at gentage ritualet, ikke ved at læse om det.
import { runSim } from './bykoersel.js';
import { verdictHTML } from './verdict.js';
import { drawCard, SECTIONS } from '../data/kontrol.js';
import { pickSensor } from '../data/sensors.js';

import { topbar, esc } from '../ui.js';
import { get, save, recordSkill } from '../state.js';
import { speak } from '../voice.js';

const STAGES = ['Venteværelset', 'Papirerne', 'Kontrolprøven', 'Kørslen', 'Dommen'];

export function mount(container) {
  let alive = true, stop = null, timer = null;
  const sensor = pickSensor(get().sensorId);
  const day = { kontrol: [], drive: null };

  const timeline = (i) => `<ul class="timeline">${STAGES.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s}</li>`).join('')}</ul>`;
  const shell = (inner, step) => { container.innerHTML = `<section class="screen">${topbar('Prøvedagen', { back: '#/', step })}${inner}</section>`; };

  function start() {
    shell(`<h1>Prøvedagen</h1>
      <p>Hele dagen, fra venteværelset til dommen. Omkring 10 minutter. Sensoren er ${esc(sensor.name)}, ${esc(sensor.style.toLowerCase())}, du finder ud af, at det ikke betyder noget for bedømmelsen.</p>
      ${timeline(-1)}
      <div class="card"><p class="note">Til den rigtige prøve bruges 15–20 minutter på identitetskontrol, papirer, kontrolprøve og orientering, og selve kørslen varer mindst 25 minutter. Her er alt komprimeret, men rækkefølgen er den samme.</p>
      <p class="note">I 2025 blev 67,8 % af de praktiske prøver bestået (Færdselsstyrelsen). Dumper du, koster en ny prøve 1.600 kr. i gebyr plus ventetid og ekstra lektioner.</p></div>
      <div class="btnrow"><button class="cta full" id="go">Mød op</button></div>`);
    container.querySelector('#go').addEventListener('click', waitingRoom);
  }

  function waitingRoom() {
    let phase = 0, cycles = 0;
    const PH = [['Træk vejret ind', 4000, 'in'], ['Hold', 4000, 'hold'], ['Pust langsomt ud', 6000, 'out']];
    shell(`${timeline(0)}
      <div class="sensor-line"><div class="avatar" style="background:${sensor.color}">${sensor.initials}</div><div class="bubble"><div class="who">${esc(sensor.name)} kommer ind i venteværelset</div><div class="say">${esc(sensor.waiting)}</div></div></div>
      <div class="breath"><div class="ring" id="ring">Klar</div><p class="note" style="margin-top:14px" id="ph">Tre runder. Ind gennem næsen, ud gennem munden.</p></div>
      <div class="card"><p><b>Din hvis-så-plan for i dag:</b> Hvis jeg laver en fejl, så siger jeg "videre" for mig selv og tjekker bakspejlet. Én fejl afgør sjældent prøven, det gør den næste, hvis jeg bliver i den første.</p><p class="note">Læs den højt. Det lyder fjollet og er det mest velundersøgte, du kan gøre mod prøvenerver: at øve selve situationen og have en plan for, hvad du gør, når det går galt.</p></div>
      <div class="btnrow"><button class="btn ghost full" id="skip">Videre til papirerne</button></div>`, 'Venteværelset');
    const ring = container.querySelector('#ring'), ph = container.querySelector('#ph');
    const step = () => {
      if (!alive) return;
      if (cycles >= 3) { ring.textContent = 'Rolig'; ring.className = 'ring'; ph.textContent = 'Så er du klar. Ingen stress med at gå videre.'; return; }
      const [label, ms, cls] = PH[phase];
      ring.textContent = label; ring.className = `ring ${cls}`; ring.style.transitionDuration = `${ms}ms`;
      timer = setTimeout(() => { phase = (phase + 1) % 3; if (phase === 0) cycles++; step(); }, ms);
    };
    timer = setTimeout(step, 900);
    container.querySelector('#skip').addEventListener('click', () => { clearTimeout(timer); papers(); });
  }

  function papers() {
    shell(`${timeline(1)}
      <h2>Papirerne</h2>
      <p>Den prøvesagkyndige tjekker din identitet og dine papirer. Har du det hele?</p>
      <div class="card"><ul class="check-list">
        <li><input type="checkbox" id="p1"><label for="p1"><div class="lbl">Gyldig legitimation</div><div class="sub">Pas, tidligere EU-kørekort eller kørekort-appen, ellers fødsels-/navneattest eller sundhedskort plus billedlegitimation. Mangler det, gennemføres prøven ikke og tæller som ikke bestået.</div></label></li>
        <li><input type="checkbox" id="p2"><label for="p2"><div class="lbl">Ansøgning om kørekort og underskrevet modulplan</div><div class="sub">Ansøgningen stemplet af Borgerservice og underskrevet af kørelæreren. Spørg kørelæreren dagen før.</div></label></li>
        <li><input type="checkbox" id="p3"><label for="p3"><div class="lbl">Briller eller linser, hvis du bruger dem</div><div class="sub">Står det på ansøgningen, skal de på.</div></label></li>
      </ul></div>
      <div class="btnrow"><button class="btn full" id="go">Ud til bilen</button></div>`, 'Papirerne');
    container.querySelector('#go').addEventListener('click', kontrol);
  }

  function kontrol() {
    const cards = drawCard();
    let i = 0;
    const show = () => {
      if (!alive) return;
      if (i >= cards.length) return drive();
      const c = cards[i];
      shell(`${timeline(2)}
        <div class="sensor-line"><div class="avatar" style="background:${sensor.color}">${sensor.initials}</div><div class="bubble"><div class="who">Opgavekort · ${esc(SECTIONS[c.section])}</div><div class="say">${esc(c.q)}</div></div></div>
        <div class="flashcard" style="min-height:0">
          <div class="a" id="a" hidden style="border-top:0;padding-top:0"><p><b>Kravet:</b> ${esc(c.a)}</p><p class="how"><b>Sådan viser du det:</b> ${esc(c.how)}</p></div>
          <div class="btnrow" id="reveal" style="margin-top:0"><button class="btn full" id="show">Jeg har vist det, tjek svaret</button></div>
          <div class="btnrow" id="rate" hidden style="margin-top:0"><button class="btn ghost full" id="miss">Jeg kunne ikke</button><button class="btn full" id="hit">Jeg kunne</button></div>
        </div>`, `Kontrol ${i + 1} af ${cards.length}`);
      speak(c.q);
      container.querySelector('#show').addEventListener('click', () => { container.querySelector('#a').hidden = false; container.querySelector('#reveal').hidden = true; container.querySelector('#rate').hidden = false; });
      const mark = ok => {
        day.kontrol.push({ q: c.q, ok });
        save(s => { const e = s.kontrolSeen[c.id] || { hit: 0, miss: 0 }; return { ...s, kontrolSeen: { ...s.kontrolSeen, [c.id]: { hit: e.hit + (ok ? 1 : 0), miss: e.miss + (ok ? 0 : 1) } } }; });
        i++; show();
      };
      container.querySelector('#hit').addEventListener('click', () => mark(true));
      container.querySelector('#miss').addEventListener('click', () => mark(false));
    };
    show();
  }

  function drive() {
    stop = runSim(container, { mode: 'exam', sensor, showFaults: false, back: '#/', onDone: (r) => { day.drive = r; verdict(); } });
  }

  function verdict() {
    const r = day.drive;
    const kMiss = day.kontrol.filter(k => !k.ok).length;
    const kontrolFail = kMiss >= 2;
    const passed = r.passed && !kontrolFail;
    let reason = r.reason;
    if (kontrolFail) reason = 'Kontrolprøven: to eller flere kontrolnumre kunne ikke vises. ' + (r.reason || '');
    const score = Math.max(0, Math.round(r.score - kMiss * 10));
    recordSkill('proevedag', score, { note: passed ? 'Bestået' : 'Ikke bestået' });
    const text = passed ? sensor.verdictPass : sensor.verdictFail;
    const extra = `<div class="row ${kMiss ? (kontrolFail ? 'bad' : 'mid') : 'ok'}"><span>Kontrolprøve</span><b>${kMiss ? `${kMiss} ikke vist` : 'opfyldt'}</b></div>`;
    container.innerHTML = `<section class="screen">${timeline(4)}${verdictHTML({ ...r, passed, reason, score }, sensor, text, { back: '#/', extraRows: extra })}
      <p class="muted">Til den rigtige prøve får du skemaet via Digital Post, og den prøvesagkyndige gennemgår det med dig i bilen. Ved bestået får du et midlertidigt kørekort, der gælder i tre måneder.</p>
      <div class="btnrow"><button class="cta full" id="again">Ny prøvedag</button></div></section>`;
    speak(text);
    container.querySelector('#again').addEventListener('click', () => { day.kontrol = []; day.drive = null; start(); });
  }

  start();
  return () => { alive = false; clearTimeout(timer); if (stop) stop(); };
}
