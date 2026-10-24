// Skiltet på dagen: ét spørgsmål om dagen. Samme skilt for alle den dag.
import { renderScene } from '../scene.js';
import { topbar, esc } from '../ui.js';
import { get, save } from '../state.js';

const SIGNS = [
  { sign: 'vigepligt', q: 'Hvad betyder dette skilt?', a: 'Ubetinget vigepligt: du skal holde tilbage for al trafik på den krydsende vej', wrong: ['Højrevigepligt gælder i krydset', 'Du har forkørselsret, men skal sænke farten'], why: 'Trekanten med spidsen nedad er ubetinget vigepligt. Du behøver ikke standse, hvis der er frit — men du skal kunne.' },
  { sign: 'stop', q: 'Hvad kræver dette skilt?', a: 'Fuldt stop ved stoplinjen, også når der er frit', wrong: ['Stop kun hvis der kommer nogen', 'Sæt farten ned til gangfart'], why: 'Et rullende stop bedømmes som manglende overholdelse af vigepligt.' },
  { sign: 'byzone', q: 'Hvilken hastighed gælder efter dette skilt, når intet andet er skiltet?', a: '50 km/t', wrong: ['40 km/t', '60 km/t'], why: 'Byzoneskiltet betyder tættere bebygget område og dermed 50 km/t, medmindre andet er skiltet.' },
  { sign: 'byzoneSlut', q: 'Hvad gælder efter dette skilt på en almindelig vej?', a: 'Op til 80 km/t, hvis forholdene tillader det', wrong: ['Op til 90 km/t', 'Stadig 50 km/t til næste skilt'], why: 'Uden for byzone er den generelle grænse 80 km/t for personbiler på almindelig vej.' },
  { sign: 'hovedvej', q: 'Hvad betyder det gule og hvide skilt?', a: 'Du kører på en hovedvej og har forkørselsret i krydsene', wrong: ['Vigepligt forude', 'Parkering forbudt'], why: 'Hovedvej: trafik fra sidevejene har vigepligt. Men du skal stadig orientere dig — forkørselsret er ikke en garanti.' },
  { sign: 'rundkoersel', q: 'Hvem har vigepligt ved dette skilt?', a: 'Du, over for trafik der allerede kører i rundkørslen', wrong: ['Trafikken i rundkørslen, over for dig', 'Ingen — først til mølle'], why: 'Ved indkørsel i rundkørsel har du ubetinget vigepligt. Cyklister på cykelsti rundt om rundkørslen har forkørselsret, når du kører ud.' },
  { sign: 'fodgaenger', q: 'Hvad skal du gøre ved dette skilt, hvis en fodgænger står ved kanten?', a: 'Holde tilbage — også for fodgængere, der er på vej ud i feltet', wrong: ['Køre igennem, hvis fodgængeren ikke er trådt ud', 'Dytte for at advare'], why: 'Vigepligten ved fodgængerfelt gælder dem i feltet og dem, der tydeligt er på vej ud i det.' },
  { sign: 'skole', q: 'Hvad fortæller dette skilt dig?', a: 'Børn på eller ved vejen — sæt farten ned og vær klar til at bremse', wrong: ['Legeområde: gangfart er påbudt', 'Skolepatrulje har trafikregulering'], why: 'Advarselstavle for børn. Ingen fast hastighed, men "efter forholdene" betyder her markant ned i fart.' },
  { sign: 'cykelsti', q: 'Hvad betyder det blå skilt med cyklen?', a: 'Cykelsti — cyklister skal køre her, og du skal holde tilbage for dem ved højresving', wrong: ['Cykler forbudt', 'Anbefalet rute for cykler, de må også køre på vejen'], why: 'Påbudstavle. Cykelstiens trafik har forkørselsret, når du krydser den for at svinge.' },
  { sign: 'busstop', q: 'Hvad gælder ved en bus, der blinker ud fra dette stoppested i byen?', a: 'Du skal give bussen mulighed for at køre ud', wrong: ['Bussen skal vente på dig', 'Det er frivilligt'], why: 'I tættere bebygget område skal du holde tilbage for busser, der kører ud fra stoppested.' },
  { sign: 'speed30', q: 'Hvad er grænsen efter dette skilt?', a: '30 km/t til næste ophævelse eller nyt skilt', wrong: ['30 km/t kun i 100 meter', '30 km/t anbefalet, 50 tilladt'], why: 'Hastighedsbegrænsning gælder, indtil den ophæves eller erstattes. Ikke en anbefaling.' },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const todayIndex = () => { const d = new Date(); return (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % SIGNS.length; };
export const doneToday = () => get().skiltDone === todayKey();

export function mount(container) {
  const s = SIGNS[todayIndex()];
  const opts = [s.a, ...s.wrong].sort(() => Math.random() - 0.5);
  container.innerHTML = `<section class="screen">${topbar('Skiltet på dagen', { back: '#/' })}
    <div class="scene">${renderScene({ env: 'by', speed: 40, limit: 50, objects: [{ type: 'sign', sign: s.sign, x: 300, d: 0.12 }] })}</div>
    <div class="sensor-line" style="margin-top:14px"><div class="avatar" style="background:#1D3A9E">?</div><div class="bubble"><div class="who">Dagens spørgsmål</div><div class="say">${esc(s.q)}</div></div></div>
    <div class="choices" id="c">${opts.map((o, i) => `<button class="choice wide" data-i="${i}">${esc(o)}</button>`).join('')}</div>
  </section>`;
  container.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
    const ok = opts[+b.dataset.i] === s.a;
    container.querySelectorAll('.choice').forEach((x, i) => { x.disabled = true; if (opts[i] === s.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); else x.classList.add('dim'); });
    save({ skiltDone: todayKey() });
    container.querySelector('#c').insertAdjacentHTML('afterend', `<div class="feedback ${ok ? 'ok' : 'bad'}"><div class="verdict">${ok ? 'Rigtigt' : 'Forkert'}</div><p>${esc(s.why)}</p></div><div class="btnrow"><button class="btn full" onclick="location.hash='#/'">Færdig</button></div>`);
  }));
}
