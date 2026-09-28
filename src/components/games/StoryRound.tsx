"use client";

import { useEffect, useState } from "react";
import { MimoSays, SpeakButton } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import type { RoundProgress, StoryRound as StoryRoundT } from "@/lib/game/types";
import { AudioPlayer } from "./AudioPlayer";
import type { RoundApi } from "./GameRunner";

/** Memory Story: one photograph at a time with its caregiver-approved caption, at the person's own pace. */
export function StoryRound({ round, progress, api }: { round: StoryRoundT; progress: RoundProgress; api: RoundApi }) {
  const { t, say, sound } = usePlay();
  const [page, setPage] = useState(() => Math.min(progress.viewed, round.slides.length - 1));
  const slide = round.slides[page];
  const last = page === round.slides.length - 1;

  useEffect(() => {
    if (!slide.narration) say(slide.caption, { lang: slide.lang });
    if (page > progress.viewed || (page === 0 && progress.viewed === 0 && !progress.done)) {
      void api.answer({ kind: "story", slide: page });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="flex flex-col gap-4">
      {page === 0 && <MimoSays text={`${round.prompt} ${round.title}`} expression="happy" size={80} autoRead={false} />}
      <article className="card overflow-hidden">
        {slide.video ? (
          <video src={slide.video.src} poster={slide.image?.src} controls className="max-h-[56dvh] w-full bg-cream-deep" />
        ) : (
          slide.image && <CloudImage key={slide.id} image={slide.image} priority fit="contain" className="max-h-[56dvh] w-full bg-cream-deep animate-fade" />
        )}
        <div className="flex items-start gap-3 p-5">
          <div className="flex-1">
            <p className="text-2xl font-display font-bold leading-snug" lang={slide.lang}>
              {slide.caption}
            </p>
            {slide.sublabel && <p className="mt-1 text-lg text-ink-soft">{slide.sublabel}</p>}
          </div>
          <SpeakButton text={slide.caption} lang={slide.lang} />
        </div>
        {slide.narration && (
          <div className="px-5 pb-5">
            <AudioPlayer src={slide.narration.src} autoPlay />
          </div>
        )}
      </article>
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-lg flex-1" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          ← {t("common.previous")}
        </button>
        <span className="pill text-lg tabular-nums">
          {page + 1} / {round.slides.length}
        </span>
        {!last ? (
          <button
            className="btn btn-lg btn-sage flex-1"
            onClick={() => {
              sound("tap");
              setPage((p) => Math.min(round.slides.length - 1, p + 1));
            }}
          >
            {t("common.next")} →
          </button>
        ) : (
          <button className="btn btn-lg btn-sage flex-1" disabled={progress.done || api.busy} onClick={() => api.answer({ kind: "story", slide: page })}>
            {progress.done ? "✿" : t("common.done")}
          </button>
        )}
      </div>
    </div>
  );
}
