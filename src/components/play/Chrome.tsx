"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Mimo, type Expression } from "@/components/mimo/Mimo";
import { BackIcon, Coin, GearIcon, HomeIcon, SpeakerIcon } from "@/components/ui/icons";
import { usePlay } from "./PlayProvider";

/** Patient top bar: always a clear way home, the coin purse, and comfort settings. */
export function TopBar({ title, back = "/play", backLabel, right }: { title?: string; back?: string | null; backLabel?: string; right?: ReactNode }) {
  const { t, balance } = usePlay();
  return (
    <header className="sticky top-0 z-30 border-b-2 border-line/70 bg-cream/92 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2.5 sm:px-5">
        {back !== null && (
          <Link href={back} className="btn btn-sm !min-h-[3.25rem] !px-3 sm:!px-4" aria-label={backLabel ?? (back === "/play" ? t("common.home") : t("common.back"))}>
            {back === "/play" ? <HomeIcon size={26} /> : <BackIcon size={26} />}
            <span className="hidden sm:inline">{backLabel ?? (back === "/play" ? t("common.home") : t("common.back"))}</span>
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-extrabold sm:text-2xl">{title}</h1>
        {right}
        <Link href="/play/shop" className="pill !py-2 text-lg" aria-label={`${balance} ${t("common.coins")}`}>
          <Coin size={26} />
          <span className="tabular-nums">{balance}</span>
        </Link>
        <Link href="/play/comfort" className="btn btn-sm !min-h-[3.25rem] !px-3" aria-label={t("home.comfort")}>
          <GearIcon size={24} />
        </Link>
      </div>
    </header>
  );
}

export function SpeakButton({ text, lang, className = "", label }: { text: string; lang?: string; className?: string; label?: string }) {
  const { say, t, voice, canSpeak } = usePlay();
  if (!voice.enabled || !canSpeak(lang)) return null;
  return (
    <button
      type="button"
      className={`btn btn-sm btn-sky !min-h-[3rem] !px-3 ${className}`}
      onClick={() => say(text, { lang, force: true })}
      aria-label={label ?? t("common.listen")}
    >
      <SpeakerIcon size={24} />
    </button>
  );
}

/** Mimo with a speech bubble. Reads new lines aloud when "read automatically" is on. */
export function MimoSays({
  text,
  expression = "happy",
  size = 120,
  autoRead = true,
  lang,
  children,
  className = "",
}: {
  text: string;
  expression?: Expression;
  size?: number;
  autoRead?: boolean;
  lang?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { character, say, calm, mimoName } = usePlay();
  const spoken = useRef<string | null>(null);
  useEffect(() => {
    if (!autoRead || !text || spoken.current === text) return;
    spoken.current = text;
    const id = window.setTimeout(() => say(text, { lang }), 350);
    return () => window.clearTimeout(id);
  }, [text, autoRead, say, lang]);
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      {size > 0 && (
        <div className="shrink-0" style={{ width: `min(${size}px, 28vw)` }}>
          <Mimo appearance={character?.appearance} equipped={character?.equipped} expression={expression} size={size} animated={!calm} label={mimoName} className="h-auto w-full" />
        </div>
      )}
      <div className={`bubble min-w-0 flex-1 animate-rise ${size > 0 ? "mb-4" : ""}`}>
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 break-words text-xl font-display font-semibold leading-snug sm:text-2xl" aria-live="polite">
            {text}
          </p>
          <SpeakButton text={text} lang={lang} />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Soft falling petals for celebrations (never flashing; hidden in calm mode). */
export function Petals({ count = 14 }: { count?: number }) {
  const colors = ["#F7A8B8", "#F6CF6E", "#C7B5F2", "#A9D4A1", "#9FD0F0"];
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${(i * 97) % 100}%`,
            animationDuration: `${5 + ((i * 37) % 40) / 10}s`,
            animationDelay: `${((i * 53) % 25) / 10}s`,
          }}
        >
          <svg width="18" height="14" viewBox="0 0 18 14">
            <ellipse cx="9" cy="7" rx="8" ry="5" fill={colors[i % colors.length]} />
          </svg>
        </span>
      ))}
    </div>
  );
}
