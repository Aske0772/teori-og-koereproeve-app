// Beslutningspunkter til beslutningskørslen.
// kind følger Færdselsstyrelsens fire fejlniveauer:
// 'minor' = mindre fejl, 'error' = fejl, 'serious' = alvorlig fejl, 'critical' = meget alvorlig fejl (kan alene give ikke bestået).
// Reglerne er faste og skrevet efter færdselslovens krav og Færdselsstyrelsens bedømmelsesområder — ingen AI.

export const CRITERIA = {
  orientering: 'Orientering',
  vigepligt: 'Vigepligt',
  hastighed: 'Hastighedstilpasning',
  placering: 'Placering',
};

export const LEVELS = {
  minor: 'Mindre fejl',
  error: 'Fejl',
  serious: 'Alvorlig fejl',
  critical: 'Meget alvorlig fejl',
};

// Spillets faste regel (sensoren i virkeligheden skønner – men ud fra de samme niveauer):
// én meget alvorlig fejl, to alvorlige, eller en alvorlig sammen med tre andre fejl = ikke bestået.
// Tre fejl inden for samme bedømmelsesområde tæller som gentagne fejl = ikke bestået.
export function judge(results) {
  const n = k => results.filter(r => r.kind === k).length;
  const critical = n('critical'), serious = n('serious'), error = n('error'), minor = n('minor');
  const byCrit = {};
  for (const r of results) if (r.kind !== 'correct') byCrit[r.criterion] = (byCrit[r.criterion] || 0) + 1;
  const repeated = Object.entries(byCrit).find(([, v]) => v >= 3);
  let reason = null;
  if (critical) reason = 'En meget alvorlig fejl er i sig selv afgørende.';
  else if (serious >= 2) reason = 'To alvorlige fejl bliver tilsammen afgørende.';
  else if (serious === 1 && error + minor >= 3) reason = 'En alvorlig fejl sammen med flere andre fejl bliver afgørende.';
  else if (repeated) reason = `Gentagne fejl i samme område (${CRITERIA[repeated[0]]}).`;
  const score = Math.max(0, 100 - minor * 4 - error * 8 - serious * 20 - critical * 45);
  return { passed: !reason, reason, score, critical, serious, error, minor };
}

