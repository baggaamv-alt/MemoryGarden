import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { auditLog, careLinks, collections, memories, memoryPeople, patientProfiles, people, users } from "../db/schema";
import { conflict, unauthorized } from "../api/http";
import { createPatient } from "../services/caregiver";
import { uploadMemory, type NewMemoryFields, type PatientKey } from "../services/memories";
import { RELATIONSHIPS } from "../content/categories";
import { CATEGORIES, type Category, type Lang } from "../types";
import type { LegacyPhoto, LegacySource } from "./source";

/** Maps the old backend's free-text relationship ("Mom", "Grandpa Joe") onto our relationship keys. */
const REL_SYNONYMS: Record<string, string> = {
  mom: "mother", mum: "mother", mother: "mother", amma: "mother", ma: "mother",
  dad: "father", father: "father", nanna: "father", papa: "father", appa: "father",
  husband: "husband", wife: "wife", son: "son", daughter: "daughter",
  grandson: "grandson", granddaughter: "granddaughter", grandchild: "great-grandchild",
  grandpa: "grandfather", grandfather: "grandfather", thatha: "grandfather", tatayya: "grandfather",
  grandma: "grandmother", grandmother: "grandmother", granny: "grandmother", ammamma: "grandmother", nanamma: "grandmother",
  brother: "elder-brother", anna: "elder-brother", annayya: "elder-brother", thammudu: "younger-brother",
  sister: "elder-sister", akka: "elder-sister", chelli: "younger-sister",
  uncle: "uncle", aunt: "aunt", aunty: "aunt", auntie: "aunt", cousin: "cousin",
  nephew: "nephew", niece: "niece", friend: "friend", neighbour: "neighbour", neighbor: "neighbour",
  "son-in-law": "son-in-law", "daughter-in-law": "daughter-in-law", caregiver: "caregiver",
};

