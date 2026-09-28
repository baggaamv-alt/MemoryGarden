import { STARTER_PAIRS } from "../content/starter";
import { relationshipLabel } from "../content/categories";
import type { Category, GameType } from "../types";
import type { Pool, PoolMemory } from "./pool";
import type { LevelVariant } from "./worlds";
import { norm, uniqueBy } from "./util";

export type LevelScope = {
  game: GameType;
  variant?: LevelVariant;
  categories?: Category[];
  strict?: boolean;
  collectionId?: string;
};

/** Memories in scope for a destination: its album, or preferred categories first (then the rest unless strict). */
export function scopeFor(level: LevelScope | null, pool: Pool, list: PoolMemory[]): PoolMemory[] {
  if (!level) return list;
  if (level.collectionId) {
    const album = [...pool.albums, ...pool.stories].find((a) => a.id === level.collectionId);
    const ids = new Set(album?.items.map((i) => i.memoryId) ?? []);
    return list.filter((m) => ids.has(m.id));
  }
  const cats = level.categories ?? [];
  if (!cats.length) return list;
  const wantsPeople = cats.includes("family");
  const preferred = list.filter((m) => cats.includes(m.category as Category) || (wantsPeople && m.people.length > 0));
  if (level.strict) return preferred;
  return [...preferred, ...list.filter((m) => !preferred.includes(m))];
}

function personCount(list: PoolMemory[]) {
  const ids = new Set<string>();
  for (const m of list) {
    if (m.mediaType !== "photo") continue;
    for (const p of m.people) if (p.face || m.people.length === 1) ids.add(p.personId);
  }
  return ids.size;
}

/** Cheap, database-only check of whether a destination has enough approved content to play. */
export function contentCheck(level: LevelScope, pool: Pool, starterPack: boolean): { ok: boolean; reason?: string } {
  const visual = scopeFor(level, pool, pool.visual);
  const photos = scopeFor(level, pool, pool.photos);
  const fail = (reason: string) => ({ ok: false, reason });
  switch (level.game) {
    case "memory-reveal":
      return visual.length >= 1 ? { ok: true } : fail("Needs at least 1 approved photo.");
    case "who-is-this":
      return personCount(photos) >= 2 ? { ok: true } : fail("Needs at least 2 different people labelled in approved photos.");
    case "remember-scene":
      return photos.some((m) => uniqueBy(m.objects, (x) => norm(x.label)).length >= 2)
        ? { ok: true }
        : fail("Needs an approved photo with at least 2 labelled things in it.");
    case "whats-missing":
      return photos.some((m) => m.width && uniqueBy(m.objects.filter((x) => x.box), (x) => norm(x.label)).length >= 2)
        ? { ok: true }
        : fail("Needs an approved photo with at least 2 things marked with a box.");
    case "picture-puzzle":
      return photos.length >= 1 ? { ok: true } : fail("Needs at least 1 approved photo.");
    case "find-memory": {
      if (visual.length < 2) return fail("Needs at least 2 approved photos with tags or categories.");
      const cats = new Set(visual.map((m) => m.category));
      const tags = new Set(visual.flatMap((m) => m.tags));
      const distinguishing = cats.size > 1 || [...tags].some((tg) => visual.some((m) => !m.tags.includes(tg)));
      return distinguishing ? { ok: true } : fail("Needs photos with different tags or categories.");
    }
    case "memory-match": {
      const identical = visual.length >= 2;
      if (level.variant === "face-name") return personCount(photos) >= 2 || identical ? { ok: true } : fail("Needs at least 2 approved photos.");
      if (level.variant === "person-relationship") {
        const rels = new Set<string>();
        for (const m of photos) for (const p of m.people) {
          const r = relationshipLabel(p.relationshipKey, p.relationshipLabel, "en");
          if (r && (p.face || m.people.length === 1)) rels.add(norm(r));
        }
        return rels.size >= 2 || identical ? { ok: true } : fail("Needs at least 2 approved photos.");
      }
      return identical ? { ok: true } : fail("Needs at least 2 approved photos.");
    }
    case "memory-story": {
      if (level.variant === "timeline") {
        const years = new Set(visual.filter((m) => m.year).map((m) => m.year));
        return years.size >= 2 ? { ok: true } : fail("Needs at least 2 approved photos with different years.");
      }
      if (level.collectionId) {
        const album = [...pool.albums, ...pool.stories].find((a) => a.id === level.collectionId);
        return (album?.items.filter((i) => i.memory && i.memory.mediaType !== "audio").length ?? 0) >= 2
          ? { ok: true }
          : fail("Needs at least 2 approved memories in this album.");
      }
      const storyOk = pool.stories.some((s) => s.items.filter((i) => i.memory && i.memory.mediaType !== "audio").length >= 2);
      const captioned = visual.filter((m) => m.caption?.trim() || m.title?.trim()).length >= 2;
      return storyOk || captioned ? { ok: true } : fail("Needs a caregiver story, or at least 2 approved photos with captions.");
    }
    case "sound-memory": {
      const ids = new Set(pool.visual.map((m) => m.id));
      const linked = pool.audio.some((a) => a.linkedMemoryId && ids.has(a.linkedMemoryId));
      if (!linked) return fail("Needs an approved audio clip linked to a photo.");
      return pool.visual.length >= 2 ? { ok: true } : fail("Needs at least 2 approved photos.");
    }
    case "daily-life": {
      const set = level.variant === "festival" ? "festival" : level.variant === "nature" ? "nature" : "everyday";
      const starter = starterPack ? STARTER_PAIRS.filter((p) => p.set === set).length : 0;
      return pool.pairs.length + starter >= 2
        ? { ok: true }
        : fail("Needs the everyday starter cards, or at least 2 pairs made from personal photos.");
    }
  }
}
