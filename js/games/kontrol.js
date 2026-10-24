// Kontrolspørgsmål: kort med spørgsmål, krav og "sådan viser du det". Du bedømmer selv, om du kunne.
import { KONTROL, SECTIONS, BY_SECTION } from '../data/kontrol.js';
import { topbar, esc } from '../ui.js';
import { get, save, recordSkill } from '../state.js';
import { speak } from '../voice.js';

const PER_RUN = 8;

// De spørgsmål, du har haft sværest ved, kommer oftest. Nye kommer før kendte.
function pickCards(n) {
  const seen = get().kontrolSeen;
  const weight = k => { const s = seen[k.id]; if (!s) return 3; return 1 + 2 * (s.miss / Math.max(1, s.hit + s.miss)); };
  const pool = KONTROL.map(k => ({ k, w: weight(k) * (0.5 + Math.random()) })).sort((a, b) => b.w - a.w);
  // højst to fra samme afsnit
  const out = [], count = {};
  for (const { k } of pool) { if ((count[k.section] || 0) >= 2) continue; out.push(k); count[k.section] = (count[k.section] || 0) + 1; if (out.length >= n) break; }
  return out;
}

export function mount(container, params = {}) {
  let alive = true;

  function menu() {
    const seen = get().kontrolSeen;
    const known = KONTROL.filter(k => seen[k.id] && seen[k.id].hit > seen[k.id].miss).length;
    container.innerHTML = `<section class="screen">${topbar('Kontrolspørgsmål')}
      <h1>Kontrolprøven</h1>
      <p>Til prøven trækkes ét opgavekort med tre kontrolnumre fra tre forskellige afsnit, og spejlene kontrolleres altid. Du skal <i>vise</i> det på bilen, uden værktøj, ikke bare sige det.</p>
      <div class="card"><div class="kv"><span>Du kan</span><b>${known} af ${KONTROL.length}</b></div></div>
      <div class="btnrow"><button class="btn full" id="run">Træk ${PER_RUN} kort</button></div>
      <div class="section"><h2>Alle afsnit</h2><ul class="menu">
        ${Object.entries(SECTIONS).map(([id, name]) => `<li><button data-s="${id}"><span class="t">${esc(name)}</span><span class="d">${BY_SECTION[id].length} kontrolnumre</span><span class="meta weak">${BY_SECTION[id].filter(k => seen[k.id] && seen[k.id].hit > seen[k.id].miss).length}/${BY_SECTION[id].length}</span></button></li>`).join('')}
      </ul></div></section>`;
    container.querySelector('#run').addEventListener('click', () => run(pickCards(PER_RUN)));
    container.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => run([...BY_SECTION[b.dataset.s]], { browse: true })));
  }

  function run(cards, { browse = false } = {}) {
    let i = 0, hit = 0;
    const show = () => {
      if (!alive) return;
      if (i >= cards.length) return done(cards.length, hit, browse);
      const c = cards[i];
      container.innerHTML = `<section class="screen">${topbar('Kontrolspørgsmål', { step: `${i + 1} af ${cards.length}` })}
        <div class="flash">
          <div class="topic">${esc(SECTIONS[c.section])}</div>
          <div class="q">${esc(c.q)}</div>
          <div class="a" id="a" hidden>
            <p><b>Kravet:</b> ${esc(c.a)}</p>
            <p class="how"><b>Sådan viser du det:</b> ${esc(c.how)}</p>
          </div>
          <div class="btnrow" id="reveal"><button class="btn full" id="show">Vis svar</button></div>
          <div class="btnrow" id="rate" hidden><button class="btn ghost full" id="miss">Kunne jeg ikke</button><button class="btn full" id="hit">Kunne jeg</button></div>
        </div>
        <p class="note" style="margin-top:10px">Sig svaret højt, før du vender kortet. Det er sådan, du finder ud af, om du kan det.</p>
      </section>`;
      speak(c.q);
      container.querySelector('#show').addEventListener('click', () => {
        container.querySelector('#a').hidden = false;
        container.querySelector('#reveal').hidden = true;
        container.querySelector('#rate').hidden = false;
      });
      const mark = ok => {
        save(s => { const e = s.kontrolSeen[c.id] || { hit: 0, miss: 0 }; return { ...s, kontrolSeen: { ...s.kontrolSeen, [c.id]: { hit: e.hit + (ok ? 1 : 0), miss: e.miss + (ok ? 0 : 1) } } }; });
        if (ok) hit++;
        i++; show();
      };
      container.querySelector('#hit').addEventListener('click', () => mark(true));
      container.querySelector('#miss').addEventListener('click', () => mark(false));
    };
    show();
  }

  function done(n, hit, browse) {
    const score = Math.round(100 * hit / n);
    if (!browse) recordSkill('kontrol', score, { note: `${hit} af ${n} kontrolnumre` });
    container.innerHTML = `<section class="screen">${topbar('Kontrolspørgsmål', { step: 'Resultat' })}
      <div class="verdict-card"><div class="note">${browse ? 'Afsnit gennemgået' : 'Kontrolprøve'}</div><div class="big ${score >= 80 ? 'pass' : 'fail'}">${score}</div>
      <p>${hit} af ${n}. ${score === 100 ? 'Alle kunne du. Næste skridt: find dem på en rigtig bil.' : 'De kort, du ikke kunne, kommer igen næste gang, oftere end de andre.'}</p></div>
      <div class="btnrow"><button class="btn full" id="menu">Tilbage</button><button class="btn ghost full" onclick="location.hash='#/spil/biltjek'">Find dem på bilen</button></div></section>`;
    container.querySelector('#menu').addEventListener('click', menu);
  }

  if (params.card) run(JSON.parse(params.card)); else menu();
  return () => { alive = false; };
}
