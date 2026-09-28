"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { sounds } from "@/lib/client/sounds";
import { hasVoiceFor, speak, stopSpeaking, useVoices } from "@/lib/client/speech";
import { t as translate, type Params, type TextKey } from "@/lib/i18n";
import type { AccessibilityPrefs, CharacterAppearance, EquippedSlots, Lang, VoicePrefs } from "@/lib/types";
import { Mimo } from "@/components/mimo/Mimo";
import { Dialog } from "@/components/ui/Dialog";

export type CharacterState = { name: string; appearance: CharacterAppearance; equipped: EquippedSlots } | null;

export type Effects = { coins: { reason: string; amount: number }[]; badges: { id: string; name: string; icon: string }[] };

export type PlayInit = {
  lang: Lang;
  accessibility: AccessibilityPrefs;
  voice: VoicePrefs;
  character: CharacterState;
  balance: number;
  patientName: string;
  breakReminderMinutes: number;
  sessionMinutes: number;
};

type Toast = { id: number; icon: string; text: string };

type Ctx = {
  lang: Lang;
  t: (key: TextKey, params?: Params) => string;
  accessibility: AccessibilityPrefs;
  voice: VoicePrefs;
  patientName: string;
  character: CharacterState;
  mimoName: string;
  setCharacter: (c: CharacterState) => void;
  balance: number;
  setBalance: (n: number) => void;
  updatePrefs: (patch: { language?: Lang; accessibility?: Partial<AccessibilityPrefs>; voice?: Partial<VoicePrefs> }) => Promise<void>;
  say: (text: string, opts?: { lang?: string; force?: boolean; onEnd?: () => void }) => boolean;
  canSpeak: (lang?: string) => boolean;
  stop: () => void;
  sound: (name: keyof typeof sounds) => void;
  showEffects: (effects: Effects | null | undefined) => void;
  toast: (icon: string, text: string) => void;
  calm: boolean;
};

const PlayContext = createContext<Ctx | null>(null);

export function usePlay() {
  const ctx = useContext(PlayContext);
  if (!ctx) throw new Error("usePlay must be used inside PlayProvider");
  return ctx;
}

