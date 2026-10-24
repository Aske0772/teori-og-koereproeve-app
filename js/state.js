// Al tilstand ligger lokalt på telefonen. Ingen server, ingen konti.
const KEY = 'koereproeven.v1';

const defaults = () => ({
  name: '',
  tts: true,
  sensorId: 'random',
  skills: {
    // disciplin -> bedste score 0..100 og antal forsøg
    orientering: { best: 0, tries: 0 },
    vigepligt: { best: 0, tries: 0 },
    hastighed: { best: 0, tries: 0 },
    placering: { best: 0, tries: 0 },
    skulderblik: { best: 0, tries: 0 },
    fare: { best: 0, tries: 0 },
    kontrol: { best: 0, tries: 0 },
    proevedag: { best: 0, tries: 0 },
  },
  kontrolSeen: {},        // spørgsmåls-id -> antal gange set / kendt
  bilTjek: {},            // skattejagt: emne -> true
  log: [],                // seneste 20 sessioner
  streakDays: [],         // ISO-datoer der er trænet
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed, skills: { ...defaults().skills, ...(parsed.skills || {}) } };
  } catch { return defaults(); }
}

export function get() { return state; }

export function save(patch) {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* privat tilstand: fortsæt uden at gemme */ }
  return state;
}

export function recordSkill(skill, score, extra = {}) {
  const today = new Date().toISOString().slice(0, 10);
  save(s => {
    const sk = s.skills[skill] || { best: 0, tries: 0 };
    const log = [{ skill, score, at: Date.now(), ...extra }, ...s.log].slice(0, 20);
    const streakDays = s.streakDays.includes(today) ? s.streakDays : [today, ...s.streakDays].slice(0, 60);
    return { ...s, skills: { ...s.skills, [skill]: { best: Math.max(sk.best, score), tries: sk.tries + 1, last: score } }, log, streakDays };
  });
}

export function reset() {
  state = defaults();
  try { localStorage.removeItem(KEY); } catch {}
}

// Stempler: en disciplin er "stemplet" når bedste score er mindst 80.
export const STAMP_LIMIT = 80;
export const STAMPS = [
  { id: 'orientering', label: 'Orien-tering' },
  { id: 'vigepligt', label: 'Vige-pligt' },
  { id: 'hastighed', label: 'Hastig-hed' },
  { id: 'placering', label: 'Place-ring' },
  { id: 'skulderblik', label: 'Skulder-blik' },
  { id: 'fare', label: 'Fare' },
  { id: 'kontrol', label: 'Kon-trol' },
  { id: 'proevedag', label: 'Prøve-dag' },
];

// "Klar-til-prøven"-måler rykker kun hvis alle discipliner er med.
export function readiness(s = state) {
  const vals = STAMPS.map(st => s.skills[st.id]?.best || 0);
  const min = Math.min(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  // den svageste disciplin trækker hårdt ned
  return Math.round(0.6 * min + 0.4 * avg);
}
