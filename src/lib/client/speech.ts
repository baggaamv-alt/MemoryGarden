"use client";

import { useEffect, useState } from "react";

export type SpeakLang = "en" | "te" | string;

const BCP: Record<string, string> = { en: "en-IN", te: "te-IN" };

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported()) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: SpeakLang): SpeechSynthesisVoice | null {
  const tag = (BCP[lang] ?? lang).toLowerCase();
  const base = tag.split("-")[0];
  const exact = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === tag);
  const family = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = exact.length ? exact : family;
  if (!pool.length) return null;
  // Prefer natural/online voices, then the default one.
  return (
    pool.find((v) => /natural|neural|google/i.test(v.name)) ??
    pool.find((v) => v.default) ??
    pool[0]
  );
}

export function hasVoiceFor(voices: SpeechSynthesisVoice[], lang: SpeakLang) {
  if (lang === "en") return voices.length > 0;
  return !!pickVoice(voices, lang);
}

/**
 * Reads text aloud. Returns false when there is no voice for that language (we never read Telugu
 * with an English voice — the text stays on screen instead).
 */
export function speak(text: string, opts: { lang: SpeakLang; rate?: number; voices?: SpeechSynthesisVoice[]; onEnd?: () => void }) {
  if (!speechSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  const voices = opts.voices?.length ? opts.voices : synth.getVoices();
  const voice = pickVoice(voices, opts.lang);
  if (!voice && opts.lang !== "en") return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? BCP[opts.lang] ?? "en-IN";
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.9;
  u.pitch = 1.05;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported() {
  return recognitionCtor() !== null;
}

/** Listens for one short phrase. Returns a function that stops listening. */
export function listenOnce(lang: SpeakLang, handlers: { onResult: (alternatives: string[]) => void; onEnd: () => void; onError?: (e: string) => void }) {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError?.("unsupported");
    handlers.onEnd();
    return () => undefined;
  }
  const rec = new Ctor();
  rec.lang = BCP[lang] ?? lang;
  rec.interimResults = false;
  rec.maxAlternatives = 4;
  rec.continuous = false;
  rec.onresult = (e) => {
    const alts: string[] = [];
    const first = e.results[0];
    for (let i = 0; i < first.length; i++) alts.push(first[i].transcript);
    handlers.onResult(alts);
  };
  rec.onerror = (e) => handlers.onError?.(e.error);
  rec.onend = () => handlers.onEnd();
  try {
    rec.start();
  } catch {
    handlers.onEnd();
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}

const COMMANDS: Record<"hint" | "skip" | "repeat" | "stop" | "next", string[]> = {
  hint: ["hint", "help", "clue", "show me more", "show more", "more", "సహాయం", "సూచన", "ఇంకా చూపించు", "ఇంకా"],
  skip: ["skip", "pass", "leave it", "వదిలేద్దాం", "వదిలేయి", "దాటవేయి"],
  repeat: ["repeat", "again", "say again", "read", "మళ్ళీ", "మళ్లీ", "చదువు"],
  stop: ["stop", "home", "finish", "ఆపు", "ఆపుదాం", "ఇంటికి", "ముగించు"],
  next: ["next", "continue", "okay", "ok", "yes", "తర్వాత", "కొనసాగిద్దాం", "సరే", "అవును"],
};

const clean = (s: string) => s.toLowerCase().replace(/[.,!?।]/g, " ").replace(/\s+/g, " ").trim();

export function matchCommand(alternatives: string[]): keyof typeof COMMANDS | null {
  for (const alt of alternatives.map(clean)) {
    for (const [cmd, words] of Object.entries(COMMANDS) as [keyof typeof COMMANDS, string[]][]) {
      if (words.some((w) => alt === w || alt.startsWith(w + " ") || alt.endsWith(" " + w) || alt.includes(` ${w} `))) return cmd;
    }
  }
  return null;
}

/** Finds the answer option the person said (by its label), if any. */
export function matchOption<T extends { id: string; label: string }>(alternatives: string[], options: T[]): T | null {
  const alts = alternatives.map(clean);
  const labelled = options.filter((o) => o.label.trim());
  for (const alt of alts) {
    const exact = labelled.find((o) => clean(o.label) === alt);
    if (exact) return exact;
  }
  for (const alt of alts) {
    const hits = labelled.filter((o) => {
      const label = clean(o.label);
      return alt.includes(label) || label.split(" ").some((word) => word.length > 2 && alt.split(" ").includes(word));
    });
    if (hits.length === 1) return hits[0];
  }
  return null;
}
