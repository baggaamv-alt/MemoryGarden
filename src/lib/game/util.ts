/** Small deterministic helpers shared by the generators (seeded so an activity can be reproduced). */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function makeIdFactory(rng: () => number) {
  const used = new Set<string>();
  return function rid() {
    for (;;) {
      let s = "";
      for (let i = 0; i < 8; i++) s += ALPHABET[Math.floor(rng() * ALPHABET.length)];
      if (!used.has(s)) {
        used.add(s);
        return s;
      }
    }
  };
}

export function uniqueBy<T>(items: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function joinList(items: string[], and: string) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}
