import { get, save, readiness, STAMPS, STAMP_LIMIT, reset } from './state.js';
import { SENSORS } from './data/sensors.js';
import { hasDanishVoice, hush } from './voice.js';
import { esc } from './ui.js';
import * as bykoersel from './games/bykoersel.js';
import * as koerselstraening from './games/koerselstraening.js';
import * as beslutning from './games/beslutning.js';
import * as skulderblik from './games/skulderblik.js';
import * as fare from './games/fare.js';
import * as kontrol from './games/kontrol.js';
import * as biltjek from './games/biltjek.js';
import * as passager from './games/passager.js';
import * as proevedag from './games/proevedag.js';
import * as skilt from './games/skilt.js';

const app = document.getElementById('app');
const tabs = document.getElementById('tabs');
let cleanup = null;

/* ---------- hjem: byen lever bag titlen ---------- */
async function attract(canvas) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [{ createSim }, { createView }, { createAutopilot }] = await Promise.all([import('./sim/sim.js'), import('./sim/view3d.js'), import('./sim/autopilot.js')]);
  if (!canvas.isConnected) return () => {};
  const sim = createSim({ mode: 'free', cars: 14 });
  sim.ex.E.over = true;   // ingen bedømmelse her
  const ap = createAutopilot(sim);
  const view = createView(canvas, sim.net, { camera: 'chase', maxDpr: 1.25 });
  view.setCamera('chase');
  let raf = null, last = performance.now(), alive = true;
  for (let i = 0; i < 60 * 3; i++) { ap.step(1 / 60); sim.step(1 / 60); }
  const frame = now => {
    if (!alive || !canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) sim.advance(dt, step => ap.step(step));
    view.render(sim, dt, null);
    raf = requestAnimationFrame(frame);
  };
  view.render(sim, 0.016, null);
  raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); view.dispose(); };
}

function home() {
  const s = get();
  const rd = readiness(s);
  const name = s.name || 'Elev';
  const stamps = STAMPS.map(st => {
    const best = s.skills[st.id]?.best || 0, done = best >= STAMP_LIMIT;
    return `<div class="stamp ${done ? 'done' : ''}" title="${esc(st.label.replace('-', ''))}: ${best}">${done ? st.label.replace('-', '<br>') : best}</div>`;
  }).join('');
  const msg = rd === 0 ? 'Kør én tur, så begynder kortet at fylde sig.' : rd < 50 ? 'Den svageste disciplin holder dig nede. Det er meningen.' : rd < 80 ? 'På vej. Kør prøvedagen et par gange.' : 'Alle discipliner er med. Nu er det nerverne.';
  app.innerHTML = `
  <section class="screen" style="padding-top:0">
    <div class="hero">
      <canvas class="city" aria-hidden="true"></canvas>
      <div class="hero-copy">
        <h1><span class="line"><span>Køre-</span></span><span class="line"><span>prøven</span></span></h1>
        <p>Bilen kører prøveruten og stopper, hver gang du skal orientere dig. Eller kør selv, mens sensoren giver anvisninger og noterer. Samme regler som til den rigtige prøve.</p>
        <div class="hero-cta"><button class="cta" onclick="location.hash='#/spil/traening'">Kørselstræning</button><button class="cta ghost" onclick="location.hash='#/spil/bykoersel?vis=1'">Kør selv</button></div>
      </div>
    </div>

    <div class="section">
      <div class="licence" aria-label="Dit træningskørekort">
        <div class="head"><div><div class="country">DANMARK</div><div class="title">Træningskørekort, ikke et kørekort</div></div><div class="cat">B</div></div>
        <div class="name">${esc(name)}</div>
        <div class="stamps">${stamps}</div>
        <div class="meter">Klar til prøven <b>${rd}</b> af 100. ${esc(msg)}</div>
      </div>
    </div>

    <div class="section">
      <h2>I dag</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/skilt'"><span class="t">Skiltet på dagen</span><span class="d">Ét spørgsmål. 20 sekunder.</span><span class="meta weak">${skilt.doneToday() ? 'Klaret' : 'Nyt'}</span></button></li>
        <li><button onclick="location.hash='#/traen'"><span class="t">Træn én disciplin</span><span class="d">Skulderblik, fareopfattelse, kontrolspørgsmål, hurtige beslutninger.</span><span class="meta weak">${s.streakDays.length ? `${s.streakDays.length} dage` : ''}</span></button></li>
      </ul>
    </div>

    <div class="section">
      <p class="muted">Træning af beslutninger, ikke køreundervisning. Spillet erstatter ikke køretimer og lover ikke, at du består. Bedømmelsen er faste regler bygget efter Færdselsstyrelsens fire fejlniveauer.</p>
    </div>
  </section>`;
  return attract(app.querySelector('.hero canvas'));
}

