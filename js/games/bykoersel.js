// Bykørsel: du kører selv rundt i byen. Prøvetilstand (sensoren navigerer og bedømmer) eller fri kørsel.
import { createSim } from '../sim/sim.js';
import { createView } from '../sim/view3d.js';
import { LEVELS } from '../sim/rules.js';
import { pickSensor } from '../data/sensors.js';
import { speak } from '../voice.js';
import { get, recordSkill } from '../state.js';
import { esc } from '../ui.js';
import { verdictHTML } from './verdict.js';

const I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 5 3 12l7 7v-4.5h11v-5H10z"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 5l7 7-7 7v-4.5H3v-5h11z"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

const WHEEL_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <circle cx="100" cy="100" r="86" fill="none" stroke="#2a2f35" stroke-width="22"/>
  <circle cx="100" cy="100" r="86" fill="none" stroke="#3a4048" stroke-width="2" stroke-dasharray="3 9"/>
  <path d="M22 108 L80 112 L100 140 L120 112 L178 108" fill="none" stroke="#2a2f35" stroke-width="16" stroke-linejoin="round"/>
  <circle cx="100" cy="104" r="22" fill="#20252b"/>
  <rect x="94" y="10" width="12" height="16" rx="3" fill="#f5b82e"/>
</svg>`;

export function runSim(container, { mode = 'exam', showFaults = mode !== 'exam', sensor, back = '#/', onDone } = {}) {
  sensor = sensor || pickSensor(get().sensorId);
  let alive = true, raf = null, last = performance.now(), started = false, ended = false;
  const free = mode === 'free';

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
      ${free ? '<canvas class="minimap" id="map" width="240" height="180" aria-hidden="true"></canvas>' : ''}
      <div class="cue" id="cue" hidden></div>
      <div class="hud-note" id="note" hidden><b id="note-level"></b><span id="note-text"></span></div>
      <div class="cluster">
        <span class="ind l" id="ind-l">${I.left}</span>
        <div class="spd"><b id="speed">0</b><small>km/t</small></div>
        <span class="ind r" id="ind-r">${I.right}</span>
        <span class="gear" id="gear">D</span>
      </div>
      <div class="intro" id="intro">
        <p class="intro-who"><span class="dot" style="background:${sensor.color}"></span>${esc(sensor.name)}, ${esc(sensor.style.toLowerCase())}</p>
        <p class="intro-say">${free ? 'Fri kørsel. Kør hvor du vil i byen. Jeg siger til med det samme, når noget er galt.' : esc(sensor.intro)}</p>
        <ul class="intro-how">
          <li>Drej rattet. Gas og brems til højre.</li>
          <li>Tryk på spejlene for at kigge i dem, og på kanterne for skulderblik.</li>
          <li>Du holder ved kantstenen. Blink, kig, og træk ud.</li>
        </ul>
        <button class="cta" id="go">${free ? 'Start' : 'Kør'}</button>
      </div>
    </div>
    <div class="sim-controls">
      <div class="steer">
        <div class="blinkers"><button class="ctl" id="b-left" aria-label="Blink venstre">${I.left}</button><button class="ctl" id="b-right" aria-label="Blink højre">${I.right}</button></div>
        <div class="wheel" id="wheel">${WHEEL_SVG}</div>
      </div>
      <div class="pedals">
        <button class="ctl gearbtn" id="g-btn" aria-label="Skift mellem frem og bak">D / R</button>
        <button class="ctl pedal brake" id="brake">Brems</button>
        <button class="ctl pedal gas" id="gas">Gas</button>
      </div>
    </div>
  </section>`;
  document.body.classList.add('playing');

  // iOS Safari tolker rat + pedal (to fingre) som knibe-zoom og dobbelttryk som zoom.
  // Mens man kører, låses siden: zoom nulstilles og bevægelser afvises.
  const vp = document.querySelector('meta[name=viewport]');
  const vpWas = vp?.getAttribute('content');
  vp?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  const noGesture = e => e.preventDefault();
  const noPinch = e => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
  let lastEnd = 0;
  const noDoubleTap = e => { const now = performance.now(); if (now - lastEnd < 350 && e.target.closest('.sim')) e.preventDefault(); lastEnd = now; };
  const lockOpts = { passive: false };
  document.addEventListener('gesturestart', noGesture, lockOpts);
  document.addEventListener('gesturechange', noGesture, lockOpts);
  document.addEventListener('touchmove', noPinch, lockOpts);
  document.addEventListener('touchend', noDoubleTap, lockOpts);

  const $ = id => container.querySelector('#' + id);
  let cueTimer = null, noteTimer = null;
  const sim = createSim({
    mode,
    onCue: text => {
      $('cue').textContent = text; $('cue').hidden = false;
      clearTimeout(cueTimer); cueTimer = setTimeout(() => { $('cue').hidden = true; }, 5200);
      speak(sensor.cue(text), { rate: 1.05 });
    },
    onNote: n => {
      if (navigator.vibrate) navigator.vibrate(n.level === 'critical' ? [60, 40, 60] : 25);
      if (!showFaults && n.level !== 'critical') return;
      $('note').hidden = false; $('note').dataset.level = n.level;
      $('note-level').textContent = LEVELS[n.level]; $('note-text').textContent = n.text;
      clearTimeout(noteTimer); noteTimer = setTimeout(() => { $('note').hidden = true; }, 3600);
    },
    onEnd: r => { if (!ended) { ended = true; setTimeout(() => finish(r), 1400); } },
  });
  window.__sim = sim;
  const view = createView($('gl'), sim.net, { camera: 'cockpit' });
  const P = sim.player;

  // ---------- styring ----------
  const press = (id, on, off) => {
    const el = $(id);
    const down = e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('down'); on(); };
    const up = e => { e.preventDefault(); el.classList.remove('down'); off(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  press('gas', () => { P.input.gas = 1; }, () => { P.input.gas = 0; });
  press('brake', () => { P.input.brake = 1; }, () => { P.input.brake = 0; });
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('b-left', () => sim.blink('left'));
  tap('b-right', () => sim.blink('right'));
  const glance = (id, el) => { sim.look(id); el.classList.remove('glance'); void el.offsetWidth; el.classList.add('glance'); el.addEventListener('animationend', () => el.classList.remove('glance'), { once: true }); };
  tap('m-rear', () => glance('rear', $('m-rear')));
  tap('m-left', () => glance('left', $('m-left')));
  tap('m-right', () => glance('right', $('m-right')));
  let shoulderT = null;
  const shoulder = side => { sim.look(side === 'left' ? 'shoulderLeft' : 'shoulderRight'); view.shoulder(side); clearTimeout(shoulderT); shoulderT = setTimeout(() => view.shoulder(null), 800); if (navigator.vibrate) navigator.vibrate(10); };
  tap('s-left', () => shoulder('left'));
  tap('s-right', () => shoulder('right'));
  const toggleGear = () => { if (Math.abs(P.v) < 0.3) { P.gear = P.gear === 'D' ? 'R' : 'D'; $('gear').textContent = P.gear; $('gear').classList.toggle('rev', P.gear === 'R'); } };
  tap('g-btn', toggleGear);
  $('camera').addEventListener('click', () => view.setCamera(view.camera === 'cockpit' ? 'chase' : 'cockpit'));

  // rattet: drej ved at trække rundt om midten
  const wheel = $('wheel');
  let wAngle = 0, wPid = null, wLast = 0;
  const angleOf = e => { const r = wheel.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
  wheel.addEventListener('pointerdown', e => { e.preventDefault(); wPid = e.pointerId; wheel.setPointerCapture(e.pointerId); wLast = angleOf(e); });
  wheel.addEventListener('pointermove', e => {
    if (e.pointerId !== wPid) return;
    const a = angleOf(e); let d = a - wLast;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    wAngle = Math.max(-2.4, Math.min(2.4, wAngle + d)); wLast = a;
  });
  const wUp = e => { if (e.pointerId === wPid) wPid = null; };
  wheel.addEventListener('pointerup', wUp); wheel.addEventListener('pointercancel', wUp);

  // tastatur
  const keys = {};
  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys[k] = down;
    P.input.gas = keys.arrowup || keys.w ? 1 : (keys.gas ? 1 : 0);
    P.input.brake = keys.arrowdown || keys.s || keys[' '] ? 1 : 0;
    if (!down) return;
    if (k === 'q') sim.blink('left'); if (k === 'e') sim.blink('right');
    if (k === 'z') shoulder('left'); if (k === 'c') shoulder('right');
    if (k === '1') glance('left', $('m-left')); if (k === '2') glance('rear', $('m-rear')); if (k === '3') glance('right', $('m-right'));
    if (k === 'r') toggleGear(); if (k === 'v') view.setCamera(view.camera === 'cockpit' ? 'chase' : 'cockpit');
  };
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  $('quit').addEventListener('click', () => {
    if (free && started && !ended) { sim.ex.finish(); return; }
    location.hash = back;
  });
  $('go').addEventListener('click', () => { $('intro').remove(); started = true; speak(free ? 'Fri kørsel.' : sensor.intro); });

  // ---------- løkke ----------
  const rectOf = id => { const el = $(id), c = $('gl'); if (!el || !c) return null; const a = el.getBoundingClientRect(), b = c.getBoundingClientRect(); return { x: a.left - b.left + 3, y: a.top - b.top + 3, w: a.width - 6, h: a.height - 6 }; };
  let mirrorRects = null, rectT = 0, slowFrames = 0;
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    // tilpas opløsningen, hvis telefonen ikke kan følge med
    slowFrames = dt > 0.03 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90) { view.lowerQuality(); slowFrames = 0; }
    if (wPid == null) wAngle *= 1 - Math.min(1, dt * 5);
    const kSteer = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
    P.input.steer = kSteer || wAngle / 2.4;
    wheel.style.transform = `rotate(${(kSteer ? kSteer * 2.4 : wAngle) * 57.3 * 0.6}deg)`;
    if (started && !ended) sim.advance(dt);
    if (now - rectT > 500) { mirrorRects = { rear: rectOf('m-rear'), left: rectOf('m-left'), right: rectOf('m-right') }; rectT = now; }
    view.render(sim, dt, mirrorRects);
    hud();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function hud() {
    const kmh = Math.round(Math.abs(P.v) * 3.6);
    $('speed').textContent = kmh;
    const lane = sim.lastLane;
    if (lane) {
      $('limit').firstElementChild.textContent = lane.limit;
      $('speed').classList.toggle('over', kmh > lane.limit + 2);
      const name = sim.loc.inNode ? '' : lane.name;
      if ($('street').textContent !== name) $('street').textContent = name;
    }
    $('ind-l').classList.toggle('on', P.blinker === 'left');
    $('ind-r').classList.toggle('on', P.blinker === 'right');
    $('b-left').classList.toggle('on', P.blinker === 'left');
    $('b-right').classList.toggle('on', P.blinker === 'right');
    if (free) drawMap();
  }

  const map = free ? $('map') : null, mctx = map ? map.getContext('2d') : null;
  function drawMap() {
    const g = mctx, W = map.width, H = map.height, b = sim.net.bounds;
    const s = Math.min((W - 24) / b.x1, (H - 24) / b.y1), ox = (W - b.x1 * s) / 2, oy = (H - b.y1 * s) / 2;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(15,17,20,0.72)'; g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    for (const e of sim.net.edges) { g.strokeStyle = e.priority ? '#8a8f96' : '#555b62'; g.lineWidth = e.priority ? 5 : 3.5; g.beginPath(); g.moveTo(ox + e.a.x * s, oy + e.a.y * s); g.lineTo(ox + e.b.x * s, oy + e.b.y * s); g.stroke(); }
    g.fillStyle = '#9aa3ab';
    for (const c of sim.traffic.cars) g.fillRect(ox + c.x * s - 1.5, oy + c.y * s - 1.5, 3, 3);
    const px = ox + P.x * s, py = oy + P.y * s;
    g.save(); g.translate(px, py); g.rotate(P.h); g.fillStyle = '#f5b82e'; g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, 4.5); g.lineTo(-3, 0); g.lineTo(-5, -4.5); g.closePath(); g.fill(); g.restore();
  }

  // ---------- slut ----------
  function finish(r) {
    for (const [c, v] of Object.entries(r.perCrit)) {
      if (c === 'betjening') continue;
      const faults = v.minor * 0.5 + v.error + v.serious * 2 + v.critical * 4;
      recordSkill(c === 'tegngivning' ? 'orientering' : c, Math.max(0, Math.round(100 - faults * 18)), { note: `${Math.round(faults)} fejlpoint i bykørsel` });
    }
    if (onDone) { cleanup(); onDone(r, sensor); return; }
    cleanup();
    const text = r.passed ? sensor.verdictPass : sensor.verdictFail;
    speak(text);
    container.innerHTML = verdictHTML(r, sensor, text, { back, again: true });
    container.querySelector('#again')?.addEventListener('click', () => runSim(container, { mode, showFaults, back, onDone }));
  }

  function cleanup() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(cueTimer); clearTimeout(noteTimer); clearTimeout(shoulderT);
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    document.body.classList.remove('playing');
    document.removeEventListener('gesturestart', noGesture, lockOpts);
    document.removeEventListener('gesturechange', noGesture, lockOpts);
    document.removeEventListener('touchmove', noPinch, lockOpts);
    document.removeEventListener('touchend', noDoubleTap, lockOpts);
    if (vp && vpWas) vp.setAttribute('content', vpWas);
    view.dispose();
    if (window.__sim === sim) delete window.__sim;
  }
  return cleanup;
}

export function mount(container, params = {}) {
  return runSim(container, { mode: params.m === 'fri' ? 'free' : 'exam', showFaults: params.m === 'fri' || params.vis === '1' });
}
