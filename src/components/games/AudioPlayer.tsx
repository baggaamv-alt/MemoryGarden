"use client";

import { useEffect, useRef, useState } from "react";
import { usePlay } from "@/components/play/PlayProvider";
import { PauseIcon, PlayIcon, ReplayIcon } from "@/components/ui/icons";

/** Big, simple audio controls: play/pause, hear again, and volume. */
export function AudioPlayer({ src, autoPlay = false }: { src: string; autoPlay?: boolean }) {
  const { t } = usePlay();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setTimeout(() => void ref.current?.play().catch(() => undefined), 600);
    return () => window.clearTimeout(id);
  }, [autoPlay, src]);

  return (
    <div className="card flex flex-col gap-4 p-5">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
      />
      <div className="flex items-center gap-4">
        <button
          className="btn btn-lg btn-sky !h-20 !w-20 !rounded-full !p-0"
          onClick={() => {
            const a = ref.current;
            if (!a) return;
            if (a.paused) void a.play().catch(() => undefined);
            else a.pause();
          }}
          aria-label={playing ? t("common.pause") : t("game.play")}
        >
          {playing ? <PauseIcon size={34} /> : <PlayIcon size={34} />}
        </button>
        <div className="flex-1">
          <div className="h-4 overflow-hidden rounded-full bg-cream-deep" aria-hidden="true">
            <div className="h-full rounded-full bg-sky-deep transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
        <button
          className="btn btn-sm !min-h-[3.25rem]"
          onClick={() => {
            const a = ref.current;
            if (!a) return;
            a.currentTime = 0;
            void a.play().catch(() => undefined);
          }}
          aria-label={t("common.replay")}
        >
          <ReplayIcon size={24} /> <span className="hidden sm:inline">{t("common.replay")}</span>
        </button>
      </div>
      <label className="flex items-center gap-3 text-lg font-display font-bold">
        🔈 <span className="sr-only">{t("game.volume")}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-3 flex-1 accent-[#3f86b8]"
          aria-label={t("game.volume")}
        />
        🔊
      </label>
    </div>
  );
}