function label(skill) {
  return { orientering: 'Orientering', vigepligt: 'Vigepligt', hastighed: 'Hastighed', placering: 'Placering', skulderblik: 'Skulderblik', fare: 'Fareopfattelse', kontrol: 'Kontrolspørgsmål', proevedag: 'Prøvedagen' }[skill] || skill;
}

function train() {
  const s = get();
  const b = id => s.skills[id]?.best ? `${s.skills[id].best}` : '–';
  app.innerHTML = `
  <section class="screen">
    <h1>Træn</h1>
    <p class="muted">Hver øvelse tager 2 til 6 minutter. Stemplet kommer ved 80 point.</p>
    <div class="section">
      <h2>Bag rattet</h2>
      <ul class="menu">
        <li class="wide"><button onclick="location.hash='#/spil/traening'"><span class="t">Kørselstræning</span><span class="d">Bilen kører selv prøveruten og stopper, når du skal orientere dig. Tryk på spejle, skulderblik og blink, og vælg om du kører eller holder tilbage.</span><span class="meta weak">Ny</span></button></li>
        <li class="wide"><button onclick="location.hash='#/spil/bykoersel?vis=1'"><span class="t">Bykørsel med sensor</span><span class="d">2,7 km prøverute med lyskryds, stopskilt, rundkørsel, cyklister og fodgængere. Fejl vises med det samme.</span><span class="meta">${b('vigepligt')}</span></button></li>
        <li><button onclick="location.hash='#/spil/bykoersel?m=fri'"><span class="t">Fri kørsel</span><span class="d">Kør hvor du vil i byen, med kort.</span><span class="meta weak">Kort</span></button></li>
        <li><button onclick="location.hash='#/spil/skulderblik'"><span class="t">Skulderblik-rytme</span><span class="d">Spejl, spejl, blink, skulder. Tempoet stiger.</span><span class="meta">${b('skulderblik')}</span></button></li>
        <li><button onclick="location.hash='#/spil/fare'"><span class="t">Fareopfattelse</span><span class="d">Tryk, når faren begynder. Point for at se den tidligt.</span><span class="meta">${b('fare')}</span></button></li>
        <li><button onclick="location.hash='#/spil/beslutning'"><span class="t">Hurtige beslutninger</span><span class="d">Billedet fryser. Du har 2 sekunder.</span><span class="meta">${b('orientering')}</span></button></li>
      </ul>
    </div>
    <div class="section">
      <h2>Ved bilen</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/kontrol'"><span class="t">Kontrolspørgsmål</span><span class="d">Alle afsnit fra kontrolprøven. Spørgsmål, krav og hvordan du viser det.</span><span class="meta">${b('kontrol')}</span></button></li>
        <li><button onclick="location.hash='#/spil/biltjek'"><span class="t">Find det på en rigtig bil</span><span class="d">Skattejagt på familiens bil.</span><span class="meta weak">${Object.values(s.bilTjek).filter(Boolean).length} fundet</span></button></li>
      </ul>
    </div>
    <div class="section">
      <h2>Væk fra skærmen</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/passager'"><span class="t">Passagertilstand</span><span class="d">Sid ved siden af én, der kører. Tæl de fejl, du ser.</span><span class="meta weak">Tjekliste</span></button></li>
      </ul>
    </div>
  </section>`;
}

