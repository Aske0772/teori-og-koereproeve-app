// Skulderblik-rytmespil: orienteringsrutinen i rigtig rækkefølge, hurtigere og hurtigere.
import { topbar, esc } from '../ui.js';
import { recordSkill } from '../state.js';
import { speak } from '../voice.js';

const ZONES = {
  bak: { label: 'Bakspejl', x: 36, y: 4, w: 28, h: 12 },
  venstreSpejl: { label: 'Venstre sidespejl', x: 2, y: 44, w: 16, h: 14 },
  hoejreSpejl: { label: 'Højre sidespejl', x: 82, y: 44, w: 16, h: 14 },
  venstreSkulder: { label: 'Skulderblik venstre', x: 0, y: 14, w: 14, h: 28 },
  hoejreSkulder: { label: 'Skulderblik højre', x: 86, y: 14, w: 14, h: 28 },
  blinkVenstre: { label: 'Blink venstre', x: 22, y: 72, w: 16, h: 12 },
  blinkHoejre: { label: 'Blink højre', x: 62, y: 72, w: 16, h: 12 },
};

// Rutinen: spejl, spejl, tegn, skulderblik, så handling.
const MANOEUVRES = [
  { t: 'Vognbaneskift til venstre', seq: ['bak', 'venstreSpejl', 'blinkVenstre', 'venstreSkulder'] },
  { t: 'Vognbaneskift til højre', seq: ['bak', 'hoejreSpejl', 'blinkHoejre', 'hoejreSkulder'] },
  { t: 'Højresving med cykelsti', seq: ['bak', 'hoejreSpejl', 'blinkHoejre', 'hoejreSkulder'] },
  { t: 'Venstresving i kryds', seq: ['bak', 'venstreSpejl', 'blinkVenstre', 'venstreSkulder'] },
  { t: 'Sæt i gang fra kantstenen', seq: ['bak', 'venstreSpejl', 'blinkVenstre', 'venstreSkulder'] },
  { t: 'Stands ved kantstenen', seq: ['bak', 'hoejreSpejl', 'blinkHoejre', 'hoejreSkulder'] },
  { t: 'Ud af rundkørslen til højre', seq: ['bak', 'hoejreSpejl', 'blinkHoejre', 'hoejreSkulder'] },
  { t: 'Forbi parkeret bil (over midten)', seq: ['bak', 'venstreSpejl', 'blinkVenstre', 'venstreSkulder'] },
];

const ROUNDS = 12;

function cockpitSVG() {
  return `<svg viewBox="0 0 400 275" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD4E6"/><stop offset="1" stop-color="#E6EEF5"/></linearGradient></defs>
    <rect width="400" height="275" fill="#1E2226"/>
    <path d="M40 40 L360 40 L385 150 L15 150 Z" fill="url(#sky2)"/>
    <polygon points="15,150 385,150 385,135 15,135" fill="#7F8C8D"/>
    <polygon points="120,150 280,150 215,118 185,118" fill="#2A2E33"/>
    <line x1="200" y1="150" x2="200" y2="118" stroke="#fff" stroke-dasharray="4 4"/>
    <!-- bakspejl -->
    <rect x="144" y="10" width="112" height="34" rx="7" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>
    <rect x="148" y="14" width="104" height="26" rx="5" fill="#9fb4c7"/>
    <!-- sidespejle -->
    <rect x="8" y="120" width="64" height="40" rx="7" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>
    <rect x="12" y="124" width="56" height="32" rx="5" fill="#9fb4c7"/>
    <rect x="328" y="120" width="64" height="40" rx="7" fill="#1a1d20" stroke="#3b4047" stroke-width="2"/>
    <rect x="332" y="124" width="56" height="32" rx="5" fill="#9fb4c7"/>
    <!-- sideruder / skulder -->
    <path d="M0 40 L40 40 L15 150 L0 150 Z" fill="#8FA8BC" opacity=".6"/>
    <path d="M400 40 L360 40 L385 150 L400 150 Z" fill="#8FA8BC" opacity=".6"/>
    <!-- rat -->
    <circle cx="200" cy="265" r="95" fill="none" stroke="#3B4047" stroke-width="14"/>
    <circle cx="200" cy="265" r="22" fill="#3B4047"/>
    <!-- blinkpile -->
    <path d="M120 212 l-14 10 l14 10 z" fill="#3CB55A" opacity=".9"/>
    <path d="M280 212 l14 10 l-14 10 z" fill="#3CB55A" opacity=".9"/>
    <text x="200" y="196" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-size="12" fill="#AEB7BF">tryk på det, du kigger på, i rækkefølge</text>
  </svg>`;
}

