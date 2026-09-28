"use client";

import { useEffect, useState } from "react";
import { MimoSays } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import { CheckIcon } from "@/components/ui/icons";
import type { ChoiceRound as ChoiceRoundT, OptionView, RoundProgress } from "@/lib/game/types";
import { AudioPlayer } from "./AudioPlayer";
import type { RoundApi } from "./GameRunner";

/**
 * Choice activities: Memory Reveal (blur stages), Who Is This?, Remember the Scene, Find the
 * Memory, What's Missing? and Sound and Memory. Tapping a different answer never shows red or
 * a cross — it is gently set aside and the picture helps a little more.
 */
export function ChoiceRound({ round, progress, api }: { round: ChoiceRoundT; progress: RoundProgress; api: RoundApi }) {
  const { t, sound } = usePlay();
  const [previewOpen, setPreviewOpen] = useState(!!round.preview && !progress.previewSeen && !progress.done);
  const [fading, setFading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  // "Look at the picture again" hint re-opens the preview (adjusting state while rendering, per React docs).
  const [seenHint, setSeenHint] = useState(api.hintSeq);
  if (seenHint !== api.hintSeq) {
    setSeenHint(api.hintSeq);
    if (api.hint?.type === "show-preview") {
      setFading(false);
      setPreviewOpen(true);
    }
  }

  // Optional viewing interval (only when the caregiver set one or the patient chose more challenge):
  // the picture fades away gently — there is never a visible countdown.
  useEffect(() => {
    if (!previewOpen || !round.preview?.exposureMs) return;
    const fade = window.setTimeout(() => setFading(true), round.preview.exposureMs);
    const close = window.setTimeout(() => closePreview(), round.preview.exposureMs + 1200);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, round.preview?.exposureMs]);

  function closePreview() {
    setPreviewOpen(false);
    setFading(false);
    if (!progress.previewSeen) void api.answer({ kind: "preview-seen" });
  }

  if (previewOpen && round.preview) {
    return (
      <div className="flex flex-col gap-4">
        <MimoSays text={round.preview.prompt} expression="curious" size={96} />
        <div className={`overflow-hidden rounded-[1.75rem] border-4 border-white shadow-lift transition-opacity duration-1000 ${fading ? "opacity-0" : "opacity-100"}`}>
          <CloudImage image={round.preview.image} priority fit="contain" className="max-h-[58dvh] w-full bg-cream-deep" />
        </div>
        <button className="btn btn-lg btn-sage" onClick={closePreview}>
          {t("game.imReady")}
        </button>
      </div>
    );
  }

  const done = progress.done;
  const stageImage = round.stages ? round.stages[done ? round.stages.length - 1 : Math.min(progress.stage, round.stages.length - 1)] : null;
  const mainImage = done && progress.revealImage && !round.stages ? progress.revealImage : stageImage ?? round.image;
  const style = round.optionStyle;

  function stateOf(o: OptionView): string | undefined {
    if (done && progress.correctIds?.includes(o.id)) return "correct";
    if (progress.eliminated.includes(o.id)) return "set-aside";
    if (!done && round.multi && picked.includes(o.id)) return "selected";
    if (done) return "set-aside";
    return undefined;
  }

  async function choose(o: OptionView) {
    if (done || api.busy || progress.eliminated.includes(o.id)) return;
    sound("tap");
    if (round.multi) {
      setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
      return;
    }
    await api.answer({ kind: "choice", optionIds: [o.id] });
  }

  return (
    <div className="flex flex-col gap-4">
      <MimoSays text={round.prompt} expression={done ? "celebrate" : "curious"} size={90} autoRead={!done} />

      {mainImage && (
        <div className={`relative overflow-hidden rounded-[1.75rem] border-4 border-white bg-cream-deep shadow-lift ${round.image && !round.stages && !done && style === "text" && !round.preview ? "mx-auto aspect-square w-full max-w-md" : ""}`}>
          <CloudImage image={mainImage} priority fit={round.image && !round.stages ? "cover" : "contain"} className={`w-full ${round.image && !round.stages && !round.preview ? "h-full" : "max-h-[52dvh]"}`} />
          {round.stages && !done && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/85 px-3 py-2" aria-hidden="true">
              {round.stages.map((_, i) => (
                <span key={i} className={`h-3 w-3 rounded-full ${i <= progress.stage ? "bg-sky-deep" : "bg-line"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {round.video && (
        <video src={round.video.src} poster={round.video.poster?.src} controls className="w-full rounded-[1.5rem] border-4 border-white shadow-lift" />
      )}
      {round.audio && <AudioPlayer src={round.audio.src} autoPlay={!done} />}

      <div
        className={
          style === "text"
            ? "grid gap-3 sm:grid-cols-2"
            : style === "picture"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-4"
              : "grid grid-cols-2 gap-4"
        }
        role="group"
        aria-label={t("game.chooseAnswer")}
      >
        {round.options.map((o) => {
          const state = stateOf(o);
          return (
            <button
              key={o.id}
              className={`option ${style !== "text" ? "!flex-col !items-stretch !gap-2 !p-2" : ""}`}
              data-state={state}
              disabled={done || progress.eliminated.includes(o.id) || api.busy}
              onClick={() => choose(o)}
              aria-pressed={round.multi ? picked.includes(o.id) : undefined}
              lang={o.lang}
            >
              {o.image && (
                <CloudImage
                  image={o.image}
                  className={`w-full rounded-[1rem] ${style === "picture-large" ? "aspect-[4/3]" : "aspect-square"}`}
                  alt={o.label || o.image.alt}
                />
              )}
              <span className={`flex items-center gap-3 ${style !== "text" ? "justify-center px-1 pb-1 text-center text-lg" : ""}`}>
                {o.icon && style === "text" && (
                  <span className="text-3xl" aria-hidden="true">
                    {o.icon}
                  </span>
                )}
                {(o.label || !o.image) && (
                  <span className="flex flex-col">
                    <span>{o.label}</span>
                    {o.sublabel && <span className="text-base font-semibold text-ink-soft">{o.sublabel}</span>}
                  </span>
                )}
                {state === "correct" && (
                  <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-sage-deep text-white">
                    <CheckIcon size={20} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {round.multi && !done && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg text-ink-soft">{t("game.chooseAll")}</p>
          <button
            className="btn btn-lg btn-sage w-full sm:w-auto"
            disabled={!picked.length || api.busy}
            onClick={() => api.answer({ kind: "choice", optionIds: picked }).then(() => setPicked([]))}
          >
            {t("common.done")}
          </button>
        </div>
      )}
    </div>
  );
}
