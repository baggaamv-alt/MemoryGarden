import "server-only";
import crypto from "node:crypto";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb, type Executor } from "../db";
import {
  auditLog,
  collectionItems,
  dailyPairs,
  memories,
  memoryObjects,
  memoryPeople,
  people,
  type Memory,
} from "../db/schema";
import { badRequest, conflict, notFound } from "../api/http";
import { errorMessage, isCloudinaryConfigured } from "../cloudinary/client";
import {
  deleteAsset,
  moveAssetFolder,
  requestAiAnalysis,
  syncAssetDetails,
  uploadMemoryAsset,
} from "../cloudinary/assets";
import type { MetadataInput } from "../cloudinary/metadata";
import { invalidateSearchCache, isIndexed, searchMemories } from "../cloudinary/search";
import {
  audioSource,
  blurStage,
  faceCrop,
  hideRegion,
  photo,
  puzzle,
  regionCrop,
  thumb,
  videoSource,
  type DeliveryOptions,
} from "../cloudinary/urls";
import { relationshipLabel } from "../content/categories";
import { CATEGORIES, type AiInfo, type Box, type Category, type MediaType, type MemoryStatus } from "../types";
import { getPreferences } from "./preferences";

export type PatientKey = { id: string; code: string };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"];
const LIMITS: Record<MediaType, number> = { photo: 10 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 25 * 1024 * 1024 };

export function mediaTypeFor(mime: string, name: string): MediaType | null {
  const m = mime.toLowerCase();
  // Trust an explicit mime type first (a browser voice recording is "audio/webm").
  if (m.startsWith("audio/") || AUDIO_TYPES.includes(m)) return "audio";
  if (m.startsWith("video/") || VIDEO_TYPES.includes(m)) return "video";
  if (m.startsWith("image/") || IMAGE_TYPES.includes(m)) return "photo";
  if (/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(name)) return "photo";
  if (/\.(mp4|mov|m4v|3gp)$/i.test(name)) return "video";
  if (/\.(mp3|m4a|aac|wav|ogg|oga|weba|webm)$/i.test(name)) return "audio";
  return null;
}

export const cleanTags = (tags: string[]) =>
  [...new Set(tags.map((t) => t.trim().toLowerCase().replace(/[^a-z0-9ఀ-౿ _-]/g, "").replace(/\s+/g, "-")).filter(Boolean))].slice(0, 20);

async function audit(exec: Executor, actorId: string, patientId: string, action: string, target?: string, data: Record<string, unknown> = {}) {
  await exec.insert(auditLog).values({ actorId, patientId, action, target: target ?? null, data });
}

async function peopleFor(exec: Executor, memoryIds: string[]) {
  if (!memoryIds.length) return [];
  return exec
    .select({ link: memoryPeople, person: people })
    .from(memoryPeople)
    .innerJoin(people, eq(people.id, memoryPeople.personId))
    .where(inArray(memoryPeople.memoryId, memoryIds));
}

function metadataInput(m: Memory, patientCode: string, names: { name: string; relationship: string }[]): MetadataInput {
  return {
    patientCode,
    memoryId: m.id,
    mediaType: m.mediaType,
    category: m.category,
    event: m.event,
    year: m.year,
    people: names.map((n) => n.name),
    relationships: names.map((n) => (n.relationship ? `${n.name}: ${n.relationship}` : n.name)),
    location: m.location,
    language: m.language,
    importance: m.importance,
    caption: m.caption,
    gameEligible: m.gameEligible,
  };
}

/** Pushes tags, caption and structured metadata to Cloudinary and records the outcome. */
export async function syncToCloudinary(memoryId: string, patient: PatientKey) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(eq(memories.id, memoryId)).limit(1);
  if (!m) return;
  const links = await peopleFor(db, [m.id]);
  const names = links.map((l) => ({ name: l.person.name, relationship: relationshipLabel(l.person.relationshipKey, l.person.relationshipLabel, "en") }));
  try {
    await syncAssetDetails(m, {
      tags: [...m.tags, m.category, `patient-${patient.code.toLowerCase()}`, "memory-garden"],
      title: m.title,
      caption: m.caption,
      metadata: metadataInput(m, patient.code, names),
    });
    await db
      .update(memories)
      .set({ sync: { ...m.sync, metadataSynced: true, syncedAt: new Date().toISOString(), error: undefined } })
      .where(eq(memories.id, m.id));
  } catch (err) {
    await db.update(memories).set({ sync: { ...m.sync, metadataSynced: false, error: errorMessage(err) } }).where(eq(memories.id, m.id));
  }
  invalidateSearchCache(patient.code);
}

