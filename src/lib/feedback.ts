let context: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function unlockAudio() {
  audio();
}

export function haptic(ms = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

function beep(frequency: number, start: number, duration: number, gainValue: number) {
  const ctx = audio();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(gainValue, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime + start);
  oscillator.stop(ctx.currentTime + start + duration);
}

export function playTap() {
  beep(520, 0, 0.05, 0.03);
  haptic(8);
}

export function playLock() {
  beep(480, 0, 0.06, 0.035);
  beep(720, 0.07, 0.1, 0.03);
  haptic(16);
}

export function playReveal() {
  beep(392, 0, 0.12, 0.03);
  beep(523, 0.1, 0.14, 0.03);
  beep(659, 0.2, 0.18, 0.028);
  haptic(20);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    beep(frequency, index * 0.09, 0.16, 0.03);
  });
  haptic(28);
}
