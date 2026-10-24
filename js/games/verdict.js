// Bedømmelsesskemaet efter en kørsel.
import { LEVELS, CRITERIA } from '../sim/rules.js';
import { esc } from '../ui.js';

export function verdictHTML(r, sensor, text, { back = '#/', again = false, extraRows = '' } = {}) {
  const mins = Math.floor(r.stats.time / 60), secs = Math.round(r.stats.time % 60);
  const rows = Object.entries(r.perCrit).filter(([c]) => CRITERIA[c]).map(([c, v]) => {
    const parts = [];
    if (v.critical) parts.push(`${v.critical} meget alvorlig`);
    if (v.serious) parts.push(`${v.serious} alvorlig`);
    if (v.error) parts.push(`${v.error} fejl`);
    if (v.minor) parts.push(`${v.minor} mindre`);
    return `<div class="row ${v.critical || v.serious ? 'bad' : parts.length ? 'mid' : 'ok'}"><span>${esc(CRITERIA[c])}</span><b>${parts.join(', ') || 'opfyldt'}</b></div>`;
  }).join('');
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  return `
  <section class="verdict ${r.passed ? 'pass' : 'fail'}">
    <div class="verdict-head">
      <div class="stamp-big">${r.passed ? 'Bestået' : 'Ikke bestået'}</div>
      <div class="score"><b>${r.score}</b><span>point</span></div>
    </div>
    <p class="verdict-say"><span class="dot" style="background:${sensor.color}"></span>${esc(text)}</p>
    ${r.reason ? `<p class="verdict-reason">${esc(r.reason)}</p>` : ''}
    <div class="schema2">${extraRows}${rows}</div>
    <p class="muted">${mins} min ${secs} s, ${(r.stats.distance / 1000).toFixed(1).replace('.', ',')} km, højeste fart ${Math.round(r.stats.maxSpeed)} km/t. Til den rigtige prøve er dommen et skøn ud fra de samme fire fejlniveauer; her er den en fast regel.</p>
    ${r.notes.length ? `<h2>Gennemgang i bilen</h2><ol class="notes">${r.notes.map(n => `<li data-level="${n.level}"><b>${esc(LEVELS[n.level])}</b><span>${esc(n.text)}</span><small>${esc(CRITERIA[n.criterion])}, efter ${fmt(n.t)}</small></li>`).join('')}</ol>` : '<p class="clean">Ingen notater. Det sker sjældent.</p>'}
    <div class="btnrow">${again ? '<button class="cta" id="again">Kør igen</button>' : ''}<button class="cta ghost" onclick="location.hash='${back}'">Færdig</button></div>
  </section>`;
}
