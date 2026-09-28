"use client";

import { useState } from "react";
import { MimoSays } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import type { OrderRound as OrderRoundT, RoundProgress } from "@/lib/game/types";
import type { RoundApi } from "./GameRunner";

/** Life timeline: tap the memories from long ago to recent. Hints pin the earliest ones. */
export function OrderRound({ round, progress, api }: { round: OrderRoundT; progress: RoundProgress; api: RoundApi }) {
  const { t, sound } = usePlay();
  const [sequence, setSequence] = useState<string[]>(progress.order ?? []);
  const [pinned, setPinned] = useState<string[]>([]);

  // A "first" hint pins the next-earliest memory (adjusting state while rendering, per React docs).
  const [seenHint, setSeenHint] = useState(api.hintSeq);
  if (seenHint !== api.hintSeq) {
    setSeenHint(api.hintSeq);
    if (api.hint?.type === "first" && api.hint.firstId && !pinned.includes(api.hint.firstId)) {
      const pins = [...pinned, api.hint.firstId];
      setPinned(pins);
      setSequence((seq) => [...pins, ...seq.filter((x) => !pins.includes(x))]);
    }
  }
  const shown = progress.done && progress.order ? progress.order : sequence;

  const byId = new Map(round.items.map((i) => [i.id, i]));
  const complete = sequence.length === round.items.length;

  return (
    <div className="flex flex-col gap-4">
      <MimoSays text={round.prompt} expression={progress.done ? "celebrate" : "curious"} size={90} autoRead={!progress.done} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {round.items.map((item) => {
          const pos = shown.indexOf(item.id);
          return (
            <button
              key={item.id}
              className="option !flex-col !items-stretch !gap-2 !p-2"
              data-state={pos >= 0 ? "selected" : undefined}
              disabled={progress.done || api.busy || pinned.includes(item.id)}
              onClick={() => {
                sound("tap");
                setSequence((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id || pinned.includes(x)) : [...s, item.id]));
              }}
              aria-label={`${item.label}${pos >= 0 ? ` — ${pos + 1}` : ""}`}
            >
              <div className="relative">
                <CloudImage image={item.image} className="aspect-square w-full rounded-[1rem]" alt={item.label} />
                {pos >= 0 && (
                  <span className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-sky-deep text-xl font-display font-extrabold text-white shadow">
                    {pos + 1}
                  </span>
                )}
              </div>
              <span className="text-center text-lg leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
      {!progress.done && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-lg flex-1" disabled={!sequence.length || api.busy} onClick={() => setSequence(pinned)}>
            ↺ {t("game.startOver")}
          </button>
          <button
            className="btn btn-lg btn-sage flex-1"
            disabled={!complete || api.busy}
            onClick={() => api.answer({ kind: "order", order: sequence })}
          >
            {t("game.checkOrder")}
          </button>
        </div>
      )}
      {progress.done && progress.order && (
        <ol className="flex flex-wrap items-center justify-center gap-2 text-lg font-display font-bold">
          {progress.order.map((id, i) => (
            <li key={id} className="pill">
              {i + 1}. {byId.get(id)?.label}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
