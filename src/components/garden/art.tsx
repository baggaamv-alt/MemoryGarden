import type { ReactElement } from "react";

/**
 * Garden artwork in a 800×480 scene. `z` orders drawing (sky → back row → middle → front).
 * `box` is the crop used when the item is shown on its own (shop cards, album).
 */
type GardenArt = { z: number; box: [number, number, number, number]; render: () => ReactElement };

const INK = "#3b2a4a";

function bloom(cx: number, cy: number, r: number, petal: string, center: string, n = 6, key?: string) {
  return (
    <g key={key}>
      {Array.from({ length: n }).map((_, i) => (
        <ellipse key={i} cx={cx} cy={cy - r * 0.85} rx={r * 0.55} ry={r * 0.85} fill={petal} transform={`rotate(${(360 / n) * i} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.42} fill={center} />
    </g>
  );
}

function tree(x: number, base: number, crown: string, trunk: string, s = 1, extra?: ReactElement) {
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`}>
      <path d="M-10 0 L-7 -90 L7 -90 L10 0 Z" fill={trunk} />
      <path d="M-6 -60 L-34 -92 M6 -70 L30 -100" stroke={trunk} strokeWidth="7" strokeLinecap="round" />
      <circle cx="-36" cy="-112" r="42" fill={crown} />
      <circle cx="30" cy="-120" r="46" fill={crown} />
      <circle cx="-2" cy="-150" r="48" fill={crown} />
      <circle cx="-14" cy="-140" r="22" fill="#ffffff" opacity="0.12" />
      {extra}
    </g>
  );
}

export const GARDEN_ART: Record<string, GardenArt> = {
  // ── Sky ───────────────────────────────────────────────────
  rainbow: {
    z: 1,
    box: [100, 40, 600, 280],
    render: () => (
      <g fill="none" strokeWidth="14" opacity="0.55">
        {["#F7A8B8", "#F6CF6E", "#A9D4A1", "#9FD0F0", "#C7B5F2"].map((c, i) => (
          <path key={c} d={`M ${120 + i * 14} 300 A ${280 - i * 14} ${230 - i * 12} 0 0 1 ${680 - i * 14} 300`} stroke={c} />
        ))}
      </g>
    ),
  },
  "keep-sun": {
    z: 2,
    box: [630, 10, 140, 140],
    render: () => (
      <g transform="translate(700 80)">
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d="M0 -52 L6 -40 L-6 -40 Z" fill="#F6CF6E" transform={`rotate(${i * 30})`} />
        ))}
        <circle r="36" fill="#F7C548" />
        <circle r="36" fill="url(#sunGlow)" />
        <circle cx="-12" cy="-6" r="4" fill={INK} />
        <circle cx="12" cy="-6" r="4" fill={INK} />
        <path d="M-10 8 Q0 17 10 8" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  "keep-bunting": {
    z: 3,
    box: [0, 0, 800, 70],
    render: () => (
      <g>
        <path d="M0 22 Q200 48 400 22 Q600 48 800 22" stroke="#9a8866" strokeWidth="2" fill="none" />
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 25 + i * 50;
          const t = (x % 400) / 400;
          const y = 22 + Math.sin(t * Math.PI) * 26;
          const colors = ["#F7A8B8", "#F6CF6E", "#9FD0F0", "#A9D4A1", "#C7B5F2"];
          return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 26} Z`} fill={colors[i % colors.length]} />;
        })}
      </g>
    ),
  },
  "season-toran": {
    z: 4,
    box: [0, 0, 800, 60],
    render: () => (
      <g>
        <path d="M0 8 L800 8" stroke="#8B5E34" strokeWidth="4" />
        {Array.from({ length: 22 }).map((_, i) => (
          <g key={i} transform={`translate(${18 + i * 36} 10)`}>
            <path d="M0 0 C-10 14 -8 30 0 40 C8 30 10 14 0 0 Z" fill={i % 2 ? "#4F8A4B" : "#6FA06A"} />
            {i % 3 === 0 && <circle cx="0" cy="4" r="5" fill="#F48C06" />}
          </g>
        ))}
      </g>
    ),
  },
  "season-kites": {
    z: 5,
    box: [140, 20, 480, 160],
    render: () => (
      <g>
        {[
          [200, 70, "#F48C06", "#FFF3E6"],
          [560, 55, "#9FD0F0", "#F7A8B8"],
        ].map(([x, y, a, b]) => (
          <g key={`${x}`} transform={`translate(${x} ${y})`}>
            <path d="M0 -26 L22 0 L0 30 L-22 0 Z" fill={a as string} stroke="#7a5b3a" strokeWidth="1.5" />
            <path d="M0 -26 L0 30 M-22 0 L22 0" stroke={b as string} strokeWidth="2" />
            <path d="M0 30 q-8 12 0 22 q8 10 -2 20" stroke="#E56B6F" strokeWidth="2.5" fill="none" />
            <path d="M0 30 Q30 120 90 180" stroke="#b9aeca" strokeWidth="1" fill="none" />
          </g>
        ))}
      </g>
    ),
  },
  "season-star": {
    z: 5,
    box: [350, 0, 100, 120],
    render: () => (
      <g>
        <path d="M400 0 L400 40" stroke="#9a8866" strokeWidth="2" />
        <path d="M400 38 L410 60 L434 62 L416 78 L422 102 L400 89 L378 102 L384 78 L366 62 L390 60 Z" fill="#F6CF6E" stroke="#C99A2E" strokeWidth="2" />
        <circle cx="400" cy="72" r="6" fill="#fff" opacity="0.7" />
      </g>
    ),
  },
  "season-lanterns": {
    z: 5,
    box: [590, 0, 190, 120],
    render: () => (
      <g>
        {[
          [620, 50, "#F6CF6E"],
          [680, 70, "#F7A8B8"],
          [740, 45, "#9FD0F0"],
        ].map(([x, y, c]) => (
          <g key={`${x}`}>
            <path d={`M${x} 0 L${x} ${(y as number) - 22}`} stroke="#9a8866" strokeWidth="2" />
            <path d={`M${(x as number) - 14} ${(y as number) - 22} L${(x as number) + 14} ${(y as number) - 22} L${(x as number) + 18} ${y} L${(x as number) + 10} ${(y as number) + 24} L${(x as number) - 10} ${(y as number) + 24} L${(x as number) - 18} ${y} Z`} fill={c as string} stroke="#B98520" strokeWidth="2" />
            <circle cx={x as number} cy={(y as number) + 2} r="6" fill="#FFF7D6" />
            <path d={`M${x} ${(y as number) - 34} a6 6 0 1 1 0.1 0`} fill="none" />
          </g>
        ))}
      </g>
    ),
  },
  // ── Back row (y≈300) ──────────────────────────────────────
  "mango-tree": {
    z: 10,
    box: [40, 100, 190, 210],
    render: () =>
      tree(
        130,
        302,
        "#5E9A5A",
        "#8B5E34",
        1,
        <g>
          {[
            [-40, -100],
            [20, -110],
            [-10, -160],
            [36, -140],
            [-30, -140],
          ].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="7" ry="9" fill="#F7B801" stroke="#D97706" strokeWidth="1" />
          ))}
        </g>,
      ),
  },
  parrots: {
    z: 11,
    box: [100, 150, 110, 80],
    render: () => (
      <g>
        {[
          [124, 196, 1],
          [168, 186, -1],
        ].map(([x, y, f]) => (
          <g key={`${x}`} transform={`translate(${x} ${y}) scale(${f} 1)`}>
            <path d="M-18 6 L4 6" stroke="#8B5E34" strokeWidth="4" />
            <ellipse cx="0" cy="-8" rx="9" ry="13" fill="#52B788" />
            <circle cx="0" cy="-22" r="8" fill="#52B788" />
            <path d="M6 -24 q8 2 4 8 q-4 -2 -6 -2 Z" fill="#E63946" />
            <circle cx="2" cy="-24" r="1.8" fill={INK} />
            <path d="M-4 4 L-10 22" stroke="#2D6A4F" strokeWidth="4" strokeLinecap="round" />
          </g>
        ))}
      </g>
    ),
  },
  "keep-house": {
    z: 10,
    box: [360, 200, 130, 110],
    render: () => (
      <g transform="translate(420 302)">
        <rect x="-50" y="-60" width="100" height="60" fill="#FFE6D6" stroke="#D9774A" strokeWidth="2" />
        <path d="M-60 -58 L0 -100 L60 -58 Z" fill="#E07A5F" stroke="#C9584D" strokeWidth="2" />
        <rect x="-12" y="-34" width="24" height="34" rx="3" fill="#9A6A43" />
        <rect x="-40" y="-46" width="20" height="18" rx="2" fill="#9FD0F0" stroke="#fff" strokeWidth="2" />
        <rect x="20" y="-46" width="20" height="18" rx="2" fill="#9FD0F0" stroke="#fff" strokeWidth="2" />
        <path d="M-36 0 l0 -6 M36 0 l0 -6" stroke="#D9774A" />
      </g>
    ),
  },
  "neem-tree": {
    z: 10,
    box: [590, 90, 190, 220],
    render: () => tree(684, 304, "#6FA06A", "#7A5230", 1.05),
  },
  "coconut-tree": {
    z: 9,
    box: [700, 90, 100, 240],
    render: () => (
      <g transform="translate(772 320)">
        <path d="M0 0 C-6 -80 10 -150 -4 -200" stroke="#9C6B3F" strokeWidth="14" fill="none" strokeLinecap="round" />
        {[-150, -110, -60, -20, 20, 60].map((a) => (
          <path key={a} d="M-4 -200 q40 -20 80 10 q-40 -6 -80 -10 Z" fill="#5E9A5A" transform={`rotate(${a} -4 -200)`} />
        ))}
        <circle cx="-10" cy="-192" r="7" fill="#7A5230" />
        <circle cx="4" cy="-190" r="7" fill="#7A5230" />
      </g>
    ),
  },
  // ── Middle row (y≈392) ────────────────────────────────────
  jasmine: {
    z: 20,
    box: [0, 270, 90, 130],
    render: () => (
      <g transform="translate(42 394)">
        <path d="M-26 0 L-26 -110 M26 0 L26 -110 M-26 -110 L26 -110 M-26 -80 L26 -80 M-26 -50 L26 -50 M-26 -20 L26 -20" stroke="#B08968" strokeWidth="4" />
        <path d="M-20 0 C-40 -40 20 -60 -10 -100 C-30 -120 10 -130 20 -110" stroke="#5E9A5A" strokeWidth="4" fill="none" />
        {[
          [-18, -30],
          [8, -56],
          [-12, -86],
          [14, -100],
          [-4, -12],
          [18, -76],
        ].map(([x, y]) => bloom(x, y, 7, "#FFFFFF", "#F4E4A1", 5, `${x}${y}`))}
      </g>
    ),
  },
  "keep-gate": {
    z: 21,
    box: [80, 330, 90, 70],
    render: () => (
      <g transform="translate(124 396)">
        {[-34, -20, -6, 8, 22].map((x) => (
          <path key={x} d={`M${x} 0 L${x} -46 L${x + 6} -54 L${x + 12} -46 L${x + 12} 0 Z`} fill="#F3D9B1" stroke="#C99A6B" strokeWidth="2" />
        ))}
        <path d="M-38 -34 L38 -34 M-38 -14 L38 -14" stroke="#C99A6B" strokeWidth="5" />
      </g>
    ),
  },
  "garden-swing": {
    z: 22,
    box: [140, 290, 110, 110],
    render: () => (
      <g transform="translate(196 396)">
        <path d="M-44 0 L-30 -100 L30 -100 L44 0" stroke="#8B5E34" strokeWidth="7" fill="none" strokeLinejoin="round" />
        <path d="M-16 -100 L-16 -30 M16 -100 L16 -30" stroke="#9a8866" strokeWidth="2.5" />
        <rect x="-26" y="-32" width="52" height="10" rx="4" fill="#E07A5F" stroke="#C9584D" strokeWidth="2" />
        {bloom(-20, -100, 6, "#F7A8B8", "#fff", 5)}
        {bloom(18, -100, 6, "#F6CF6E", "#fff", 5)}
      </g>
    ),
  },
  sunflower: {
    z: 23,
    box: [250, 290, 80, 110],
    render: () => (
      <g>
        {[
          [276, 394, 96],
          [304, 394, 76],
        ].map(([x, base, h]) => (
          <g key={`${x}`}>
            <path d={`M${x} ${base} L${x} ${base - h}`} stroke="#4F8A4B" strokeWidth="5" />
            <ellipse cx={x - 10} cy={base - h / 2} rx="12" ry="6" fill="#6FA06A" transform={`rotate(-30 ${x - 10} ${base - h / 2})`} />
            {bloom(x, base - h, 15, "#F7B801", "#7A4B25", 12)}
          </g>
        ))}
      </g>
    ),
  },
  "garden-birdbath": {
    z: 24,
    box: [320, 330, 70, 70],
    render: () => (
      <g transform="translate(354 396)">
        <path d="M-10 0 L-6 -34 L6 -34 L10 0 Z" fill="#D8CFC0" />
        <ellipse cx="0" cy="-38" rx="30" ry="9" fill="#D8CFC0" stroke="#B8AD99" strokeWidth="2" />
        <ellipse cx="0" cy="-40" rx="24" ry="5" fill="#9FD0F0" />
        <path d="M14 -46 q6 -8 12 -4 l6 -2 l-4 6 q-2 6 -10 4 Z" fill="#B08968" />
      </g>
    ),
  },
  "garden-tulsi": {
    z: 25,
    box: [395, 310, 70, 90],
    render: () => (
      <g transform="translate(428 398)">
        <path d="M-24 0 L-20 -44 L20 -44 L24 0 Z" fill="#F4A261" stroke="#D9774A" strokeWidth="2" />
        <rect x="-26" y="-50" width="52" height="8" rx="2" fill="#E9B949" />
        <path d="M-12 -20 a6 6 0 1 0 0.1 0 M12 -20 a6 6 0 1 0 0.1 0" stroke="#fff" strokeWidth="2" fill="none" />
        <path d="M0 -34 l0 8" stroke="#E63946" strokeWidth="3" />
        <path d="M0 -50 L0 -86" stroke="#4F8A4B" strokeWidth="3" />
        {[-80, -70, -60].map((y, i) => (
          <g key={y}>
            <ellipse cx={-8} cy={y} rx="9" ry="4.5" fill="#6FA06A" transform={`rotate(-30 -8 ${y})`} />
            <ellipse cx={8} cy={y + 4} rx="9" ry="4.5" fill={i % 2 ? "#5E9A5A" : "#7FB16F"} transform={`rotate(30 8 ${y + 4})`} />
          </g>
        ))}
      </g>
    ),
  },
  "keep-cow": {
    z: 26,
    box: [460, 330, 90, 70],
    render: () => (
      <g transform="translate(502 394)">
        <ellipse cx="0" cy="-22" rx="30" ry="18" fill="#FFF7EC" stroke="#CDBFA8" strokeWidth="2" />
        <ellipse cx="-8" cy="-26" rx="9" ry="6" fill="#B08968" />
        {[-20, -8, 10, 22].map((x) => (
          <rect key={x} x={x - 3} y="-8" width="6" height="12" rx="2" fill="#FFF7EC" stroke="#CDBFA8" />
        ))}
        <ellipse cx="32" cy="-34" rx="12" ry="11" fill="#FFF7EC" stroke="#CDBFA8" strokeWidth="2" />
        <ellipse cx="38" cy="-30" rx="6" ry="4" fill="#F7C6CF" />
        <circle cx="30" cy="-38" r="2" fill={INK} />
        <path d="M24 -44 l-6 -6 M36 -45 l4 -7" stroke="#CDBFA8" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  "garden-bench": {
    z: 27,
    box: [530, 340, 100, 60],
    render: () => (
      <g transform="translate(578 396)">
        <rect x="-44" y="-34" width="88" height="10" rx="3" fill="#B07D4F" />
        <rect x="-44" y="-52" width="88" height="8" rx="3" fill="#B07D4F" />
        <rect x="-44" y="-64" width="88" height="8" rx="3" fill="#C4905F" />
        <path d="M-38 -24 L-40 0 M38 -24 L40 0 M-38 -64 L-38 -24 M38 -64 L38 -24" stroke="#7A5230" strokeWidth="5" strokeLinecap="round" />
      </g>
    ),
  },
  "garden-fountain": {
    z: 28,
    box: [620, 320, 90, 80],
    render: () => (
      <g transform="translate(662 398)">
        <ellipse cx="0" cy="-6" rx="38" ry="10" fill="#D8CFC0" stroke="#B8AD99" strokeWidth="2" />
        <ellipse cx="0" cy="-8" rx="32" ry="6" fill="#9FD0F0" />
        <rect x="-5" y="-40" width="10" height="32" fill="#D8CFC0" />
        <ellipse cx="0" cy="-42" rx="16" ry="5" fill="#D8CFC0" stroke="#B8AD99" strokeWidth="2" />
        <path d="M0 -44 q-18 -24 -30 2 M0 -44 q18 -24 30 2 M0 -44 l0 -18" stroke="#7FC8F8" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  "garden-birdhouse": {
    z: 29,
    box: [710, 290, 70, 110],
    render: () => (
      <g transform="translate(746 398)">
        <path d="M0 0 L0 -60" stroke="#8B5E34" strokeWidth="6" />
        <rect x="-20" y="-96" width="40" height="36" rx="3" fill="#F4A261" stroke="#D9774A" strokeWidth="2" />
        <path d="M-26 -94 L0 -116 L26 -94 Z" fill="#7FB3E0" stroke="#4F86B8" strokeWidth="2" />
        <circle cx="0" cy="-80" r="7" fill="#5B3A29" />
        <path d="M-6 -68 L6 -68" stroke="#8B5E34" strokeWidth="3" />
      </g>
    ),
  },
  "garden-windchime": {
    z: 18,
    box: [0, 90, 160, 150],
    render: () => (
      <g>
        <path d="M0 124 Q70 104 150 118" stroke="#8B5E34" strokeWidth="8" fill="none" strokeLinecap="round" />
        <ellipse cx="120" cy="104" rx="16" ry="7" fill="#6FA06A" />
        <path d="M92 116 L92 136" stroke="#9a8866" strokeWidth="2" />
        <ellipse cx="92" cy="138" rx="14" ry="4" fill="#C99A2E" />
        {[-10, -4, 2, 8].map((dx, i) => (
          <g key={dx}>
            <path d={`M${92 + dx} 140 L${92 + dx} ${150 + i * 6}`} stroke="#9a8866" strokeWidth="1" />
            <rect x={90 + dx} y={150 + i * 6} width="4" height={26 - i * 3} rx="2" fill="#B8C4CF" />
          </g>
        ))}
      </g>
    ),
  },
  // ── Front row (y≈455) ─────────────────────────────────────
  marigold: {
    z: 40,
    box: [70, 400, 90, 70],
    render: () => (
      <g transform="translate(112 458)">
        <path d="M-20 0 L-18 -26 M0 0 L0 -34 M20 0 L18 -24" stroke="#4F8A4B" strokeWidth="4" />
        {bloom(-18, -30, 12, "#F48C06", "#D97706", 9)}
        {bloom(0, -40, 13, "#F7B801", "#F48C06", 9)}
        {bloom(18, -28, 11, "#F48C06", "#D97706", 9)}
      </g>
    ),
  },
  "garden-muggu": {
    z: 39,
    box: [150, 430, 120, 50],
    render: () => (
      <g transform="translate(212 460)">
        <ellipse cx="0" cy="0" rx="54" ry="16" fill="#FFFDF4" opacity="0.9" />
        <ellipse cx="0" cy="0" rx="40" ry="11" fill="none" stroke="#E56B6F" strokeWidth="3" />
        <ellipse cx="0" cy="0" rx="26" ry="7" fill="none" stroke="#F7B801" strokeWidth="3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <circle key={i} cx={Math.cos((i * Math.PI) / 4) * 48} cy={Math.sin((i * Math.PI) / 4) * 13} r="3" fill="#7D64BD" />
        ))}
        <circle cx="0" cy="0" r="5" fill="#52B788" />
      </g>
    ),
  },
  sprout: {
    z: 41,
    box: [275, 410, 50, 55],
    render: () => (
      <g transform="translate(300 458)">
        <ellipse cx="0" cy="2" rx="18" ry="5" fill="#9A6A43" opacity="0.5" />
        <path d="M0 0 Q-2 -14 1 -26" stroke="#5E9A5A" strokeWidth="4" fill="none" />
        <ellipse cx="-10" cy="-26" rx="11" ry="6" fill="#8CC084" transform="rotate(-28 -10 -26)" />
        <ellipse cx="11" cy="-28" rx="11" ry="6" fill="#A9D4A1" transform="rotate(28 11 -28)" />
      </g>
    ),
  },
  "garden-cat": {
    z: 42,
    box: [340, 405, 70, 60],
    render: () => (
      <g transform="translate(372 460)">
        <ellipse cx="0" cy="0" rx="22" ry="5" fill="rgba(80,50,30,0.12)" />
        <ellipse cx="0" cy="-14" rx="18" ry="14" fill="#8D99AE" />
        <circle cx="0" cy="-34" r="13" fill="#8D99AE" />
        <path d="M-11 -40 L-10 -54 L-2 -45 Z M11 -40 L10 -54 L2 -45 Z" fill="#8D99AE" />
        <path d="M-6 -36 q2 -2 4 0 M2 -36 q2 -2 4 0" stroke={INK} strokeWidth="2" fill="none" />
        <path d="M18 -8 q16 -4 12 -22" stroke="#8D99AE" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  "season-bathukamma": {
    z: 43,
    box: [405, 380, 70, 90],
    render: () => (
      <g transform="translate(440 462)">
        <ellipse cx="0" cy="0" rx="28" ry="6" fill="#B08968" />
        {["#F7B801", "#E86A9A", "#F48C06", "#C7B5F2", "#F7B801", "#E86A9A"].map((c, i) => (
          <path key={i} d={`M${-26 + i * 4} ${-i * 13} L${26 - i * 4} ${-i * 13} L${22 - i * 4} ${-(i + 1) * 13} L${-22 + i * 4} ${-(i + 1) * 13} Z`} fill={c} />
        ))}
        {bloom(0, -82, 7, "#F48C06", "#fff", 6)}
      </g>
    ),
  },
  "lotus-pond": {
    z: 44,
    box: [470, 420, 150, 60],
    render: () => (
      <g transform="translate(544 458)">
        <ellipse cx="0" cy="0" rx="70" ry="18" fill="#7FB3E0" stroke="#4F86B8" strokeWidth="2" />
        <ellipse cx="-10" cy="-2" rx="50" ry="10" fill="#9FD0F0" />
        <ellipse cx="-30" cy="2" rx="14" ry="5" fill="#5E9A5A" />
        <ellipse cx="34" cy="-2" rx="12" ry="4" fill="#5E9A5A" />
        <g transform="translate(6 -6)">
          {[-40, -20, 0, 20, 40].map((a) => (
            <ellipse key={a} cx="0" cy="-10" rx="6" ry="12" fill="#F7A8C8" stroke="#E86A9A" strokeWidth="1" transform={`rotate(${a})`} />
          ))}
        </g>
      </g>
    ),
  },
  hibiscus: {
    z: 45,
    box: [600, 395, 90, 70],
    render: () => (
      <g transform="translate(642 460)">
        <ellipse cx="0" cy="-16" rx="34" ry="18" fill="#4F8A4B" />
        {bloom(-16, -24, 12, "#E63946", "#F6CF6E", 5)}
        {bloom(14, -18, 11, "#F28482", "#F6CF6E", 5)}
      </g>
    ),
  },
  rose: {
    z: 46,
    box: [680, 395, 80, 70],
    render: () => (
      <g transform="translate(720 460)">
        <ellipse cx="0" cy="-16" rx="30" ry="18" fill="#5E9A5A" />
        {[
          [-14, -24],
          [12, -26],
          [0, -10],
        ].map(([x, y]) => (
          <g key={`${x}${y}`}>
            <circle cx={x} cy={y} r="9" fill="#E86A9A" />
            <path d={`M${x - 5} ${y} q5 -6 10 0 q-5 5 -10 0`} stroke="#C2185B" strokeWidth="1.5" fill="none" />
          </g>
        ))}
      </g>
    ),
  },
  "garden-lantern": {
    z: 47,
    box: [745, 360, 50, 110],
    render: () => (
      <g transform="translate(772 466)">
        <path d="M0 0 L0 -70" stroke="#5B3A29" strokeWidth="5" />
        <path d="M-14 -70 L14 -70 L10 -100 L-10 -100 Z" fill="#F6CF6E" stroke="#B98520" strokeWidth="2" />
        <path d="M-12 -100 L0 -110 L12 -100 Z" fill="#5B3A29" />
        <circle cx="0" cy="-84" r="6" fill="#FFF7D6" />
      </g>
    ),
  },
  "season-diyas": {
    z: 48,
    box: [170, 440, 460, 40],
    render: () => (
      <g>
        {[190, 300, 410, 520, 620].map((x) => (
          <g key={x} transform={`translate(${x} 474)`}>
            <path d="M-14 0 Q0 12 14 0 L10 -6 L-10 -6 Z" fill="#C9584D" stroke="#9C2F25" strokeWidth="1.5" />
            <path d="M0 -8 C-5 -14 -2 -22 0 -26 C2 -22 5 -14 0 -8 Z" fill="#F7B801" />
            <circle cx="0" cy="-14" r="9" fill="#F7B801" opacity="0.25" />
          </g>
        ))}
      </g>
    ),
  },
};

/** Daily-adventure flowers, one per completed day (up to seven), along the path. */
export const DAILY_FLOWER_SPOTS = [
  [62, 470],
  [162, 474],
  [256, 470],
  [336, 474],
  [486, 474],
  [602, 470],
  [694, 474],
];

export function DailyFlower({ i }: { i: number }) {
  const [x, y] = DAILY_FLOWER_SPOTS[i % DAILY_FLOWER_SPOTS.length];
  const colors = ["#F7A8B8", "#C7B5F2", "#F6CF6E", "#9FD0F0", "#F28482", "#A9D4A1", "#F4A261"];
  return (
    <g>
      <path d={`M${x} ${y} L${x} ${y - 14}`} stroke="#4F8A4B" strokeWidth="3" />
      {bloom(x, y - 18, 7, colors[i % colors.length], "#fff", 5)}
    </g>
  );
}

export function Butterflies({ animated = true }: { animated?: boolean }) {
  return (
    <g>
      {[
        [240, 250, "#C7B5F2", "#F7A8B8", 0],
        [520, 230, "#9FD0F0", "#F6CF6E", 1.5],
        [640, 300, "#F7A8B8", "#A9D4A1", 3],
      ].map(([x, y, a, b, d]) => (
        <g key={`${x}`} style={animated ? { animation: `float 7s ease-in-out ${d}s infinite` } : undefined}>
          <g transform={`translate(${x} ${y})`}>
            <ellipse cx="-7" cy="-3" rx="9" ry="7" fill={a as string} />
            <ellipse cx="7" cy="-3" rx="9" ry="7" fill={b as string} />
            <ellipse cx="-5" cy="6" rx="5" ry="4" fill={b as string} />
            <ellipse cx="5" cy="6" rx="5" ry="4" fill={a as string} />
            <rect x="-1" y="-8" width="2" height="16" rx="1" fill={INK} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** A single garden item on its own (shop cards, album). */
export function GardenItemIcon({ id, size = 96 }: { id: string; size?: number }) {
  const art = GARDEN_ART[id];
  if (!art) return null;
  const [x, y, w, h] = art.box;
  const side = Math.max(w, h);
  const vx = x - (side - w) / 2;
  const vy = y - (side - h) / 2;
  return (
    <svg viewBox={`${vx} ${vy} ${side} ${side}`} width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {art.render()}
    </svg>
  );
}
