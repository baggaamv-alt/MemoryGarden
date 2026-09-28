"use client";

import Link from "next/link";
import { useState } from "react";
import type { homeState } from "@/lib/services/play";
import { CheckIcon, LockIcon } from "@/components/ui/icons";
import { ChallengeOffer } from "./ChallengeOffer";
import { MimoSays, TopBar } from "./Chrome";
import { usePlay } from "./PlayProvider";

type State = Awaited<ReturnType<typeof homeState>>;

export function HomeView({ state }: { state: State }) {
  const { t, mimoName } = usePlay();
  const [offer, setOffer] = useState(state.offer);
  const tasks = state.daily?.tasks ?? [];
  const done = tasks.filter((x) => x.done).length;

  const tiles = [
    { href: "/play/garden", icon: "🌷", label: t("home.garden"), hint: t("home.gardenHint"), tone: "btn-sage" },
    { href: "/play/shop", icon: "🎀", label: t("home.shop", { mimo: mimoName }), hint: t("home.shopHint", { mimo: mimoName }), tone: "btn-peach" },
    { href: "/play/album", icon: "📔", label: t("home.album"), hint: t("home.albumHint"), tone: "btn-lavender" },
    { href: "/play/journey", icon: "🧭", label: t("home.journey"), hint: t("home.journeyHint"), tone: "btn-sky" },
  ];

  return (
    <div className="pb-16">
      <TopBar title="Memory Garden" back={null} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-5 sm:px-6">
        <MimoSays text={state.greeting} expression={state.returning ? "wave" : "happy"} size={150} />

        {offer && <ChallengeOffer offer={offer} onDone={() => setOffer(null)} />}

        {state.resume && (
          <Link href={`/play/session/${state.resume.id}`} className="btn btn-lg btn-gold w-full justify-between animate-rise">
            <span>▶ {t("home.continueLevel", { level: state.resume.title })}</span>
          </Link>
        )}

        <Link href="/play/map" className="group relative block overflow-hidden rounded-[2rem] border-2 border-[#5d9656] shadow-[0_7px_0_#5d9656] transition active:translate-y-1 active:shadow-[0_2px_0_#5d9656]">
          <MapPreview />
          <div className="flex flex-col gap-3 bg-sage-deep p-4 text-white sm:absolute sm:inset-x-0 sm:bottom-0 sm:flex-row sm:items-end sm:justify-between sm:bg-transparent sm:bg-gradient-to-t sm:from-[#1f3a1c]/75 sm:to-transparent sm:p-5 sm:pt-16">
            <div>
              <p className="text-3xl font-display font-extrabold drop-shadow sm:text-4xl">{t("home.map")}</p>
              <p className="text-lg font-semibold drop-shadow">{t("home.mapHint")}</p>
            </div>
            <span className="btn btn-lg btn-sage w-full shrink-0 sm:w-auto">{t("common.letsGo")}</span>
          </div>
        </Link>

        {state.daily && (
          <section className="card p-5 sm:p-6" aria-labelledby="today-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="today-title" className="text-2xl font-extrabold">
                ☀️ {t("home.today")}
              </h2>
              <span className="pill text-base">
                {done}/{tasks.length}
              </span>
            </div>
            {state.daily.completed ? (
              <p className="text-xl font-display font-bold text-sage-deep">{t("home.todayDone")}</p>
            ) : (
              <p className="mb-3 text-lg text-ink-soft">
                {t("mimo.anyOrder")} {t("home.todayBonus")}
              </p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={task.href}
                    className={`option !min-h-[4rem] ${task.done ? "!border-sage-deep !bg-[#eef8ea]" : ""}`}
                    aria-label={`${task.text}${task.done ? " ✓" : ""}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${task.done ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-cream"}`}
                    >
                      {task.done ? <CheckIcon size={22} /> : <span className="text-lg">✿</span>}
                    </span>
                    <span className="flex-1">{task.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="grid grid-cols-2 gap-4" aria-label={t("common.home")}>
          {tiles.map((x) => (
            <Link key={x.href} href={x.href} className={`btn ${x.tone} !flex-col !items-start !justify-start !gap-1 !rounded-[1.75rem] !p-5 text-left`}>
              <span className="text-4xl" aria-hidden="true">
                {x.icon}
              </span>
              <span className="text-xl sm:text-2xl">{x.label}</span>
              <span className="text-base font-semibold opacity-80">{x.hint}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-4 flex justify-center">
          <Link href="/unlock" className="btn btn-sm btn-ghost text-ink-soft" aria-label={t("home.caregiver")}>
            <LockIcon size={20} /> {t("home.caregiver")}
          </Link>
        </div>
      </main>
    </div>
  );
}

/** A small painted preview of the winding map path. */
function MapPreview() {
  return (
    <svg viewBox="0 0 800 300" className="block h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mpSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CDE7F7" />
          <stop offset="1" stopColor="#FFF4DE" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#mpSky)" />
      <path d="M0 170 Q160 120 320 160 Q520 110 800 150 L800 300 L0 300 Z" fill="#B7D8AC" />
      <path d="M0 210 Q200 180 420 205 Q620 180 800 200 L800 300 L0 300 Z" fill="#CFE5C7" />
      <path d="M40 270 C160 250 150 190 280 196 S430 250 520 200 S680 150 760 176" stroke="#F3D9B1" strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d="M40 270 C160 250 150 190 280 196 S430 250 520 200 S680 150 760 176" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="2 16" strokeLinecap="round" />
      {[
        [70, 262, "#8CC084"],
        [200, 214, "#FFB48D"],
        [330, 208, "#C7B5F2"],
        [470, 222, "#F6CF6E"],
        [600, 176, "#9FD0F0"],
        [735, 172, "#F7A79C"],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x as number} cy={(y as number) + 5} r="22" fill="rgba(0,0,0,0.12)" />
          <circle cx={x as number} cy={y as number} r="22" fill={c as string} stroke="#fff" strokeWidth="4" />
          <text x={x as number} y={(y as number) + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b3355">
            {i + 1}
          </text>
        </g>
      ))}
      <text x="90" y="120" fontSize="44">🌷</text>
      <text x="360" y="110" fontSize="40">🏡</text>
      <text x="560" y="96" fontSize="40">🪔</text>
      <text x="700" y="80" fontSize="40">🦋</text>
    </svg>
  );
}