export function PlayProvider({ init, children }: { init: PlayInit; children: ReactNode }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(init.lang);
  const [accessibility, setAccessibility] = useState(init.accessibility);
  const [voice, setVoice] = useState(init.voice);
  const [character, setCharacter] = useState<CharacterState>(init.character);
  const [balance, setBalance] = useState(init.balance);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const voices = useVoices();
  const toastId = useRef(0);

  const t = useCallback((key: TextKey, params?: Params) => translate(lang, key, params), [lang]);
  const mimoName = character?.name ?? "Mimo";

  const canSpeak = useCallback((l?: string) => voice.enabled && hasVoiceFor(voices, l ?? lang), [voice.enabled, voices, lang]);

  const say = useCallback(
    (text: string, opts: { lang?: string; force?: boolean; onEnd?: () => void } = {}) => {
      if (!voice.enabled) return false;
      if (!opts.force && !voice.autoRead) return false;
      return speak(text, { lang: opts.lang ?? lang, rate: voice.rate, voices, onEnd: opts.onEnd });
    },
    [voice, lang, voices],
  );

  const sound = useCallback(
    (name: keyof typeof sounds) => {
      if (accessibility.sound) sounds[name]();
    },
    [accessibility.sound],
  );

  const toast = useCallback((icon: string, text: string) => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, icon, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
  }, []);

  const showEffects = useCallback(
    (effects: Effects | null | undefined) => {
      if (!effects) return;
      const coins = effects.coins.reduce((n, c) => n + c.amount, 0);
      if (coins > 0) {
        setBalance((b) => b + coins);
        toast("🪙", `+${coins} ${translate(lang, "common.coinsShort")}`);
        sound("coin");
      }
      for (const b of effects.badges) toast(b.icon, `${translate(lang, "reward.badge")} ${b.name}`);
    },
    [lang, toast, sound],
  );

  const updatePrefs = useCallback(
    async (patch: { language?: Lang; accessibility?: Partial<AccessibilityPrefs>; voice?: Partial<VoicePrefs> }) => {
      if (patch.language) setLang(patch.language);
      if (patch.accessibility) setAccessibility((a) => ({ ...a, ...patch.accessibility }));
      if (patch.voice) setVoice((v) => ({ ...v, ...patch.voice }));
      await api("/api/play/preferences", { method: "PATCH", body: patch });
      if (patch.language) router.refresh();
    },
    [router],
  );

  // Gentle break reminder and preferred session length, counted only while someone is interacting.
  const [breakOpen, setBreakOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [resting, setResting] = useState(false);
  const [goodbye, setGoodbye] = useState(false);
  const active = useRef({ sinceBreak: 0, total: 0, lastInput: 0, askedFinish: false });
  useEffect(() => {
    const mark = () => (active.current.lastInput = Date.now());
    mark();
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - active.current.lastInput > 120_000) return;
      active.current.sinceBreak += 5;
      active.current.total += 5;
      if (init.breakReminderMinutes > 0 && active.current.sinceBreak >= init.breakReminderMinutes * 60) {
        active.current.sinceBreak = 0;
        setBreakOpen(true);
        void api("/api/play/break", { body: { kind: "shown" } }).catch(() => undefined);
      } else if (!active.current.askedFinish && init.sessionMinutes > 0 && active.current.total >= init.sessionMinutes * 60) {
        active.current.askedFinish = true;
        setFinishOpen(true);
      }
    }, 5000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [init.breakReminderMinutes, init.sessionMinutes]);

  const ctx = useMemo<Ctx>(
    () => ({
      lang,
      t,
      accessibility,
      voice,
      patientName: init.patientName,
      character,
      mimoName,
      setCharacter,
      balance,
      setBalance,
      updatePrefs,
      say,
      canSpeak,
      stop: stopSpeaking,
      sound,
      showEffects,
      toast,
      calm: accessibility.calmMode,
    }),
    [lang, t, accessibility, voice, init.patientName, character, mimoName, balance, updatePrefs, say, canSpeak, sound, showEffects, toast],
  );

  return (
    <PlayContext.Provider value={ctx}>
      <div
        className="mg-patient min-h-dvh"
        lang={lang}
        data-text-size={accessibility.textSize}
        data-contrast={accessibility.highContrast ? "high" : "normal"}
        data-calm={accessibility.calmMode ? "true" : "false"}
      >
        <OfflineBanner text={t("common.offline")} />
        {children}

        <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3" aria-live="polite">
          {toasts.map((x) => (
            <div key={x.id} className="pill animate-pop bg-paper px-5 py-2 text-lg shadow-lift">
              <span aria-hidden="true">{x.icon}</span>
              <span>{x.text}</span>
            </div>
          ))}
        </div>

        <Dialog open={breakOpen} onClose={() => setBreakOpen(false)}>
          <div className="flex flex-col items-center gap-4 text-center">
            <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="comfort" size={150} animated={!accessibility.calmMode} />
            <p className="text-2xl font-display font-bold">{t("break.question")}</p>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                className="btn btn-lg btn-sage flex-1"
                onClick={() => {
                  setBreakOpen(false);
                  setResting(true);
                  void api<{ effects: Effects }>("/api/play/break", { body: { kind: "taken" } })
                    .then((r) => showEffects(r.effects))
                    .catch(() => undefined);
                }}
              >
                🍵 {t("break.yes")}
              </button>
              <button
                className="btn btn-lg flex-1"
                onClick={() => {
                  setBreakOpen(false);
                  void api("/api/play/break", { body: { kind: "declined" } }).catch(() => undefined);
                }}
              >
                {t("break.no")}
              </button>
            </div>
          </div>
        </Dialog>

        <Dialog open={finishOpen} onClose={() => setFinishOpen(false)}>
          <div className="flex flex-col items-center gap-4 text-center">
            <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="happy" size={150} animated={!accessibility.calmMode} />
            <p className="text-2xl font-display font-bold">{t("break.sessionDone")}</p>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                className="btn btn-lg btn-sage flex-1"
                onClick={() => {
                  setFinishOpen(false);
                  setGoodbye(true);
                }}
              >
                {t("break.finish")}
              </button>
              <button className="btn btn-lg flex-1" onClick={() => setFinishOpen(false)}>
                {t("break.more")}
              </button>
            </div>
          </div>
        </Dialog>

        {(resting || goodbye) && (
          <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-sky to-cream p-6 text-center">
            {resting ? (
              <>
                <div className="relative flex h-56 w-56 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-sage/70" style={{ animation: accessibility.calmMode ? undefined : "breathe 8s ease-in-out infinite" }} />
                  <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="sleepy" size={150} animated={false} />
                </div>
                <p className="max-w-md text-3xl font-display font-bold">{t("break.breathe")}</p>
                <button className="btn btn-lg btn-sage" onClick={() => setResting(false)}>
                  {t("break.back")}
                </button>
              </>
            ) : (
              <>
                <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="wave" size={200} animated={!accessibility.calmMode} />
                <p className="max-w-md text-3xl font-display font-bold">{t("break.goodbye")}</p>
                <button
                  className="btn btn-lg btn-sage"
                  onClick={() => {
                    setGoodbye(false);
                    active.current.total = 0;
                    router.push("/play");
                  }}
                >
                  {t("common.home")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </PlayContext.Provider>
  );
}

function OfflineBanner({ text }: { text: string }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-[65] bg-gold px-4 py-3 text-center text-lg font-display font-bold text-ink">
      ☁️ {text}
    </div>
  );
}
