// Sensorerne. Samme anvisninger, forskellig tone — så man lærer ikke at læse humøret.
// Bedømmelsen er altid den samme uanset sensor.

export const SENSORS = [
  {
    id: 'tavs',
    name: 'Henrik',
    style: 'Den tavse',
    color: '#3B4650',
    initials: 'H',
    intro: 'Goddag. Vi kører en tur på omkring 25 minutter. Jeg siger til i god tid, når du skal dreje. Kør, når du er klar.',
    cue: t => t,                                   // ren anvisning
    good: ['', '', 'Fint.'],
    minor: ['Mm.', '', 'Noteret.'],
    serious: ['Vi kører videre.', 'Fortsæt bare.'],
    verdictFail: 'Det blev desværre ikke bestået i dag. Jeg gennemgår fejlene med dig nu.',
    verdictPass: 'Tillykke, det er bestået. Et par bemærkninger, så du kører sikkert fremover.',
    waiting: 'Han siger ikke meget i venteværelset. Kigger på papirerne.',
  },
  {
    id: 'venlig',
    name: 'Mette',
    style: 'Den venlige',
    color: '#2F7D9A',
    initials: 'M',
    intro: 'Hej, og velkommen. Tag det roligt — jeg vil bare se dig køre, som du plejer. Jeg giver anvisningerne i god tid.',
    cue: t => `${t}, tak.`,
    good: ['Godt.', 'Fint set.', 'Sådan.'],
    minor: ['Okay.', 'Hold øje med det.', 'Lidt sent, men okay.'],
    serious: ['Vi kører videre, bare rolig.', 'Det tager vi bagefter. Kør videre.'],
    verdictFail: 'Jeg er ked af det, men prøven er ikke bestået. Du kørte pænt — det var én ting, der blev afgørende.',
    verdictPass: 'Det er bestået, tillykke! Du har et par ting at arbejde videre med, dem tager vi nu.',
    waiting: 'Hun smiler og spørger, om du har haft en god morgen.',
  },
  {
    id: 'utaalmodig',
    name: 'Jørgen',
    style: 'Den utålmodige',
    color: '#8A4B2E',
    initials: 'J',
    intro: 'Så. Vi kører 25 minutter, jeg siger hvor. Lad være med at gætte, hvad jeg tænker — bare kør.',
    cue: t => `${t}.`,
    good: ['', 'Ja.', ''],
    minor: ['Hm.', 'Kom så.', 'Det var sent.'],
    serious: ['Kør videre.', 'Videre.'],
    verdictFail: 'Ikke bestået. Jeg skriver det ned, du kan se det med det samme.',
    verdictPass: 'Bestået. Der er ting at rette, men det kører. Se her.',
    waiting: 'Han kigger på uret og sukker. Det betyder ingenting.',
  },
];

export function pickSensor(id) {
  if (id && id !== 'random') return SENSORS.find(s => s.id === id) || SENSORS[0];
  return SENSORS[Math.floor(Math.random() * SENSORS.length)];
}

export function say(sensor, list) {
  const arr = sensor[list] || [''];
  return arr[Math.floor(Math.random() * arr.length)];
}
