"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mimo } from "@/components/mimo/Mimo";
import { MimoSays, Petals, SpeakButton } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import { Dialog } from "@/components/ui/Dialog";
import { BulbIcon, CloseIcon, MicIcon, PauseIcon, SkipIcon } from "@/components/ui/icons";
import { api, errorText } from "@/lib/client/api";
import { listenOnce, matchCommand, matchOption, recognitionSupported } from "@/lib/client/speech";
import type {
  AnswerInput,
  AnswerResult,
  Feedback,
  HintPayload,
  HintResult,
  RewardSummary,
  RoundProgress,
  SessionView,
} from "@/lib/game/types";
import { ChoiceRound } from "./ChoiceRound";
import { MatchRound } from "./MatchRound";
import { OrderRound } from "./OrderRound";
import { PuzzleRound } from "./PuzzleRound";
import { RewardScreen } from "./RewardScreen";
import { StoryRound } from "./StoryRound";

export type RoundApi = {
  answer: (input: AnswerInput) => Promise<AnswerResult | null>;
  busy: boolean;
  hint: HintPayload | null;
  hintSeq: number;
};

export function GameRunner({ initial }: { initial: SessionView }) {
  const router = useRouter();
  const { t, say, sound, calm, voice, lang, character } = usePlay();
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => (initial.progress.every((p) => p.done) ? 0 : initial.current));
  const started = initial.progress.some((p) => p.attempts > 0 || p.done || p.viewed > 0);
  const [phase, setPhase] = useState<"intro" | "play" | "finishing" | "reward">(
    initial.status !== "in_progress" ? "finishing" : started ? "play" : "intro",
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState<HintPayload | null>(null);
  const [hintSeq, setHintSeq] = useState(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const roundStart = useRef(0);
  const feedbackTimer = useRef<number | null>(null);

  const round = session.rounds[index];
  const progress = session.progress[index];
  const total = session.rounds.length;

  // Each new round starts without the previous round's hint (adjusting state while rendering).
  const [hintRound, setHintRound] = useState(index);
  if (hintRound !== index) {
    setHintRound(index);
    setHint(null);
    setHintMessage(null);
  }
  useEffect(() => {
    roundStart.current = Date.now();
  }, [index, phase]);

  const updateProgress = useCallback((i: number, p: RoundProgress, current?: number) => {
    setSession((s) => {
      const progress = s.progress.slice();
      progress[i] = p;
      return { ...s, progress, current: current ?? s.current };
    });
  }, []);

  const finish = useCallback(async () => {
    try {
      const res = await api<{ summary: RewardSummary }>(`/api/play/sessions/${session.id}/finish`, { body: {} });
      setSummary(res.summary);
      setPhase("reward");
    } catch (e) {
      setError(errorText(e));
    }
  }, [session.id]);

  // A session that was already finished (e.g. reopened) goes straight to its rewards.
  useEffect(() => {
    if (initial.status === "in_progress") return;
    let alive = true;
    api<{ summary: RewardSummary }>(`/api/play/sessions/${initial.id}/finish`, { body: {} })
      .then((res) => {
        if (!alive) return;
        setSummary(res.summary);
        setPhase("reward");
      })
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [initial.status, initial.id]);

  const finishNow = useCallback(() => {
    setPhase("finishing");
    setError(null);
    void finish();
  }, [finish]);

  const answer = useCallback(
    async (input: AnswerInput): Promise<AnswerResult | null> => {
      if (busy) return null;
      setBusy(true);
      setError(null);
      try {
        const res = await api<AnswerResult>(`/api/play/sessions/${session.id}/answer`, {
          body: { round: index, input, responseMs: Date.now() - roundStart.current },
        });
        updateProgress(index, res.progress, res.current);
        if (res.feedback) {
          setFeedback(res.feedback);
          if (res.feedback.tone === "celebrate") sound(res.roundDone ? "celebrate" : "chime");
          else sound("gentle");
          if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
          if (!res.roundDone) feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2600);
          if (res.roundDone && res.progress.revealText) say(`${res.feedback.message} ${res.progress.revealText}`);
          else say(res.feedback.message);
        }
        return res;
      } catch (e) {
        setError(errorText(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, session.id, index, updateProgress, sound, say],
  );

  const askHint = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api<HintResult>(`/api/play/sessions/${session.id}/hint`, { body: { round: index } });
      updateProgress(index, res.progress);
      setHint(res.hint);
      setHintSeq((n) => n + 1);
      setHintMessage(res.message);
      say(res.message);
      sound("chime");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [busy, session.id, index, updateProgress, say, sound]);

  const next = useCallback(() => {
    setFeedback(null);
    sound("tap");
    const open = session.progress.findIndex((p, i) => !p.done && i > index);
    const any = session.progress.findIndex((p) => !p.done);
    const target = open >= 0 ? open : any;
    if (target < 0) finishNow();
    else setIndex(target);
  }, [session.progress, index, finishNow, sound]);

  const skip = useCallback(async () => {
    await answer({ kind: "skip" });
  }, [answer]);

  const promptText = useMemo(() => {
    if (!round) return "";
    if (round.kind === "choice" && round.options.some((o) => o.label)) {
      return `${round.prompt} ${round.options.map((o) => o.label).filter(Boolean).join(", ")}`;
    }
    return round.prompt;
  }, [round]);

  // Spoken commands (where the browser supports speech recognition).
  const listen = useCallback(() => {
    if (listening) return;
    setListening(true);
    listenOnce(lang, {
      onResult: (alts) => {
        const cmd = matchCommand(alts);
        if (cmd === "hint") return void askHint();
        if (cmd === "skip") return void skip();
        if (cmd === "repeat") return void say(promptText, { force: true });
        if (cmd === "stop") return setLeaveOpen(true);
        if (cmd === "next" && progress?.done) return next();
        if (round?.kind === "choice" && !progress?.done) {
          const opt = matchOption(alts, round.options.filter((o) => !progress.eliminated.includes(o.id)));
          if (opt) return void answer({ kind: "choice", optionIds: [opt.id] });
        }
        say(t("voice.notCaught"), { force: true });
      },
      onError: () => undefined,
      onEnd: () => setListening(false),
    });
  }, [listening, lang, askHint, skip, say, promptText, progress, next, round, answer, t]);

  if (phase === "reward" && summary) {
    return <RewardScreen summary={summary} session={session} onAgain={() => router.push(session.levelId ? `/play/map?level=${session.levelId}` : "/play/map")} />;
  }

  if (phase === "finishing") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
        <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="happy" size={180} animated={!calm} />
        {error ? (
          <>
            <p className="max-w-md text-2xl font-display font-bold">{t("common.somethingOff")}</p>
            <button className="btn btn-lg btn-sage" onClick={finishNow}>
              {t("common.tryAgain")}
            </button>
          </>
        ) : (
          <p className="text-2xl font-display font-bold">{t("common.loading")}</p>
        )}
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-8">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">{session.title}</h1>
        <MimoSays text={session.intro} expression="wave" size={170} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="btn btn-lg btn-sage flex-1"
            onClick={() => {
              sound("tap");
              setPhase("play");
            }}
          >
            {t("common.letsGo")}
          </button>
          <button className="btn btn-lg flex-1" onClick={() => router.push("/play/map")}>
            {t("common.notNow")}
          </button>
        </div>
      </main>
    );
  }

  if (!round || !progress) return null;
  const roundApi: RoundApi = { answer, busy, hint, hintSeq };
  const canHint = !progress.done && progress.hintsUsed < round.hintsAllowed;

  return (
    <div className="flex min-h-dvh flex-col pb-40">
      <header className="sticky top-0 z-30 border-b-2 border-line/70 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
          <button className="btn btn-sm !min-h-[3.25rem] !px-3" onClick={() => setLeaveOpen(true)} aria-label={t("game.leaveTitle")}>
            <CloseIcon size={24} />
            <span className="hidden sm:inline">{t("game.finish")}</span>
          </button>
          <div className="flex flex-1 items-center justify-center gap-2" aria-label={t("game.round", { n: index + 1, total })}>
            {session.rounds.map((_, i) => (
              <span
                key={i}
                className={`h-3.5 rounded-full transition-all ${i === index ? "w-9 bg-sky-deep" : session.progress[i].done ? "w-3.5 bg-sage-deep" : "w-3.5 bg-line"}`}
              />
            ))}
          </div>
          <SpeakButton text={promptText} />
          {voice.commands && recognitionSupported() && (
            <button
              className={`btn btn-sm !min-h-[3rem] !px-3 ${listening ? "btn-coral" : "btn-lavender"}`}
              onClick={listen}
              aria-label={listening ? t("voice.listening") : t("voice.tapSpeak")}
              aria-pressed={listening}
            >
              <MicIcon size={24} />
            </button>
          )}
          <button className="btn btn-sm !min-h-[3rem] !px-3" onClick={() => setPaused(true)} aria-label={t("common.pause")}>
            <PauseIcon size={24} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-3 pt-4 sm:px-5">
        {round.kind === "choice" && <ChoiceRound key={round.id} round={round} progress={progress} api={roundApi} />}
        {round.kind === "match" && <MatchRound key={round.id} round={round} progress={progress} api={roundApi} />}
        {round.kind === "puzzle" && <PuzzleRound key={round.id} round={round} progress={progress} api={roundApi} />}
        {round.kind === "story" && <StoryRound key={round.id} round={round} progress={progress} api={roundApi} />}
        {round.kind === "order" && <OrderRound key={round.id} round={round} progress={progress} api={roundApi} />}

        {hintMessage && !progress.done && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-gold-deep/40 bg-gold/50 p-4 animate-rise" role="status">
            <BulbIcon size={28} />
            <div className="flex-1">
              <p className="text-xl font-display font-bold">{hintMessage}</p>
              {hint?.type === "image" && hint.image && (
                <CloudImage image={hint.image} className="mt-3 max-h-72 w-full rounded-2xl" fit="contain" />
              )}
            </div>
          </div>
        )}
        {error && (
          <p className="mt-4 rounded-2xl bg-coral/40 p-4 text-lg font-semibold" role="alert">
            {error}
          </p>
        )}
      </main>

      {/* Round finished: warm reveal, then Next. */}
      {progress.done ? (
        <div className="fixed inset-x-0 bottom-0 z-40 animate-rise border-t-2 border-line bg-paper/97 shadow-lift backdrop-blur">
          {progress.outcome === "correct" && round.kind !== "story" && <Petals count={10} />}
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <Mimo
                appearance={character?.appearance}
                equipped={character?.equipped}
                expression={progress.outcome === "correct" || progress.outcome === "completed" ? "celebrate" : "comfort"}
                size={84}
                animated={!calm}
              />
              <div>
                <p className="text-xl font-display font-extrabold sm:text-2xl">
                  {feedback?.message ?? (progress.outcome === "skipped" ? t("mimo.skipped") : t("mimo.proud"))}
                </p>
                {progress.revealText && progress.outcome !== "skipped" && <p className="text-lg text-ink-soft">{progress.revealText}</p>}
              </div>
            </div>
            <button className="btn btn-lg btn-sage sm:min-w-56" onClick={next} autoFocus>
              {session.progress.every((p) => p.done) ? t("game.finish") : t("common.next")}
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line/70 bg-cream/95 backdrop-blur">
          {feedback && (
            <div
              className={`mx-auto mt-3 flex max-w-4xl items-center gap-3 rounded-2xl px-4 py-2 animate-rise ${feedback.tone === "celebrate" ? "bg-sage/80" : "bg-lavender/70"}`}
              role="status"
            >
              <Mimo appearance={character?.appearance} equipped={character?.equipped} expression={feedback.tone === "celebrate" ? "celebrate" : "comfort"} size={56} animated={false} />
              <p className="text-lg font-display font-bold sm:text-xl">{feedback.message}</p>
            </div>
          )}
          <div className="mx-auto flex max-w-4xl gap-3 px-3 py-3 sm:px-5">
            {round.kind !== "story" && (
              <button className="btn btn-lg btn-gold flex-1" disabled={!canHint || busy} onClick={askHint}>
                <BulbIcon size={26} />
                {round.kind === "choice" && round.stages && progress.stage < round.stages.length - 1 ? t("common.showMore") : t("common.hint")}
              </button>
            )}
            <button className="btn btn-lg flex-1" disabled={busy} onClick={skip}>
              <SkipIcon size={24} /> {t("common.skip")}
            </button>
          </div>
        </div>
      )}

      <Dialog open={leaveOpen} onClose={() => setLeaveOpen(false)} title={t("game.leaveTitle")}>
        <p className="mb-5 text-xl">{t("game.leaveText")}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-lg btn-sage flex-1" onClick={() => setLeaveOpen(false)}>
            {t("game.leaveNo")}
          </button>
          <button
            className="btn btn-lg flex-1"
            onClick={() => {
              setLeaveOpen(false);
              finishNow();
            }}
          >
            {t("game.leaveYes")}
          </button>
        </div>
      </Dialog>

      {paused && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-lavender/95 p-6 text-center">
          <Mimo appearance={character?.appearance} equipped={character?.equipped} expression="sleepy" size={180} animated={false} />
          <p className="text-3xl font-display font-extrabold">{t("game.paused")}</p>
          <button className="btn btn-lg btn-sage" onClick={() => setPaused(false)} autoFocus>
            {t("common.resume")}
          </button>
        </div>
      )}
    </div>
  );
}
