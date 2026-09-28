"use client";

import { useId } from "react";
import { SHOP_BY_ID, CATEGORY_SLOT } from "@/lib/content/shop";
import type { CharacterAppearance, EquippedSlots } from "@/lib/types";
import { ITEM_ART, SLOT_ORDER, type ItemLayer } from "./items";
import { mimoColor } from "./palette";

export type Expression = "happy" | "celebrate" | "curious" | "comfort" | "sleepy" | "wave";

type Props = {
  appearance?: Partial<CharacterAppearance> | null;
  equipped?: EquippedSlots | null;
  /** An item being tried on in the shop (replaces whatever is in the same slot). */
  preview?: string | null;
  expression?: Expression;
  size?: number;
  animated?: boolean;
  className?: string;
  label?: string;
};

const INK = "#3b2a4a";
const BODY = "M120 62 C170 62 196 104 196 152 C196 204 164 236 120 236 C76 236 44 204 44 152 C44 104 70 62 120 62 Z";

/**
 * Mimo, the Memory Guardian — a little garden spirit with a sprout on top. Original artwork:
 * soft shapes, big friendly eyes, and never a sad or disappointed face.
 */
export function Mimo({
  appearance,
  equipped,
  preview,
  expression = "happy",
  size = 220,
  animated = true,
  className,
  label = "Mimo",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const colors = mimoColor(appearance?.color);
  const sprout = appearance?.sprout ?? "leaf";
  const cheeks = appearance?.cheeks ?? true;

  const worn: EquippedSlots = { ...(equipped ?? {}) };
  if (preview) {
    const item = SHOP_BY_ID.get(preview);
    const slot = item ? CATEGORY_SLOT[item.category] : undefined;
    if (slot) worn[slot] = preview;
  }
  const byLayer = new Map<ItemLayer, string[]>();
  for (const id of Object.values(worn)) {
    if (!id || !ITEM_ART[id]) continue;
    const layer = ITEM_ART[id].layer;
    byLayer.set(layer, [...(byLayer.get(layer) ?? []), id]);
  }
  const hidesSprout = Object.values(worn).some((id) => id && ITEM_ART[id]?.hidesSprout);
  const anim = worn.animation;
  const layer = (l: ItemLayer) => (byLayer.get(l) ?? []).map((id) => <g key={id}>{ITEM_ART[id].render()}</g>);

  const waving = expression === "wave" || anim === "anim-wave";
  const eyesClosed = expression === "celebrate" || expression === "sleepy";

  return (
    <svg
      viewBox="-12 0 284 262"
      width={size}
      height={(size * 262) / 284}
      role="img"
      aria-label={label}
      className={className}
    >
      <defs>
        <radialGradient id={`g-${uid}`} cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={colors.body} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.shade} stopOpacity="1" />
        </radialGradient>
        <clipPath id={`c-${uid}`}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <g className={animated ? (anim === "anim-twirl" ? "mimo-twirl" : "mimo-bob") : undefined}>
        <g className={animated && anim === "anim-dance" ? "mimo-dance" : undefined}>
          <ellipse cx="120" cy="248" rx="64" ry="9" fill="rgba(80,50,30,0.14)" />
          {layer("ground")}
          <ellipse cx="96" cy="234" rx="19" ry="11" fill={colors.feet} />
          <ellipse cx="144" cy="234" rx="19" ry="11" fill={colors.feet} />
          {layer("shoes")}

          {/* sprout */}
          {!hidesSprout && (
            <g>
              <path d="M120 66 Q118 50 121 38" stroke="#5E9A5A" strokeWidth="5" fill="none" strokeLinecap="round" />
              {sprout === "leaf" && (
                <>
                  <ellipse cx="106" cy="38" rx="15" ry="8" fill="#8CC084" transform="rotate(-28 106 38)" />
                  <ellipse cx="135" cy="36" rx="15" ry="8" fill="#A9D4A1" transform="rotate(28 135 36)" />
                </>
              )}
              {sprout === "bud" && (
                <>
                  <ellipse cx="110" cy="48" rx="10" ry="5" fill="#8CC084" transform="rotate(-30 110 48)" />
                  <path d="M121 40 C108 30 112 12 121 8 C130 12 134 30 121 40 Z" fill="#F7A8B8" />
                  <path d="M121 40 C116 32 118 20 121 14" stroke="#E27D99" strokeWidth="2" fill="none" />
                </>
              )}
              {sprout === "clover" && (
                <>
                  <circle cx="113" cy="32" r="8" fill="#8CC084" />
                  <circle cx="129" cy="32" r="8" fill="#8CC084" />
                  <circle cx="121" cy="22" r="8" fill="#A9D4A1" />
                </>
              )}
            </g>
          )}

          {/* left arm */}
          <ellipse cx="46" cy="172" rx="12" ry="19" fill={colors.shade} transform="rotate(22 46 172)" />

          {/* body */}
          <path d={BODY} fill={`url(#g-${uid})`} />
          <ellipse cx="120" cy="184" rx="46" ry="40" fill={colors.belly} opacity="0.9" />
          <g clipPath={`url(#c-${uid})`}>{layer("outfit")}</g>
          {layer("scarf")}

          {/* face */}
          {cheeks && (
            <>
              <ellipse cx="76" cy="158" rx="13" ry="8" fill="#F28C9B" opacity="0.45" />
              <ellipse cx="164" cy="158" rx="13" ry="8" fill="#F28C9B" opacity="0.45" />
            </>
          )}
          {eyesClosed ? (
            <g stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round">
              <path d="M83 140 Q94 128 105 140" />
              <path d="M135 140 Q146 128 157 140" />
            </g>
          ) : (
            <g className={animated ? "mimo-blink" : undefined}>
              <ellipse cx="94" cy="136" rx="11" ry="14" fill={INK} />
              <ellipse cx="146" cy="136" rx="11" ry="14" fill={INK} />
              <circle cx="98" cy="130" r="4.2" fill="#fff" />
              <circle cx="150" cy="130" r="4.2" fill="#fff" />
              <circle cx="91" cy="141" r="2" fill="#fff" opacity="0.8" />
              <circle cx="143" cy="141" r="2" fill="#fff" opacity="0.8" />
            </g>
          )}
          {expression === "comfort" && (
            <g stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.7">
              <path d="M82 114 Q94 108 104 114" />
              <path d="M136 114 Q146 108 158 114" />
            </g>
          )}
          {expression === "celebrate" ? (
            <g>
              <path d="M104 158 Q120 184 136 158 Z" fill="#7A2E3E" />
              <path d="M111 170 Q120 178 129 170 Q120 166 111 170 Z" fill="#F28482" />
            </g>
          ) : expression === "curious" ? (
            <ellipse cx="120" cy="164" rx="6" ry="7" fill="#7A2E3E" />
          ) : (
            <path
              d={expression === "comfort" ? "M110 162 Q120 169 130 162" : "M106 159 Q120 174 134 159"}
              stroke={INK}
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
            />
          )}
          {layer("glasses")}
          {layer("hat")}

          {/* right arm (waves) + held things */}
          {layer("hand")}
          <g className={animated && waving ? "mimo-wave" : undefined}>
            <ellipse cx="194" cy="172" rx="12" ry="19" fill={colors.shade} transform="rotate(-22 194 172)" />
          </g>
          {layer("companion")}

          {animated && (anim === "anim-sparkle" || expression === "celebrate") && (
            <g fill="#F6CF6E">
              {[
                [26, 40, 0],
                [214, 30, 0.6],
                [228, 128, 1.1],
                [10, 140, 0.3],
              ].map(([x, y, d]) => (
                <path
                  key={`${x}-${y}`}
                  className="mimo-twinkle"
                  style={{ animationDelay: `${d}s` }}
                  d={`M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y} L${x + 3} ${y + 3} L${x} ${y + 10} L${x - 3} ${y + 3} L${x - 10} ${y} L${x - 3} ${y - 3} Z`}
                />
              ))}
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

export { SLOT_ORDER };
