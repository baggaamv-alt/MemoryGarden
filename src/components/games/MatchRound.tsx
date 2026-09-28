"use client";

import { useState } from "react";
import { MimoSays } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { CloudImage } from "@/components/ui/CloudImage";
import type { CardView, MatchRound as MatchRoundT, RoundProgress } from "@/lib/game/types";
import type { RoundApi } from "./GameRunner";

const PAIR_COLORS = ["#8CC084", "#9FD0F0", "#C7B5F2", "#F6CF6E", "#FFB48D", "#F7A79C"];

/** Memory Match and Daily Life Match: tap one card, then the one that goes with it. */
export function MatchRound({ round, progress, api }: { round: MatchRoundT; progress: RoundProgress; api: RoundApi }) {
  const { t, sound } = usePlay();
  const [first, setFirst] = useState<string | null>(null);
  const [peek, setPeek] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string[]>([]);

  const pairIndex = (id: string) => {
    const i = progress.matched.indexOf(id);
    return i < 0 ? -1 : Math.floor(i / 2);
  };

  async function tap(card: CardView) {
    if (progress.done || api.busy || progress.matched.includes(card.id)) return;
    sound("tap");
    if (!first) {
      setFirst(card.id);
      if (round.concealed) setPeek([card.id]);
      return;
    }
    if (first === card.id) {
      setFirst(null);
      setPeek([]);
      return;
    }
    const a = first;
    // In the open layout a second tap on the same side simply changes the selection.
    const firstCard = round.cards.find((c) => c.id === a);
    if (!round.concealed && firstCard?.side && firstCard.side === card.side) {
      setFirst(card.id);
      return;
    }
    if (round.concealed) setPeek([a, card.id]);
    setFirst(null);
    const res = await api.answer({ kind: "match", a, b: card.id });
    if (res && !res.feedback?.correct) {
      setWiggle([a, card.id]);
      window.setTimeout(() => {
        setWiggle([]);
        setPeek([]);
      }, round.concealed ? 1400 : 700);
    } else {
      setPeek([]);
    }
  }

  const renderCard = (c: CardView) => {
    const matchedAt = pairIndex(c.id);
    const matched = matchedAt >= 0;
    const faceUp = !round.concealed || matched || peek.includes(c.id) || progress.done;
    const selected = first === c.id;
    return (
      <button
        key={c.id}
        onClick={() => tap(c)}
        disabled={matched || progress.done}
        className={`option !flex-col !justify-center !gap-2 !p-2 ${wiggle.includes(c.id) ? "wiggle" : ""}`}
        data-state={selected ? "selected" : undefined}
        style={matched ? { borderColor: PAIR_COLORS[matchedAt % PAIR_COLORS.length], background: `${PAIR_COLORS[matchedAt % PAIR_COLORS.length]}33`, boxShadow: `0 5px 0 ${PAIR_COLORS[matchedAt % PAIR_COLORS.length]}` } : undefined}
        aria-label={faceUp ? c.label || c.image?.alt || c.icon || "card" : t("prompt.matchConcealed")}
        aria-pressed={selected}
      >
        {faceUp ? (
          <>
            {c.image && <CloudImage image={c.image} className="aspect-square w-full rounded-[1rem]" alt={c.label || c.image.alt} />}
            {c.icon && !c.image && (
              <span className="text-5xl leading-none sm:text-6xl" aria-hidden="true">
                {c.icon}
              </span>
            )}
            {c.label && <span className="text-center text-lg leading-tight sm:text-xl">{c.label}</span>}
          </>
        ) : (
          <span className="flex aspect-square w-full items-center justify-center rounded-[1rem] bg-lavender text-5xl" aria-hidden="true">
            🌱
          </span>
        )}
      </button>
    );
  };

  const left = round.cards.filter((c) => c.side === "left");
  const right = round.cards.filter((c) => c.side === "right");

  return (
    <div className="flex flex-col gap-4">
      <MimoSays text={round.prompt} expression={progress.done ? "celebrate" : "happy"} size={90} autoRead={!progress.done} />
      {round.concealed ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{round.cards.map(renderCard)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          <div className="flex flex-col gap-3">{left.map(renderCard)}</div>
          <div className="flex flex-col gap-3">{right.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