// ─── Listing & search ─────────────────────────────────────────

export type LibraryFilters = { status?: MemoryStatus | "all"; category?: string; mediaType?: MediaType; q?: string };

export async function listMemories(patient: PatientKey, filters: LibraryFilters, delivery: DeliveryOptions) {
  const db = await getDb();
  const where = [eq(memories.patientId, patient.id)];
  if (filters.status && filters.status !== "all") where.push(eq(memories.status, filters.status));
  if (filters.category) where.push(eq(memories.category, filters.category));
  if (filters.mediaType) where.push(eq(memories.mediaType, filters.mediaType));
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    where.push(or(ilike(memories.title, q), ilike(memories.event, q), ilike(memories.caption, q), ilike(memories.location, q))!);
  }
  const rows = await db.select().from(memories).where(and(...where)).orderBy(desc(memories.createdAt));
  return decorate(db, rows, delivery);
}

async function decorate(exec: Executor, rows: Memory[], delivery: DeliveryOptions) {
  const links = await peopleFor(exec, rows.map((r) => r.id));
  const objects = rows.length ? await exec.select().from(memoryObjects).where(inArray(memoryObjects.memoryId, rows.map((r) => r.id))) : [];
  const canSign = isCloudinaryConfigured();
  return rows.map((m) => ({
    id: m.id,
    mediaType: m.mediaType,
    title: m.title,
    category: m.category,
    event: m.event,
    year: m.year,
    status: m.status,
    sensitive: m.sensitive,
    gameEligible: m.gameEligible,
    favorite: m.favorite,
    importance: m.importance,
    tags: m.tags,
    caption: m.caption,
    hasAiSuggestion: m.ai?.caption?.status === "pending" || !!m.ai?.objects?.some((o) => o.status === "pending"),
    people: links.filter((l) => l.link.memoryId === m.id).map((l) => l.person.name),
    faces: m.faces.length,
    objects: objects.filter((o) => o.memoryId === m.id).length,
    linkedMemoryId: m.linkedMemoryId,
    sync: m.sync,
    createdAt: m.createdAt.toISOString(),
    thumb: canSign && m.mediaType !== "audio" ? thumb(m, m.title || "memory", 320, delivery) : null,
    audio: canSign && m.mediaType === "audio" ? audioSource(m) : null,
  }));
}

/** Caregiver library search powered by the Cloudinary Search API (tags + structured metadata). */
export async function searchLibrary(
  patient: PatientKey,
  params: { q?: string; category?: string; tag?: string; yearFrom?: number; yearTo?: number; eligibleOnly?: boolean },
  delivery: DeliveryOptions,
) {
  const res = await searchMemories(
    {
      patientCode: patient.code,
      text: params.q,
      categories: params.category ? [params.category] : undefined,
      tags: params.tag ? [params.tag] : undefined,
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      eligibleOnly: params.eligibleOnly,
      maxResults: 100,
    },
    { fresh: true },
  );
  const db = await getDb();
  const ids = res.resources.map((r) => r.public_id);
  const rows = ids.length
    ? await db.select().from(memories).where(and(eq(memories.patientId, patient.id), inArray(memories.publicId, ids)))
    : [];
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.publicId) ?? 0) - (order.get(b.publicId) ?? 0));
  return { expression: res.expression, total: res.total, items: await decorate(db, rows, delivery) };
}

// ─── Upload ───────────────────────────────────────────────────

export type NewMemoryFields = {
  title: string;
  category: Category;
  event?: string | null;
  year?: number | null;
  approxDate?: string | null;
  location?: string | null;
  language?: string;
  importance?: number;
  caption?: string | null;
  tags?: string[];
  linkedMemoryId?: string | null;
  linkedPersonId?: string | null;
  collectionId?: string | null;
  /** Origin of an imported memory, e.g. "legacy:photo:<id>". */
  sourceRef?: string | null;
};

