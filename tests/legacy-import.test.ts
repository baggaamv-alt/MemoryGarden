import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import type { LegacySource } from "@/lib/legacy/source";

process.env.PGLITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mg-legacy-"));
delete process.env.DATABASE_URL;

type Importer = typeof import("@/lib/legacy/importer");
let importer: Importer;

const hash = bcrypt.hashSync("OldPassword#1", 4);
const source: LegacySource = {
  findUserByEmail: async (email) => (email === "old@user.test" ? { id: "u1", name: "Lakshmi Devi", email, passwordHash: hash } : null),
  people: async () => [
    { id: "p1", name: "Ravi", relationship: "Grandson" },
    { id: "p2", name: "Sita", relationship: "Mom" },
    { id: "p3", name: "Joe", relationship: "old neighbour from Guntur" },
  ],
  albums: async () => [{ id: "a1", title: "Tirupati trip", description: "" }],
  memories: async () => [
    {
      id: "m1", title: "Diwali 1998", description: "Lighting diyas together", year: 1998, eventName: "Diwali", category: "Festival",
      tags: ["diwali"], albumId: "a1", personIds: ["p1", "p2"],
      photos: [
        { id: "ph1", publicId: "memory-garden/users/u1/memories/a", secureUrl: "https://example.test/a.jpg", format: "jpg" },
        { id: "ph2", publicId: "memory-garden/users/u1/memories/b", secureUrl: "https://example.test/b.jpg", format: "jpg" },
      ],
    },
    { id: "m2", title: "School", description: "", year: null, eventName: "", category: "", tags: ["school"], albumId: null, personIds: [], photos: [{ id: "ph3", publicId: "x/c", secureUrl: "https://example.test/c.jpg", format: "png" }] },
  ],
  close: async () => undefined,
};

// Stores a memory row without Cloudinary (the real pipeline is covered by verify:cloudinary).
async function upload(caregiverId: string, patient: { id: string }, file: { name: string }, fields: { title: string; category: string; year?: number | null; sourceRef?: string | null; collectionId?: string | null }) {
  const { getDb } = await import("@/lib/db");
  const { memories, collectionItems } = await import("@/lib/db/schema");
  const db = await getDb();
  const id = crypto.randomUUID().slice(0, 20);
  const [row] = await db
    .insert(memories)
    .values({ id, patientId: patient.id, mediaType: "photo", resourceType: "image", deliveryType: "authenticated", publicId: `test/${id}`, title: fields.title, category: fields.category, year: fields.year ?? null, sourceRef: fields.sourceRef ?? null, createdBy: caregiverId, originalFilename: file.name })
    .returning();
  if (fields.collectionId) await db.insert(collectionItems).values({ id: crypto.randomUUID(), collectionId: fields.collectionId, memoryId: id, position: 0 });
  return row;
}

let caregiverId = "";
beforeAll(async () => {
  importer = await import("@/lib/legacy/importer");
  const { getDb } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  caregiverId = "cg-legacy";
  await (await getDb()).insert(users).values({ id: caregiverId, role: "caregiver", email: "cg@legacy.test", name: "Carer", passwordHash: "x" });
});

const deps = { fetchPhoto: async () => ({ buffer: Buffer.from("img"), type: "image/jpeg" }), upload: upload as never };

describe("previous-backend import", () => {
  it("maps relationships and categories", () => {
    expect(importer.mapRelationship("Mom")).toEqual({ key: "mother", label: null });
    expect(importer.mapRelationship("Grandson").key).toBe("grandson");
    expect(importer.mapRelationship("old neighbour from Guntur")).toEqual({ key: "custom", label: "old neighbour from Guntur" });
    expect(importer.mapCategory("Festival", [])).toBe("festivals");
    expect(importer.mapCategory("", ["school"])).toBe("childhood");
    expect(importer.mapCategory("misc", [])).toBe("other");
  });

  it("refuses the wrong password", async () => {
    await expect(importer.importLegacyAccount(caregiverId, source, { email: "old@user.test", password: "nope" }, deps)).rejects.toThrow(/don't match/);
  });

  it("imports photos as reviewable memories, with people and albums, and is idempotent", async () => {
    const first = await importer.importLegacyAccount(caregiverId, source, { email: "old@user.test", password: "OldPassword#1", addressAs: "Amma" }, deps);
    expect(first).toMatchObject({ createdPatient: true, people: 3, albums: 1, memoriesCreated: 3, alreadyImported: 0, failed: [] });

    const { getDb } = await import("@/lib/db");
    const { memories, memoryPeople, people } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const rows = await db.select().from(memories).where(eq(memories.patientId, first.patientId));
    expect(rows.map((r) => r.title).sort()).toEqual(["Diwali 1998 (1)", "Diwali 1998 (2)", "School"]);
    expect(rows.every((r) => r.status === "pending" && !r.gameEligible)).toBe(true);
    const links = await db.select().from(memoryPeople);
    expect(links).toHaveLength(4);
    const mom = (await db.select().from(people).where(eq(people.patientId, first.patientId))).find((p) => p.name === "Sita");
    expect(mom?.relationshipKey).toBe("mother");

    const again = await importer.importLegacyAccount(caregiverId, source, { email: "old@user.test", password: "OldPassword#1" }, deps);
    expect(again).toMatchObject({ createdPatient: false, patientId: first.patientId, memoriesCreated: 0, alreadyImported: 3 });
  });
});