export const SCENARIOS = [
  /* ---------------- vigepligt ---------------- */
  {
    id: 'hoejresving-cyklist',
    criterion: 'vigepligt',
    cue: 'Ved næste kryds drejer du til højre',
    scene: { env: 'by', cyclePath: true, junction: { d: 0.3, side: 'right' }, speed: 22, limit: 50, blinker: 'right', mirrorRight: 'cyclist', mirrorRear: 'car', objects: [{ type: 'cyclist', lane: 'cycleR', d: 0.3, approach: 0.04 }, { type: 'sign', sign: 'cykelsti', lane: 'sidewalkR', d: 0.5 }] },
    choices: [
      { t: 'Hold tilbage, lad cyklisten passere', kind: 'correct', why: 'Når du drejer til højre, har du vigepligt for cyklister på cykelstien, der kører ligeud. Cyklisten i sidespejlet er på vej forbi dig.' },
      { t: 'Drej nu, du er foran', kind: 'critical', why: 'Du klemmer cyklisten. Manglende vigepligt for cyklister ved højresving er en af de klassiske grunde til ikke bestået — og en af de hyppigste alvorlige ulykker i byerne.' },
      { t: 'Stop midt i svinget', kind: 'error', why: 'Du skal holde tilbage inden svinget, ikke stoppe halvvejs inde på cykelstien, hvor du spærrer for den.' },
    ],
    timeout: 'critical',
    timeoutWhy: 'Du kørte videre ind i svinget uden at tage stilling til cyklisten.',
    rule: 'Færdselsloven § 26, stk. 6',
  },
  {
    id: 'hajtaender-bil-fra-venstre',
    criterion: 'vigepligt',
    cue: 'Kør ligeud over krydset',
    scene: { env: 'by', junction: { d: 0.22, sharkTeeth: true }, speed: 18, limit: 50, objects: [{ type: 'sign', sign: 'vigepligt', lane: 'sidewalkR', d: 0.28, approach: 0.05 }, { type: 'car', x: 80, d: 0.32, approach: 0.0, color: '#7A8891', scale: 0.9 }] },
    choices: [
      { t: 'Hold tilbage ved hajtænderne', kind: 'correct', why: 'Hajtænder betyder ubetinget vigepligt: al trafik på den krydsende vej har forkørselsret, også bilen fra venstre.' },
      { t: 'Kør, bilen fra venstre skal vige', kind: 'critical', why: 'Hajtænder gælder begge veje. Ubetinget vigepligt betyder, at du venter på alle — uanset hvilken side de kommer fra.' },
      { t: 'Rul langsomt frem og se an', kind: 'minor', why: 'Du må gerne trille frem for at få udsyn, men ikke så langt, at du er ude i krydset, før du har set, om der er fri bane.' },
    ],
    timeout: 'critical',
    rule: 'Færdselsloven § 26, stk. 2',
  },
  {
    id: 'hoejrevigepligt',
    criterion: 'vigepligt',
    cue: 'Kør ligeud',
    scene: { env: 'by', junction: { d: 0.25 }, speed: 32, limit: 50, objects: [{ type: 'car', x: 330, d: 0.34, approach: 0, color: '#B33B3B', scale: 0.9 }] },
    choices: [
      { t: 'Sæt farten ned og hold tilbage for bilen fra højre', kind: 'correct', why: 'Ingen skilte, ingen hajtænder: så gælder højrevigepligten. Bilen fra højre skal frem først.' },
      { t: 'Fortsæt, du er på den største vej', kind: 'critical', why: 'Vejens størrelse betyder ingenting. Uden afmærkning har trafik fra højre forkørselsret.' },
      { t: 'Blink til ham, så han kører', kind: 'error', why: 'Du må ikke give andre tegn til at køre — du kan ikke se, hvad de ikke kan se. Hold bare tilbage.' },
    ],
    timeout: 'critical',
    rule: 'Færdselsloven § 26, stk. 4',
  },
  {
    id: 'stopskilt',
    criterion: 'vigepligt',
    cue: 'Drej til venstre ved stopskiltet',
    scene: { env: 'land', junction: { d: 0.2, stopLine: true }, speed: 12, limit: 80, blinker: 'left', objects: [{ type: 'sign', sign: 'stop', lane: 'sidewalkR', d: 0.24, approach: 0.05 }] },
    choices: [
      { t: 'Stands helt ved stoplinjen, orientér dig, kør', kind: 'correct', why: 'Stop betyder fuldt stop — bilen skal stå stille ved stoplinjen, også når der er frit. Først derefter orientering og kørsel.' },
      { t: 'Der er frit, rul igennem i 10 km/t', kind: 'serious', why: 'Et "rullende stop" er ikke et stop. Det bedømmes som manglende overholdelse af vigepligten og giver ikke bestået.' },
      { t: 'Stands 5 meter før linjen', kind: 'minor', why: 'Du skal standse ved stoplinjen, hvor du har udsyn. For tidligt stop giver dårligt overblik og ekstra start.' },
    ],
    timeout: 'serious',
    rule: 'Færdselsloven § 26, stk. 3',
  },
  {
    id: 'rundkoersel-ind',
    criterion: 'vigepligt',
    cue: 'I rundkørslen tager du anden vej ud',
    scene: { env: 'by', roundabout: { d: 0.25 }, speed: 20, limit: 50, objects: [{ type: 'sign', sign: 'rundkoersel', lane: 'sidewalkR', d: 0.4, approach: 0.05 }, { type: 'car', x: 130, d: 0.42, approach: 0, color: '#2F7D9A', scale: 0.8 }] },
    choices: [
      { t: 'Hold tilbage for bilen i rundkørslen', kind: 'correct', why: 'Du har ubetinget vigepligt for al trafik, der allerede kører i rundkørslen. Den kommer fra venstre.' },
      { t: 'Kør ind, der er plads foran ham', kind: 'critical', why: 'Hvis bilen i rundkørslen skal bremse for dig, har du ikke overholdt vigepligten. Tvivl = vent.' },
      { t: 'Stop helt op og vent på tom rundkørsel', kind: 'error', why: 'Du skal ikke vente på, at der er helt tomt — kun på et hul, du kan køre ind i uden at genere. Unødig venten er også en fejl.' },
    ],
    timeout: 'critical',
  },
  {
    id: 'fodgaengerfelt',
    criterion: 'vigepligt',
    cue: 'Fortsæt ligeud ad vejen',
    scene: { env: 'by', zebra: 0.26, speed: 38, limit: 50, objects: [{ type: 'sign', sign: 'fodgaenger', lane: 'sidewalkR', d: 0.3, approach: 0.05 }, { type: 'person', lane: 'sidewalkR', d: 0.3, approach: 0.05 }] },
    choices: [
      { t: 'Brems og stands for fodgængeren', kind: 'correct', why: 'En fodgænger, der står ved feltet og tydeligt vil over, har du vigepligt for. Brems tidligt og tydeligt, så bilerne bag dig forstår det.' },
      { t: 'Kør igennem, hun er ikke trådt ud endnu', kind: 'critical', why: 'Vigepligten gælder også fodgængere, der er på vej ud i feltet. At køre forbi er en alvorlig fejl.' },
      { t: 'Brems hårdt lige før feltet', kind: 'error', why: 'Du standsede, men så sent og hårdt, at bilen bag dig blev overrasket. Sæt farten ned, når du ser skiltet.' },
    ],
    timeout: 'critical',
    rule: 'Færdselsloven § 27, stk. 6',
  },
  {
    id: 'bus-fra-stoppested',
    criterion: 'vigepligt',
    cue: 'Fortsæt ligeud',
    scene: { env: 'by', speed: 42, limit: 50, mirrorRear: 'car', objects: [{ type: 'bus', lane: 'edgeR', d: 0.3, approach: 0.1 }, { type: 'sign', sign: 'busstop', lane: 'sidewalkR', d: 0.32, approach: 0.1 }] },
    question: 'Bussen blinker ud fra stoppestedet.',
    choices: [
      { t: 'Sæt farten ned og lad bussen køre ud', kind: 'correct', why: 'I byzone skal du give en bus, der blinker ud fra et stoppested, mulighed for at køre ud. Den har ikke pligt til at vente på dig.' },
      { t: 'Fortsæt — du er der først', kind: 'serious', why: 'I tættere bebygget område er det dig, der holder tilbage for bussen. Det er en vigepligtsregel, ikke en høflighed.' },
      { t: 'Træk helt over i modsatte bane og passér', kind: 'error', why: 'Du kom forbi, men ved at bruge modsatte vejbane uden grund. Det bedømmes som dårlig placering, og der kunne komme modkørende.' },
    ],
    timeout: 'error',
    rule: 'Færdselsloven § 26, stk. 6',
  },
  {
    id: 'venstresving-modkoerende',
    criterion: 'vigepligt',
    cue: 'Drej til venstre i krydset',
    scene: { env: 'by', junction: { d: 0.22 }, speed: 14, limit: 50, blinker: 'left', objects: [{ type: 'car', lane: 'oncoming', d: 0.5, approach: 0.25, oncoming: true, color: '#D9D5CC' }] },
    choices: [
      { t: 'Vent i krydset til den modkørende er forbi', kind: 'correct', why: 'Ved venstresving har du vigepligt for modkørende, der kører ligeud eller til højre. Placér dig til venstre i din bane, blink, og vent.' },
      { t: 'Du kan nå det — drej nu', kind: 'critical', why: 'Hvis den modkørende skal bremse, var det for sent. Venstresving foran modkørende er en typisk alvorlig fejl.' },
      { t: 'Vent, men bliv stående helt til højre i din bane', kind: 'error', why: 'Du ventede rigtigt, men placeringen er forkert: trafikken bag dig kan ikke komme forbi, og det er uklart, at du vil til venstre.' },
    ],
    timeout: 'critical',
    rule: 'Færdselsloven § 26, stk. 5',
  },

  /* ---------------- hastighed ---------------- */
  {
    id: 'byzone-ind',
    criterion: 'hastighed',
    cue: 'Fortsæt ligeud ind i byen',
    scene: { env: 'land', speed: 72, limit: 50, objects: [{ type: 'sign', sign: 'byzone', lane: 'sidewalkR', d: 0.18, approach: 0.1 }] },
    choices: [
      { t: 'Ned på 50 inden skiltet', kind: 'correct', why: 'Byzoneskiltet betyder 50 km/t fra skiltet. Du skal have farten ned, før du passerer det — ikke begynde at bremse der.' },
      { t: 'Fortsæt i 72 og brems lidt efter skiltet', kind: 'serious', why: 'Over 20 km/t for hurtigt i byzone er en betydelig hastighedsoverskridelse. Det giver ikke bestået med det samme.' },
      { t: 'Ned på 35 for en sikkerheds skyld', kind: 'error', why: 'Unødigt lav hastighed er også en fejl. Du skal køre efter forholdene, og forholdene her siger 50.' },
    ],
    timeout: 'serious',
  },
  {
    id: 'byzone-ud',
    criterion: 'hastighed',
    cue: 'Fortsæt ud af byen',
    scene: { env: 'land', speed: 50, limit: 80, objects: [{ type: 'sign', sign: 'byzoneSlut', lane: 'sidewalkR', d: 0.14, approach: 0.1 }] },
    choices: [
      { t: 'Øg til 80, vejen og udsynet tillader det', kind: 'correct', why: 'Uden for byzone er grænsen 80 km/t på almindelig vej. Sensoren forventer, at du følger med, når forholdene tillader det.' },
      { t: 'Bliv på 50, det er sikrest', kind: 'error', why: 'Unødigt lav hastighed bedømmes som manglende hastighedstilpasning. Det skaber kø og farlige overhalinger.' },
      { t: 'Op på 95 — der er ingen', kind: 'serious', why: 'Grænsen er 80. Mere end 15 km/t over bedømmes som en alvorlig fejl, uanset hvor tomt der er.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'skolezone',
    criterion: 'hastighed',
    cue: 'Fortsæt ligeud',
    scene: { env: 'by', speed: 48, limit: 50, objects: [{ type: 'sign', sign: 'skole', lane: 'sidewalkR', d: 0.3, approach: 0.1 }, { type: 'person', child: true, lane: 'sidewalkR', d: 0.42, approach: 0.1 }, { type: 'person', child: true, lane: 'sidewalkR', d: 0.5, approach: 0.1, color: '#2F7D9A' }] },
    choices: [
      { t: 'Ned i fart, foden over bremsen', kind: 'correct', why: 'Børn ved vejen er en risiko, du skal tilpasse farten efter — også selvom grænsen er 50. "Efter forholdene" vejer tungere end skiltet.' },
      { t: 'Hold 48, du er under grænsen', kind: 'serious', why: 'Hastighedsgrænsen er et loft, ikke et mål. Med børn tæt på kørebanen er 48 for meget, og det bedømmes som manglende tilpasning.' },
      { t: 'Dyt, så de ved, du kommer', kind: 'error', why: 'Hornet bruges kun for at afværge fare. Her skal du bare ned i fart.' },
    ],
    timeout: 'error',
  },
  {
    id: 'regn-bil-foran',
    criterion: 'hastighed',
    cue: 'Følg vejen',
    scene: { env: 'land', rain: true, speed: 78, limit: 80, objects: [{ type: 'car', lane: 'own', d: 0.33, approach: 0.0, braking: true }] },
    question: 'Bilen foran bremser.',
    choices: [
      { t: 'Slip speederen, øg afstanden', kind: 'correct', why: 'Våd vej: længere bremselængde. Afstanden til forankørende skal øges, så du kan standse uden at bremse hårdt.' },
      { t: 'Hold afstanden, du er under 80', kind: 'error', why: 'Lovlig fart er ikke det samme som tilpasset fart. I regn skal afstanden op, og sensoren noterer det.' },
      { t: 'Træk ud og overhal', kind: 'serious', why: 'Overhaling i regn, lige efter at forankørende bremser, uden at vide hvorfor — det er at køre ind i noget, du ikke kan se.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'gult-lys-langt-fra',
    criterion: 'hastighed',
    cue: 'Kør ligeud i lyskrydset',
    scene: { env: 'by', junction: { d: 0.34, stopLine: true }, speed: 45, limit: 50, objects: [{ type: 'trafficLight', state: 'yellow', lane: 'sidewalkR', d: 0.36, approach: 0.1 }] },
    question: 'Lyset skifter til gult.',
    choices: [
      { t: 'Brems roligt og stands ved stoplinjen', kind: 'correct', why: 'Gult betyder stop, medmindre du er så tæt på, at du ikke kan standse forsvarligt. Her har du afstanden til det.' },
      { t: 'Speed op og nå over', kind: 'critical', why: 'At accelerere mod gult, når du kunne have standset, bedømmes som kørsel mod rødt — en alvorlig fejl.' },
      { t: 'Brems hårdt i sidste øjeblik', kind: 'error', why: 'Du stoppede, men panikbremsning med bil bagved er en fejl i hastighedstilpasning. Du så lyset for sent.' },
    ],
    timeout: 'serious',
  },
  {
    id: 'rundkoersel-hastighed',
    criterion: 'hastighed',
    cue: 'Kør ind i rundkørslen, første vej ud',
    scene: { env: 'by', roundabout: { d: 0.2 }, speed: 44, limit: 50, blinker: 'right', objects: [{ type: 'sign', sign: 'rundkoersel', lane: 'sidewalkR', d: 0.3, approach: 0.05 }] },
    choices: [
      { t: 'Ned til omkring 20–25 inden rundkørslen', kind: 'correct', why: 'Rundkørslen er tom, men svinget er skarpt, og udsynet til venstre er kort. Du skal kunne standse for noget, du først ser sent.' },
      { t: 'Hold 44 — der er ingen', kind: 'serious', why: 'Du kan ikke overholde en vigepligt i 44 km/t. Sensoren bedømmer det som manglende hastighedstilpasning før vigepligt.' },
      { t: 'Ned til 8 og kryb igennem', kind: 'error', why: 'Unødigt langsomt. Rundkørslen er tom, og du blokerer for trafikken bag dig.' },
    ],
    timeout: 'error',
  },

  /* ---------------- orientering ---------------- */
  {
    id: 'vognbaneskift-venstre',
    criterion: 'orientering',
    cue: 'Skift til venstre vognbane, du skal til venstre forude',
    scene: { env: 'by', speed: 45, limit: 50, mirrorLeft: 'close', mirrorRear: 'car', centerLine: 'dashed', objects: [{ type: 'car', lane: 'own', d: 0.55, approach: 0.1 }] },
    choices: [
      { t: 'Spejle, skulderblik, vent — bilen i venstre spejl er for tæt', kind: 'correct', why: 'Rutinen er spejl, spejl, skulderblik, blink, og først derefter skiftet. Og hvis skulderblikket viser en bil, venter du.' },
      { t: 'Blink og træk over nu', kind: 'critical', why: 'Vognbaneskift uden orientering, med en bil i den blinde vinkel, er en alvorlig fejl og en reel ulykke.' },
      { t: 'Kig i bakspejlet og træk over', kind: 'serious', why: 'Bakspejlet viser ikke bilen ved siden af dig. Uden skulderblik er orienteringen ikke gennemført.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'hoejresving-skulderblik',
    criterion: 'orientering',
    cue: 'Drej til højre ved næste vej',
    scene: { env: 'by', cyclePath: true, junction: { d: 0.28, side: 'right' }, speed: 20, limit: 50, blinker: 'right', mirrorRight: 'empty', mirrorRear: 'car' },
    question: 'Du har blinket. Hvad nu?',
    choices: [
      { t: 'Spejl og skulderblik til højre, så sving', kind: 'correct', why: 'Også når spejlet er tomt: skulderblikket til højre er det, der fanger cyklisten i den blinde vinkel. Sensoren ser efter, om du drejer hovedet.' },
      { t: 'Spejlet er tomt, drej', kind: 'error', why: 'Du drejede sikkert denne gang — men manglende skulderblik er en orienteringsfejl, og sensoren noterer det hver gang.' },
      { t: 'Kig over venstre skulder', kind: 'error', why: 'Forkert side. Ved højresving er faren i højre side, hvor cykelstien er.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'parkeret-bil-aaben-doer',
    criterion: 'orientering',
    cue: 'Fortsæt ligeud ad villavejen',
    scene: { env: 'by', speed: 38, limit: 50, objects: [{ type: 'parkedDoor', lane: 'edgeR', d: 0.3, approach: 0.1 }] },
    choices: [
      { t: 'Ned i fart, hold afstand til døren', kind: 'correct', why: 'En åben dør betyder, at der er en person. Afstand og fart ned — og kig efter fødder under bilen og hoveder i ruderne.' },
      { t: 'Hold kurs og fart, der er plads', kind: 'serious', why: 'Pladsen forsvinder, hvis døren åbnes mere, eller nogen træder ud. Det er manglende orientering mod en synlig risiko.' },
      { t: 'Dyt og kør forbi', kind: 'error', why: 'Hornet er ikke orientering. Farten ned og afstand er det, der virker.' },
    ],
    timeout: 'error',
  },
  {
    id: 'bakspejl-motorcykel',
    criterion: 'orientering',
    cue: 'Du skal standse ved busstoppestedet forude',
    scene: { env: 'by', speed: 40, limit: 50, mirrorRear: 'motorcycle', blinker: 'right', objects: [{ type: 'sign', sign: 'busstop', lane: 'sidewalkR', d: 0.3, approach: 0.1 }] },
    choices: [
      { t: 'Blink tidligt og brems blødt — motorcyklen er tæt på', kind: 'correct', why: 'Orientering før opbremsning: bakspejlet først. Motorcyklisten bag dig har kortere bremseafstand end dig, men skal have tid til at reagere.' },
      { t: 'Brems normalt, han må selv holde afstand', kind: 'error', why: 'Du har ret, men sensoren ser efter, om du orienterer dig bagud før du bremser. Det gjorde du ikke.' },
      { t: 'Stands brat ved skiltet', kind: 'serious', why: 'Pludselig opbremsning med en motorcykel tæt bag dig kan vælte ham. Manglende orientering med fare for andre.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'kryds-groent-fodgaenger',
    criterion: 'orientering',
    cue: 'Drej til højre for grønt',
    scene: { env: 'by', junction: { d: 0.22, side: 'right' }, zebra: 0.3, speed: 15, limit: 50, blinker: 'right', objects: [{ type: 'trafficLight', state: 'green', lane: 'sidewalkR', d: 0.24, approach: 0.05 }, { type: 'person', lane: 'sidewalkR', d: 0.34, approach: 0.0, dy: -4 }] },
    choices: [
      { t: 'Vent, fodgængeren har også grønt og er på vej over', kind: 'correct', why: 'Grønt for dig betyder ofte grønt for fodgængere på tværvejen. Ved svingning skal du holde tilbage for dem.' },
      { t: 'Grønt er grønt — drej', kind: 'critical', why: 'Grønt lys ophæver ikke din vigepligt for fodgængere, der krydser den vej, du svinger ind på.' },
      { t: 'Drej hurtigt forbi ham', kind: 'critical', why: 'Du kørte foran en fodgænger i fodgængerfeltet. Alvorlig fejl.' },
    ],
    timeout: 'critical',
  },
  {
    id: 'cyklist-foran-ingen-sti',
    criterion: 'orientering',
    cue: 'Følg vejen',
    scene: { env: 'land', speed: 55, limit: 80, objects: [{ type: 'cyclist', lane: 'edgeR', d: 0.28, approach: 0.1 }, { type: 'car', lane: 'oncoming', d: 0.5, approach: 0.3, oncoming: true }] },
    choices: [
      { t: 'Bliv bag cyklisten til den modkørende er forbi', kind: 'correct', why: 'Overhaling af en cyklist kræver mindst 1,5 meters afstand, og det kan du ikke give med en modkørende. Så venter du.' },
      { t: 'Overhal nu, der er lige plads', kind: 'critical', why: '"Lige plads" er ikke plads. Overhaling af cyklist med modkørende er en alvorlig fejl.' },
      { t: 'Kør helt tæt op bag cyklisten og vent', kind: 'error', why: 'Rigtig beslutning, forkert afstand. Hold afstand bagud, så cyklisten ikke presses.' },
    ],
    timeout: 'minor',
  },

  /* ---------------- placering ---------------- */
  {
    id: 'venstresving-placering',
    criterion: 'placering',
    cue: 'Drej til venstre ved næste vej',
    scene: { env: 'by', junction: { d: 0.3, side: 'left' }, speed: 25, limit: 50, blinker: 'left', mirrorRear: 'car' },
    choices: [
      { t: 'Træk ind mod midterlinjen i god tid', kind: 'correct', why: 'Før venstresving placerer du bilen til venstre i din egen bane, tæt på midten. Så kan bagvedkørende passere til højre, og alle kan se, hvad du vil.' },
      { t: 'Bliv i højre side til svinget', kind: 'error', why: 'Placering før svingning er et selvstændigt bedømmelsesområde. Forkert placering ved venstresving er en af de hyppigst noterede fejl.' },
      { t: 'Kør over midterlinjen for at skære svinget', kind: 'serious', why: 'Du er i den modkørende bane. Det er en alvorlig placeringsfejl, også når der er tomt.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'smal-vej-modkoerende',
    criterion: 'placering',
    cue: 'Følg vejen',
    scene: { env: 'land', speed: 70, limit: 80, centerLine: 'dashed', objects: [{ type: 'car', lane: 'oncoming', d: 0.4, approach: 0.3, oncoming: true, color: '#C9C3B9' }, { type: 'bus', lane: 'oncoming', d: 0.62, approach: 0.3 }] },
    choices: [
      { t: 'Hold til højre i banen, lidt ned i fart', kind: 'correct', why: 'Modkørende, især store køretøjer: hold godt til højre uden at ramme rabatten, og giv dig selv margen i farten.' },
      { t: 'Bliv midt i banen, der er plads nok', kind: 'error', why: 'Teknisk set plads, men margenen er for lille. Sensoren noterer placering tæt på midten med modkørende.' },
      { t: 'Træk ud i rabatten', kind: 'serious', why: 'Rabatten er ikke kørebane. Et hjul i blød rabat i 70 km/t kan trække bilen rundt.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'rundkoersel-ud-blink',
    criterion: 'placering',
    cue: 'Tag tredje vej ud af rundkørslen',
    scene: { env: 'by', roundabout: { d: 0.15 }, speed: 22, limit: 50, mirrorRight: 'cyclist', objects: [{ type: 'cyclist', lane: 'cycleR', d: 0.2, approach: 0.0 }] },
    question: 'Du er inde i rundkørslen, næste vej er din.',
    choices: [
      { t: 'Blink til højre, spejl, skulderblik, hold tilbage for cyklisten', kind: 'correct', why: 'Ud af rundkørslen: tegn til højre før din udkørsel, orientering til højre, og vigepligt for cyklister på cykelstien rundt om rundkørslen.' },
      { t: 'Kør ud uden at blinke, det er din vej', kind: 'error', why: 'Manglende tegngivning ved udkørsel er en typisk fejl. Trafikken bag dig og cyklisten skal vide, at du forlader rundkørslen.' },
      { t: 'Blink og kør ud foran cyklisten', kind: 'critical', why: 'Tegn giver ikke forkørselsret. Cyklisten på cykelstien har forkørselsret, når du kører ud.' },
    ],
    timeout: 'error',
  },
  {
    id: 'hoejresving-vid-bue',
    criterion: 'placering',
    cue: 'Drej til højre',
    scene: { env: 'by', junction: { d: 0.2, side: 'right' }, speed: 16, limit: 50, blinker: 'right', objects: [{ type: 'car', lane: 'oncoming', d: 0.35, approach: 0.1, oncoming: true }] },
    choices: [
      { t: 'Hold dig til højre og tag svinget tæt', kind: 'correct', why: 'Højresving tages i en lille bue, tæt på kantstenen. Så kommer du ikke over i sidevejens modkørende bane.' },
      { t: 'Træk ud til venstre først for at få plads', kind: 'serious', why: 'Du sving ud i den modkørende bane — både på din egen vej og på sidevejen. Alvorlig placeringsfejl.' },
      { t: 'Tag svinget i en bred bue', kind: 'error', why: 'Bred bue ved højresving bringer dig over midten på sidevejen. Der kom ingen denne gang, men sensoren noterer det.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'kantlinje-landevej',
    criterion: 'placering',
    cue: 'Følg vejen, der er ingen cykelsti',
    scene: { env: 'land', speed: 80, limit: 80, objects: [{ type: 'cyclist', lane: 'edgeR', d: 0.45, approach: 0.15 }] },
    choices: [
      { t: 'Ned i fart, hold afstand, overhal med god plads når der er frit', kind: 'correct', why: 'Ingen modkørende, så du kan overhale — men med mindst 1,5 meter til cyklisten og uden at skulle presse det.' },
      { t: 'Hold 80 og passér tæt, der er plads i banen', kind: 'serious', why: 'Passage af cyklist i 80 km/t med under en meters afstand er farlig og bedømmes som en alvorlig fejl.' },
      { t: 'Bliv bag cyklisten i flere hundrede meter', kind: 'error', why: 'Når der er frit, skal du overhale. Unødig venten bag langsom trafik er manglende hastighedstilpasning.' },
    ],
    timeout: 'minor',
  },
  {
    id: 'parkeret-raekke-modkoerende',
    criterion: 'placering',
    cue: 'Fortsæt ad vejen',
    scene: { env: 'by', speed: 30, limit: 50, objects: [{ type: 'car', lane: 'edgeR', d: 0.25, approach: 0.1, color: '#D9D5CC' }, { type: 'car', lane: 'edgeR', d: 0.4, approach: 0.1, color: '#9AA3AB' }, { type: 'car', lane: 'oncoming', d: 0.45, approach: 0.3, oncoming: true }] },
    question: 'Parkerede biler i din side, modkørende kommer.',
    choices: [
      { t: 'Hold tilbage før de parkerede biler', kind: 'correct', why: 'Forhindringen er i din side, så det er dig, der venter. Du må først passere, når det kan ske uden at genere den modkørende.' },
      { t: 'Kør ud og passér, han må vente', kind: 'serious', why: 'Den, der har forhindringen i sin side, holder tilbage. Du tvang den modkørende til at bremse.' },
      { t: 'Stands lige ud for de parkerede biler', kind: 'error', why: 'Du holdt tilbage, men på et sted hvor du spærrer. Stands før rækken, hvor der er plads til at passere dig.' },
    ],
    timeout: 'serious',
  },
];
