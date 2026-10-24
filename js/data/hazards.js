// Fareopfattelse: korte "klip" på 7–9 sekunder, tegnet i samme forrude-stil.
// Hver aktør har nøglepunkter (t i ms). Mellem punkterne interpoleres dybde og position.
// hazard.start = det øjeblik faren begynder at udvikle sig; hazard.end = når bilen når den.
// Point gives som til den britiske hazard perception-test: vinduet deles i 5 lige dele, 5-4-3-2-1 point.

export const HAZARDS = [
  {
    id: 'barn-bag-parkeret-bil',
    title: 'Villavej med parkerede biler',
    dur: 8000,
    scene: { env: 'by', speed: 38, limit: 50 },
    actors: [
      { type: 'car', props: { color: '#D9D5CC' }, keys: [{ t: 0, d: 0.75, lane: 'edgeR' }, { t: 8000, d: 0.0, lane: 'edgeR' }] },
      { type: 'car', props: { color: '#9AA3AB' }, keys: [{ t: 0, d: 0.85, lane: 'edgeR' }, { t: 8000, d: 0.1, lane: 'edgeR' }] },
      { type: 'ball', keys: [{ t: 0, d: 0.84, lane: 'sidewalkR' }, { t: 2600, d: 0.84, lane: 'sidewalkR' }, { t: 3600, d: 0.62, lane: 'own' }, { t: 8000, d: 0.0, lane: 'own' }] },
      { type: 'person', props: { child: true }, keys: [{ t: 0, d: 0.9, lane: 'sidewalkR' }, { t: 3200, d: 0.9, lane: 'sidewalkR' }, { t: 4600, d: 0.6, lane: 'edgeR' }, { t: 8000, d: 0.05, lane: 'own' }] },
    ],
    hazard: { start: 2700, end: 6200 },
    explain: 'Bolden er faren — ikke barnet. En bold på vejen betyder, at et barn følger efter. Den, der ser bolden, har to sekunder mere.',
  },
  {
    id: 'bil-fra-sidevej',
    title: 'Kryds med sidevej fra højre',
    dur: 8000,
    scene: { env: 'by', speed: 45, limit: 50, junction: { d: 0.55, side: 'right' } },
    actors: [
      { type: 'car', props: { color: '#B33B3B', scale: 0.9 }, keys: [{ t: 0, x: 395, d: 0.6 }, { t: 2500, x: 395, d: 0.6 }, { t: 2600, x: 360, d: 0.58 }, { t: 4800, x: 250, d: 0.5 }, { t: 8000, x: 250, d: 0.12 }] },
    ],
    hazard: { start: 2500, end: 5600 },
    explain: 'Bilen fra sidevejen begynder at trille frem uden at se dig. Den udvikler sig til en fare, så snart den ruller — ikke først når den er ude.',
  },
  {
    id: 'bildoer-aabner',
    title: 'Parkerede biler i din side',
    dur: 8000,
    scene: { env: 'by', speed: 35, limit: 50 },
    actors: [
      { type: 'car', props: { color: '#C9C3B9' }, keys: [{ t: 0, d: 0.9, lane: 'edgeR' }, { t: 8000, d: 0.3, lane: 'edgeR' }] },
      { type: 'car', props: { color: '#7A8891' }, keys: [{ t: 0, d: 0.7, lane: 'edgeR' }, { t: 3000, d: 0.5, lane: 'edgeR' }, { t: 3001, d: 0.5, lane: 'edgeR', swap: 'parkedDoor' }, { t: 8000, d: 0.0, lane: 'edgeR' }] },
      { type: 'person', keys: [{ t: 0, d: 0.3, lane: 'sidewalkL' }, { t: 8000, d: 0.9, lane: 'sidewalkL' }] },
    ],
    hazard: { start: 3000, end: 6400 },
    explain: 'Døren åbnes. Fodgængeren i venstre side er en distraktion — hun går væk fra vejen og er ingen fare.',
  },
  {
    id: 'modkoerende-overhaler',
    title: 'Landevej, modkørende i kolonne',
    dur: 8000,
    scene: { env: 'land', speed: 78, limit: 80 },
    actors: [
      { type: 'bus', keys: [{ t: 0, d: 0.9, lane: 'oncoming' }, { t: 8000, d: 0.0, lane: 'oncoming' }] },
      { type: 'car', props: { color: '#2F7D9A', oncoming: true }, keys: [{ t: 0, d: 0.95, lane: 'oncoming' }, { t: 2200, d: 0.75, lane: 'oncoming' }, { t: 3200, d: 0.68, lane: 'center' }, { t: 4600, d: 0.5, lane: 'own' }, { t: 6000, d: 0.3, lane: 'center' }, { t: 8000, d: 0.0, lane: 'oncoming' }] },
    ],
    hazard: { start: 2200, end: 5200 },
    explain: 'Bilen bag bussen trækker ud for at overhale — mod dig. Du skal se den, når den begynder at rykke mod midten, og have foden klar på bremsen.',
  },
  {
    id: 'fodgaenger-ved-felt',
    title: 'Fodgængerfelt i byen',
    dur: 8000,
    scene: { env: 'by', speed: 40, limit: 50, zebra: 0.6 },
    actors: [
      { type: 'sign', props: { sign: 'fodgaenger' }, keys: [{ t: 0, d: 0.66, lane: 'sidewalkR' }, { t: 8000, d: 0.66, lane: 'sidewalkR' }] },
      { type: 'person', props: { color: '#7A4F9E' }, keys: [{ t: 0, d: 0.62, lane: 'sidewalkL' }, { t: 2800, d: 0.62, lane: 'sidewalkL' }, { t: 5500, d: 0.62, lane: 'oncoming' }, { t: 8000, d: 0.62, lane: 'center' }] },
    ],
    hazard: { start: 2800, end: 5800 },
    explain: 'Fodgængeren vender sig mod feltet og træder ud. Den tidlige fare er bevægelsen mod kanten — ikke det første skridt ud på vejen.',
  },
  {
    id: 'bus-ud-fra-stoppested',
    title: 'Busstoppested',
    dur: 8000,
    scene: { env: 'by', speed: 42, limit: 50 },
    actors: [
      { type: 'sign', props: { sign: 'busstop' }, keys: [{ t: 0, d: 0.7, lane: 'sidewalkR' }, { t: 8000, d: 0.7, lane: 'sidewalkR' }] },
      { type: 'bus', keys: [{ t: 0, d: 0.68, lane: 'edgeR' }, { t: 2400, d: 0.68, lane: 'edgeR' }, { t: 2401, d: 0.68, lane: 'edgeR', blinker: 'left' }, { t: 5000, d: 0.6, lane: 'own' }, { t: 8000, d: 0.5, lane: 'own' }] },
    ],
    hazard: { start: 2400, end: 5400 },
    explain: 'Blinklyset på bussen er signalet. I byzone skal du lade den køre ud — og den gør det, uanset om du har set den.',
  },
  {
    id: 'bil-foran-bremser',
    title: 'Regnvejr, kø foran',
    dur: 8000,
    scene: { env: 'land', rain: true, speed: 70, limit: 80 },
    actors: [
      { type: 'car', props: { color: '#9AA3AB' }, keys: [{ t: 0, d: 0.55, lane: 'own' }, { t: 3000, d: 0.55, lane: 'own' }, { t: 3001, d: 0.55, lane: 'own', braking: true }, { t: 5500, d: 0.3, lane: 'own', braking: true }, { t: 8000, d: 0.1, lane: 'own', braking: true }] },
      { type: 'car', props: { color: '#D9D5CC', oncoming: true }, keys: [{ t: 0, d: 0.9, lane: 'oncoming' }, { t: 8000, d: 0.0, lane: 'oncoming' }] },
    ],
    hazard: { start: 3000, end: 5800 },
    explain: 'Bremselygterne tændes. På våd vej er din bremselængde længere, så afstanden skal være større end du tror.',
  },
  {
    id: 'cyklist-svinger-ud',
    title: 'Cykelsti langs vejen',
    dur: 8000,
    scene: { env: 'by', speed: 44, limit: 50, cyclePath: true },
    actors: [
      { type: 'cyclist', props: { color: '#2F7D9A' }, keys: [{ t: 0, d: 0.5, lane: 'cycleR' }, { t: 2600, d: 0.42, lane: 'cycleR' }, { t: 4200, d: 0.36, lane: 'edgeR' }, { t: 6000, d: 0.28, lane: 'own' }, { t: 8000, d: 0.2, lane: 'own' }] },
      { type: 'car', props: { color: '#C9C3B9' }, keys: [{ t: 0, d: 0.46, lane: 'cycleR' }, { t: 8000, d: 0.46, lane: 'cycleR' }] },
    ],
    hazard: { start: 2600, end: 5600 },
    explain: 'En bil holder på cykelstien. Cyklisten må ud på kørebanen for at komme forbi — det kan du se, længe før cyklisten gør det.',
  },
  {
    id: 'skolebørn',
    title: 'Skolevej om morgenen',
    dur: 8000,
    scene: { env: 'by', speed: 40, limit: 50 },
    actors: [
      { type: 'sign', props: { sign: 'skole' }, keys: [{ t: 0, d: 0.8, lane: 'sidewalkR' }, { t: 8000, d: 0.2, lane: 'sidewalkR' }] },
      { type: 'person', props: { child: true, color: '#F2A33A' }, keys: [{ t: 0, d: 0.75, lane: 'sidewalkR' }, { t: 8000, d: 0.15, lane: 'sidewalkR' }] },
      { type: 'person', props: { child: true, color: '#2F7D9A' }, keys: [{ t: 0, d: 0.78, lane: 'sidewalkR' }, { t: 3400, d: 0.6, lane: 'sidewalkR' }, { t: 5200, d: 0.5, lane: 'edgeR' }, { t: 8000, d: 0.2, lane: 'own' }] },
    ],
    hazard: { start: 3400, end: 6200 },
    explain: 'To børn på fortovet: det ene stopper, det andet løber ud mellem bilerne. Faren begynder, da barnet bryder ud af gruppen.',
  },
  {
    id: 'ingen-fare',
    title: 'Rolig landevej',
    dur: 7000,
    scene: { env: 'land', speed: 80, limit: 80 },
    actors: [
      { type: 'car', props: { color: '#9AA3AB' }, keys: [{ t: 0, d: 0.7, lane: 'own' }, { t: 7000, d: 0.7, lane: 'own' }] },
      { type: 'car', props: { color: '#D9D5CC', oncoming: true }, keys: [{ t: 0, d: 0.95, lane: 'oncoming' }, { t: 7000, d: 0.0, lane: 'oncoming' }] },
    ],
    hazard: null,
    explain: 'Ingen udviklende fare. Bilen foran holder farten, den modkørende bliver i sin bane. Tryk uden grund koster ikke point her — men det afslører, om du gætter.',
  },
];
