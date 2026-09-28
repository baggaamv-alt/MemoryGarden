"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mimo } from "@/components/mimo/Mimo";
import { Dialog } from "@/components/ui/Dialog";
import { CheckIcon, Coin, LockIcon, ReplayIcon } from "@/components/ui/icons";
import { api, errorText } from "@/lib/client/api";
import type { LevelView, WorldView } from "@/lib/game/progress";
import type { SessionView } from "@/lib/game/types";
import { MimoSays, TopBar } from "./Chrome";
import { usePlay, type Effects } from "./PlayProvider";

const SCENERY: Record<string, string[]> = {
  garden: ["🌷", "🌼", "🪴", "🌸", "🐝", "🌿"],
  village: ["🏡", "🌳", "🐓", "🏠", "🌻", "🛖"],
  festival: ["🪔", "🏮", "🎊", "🪁", "🍬", "🎶"],
  meadow: ["🦋", "🌾", "🐄", "🌳", "🐦", "🌼"],
  golden: ["🌅", "📷", "🕰️", "📜", "🌻", "🎞️"],
  trail: ["🍃", "✨", "🌙", "🌿", "🪷", "⭐"],
};

const NODE_GAP = 142;

function nodeX(i: number) {
  return 50 + 27 * Math.sin(i * 0.95 + 0.4);
}