export function mount(container) {
  let round = 0, hits = 0, errors = 0, totalMs = 0, alive = true, raf = null, timer = null;
  const log = [];

  function intro() {
    container.innerHTML = `<section class="screen">${topbar('Skulderblik-rytme')}
      <h1>Spejl, spejl, blink, skulder</h1>
      <p>Sensoren noterer hver manøvre, hvor orienteringen mangler eller kommer i forkert rækkefølge. Her er rutinen den samme hver gang, det er tempoet, der stiger.</p>
      <div class="card"><p><b>Rækkefølgen:</b> bakspejl, sidespejlet i den side du skal, blink, skulderblik til samme side. Tryk på zonerne i forruden.</p><p class="note">${ROUNDS} manøvrer. Tiden starter på 6 sekunder og ender under 3.</p></div>
      <div class="btnrow"><button class="btn full" id="start">Start</button></div></section>`;
    container.querySelector('#start').addEventListener('click', play);
  }

  function play() {
    if (!alive) return;
    if (round >= ROUNDS) return done();
    const m = MANOEUVRES[Math.floor(Math.random() * MANOEUVRES.length)];
    const limit = Math.max(2600, 6000 - round * 320);
    let step = 0, wrongThisRound = 0;
    const t0 = performance.now();
    container.innerHTML = `<section class="screen">${topbar('Skulderblik-rytme', { step: `${round + 1} af ${ROUNDS}` })}
      <div class="sensor-line"><div class="avatar" style="background:#3B4650">S</div><div class="bubble"><div class="who">Manøvre</div><div class="say">${esc(m.t)}</div></div></div>
      <div class="pen" id="pen"><i></i></div>
      <div class="cockpit" id="cockpit">${cockpitSVG()}
        ${Object.entries(ZONES).map(([k, z]) => `<button class="hit" data-z="${k}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%" aria-label="${z.label}">${z.label}</button>`).join('')}
      </div>
      <div class="seq" id="seq">${m.seq.map((k, i) => `<span class="${i === 0 ? 'now' : ''}">${i + 1}. ${ZONES[k].label}</span>`).join('')}</div>
    </section>`;
    speak(m.t, { rate: 1.1 });
    const bar = container.querySelector('#pen i'), pen = container.querySelector('#pen');
    const tick = () => {
      if (!alive) return;
      const p = Math.min(1, (performance.now() - t0) / limit);
      bar.style.transform = `scaleX(${1 - p})`;
      if (p > 0.65) pen.classList.add('urgent');
      if (p < 1) raf = requestAnimationFrame(tick); else end(false, 'Tiden løb ud');
    };
    raf = requestAnimationFrame(tick);
    const chips = container.querySelectorAll('#seq span');
    container.querySelectorAll('.hit').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!alive || step >= m.seq.length) return;
      const z = b.dataset.z;
      if (z === m.seq[step]) {
        b.classList.add('good'); setTimeout(() => b.classList.remove('good'), 200);
        chips[step].classList.remove('now'); chips[step].classList.add('done');
        step++;
        if (step < m.seq.length) chips[step].classList.add('now');
        else end(true);
      } else {
        wrongThisRound++; errors++;
        b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 300);
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }));
    function end(ok, reason) {
      cancelAnimationFrame(raf);
      const ms = performance.now() - t0;
      if (ok && wrongThisRound === 0) hits++;
      totalMs += Math.min(ms, limit);
      log.push({ m: m.t, ok, wrong: wrongThisRound, ms: Math.round(ms), reason });
      const fb = ok && wrongThisRound === 0 ? 'Rutinen sad.' : ok ? `Færdig, men ${wrongThisRound} forkert tryk undervejs, i bilen er det et blik det forkerte sted.` : `${reason}. I bilen betyder det, at du svinger uden at have orienteret dig.`;
      container.querySelector('#seq').insertAdjacentHTML('afterend', `<div class="feedback ${ok && !wrongThisRound ? 'ok' : 'bad'}"><div class="verdict">${ok && !wrongThisRound ? 'Rigtigt' : 'Fejl'} · ${(ms / 1000).toFixed(1).replace('.', ',')} s</div><p>${esc(fb)}</p></div>`);
      timer = setTimeout(() => { round++; play(); }, 1100);
    }
  }

  function done() {
    const score = Math.round(100 * hits / ROUNDS);
    recordSkill('skulderblik', score, { note: `${hits} af ${ROUNDS} rutiner uden fejl` });
    const avg = (totalMs / ROUNDS / 1000).toFixed(1).replace('.', ',');
    container.innerHTML = `<section class="screen">${topbar('Skulderblik-rytme', { step: 'Resultat' })}
      <div class="verdict-card"><div class="note">Orientering</div><div class="big ${score >= 80 ? 'pass' : 'fail'}">${score}</div>
      <div class="bigstat"><div><b>${hits}</b><small>rutiner uden fejl</small></div><div><b>${errors}</b><small>forkerte blik</small></div><div><b>${avg} s</b><small>pr. manøvre</small></div></div>
      <p class="note">${score >= 80 ? 'Stempel. Rutinen er automatisk nok til, at du kan bruge hovedet på trafikken i stedet.' : 'Under 80: rutinen er ikke automatisk endnu. Det er den, sensoren ser efter ved hver eneste svingning.'}</p></div>
      <ul class="replay-list" style="margin-top:14px">${log.filter(l => !l.ok || l.wrong).map(l => `<li><div class="q">${esc(l.m)}</div><div class="why">${l.ok ? `${l.wrong} forkert tryk` : esc(l.reason)}</div></li>`).join('')}</ul>
      <div class="btnrow"><button class="btn full" onclick="location.hash='#/traen'">Færdig</button><button class="btn ghost full" id="again">Igen</button></div></section>`;
    container.querySelector('#again').addEventListener('click', () => { round = 0; hits = 0; errors = 0; totalMs = 0; log.length = 0; play(); });
  }

  intro();
  return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); };
}
