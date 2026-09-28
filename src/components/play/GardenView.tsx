"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GardenItemIcon, GARDEN_ART } from "@/components/garden/art";
import { GardenScene } from "@/components/garden/GardenScene";
import { api } from "@/lib/client/api";
import type { gardenView } from "@/lib/services/play";
import { MimoSays, TopBar } from "./Chrome";
import { usePlay, type Effects } from "./PlayProvider";

type State = Awaited<ReturnType<typeof gardenView>>;

export function GardenView({ state }: { state: State }) {
  const { t, showEffects, character, sound } = usePlay();
  const [placed, setPlaced] = useState(state.placed);
  const [busy, setBusy] = useState<string | null>(null);
  const [recent] = useState(() => {
    const now = Date.now();
    return state.grown.filter((g) => now - new Date(g.at).getTime() < 1000 * 60 * 60 * 24).map((g) => g.id);
  });

  useEffect(() => {
    void api<{ effects: Effects }>("/api/play/garden", { body: { action: "visit" } })
      .then((r) => showEffects(r.effects))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(id: string, place: boolean) {
    setBusy(id);
    sound("tap");
    try {
      const res = await api<{ placed: string[]; effects: Effects }>("/api/play/garden", { body: { action: "place", itemId: id, placed: place } });
      setPlaced(res.placed);
      showEffects(res.effects);
    } finally {
      setBusy(null);
    }
  }

  const grownIds = state.grown.map((g) => g.id);
  const text =
    state.grown.length === 0
      ? t("garden.empty")
      : state.nextIn
        ? state.nextIn === 1 ? t("garden.nextOne") : t("garden.next", { n: state.nextIn })
        : t("mimo.proud");

  return (
    <div className="pb-16">
      <TopBar title={t("garden.title")} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-3 pt-4 sm:px-5">
        <GardenScene grown={grownIds} placed={placed} character={character ?? state.character} highlight={recent} label={t("garden.title")} />
        <MimoSays text={text} expression="happy" size={100} />

        {state.grown.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 text-2xl font-extrabold">🌱 {t("journey.gardenCount", { n: state.grown.length })}</h2>
            <ul className="flex flex-wrap gap-2">
              {state.grown.map((g) => (
                <li key={g.id} className="pill text-base">
                  {g.name || "✿"}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold">🪴 {t("garden.decorate")}</h2>
            <Link href="/play/shop?category=garden" className="btn btn-sm btn-peach">
              🎀 {t("home.shop", { mimo: character?.name ?? "Mimo" })}
            </Link>
          </div>
          {state.ownedDecorations.length === 0 ? (
            <p className="text-lg text-ink-soft">{t("shop.emptyCollection")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {state.ownedDecorations.map((d) => {
                const on = placed.includes(d.id);
                return (
                  <li key={d.id} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-line bg-white p-3 text-center">
                    {GARDEN_ART[d.id] && <GardenItemIcon id={d.id} size={84} />}
                    <span className="font-display text-lg font-bold">{d.name}</span>
                    <button className={`btn btn-sm w-full ${on ? "" : "btn-sage"}`} disabled={busy === d.id} onClick={() => toggle(d.id, !on)}>
                      {on ? t("shop.unplace") : t("shop.place")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