export async function uploadMemory(
  caregiverId: string,
  patient: PatientKey,
  file: { buffer: Buffer; name: string; type: string; size: number },
  fields: NewMemoryFields,
  forceMediaType?: MediaType,
) {
  if (!isCloudinaryConfigured()) throw conflict("Cloudinary is not configured yet. Add your credentials to .env.local.", "cloudinary");
  const mediaType = forceMediaType ?? mediaTypeFor(file.type, file.name);
  if (!mediaType) throw badRequest("Please choose a photo, a short video or an audio clip.");
  if (file.size > LIMITS[mediaType]) {
    throw badRequest(`That file is too large. The limit for ${mediaType === "photo" ? "photos" : mediaType === "video" ? "videos" : "audio"} is ${Math.round(LIMITS[mediaType] / 1024 / 1024)} MB.`);
  }
  if (!CATEGORIES.includes(fields.category)) throw badRequest("Please choose a category.");
  const db = await getDb();
  if (fields.linkedMemoryId) {
    const [target] = await db
      .select({ id: memories.id })
      .from(memories)
      .where(and(eq(memories.id, fields.linkedMemoryId), eq(memories.patientId, patient.id)))
      .limit(1);
    if (!target) throw badRequest("The linked photo was not found.");
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const tags = cleanTags(fields.tags ?? []);
  const base: Omit<Memory, "createdAt" | "updatedAt"> = {
    id,
    patientId: patient.id,
    mediaType,
    resourceType: mediaType === "photo" ? "image" : "video",
    deliveryType: "authenticated",
    publicId: "",
    assetId: null,
    version: null,
    format: null,
    width: null,
    height: null,
    duration: null,
    bytes: null,
    assetFolder: null,
    originalFilename: file.name.slice(0, 200),
    category: fields.category,
    title: fields.title.trim().slice(0, 120),
    event: fields.event?.trim() || null,
    year: fields.year ?? null,
    approxDate: fields.approxDate?.trim() || null,
    location: fields.location?.trim() || null,
    language: fields.language || "en",
    importance: Math.min(5, Math.max(1, fields.importance ?? 3)),
    caption: fields.caption?.trim() || null,
    tags,
    faces: [],
    ai: {},
    status: "pending",
    sensitive: false,
    gameEligible: false,
    favorite: false,
    favoritedAt: null,
    linkedMemoryId: fields.linkedMemoryId ?? null,
    linkedPersonId: fields.linkedPersonId ?? null,
    sync: { metadataSynced: false },
    createdBy: caregiverId,
    sourceRef: fields.sourceRef ?? null,
  };

  const uploaded = await uploadMemoryAsset({
    buffer: file.buffer,
    memoryId: id,
    mediaType,
    title: base.title,
    caption: base.caption,
    tags: [...tags, fields.category, `patient-${patient.code.toLowerCase()}`, "memory-garden"],
    metadata: metadataInput(base as Memory, patient.code, []),
  });

  const row: typeof memories.$inferInsert = {
    ...base,
    publicId: uploaded.publicId,
    assetId: uploaded.assetId,
    version: uploaded.version,
    format: uploaded.format,
    width: uploaded.width,
    height: uploaded.height,
    duration: uploaded.duration,
    bytes: uploaded.bytes,
    resourceType: uploaded.resourceType,
    deliveryType: uploaded.deliveryType,
    assetFolder: uploaded.assetFolder,
    faces: uploaded.faces,
    sync: {
      metadataSynced: uploaded.metadataApplied,
      syncedAt: uploaded.metadataApplied ? new Date().toISOString() : undefined,
      error: uploaded.metadataError,
    },
  };
  await db.transaction(async (tx) => {
    await tx.insert(memories).values(row);
    if (fields.collectionId) {
      const existing = await tx.select().from(collectionItems).where(eq(collectionItems.collectionId, fields.collectionId));
      await tx.insert(collectionItems).values({
        id: crypto.randomUUID(),
        collectionId: fields.collectionId,
        memoryId: id,
        position: existing.length,
      });
    }
    await audit(tx, caregiverId, patient.id, "memory.upload", id, { mediaType, category: fields.category, publicId: uploaded.publicId });
  });
  invalidateSearchCache(patient.code);

  // Optional AI suggestions (captions / objects) — stored for review, never used until approved.
  const prefs = await getPreferences(db, patient.id);
  if (mediaType === "photo" && prefs.consent.aiSuggestions && aiEnabled()) {
    await analyzeMemory(caregiverId, patient, id).catch(() => undefined);
  }
  const [saved] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
  return saved;
}

export function aiEnabled() {
  return process.env.MG_AI_CAPTIONING === "true" || !!process.env.MG_AI_OBJECT_DETECTION?.trim();
}

// ─── Detail ───────────────────────────────────────────────────

export async function memoryDetail(patient: PatientKey, memoryId: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  const links = await peopleFor(db, [m.id]);
  const objects = await db.select().from(memoryObjects).where(eq(memoryObjects.memoryId, m.id)).orderBy(asc(memoryObjects.createdAt));
  const allPeople = await db.select().from(people).where(eq(people.patientId, patient.id)).orderBy(asc(people.name));
  const audioClips = await db
    .select()
    .from(memories)
    .where(and(eq(memories.patientId, patient.id), eq(memories.mediaType, "audio"), eq(memories.linkedMemoryId, m.id)));
  const canSign = isCloudinaryConfigured();
  const visual = m.mediaType !== "audio";
  const alt = m.title || "memory";

  const previews = canSign && visual
    ? {
        display: photo(m, alt, delivery),
        blur: [1600, 800, 300, 0].map((s) => ({ strength: s, image: blurStage(m, s, alt, delivery) })),
        faces: m.faces.map((f, i) => ({ index: i, box: f, image: faceCrop(m, f, `face ${i + 1}`, 200, delivery) })),
        autoFace: m.mediaType === "photo" ? faceCrop(m, null, "auto face", 200, delivery) : null,
        objects: objects.filter((o) => o.box).map((o) => ({
          id: o.id,
          label: o.label,
          crop: regionCrop(m, o.box as Box, o.label, 200, delivery),
          hidden: hideRegion(m, o.box as Box, `${o.label} hidden`, delivery),
        })),
        puzzle: m.mediaType === "photo" ? puzzle(m, 2, 2, alt, delivery) : null,
        video: m.mediaType === "video" ? videoSource(m, delivery) : null,
      }
    : null;

  return {
    memory: {
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      favoritedAt: m.favoritedAt?.toISOString() ?? null,
    },
    audio: canSign && m.mediaType === "audio" ? audioSource(m) : null,
    people: links.map((l) => ({
      personId: l.person.id,
      name: l.person.name,
      relationship: relationshipLabel(l.person.relationshipKey, l.person.relationshipLabel, "en"),
      face: l.link.face,
      faceImage: canSign && visual ? faceCrop(m, l.link.face ?? null, l.person.name, 160, delivery) : null,
    })),
    objects: objects.map((o) => ({ id: o.id, label: o.label, box: o.box, source: o.source, confidence: o.confidence })),
    allPeople: allPeople.map((p) => ({
      id: p.id,
      name: p.name,
      relationship: relationshipLabel(p.relationshipKey, p.relationshipLabel, "en"),
    })),
    audioClips: audioClips.map((a) => ({ id: a.id, title: a.title, src: canSign ? audioSource(a) : null, status: a.status })),
    previews,
    aiAvailable: aiEnabled(),
  };
}

// ─── Edits ────────────────────────────────────────────────────

export type MemoryPatch = Partial<{
  title: string;
  category: Category;
  event: string | null;
  year: number | null;
  approxDate: string | null;
  location: string | null;
  language: string;
  importance: number;
  caption: string | null;
  tags: string[];
  sensitive: boolean;
  linkedMemoryId: string | null;
  linkedPersonId: string | null;
}>;

export async function updateMemory(caregiverId: string, patient: PatientKey, memoryId: string, patch: MemoryPatch) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  if (patch.category && !CATEGORIES.includes(patch.category)) throw badRequest("Unknown category.");
  const next: Partial<Memory> = {
    ...patch,
    tags: patch.tags ? cleanTags(patch.tags) : undefined,
    title: patch.title !== undefined ? patch.title.trim().slice(0, 120) : undefined,
    importance: patch.importance !== undefined ? Math.min(5, Math.max(1, Math.round(patch.importance))) : undefined,
    updatedAt: new Date(),
  };
  if (patch.sensitive !== undefined) next.gameEligible = m.status === "approved" && !patch.sensitive;
  const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined));
  await db.update(memories).set(clean).where(eq(memories.id, m.id));
  await audit(db, caregiverId, patient.id, "memory.update", m.id, { fields: Object.keys(patch) });

  if (patch.category && patch.category !== m.category) {
    try {
      const folder = await moveAssetFolder(m, patient.code, patch.category);
      if (folder) await db.update(memories).set({ assetFolder: folder }).where(eq(memories.id, m.id));
    } catch (err) {
      console.warn("[memories] folder move failed", errorMessage(err));
    }
  }
  await syncToCloudinary(m.id, patient);
}

