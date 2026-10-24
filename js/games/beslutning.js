// Beslutningskørsel: bilen kører selv, billedet fryser, du vælger på 2 sekunder.
import { renderScene } from '../scene.js';
import { SCENARIOS, CRITERIA, LEVELS, judge } from '../data/scenarios.js';
import { pickSensor, say } from '../data/sensors.js';
import { speak } from '../voice.js';
import { get, recordSkill } from '../state.js';
import { topbar, esc } from '../ui.js';

export const THINK_MS = 2200;      // betænkningstid
export const APPROACH_MS = 2600;   // bilen nærmer sig

export function pickScenarios(n = 10, { criterion } = {}) {
  const pool = criterion ? SCENARIOS.filter(s => s.criterion === criterion) : SCENARIOS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  // spred kriterierne, så en kørsel ikke kun er vigepligt
  const out = [];
  const byCrit = {};
  for (const s of shuffled) (byCrit[s.criterion] ||= []).push(s);
  const keys = Object.keys(byCrit);
  let i = 0;
  while (out.length < n && keys.some(k => byCrit[k].length)) {
    const k = keys[i % keys.length]; i++;
    if (byCrit[k].length) out.push(byCrit[k].shift());
  }
  return out;
}

// Kører en liste af scenarier i containeren og kalder onDone(result).
// Bruges både af den frie træning og af prøvedagen.
export function runDrive(container, { scenarios, sensor, title = 'Beslutningskørsel', back = '#/traen', onDone, intro = true }) {
  let idx = 0;
  const results = [];
  let timers = [];
  let raf = null;
  let alive = true;

  const clearAll = () => { timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = null; };
  const after = (ms, fn) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };

  function shell(inner, step) {
    container.innerHTML = `<section class="screen">${topbar(title, { back, step })}${inner}</section>`;
  }

  function sensorLine(text, who = sensor) {
    return `<div class="sensor-line"><div class="avatar" style="background:${who.color}">${who.initials}</div><div class="bubble"><div class="who">${esc(who.name)} · ${esc(who.style)}</div><div class="say">${esc(text)}</div></div></div>`;
  }

  function showIntro() {
    shell(`
      ${sensorLine(sensor.intro)}
      <div class="card"><p>Bilen kører selv. Når billedet fryser, har du <b>${(THINK_MS / 1000).toFixed(1).replace('.', ',')} sekunder</b> til at vælge, hvad du gør. Vælger du ikke, tæller det som tøven.</p>
      <p class="note">Fejl bedømmes i fire niveauer som til prøven: mindre fejl, fejl, alvorlig og meget alvorlig. Én meget alvorlig fejl er nok til ikke bestået. Men du kører turen færdig — det gør man også i virkeligheden.</p></div>
      <div class="btnrow"><button class="btn full" id="start">Kør</button></div>`, `${scenarios.length} beslutninger`);
    speak(sensor.intro);
    container.querySelector('#start').addEventListener('click', () => next());
  }

  function next() {
    if (!alive) return;
    if (idx >= scenarios.length) return finish();
    const sc = scenarios[idx];
    const cue = sensor.cue(sc.cue);
    shell(`
      <div class="scene" id="scene"><div class="freeze"></div></div>
      ${sensorLine(cue)}
      <div class="pen" id="pen"><i style="transform:scaleX(0)"></i></div>
      <div class="choices" id="choices" aria-live="off"></div>`, `${idx + 1} af ${scenarios.length}`);
    speak(cue, { rate: 1.05 });

    const sceneEl = container.querySelector('#scene');
    const start = performance.now();
    // bilen nærmer sig: objekter kommer tættere på
    const approach = (now) => {
      if (!alive) return;
      const t = Math.min(1, (now - start) / APPROACH_MS);
      const e = 1 - Math.pow(1 - t, 2);
      const scene = {
        ...sc.scene,
        objects: (sc.scene.objects || []).map(o => ({ ...o, d: Math.min(0.98, o.d + (o.approach ?? 0.28) * (1 - e)) })),
        junction: sc.scene.junction ? { ...sc.scene.junction, d: Math.min(0.95, sc.scene.junction.d + 0.3 * (1 - e)) } : undefined,
        zebra: sc.scene.zebra != null ? Math.min(0.95, sc.scene.zebra + 0.3 * (1 - e)) : undefined,
        roundabout: sc.scene.roundabout ? { ...sc.scene.roundabout, d: Math.min(0.95, sc.scene.roundabout.d + 0.3 * (1 - e)) } : undefined,
      };
      sceneEl.insertAdjacentHTML('afterbegin', renderScene(scene));
      const svgs = sceneEl.querySelectorAll('svg');
      if (svgs.length > 1) svgs[1].remove();
      if (t < 1) raf = requestAnimationFrame(approach); else freeze();
    };
    raf = requestAnimationFrame(approach);

    function freeze() {
      sceneEl.classList.add('frozen');
      const choices = [...sc.choices].sort(() => Math.random() - 0.5);
      const box = container.querySelector('#choices');
      box.innerHTML = choices.map((c, i) => `<button class="choice ${choices.length === 3 && i === 2 ? 'wide' : ''}" data-i="${i}">${esc(c.t)}</button>`).join('');
      const pen = container.querySelector('#pen');
      const bar = pen.querySelector('i');
      const t0 = performance.now();
      let answered = false;
      const tick = () => {
        if (!alive || answered) return;
        const p = Math.min(1, (performance.now() - t0) / THINK_MS);
        bar.style.transform = `scaleX(${1 - p})`;
        if (p > 0.6) pen.classList.add('urgent');
        if (p < 1) raf = requestAnimationFrame(tick);
        else answer(null, choices, THINK_MS);
      };
      raf = requestAnimationFrame(tick);
      box.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        answer(choices[+b.dataset.i], choices, performance.now() - t0, b);
      }));
      function answer(choice, all, ms, btn) {
        answered = true;
        cancelAnimationFrame(raf);
        const kind = choice ? choice.kind : (sc.timeout || 'minor');
        const why = choice ? choice.why : (sc.timeoutWhy || 'Du tøvede. Til prøven skal beslutningen komme i tide — tøven er også en fejl, fordi trafikken bag dig ikke ved, hvad du vil.');
        results.push({ id: sc.id, criterion: sc.criterion, kind, ms: Math.round(ms), chosen: choice?.t || 'Ingen beslutning', why, cue: sc.cue, correct: sc.choices.find(c => c.kind === 'correct')?.t });
        box.querySelectorAll('.choice').forEach((b, i) => {
          const k = all[i].kind;
          if (b === btn) b.classList.add(k === 'correct' ? 'correct' : 'wrong');
          else if (k === 'correct') b.classList.add('correct');
          else b.classList.add('dim');
          b.disabled = true;
        });
        const comment = kind === 'correct' ? say(sensor, 'good') : (kind === 'minor' || kind === 'error') ? say(sensor, 'minor') : say(sensor, 'serious');
        const verdict = kind === 'correct' ? 'Rigtigt' : LEVELS[kind];
        box.insertAdjacentHTML('afterend', `
          <div class="feedback ${kind === 'correct' ? 'ok' : 'bad'}">
            <div class="verdict">${verdict}${comment ? ` · ${esc(comment)}` : ''}</div>
            <p>${esc(why)}</p>
            <div class="rule">Bedømmes under: ${esc(CRITERIA[sc.criterion])}${sc.rule ? ` · ${esc(sc.rule)}` : ''}</div>
          </div>
          <div class="btnrow"><button class="btn full" id="go">${idx + 1 < scenarios.length ? 'Kør videre' : 'Hør dommen'}</button></div>`);
        if (comment) speak(comment);
        const goBtn = container.querySelector('#go');
        goBtn.addEventListener('click', () => { idx++; next(); });
        goBtn.focus({ preventScroll: true });
      }
    }
  }

  function finish() {
    const j = judge(results);
    const perCrit = {};
    for (const r of results) {
      const c = (perCrit[r.criterion] ||= { n: 0, ok: 0, minor: 0, error: 0, serious: 0, critical: 0 });
      c.n++; c[r.kind]++;
    }
    const avgMs = Math.round(results.filter(r => r.chosen !== 'Ingen beslutning').reduce((a, r) => a + r.ms, 0) / Math.max(1, results.filter(r => r.chosen !== 'Ingen beslutning').length));
    const result = { ...j, perCrit, results, avgMs };
    // gem pr. kriterium (så kørekortets stempler kan fyldes ud)
    for (const [crit, c] of Object.entries(perCrit)) {
      if (c.n >= 2) recordSkill(crit, Math.round(100 * (c.ok + 0.6 * c.minor + 0.3 * c.error) / c.n), { note: `${c.ok} af ${c.n} rigtige` });
    }
    if (onDone) return onDone(result);
    showVerdict(result);
  }

  function showVerdict(r) {
    const text = r.passed ? sensor.verdictPass : sensor.verdictFail;
    const bad = r.results.filter(x => x.kind !== 'correct');
    shell(`
      <div class="verdict-card">
        <div class="ink ${r.passed ? 'pass' : ''}">${r.passed ? 'BESTÅET' : 'IKKE BESTÅET'}</div>
        <div class="note">Sensorens skema</div>
        <div class="big ${r.passed ? 'pass' : 'fail'}">${r.score}</div>
        <table class="schema">
          <tr><th>Bedømmelsesområde</th><th>Fejl</th></tr>
          ${Object.entries(r.perCrit).map(([c, v]) => { const parts = []; if (v.critical) parts.push(`${v.critical} meget alvorlig`); if (v.serious) parts.push(`${v.serious} alvorlig`); if (v.error) parts.push(`${v.error} fejl`); if (v.minor) parts.push(`${v.minor} mindre`); return `<tr><td>${esc(CRITERIA[c])}</td><td class="mark ${v.critical || v.serious ? 'bad' : parts.length ? '' : 'ok'}">${parts.join(', ') || 'ingen'}</td></tr>`; }).join('')}
        </table>
        <p class="note" style="margin:10px 0 0">${r.reason ? esc(r.reason) + ' ' : ''}Gennemsnitlig betænkningstid ${(r.avgMs / 1000).toFixed(1).replace('.', ',')} s. Til den rigtige prøve er dommen et skøn ud fra de samme fire niveauer — her er den en fast regel.</p>
      </div>
      ${sensorLine(text)}
      ${bad.length ? `<h2 style="margin-top:18px">Replay</h2><ul class="replay-list">${bad.map(b => `<li><div class="q">${esc(b.cue)}</div><div class="you">Du: ${esc(b.chosen)} · ${esc(LEVELS[b.kind] || '')}</div><div class="why">${esc(b.why)}</div>${b.correct ? `<div class="why"><b>Det rigtige:</b> ${esc(b.correct)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="card" style="margin-top:14px">Ingen fejl. Kør den igen — en anden sensor, andre situationer.</p>'}
      <div class="btnrow"><button class="btn full" onclick="location.hash='${back}'">Færdig</button><button class="btn ghost full" id="again">Kør igen</button></div>`, 'Dom');
    speak(text);
    container.querySelector('#again').addEventListener('click', () => { idx = 0; results.length = 0; scenarios.splice(0, scenarios.length, ...pickScenarios(scenarios.length)); next(); });
  }

  if (intro) showIntro(); else next();
  return () => { alive = false; clearAll(); };
}

export function mount(container, params = {}) {
  const sensor = pickSensor(get().sensorId);
  const scenarios = pickScenarios(+params.n || 10, { criterion: params.k });
  return runDrive(container, { scenarios, sensor });
}
