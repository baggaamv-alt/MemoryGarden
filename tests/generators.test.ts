import { beforeAll, describe, expect, it } from "vitest";
import type { Pool, PoolMemory } from "@/lib/game/pool";
import { paramsFor } from "@/lib/game/challenge";
import { GENERATORS, isUnavailable } from "@/lib/game/generators";
import { contentCheck } from "@/lib/game/requirements";
import { mulberry32 } from "@/lib/game/util";
import type { GameType } from "@/lib/types";

// Signing URLs is local HMAC work — dummy credentials never touch the network.
beforeAll(() => {
  process.env.CLOUDINARY_URL = "cloudinary://123456789012345:test_secret_value@demo";
});

let n = 0;
function mem(over: Partial<PoolMemory>): PoolMemory {
  n += 1;
  return {
    id: `m${n}`, patientId: "p", mediaType: "photo", resourceType: "image", deliveryType: "authenticated",
    publicId: `memory-garden/patients/P001/family/m${n}`, assetId: null, version: 1712345678, format: "jpg",
    width: 1600, height: 1200, duration: null, bytes: 1000, assetFolder: null, originalFilename: null,
    category: "family", title: `Memory ${n}`, event: null, year: 1970 + n, approxDate: null, location: null,
    language: "en", importance: 3, caption: `Caption ${n}`, tags: n % 2 ? ["birthday"] : ["wedding"], faces: [],
    ai: {}, status: "approved", sensitive: false, gameEligible: true, favorite: false, favoritedAt: null,
    linkedMemoryId: null, linkedPersonId: null, sync: { metadataSynced: true }, createdBy: null,
    createdAt: new Date(), updatedAt: new Date(), people: [], objects: [], indexed: true, ...over,
  } as PoolMemory;
}

function pool(): Pool {
  const people = [
    { personId: "a", name: "Lakshmi", relationshipKey: "daughter", relationshipLabel: null, face: { x: 100, y: 100, w: 200, h: 200 } },
    { personId: "b", name: "Ravi", relationshipKey: "grandson", relationshipLabel: null, face: { x: 900, y: 200, w: 180, h: 180 } },
  ];
  const photos = [
    mem({ people: [people[0]], objects: [{ id: "o1", label: "cake", box: { x: 50, y: 600, w: 300, h: 300 } }, { id: "o2", label: "lamp", box: { x: 1000, y: 500, w: 200, h: 400 } }] }),
    mem({ people: [people[1]], objects: [{ id: "o3", label: "kite", box: { x: 200, y: 100, w: 300, h: 300 } }, { id: "o4", label: "bicycle", box: null }] }),
    mem({ category: "home" }),
    mem({ category: "festivals" }),
  ];
  const audio = mem({ mediaType: "audio", resourceType: "video", linkedMemoryId: photos[0].id, title: "Ravi says hello" });
  return {
    patientId: "p", patientCode: "P001", all: [...photos, audio], visual: photos, photos, audio: [audio],
    people: [], stories: [], albums: [], pairs: [], source: "cloudinary-search",
  };
}

const GAMES: GameType[] = ["memory-reveal", "who-is-this", "remember-scene", "memory-match", "find-memory", "whats-missing", "picture-puzzle", "memory-story", "sound-memory", "daily-life"];

describe("generators build playable activities from approved memories", () => {
  for (const game of GAMES) {
    it(game, async () => {
      const p = pool();
      const rounds = await GENERATORS[game]({ pool: p, game, level: null, params: paramsFor(2), lang: "en", rng: mulberry32(42), delivery: {}, starterPack: true, recent: new Set() });
      expect(isUnavailable(rounds), JSON.stringify(rounds)).toBe(false);
      if (isUnavailable(rounds)) return;
      expect(rounds.length).toBeGreaterThan(0);
      for (const r of rounds) {
        const json = JSON.stringify(r.view);
        // Signed, authenticated Cloudinary delivery — never a raw public URL.
        for (const url of json.match(/https:\/\/res\.cloudinary\.com[^"\s]+/g) ?? []) {
          expect(url).toContain("/authenticated/s--");
        }
        // The answer key is kept out of the browser view.
        if (r.key.kind === "choice") for (const id of r.key.correct) expect(json).toContain(id);
        expect(json.includes('"correct"')).toBe(false);
      }
      expect(contentCheck({ game }, p, true).ok).toBe(true);
    });
  }

  it("uses Cloudinary transformations as mechanics", async () => {
    const p = pool();
    const reveal = await GENERATORS["memory-reveal"]({ pool: p, game: "memory-reveal", level: null, params: paramsFor(1), lang: "en", rng: mulberry32(1), delivery: {}, starterPack: false, recent: new Set() });
    expect(JSON.stringify(reveal)).toContain("e_blur:900");
    const missing = await GENERATORS["whats-missing"]({ pool: p, game: "whats-missing", level: null, params: paramsFor(1), lang: "en", rng: mulberry32(1), delivery: { saveData: true }, starterPack: false, recent: new Set() });
    const s = JSON.stringify(missing);
    expect(s).toContain("e_blur_region:2000");
    expect(s).toContain("q_auto:eco");
  });

  it("says a place is still growing when content is missing", async () => {
    const p = { ...pool(), people: [] };
    p.photos = p.photos.map((m) => ({ ...m, people: [] }));
    p.visual = p.photos;
    const who = await GENERATORS["who-is-this"]({ pool: p, game: "who-is-this", level: null, params: paramsFor(1), lang: "en", rng: mulberry32(1), delivery: {}, starterPack: false, recent: new Set() });
    expect(isUnavailable(who)).toBe(true);
  });
});
