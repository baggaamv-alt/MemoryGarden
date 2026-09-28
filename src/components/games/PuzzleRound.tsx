"use client";

import { useState } from "react";
import { MimoSays } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import type { PuzzleRound as PuzzleRoundT, RoundProgress } from "@/lib/game/types";
import type { RoundApi } from "./GameRunner";

/** Picture Puzzle: a few large Cloudinary tiles; tap a piece, then its place. The faint picture guides. */
export function PuzzleRound({ round, progress, api }: { round: PuzzleRoundT; progress: RoundProgress; api: RoundApi }) {
  const { t, sound } = usePlay();
  const [selected, setSelected] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState<number | null>(null);
  const slots = round.rows * round.cols;
  const bySlot = new Map(Object.entries(progress.placed).map(([pieceId, slot]) => [slot, pieceId]));
  const tray = round.pieces.filter((p) => progress.placed[p.id] === undefined);
  const pieceImage = new Map(round.pieces.map((p) => [p.id, p.image]));

  async function place(slot: number) {
    if (!selected || progress.done || api.busy || bySlot.has(slot)) return;
    sound("tap");
    const res = await api.answer({ kind: "puzzle", pieceId: selected, slot });
    if (res && !res.feedback?.correct) {
      setWiggle(slot);
      window.setTimeout(() => setWiggle(null), 700);
    } else setSelected(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <MimoSays text={round.prompt} expression={progress.done ? "celebrate" : "happy"} size={90} autoRead={!progress.done} />
      <div
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.5rem] border-4 border-white bg-cream-deep shadow-lift"
        style={{ aspectRatio: `${round.width} / ${round.height}` }}
      >
        {progress.done ? (
          <CloudImage image={round.full} className="h-full w-full" priority />
        ) : (
          <>
            <CloudImage image={round.ghost} className="absolute inset-0 h-full w-full" style={{ opacity: round.ghostOpacity }} priority />
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${round.cols}, 1fr)`, gridTemplateRows: `repeat(${round.rows}, 1fr)` }}>
              {Array.from({ length: slots }).map((_, slot) => {
                const pieceId = bySlot.get(slot);
                const img = pieceId ? pieceImage.get(pieceId) : null;
                return (
                  <button
                    key={slot}
                    onClick={() => place(slot)}
                    disabled={!!pieceId || !selected}
                    className={`relative border-2 border-dashed border-white/80 transition ${selected && !pieceId ? "bg-sky/30 hover:bg-sky/50" : ""} ${wiggle === slot ? "wiggle bg-lavender/40" : ""}`}
                    aria-label={`${t("game.orderPlaced", { n: slot + 1 })}`}
                  >
                    {img && <CloudImage image={img} className="absolute inset-0 h-full w-full animate-pop" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!progress.done && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" role="group" aria-label={t("prompt.puzzle")}>
            {tray.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  sound("tap");
                  setSelected((s) => (s === p.id ? null : p.id));
                }}
                className={`overflow-hidden rounded-2xl border-4 transition active:scale-95 ${selected === p.id ? "border-sky-deep shadow-[0_0_0_4px_#cde7f7]" : "border-white shadow-soft"}`}
                aria-pressed={selected === p.id}
                aria-label={p.image.alt}
                style={{ aspectRatio: `${round.width / round.cols} / ${round.height / round.rows}` }}
              >
                <CloudImage image={p.image} className="h-full w-full" />
              </button>
            ))}
          </div>
          <button className="btn self-center" disabled={api.busy} onClick={() => api.answer({ kind: "reveal-all" })}>
            🖼️ {t("game.showPicture")}
          </button>
        </>
      )}
    </div>
  );
}
