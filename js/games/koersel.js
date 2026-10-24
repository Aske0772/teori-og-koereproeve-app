// Kørslen: det rigtige spil. Du kører, sensoren noterer.
import { createGame, LEVELS, CRITERIA } from '../engine/game.js';
import { createRenderer, VIEW } from '../engine/render.js';
import { ROUTES } from '../data/routes.js';
import { pickSensor } from '../data/sensors.js';
import { speak } from '../voice.js';
import { get, recordSkill } from '../state.js';
import { esc } from '../ui.js';

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 10H8.8l3.6-3.6L11 5l-7 7 7 7 1.4-1.4L8.8 14H20z"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 14h11.2l-3.6 3.6L13 19l7-7-7-7-1.4 1.4 3.6 3.6H4z"/></svg>',
};

export function runDrive(container, { routeId = 'bytur', sensor, showFaults = true, title = 'Kørsel', back = '#/', onDone } = {}) {
  const route = ROUTES[routeId].build();
  sensor = sensor || pickSensor(get().sensorId);
  let raf = null, alive = true, last = 0, shoulderTimer = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  container.innerHTML = `
  <section class="drive">
    <header class="drive-top">
      <button class="icon-btn" id="quit" aria-label="Afslut kørsel">${ICON.back}</button>
      <div class="drive-sensor"><span class="dot" style="background:${sensor.color}"></span>${esc(sensor.name)}</div>
      <div class="drive-limit" id="limit"><span>50</span></div>
    </header>
    <div class="stage" id="stage">
      <canvas id="road" width="${VIEW.W}" height="${VIEW.H}" aria-label="Udsyn gennem forruden"></canvas>
      <button class="mirror-hit rear" id="m-rear" aria-label="Kig i bakspejlet"></button>
      <button class="mirror-hit left" id="m-left" aria-label="Kig i venstre sidespejl"></button>
      <button class="mirror-hit right" id="m-right" aria-label="Kig i højre sidespejl"></button>
      <button class="shoulder left" id="s-left" aria-label="Skulderblik til venstre"><span>Skulder</span></button>
      <button class="shoulder right" id="s-right" aria-label="Skulderblik til højre"><span>Skulder</span></button>
      <div class="shoulder-view" id="sview" hidden><canvas width="240" height="160"></canvas><div class="sv-label" id="sv-label"></div></div>
      <div class="cue" id="cue" hidden></div>
      <div class="hud-note" id="note" hidden><b id="note-level"></b><span id="note-text"></span></div>
      <div class="speed"><b id="speed">0</b><small>km/t</small></div>
      <div class="blink l" id="bl-l">${ICON.arrowL}</div>
      <div class="blink r" id="bl-r">${ICON.arrowR}</div>
      <div class="intro" id="intro">
        <p class="intro-say">${esc(sensor.intro)}</p>
        <p class="intro-how">Rat: træk i striben. Spejle og skulderblik: tryk. Blink før du gør noget.</p>
        <button class="cta" id="go">Kør</button>
      </div>
    </div>
    <div class="controls">
      <button class="ctl blinkbtn" id="b-left" aria-label="Blink venstre">${ICON.arrowL}</button>
      <div class="wheel" id="wheel"><div class="wheel-track"><div class="wheel-knob" id="knob"></div></div><span>Rat</span></div>
      <button class="ctl blinkbtn" id="b-right" aria-label="Blink højre">${ICON.arrowR}</button>
      <button class="ctl pedal brake" id="brake">Brems</button>
      <button class="ctl pedal gas" id="gas">Gas</button>
    </div>
  </section>`;

  const $ = id => container.querySelector('#' + id);
  const canvas = $('road'), renderer = createRenderer(canvas);
  const game = createGame(route, {
    showFaults,
    onCue: text => { $('cue').textContent = text; $('cue').hidden = false; speak(sensor.cue(text), { rate: 1.05 }); },
    onNote: n => {
      if (!showFaults) { $('note').hidden = false; $('note-level').textContent = 'Noteret'; $('note-text').textContent = ''; setTimeout(() => { $('note').hidden = true; }, 900); }
    },
    onEnd: finish,
  });
  const G = game.g;
  G.cue = sensor.intro;
  window.__drive = { G, game };

  // ---------- input ----------
  const press = (id, on, off) => {
    const el = $(id);
    const down = e => { e.preventDefault(); el.classList.add('down'); on(); };
    const up = e => { e && e.preventDefault(); el.classList.remove('down'); off && off(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  };
  press('gas', () => { G.input.gas = true; }, () => { G.input.gas = false; });
  press('brake', () => { G.input.brake = true; }, () => { G.input.brake = false; });
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  tap('b-left', () => setBlink('left')); tap('b-right', () => setBlink('right'));
  tap('m-rear', () => game.look('rear')); tap('m-left', () => game.look('left')); tap('m-right', () => game.look('right'));
  tap('s-left', () => shoulder('left')); tap('s-right', () => shoulder('right'));
  function setBlink(side) { game.setBlinker(side); $('bl-l').classList.toggle('on', G.player.blinker === 'left'); $('bl-r').classList.toggle('on', G.player.blinker === 'right'); }
  function shoulder(side) {
    game.look(side === 'left' ? 'shoulderLeft' : 'shoulderRight');
    const v = $('sview'); v.hidden = false; v.dataset.side = side;
    const seen = renderer.drawShoulder(v.querySelector('canvas'), side, G);
    $('sv-label').textContent = seen ? (seen.type === 'cyclist' ? 'Cyklist!' : 'Bil ved siden af') : 'Frit';
    clearTimeout(shoulderTimer); shoulderTimer = setTimeout(() => { v.hidden = true; }, 750);
    if (navigator.vibrate) navigator.vibrate(12);
  }
  // rat: slider
  const wheel = $('wheel'), knob = $('knob');
  let steerId = null;
  const setSteer = (clientX) => { const r = wheel.getBoundingClientRect(); const v = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width - 0.5) * 2.4)); G.input.steer = v; knob.style.transform = `translateX(${v * (r.width / 2 - 26)}px)`; };
  wheel.addEventListener('pointerdown', e => { e.preventDefault(); steerId = e.pointerId; wheel.setPointerCapture(e.pointerId); setSteer(e.clientX); });
  wheel.addEventListener('pointermove', e => { if (e.pointerId === steerId) setSteer(e.clientX); });
  const releaseSteer = e => { if (e.pointerId === steerId) { steerId = null; G.input.steer = 0; knob.style.transform = ''; } };
  wheel.addEventListener('pointerup', releaseSteer); wheel.addEventListener('pointercancel', releaseSteer);
  // tastatur
  const keys = {};
  const onKey = (e, down) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    keys[k] = down;
    const steerKeys = (keys['arrowleft'] || keys['a'] ? -1 : 0) + (keys['arrowright'] || keys['d'] ? 1 : 0);
    G.input.steer = steerKeys; G.input.gas = !!(keys['arrowup'] || keys['w']); G.input.brake = !!(keys['arrowdown'] || keys['s'] || keys[' ']);
    if (down) {
      if (k === 'q') setBlink('left'); if (k === 'e') setBlink('right');
      if (k === 'z') shoulder('left'); if (k === 'c') shoulder('right');
      if (k === '1') game.look('left'); if (k === '2') game.look('rear'); if (k === '3') game.look('right');
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  };
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  $('quit').addEventListener('click', () => { location.hash = back; });
  $('go').addEventListener('click', () => { $('intro').remove(); speak(sensor.intro); start(); });

  // ---------- loop ----------
  let started = false;
  function start() { started = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (started) game.update(dt);
    renderer.draw(G);
    hud();
    raf = requestAnimationFrame(frame);
  }
  renderer.draw(G);

  let lastFlash = null;
  function hud() {
    const v = Math.round(G.player.speed * 3.6);
    $('speed').textContent = v;
    const seg = route.segs[Math.min(route.segs.length - 1, Math.floor(G.player.z / 5))];
    $('limit').firstElementChild.textContent = seg.limit;
    $('speed').classList.toggle('over', v > seg.limit + 2);
    if (G.cue && G.t > G.cueUntil) { $('cue').hidden = true; G.cue = null; }
    if (showFaults) {
      if (G.flash && G.flash !== lastFlash) { lastFlash = G.flash; $('note').hidden = false; $('note-level').textContent = LEVELS[G.flash.level]; $('note-text').textContent = G.flash.text; $('note').dataset.level = G.flash.level; }
      if (G.flash && G.t > G.flashUntil) { $('note').hidden = true; G.flash = null; }
    }
    $('bl-l').classList.toggle('on', G.player.blinker === 'left'); $('bl-r').classList.toggle('on', G.player.blinker === 'right');
  }

  // ---------- dom ----------
  function finish(r) {
    const perCrit = r.perCrit;
    for (const [c, v] of Object.entries(perCrit)) {
      if (!CRITERIA[c] || c === 'betjening') continue;
      const faults = v.minor * 0.5 + v.error + v.serious * 2 + v.critical * 4;
      recordSkill(c === 'tegngivning' ? 'orientering' : c, Math.max(0, Math.round(100 - faults * 18)), { note: `${Math.round(faults)} fejlpoint` });
    }
    if (onDone) { setTimeout(() => onDone(r, sensor), 1200); return; }
    setTimeout(() => showVerdict(r), 1200);
  }

  function showVerdict(r) {
    alive = false; cancelAnimationFrame(raf);
    const text = r.passed ? sensor.verdictPass : sensor.verdictFail;
    speak(text);
    container.innerHTML = verdictHTML(r, sensor, text, { back, again: true });
    container.querySelector('#again')?.addEventListener('click', () => { cleanup(); runDrive(container, { routeId, showFaults, title, back, onDone }); });
  }

  function cleanup() { alive = false; cancelAnimationFrame(raf); clearTimeout(shoulderTimer); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); }
  return cleanup;
}

