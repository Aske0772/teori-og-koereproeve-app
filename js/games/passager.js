// Passagertilstand: sid ved siden af én, der kører, og tæl de ting, du lægger mærke til.
// Spillet gemmer kun tællingen for turen — og kun på telefonen.
import { topbar, esc } from '../ui.js';

const ITEMS = [
  { id: 'spejl-foer-brems', t: 'Kiggede i bakspejlet, før der blev bremset', k: 'orientering' },
  { id: 'skulderblik', t: 'Skulderblik før svingning eller vognbaneskift', k: 'orientering' },
  { id: 'blink-tidligt', t: 'Blinkede i god tid, før manøvren', k: 'tegngivning' },
  { id: 'blink-ud-rundk', t: 'Blinkede ud af rundkørslen', k: 'tegngivning' },
  { id: 'placering-venstre', t: 'Lagde sig ind mod midten før venstresving', k: 'placering' },
  { id: 'hastighed-skilt', t: 'Havde farten nede ved skiltet — ikke efter', k: 'hastighed' },
  { id: 'afstand', t: 'Holdt mindst 2 sekunders afstand til bilen foran', k: 'hastighed' },
  { id: 'cyklist-hoejre', t: 'Holdt tilbage for cyklister ved højresving', k: 'vigepligt' },
  { id: 'fodgaenger', t: 'Standsede for fodgængere ved feltet', k: 'vigepligt' },
  { id: 'stop-helt', t: 'Standsede helt ved stopskilt', k: 'vigepligt' },
  { id: 'gult', t: 'Standsede for gult, når det kunne nås', k: 'hastighed' },
  { id: 'telefon', t: 'Rørte ikke telefonen under kørsel', k: 'orientering' },
];

export function mount(container) {
  const counts = {};
  const render = () => {
    container.innerHTML = `<section class="screen">${topbar('Passagertilstand')}
      <h1>Find fejlene i den andens kørsel</h1>
      <p>Kør med en forælder, en ven eller i bussen. Hver gang du ser en af disse ting <i>mangle</i>, trykker du. Det træner det samme blik, sensoren bruger på dig.</p>
      <p class="note">Sig det ikke højt til chaufføren, mens der køres. Snak om det bagefter.</p>
      <div class="card"><ul class="check-list" style="margin:0">
        ${ITEMS.map(i => `<li style="align-items:center"><button class="btn ghost" data-id="${i.id}" style="padding:10px 14px;min-width:64px;font-size:22px">${counts[i.id] || 0}</button><div><div class="lbl">${esc(i.t)}</div><div class="sub">Manglede · ${esc(i.k)}</div></div></li>`).join('')}
      </ul></div>
      <div class="btnrow"><button class="btn full" id="sum">Turen er slut</button></div>
    </section>`;
    container.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => { counts[b.dataset.id] = (counts[b.dataset.id] || 0) + 1; b.textContent = counts[b.dataset.id]; if (navigator.vibrate) navigator.vibrate(10); }));
    container.querySelector('#sum').addEventListener('click', summary);
  };
  const summary = () => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const top = ITEMS.map(i => ({ ...i, n: counts[i.id] || 0 })).filter(i => i.n).sort((a, b) => b.n - a.n);
    container.innerHTML = `<section class="screen">${topbar('Passagertilstand', { step: 'Turen' })}
      <div class="verdict-card"><div class="note">Du så</div><div class="big">${total}</div><p>${total === 0 ? 'Ingen mangler — enten kører chaufføren som til en køreprøve, eller du kiggede ikke efter.' : 'ting, sensoren ville have noteret. Rutinerede bilister glemmer dem, fordi ingen bedømmer dem længere. Det gør sensoren med dig.'}</p>
      ${top.length ? `<table class="schema">${top.map(i => `<tr><td>${esc(i.t)}</td><td class="mark">${i.n}</td></tr>`).join('')}</table>` : ''}</div>
      <div class="btnrow"><button class="btn full" onclick="location.hash='#/traen'">Færdig</button></div></section>`;
  };
  render();
}
