// Skattejagt på en rigtig bil: find tingene fra kontrolprøven og kryds af.
import { KONTROL, SECTIONS } from '../data/kontrol.js';
import { topbar, esc } from '../ui.js';
import { get, save } from '../state.js';

const HUNT = [
  { id: 'twi', s: 'baerende', t: 'TWI-mærket på et dæk og slidindikatoren inde i rillen', sub: 'Lille trekant eller "TWI" på dæksiden. Følg den ind.' },
  { id: 'daektryk', s: 'baerende', t: 'Mærkaten med dæktryk', sub: 'Dørstolpen i førersiden eller indersiden af tankklappen.' },
  { id: 'dimension', s: 'baerende', t: 'Dækdimensionen, fx 205/55 R16', sub: 'Står på dæksiden. Er den ens på begge forhjul?' },
  { id: 'bremsevaeske', s: 'bremser', t: 'Beholderen med bremsevæske', sub: 'Lille beholder med gult låg, ofte bag motoren i førersiden. Peg på min/max.' },
  { id: 'olie', s: 'motor', t: 'Oliepinden (eller oliemenuen på skærmen)', sub: 'Typisk gult eller orange håndtag.' },
  { id: 'koeler', s: 'motor', t: 'Ekspansionsbeholderen til kølervæske', sub: 'Gennemsigtig beholder med min/max, rør ikke dækslet, hvis motoren er varm.' },
  { id: 'sprinkler', s: 'motor', t: 'Påfyldning til sprinklervæske', sub: 'Låg med symbol af en forrude.' },
  { id: 'servo', s: 'styr', t: 'Servovæske, eller konstatér, at bilen har elektrisk servo', sub: 'Mange biler efter ca. 2010 har ingen beholder. Det er også et svar.' },
  { id: 'reflekser', s: 'lys', t: 'De to røde reflekser bagpå', sub: 'I baglygterne eller kofangeren. Ikke trekantede.' },
  { id: 'nummerpladelys', s: 'lys', t: 'Nummerpladelyset', sub: 'Over eller ved siden af den bageste nummerplade.' },
  { id: 'tredje-stoplygte', s: 'lys', t: 'Den tredje stoplygte', sub: 'Øverst i bagruden eller på bagklappen.' },
  { id: 'taagebag', s: 'lys', t: 'Kontakten og kontrollampen til tågebaglygten', sub: 'Lysknappen; lampen er gul/orange med bølgelinje.' },
  { id: 'havari', s: 'lys', t: 'Havariblinket', sub: 'Den røde trekant i midten af instrumentbrættet.' },
  { id: 'abs-lampe', s: 'bremser', t: 'ABS-lampen tænde og slukke', sub: 'Slå tændingen til uden at starte.' },
  { id: 'airbag-kontakt', s: 'udstyr', t: 'Kontakten til passagerairbag', sub: 'Handskerummet eller dørstolpen i passagersiden.' },
  { id: 'trekant', s: 'udstyr', t: 'Advarselstrekanten', sub: 'Bagagerummet, under gulvet eller i bagklappen.' },
  { id: 'nakke', s: 'udstyr', t: 'Nakkestøttens indstilling, overkant ved toppen af hovedet', sub: 'Indstil din egen.' },
  { id: 'sele-ryk', s: 'udstyr', t: 'At selen låser, når du rykker', sub: 'Træk hurtigt, den skal stoppe.' },
  { id: 'spejl-side', s: 'spejle', t: 'Indstil sidespejlet så du lige netop ser bilens side', sub: 'Horisonten midt i spejlet.' },
  { id: 'stoeddaemper', s: 'baerende', t: 'Tryk et hjørne ned og se, om bilen gynger', sub: 'Den skal rette sig op med det samme.' },
];

export function mount(container) {
  const render = () => {
    const done = get().bilTjek;
    const n = HUNT.filter(h => done[h.id]).length;
    container.innerHTML = `<section class="screen">${topbar('Find det på bilen')}
      <h1>Skattejagt på en rigtig bil</h1>
      <p>Tag telefonen med ud til familiens bil, en vens bil eller køreskolebilen. Kontrolprøven handler om at <i>vise</i> det, så find hver ting med dine egne hænder.</p>
      <div class="card"><div class="kv"><span>Fundet</span><b>${n} af ${HUNT.length}</b></div></div>
      <div class="section"><div class="card"><ul class="check-list">
        ${HUNT.map(h => `<li><input type="checkbox" id="h-${h.id}" data-id="${h.id}" ${done[h.id] ? 'checked' : ''}><label for="h-${h.id}"><div class="lbl">${esc(h.t)}</div><div class="sub">${esc(SECTIONS[h.s])} · ${esc(h.sub)}</div></label></li>`).join('')}
      </ul></div></div>
      <p class="note" style="margin-top:12px">Du behøver ikke fotografere noget. Spillet gemmer kun krydsene, og kun på denne telefon.</p>
    </section>`;
    container.querySelectorAll('input[data-id]').forEach(i => i.addEventListener('change', e => {
      save(s => ({ ...s, bilTjek: { ...s.bilTjek, [e.target.dataset.id]: e.target.checked } }));
      const k = HUNT.filter(h => get().bilTjek[h.id]).length;
      container.querySelector('.kv b').textContent = `${k} af ${HUNT.length}`;
    }));
  };
  render();
}
