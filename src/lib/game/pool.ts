import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Executor } from "../db";
import {
  collectionItems,
  collections,
  dailyPairs,
  memories,
  memoryObjects,
  memoryPeople,
  people,
  type Collection,
  type CollectionItem,
  type DailyPair,
  type Memory,
  type Person,
} from "../db/schema";
import { errorMessage, isCloudinaryConfigured } from "../cloudinary/client";
import { searchMemories } from "../cloudinary/search";
import type { Box } from "../types";

export type PoolPerson = {
  personId: string;
  name: string;
  relationshipKey: string;
  relationshipLabel: string | null;
  face: Box | null;
};

export type PoolObject = { id: string; label: string; box: Box | null };

export type PoolMemory = Memory & {
  people: PoolPerson[];
  objects: PoolObject[];
  /** Found through Cloudinary Search (false = newly approved, search index still catching up). */
  indexed: boolean;
};

export type PoolStory = Collection & { items: (CollectionItem & { memory: PoolMemory | null; narration: PoolMemory | null })[] };

export type Pool = {
  patientId: string;
  patientCode: string;
  all: PoolMemory[];
  visual: PoolMemory[];
  photos: PoolMemory[];
  audio: PoolMemory[];
  people: Person[];
  stories: PoolStory[];
  albums: PoolStory[];
  pairs: DailyPair[];
  source: "cloudinary-search" | "mixed" | "database";
  searchError?: string;
};

/** Memories the caregiver approved for activities. The database is authoritative for consent. */
async function eligibleMemories(exec: Executor, patientId: string) {
  return exec
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.patientId, patientId),
        eq(memories.status, "approved"),
        eq(memories.gameEligible, true),
        eq(memories.sensitive, false),
      ),
    );
}

async function attachLabels(exec: Executor, rows: Memory[]) {
  const ids = rows.map((m) => m.id);
  const peopleRows = ids.length
    ? await exec
        .select({ link: memoryPeople, person: people })
        .from(memoryPeople)
        .innerJoin(people, eq(people.id, memoryPeople.personId))
        .where(inArray(memoryPeople.memoryId, ids))
    : [];
  const objectRows = ids.length ? await exec.select().from(memoryObjects).where(inArray(memoryObjects.memoryId, ids)) : [];
  return rows.map((m) => ({
    ...m,
    people: peopleRows
      .filter((r) => r.link.memoryId === m.id)
      .map((r) => ({
        personId: r.person.id,
        name: r.person.name,
        relationshipKey: r.person.relationshipKey,
        relationshipLabel: r.person.relationshipLabel,
        face: r.link.face ?? null,
      })),
    objects: objectRows
      .filter((o) => o.memoryId === m.id)
      .map((o) => ({ id: o.id, label: o.label, box: o.box ?? null })),
    indexed: false,
  }));
}

/**
 * Retrieval for activities: Cloudinary Search API first (patient ID + eligibility in structured
 * metadata), joined with the caregiver's labels. Memories approved moments ago may not be in the
 * search index yet; they are still included (flagged `indexed: false`) so nothing "disappears".
 */
export async function loadPool(exec: Executor, patient: { id: string; code: string }): Promise<Pool> {
  const dbRows = await eligibleMemories(exec, patient.id);
  let source: Pool["source"] = "database";
  let searchError: string | undefined;
  const found = new Set<string>();

  if (isCloudinaryConfigured() && dbRows.length > 0) {
    try {
      const res = await searchMemories({ patientCode: patient.code, eligibleOnly: true, maxResults: 500 });
      for (const r of res.resources) found.add(r.public_id);
      const allFound = dbRows.every((m) => found.has(m.publicId));
      source = allFound ? "cloudinary-search" : found.size > 0 ? "mixed" : "database";
    } catch (err) {
      searchError = errorMessage(err);
      console.warn("[pool] Cloudinary search unavailable, using database records:", searchError);
    }
  }

  const labelled = (await attachLabels(exec, dbRows)).map((m) => ({ ...m, indexed: found.has(m.publicId) }));
  // Search-found memories first, then the ones still being indexed.
  labelled.sort((a, b) => Number(b.indexed) - Number(a.indexed));

  const byId = new Map(labelled.map((m) => [m.id, m]));
  const peopleRows = await exec.select().from(people).where(eq(people.patientId, patient.id));

  const cols = await exec.select().from(collections).where(eq(collections.patientId, patient.id));
  const items = cols.length
    ? await exec
        .select()
        .from(collectionItems)
        .where(inArray(collectionItems.collectionId, cols.map((c) => c.id)))
        .orderBy(asc(collectionItems.position))
    : [];
  const withItems = cols.map((c) => ({
    ...c,
    items: items
      .filter((i) => i.collectionId === c.id)
      .map((i) => ({
        ...i,
        memory: byId.get(i.memoryId) ?? null,
        narration: i.narrationMemoryId ? byId.get(i.narrationMemoryId) ?? null : null,
      })),
  }));

  const pairRows = await exec.select().from(dailyPairs).where(eq(dailyPairs.patientId, patient.id));
  const pairs = pairRows.filter((p) => byId.has(p.leftMemoryId) && byId.has(p.rightMemoryId));

  return {
    patientId: patient.id,
    patientCode: patient.code,
    all: labelled,
    visual: labelled.filter((m) => m.mediaType !== "audio"),
    photos: labelled.filter((m) => m.mediaType === "photo"),
    audio: labelled.filter((m) => m.mediaType === "audio"),
    people: peopleRows,
    stories: withItems.filter((c) => c.kind === "story"),
    albums: withItems.filter((c) => c.kind === "album"),
    pairs,
    source,
    searchError,
  };
}

/** Database-only snapshot used to decide which destinations have enough content (no API calls). */
export async function loadPoolSnapshot(exec: Executor, patient: { id: string; code: string }): Promise<Pool> {
  const dbRows = await eligibleMemories(exec, patient.id);
  const labelled = await attachLabels(exec, dbRows);
  const byId = new Map(labelled.map((m) => [m.id, m]));
  const peopleRows = await exec.select().from(people).where(eq(people.patientId, patient.id));
  const cols = await exec.select().from(collections).where(eq(collections.patientId, patient.id));
  const items = cols.length
    ? await exec.select().from(collectionItems).where(inArray(collectionItems.collectionId, cols.map((c) => c.id)))
    : [];
  const withItems = cols.map((c) => ({
    ...c,
    items: items
      .filter((i) => i.collectionId === c.id)
      .map((i) => ({ ...i, memory: byId.get(i.memoryId) ?? null, narration: null })),
  }));
  const pairRows = await exec.select().from(dailyPairs).where(eq(dailyPairs.patientId, patient.id));
  return {
    patientId: patient.id,
    patientCode: patient.code,
    all: labelled,
    visual: labelled.filter((m) => m.mediaType !== "audio"),
    photos: labelled.filter((m) => m.mediaType === "photo"),
    audio: labelled.filter((m) => m.mediaType === "audio"),
    people: peopleRows,
    stories: withItems.filter((c) => c.kind === "story"),
    albums: withItems.filter((c) => c.kind === "album"),
    pairs: pairRows.filter((p) => byId.has(p.leftMemoryId) && byId.has(p.rightMemoryId)),
    source: "database",
  };
}
