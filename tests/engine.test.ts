import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// A throwaway embedded PostgreSQL; no Cloudinary needed for the illustrated starter cards.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mg-test-"));
process.env.PGLITE_DIR = dir;
delete process.env.DATABASE_URL;
delete process.env.CLOUDINARY_URL;
delete process.env.CLOUDINARY_CLOUD_NAME;

type Engine = typeof import("@/lib/game/engine");
let engine: Engine;
let patient: { patientId: string; code: string; timezone: string };

beforeAll(async () => {
  engine = await import("@/lib/game/engine");
  const { createPatient } = await import("@/lib/services/caregiver");
  const { getDb } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const db = await getDb();
  await db.insert(users).values({ id: "cg1", role: "caregiver", email: "t@test.test", name: "Tester", passwordHash: "x" });
  const p = await createPatient("cg1", { name: "Test Patient", addressAs: "Amma", language: "en", relationship: "Daughter", starterPack: true });
  patient = { patientId: p.id, code: p.code, timezone: "Asia/Kolkata" };
});

async function playDailyLife(opts: { wrongFirst?: boolean } = {}) {
  const view = await engine.startActivity(patient, { levelId: "w1-l3" }, {});
  expect(view.game).toBe("daily-life");
  const { getDb } = await import("@/lib/db");
  const { gameSessions } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await (await getDb()).select().from(gameSessions).where(eq(gameSessions.id, view.id));
  const key = (row.activity as { rounds: { key: { kind: string; pairs: [string, string][] } }[] }).rounds[0].key;
  if (opts.wrongFirst) {
    const [a] = key.pairs[0];
    const [, b] = key.pairs[1];
    const res = await engine.answerRound(patient.patientId, view.id, 0, { kind: "match", a, b });
    // Gentle, never negative.
    expect(res.feedback?.tone).toBe("comfort");
    expect(res.feedback?.correct).toBe(false);
  }
  for (const [a, b] of key.pairs) {
    const res = await engine.answerRound(patient.patientId, view.id, 0, { kind: "match", a, b });
    expect(res.feedback?.correct).toBe(true);
  }
  return view.id;
}

describe("game engine (end to end on embedded PostgreSQL)", () => {
  it("rewards taking part, never removes coins, and is idempotent", async () => {
    const id = await playDailyLife({ wrongFirst: true });
    const summary = await engine.finishActivity(patient, id);
    expect(summary.status).toBe("completed");
    expect(summary.totalCoins).toBeGreaterThan(0);
    expect(summary.coins.every((c) => c.amount > 0)).toBe(true);
    expect(summary.badges.map((b) => b.id)).toContain("first-adventure");
    const again = await engine.finishActivity(patient, id);
    expect(again.balance).toBe(summary.balance);
  });

  it("skipping pays nothing and takes nothing", async () => {
    const view = await engine.startActivity(patient, { levelId: "w1-l3" }, {});
    await engine.answerRound(patient.patientId, view.id, 0, { kind: "skip" });
    const summary = await engine.finishActivity(patient, view.id);
    expect(summary.coins.filter((c) => c.reason !== "daily_adventure" && c.reason !== "badge")).toHaveLength(0);
  });

  it("asks before any change in challenge, and only changes on 'yes'", async () => {
    for (let i = 0; i < 3; i++) await engine.finishActivity(patient, await playDailyLife());
    const offer = await engine.pendingOffer(patient.patientId, "en");
    expect(offer?.direction).toBe("up");
    const { getDb } = await import("@/lib/db");
    const { getPreferences } = await import("@/lib/services/preferences");
    expect((await getPreferences(await getDb(), patient.patientId)).challenge.levels["daily-life"] ?? 1).toBe(1);
    await engine.respondToOffer(patient.patientId, offer!.id, "keep_familiar");
    expect((await getPreferences(await getDb(), patient.patientId)).challenge.levels["daily-life"] ?? 1).toBe(1);
  });

  it("hides answer keys and validates on the server", async () => {
    const view = await engine.startActivity(patient, { levelId: "w1-l3" }, {});
    expect(JSON.stringify(view)).not.toContain("pairs");
    await expect(engine.answerRound(patient.patientId, view.id, 0, { kind: "match", a: "nope", b: "nada" })).rejects.toThrow();
  });

  it("refuses places that are still growing (no photos yet)", async () => {
    await expect(engine.startActivity(patient, { levelId: "w1-l1" }, {})).rejects.toThrow(/photo/i);
  });
});
