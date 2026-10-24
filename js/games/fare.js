// Fareopfattelse: tryk i det øjeblik faren opstår. Point for at se den tidligt (5-4-3-2-1).
import { renderScene, laneX } from '../scene.js';
import { HAZARDS } from '../data/hazards.js';
import { topbar, esc } from '../ui.js';
import { recordSkill } from '../state.js';

const CLIPS_PER_RUN = 6;
const MAX_TAPS = 8; // flere tryk = mønster-tryk = 0 point for klippet

function lerp(a, b, t) { return a + (b - a) * t; }

// position for en aktør til tiden t
function actorAt(actor, t) {
  const ks = actor.keys;
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].t <= t) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
  const span = Math.max(1, b.t - a.t);
  const u = a === b ? 1 : Math.min(1, Math.max(0, (t - a.t) / span));
  const d = lerp(a.d, b.d, u);
  const xa = a.x != null ? a.x : laneX(a.lane || 'own', d);
  const xb = b.x != null ? b.x : laneX(b.lane || 'own', d);
  const x = lerp(xa, xb, u);
  const extra = {};
  for (const k of ks) if (k.t <= t) { if (k.swap) extra.type = k.swap; if (k.braking) extra.braking = true; if (k.blinker) extra.blinker = k.blinker; }
  return { ...(actor.props || {}), type: extra.type || actor.type, d, x, braking: extra.braking, blinker: extra.blinker };
}

export function scoreFor(clip, taps) {
  if (!clip.hazard) return { points: 0, max: 0, pattern: taps.length > MAX_TAPS, note: taps.length ? 'Du trykkede, men der var ingen fare.' : 'Rigtigt set: ingen fare.' };
  if (taps.length > MAX_TAPS) return { points: 0, max: 5, pattern: true, note: 'For mange tryk. Til den rigtige test giver mønster-tryk 0 point.' };
  // rytmiske tryk (meget ens mellemrum) tæller også som mønster
  if (taps.length >= 5) {
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    if (sd / mean < 0.15) return { points: 0, max: 5, pattern: true, note: 'Rytmiske tryk. Systemet kan se, at du ikke reagerer på noget.' };
  }
  const { start, end } = clip.hazard;
  const inWin = taps.filter(t => t >= start && t <= end);
  if (!inWin.length) return { points: 0, max: 5, pattern: false, note: taps.some(t => t > end) ? 'For sent — faren var allerede nået.' : 'Du så den ikke.' };
  const first = Math.min(...inWin);
  const seg = Math.floor((first - start) / ((end - start) / 5));
  const points = Math.max(1, 5 - seg);
  return { points, max: 5, pattern: false, note: points >= 4 ? 'Tidligt set.' : points === 3 ? 'Set, men du kunne have set den før.' : 'Sent — du reagerede, da faren var tæt på.', first };
}

