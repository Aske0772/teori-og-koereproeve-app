// Kørselstræning: bilen kører selv prøveruten og stopper, hver gang du skal orientere dig.
// Du trykker på det, du ville gøre (spejle, skulderblik, blink), vælger kør eller hold tilbage og får svar med det samme.
import { createSim, STEP } from '../sim/sim.js';
import { createView } from '../sim/view3d.js';
import { createAutopilot } from '../sim/autopilot.js';
import { createCoach, LOOK, BLINK, CATS } from '../sim/coach.js';
import { speak } from '../voice.js';
import { esc } from '../ui.js';

const I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 5 3 12l7 7v-4.5h11v-5H10z"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 5l7 7-7 7v-4.5H3v-5h11z"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

// mount holder styr på den aktuelle tur, så "Kør igen" også bliver ryddet op, når man går væk
export function mount(container, params = {}) {
  const h = { stop: null };
  const start = () => { h.stop = run(container, { back: params.back || '#/traen', restart: start }); };
  start();
  return () => h.stop && h.stop();
}

function run(container, { back, restart }) {
  let alive = true, raf = null, last = performance.now(), started = false, ended = false;
  let acc = 0, ask = null;   // ask: det spørgsmål, bilen holder stille for

  container.innerHTML = `
  <section class="sim" id="sim">
    <div class="sim-view">
      <canvas id="gl" aria-label="Udsyn fra førersædet"></canvas>
      <div class="mirror rear" id="m-rear"><button aria-label="Kig i bakspejlet"></button></div>
      <div class="mirror left" id="m-left"><button aria-label="Kig i venstre sidespejl"></button></div>
      <div class="mirror right" id="m-right"><button aria-label="Kig i højre sidespejl"></button></div>
      <button class="shoulder-btn left" id="s-left" aria-label="Skulderblik til venstre"><span>Skulder</span></button>
      <button class="shoulder-btn right" id="s-right" aria-label="Skulderblik til højre"><span>Skulder</span></button>
      <div class="sim-top">
        <button class="icon-btn" id="quit" aria-label="Afslut">${I.back}</button>
        <div class="street" id="street"></div>
        <button class="icon-btn" id="camera" aria-label="Skift kamera">${I.cam}</button>
        <div class="limit" id="limit"><span>50</span></div>
      </div>
      <div class="cue" id="cue" hidden></div>
      <div class="cluster">
        <span class="ind l" id="ind-l">${I.left}</span>
        <div class="spd"><b id="speed">0</b><small>km/t</small></div>
        <span class="ind r" id="ind-r">${I.right}</span>
      </div>
      <div class="intro" id="intro">
        <p class="intro-who">Kørselstræning</p>
        <p class="intro-say">Bilen kører selv prøveruten. Hver gang der kommer noget, du skal orientere dig om, stopper den. Du har al den tid, du har brug for.</p>
        <ul class="intro-how">
          <li>Tryk på det, du ville gøre: spejlene, kanterne for skulderblik og blinklyset.</li>
          <li>Vælg, om du kører eller holder tilbage, og tryk Svar.</li>
          <li>Du ser med det samme, hvad der var rigtigt.</li>
        </ul>
        <button class="cta" id="go">Start</button>
      </div>
    </div>
    <div class="coach" id="coach"></div>
  </section>`;
  document.body.classList.add('playing');

  // iOS Safari: ingen knibe-zoom eller dobbelttryk-zoom, mens man kører
  const vp = document.querySelector('meta[name=viewport]');
  const vpWas = vp?.getAttribute('content');
  vp?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  const noGesture = e => e.preventDefault();
  const noPinch = e => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
  let lastEnd = 0;
  const noDoubleTap = e => { const now = performance.now(); if (now - lastEnd < 350 && e.target.closest('.sim-view')) e.preventDefault(); lastEnd = now; };
  const lockOpts = { passive: false };
  document.addEventListener('gesturestart', noGesture, lockOpts);
  document.addEventListener('gesturechange', noGesture, lockOpts);
  document.addEventListener('touchmove', noPinch, lockOpts);
  document.addEventListener('touchend', noDoubleTap, lockOpts);

  const $ = id => container.querySelector('#' + id);
  let cueTimer = null;
  const sim = createSim({
    mode: 'exam',
    onCue: text => {
      $('cue').textContent = text; $('cue').hidden = false;
      clearTimeout(cueTimer); cueTimer = setTimeout(() => { $('cue').hidden = true; }, 5200);
    },
    onEnd: r => { if (!ended) { ended = true; setTimeout(() => finish(r), 1400); } },
  });
  const ap = createAutopilot(sim);
  const coach = createCoach(sim, ap);
  window.__sim = sim; window.__coach = coach;
  const view = createView($('gl'), sim.net, { camera: 'cockpit' });
  const P = sim.player;

  // ---------- handlinger i bilen ----------
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  const record = id => { sim.look(id); if (ask && !ask.answered && !ask.taps.includes(id)) { ask.taps.push(id); drawTaps(); } };
  const glance = (id, el) => { record(id); el.classList.remove('glance'); void el.offsetWidth; el.classList.add('glance'); el.addEventListener('animationend', () => el.classList.remove('glance'), { once: true }); };
  tap('m-rear', () => glance('rear', $('m-rear')));
  tap('m-left', () => glance('left', $('m-left')));
  tap('m-right', () => glance('right', $('m-right')));
  let shoulderT = null;
  const shoulder = s => { record(s === 'left' ? 'shoulderLeft' : 'shoulderRight'); view.shoulder(s); clearTimeout(shoulderT); shoulderT = setTimeout(() => view.shoulder(null), 800); if (navigator.vibrate) navigator.vibrate(10); };
  tap('s-left', () => shoulder('left'));
  tap('s-right', () => shoulder('right'));
  const blink = s => { if (ask && ask.answered) return; sim.blink(s); drawTaps(); };
  $('camera').addEventListener('click', () => view.setCamera(view.camera === 'cockpit' ? 'chase' : 'cockpit'));
  $('quit').addEventListener('click', () => { location.hash = back; });
  $('go').addEventListener('click', () => { $('intro').remove(); started = true; });

  // ---------- panelet under udsynet ----------
  const blinkersHTML = `<div class="blinkers"><button class="ctl" id="b-left" aria-label="Blink venstre">${I.left}</button><button class="ctl" id="b-right" aria-label="Blink højre">${I.right}</button></div>`;
  function bindBlinkers() { tap('b-left', () => blink('left')); tap('b-right', () => blink('right')); }

  function drawDrive() {
    const s = coach.summary();
    $('coach').innerHTML = `<div class="coach-drive">${blinkersHTML}<p>Bilen kører selv. Den stopper, når du skal orientere dig.</p>${s.n ? `<span class="score">${s.ok} af ${s.n}</span>` : ''}</div>`;
    bindBlinkers();
    $('sim').classList.remove('asking');
    rectT = 0;
  }

  function drawAsk() {
    const q = ask;
    $('coach').innerHTML = `
      <p class="coach-kicker">Stop ${coach.stops}: ${esc(q.title)}</p>
      <p class="coach-text">${esc(q.text)}</p>
      <p class="coach-hint">Tryk på det, du gør i bilen: spejlene, kanterne for skulderblik og blinklyset.</p>
      <div class="coach-taps" id="taps" aria-live="polite"></div>
      ${q.decision ? `<p class="coach-q">${esc(q.decision.q)}</p><div class="coach-opts">${q.decision.options.map((o, i) => `<button class="coach-opt" data-i="${i}" aria-pressed="false">${esc(o.t)}</button>`).join('')}</div>` : ''}
      <div class="coach-row">${blinkersHTML}<button class="cta" id="answer" ${q.decision ? 'disabled' : ''}>Svar</button></div>`;
    bindBlinkers();
    container.querySelectorAll('.coach-opt').forEach(b => b.addEventListener('click', () => {
      q.choice = +b.dataset.i;
      container.querySelectorAll('.coach-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('answer').disabled = false;
    }));
    $('answer').addEventListener('click', answer);
    drawTaps();
    $('sim').classList.add('asking');
    $('coach').scrollTop = 0;
    rectT = 0;
  }

  function drawTaps() {
    const el = $('taps');
    if (!el || !ask) return;
    const chips = ask.taps.map(id => `<span class="chip">${esc(LOOK[id])}</span>`);
    if (P.blinker && P.blinker !== ask.blinkBefore) chips.push(`<span class="chip blink">${esc(BLINK[P.blinker])}</span>`);
    else if (!P.blinker && ask.blinkBefore) chips.push('<span class="chip blink">Blink slukket</span>');
    el.innerHTML = chips.length ? chips.join('') : '<span class="empty">Intet endnu</span>';
  }

  function answer() {
    const q = ask;
    if (!q || q.answered) return;
    q.answered = true;
    const res = coach.grade(q, { taps: q.taps, blinkBefore: q.blinkBefore, blinkNow: P.blinker, choice: q.choice });
    const allOk = res.every(r => r.info || r.ok);
    $('coach').innerHTML = `
      <p class="coach-kicker ${allOk ? 'ok' : 'bad'}">${allOk ? 'Rigtigt' : 'Ikke helt'}: ${esc(q.title)}</p>
      <ul class="coach-res">${res.map(r => `<li class="${r.info ? 'info' : r.ok ? 'ok' : 'bad'}"><i aria-hidden="true">${r.info ? '·' : r.ok ? '✓' : '✕'}</i><span><b>${esc(r.label)}</b>${(r.decision || !r.ok) && r.why ? `<small>${esc(r.why)}</small>` : ''}</span></li>`).join('')}</ul>
      ${q.tip ? `<p class="coach-tip">${esc(q.tip)}</p>` : ''}
      <button class="cta full" id="next">Kør videre</button>`;
    $('next').addEventListener('click', resume);
    $('coach').scrollTop = 0;
    if (navigator.vibrate) navigator.vibrate(allOk ? 15 : [40, 30, 40]);
    rectT = 0;
  }

  function resume() { ask = null; drawDrive(); }

  function freeze(q) {
    ask = { ...q, taps: [], blinkBefore: P.blinker, choice: null, answered: false };
    $('cue').hidden = true; clearTimeout(cueTimer);
    drawAsk();
    speak(q.text, { rate: 1.05 });
  }

  // ---------- tastatur ----------
  const kd = e => {
    const k = e.key.toLowerCase();
    if (e.repeat) return;
    if (k === 'q') blink('left'); if (k === 'e') blink('right');
    if (k === 'z') shoulder('left'); if (k === 'c') shoulder('right');
    if (k === '1') glance('left', $('m-left')); if (k === '2') glance('rear', $('m-rear')); if (k === '3') glance('right', $('m-right'));
    if (k === 'v') view.setCamera(view.camera === 'cockpit' ? 'chase' : 'cockpit');
    if (k === 'enter') { if (ask && !ask.answered && !$('answer').disabled) answer(); else if (ask && ask.answered) resume(); }
  };
  window.addEventListener('keydown', kd);

  // ---------- løkke ----------
  const rectOf = id => { const el = $(id), c = $('gl'); if (!el || !c) return null; const a = el.getBoundingClientRect(), b = c.getBoundingClientRect(); return { x: a.left - b.left + 3, y: a.top - b.top + 3, w: a.width - 6, h: a.height - 6 }; };
  let mirrorRects = null, rectT = 0, slowFrames = 0;
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    slowFrames = dt > 0.03 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90) { view.lowerQuality(); slowFrames = 0; }
    if (started && !ended && !ask) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) {
        const q = coach.detect();
        if (q) { freeze(q); acc = 0; break; }
        ap.step(STEP); sim.step(STEP); acc -= STEP; n++;
      }
      if (n >= 6) acc = 0;
    }
    if (now - rectT > 500) { mirrorRects = { rear: rectOf('m-rear'), left: rectOf('m-left'), right: rectOf('m-right') }; rectT = now; }
    view.render(sim, dt, mirrorRects);
    hud();
    raf = requestAnimationFrame(frame);
  }

  function hud() {
    const kmh = Math.round(Math.abs(P.v) * 3.6);
    $('speed').textContent = kmh;
    const lane = sim.lastLane;
    if (lane) {
      // skjul grænsen, mens spørgsmålet handler om den
      const hide = ask && ask.kind === 'speed' && !ask.answered;
      $('limit').firstElementChild.textContent = hide ? '?' : lane.limit;
      const name = sim.loc.inNode ? '' : lane.name;
      if ($('street').textContent !== name) $('street').textContent = name;
    }
    $('ind-l').classList.toggle('on', P.blinker === 'left');
    $('ind-r').classList.toggle('on', P.blinker === 'right');
    $('b-left')?.classList.toggle('on', P.blinker === 'left');
    $('b-right')?.classList.toggle('on', P.blinker === 'right');
  }

  drawDrive();
  raf = requestAnimationFrame(frame);

  // ---------- slut ----------
  function finish(r) {
    const s = coach.summary();
    cleanup();
    const km = (r.stats.distance / 1000).toFixed(1).replace('.', ',');
    const rows = Object.entries(CATS).filter(([k]) => s.per[k].n).map(([k, name]) => {
      const v = s.per[k], cls = v.ok === v.n ? 'ok' : v.ok / v.n >= 0.7 ? 'mid' : 'bad';
      return `<div class="row ${cls}"><span>${esc(name)}</span><b>${v.ok} af ${v.n}</b></div>`;
    }).join('');
    container.innerHTML = `
    <section class="screen">
      <section class="verdict ${s.pct >= 80 ? 'pass' : 'fail'}">
        <div class="verdict-head">
          <div class="stamp-big">${r.reason ? 'Afbrudt' : 'Turen er slut'}</div>
          <div class="score"><b>${s.pct}</b><span>% rigtige</span></div>
        </div>
        <p class="verdict-say">${coach.stops} stop på ${km} km. ${s.pct === 100 ? 'Alt rigtigt.' : s.pct >= 80 ? 'Godt. Øv de punkter, du missede.' : 'Kør turen igen, og læs forklaringerne undervejs.'}</p>
        ${r.reason ? `<p class="verdict-reason">${esc(r.reason)}</p>` : ''}
        <div class="schema2">${rows}</div>
        ${s.misses.length ? `<h2 class="practice">Det skal du øve</h2><ol class="notes">${s.misses.map(m => `<li data-level="error"><b>${esc(CATS[m.cat])}</b><span>${esc(m.label)}${m.why ? `. ${esc(m.why)}` : ''}</span><small>${esc(m.title)}</small></li>`).join('')}</ol>` : '<p class="clean">Ingen fejl. Prøv nu at køre selv i Bykørsel.</p>'}
        <div class="btnrow"><button class="cta" id="again">Kør igen</button><button class="cta ghost" id="done">Færdig</button></div>
      </section>
    </section>`;
    container.querySelector('#again').addEventListener('click', restart);
    container.querySelector('#done').addEventListener('click', () => { location.hash = back; });
    window.scrollTo(0, 0);
  }

  function cleanup() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(cueTimer); clearTimeout(shoulderT);
    window.removeEventListener('keydown', kd);
    document.body.classList.remove('playing');
    document.removeEventListener('gesturestart', noGesture, lockOpts);
    document.removeEventListener('gesturechange', noGesture, lockOpts);
    document.removeEventListener('touchmove', noPinch, lockOpts);
    document.removeEventListener('touchend', noDoubleTap, lockOpts);
    if (vp && vpWas) vp.setAttribute('content', vpWas);
    view.dispose();
    if (window.__sim === sim) { delete window.__sim; delete window.__coach; }
  }
  return cleanup;
}
