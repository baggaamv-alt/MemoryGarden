import { describe, expect, it } from "vitest";
import { MAX_LEVEL, paramsFor, shouldOffer, type SessionSummary } from "@/lib/game/challenge";
import { DEFAULT_CHALLENGE } from "@/lib/types";
import { en } from "@/lib/i18n/en";
import { te } from "@/lib/i18n/te";
import { t } from "@/lib/i18n";
import { mulberry32, shuffle, joinList } from "@/lib/game/util";
import { WORLDS, TOTAL_CORE_LEVELS } from "@/lib/game/worlds";
import { SHOP_ITEMS } from "@/lib/content/shop";
import { ITEM_ART } from "@/components/mimo/items";
import { GARDEN_ART } from "@/components/garden/art";

const ok = (level = 1): SessionSummary => ({ gameType: "memory-reveal", challengeLevel: level, status: "completed", roundsCompleted: 3, firstTryCorrect: 3, hintsUsed: 0, skips: 0 });

describe("challenge consent", () => {
  it("never offers before three comfortable sessions", () => {
    expect(shouldOffer(DEFAULT_CHALLENGE, "memory-reveal", [ok(), ok()])).toBeNull();
  });
  it("offers (never applies) a step up after three comfortable sessions", () => {
    expect(shouldOffer(DEFAULT_CHALLENGE, "memory-reveal", [ok(), ok(), ok()])).toEqual({ direction: "up", from: 1, to: 2 });
  });
  it("respects snooze after 'keep it familiar' and the caregiver ceiling", () => {
    expect(shouldOffer({ ...DEFAULT_CHALLENGE, snooze: { "memory-reveal": 3 } }, "memory-reveal", [ok(), ok(), ok()])).toBeNull();
    expect(shouldOffer({ ...DEFAULT_CHALLENGE, maxLevel: 1 }, "memory-reveal", [ok(), ok(), ok()])).toBeNull();
    expect(shouldOffer({ ...DEFAULT_CHALLENGE, offersEnabled: false }, "memory-reveal", [ok(), ok(), ok()])).toBeNull();
  });
  it("offers a gentler setting after effortful sessions", () => {
    const hard: SessionSummary = { ...ok(3), firstTryCorrect: 0, hintsUsed: 4 };
    const prefs = { ...DEFAULT_CHALLENGE, levels: { "memory-reveal": 3 } };
    expect(shouldOffer(prefs, "memory-reveal", [hard, hard])).toEqual({ direction: "down", from: 3, to: 2 });
  });
  it("keeps viewing self-paced by default", () => {
    expect(paramsFor(1).exposureSeconds).toBe(0);
    expect(paramsFor(3).exposureSeconds).toBe(0);
    expect(paramsFor(1, 15).exposureSeconds).toBe(15);
    expect(paramsFor(99).options).toBe(paramsFor(MAX_LEVEL).options);
  });
});

describe("content catalogs", () => {
  it("has 5 worlds × 10 levels with unique ids", () => {
    expect(WORLDS).toHaveLength(5);
    expect(TOTAL_CORE_LEVELS).toBe(50);
    const ids = WORLDS.flatMap((w) => w.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has artwork for every shop item", () => {
    for (const item of SHOP_ITEMS) {
      const drawn = item.category === "animation" || !!ITEM_ART[item.id] || !!GARDEN_ART[item.id];
      expect(drawn, item.id).toBe(true);
    }
  });
  it("translates every patient-facing string into Telugu", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(te[key], key).toBeTruthy();
    expect(t("te", "greet.explore", { name: "అమ్మ" })).toContain("అమ్మ");
  });
  it("never labels difficulty in patient text", () => {
    const all = [...Object.values(en), ...Object.values(te)].join(" ").toLowerCase();
    for (const word of [" easy", " medium", " hard ", "wrong", "incorrect", "fail"]) expect(all.includes(word), word).toBe(false);
  });
});

describe("utilities", () => {
  it("shuffles deterministically with a seed", () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(7))).toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(7)));
    expect(joinList(["a", "b", "c"], "and")).toBe("a, b and c");
  });
});