export function verdictHTML(r, sensor, text, { back = '#/', again = false, extraRows = '' } = {}) {
  const mins = Math.floor(r.stats.time / 60), secs = Math.round(r.stats.time % 60);
  const rows = Object.entries(r.perCrit).filter(([c]) => CRITERIA[c]).map(([c, v]) => {
    const parts = []; if (v.critical) parts.push(`${v.critical} meget alvorlig`); if (v.serious) parts.push(`${v.serious} alvorlig`); if (v.error) parts.push(`${v.error} fejl`); if (v.minor) parts.push(`${v.minor} mindre`);
    return `<div class="row ${v.critical || v.serious ? 'bad' : parts.length ? 'mid' : 'ok'}"><span>${esc(CRITERIA[c])}</span><b>${parts.join(', ') || 'opfyldt'}</b></div>`;
  }).join('');
  return `
  <section class="verdict ${r.passed ? 'pass' : 'fail'}">
    <div class="verdict-head">
      <div class="stamp-big">${r.passed ? 'Bestået' : 'Ikke bestået'}</div>
      <div class="score"><b>${r.score}</b><span>point</span></div>
    </div>
    <p class="verdict-say"><span class="dot" style="background:${sensor.color}"></span>${esc(text)}</p>
    ${r.reason ? `<p class="verdict-reason">${esc(r.reason)}</p>` : ''}
    <div class="schema2">${extraRows}${rows}</div>
    <p class="muted">${mins} min ${secs} s · ${(r.stats.distance / 1000).toFixed(1).replace('.', ',')} km · højeste fart ${Math.round(r.stats.maxSpeed)} km/t. Til den rigtige prøve er dommen et skøn ud fra de samme fire fejlniveauer; her er den en fast regel.</p>
    ${r.notes.length ? `<h2>Gennemgang i bilen</h2><ol class="notes">${r.notes.map(n => `<li data-level="${n.level}"><b>${esc(LEVELS[n.level])}</b><span>${esc(n.text)}</span><small>${esc(CRITERIA[n.criterion])} · ${Math.floor(n.t / 60)}:${String(Math.round(n.t % 60)).padStart(2, '0')}</small></li>`).join('')}</ol>` : '<p class="clean">Ingen notater. Det sker sjældent.</p>'}
    <div class="btnrow">${again ? '<button class="cta" id="again">Kør igen</button>' : ''}<button class="cta ghost" onclick="location.hash='${back}'">Færdig</button></div>
  </section>`;
}

export function mount(container, params = {}) {
  return runDrive(container, { routeId: params.r || 'bytur', showFaults: params.quiet !== '1' });
}
