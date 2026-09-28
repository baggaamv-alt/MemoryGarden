"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GardenItemIcon, GARDEN_ART } from "@/components/garden/art";
import { Mimo } from "@/components/mimo/Mimo";
import { ChallengeOffer } from "@/components/play/ChallengeOffer";
import { Petals } from "@/components/play/Chrome";
import { usePlay } from "@/components/play/PlayProvider";
import { Coin } from "@/components/ui/icons";
import type { TextKey } from "@/lib/i18n";
import type { RewardSummary, SessionView } from "@/lib/game/types";

/** Every visit is celebrated; coins reward taking part, never perfect recall. */
export function RewardScreen({ summary, session, onAgain }: { summary: RewardSummary; session: SessionView; onAgain: () => void }) {
  const { t, setBalance, sound, say, calm, character } = usePlay();
  const [shown, setShown] = useState(calm ? summary.totalCoins : 0);
  const [offer, setOffer] = useState(summary.challengeOffer);
  const skipped = summary.status === "skipped";

  useEffect(() => {
    setBalance(summary.balance);
    if (summary.totalCoins > 0) sound("celebrate");
    say(skipped ? t("mimo.skipped") : `${t("reward.title")} ${t("reward.coins", { n: summary.totalCoins })}`);
    if (calm || summary.totalCoins === 0) return;
    let n = 0;
    const step = Math.max(1, Math.round(summary.totalCoins / 24));
    const id = window.setInterval(() => {
      n = Math.min(summary.totalCoins, n + step);
      setShown(n);
      if (n >= summary.totalCoins) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-8">
      {!skipped && <Petals />}
      <div className="flex flex-col items-center gap-2 text-center">
        <Mimo appearance={character?.appearance} equipped={character?.equipped} expression={skipped ? "happy" : "celebrate"} size={200} animated={!calm} />
        <h1 className="text-4xl font-extrabold">{skipped ? t("mimo.skipped") : t("reward.title")}</h1>
        <p className="text-xl text-ink-soft">{session.title}</p>
      </div>

      <section className="card flex flex-col items-center gap-3 p-6 text-center" aria-live="polite">
        {summary.totalCoins > 0 ? (
          <>
            <p className="flex items-center gap-3 text-5xl font-display font-extrabold text-gold-deep">
              <Coin size={52} /> +{shown}
            </p>
            <p className="text-2xl font-display font-bold">{t("reward.coins", { n: summary.totalCoins })}</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {summary.coins.map((c, i) => (
                <li key={i} className="pill text-base">
                  +{c.amount} {t(`reward.reason.${c.reason}` as TextKey)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xl">{t("reward.skippedNoCoins")}</p>
        )}
        <p className="text-lg text-ink-soft">{t("reward.balance", { n: summary.balance })}</p>
      </section>

      {(summary.badges.length > 0 || summary.garden.length > 0 || summary.stamp || summary.worldsOpened.length > 0 || summary.levelsOpened.length > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {summary.badges.map((b) => (
            <div key={b.id} className="card flex items-center gap-4 p-4 animate-pop">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-4xl">{b.icon}</span>
              <div>
                <p className="text-sm font-bold uppercase text-ink-soft">{t("reward.badge")}</p>
                <p className="text-xl font-display font-bold">{b.name}</p>
              </div>
            </div>
          ))}
          {summary.garden.map((g) => (
            <div key={g.id} className="card flex items-center gap-4 p-4 animate-pop">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-sage/60">
                {GARDEN_ART[g.id] ? <GardenItemIcon id={g.id} size={60} /> : <span className="text-4xl">🌸</span>}
              </span>
              <div>
                <p className="text-sm font-bold uppercase text-ink-soft">{t("reward.garden")}</p>
                <p className="text-xl font-display font-bold">{g.name}</p>
              </div>
            </div>
          ))}
          {summary.stamp && (
            <div className="card flex items-center gap-4 p-4 animate-pop">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-peach-deep bg-peach text-3xl">📮</span>
              <div>
                <p className="text-sm font-bold uppercase text-ink-soft">{t("reward.stamp")}</p>
                <p className="text-xl font-display font-bold">{summary.stamp.title}</p>
              </div>
            </div>
          )}
          {summary.worldsOpened.map((w) => (
            <div key={w.id} className="card flex items-center gap-4 p-4 animate-pop">
              <span className="text-5xl">🗺️</span>
              <p className="text-xl font-display font-bold">{t("reward.worldOpened", { world: w.name })}</p>
            </div>
          ))}
          {summary.levelsOpened.length > 0 && summary.worldsOpened.length === 0 && (
            <div className="card flex items-center gap-4 p-4 animate-pop">
              <span className="text-5xl">✨</span>
              <p className="text-xl font-display font-bold">{t("reward.levelOpened")}</p>
            </div>
          )}
        </section>
      )}

      {offer && <ChallengeOffer offer={offer} onDone={() => setOffer(null)} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <button className="btn btn-lg btn-sage" onClick={onAgain}>
          {t("common.playAgain")}
        </button>
        <Link href="/play/map" className="btn btn-lg btn-sky">
          {t("common.backToMap")}
        </Link>
        <Link href="/play" className="btn btn-lg">
          {t("common.goHome")}
        </Link>
      </div>
    </main>
  );
}