export function mount(container) {
  let alive = true, raf = null, timer = null;
  let clips = [], idx = 0, total = 0, max = 0;
  const log = [];

  function intro() {
    container.innerHTML = `<section class="screen">${topbar('Fareopfattelse')}
      <h1>Tryk, når faren opstår</h1>
      <p>En fare er noget, der kan tvinge dig til at bremse eller dreje. Du får flest point for at trykke, når den <i>begynder</i> at udvikle sig — ikke når den er foran kølerhjelmen.</p>
      <div class="card"><p>${CLIPS_PER_RUN} korte klip på 7–8 sekunder. Ét tryk er nok. Trykker du hele tiden eller i rytme, får klippet 0 point — sådan er det også i den britiske hazard perception-test, som systemet er bygget efter.</p><p class="note">Nogle klip har ingen fare.</p></div>
      <div class="btnrow"><button class="btn full" id="start">Start</button></div></section>`;
    container.querySelector('#start').addEventListener('click', () => { clips = [...HAZARDS].sort(() => Math.random() - 0.5).slice(0, CLIPS_PER_RUN); idx = 0; total = 0; max = 0; log.length = 0; play(); });
  }

  function play() {
    if (!alive) return;
    if (idx >= clips.length) return done();
    const clip = clips[idx];
    const taps = [];
    container.innerHTML = `<section class="screen">${topbar('Fareopfattelse', { step: `${idx + 1} af ${clips.length}` })}
      <div class="hazard-stage" id="stage" role="button" aria-label="Tryk når du ser en fare"><div class="tapflash" id="flash"></div></div>
      <div class="pen" id="pen"><i></i></div>
      <p class="note" style="margin-top:8px">${esc(clip.title)} · tryk på billedet</p>
    </section>`;
    const stage = container.querySelector('#stage');
    const flash = container.querySelector('#flash');
    const bar = container.querySelector('#pen i');
    const t0 = performance.now();
    let last = -100;
    stage.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const t = performance.now() - t0;
      taps.push(t);
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      if (navigator.vibrate) navigator.vibrate(15);
    });
    const frame = () => {
      if (!alive) return;
      const t = performance.now() - t0;
      if (t - last > 45) {
        last = t;
        const objects = clip.actors.map(a => actorAt(a, t));
        const scene = { ...clip.scene, objects, blinker: undefined };
        const svg = renderScene(scene);
        const old = stage.querySelector('svg');
        if (old) old.outerHTML = svg; else stage.insertAdjacentHTML('afterbegin', svg);
        bar.style.transform = `scaleX(${1 - Math.min(1, t / clip.dur)})`;
      }
      if (t < clip.dur) raf = requestAnimationFrame(frame); else review(clip, taps);
    };
    raf = requestAnimationFrame(frame);
  }

  function review(clip, taps) {
    const s = scoreFor(clip, taps);
    total += s.points; max += s.max;
    log.push({ clip, s, taps: taps.length });
    // frys billedet ved farens start
    const tf = clip.hazard ? clip.hazard.start + 200 : clip.dur - 1;
    const objects = clip.actors.map(a => actorAt(a, tf));
    container.innerHTML = `<section class="screen">${topbar('Fareopfattelse', { step: `${idx + 1} af ${clips.length}` })}
      <div class="hazard-stage">${renderScene({ ...clip.scene, objects })}</div>
      ${clip.hazard ? `<div class="score-scale" aria-label="${s.points} af 5 point">${[5, 4, 3, 2, 1].map(p => `<span class="${p <= s.points ? 'lit' : ''}"></span>`).join('')}</div>` : ''}
      <div class="feedback ${s.points >= 3 || (!clip.hazard && !taps.length) ? 'ok' : 'bad'}">
        <div class="verdict">${clip.hazard ? `${s.points} af 5 point` : 'Ingen fare'} · ${esc(s.note)}</div>
        <p>${esc(clip.explain)}</p>
        <div class="rule">Billedet viser øjeblikket, hvor faren begyndte. ${taps.length} tryk${s.first != null ? `, første rigtige efter ${((s.first - clip.hazard.start) / 1000).toFixed(1).replace('.', ',')} s` : ''}.</div>
      </div>
      <div class="btnrow"><button class="btn full" id="go">${idx + 1 < clips.length ? 'Næste klip' : 'Se resultat'}</button></div>
    </section>`;
    container.querySelector('#go').addEventListener('click', () => { idx++; play(); });
  }

  function done() {
    const score = max ? Math.round(100 * total / max) : 100;
    recordSkill('fare', score, { note: `${total} af ${max} point` });
    container.innerHTML = `<section class="screen">${topbar('Fareopfattelse', { step: 'Resultat' })}
      <div class="verdict-card"><div class="note">Fareopfattelse</div><div class="big ${score >= 80 ? 'pass' : 'fail'}">${score}</div>
      <p>${total} af ${max} point. ${score >= 80 ? 'Du ser farerne, mens de udvikler sig. Det er det, der giver dig tid i bilen.' : 'Du ser farerne, men sent. Kig længere frem — på fortovet, i sidevejene, på bremselygterne to biler fremme.'}</p></div>
      <ul class="replay-list" style="margin-top:14px">${log.map(l => `<li><div class="q">${esc(l.clip.title)}</div><div class="${l.s.points >= 3 ? 'why' : 'you'}">${l.clip.hazard ? `${l.s.points} af 5` : (l.taps ? 'Trykkede uden fare' : 'Rigtigt: ingen fare')} · ${esc(l.s.note)}</div></li>`).join('')}</ul>
      <div class="btnrow"><button class="btn full" onclick="location.hash='#/traen'">Færdig</button><button class="btn ghost full" id="again">Igen</button></div></section>`;
    container.querySelector('#again').addEventListener('click', intro);
  }

  intro();
  return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); };
}
