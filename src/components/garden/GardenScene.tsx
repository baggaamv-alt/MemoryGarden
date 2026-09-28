"use client";

import { Mimo } from "@/components/mimo/Mimo";
import type { CharacterAppearance, EquippedSlots } from "@/lib/types";
import { Butterflies, DailyFlower, GARDEN_ART } from "./art";

type Props = {
  grown: string[];
  placed: string[];
  character?: { name: string; appearance: CharacterAppearance; equipped: EquippedSlots } | null;
  highlight?: string[];
  label?: string;
  showMimo?: boolean;
};

/** The patient's garden: everything here grew from taking part or was chosen in the shop. */
export function GardenScene({ grown, placed, character, highlight = [], label = "My garden", showMimo = true }: Props) {
  const ids = [...new Set([...grown.filter((g) => !g.startsWith("daily-flower") && g !== "butterflies"), ...placed])].filter(
    (id) => GARDEN_ART[id],
  );
  ids.sort((a, b) => GARDEN_ART[a].z - GARDEN_ART[b].z);
  const dailyCount = grown.filter((g) => g.startsWith("daily-flower")).length;
  const glow = new Set(highlight);

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border-2 border-line shadow-soft" style={{ aspectRatio: "800 / 480" }}>
      <svg viewBox="0 0 800 480" className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CDE7F7" />
            <stop offset="70%" stopColor="#FFF4DE" />
          </linearGradient>
          <linearGradient id="gground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFE5C7" />
            <stop offset="100%" stopColor="#A9D4A1" />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="newGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#F6CF6E" floodOpacity="0.9" />
          </filter>
        </defs>
        <rect width="800" height="480" fill="url(#gsky)" />
        {!grown.includes("keep-sun") && <circle cx="690" cy="84" r="30" fill="#FBE29B" opacity="0.9" />}
        <ellipse cx="170" cy="96" rx="60" ry="18" fill="#fff" opacity="0.75" />
        <ellipse cx="560" cy="132" rx="72" ry="20" fill="#fff" opacity="0.6" />
        <path d="M0 300 Q140 236 300 290 Q470 230 620 284 Q720 250 800 276 L800 480 L0 480 Z" fill="#B7D8AC" />
        <path d="M0 330 Q200 300 400 322 Q600 300 800 318 L800 480 L0 480 Z" fill="url(#gground)" />
        <path d="M360 480 Q380 420 420 380 Q450 350 440 322 L470 322 Q490 360 460 396 Q430 440 460 480 Z" fill="#F3D9B1" opacity="0.85" />
        {ids.map((id) => (
          <g key={id} filter={glow.has(id) ? "url(#newGlow)" : undefined}>
            {GARDEN_ART[id].render()}
          </g>
        ))}
        {Array.from({ length: Math.min(7, dailyCount) }).map((_, i) => (
          <DailyFlower key={i} i={i} />
        ))}
        {grown.includes("butterflies") && <Butterflies />}
      </svg>
      {showMimo && character && (
        <div className="pointer-events-none absolute bottom-[3%] left-1/2 w-[24%] -translate-x-1/2">
          <Mimo appearance={character.appearance} equipped={character.equipped} size={200} className="h-auto w-full" label={character.name} />
        </div>
      )}
    </div>
  );
}
