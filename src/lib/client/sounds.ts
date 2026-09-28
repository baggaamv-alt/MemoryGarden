"use client";

/**
 * Gentle synthesized sounds (no audio files). There is deliberately no "wrong answer" sound —
 * every attempt is met with the same soft, neutral tone or a small celebration.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, volume = 0.08, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = a.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sounds = {
  tap() {
    tone(660, 0, 0.12, 0.04, "triangle");
  },
  gentle() {
    tone(523.25, 0, 0.35, 0.05);
    tone(659.25, 0.12, 0.4, 0.04);
  },
  celebrate() {
    tone(523.25, 0, 0.3, 0.07);
    tone(659.25, 0.1, 0.3, 0.07);
    tone(783.99, 0.2, 0.45, 0.07);
    tone(1046.5, 0.32, 0.6, 0.05);
  },
  coin() {
    tone(987.77, 0, 0.12, 0.05, "triangle");
    tone(1318.5, 0.08, 0.3, 0.05, "triangle");
  },
  chime() {
    tone(880, 0, 0.8, 0.04);
    tone(1174.66, 0.15, 0.9, 0.03);
  },
};