export function MapView({ worlds, focusWorld, focusLevel }: { worlds: WorldView[]; focusWorld: string | null; focusLevel: string | null }) {
  const { t, character, calm } = usePlay();
  const [selected, setSelected] = useState<{ world: WorldView; level: LevelView } | null>(() => {
    if (!focusLevel) return null;
    for (const world of worlds) {
      const level = world.levels.find((x) => x.id === focusLevel);
      if (level) return { world, level };
    }
    return null;
  });
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const { showEffects } = usePlay();

  // "You are here": the first open place in the most recently opened world.
  const here = useMemo(() => {
    for (let w = worlds.length - 1; w >= 0; w--) {
      const world = worlds[w];
      if (!world.unlocked) continue;
      const level = world.levels.find((l) => l.status === "available");
      if (level) return level.id;
    }
    return null;
  }, [worlds]);

  useEffect(() => {
    const target = focusLevel ?? (focusWorld ? `world-${focusWorld}` : here);
    const el = target ? refs.current[target] : null;
    if (el) el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    if (focusWorld && worlds.find((w) => w.id === focusWorld)?.unlocked) {
      void api<{ effects: Effects }>("/api/play/map", { body: { worldId: focusWorld } })
        .then((r) => showEffects(r.effects))
        .catch(() => undefined);
    }
    // Only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pb-24">
      <TopBar title={t("map.title")} />
      <main className="mx-auto max-w-3xl px-3 pt-4 sm:px-5">
        {worlds.map((world) => (
          <WorldSection
            key={world.id}
            world={world}
            here={here}
            register={(id, el) => (refs.current[id] = el)}
            onPick={(level) => setSelected({ world, level })}
            characterNode={character ? <Mimo appearance={character.appearance} equipped={character.equipped} size={92} animated={!calm} label={character.name} /> : null}
          />
        ))}
      </main>
      {selected && <LevelSheet world={selected.world} level={selected.level} onClose={() => setSelected(null)} />}
    </div>
  );
}

function WorldSection({
  world,
  here,
  register,
  onPick,
  characterNode,
}: {
  world: WorldView;
  here: string | null;
  register: (id: string, el: HTMLElement | null) => void;
  onPick: (l: LevelView) => void;
  characterNode: React.ReactNode;
}) {
  const { t } = usePlay();
  const height = world.levels.length * NODE_GAP + 60;
  const points = world.levels.map((_, i) => [nodeX(i), i * NODE_GAP + 70] as const);
  const path = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `S ${(points[i - 1][0] + x) / 2} ${y - NODE_GAP / 2} ${x} ${y}`)).join(" ");
  const scenery = SCENERY[world.theme.scenery] ?? SCENERY.trail;

  return (
    <section
      ref={(el) => register(`world-${world.id}`, el)}
      aria-labelledby={`w-${world.id}`}
      className="relative mb-8 overflow-hidden rounded-[2.25rem] border-2 border-line shadow-soft"
      style={{ background: `linear-gradient(180deg, ${world.theme.sky} 0%, ${world.theme.ground} 100%)` }}
    >
      <div className="relative z-10 flex items-center gap-4 border-b-2 border-white/60 bg-white/55 px-5 py-4 backdrop-blur-sm">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-soft" style={{ background: world.theme.path }} aria-hidden="true">
          {world.theme.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`w-${world.id}`} className="text-2xl font-extrabold leading-tight sm:text-3xl">
            {world.name}
          </h2>
          <p className="text-base text-ink-soft sm:text-lg">{world.description}</p>
        </div>
        {world.unlocked && (
          <span className="pill shrink-0 text-base" aria-label={`${world.completed} / ${world.total}`}>
            🌸 {world.completed}/{world.total}
          </span>
        )}
      </div>

      <div className="relative" style={{ height }}>
        {scenery.map((e, i) => (
          <span
            key={i}
            className="pointer-events-none absolute select-none text-4xl opacity-70"
            style={{ top: 40 + ((i * 197) % (height - 120)), left: i % 2 ? "4%" : "86%" }}
            aria-hidden="true"
          >
            {e}
          </span>
        ))}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path} fill="none" stroke={world.theme.path} strokeWidth="26" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={path} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="1 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <ol className="relative">
          {world.levels.map((level, i) => (
            <li key={level.id} className="absolute" style={{ top: points[i][1] - 44, left: `${points[i][0]}%`, transform: "translateX(-50%)" }}>
              <LevelNode level={level} accent={world.theme.accent} onPick={() => onPick(level)} register={(el) => register(level.id, el)} />
              {here === level.id && (
                <div className="pointer-events-none absolute top-8 left-[108%] w-[84px]" aria-label={t("map.youAreHere")}>
                  {characterNode}
                </div>
              )}
            </li>
          ))}
        </ol>

        {!world.unlocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start gap-4 bg-white/55 px-6 pt-24 text-center backdrop-blur-[3px]">
            <span className="text-7xl" aria-hidden="true">
              ☁️
            </span>
            <p className="max-w-sm text-2xl font-display font-extrabold">
              <LockIcon size={26} className="mr-2 inline" />
              {world.remainingToUnlock === 1 ? t("map.worldLockedOne") : t("map.worldLocked", { n: world.remainingToUnlock })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function LevelNode({ level, accent, onPick, register }: { level: LevelView; accent: string; onPick: () => void; register: (el: HTMLButtonElement | null) => void }) {
  const { t } = usePlay();
  const state = level.status;
  const style: React.CSSProperties =
    state === "available"
      ? ({ background: "#fff", borderColor: accent, color: "#3b3355", ["--node-edge" as string]: accent } as React.CSSProperties)
      : state === "completed"
        ? { background: "#8CC084", borderColor: "#5D9656", color: "#13301a", boxShadow: "0 6px 0 #5D9656" }
        : state === "revisit"
          ? { background: "#F6CF6E", borderColor: "#C99A2E", color: "#3f2b02", boxShadow: "0 6px 0 #C99A2E" }
          : { background: "#EFE8DA", borderColor: "#D6CBB6", color: "#8a82a0", boxShadow: "0 6px 0 #D6CBB6" };
  return (
    <button
      ref={register}
      onClick={onPick}
      className={`relative flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full border-4 transition active:translate-y-1 ${state === "available" ? "animate-glow" : ""}`}
      style={style}
      aria-label={`${level.title} — ${t(`map.state.${state}`)}`}
    >
      <span className="text-3xl leading-none" aria-hidden="true">
        {state === "locked" ? "🔒" : state === "growing" ? "🌱" : level.icon}
      </span>
      <span className="mt-0.5 text-sm font-display font-extrabold">{level.index}</span>
      {state === "completed" && (
        <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sage-deep text-white">
          <CheckIcon size={18} />
        </span>
      )}
      {state === "revisit" && (
        <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gold-deep text-white">
          <ReplayIcon size={16} />
        </span>
      )}
      <span className="absolute left-1/2 top-full mt-2 w-36 -translate-x-1/2 rounded-xl bg-white/85 px-2 py-0.5 text-center text-sm font-display font-bold leading-tight text-ink shadow-sm">
        {level.title}
      </span>
    </button>
  );
}

function LevelSheet({ world, level, onClose }: { world: WorldView; level: LevelView; onClose: () => void }) {
  const router = useRouter();
  const { t, sound } = usePlay();
  const [together, setTogether] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playable = level.status === "available" || level.status === "completed" || level.status === "revisit";

  async function start() {
    setBusy(true);
    setError(null);
    sound("tap");
    try {
      const { session } = await api<{ session: SessionView }>("/api/play/sessions", { body: { levelId: level.id, together } });
      router.push(`/play/session/${session.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={<span className="flex items-center gap-3"><span className="text-4xl">{level.icon}</span>{level.title}</span>}>
      <div className="flex flex-col gap-5">
        <p className="-mt-2 text-lg text-ink-soft">
          {world.name} · {t("map.level", { n: level.index })}
        </p>
        {level.status === "growing" ? (
          <MimoSays text={t("map.growingText")} expression="comfort" size={100} />
        ) : level.status === "locked" ? (
          <MimoSays text={t("map.state.locked")} expression="curious" size={100} />
        ) : (
          <>
            <MimoSays text={level.intro} expression="happy" size={100} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-cream-deep/70 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{t("map.focus")}</p>
                <p className="text-xl font-display font-bold">
                  {level.gameName} · {level.focus}
                </p>
              </div>
              <div className="rounded-2xl bg-gold/60 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">{t("map.reward")}</p>
                <p className="flex items-center gap-2 text-xl font-display font-bold">
                  <Coin size={24} /> +10{level.timesCompleted === 0 ? ` +${level.firstVisitBonus}` : ""}
                </p>
              </div>
            </div>
            <label className="option cursor-pointer">
              <input type="checkbox" className="h-7 w-7 accent-[#4f8a4b]" checked={together} onChange={(e) => setTogether(e.target.checked)} />
              <span>🤝 {t("map.together")}</span>
            </label>
          </>
        )}
        {error && <p className="rounded-xl bg-coral/40 p-3 text-lg font-semibold">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          {playable && (
            <button className="btn btn-lg btn-sage flex-1" disabled={busy} onClick={start}>
              {busy ? t("common.loading") : level.status === "available" ? t("common.letsGo") : t("common.playAgain")}
            </button>
          )}
          <button className="btn btn-lg flex-1" onClick={onClose}>
            {t("common.notNow")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