export function mapRelationship(text: string): { key: string; label: string | null } {
  const clean = text.trim().toLowerCase();
  if (!clean) return { key: "custom", label: null };
  const known = RELATIONSHIPS.find((r) => r.key === clean || r.label.en.toLowerCase() === clean);
  if (known) return { key: known.key, label: null };
  const word = clean.split(/[\s(]/)[0];
  if (REL_SYNONYMS[clean]) return { key: REL_SYNONYMS[clean], label: null };
  if (REL_SYNONYMS[word]) return { key: REL_SYNONYMS[word], label: text.trim() };
  return { key: "custom", label: text.trim() };
}

const CATEGORY_SYNONYMS: Record<string, Category> = {
  festival: "festivals", festivals: "festivals", diwali: "festivals", deepavali: "festivals", sankranti: "festivals", ugadi: "festivals",
  celebration: "celebrations", celebrations: "celebrations", birthday: "celebrations", wedding: "celebrations", party: "celebrations",
  holiday: "travel", holidays: "travel", vacation: "travel", trip: "travel", travel: "travel",
  place: "places", places: "places", nature: "nature", outdoors: "nature", pets: "animals", pet: "animals", animals: "animals",
  school: "childhood", childhood: "childhood", kids: "childhood", friends: "friends", work: "work", office: "work",
  food: "food", cooking: "food", home: "home", house: "home", garden: "garden", music: "music", family: "family",
};

export function mapCategory(category: string, tags: string[]): Category {
  for (const candidate of [category, ...tags]) {
    const c = candidate.trim().toLowerCase();
    if ((CATEGORIES as readonly string[]).includes(c)) return c as Category;
    if (CATEGORY_SYNONYMS[c]) return CATEGORY_SYNONYMS[c];
  }
  return "other";
}

export type ImportReport = {
  patientId: string;
  patientCode: string;
  createdPatient: boolean;
  people: number;
  albums: number;
  memoriesCreated: number;
  alreadyImported: number;
  failed: { title: string; reason: string }[];
};

export type ImportDeps = {
  /** Downloads an old photo. The old backend delivered public `upload` URLs. */
  fetchPhoto: (photo: LegacyPhoto) => Promise<{ buffer: Buffer; type: string }>;
  /** Stores a memory (defaults to the normal Cloudinary upload pipeline). */
  upload: typeof uploadMemory;
};

async function defaultFetchPhoto(photo: LegacyPhoto) {
  const res = await fetch(photo.secureUrl);
  if (!res.ok) throw new Error(`Could not download the photo from Cloudinary (HTTP ${res.status}).`);
  return { buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? `image/${photo.format ?? "jpeg"}` };
}

/**
 * Brings one account from the previous backend into Memory Garden as a patient cared for by
 * `caregiverId`. The caregiver proves they own the old account with its email and password.
 * Photos are re-uploaded as private, face-detected, metadata-tagged assets (the originals are
 * left untouched) and arrive "Needs review" so the caregiver approves each one. Safe to re-run.
 */
export async function importLegacyAccount(
  caregiverId: string,
  source: LegacySource,
  input: { email: string; password: string; addressAs?: string; relationship?: string; language?: Lang },
  deps: Partial<ImportDeps> = {},
): Promise<ImportReport> {
  const fetchPhoto = deps.fetchPhoto ?? defaultFetchPhoto;
  const upload = deps.upload ?? uploadMemory;

  const legacy = await source.findUserByEmail(input.email);
  if (!legacy || !legacy.passwordHash || !(await bcrypt.compare(input.password, legacy.passwordHash))) {
    throw unauthorized("That email and password don't match an account in the previous backend.");
  }

  const db = await getDb();
  // Re-use the patient created by an earlier import of the same account (if this caregiver owns it).
  const linked = await db
    .select({ id: users.id, profile: users.profile })
    .from(users)
    .innerJoin(careLinks, eq(careLinks.patientId, users.id))
    .where(and(eq(careLinks.caregiverId, caregiverId), eq(users.role, "patient")));
  const existing = linked.find((u) => (u.profile as { legacyUserId?: string }).legacyUserId === legacy.id);
  let patient: PatientKey;
  let createdPatient = false;
  if (existing) {
    const [p] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, existing.id)).limit(1);
    patient = { id: existing.id, code: p.code };
  } else {
    const created = await createPatient(caregiverId, {
      name: legacy.name || "Imported profile",
      addressAs: input.addressAs?.trim() || legacy.name.split(" ")[0] || legacy.name,
      language: input.language ?? "en",
      relationship: input.relationship?.trim() || "Caregiver",
      starterPack: true,
    });
    await db
      .update(users)
      .set({ profile: { legacyUserId: legacy.id, importedFrom: "memory-app-backend" } })
      .where(eq(users.id, created.id));
    patient = { id: created.id, code: created.code };
    createdPatient = true;
  }

  const [oldPeople, oldAlbums, oldMemories] = await Promise.all([
    source.people(legacy.id),
    source.albums(legacy.id),
    source.memories(legacy.id),
  ]);

  // People (identities and relationships come from the family — never from image analysis).
  const personMap = new Map<string, string>();
  for (const p of oldPeople) {
    const ref = `legacy:person:${p.id}`;
    const [found] = await db.select({ id: people.id }).from(people).where(eq(people.sourceRef, ref)).limit(1);
    if (found) {
      personMap.set(p.id, found.id);
      continue;
    }
    const rel = mapRelationship(p.relationship);
    const id = crypto.randomUUID();
    await db.insert(people).values({
      id,
      patientId: patient.id,
      name: p.name.slice(0, 80) || "Someone",
      relationshipKey: rel.key,
      relationshipLabel: rel.label,
      sourceRef: ref,
    });
    personMap.set(p.id, id);
  }

  // Albums → caregiver albums (4+ approved photos later become a bonus trail on the map).
  const albumMap = new Map<string, string>();
  for (const a of oldAlbums) {
    const ref = `legacy:album:${a.id}`;
    const [found] = await db.select({ id: collections.id }).from(collections).where(eq(collections.sourceRef, ref)).limit(1);
    if (found) {
      albumMap.set(a.id, found.id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(collections).values({
      id,
      patientId: patient.id,
      kind: "album",
      title: a.title.slice(0, 80) || "Album",
      description: a.description || null,
      sourceRef: ref,
    });
    albumMap.set(a.id, id);
  }

  // Memories: the old model grouped several photos under one memory; here each photo is a memory.
  const report: ImportReport = {
    patientId: patient.id,
    patientCode: patient.code,
    createdPatient,
    people: personMap.size,
    albums: albumMap.size,
    memoriesCreated: 0,
    alreadyImported: 0,
    failed: [],
  };
  const refs = oldMemories.flatMap((m) => m.photos.map((p) => `legacy:photo:${p.id}`));
  const done = new Set(
    refs.length
      ? (await db.select({ ref: memories.sourceRef }).from(memories).where(inArray(memories.sourceRef, refs))).map((r) => r.ref)
      : [],
  );

  for (const m of oldMemories) {
    const category = mapCategory(m.category, m.tags);
    for (const [i, photo] of m.photos.entries()) {
      const ref = `legacy:photo:${photo.id}`;
      const title = (m.photos.length > 1 ? `${m.title} (${i + 1})` : m.title).slice(0, 120);
      if (done.has(ref)) {
        report.alreadyImported += 1;
        continue;
      }
      try {
        const file = await fetchPhoto(photo);
        const fields: NewMemoryFields = {
          title,
          category,
          event: m.eventName || null,
          year: m.year,
          caption: m.description || null,
          tags: m.tags,
          collectionId: m.albumId ? albumMap.get(m.albumId) ?? null : null,
          sourceRef: ref,
        };
        const saved = await upload(
          caregiverId,
          patient,
          { buffer: file.buffer, name: `${photo.publicId.split("/").pop() ?? "photo"}.${photo.format ?? "jpg"}`, type: file.type, size: file.buffer.length },
          fields,
          "photo",
        );
        const personIds = m.personIds.map((id) => personMap.get(id)).filter((x): x is string => !!x);
        if (personIds.length) {
          await db
            .insert(memoryPeople)
            .values(personIds.map((personId) => ({ id: crypto.randomUUID(), memoryId: saved.id, personId, face: null })))
            .onConflictDoNothing();
        }
        report.memoriesCreated += 1;
      } catch (err) {
        report.failed.push({ title, reason: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  await db.insert(auditLog).values({
    actorId: caregiverId,
    patientId: patient.id,
    action: "import.legacy",
    target: legacy.email,
    data: { ...report, failed: report.failed.length },
  });
  if (report.failed.length && !report.memoriesCreated && !report.alreadyImported && refs.length) {
    throw conflict(`None of the photos could be imported: ${report.failed[0].reason}`, "import_failed");
  }
  return report;
}
