// Centralized synth-based sound effects.
// Each sound class uses a distinct synthesis technique for a unique character.

export function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __weetzeeAudioCtx?: AudioContext };
  if (!w.__weetzeeAudioCtx) w.__weetzeeAudioCtx = new AudioContext();
  if (w.__weetzeeAudioCtx.state === "suspended") w.__weetzeeAudioCtx.resume();
  return w.__weetzeeAudioCtx;
}

// ===== Dice rolling =====
// Square-wave bleeps at random pitches during the cycle,
// sine-wave chirps as each die settles into place.

const BLEEP_NOTES = [440, 523, 587, 659, 698, 784, 880, 988, 1047];

export function playBleep(freq?: number, duration = 0.04, volume = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq ?? BLEEP_NOTES[Math.floor(Math.random() * BLEEP_NOTES.length)];
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export function playSettle(index: number, total: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const baseFreq = 600 + index * (400 / Math.max(total, 1));
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, t + 0.06);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// ===== General tap =====
// Soft sine "pop" — warm, rounded tone with quick pitch drop.
// Starts at ~600Hz and falls to ~300Hz over 60ms for a gentle, woody feel.

export function playTap() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);
  gain.gain.setValueAtTime(0.09, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

// ===== Score category selection =====
// Plucked triangle wave — soft ascending pitch bend.

export function playSelect() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

// Deselecting a category — descending mirror of select.

export function playDeselect() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.06);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

// ===== Score confirm (Done) =====
// Two-note ascending chime — clean sine tones a major third apart.

export function playConfirm() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  [880, 1109].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t + i * 0.09;
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

// ===== Player turn transition =====
// Detuned dual-oscillator sweep — creates a shimmering "whoosh".

export function playTurnChange() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(400, t);
  osc1.frequency.exponentialRampToValueAtTime(800, t + 0.15);
  osc2.frequency.setValueAtTime(403, t);
  osc2.frequency.exponentialRampToValueAtTime(806, t + 0.15);

  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.22);
  osc2.stop(t + 0.22);
}

// ===== Win celebration =====
// Major-chord arpeggio (C5-E5-G5-C6) followed by a sustained chord.

export function playWin() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const notes = [523, 659, 784, 1047];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });

  const chordStart = t + 0.5;
  notes.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, chordStart);
    gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(chordStart);
    osc.stop(chordStart + 0.6);
  });
}

// ===== Farkle bust =====
// Descending minor third slide — a deflating "wah-wah" that conveys loss.

export function playFarkle() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "triangle";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(440, t);
  osc1.frequency.exponentialRampToValueAtTime(220, t + 0.5);
  osc2.frequency.setValueAtTime(349, t);
  osc2.frequency.exponentialRampToValueAtTime(175, t + 0.5);

  gain.gain.setValueAtTime(0.1, t);
  gain.gain.linearRampToValueAtTime(0.06, t + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.6);
  osc2.stop(t + 0.6);
}

// ===== Toggle switch =====
// Quick pitch bend — up for on, down for off.

export function playToggle(on: boolean) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(on ? 500 : 700, t);
  osc.frequency.exponentialRampToValueAtTime(on ? 700 : 500, t + 0.06);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}
