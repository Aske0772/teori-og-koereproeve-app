// Fejlniveauer og dom. Niveauerne er Færdselsstyrelsens fire; spillets dom er en fast regel (den rigtige er et skøn).
export const LEVELS = { minor: 'Mindre fejl', error: 'Fejl', serious: 'Alvorlig fejl', critical: 'Meget alvorlig fejl' };
export const CRITERIA = { orientering: 'Orientering', vigepligt: 'Vigepligt', hastighed: 'Hastighedstilpasning', placering: 'Placering', tegngivning: 'Tegngivning', betjening: 'Betjening' };

export function judge(notes, abortReason) {
  const n = k => notes.filter(x => x.level === k).length;
  const critical = n('critical'), serious = n('serious'), error = n('error'), minor = n('minor');
  const byCrit = {};
  for (const x of notes) byCrit[x.criterion] = (byCrit[x.criterion] || 0) + (x.level === 'minor' ? 0.5 : 1);
  const repeated = Object.entries(byCrit).find(([, v]) => v >= 3.5);
  let reason = null;
  if (abortReason) reason = 'Prøven blev afbrudt: ' + abortReason;
  else if (critical) reason = 'En meget alvorlig fejl er i sig selv afgørende.';
  else if (serious >= 2) reason = 'To alvorlige fejl bliver tilsammen afgørende.';
  else if (serious === 1 && error + minor >= 3) reason = 'En alvorlig fejl sammen med flere andre fejl bliver afgørende.';
  else if (error >= 5) reason = 'Mange fejl, selv om ingen var alvorlig.';
  else if (repeated) reason = `Gentagne fejl i samme område (${CRITERIA[repeated[0]]}).`;
  const score = Math.max(0, Math.round(100 - minor * 3 - error * 7 - serious * 18 - critical * 45));
  const perCrit = {};
  for (const c of Object.keys(CRITERIA)) perCrit[c] = { minor: 0, error: 0, serious: 0, critical: 0 };
  for (const x of notes) if (perCrit[x.criterion]) perCrit[x.criterion][x.level]++;
  return { passed: !reason, reason, score, critical, serious, error, minor, perCrit, notes, aborted: !!abortReason };
}