export async function setMemoryStatus(caregiverId: string, patient: PatientKey, memoryId: string, status: MemoryStatus) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  if (status === "approved" && !m.title.trim() && m.mediaType !== "audio") {
    throw badRequest("Please give this memory a short name before approving it — it's used in the activities.");
  }
  await db
    .update(memories)
    .set({ status, gameEligible: status === "approved" && !m.sensitive, updatedAt: new Date() })
    .where(eq(memories.id, m.id));
  await audit(db, caregiverId, patient.id, `memory.${status}`, m.id);
  await syncToCloudinary(m.id, patient);
}

export async function deleteMemory(caregiverId: string, patient: PatientKey, memoryId: string) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  let removedFromCloudinary = false;
  if (isCloudinaryConfigured()) {
    try {
      removedFromCloudinary = await deleteAsset(m);
    } catch (err) {
      throw conflict(`Cloudinary could not delete this file: ${errorMessage(err)}`, "cloudinary");
    }
  }
  await db.transaction(async (tx) => {
    await tx.update(memories).set({ linkedMemoryId: null }).where(eq(memories.linkedMemoryId, m.id));
    await tx.delete(dailyPairs).where(or(eq(dailyPairs.leftMemoryId, m.id), eq(dailyPairs.rightMemoryId, m.id)));
    await tx.update(collectionItems).set({ narrationMemoryId: null }).where(eq(collectionItems.narrationMemoryId, m.id));
    await tx.delete(memories).where(eq(memories.id, m.id));
    await audit(tx, caregiverId, patient.id, "memory.delete", m.id, { publicId: m.publicId, removedFromCloudinary });
  });
  invalidateSearchCache(patient.code);
  return { removedFromCloudinary };
}

