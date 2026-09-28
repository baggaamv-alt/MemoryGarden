"use client";

import Link from "next/link";
import { Coin } from "@/components/ui/icons";
import type { journeyState } from "@/lib/services/play";
import { MimoSays, TopBar } from "./Chrome";
import { usePlay } from "./PlayProvider";

type State = Awaited<ReturnType<typeof journeyState>>;

/** Patient-facing progress: places, flowers, coins and favourites — never scores or percentages. */
export function JourneyView({ state }: { state: State }) {
  const { t, mimoName } = usePlay();
  const nothing = state.levelsCompleted === 0 && state.coinsLifetime === 0;
  const tiles = [
    { icon: "🗺️", label: t("journey.worlds"), value: `${state.worldsVisited}`, href: "/play/map", tone: "bg-sky" },
    { icon: "🌸", label: t("journey.levels"), value: `${state.levelsCompleted}`, href: "/play/album?tab=stamps", tone: "bg-peach" },
    { icon: <Coin size={40} />, label: t("journey.coins"), value: `${state.coinsLifetime}`, href: "/play/shop", tone: "bg-gold" },
    { icon: "🎀", label: t("journey.items", { mimo: mimoName }), value: `${state.itemsOwned}`, href: "/play/shop?tab=collection", tone: "bg-lavender" },
    { icon: "🌱", label: t("journey.garden"), value: t("journey.gardenCount", { n: state.gardenCount }), href: "/play/garden", tone: "bg-sage" },
    { icon: "🏅", label: t("journey.badges"), value: `${state.badges}`, href: "/play/album?tab=badges", tone: "bg-coral" },
  ];
  return (
    <div className="pb-16">
      <TopBar title={t("journey.title")} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-3 pt-4 sm:px-5">
        <MimoSays text={nothing ? t("journey.nothingYet") : t("mimo.proud")} expression="happy" size={110} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((x) => (
            <li key={x.label}>
              <Link href={x.href} className={`flex h-full flex-col gap-1 rounded-[1.75rem] border-2 border-line p-5 shadow-soft ${x.tone}`}>
                <span className="text-4xl" aria-hidden="true">
                  {x.icon}
                </span>
                <span className="text-3xl font-display font-extrabold">{x.value}</span>
                <span className="text-lg font-semibold">{x.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="card p-5">
          <h2 className="mb-3 text-2xl font-extrabold">🗺️ {t("journey.worlds")}</h2>
          <ul className="flex flex-col gap-3">
            {state.worlds.map((w) => (
              <li key={w.id} className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {w.unlocked ? w.icon : "☁️"}
                </span>
                <span className="flex-1 text-lg font-display font-bold">{w.name}</span>
                <span className="flex gap-1" aria-label={`${w.completed} / ${w.total}`}>
                  {Array.from({ length: w.total }).map((_, i) => (
                    <span key={i} className={`text-lg ${i < w.completed ? "" : "opacity-20"}`} aria-hidden="true">
                      🌸
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {(state.favoriteGames.length > 0 || state.favoriteCategories.length > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {state.favoriteGames.length > 0 && (
              <div className="card p-5">
                <h2 className="mb-3 text-xl font-extrabold">{t("journey.games")}</h2>
                <ul className="flex flex-col gap-2">
                  {state.favoriteGames.map((g) => (
                    <li key={g.game} className="text-lg font-display font-bold">
                      {g.icon} {g.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {state.favoriteCategories.length > 0 && (
              <div className="card p-5">
                <h2 className="mb-3 text-xl font-extrabold">{t("journey.categories")}</h2>
                <ul className="flex flex-col gap-2">
                  {state.favoriteCategories.map((c) => (
                    <li key={c.id} className="text-lg font-display font-bold">
                      {c.icon} {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
