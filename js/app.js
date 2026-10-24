import { get, save, readiness, STAMPS, STAMP_LIMIT, reset } from './state.js';
import { SENSORS } from './data/sensors.js';
import { hasDanishVoice, hush } from './voice.js';
import { esc } from './ui.js';
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

/* ---------- skærme ---------- */

function home() {
  const s = get();
  const r = readiness(s);
  const name = s.name || 'Elev';
  const stamps = STAMPS.map(st => {
    const best = s.skills[st.id]?.best || 0;
    const done = best >= STAMP_LIMIT;
    return `<div class="stamp ${done ? 'done' : ''}" title="${esc(st.label.replace('-', ''))}: ${best}">${done ? st.label.replace('-', '<br>') : `${best}`}</div>`;
  }).join('');
  const streak = s.streakDays.length;
  const last = s.log[0];
  const msg = r === 0 ? 'Start med én kørsel, så tegner kortet sig.' : r < 50 ? 'Den svageste disciplin holder dig nede. Det er bevidst.' : r < 80 ? 'Du er på vej. Kør prøvedagen igennem et par gange.' : 'Alle discipliner er med. Nu er det nerverne, der skal trænes.';

  app.innerHTML = `
  <section class="screen">
    <h1 style="margin-bottom:12px">Køreprøven</h1>
    <div class="licence" aria-label="Dit træningskørekort">
      <div class="head">
        <div><div class="country">DANMARK</div><div class="title">Træningskørekort · ikke et kørekort</div></div>
        <div class="cat">B</div>
      </div>
      <div class="name">${esc(name)}</div>
      <div class="stamps">${stamps}</div>
      <div class="meter">Klar til prøven <b>${r}</b> af 100 · ${esc(msg)}</div>
    </div>

    <div class="section">
      <h2>I dag</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/skilt'"><span class="t">Skiltet på dagen</span><span class="d">Ét spørgsmål. Tager 20 sekunder.</span><span class="meta weak">${skilt.doneToday() ? 'Klaret' : 'Nyt'}</span></button></li>
        <li><button onclick="location.hash='#/proeve'"><span class="t">Kør prøvedagen</span><span class="d">Venteværelse, kontrolspørgsmål, 25 minutters kørsel, dom.</span><span class="meta">${s.skills.proevedag.best || '–'}</span></button></li>
        <li><button onclick="location.hash='#/traen'"><span class="t">Træn én disciplin</span><span class="d">Beslutningskørsel, skulderblik, fareopfattelse, kontrol.</span><span class="meta weak">${streak ? `${streak} dage` : ''}</span></button></li>
      </ul>
    </div>

    ${last ? `<div class="section"><h2>Sidst</h2><div class="card"><div class="kv"><span>${esc(label(last.skill))}</span><b>${last.score}</b></div>${last.note ? `<p class="note" style="margin:8px 0 0">${esc(last.note)}</p>` : ''}</div></div>` : ''}

    <div class="section">
      <p class="note">Dette er træning af beslutninger — ikke køreundervisning. Spillet erstatter ikke køretimer og lover ikke, at du består. Bedømmelsen følger faste regler, der er bygget efter Færdselsstyrelsens bedømmelsesområder.</p>
    </div>
  </section>`;
}

function label(skill) {
  return { orientering: 'Orientering', vigepligt: 'Vigepligt', hastighed: 'Hastighed', placering: 'Placering', skulderblik: 'Skulderblik', fare: 'Fareopfattelse', kontrol: 'Kontrolspørgsmål', proevedag: 'Prøvedagen', beslutning: 'Beslutningskørsel' }[skill] || skill;
}