// ─── People on a memory (faces are detected by Cloudinary, identities come from the caregiver) ─

export async function assignPerson(
  caregiverId: string,
  patient: PatientKey,
  memoryId: string,
  input: { personId?: string; newPerson?: { name: string; relationshipKey: string; relationshipLabel?: string | null }; face?: Box | null },
) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  let personId = input.personId;
  if (!personId && input.newPerson?.name.trim()) {
    personId = crypto.randomUUID();
    await db.insert(people).values({
      id: personId,
      patientId: patient.id,
      name: input.newPerson.name.trim().slice(0, 80),
      relationshipKey: input.newPerson.relationshipKey || "custom",
      relationshipLabel: input.newPerson.relationshipLabel?.trim() || null,
    });
  }
  if (!personId) throw badRequest("Choose a person or add a new one.");
  const [person] = await db.select().from(people).where(and(eq(people.id, personId), eq(people.patientId, patient.id))).limit(1);
  if (!person) throw notFound("Person not found.");
  const face = input.face ? normalizeBox(input.face, m) : null;
  await db
    .insert(memoryPeople)
    .values({ id: crypto.randomUUID(), memoryId: m.id, personId, face })
    .onConflictDoUpdate({ target: [memoryPeople.memoryId, memoryPeople.personId], set: { face } });
  await audit(db, caregiverId, patient.id, "memory.person.assign", m.id, { personId });
  await syncToCloudinary(m.id, patient);
  return personId;
}

export async function removePerson(caregiverId: string, patient: PatientKey, memoryId: string, personId: string) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  await db.delete(memoryPeople).where(and(eq(memoryPeople.memoryId, m.id), eq(memoryPeople.personId, personId)));
  await audit(db, caregiverId, patient.id, "memory.person.remove", m.id, { personId });
  await syncToCloudinary(m.id, patient);
}

function normalizeBox(box: Box, m: Memory): Box {
  const W = m.width ?? Number.MAX_SAFE_INTEGER;
  const H = m.height ?? Number.MAX_SAFE_INTEGER;
  const x = Math.max(0, Math.min(W - 1, Math.round(box.x)));
  const y = Math.max(0, Math.min(H - 1, Math.round(box.y)));
  const w = Math.max(4, Math.min(W - x, Math.round(box.w)));
  const h = Math.max(4, Math.min(H - y, Math.round(box.h)));
  return { x, y, w, h };
}