function settings() {
  const s = get();
  app.innerHTML = `
  <section class="screen">
    <h1>Mere</h1>
    <div class="card">
      <label for="name" class="muted">Navnet på kørekortet</label>
      <input id="name" type="text" value="${esc(s.name)}" placeholder="Dit fornavn" maxlength="24" autocomplete="given-name" style="margin-top:6px">
    </div>
    <div class="card">
      <div class="toggle-row"><div><div>Sensoren taler</div><div class="muted">${hasDanishVoice() ? 'Dansk stemme fundet på telefonen.' : 'Ingen dansk stemme fundet. Teksten vises altid.'}</div></div><input type="checkbox" id="tts" ${s.tts ? 'checked' : ''}></div>
      <div class="toggle-row"><div><div>Sensor</div><div class="muted">Tilfældig er mest realistisk.</div></div>
        <select id="sensor"><option value="random" ${s.sensorId === 'random' ? 'selected' : ''}>Tilfældig</option>${SENSORS.map(x => `<option value="${x.id}" ${s.sensorId === x.id ? 'selected' : ''}>${x.name}, ${x.style.toLowerCase()}</option>`).join('')}</select></div>
    </div>
    <div class="card">
      <p>Alt gemmes kun på denne telefon. Ingen konto, ingen server.</p>
      <button class="btn ghost" id="reset">Slet alt og start forfra</button>
    </div>
    <div class="section"><h2>Om spillet</h2>
      <p>Spillet træner de beslutninger, sensoren bedømmer til den praktiske køreprøve: orientering, hastighedstilpasning, placering, vigepligt og tegngivning. Bedømmelsen er faste regler, ikke AI.</p>
      <p>Det erstatter ikke køreskolen. Køreuddannelsen har mindst 30 teorilektioner og 24 kørelektioner, heraf 3 på manøvrebane og 4 på køreteknisk anlæg (regler fra 1. juli 2026). Det kan ikke øves på en telefon.</p>
      <p>I 2025 blev 67,8 % af de praktiske prøver bestået på landsplan, fra 55,7 % i København til 81,4 % i Østjylland (Færdselsstyrelsens prøvestatistik).</p>
      <p class="muted">Tastatur i kørslen: piletaster eller WASD, Q/E blink, Z/C skulderblik, 1/2/3 spejle. Kilder står i <a href="https://github.com/Aske0772/teori-og-koereproeve-app/blob/main/docs/RESEARCH.md">docs/RESEARCH.md</a>.</p>
    </div>
  </section>`;
  app.querySelector('#name').addEventListener('change', e => save({ name: e.target.value.trim() }));
  app.querySelector('#tts').addEventListener('change', e => { save({ tts: e.target.checked }); if (!e.target.checked) hush(); });
  app.querySelector('#sensor').addEventListener('change', e => save({ sensorId: e.target.value }));
  app.querySelector('#reset').addEventListener('click', () => { if (confirm('Slet al træning på denne telefon?')) { reset(); home(); } });
}

/* ---------- router ---------- */
const routes = {
  '': home, '/': home,
  '/traen': train,
  '/proeve': p => proevedag.mount(app, p),
  '/indstillinger': settings,
  '/spil/traening': p => koerselstraening.mount(app, p),
  '/spil/bykoersel': p => bykoersel.mount(app, p),
  '/spil/koersel': p => bykoersel.mount(app, { vis: '1' }),
  '/spil/beslutning': p => beslutning.mount(app, p),
  '/spil/skulderblik': p => skulderblik.mount(app, p),
  '/spil/fare': p => fare.mount(app, p),
  '/spil/kontrol': p => kontrol.mount(app, p),
  '/spil/biltjek': p => biltjek.mount(app, p),
  '/spil/passager': p => passager.mount(app, p),
  '/spil/skilt': p => skilt.mount(app, p),
};
const PLAYING = [];

function render() {
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  document.body.classList.remove('playing');
  cleanup = null; hush();
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  const fn = routes[path] || home;
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  document.body.classList.toggle('playing', PLAYING.includes(path));
  const r = fn(params);
  if (typeof r === 'function') cleanup = r;
  else if (r && typeof r.then === 'function') { const mine = {}; cleanup = mine; r.then(c => { if (cleanup === mine) cleanup = c; else if (typeof c === 'function') c(); }); }
  window.scrollTo(0, 0);
  renderTabs(path);
}

function renderTabs(path) {
  const items = [
    ['#/', 'Hjem', '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>'],
    ['#/traen', 'Træn', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['#/proeve', 'Prøvedag', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'],
    ['#/indstillinger', 'Mere', '<circle cx="12" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'],
  ];
  const active = href => href === '#/' ? (path === '' || path === '/') : href === '#/traen' ? (path.startsWith('/traen') || path.startsWith('/spil')) : path.startsWith(href.slice(1));
  tabs.innerHTML = items.map(([href, l, ico]) => `<button class="${active(href) ? 'on' : ''}" onclick="location.hash='${href}'" aria-current="${active(href) ? 'page' : 'false'}"><svg viewBox="0 0 24 24">${ico}</svg>${l}</button>`).join('');
}

window.addEventListener('hashchange', render);
render();