function train() {
  const s = get();
  const b = id => s.skills[id]?.best ? `${s.skills[id].best}` : '–';
  app.innerHTML = `
  <section class="screen">
    <h1>Træn</h1>
    <p class="note">Hver øvelse tager 2–5 minutter. Stemplet kommer ved 80 point.</p>
    <div class="section">
      <h2>Bag rattet</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/beslutning'"><span class="t">Beslutningskørsel</span><span class="d">Bilen kører. Billedet fryser. Du har 2 sekunder.</span><span class="meta">${b('orientering')}</span></button></li>
        <li><button onclick="location.hash='#/spil/skulderblik'"><span class="t">Skulderblik-rytme</span><span class="d">Spejl, spejl, skulder — i rigtig rækkefølge, hurtigere og hurtigere.</span><span class="meta">${b('skulderblik')}</span></button></li>
        <li><button onclick="location.hash='#/spil/fare'"><span class="t">Fareopfattelse</span><span class="d">Tryk i det øjeblik, faren opstår. Point for at se den tidligt.</span><span class="meta">${b('fare')}</span></button></li>
      </ul>
    </div>
    <div class="section">
      <h2>Ved bilen</h2>
      <ul class="menu">
        <li><button onclick="location.hash='#/spil/kontrol'"><span class="t">Kontrolspørgsmål</span><span class="d">Alle emner fra prøven. Spørgsmål, svar og hvordan du viser det.</span><span class="meta">${b('kontrol')}</span></button></li>
        <li><button onclick="location.hash='#/spil/biltjek'"><span class="t">Find det på en rigtig bil</span><span class="d">Skattejagt på familiens bil. Kryds af, når du har fundet det.</span><span class="meta weak">${Object.values(s.bilTjek).filter(Boolean).length} fundet</span></button></li>
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
    <h1>Indstillinger</h1>
    <div class="card">
      <label for="name" class="note">Navnet på kørekortet</label>
      <input id="name" type="text" value="${esc(s.name)}" placeholder="Dit fornavn" maxlength="24" autocomplete="given-name">
    </div>
    <div class="card">
      <div class="toggle-row"><div><div>Sensoren taler</div><div class="note">${hasDanishVoice() ? 'Dansk stemme fundet på telefonen.' : 'Ingen dansk stemme fundet — teksten vises altid.'}</div></div><input type="checkbox" id="tts" ${s.tts ? 'checked' : ''}></div>
      <div class="toggle-row"><div><div>Sensor</div><div class="note">Tilfældig er mest realistisk.</div></div>
        <select id="sensor" style="font:inherit;padding:8px;border-radius:8px;border:1px solid var(--streg)">
          <option value="random" ${s.sensorId === 'random' ? 'selected' : ''}>Tilfældig</option>
          ${SENSORS.map(x => `<option value="${x.id}" ${s.sensorId === x.id ? 'selected' : ''}>${x.name} – ${x.style}</option>`).join('')}
        </select></div>
    </div>
    <div class="card">
      <p>Alt gemmes kun på denne telefon. Der er ingen konto og ingen server.</p>
      <button class="btn ghost" id="reset">Slet alt og start forfra</button>
    </div>
    <div class="section"><h2>Om spillet</h2>
      <p>Spillet træner de beslutninger, sensoren bedømmer til den praktiske køreprøve: orientering, hastighedstilpasning, placering, vigepligt og tegngivning. Bedømmelsen er faste regler, ikke AI.</p>
      <p>Det erstatter ikke køreskolen. Køretimer, manøvrebane og glatbane er obligatoriske og kan ikke øves på en telefon.</p>
      <p class="note">Kilder til indholdet står i <a href="https://github.com/Aske0772/koere-og-teoriproeven/blob/main/docs/RESEARCH.md">docs/RESEARCH.md</a>.</p>
    </div>
  </section>`;
  app.querySelector('#name').addEventListener('change', e => save({ name: e.target.value.trim() }));
  app.querySelector('#tts').addEventListener('change', e => { save({ tts: e.target.checked }); if (!e.target.checked) hush(); });
  app.querySelector('#sensor').addEventListener('change', e => save({ sensorId: e.target.value }));
  app.querySelector('#reset').addEventListener('click', () => { if (confirm('Slet al træning på denne telefon?')) { reset(); home(); } });
}

/* ---------- router ---------- */

const routes = {
  '': home,
  '/': home,
  '/traen': train,
  '/proeve': (p) => proevedag.mount(app, p),
  '/indstillinger': settings,
  '/spil/beslutning': (p) => beslutning.mount(app, p),
  '/spil/skulderblik': (p) => skulderblik.mount(app, p),
  '/spil/fare': (p) => fare.mount(app, p),
  '/spil/kontrol': (p) => kontrol.mount(app, p),
  '/spil/biltjek': (p) => biltjek.mount(app, p),
  '/spil/passager': (p) => passager.mount(app, p),
  '/spil/skilt': (p) => skilt.mount(app, p),
};

function render() {
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  cleanup = null;
  hush();
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  const fn = routes[path] || home;
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  const r = fn(params);
  if (typeof r === 'function') cleanup = r;
  window.scrollTo(0, 0);
  renderTabs(path);
}

function renderTabs(path) {
  const items = [
    ['#/', 'Hjem', '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>'],
    ['#/traen', 'Træn', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['#/proeve', 'Prøvedag', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'],
    ['#/indstillinger', 'Mere', '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>'],
  ];
  const active = (href) => href === '#/' ? (path === '' || path === '/') : href === '#/traen' ? (path.startsWith('/traen') || path.startsWith('/spil')) : path.startsWith(href.slice(1));
  tabs.innerHTML = items.map(([href, l, ico]) => `<button class="${active(href) ? 'on' : ''}" onclick="location.hash='${href}'" aria-current="${active(href) ? 'page' : 'false'}"><svg viewBox="0 0 24 24">${ico}</svg>${l}</button>`).join('');
}

window.addEventListener('hashchange', render);
render();