export async function addObject(caregiverId: string, patient: PatientKey, memoryId: string, input: { label: string; box?: Box | null }) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  const label = input.label.trim().slice(0, 60);
  if (!label) throw badRequest("Please name the thing in the photo.");
  const id = crypto.randomUUID();
  await db.insert(memoryObjects).values({ id, memoryId: m.id, label, box: input.box ? normalizeBox(input.box, m) : null, source: "caregiver" });
  await audit(db, caregiverId, patient.id, "memory.object.add", m.id, { label });
  return id;
}

export async function removeObject(caregiverId: string, patient: PatientKey, memoryId: string, objectId: string) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  await db.delete(memoryObjects).where(and(eq(memoryObjects.id, objectId), eq(memoryObjects.memoryId, m.id)));
  await audit(db, caregiverId, patient.id, "memory.object.remove", m.id, { objectId });
}

// ─── AI suggestions (optional add-ons; caregiver approval required) ─

export async function analyzeMemory(caregiverId: string, patient: PatientKey, memoryId: string) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  if (m.mediaType !== "photo") throw badRequest("AI suggestions are available for photos.");
  const prefs = await getPreferences(db, patient.id);
  if (!prefs.consent.aiSuggestions) throw conflict("AI suggestions are switched off in this patient's privacy settings.", "consent");
  const ai: AiInfo = { ...m.ai, requestedAt: new Date().toISOString(), error: undefined };
  try {
    const res = await requestAiAnalysis(m, {
      captioning: process.env.MG_AI_CAPTIONING === "true",
      objectModel: process.env.MG_AI_OBJECT_DETECTION?.trim() || undefined,
    });
    if (res.caption) ai.caption = { text: res.caption, status: "pending", at: new Date().toISOString() };
    if (res.objects.length) ai.objects = res.objects.map((o) => ({ ...o, status: "pending" as const }));
  } catch (err) {
    ai.error = errorMessage(err);
  }
  await db.update(memories).set({ ai }).where(eq(memories.id, m.id));
  await audit(db, caregiverId, patient.id, "memory.ai.request", m.id, { ok: !ai.error });
  return ai;
}

export async function reviewAi(
  caregiverId: string,
  patient: PatientKey,
  memoryId: string,
  input: { caption?: { action: "approve" | "dismiss"; text?: string }; object?: { index: number; action: "accept" | "dismiss"; label?: string } },
) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  const ai: AiInfo = JSON.parse(JSON.stringify(m.ai ?? {}));
  if (input.caption && ai.caption) {
    if (input.caption.action === "approve") {
      const text = (input.caption.text ?? ai.caption.text).trim();
      ai.caption.status = "approved";
      await db.update(memories).set({ caption: text, ai }).where(eq(memories.id, m.id));
      await audit(db, caregiverId, patient.id, "memory.ai.caption.approve", m.id);
      await syncToCloudinary(m.id, patient);
      return;
    }
    ai.caption.status = "dismissed";
  }
  if (input.object && ai.objects?.[input.object.index]) {
    const o = ai.objects[input.object.index];
    if (input.object.action === "accept") {
      o.status = "accepted";
      await db.insert(memoryObjects).values({
        id: crypto.randomUUID(),
        memoryId: m.id,
        label: (input.object.label ?? o.label).trim().slice(0, 60),
        box: normalizeBox(o.box, m),
        source: "ai",
        confidence: o.confidence,
      });
    } else o.status = "dismissed";
  }
  await db.update(memories).set({ ai }).where(eq(memories.id, m.id));
  await audit(db, caregiverId, patient.id, "memory.ai.review", m.id);
}

export async function checkSearchIndex(patient: PatientKey, memoryId: string) {
  const db = await getDb();
  const [m] = await db.select().from(memories).where(and(eq(memories.id, memoryId), eq(memories.patientId, patient.id))).limit(1);
  if (!m) throw notFound("Memory not found.");
  const indexed = await isIndexed(m.publicId);
  const sync = { ...m.sync, searchCheckedAt: new Date().toISOString(), searchIndexedAt: indexed ? m.sync.searchIndexedAt ?? new Date().toISOString() : m.sync.searchIndexedAt };
  await db.update(memories).set({ sync }).where(eq(memories.id, m.id));
  return { indexed, sync };
}
