// Sensorens stemme via browserens egen talesyntese. Virker uden netværk; dansk stemme hvis telefonen har en.
import { get } from './state.js';

let voice = null;

function pick() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => v.lang === 'da-DK') || voices.find(v => v.lang && v.lang.startsWith('da')) || null;
  return voice;
}
if ('speechSynthesis' in window) {
  pick();
  speechSynthesis.onvoiceschanged = pick;
}

export function speak(text, { rate = 1, pitch = 1 } = {}) {
  if (!get().tts || !text || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'da-DK';
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    speechSynthesis.speak(u);
  } catch { /* ingen stemme — teksten står der stadig */ }
}

export function hush() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export const hasDanishVoice = () => !!voice;
