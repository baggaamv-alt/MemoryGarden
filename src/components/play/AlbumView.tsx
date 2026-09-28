"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { CloudImage } from "@/components/ui/CloudImage";
import { HeartIcon } from "@/components/ui/icons";
import { api, errorText } from "@/lib/client/api";
import type { albumState } from "@/lib/services/play";
import type { Img } from "@/lib/types";
import { MimoSays, SpeakButton, TopBar } from "./Chrome";
import { usePlay, type Effects } from "./PlayProvider";

type State = Awaited<ReturnType<typeof albumState>>;
type Tab = "stamps" | "badges" | "favorites" | "explore";

type Opened = { id: string; title: string; caption: string | null; year: number | null; location: string | null; language: string; favorite: boolean; image: Img };

export function AlbumView({ state, initialTab }: { state: State; initialTab: Tab }) {
  const { t, showEffects, sound } = usePlay();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [favorites, setFavorites] = useState(state.favorites);
  const [category, setCategory] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; title: string; thumb: Img; favorite: boolean }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stampsEarned = state.stamps.reduce((n, w) => n + w.levels.filter((l) => l.earned).length, 0);
  const stampsTotal = state.stamps.reduce((n, w) => n + w.levels.length, 0);

  async function explore(cat: string) {
    setCategory(cat);
    setFound(null);
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: { id: string; title: string; thumb: Img; favorite: boolean }[] }>(`/api/play/album?category=${encodeURIComponent(cat)}`);
      setFound(res.items);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  async function open(id: string) {
    sound("tap");
    setError(null);
    try {
      const res = await api<{ memory: Opened; effects: Effects }>(`/api/play/memories/${id}`);
      setOpened(res.memory);
      showEffects(res.effects);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function toggleFavorite(m: Opened) {
    const favorite = !m.favorite;
    const res = await api<{ favorite: boolean; effects: Effects }>(`/api/play/memories/${m.id}`, { body: { favorite } });
    setOpened({ ...m, favorite: res.favorite });
    showEffects(res.effects);
    sound(favorite ? "chime" : "tap");
    setFavorites((list) =>
      favorite ? (list.some((f) => f.id === m.id) ? list : [{ id: m.id, title: m.title, thumb: m.image }, ...list]) : list.filter((f) => f.id !== m.id),
    );
    setFound((list) => list?.map((f) => (f.id === m.id ? { ...f, favorite } : f)) ?? null);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "stamps", label: t("album.stamps"), icon: "📮" },
    { id: "badges", label: t("album.badges"), icon: "🏅" },
    { id: "favorites", label: t("album.favorites"), icon: "💖" },
    { id: "explore", label: t("album.explore"), icon: "🔍" },
  ];

  return (
    <div className="pb-16">
      <TopBar title={t("album.title")} />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-3 pt-4 sm:px-5">
        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("album.title")}>
          {tabs.map((x) => (
            <button key={x.id} className={`btn ${tab === x.id ? "btn-lavender" : ""}`} aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
              <span aria-hidden="true">{x.icon}</span> {x.label}
            </button>
          ))}
        </nav>
        {error && <p className="rounded-2xl bg-coral/40 p-4 text-lg">{error}</p>}

        {tab === "stamps" && (
          <section className="flex flex-col gap-4">
            <p className="text-xl font-display font-bold">{t("album.stampsCount", { n: stampsEarned, total: stampsTotal })}</p>
            {state.stamps.map((w) => (
              <div key={w.worldId} className="card p-4">
                <h2 className="mb-3 text-xl font-extrabold">
                  {w.icon} {w.worldName}
                </h2>
                <ul className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {w.levels.map((l) => (
                    <li
                      key={l.id}
                      title={l.title}
                      className={`flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-[3px] border-dashed text-center ${l.earned ? "bg-white shadow-soft" : "border-line bg-cream-deep/40 opacity-50"}`}
                      style={l.earned ? { borderColor: w.accent } : undefined}
                    >
                      <span className="text-2xl sm:text-3xl" aria-hidden="true">
                        {l.earned ? l.icon : "·"}
                      </span>
                      <span className="sr-only">{`${l.title}${l.earned ? " ✓" : ""}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {tab === "badges" && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.badges.map((b) => (
              <li key={b.id} className={`card flex items-center gap-4 p-4 ${b.earnedAt ? "" : "opacity-50 grayscale"}`}>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl" style={{ background: b.earnedAt ? b.color : "#EFE8DA" }}>
                  {b.icon}
                </span>
                <div>
                  <p className="text-xl font-display font-bold">{b.name}</p>
                  <p className="text-base text-ink-soft">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "favorites" &&
          (favorites.length === 0 ? (
            <MimoSays text={t("album.noFavorites")} expression="happy" size={100} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {favorites.map((f) => (
                <li key={f.id}>
                  <button className="option !flex-col !items-stretch !gap-2 !p-2" onClick={() => open(f.id)}>
                    <CloudImage image={f.thumb} className="aspect-square w-full rounded-[1rem]" alt={f.title} />
                    <span className="text-center text-lg">💖 {f.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {tab === "explore" && (
          <section className="flex flex-col gap-4">
            {state.categories.length === 0 ? (
              <MimoSays text={t("album.noMemories")} expression="comfort" size={100} />
            ) : (
              <>
                <MimoSays text={t("album.chooseCategory")} expression="curious" size={90} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {state.categories.map((c) => (
                    <button key={c.id} className={`option !flex-col !justify-center ${category === c.id ? "!border-sky-deep" : ""}`} onClick={() => explore(c.id)}>
                      <span className="text-5xl" aria-hidden="true">
                        {c.icon}
                      </span>
                      <span>{c.label}</span>
                      <span className="text-sm text-ink-soft">{t("album.found", { n: c.count })}</span>
                    </button>
                  ))}
                </div>
                {loading && <p className="text-xl font-display">{t("common.loading")}</p>}
                {found && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {found.map((f) => (
                      <li key={f.id}>
                        <button className="option !flex-col !items-stretch !gap-2 !p-2" onClick={() => open(f.id)}>
                          <CloudImage image={f.thumb} className="aspect-square w-full rounded-[1rem]" alt={f.title} />
                          <span className="text-center text-lg">
                            {f.favorite ? "💖 " : ""}
                            {f.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <Dialog open={!!opened} onClose={() => setOpened(null)} wide>
        {opened && (
          <div className="flex flex-col gap-4">
            <CloudImage image={opened.image} priority fit="contain" className="max-h-[60dvh] w-full rounded-2xl bg-cream-deep" />
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold" lang={opened.language}>
                  {opened.title}
                </h2>
                {opened.caption && (
                  <p className="text-xl" lang={opened.language}>
                    {opened.caption}
                  </p>
                )}
                <p className="text-lg text-ink-soft">{[opened.year, opened.location].filter(Boolean).join(" · ")}</p>
              </div>
              <SpeakButton text={[opened.title, opened.caption].filter(Boolean).join(". ")} lang={opened.language} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className={`btn btn-lg flex-1 ${opened.favorite ? "btn-coral" : ""}`} onClick={() => toggleFavorite(opened)} aria-pressed={opened.favorite}>
                <HeartIcon filled={opened.favorite} size={26} /> {opened.favorite ? t("game.favorited") : t("game.favorite")}
              </button>
              <button className="btn btn-lg flex-1" onClick={() => setOpened(null)}>
                {t("common.close")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
