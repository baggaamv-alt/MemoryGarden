"use client";

import { Mimo } from "@/components/mimo/Mimo";
import type { CharacterAppearance, EquippedSlots } from "@/lib/types";

export function OverviewMimo({
  character,
  name,
  balance,
  badges,
}: {
  character: { name: string; appearance: CharacterAppearance; equipped: EquippedSlots } | null;
  name: string;
  balance: number;
  badges: number;
}) {
  return (
    <section className="cg-card flex flex-col items-center gap-2 p-5 text-center">
      <Mimo appearance={character?.appearance} equipped={character?.equipped} size={150} animated={false} label={character?.name ?? "Mimo"} />
      {character ? (
        <>
          <p className="text-lg font-extrabold">
            {name}&apos;s friend, {character.name}
          </p>
          <p className="text-sm text-ink-soft">
            🪙 {balance} Memory Coins · 🏅 {badges} badges
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-soft">{name} will meet and name their garden friend the first time Memory Garden is opened.</p>
      )}
    </section>
  );
}
