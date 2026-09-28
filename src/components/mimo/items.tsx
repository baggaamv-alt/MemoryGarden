import type { ReactElement } from "react";

/**
 * Cosmetic items drawn in Mimo's coordinate space (viewBox 0 0 240 260).
 * Body silhouette spans x 44–196, y 62–236; eyes at (94,136)/(146,136); arms at (46,172)/(194,172);
 * feet at (96,234)/(144,234). Outfits are clipped to the body outline by the caller.
 */
export type ItemLayer = "shoes" | "outfit" | "scarf" | "glasses" | "hat" | "hand" | "companion" | "ground";

type Art = { layer: ItemLayer; hidesSprout?: boolean; render: () => ReactElement };

const INK = "#3b2a4a";

function flower(cx: number, cy: number, petal: string, center: string, r = 6, key?: string) {
  return (
    <g key={key}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={cx} cy={cy - r * 0.9} rx={r * 0.62} ry={r * 0.9} fill={petal} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.45} fill={center} />
    </g>
  );
}

export const ITEM_ART: Record<string, Art> = {
  // ── Hats ───────────────────────────────────────────────────
  "hat-straw": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <ellipse cx="120" cy="76" rx="84" ry="16" fill="#E9C46A" stroke="#C99A2E" strokeWidth="2" />
        <path d="M84 76 C84 44 156 44 156 76 Z" fill="#F4D58D" stroke="#C99A2E" strokeWidth="2" />
        <path d="M85 68 Q120 76 155 68 L156 76 Q120 84 84 76 Z" fill="#E88A5E" />
        {flower(146, 66, "#fff", "#F2B544", 6)}
      </g>
    ),
  },
  "hat-gardener": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <path d="M76 84 C74 46 166 46 164 84 Z" fill="#7FB16F" stroke="#4F8A4B" strokeWidth="2" />
        <path d="M150 80 Q196 78 204 90 Q176 94 146 88 Z" fill="#5E9A5A" stroke="#4F8A4B" strokeWidth="2" />
        <circle cx="120" cy="50" r="5" fill="#4F8A4B" />
        <path d="M100 58 q6 -8 12 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.5" />
      </g>
    ),
  },
  "hat-beanie": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <path d="M78 88 C74 40 166 40 162 88 Z" fill="#E07A5F" />
        {[90, 102, 114, 126, 138, 150].map((x) => (
          <path key={x} d={`M${x} 52 L${x} 84`} stroke="#C9584D" strokeWidth="3" opacity="0.5" />
        ))}
        <rect x="74" y="78" width="92" height="16" rx="8" fill="#F2A07E" />
        <circle cx="120" cy="40" r="11" fill="#FFF3E6" stroke="#E07A5F" strokeWidth="2" />
      </g>
    ),
  },
  "hat-monkey": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <path d="M62 150 C52 60 188 60 178 150 L166 150 C170 96 70 96 74 150 Z" fill="#8E3B46" />
        <path d="M70 110 C66 70 174 70 170 110" fill="none" stroke="#B24E5B" strokeWidth="6" />
        <circle cx="120" cy="56" r="9" fill="#B24E5B" />
        <path d="M66 150 L74 150" stroke="#6E2A33" strokeWidth="4" />
      </g>
    ),
  },
  "hat-sunflower": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <ellipse cx="120" cy="76" rx="70" ry="12" fill="#F6CF6E" stroke="#C99A2E" strokeWidth="2" />
        <path d="M90 76 C90 50 150 50 150 76 Z" fill="#F7DEA0" stroke="#C99A2E" strokeWidth="2" />
        <g transform="translate(140 58)">
          {Array.from({ length: 10 }).map((_, i) => (
            <ellipse key={i} cx="0" cy="-11" rx="5" ry="10" fill="#F7B801" transform={`rotate(${i * 36})`} />
          ))}
          <circle r="8" fill="#7A4B25" />
        </g>
      </g>
    ),
  },
  "hat-jasmine": {
    layer: "hat",
    render: () => (
      <g>
        <path d="M74 96 Q120 58 166 96" fill="none" stroke="#6FA06A" strokeWidth="3" />
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const x = 74 + t * 92;
          const y = 96 - Math.sin(t * Math.PI) * 30;
          return flower(x, y, "#FFFFFF", "#F4E4A1", 6, `j${i}`);
        })}
      </g>
    ),
  },
  "hat-flowercrown": {
    layer: "hat",
    render: () => (
      <g>
        <path d="M72 92 Q120 60 168 92" fill="none" stroke="#5E9A5A" strokeWidth="4" />
        {[
          [74, 92, "#F7A8B8"],
          [90, 80, "#F6CF6E"],
          [106, 72, "#C7B5F2"],
          [120, 70, "#F7A8B8"],
          [134, 72, "#9FD0F0"],
          [150, 80, "#F6CF6E"],
          [166, 92, "#C7B5F2"],
        ].map(([x, y, c], i) => flower(x as number, y as number, c as string, "#fff", 7, `f${i}`))}
      </g>
    ),
  },
  "hat-party": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <path d="M96 76 L120 14 L144 76 Z" fill="#9FD0F0" stroke="#5B9FCD" strokeWidth="2" />
        <path d="M104 56 L136 56 M110 38 L130 38" stroke="#F7A8B8" strokeWidth="6" />
        <circle cx="120" cy="14" r="8" fill="#F6CF6E" />
        <path d="M100 76 q20 8 40 0" stroke="#5B9FCD" strokeWidth="2" fill="none" />
      </g>
    ),
  },
  "hat-crown": {
    layer: "hat",
    hidesSprout: true,
    render: () => (
      <g>
        <path d="M86 78 L90 42 L106 62 L120 34 L134 62 L150 42 L154 78 Z" fill="#F6CF6E" stroke="#B98520" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="86" y="72" width="68" height="10" rx="4" fill="#E9B949" stroke="#B98520" strokeWidth="2" />
        <circle cx="120" cy="54" r="5" fill="#E07A5F" />
        <circle cx="100" cy="66" r="3.5" fill="#7FB3E0" />
        <circle cx="140" cy="66" r="3.5" fill="#7FB3E0" />
      </g>
    ),
  },
  // ── Glasses ────────────────────────────────────────────────
  "glasses-reading": {
    layer: "glasses",
    render: () => (
      <g fill="rgba(255,255,255,0.25)" stroke="#7A4B25" strokeWidth="3">
        <rect x="78" y="126" width="32" height="22" rx="8" />
        <rect x="130" y="126" width="32" height="22" rx="8" />
        <path d="M110 134 Q120 128 130 134" fill="none" />
      </g>
    ),
  },
  "glasses-round": {
    layer: "glasses",
    render: () => (
      <g fill="rgba(255,255,255,0.2)" stroke="#5B3A29" strokeWidth="3.5">
        <circle cx="94" cy="137" r="18" />
        <circle cx="146" cy="137" r="18" />
        <path d="M112 135 Q120 130 128 135" fill="none" />
      </g>
    ),
  },
  "glasses-sun": {
    layer: "glasses",
    render: () => (
      <g>
        <rect x="74" y="124" width="40" height="26" rx="11" fill="#2F2A44" stroke="#1B1630" strokeWidth="2" />
        <rect x="126" y="124" width="40" height="26" rx="11" fill="#2F2A44" stroke="#1B1630" strokeWidth="2" />
        <path d="M114 132 Q120 127 126 132" stroke="#1B1630" strokeWidth="3" fill="none" />
        <path d="M80 130 l10 0" stroke="#fff" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
        <path d="M132 130 l10 0" stroke="#fff" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
      </g>
    ),
  },
  "glasses-heart": {
    layer: "glasses",
    render: () => (
      <g fill="rgba(247,168,184,0.75)" stroke="#D9577A" strokeWidth="3" strokeLinejoin="round">
        <path d="M94 152 L78 136 C72 128 80 118 88 124 L94 128 L100 124 C108 118 116 128 110 136 Z" />
        <path d="M146 152 L130 136 C124 128 132 118 140 124 L146 128 L152 124 C160 118 168 128 162 136 Z" />
        <path d="M112 132 Q120 127 128 132" fill="none" />
      </g>
    ),
  },
  // ── Scarves ────────────────────────────────────────────────
  "scarf-striped": {
    layer: "scarf",
    render: () => (
      <g>
        <path d="M52 182 Q120 208 188 182 L186 200 Q120 226 54 200 Z" fill="#E07A5F" />
        {[70, 96, 122, 148, 172].map((x) => (
          <path key={x} d={`M${x} ${188 + Math.abs(120 - x) * -0.12} l8 0 l0 18 l-8 0 Z`} fill="#FFF3E6" opacity="0.9" />
        ))}
        <path d="M156 204 L170 240 L152 242 L146 208 Z" fill="#E07A5F" />
        <path d="M152 222 L166 220 M154 232 L168 230" stroke="#FFF3E6" strokeWidth="4" />
      </g>
    ),
  },
  "scarf-muffler": {
    layer: "scarf",
    render: () => (
      <g>
        <path d="M50 180 Q120 210 190 180 L188 204 Q120 232 52 204 Z" fill="#7BA6C9" />
        <path d="M58 190 Q120 214 182 190" stroke="#5B87AB" strokeWidth="3" fill="none" strokeDasharray="4 5" />
        <path d="M150 206 L158 244 L140 246 L136 210 Z" fill="#7BA6C9" />
        <path d="M140 246 l0 6 M146 246 l0 6 M152 245 l0 6 M158 244 l0 6" stroke="#5B87AB" strokeWidth="3" />
      </g>
    ),
  },
  "scarf-silk": {
    layer: "scarf",
    render: () => (
      <g>
        <path d="M54 178 Q120 206 186 178 Q190 196 184 204 Q120 230 58 204 Q50 194 54 178 Z" fill="#F7A8B8" />
        <path d="M58 202 Q120 228 182 202" stroke="#E9B949" strokeWidth="4" fill="none" />
        <path d="M60 196 Q46 224 58 244 L74 240 Q66 222 76 204 Z" fill="#F7A8B8" stroke="#E9B949" strokeWidth="3" />
      </g>
    ),
  },
  "scarf-garland": {
    layer: "scarf",
    render: () => (
      <g>
        <path d="M58 178 Q120 250 182 178" fill="none" stroke="#6FA06A" strokeWidth="3" />
        {Array.from({ length: 11 }).map((_, i) => {
          const t = i / 10;
          const x = 58 + t * 124;
          const y = 178 + Math.sin(t * Math.PI) * 50;
          return <circle key={i} cx={x} cy={y} r="7.5" fill={i % 2 ? "#F7B801" : "#F48C06"} stroke="#D97706" strokeWidth="1.5" />;
        })}
      </g>
    ),
  },
  // ── Outfits (clipped to the body outline) ──────────────────
  "outfit-apron": {
    layer: "outfit",
    render: () => (
      <g>
        <path d="M84 168 L156 168 L166 240 L74 240 Z" fill="#8CC084" stroke="#5D9656" strokeWidth="2" />
        <rect x="104" y="196" width="32" height="20" rx="5" fill="#A9D4A1" stroke="#5D9656" strokeWidth="2" />
        <path d="M84 168 L64 130 M156 168 L176 130" stroke="#5D9656" strokeWidth="5" />
      </g>
    ),
  },
  "outfit-raincoat": {
    layer: "outfit",
    render: () => (
      <g>
        <rect x="30" y="178" width="180" height="70" fill="#F6CF6E" />
        <path d="M120 178 L120 248" stroke="#C99A2E" strokeWidth="3" />
        {[194, 212, 230].map((y) => (
          <circle key={y} cx="128" cy={y} r="3.5" fill="#C99A2E" />
        ))}
        <path d="M84 178 L120 196 L156 178" fill="#F7DEA0" stroke="#C99A2E" strokeWidth="2" />
      </g>
    ),
  },
  "outfit-sweater": {
    layer: "outfit",
    render: () => (
      <g>
        <rect x="30" y="180" width="180" height="70" fill="#C7B5F2" />
        {[196, 214].map((y) =>
          [60, 84, 108, 132, 156, 180].map((x) => (
            <path key={`${x}-${y}`} d={`M${x} ${y} l6 6 l6 -6`} stroke="#9179CF" strokeWidth="2.5" fill="none" />
          )),
        )}
        <rect x="30" y="228" width="180" height="12" fill="#9179CF" opacity="0.6" />
      </g>
    ),
  },
  "outfit-kurta": {
    layer: "outfit",
    render: () => (
      <g>
        <rect x="30" y="176" width="180" height="74" fill="#9FD0F0" />
        <path d="M120 176 L120 214" stroke="#5B9FCD" strokeWidth="3" />
        {[186, 198, 210].map((y) => (
          <circle key={y} cx="126" cy={y} r="2.5" fill="#fff" />
        ))}
        {[70, 90, 150, 170].map((x) => flower(x, 222, "#fff", "#F6CF6E", 4, `k${x}`))}
      </g>
    ),
  },
  "outfit-saree": {
    layer: "outfit",
    render: () => (
      <g>
        <rect x="30" y="182" width="180" height="70" fill="#D6457A" />
        <path d="M30 236 L210 236" stroke="#F6CF6E" strokeWidth="6" />
        <path d="M44 120 L190 250 L150 250 L40 150 Z" fill="#E86A9A" />
        <path d="M44 120 L190 250" stroke="#F6CF6E" strokeWidth="5" />
        <path d="M40 150 L150 250" stroke="#F6CF6E" strokeWidth="3" strokeDasharray="3 5" />
      </g>
    ),
  },
  "outfit-dhoti": {
    layer: "outfit",
    render: () => (
      <g>
        <rect x="30" y="190" width="180" height="60" fill="#FFFDF4" />
        <path d="M30 234 L210 234" stroke="#E9B949" strokeWidth="6" />
        <path d="M120 196 L112 250 M120 196 L128 250" stroke="#EDE3C8" strokeWidth="3" />
        <path d="M150 100 L70 200 L90 206 L166 110 Z" fill="#FFF4D4" stroke="#E9B949" strokeWidth="3" />
      </g>
    ),
  },
  // ── Shoes ──────────────────────────────────────────────────
  "shoes-chappal": {
    layer: "shoes",
    render: () => (
      <g>
        <ellipse cx="96" cy="242" rx="22" ry="7" fill="#9A6A43" />
        <ellipse cx="144" cy="242" rx="22" ry="7" fill="#9A6A43" />
        <path d="M84 236 Q96 226 108 236 M132 236 Q144 226 156 236" stroke="#6B4428" strokeWidth="4" fill="none" />
      </g>
    ),
  },
  "shoes-slippers": {
    layer: "shoes",
    render: () => (
      <g>
        <ellipse cx="96" cy="238" rx="22" ry="11" fill="#F7A8B8" />
        <ellipse cx="144" cy="238" rx="22" ry="11" fill="#F7A8B8" />
        <circle cx="92" cy="230" r="7" fill="#fff" />
        <circle cx="140" cy="230" r="7" fill="#fff" />
      </g>
    ),
  },
  "shoes-rainboots": {
    layer: "shoes",
    render: () => (
      <g fill="#F6CF6E" stroke="#C99A2E" strokeWidth="2">
        <path d="M80 214 L108 214 L110 242 L76 242 Q74 232 80 228 Z" />
        <path d="M132 214 L160 214 L164 228 Q166 232 164 242 L130 242 Z" />
      </g>
    ),
  },
  "shoes-mojari": {
    layer: "shoes",
    render: () => (
      <g>
        <path d="M76 240 Q76 228 96 228 Q112 228 116 236 Q124 232 122 226 Q128 236 116 242 Z" fill="#C9584D" stroke="#E9B949" strokeWidth="2" />
        <path d="M124 240 Q124 228 144 228 Q160 228 164 236 Q172 232 170 226 Q176 236 164 242 Z" fill="#C9584D" stroke="#E9B949" strokeWidth="2" />
        <circle cx="96" cy="234" r="2.5" fill="#F6CF6E" />
        <circle cx="144" cy="234" r="2.5" fill="#F6CF6E" />
      </g>
    ),
  },
  // ── Things to hold ─────────────────────────────────────────
  "acc-balloon": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M198 168 Q214 120 206 84" stroke="#8a7f99" strokeWidth="2" fill="none" />
        <ellipse cx="206" cy="58" rx="22" ry="27" fill="#F28482" />
        <path d="M202 85 l4 6 l4 -6 Z" fill="#E56B6F" />
        <ellipse cx="198" cy="48" rx="6" ry="9" fill="#fff" opacity="0.45" />
      </g>
    ),
  },
  "acc-chai": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M194 166 L220 166 L216 190 Q207 196 198 190 Z" fill="#fff" stroke="#9A6A43" strokeWidth="2.5" />
        <path d="M196 170 L218 170" stroke="#C68B59" strokeWidth="6" />
        <path d="M219 172 q10 2 4 12 q-3 3 -6 2" stroke="#9A6A43" strokeWidth="2.5" fill="none" />
        <path d="M202 158 q-4 -8 2 -14 M210 158 q-4 -8 2 -14" stroke="#b9aeca" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  "acc-book": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M186 158 L226 150 L230 186 L190 194 Z" fill="#7D64BD" stroke="#5A3FA3" strokeWidth="2" />
        <path d="M190 160 L224 153" stroke="#fff" strokeWidth="2" opacity="0.6" />
        {flower(208, 172, "#F6CF6E", "#fff", 5)}
      </g>
    ),
  },
  "acc-wateringcan": {
    layer: "hand",
    render: () => (
      <g>
        <rect x="196" y="160" width="34" height="30" rx="7" fill="#7FB3E0" stroke="#4F86B8" strokeWidth="2" />
        <path d="M230 170 L250 152 L254 156 L234 178 Z" fill="#7FB3E0" stroke="#4F86B8" strokeWidth="2" />
        <path d="M204 160 Q213 144 222 160" stroke="#4F86B8" strokeWidth="4" fill="none" />
        <path d="M256 158 l4 6 M252 162 l2 8" stroke="#9FD0F0" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  "acc-umbrella": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M200 176 L204 64" stroke="#6B4428" strokeWidth="4" />
        <path d="M200 176 q0 10 -8 10 q-6 0 -6 -6" stroke="#6B4428" strokeWidth="4" fill="none" />
        <path d="M150 70 Q204 10 258 70 Q244 60 231 70 Q217 58 204 70 Q190 58 177 70 Q164 60 150 70 Z" fill="#9FD0F0" stroke="#5B9FCD" strokeWidth="2" />
        <path d="M204 20 L204 70 M177 30 Q190 50 190 70 M231 30 Q218 50 218 70" stroke="#5B9FCD" strokeWidth="1.5" fill="none" />
      </g>
    ),
  },
  "acc-bouquet": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M198 186 L212 150 L222 186 Z" fill="#F7DEA0" stroke="#C99A2E" strokeWidth="2" />
        <path d="M202 156 L212 130 M212 156 L214 128 M218 156 L226 132" stroke="#5E9A5A" strokeWidth="3" />
        {flower(210, 128, "#F7A8B8", "#fff", 8, "b1")}
        {flower(226, 132, "#C7B5F2", "#fff", 7, "b2")}
        {flower(198, 136, "#F6CF6E", "#fff", 7, "b3")}
      </g>
    ),
  },
  "acc-kite": {
    layer: "hand",
    render: () => (
      <g>
        <path d="M198 172 Q224 130 214 76" stroke="#8a7f99" strokeWidth="1.8" fill="none" />
        <path d="M214 30 L238 58 L214 86 L190 58 Z" fill="#F48C06" stroke="#D97706" strokeWidth="2" />
        <path d="M214 30 L214 86 M190 58 L238 58" stroke="#FFF3E6" strokeWidth="2" />
        <path d="M214 86 q-6 10 2 16 q8 6 0 14" stroke="#E56B6F" strokeWidth="3" fill="none" />
      </g>
    ),
  },
  // ── Little friends ─────────────────────────────────────────
  "comp-butterfly": {
    layer: "companion",
    render: () => (
      <g className="mimo-bob">
        <g transform="translate(38 70)">
          <ellipse cx="-9" cy="-4" rx="11" ry="9" fill="#C7B5F2" stroke="#9179CF" strokeWidth="1.5" />
          <ellipse cx="9" cy="-4" rx="11" ry="9" fill="#F7A8B8" stroke="#D9577A" strokeWidth="1.5" />
          <ellipse cx="-7" cy="8" rx="7" ry="6" fill="#F6CF6E" />
          <ellipse cx="7" cy="8" rx="7" ry="6" fill="#9FD0F0" />
          <rect x="-1.5" y="-10" width="3" height="22" rx="1.5" fill={INK} />
          <path d="M0 -10 q-4 -8 -8 -8 M0 -10 q4 -8 8 -8" stroke={INK} strokeWidth="1.5" fill="none" />
        </g>
      </g>
    ),
  },
  "comp-sparrow": {
    layer: "companion",
    render: () => (
      <g className="mimo-bob">
        <g transform="translate(34 78)">
          <ellipse cx="0" cy="0" rx="16" ry="12" fill="#B08968" />
          <ellipse cx="4" cy="4" rx="10" ry="7" fill="#EDE0D4" />
          <circle cx="12" cy="-8" r="8" fill="#B08968" />
          <path d="M19 -8 l7 2 l-7 2 Z" fill="#F6CF6E" />
          <circle cx="14" cy="-10" r="1.8" fill={INK} />
          <path d="M-12 -2 q-10 -8 -14 2" fill="#7F5539" />
        </g>
      </g>
    ),
  },
  "comp-kitten": {
    layer: "ground",
    render: () => (
      <g transform="translate(28 214)">
        <ellipse cx="0" cy="20" rx="20" ry="5" fill="rgba(80,50,30,0.12)" />
        <ellipse cx="0" cy="8" rx="15" ry="13" fill="#F4A261" />
        <circle cx="0" cy="-10" r="12" fill="#F4A261" />
        <path d="M-10 -16 L-9 -28 L-2 -20 Z M10 -16 L9 -28 L2 -20 Z" fill="#F4A261" />
        <circle cx="-4" cy="-11" r="1.8" fill={INK} />
        <circle cx="4" cy="-11" r="1.8" fill={INK} />
        <path d="M-2 -6 q2 2 4 0" stroke={INK} strokeWidth="1.5" fill="none" />
        <path d="M14 14 q12 -2 10 -16" stroke="#F4A261" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
};

export const SLOT_ORDER: ItemLayer[] = ["ground", "shoes", "outfit", "scarf", "glasses", "hat", "hand", "companion"];
