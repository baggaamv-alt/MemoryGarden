import "server-only";
import crypto from "node:crypto";
import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";
import { getDb, dbKind } from "../db";
import {
  auditLog,
  careLinks,
  challengeOffers,
  characters,
  coinTransactions,
  collectionItems,
  collections,
  dailyPairs,
  gameSessions,
  gardenState,
  levelProgress,
  memories,
  memoryObjects,
  memoryPeople,
  patientBadges,
  patientProfiles,
  people,
  preferences,
  users,
  wallets,
} from "../db/schema";
import { badRequest, conflict, notFound } from "../api/http";
import { cloudName, DELIVERY_TYPE, errorMessage, folderMode, isCloudinaryConfigured, ROOT_FOLDER } from "../cloudinary/client";
import { deleteAsset } from "../cloudinary/assets";
import { ensureMetadataFields, metadataStatus } from "../cloudinary/metadata";
import { invalidateSearchCache, searchHealth } from "../cloudinary/search";
import { faceCrop, thumb, type DeliveryOptions } from "../cloudinary/urls";
import { relationshipLabel } from "../content/categories";
import { computeMap } from "../game/progress";
import { getWallet } from "../game/rewards";
import type { Category, Lang } from "../types";
import { defaultPreferences, getPreferences } from "./preferences";

// ─── Patients ─────────────────────────────────────────────────

export async function listPatients(caregiverId: string) {
  const db = await getDb();
  const rows = await db
    .select({ user: users, profile: patientProfiles, link: careLinks })
    .from(careLinks)
    .innerJoin(users, eq(users.id, careLinks.patientId))
    .innerJoin(patientProfiles, eq(patientProfiles.patientId, users.id))
    .where(eq(careLinks.caregiverId, caregiverId))
    .orderBy(asc(users.name));
  const ids = rows.map((r) => r.user.id);
  const counts = ids.length
    ? await db
        .select({ patientId: memories.patientId, status: memories.status, n: count() })
        .from(memories)
        .where(inArray(memories.patientId, ids))
        .groupBy(memories.patientId, memories.status)
    : [];
  const last = ids.length
    ? await db
        .select({ patientId: gameSessions.patientId, at: max(gameSessions.startedAt) })
        .from(gameSessions)
        .where(inArray(gameSessions.patientId, ids))
        .groupBy(gameSessions.patientId)
    : [];
  return rows.map((r) => {
    const c = (status: string) => Number(counts.find((x) => x.patientId === r.user.id && x.status === status)?.n ?? 0);
    return {
      id: r.user.id,
      name: r.user.name,
      code: r.profile.code,
      addressAs: r.profile.addressAs,
      relationship: r.link.relationship,
      role: r.link.role,
      memories: { approved: c("approved"), pending: c("pending"), excluded: c("excluded") },
      lastActivityAt: last.find((x) => x.patientId === r.user.id)?.at?.toISOString() ?? null,
    };
  });
}

async function nextPatientCode(): Promise<string> {
  const db = await getDb();
  const rows = await db.select({ code: patientProfiles.code }).from(patientProfiles);
  const nums = rows.map((r) => Number(r.code.replace(/\D/g, ""))).filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `P${String(next).padStart(3, "0")}`;
}

export type NewPatient = {
  name: string;
  addressAs: string;
  language: Lang;
  birthYear?: number | null;
  hometown?: string | null;
  about?: string | null;
  timezone?: string;
  relationship: string;
  starterPack: boolean;
};

export async function createPatient(caregiverId: string, input: NewPatient) {
  const db = await getDb();
  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await nextPatientCode();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id, role: "patient", name: input.name.trim(), preferredLanguage: input.language });
        await tx.insert(patientProfiles).values({
          patientId: id,
          code,
          addressAs: input.addressAs.trim() || input.name.trim(),
          birthYear: input.birthYear ?? null,
          hometown: input.hometown?.trim() || null,
          about: input.about?.trim() || null,
          timezone: input.timezone || "Asia/Kolkata",
          createdBy: caregiverId,
        });
        await tx.insert(careLinks).values({ caregiverId, patientId: id, relationship: input.relationship.trim() || "Caregiver", role: "owner" });
        await tx.insert(preferences).values(defaultPreferences(id, input.language, input.starterPack));
        await tx.insert(wallets).values({ patientId: id, balance: 0, lifetimeEarned: 0 });
        await tx.insert(gardenState).values({ patientId: id, grown: [], placed: [] });
        await tx.insert(auditLog).values({ actorId: caregiverId, patientId: id, action: "patient.create", target: code });
      });
      return { id, code };
    } catch (err) {
      if (/patient_profiles_code_unique|duplicate key/i.test(errorMessage(err)) && attempt < 4) continue;
      throw err;
    }
  }
  throw conflict("Could not create the profile. Please try again.");
}

export async function patientOverview(patientId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ user: users, profile: patientProfiles })
    .from(users)
    .innerJoin(patientProfiles, eq(patientProfiles.patientId, users.id))
    .where(eq(users.id, patientId))
    .limit(1);
  if (!row) throw notFound("Patient not found.");
  const prefs = await getPreferences(db, patientId);
  const wallet = await getWallet(db, patientId);
  const [character] = await db.select().from(characters).where(eq(characters.patientId, patientId)).limit(1);
  const counts = await db
    .select({ status: memories.status, mediaType: memories.mediaType, n: count() })
    .from(memories)
    .where(eq(memories.patientId, patientId))
    .groupBy(memories.status, memories.mediaType);
  const [peopleCount] = await db.select({ n: count() }).from(people).where(eq(people.patientId, patientId));
  const [badgeCount] = await db.select({ n: count() }).from(patientBadges).where(eq(patientBadges.patientId, patientId));
  const caregivers = await db
    .select({ name: users.name, email: users.email, relationship: careLinks.relationship, role: careLinks.role })
    .from(careLinks)
    .innerJoin(users, eq(users.id, careLinks.caregiverId))
    .where(eq(careLinks.patientId, patientId));
  const map = await computeMap(db, { id: patientId, code: row.profile.code }, prefs, "en");
  const c = (pred: (x: (typeof counts)[number]) => boolean) => counts.filter(pred).reduce((n, x) => n + Number(x.n), 0);
  return {
    patient: {
      id: row.user.id,
      name: row.user.name,
      code: row.profile.code,
      addressAs: row.profile.addressAs,
      birthYear: row.profile.birthYear,
      hometown: row.profile.hometown,
      about: row.profile.about,
      timezone: row.profile.timezone,
      createdAt: row.user.createdAt.toISOString(),
    },
    prefs,
    wallet: { balance: wallet.balance, lifetimeEarned: wallet.lifetimeEarned },
    character: character ? { name: character.name, appearance: character.appearance, equipped: character.equipped } : null,
    library: {
      total: c(() => true),
      approved: c((x) => x.status === "approved"),
      pending: c((x) => x.status === "pending"),
      excluded: c((x) => x.status === "excluded"),
      photos: c((x) => x.mediaType === "photo"),
      videos: c((x) => x.mediaType === "video"),
      audio: c((x) => x.mediaType === "audio"),
      people: Number(peopleCount?.n ?? 0),
    },
    badges: Number(badgeCount?.n ?? 0),
    caregivers,
    worlds: map.worlds.map((w) => ({
      id: w.id,
      name: w.name,
      icon: w.theme.icon,
      unlocked: w.unlocked,
      bonus: w.bonus,
      completed: w.completed,
      total: w.total,
      levels: w.levels.map((l) => ({ id: l.id, title: l.title, gameName: l.gameName, icon: l.icon, status: l.status, reason: l.growingReason })),
    })),
  };
}

export async function updatePatientProfile(
  caregiverId: string,
  patientId: string,
  patch: Partial<{ name: string; addressAs: string; birthYear: number | null; hometown: string | null; about: string | null; timezone: string }>,
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    if (patch.name?.trim()) await tx.update(users).set({ name: patch.name.trim(), updatedAt: new Date() }).where(eq(users.id, patientId));
    const profilePatch = Object.fromEntries(
      Object.entries({
        addressAs: patch.addressAs?.trim(),
        birthYear: patch.birthYear,
        hometown: patch.hometown,
        about: patch.about,
        timezone: patch.timezone,
      }).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(profilePatch).length) await tx.update(patientProfiles).set(profilePatch).where(eq(patientProfiles.patientId, patientId));
    await tx.insert(auditLog).values({ actorId: caregiverId, patientId, action: "patient.update", data: { fields: Object.keys(patch) } });
  });
}

export async function addCaregiverByEmail(ownerId: string, patientId: string, email: string, relationship: string) {
  const db = await getDb();
  const [other] = await db.select().from(users).where(and(eq(users.email, email.trim().toLowerCase()), eq(users.role, "caregiver"))).limit(1);
  if (!other) throw notFound("No caregiver account uses that email yet. Ask them to sign up first.");
  await db
    .insert(careLinks)
    .values({ caregiverId: other.id, patientId, relationship: relationship.trim() || "Caregiver", role: "member" })
    .onConflictDoNothing();
  await db.insert(auditLog).values({ actorId: ownerId, patientId, action: "patient.caregiver.add", target: other.email });
}

/** Removes the patient and everything about them. Optionally deletes their Cloudinary files too. */
export async function deletePatient(caregiverId: string, patientId: string, opts: { deleteMedia: boolean }) {
  const db = await getDb();
  const [link] = await db
    .select()
    .from(careLinks)
    .where(and(eq(careLinks.caregiverId, caregiverId), eq(careLinks.patientId, patientId)))
    .limit(1);
  if (!link || link.role !== "owner") throw conflict("Only the caregiver who created this profile can delete it.", "not_owner");
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, patientId)).limit(1);
  let deleted = 0;
  const failed: string[] = [];
  if (opts.deleteMedia && isCloudinaryConfigured()) {
    const rows = await db.select().from(memories).where(eq(memories.patientId, patientId));
    for (const m of rows) {
      try {
        if (await deleteAsset(m)) deleted += 1;
      } catch (err) {
        failed.push(`${m.title || m.publicId}: ${errorMessage(err)}`);
      }
    }
    if (failed.length) throw conflict(`Some files could not be removed from Cloudinary (${failed.length}). Nothing else was deleted.`, "cloudinary");
  }
  await db.delete(users).where(eq(users.id, patientId));
  await db.insert(auditLog).values({ actorId: caregiverId, patientId: null, action: "patient.delete", target: profile?.code, data: { mediaDeleted: deleted } });
  if (profile) invalidateSearchCache(profile.code);
  return { mediaDeleted: deleted };
}

/** Everything stored about a patient, as JSON (privacy: data portability). */
export async function exportPatientData(patientId: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, patientId)).limit(1);
  const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.patientId, patientId)).limit(1);
  const mems = await db.select().from(memories).where(eq(memories.patientId, patientId));
  const ids = mems.map((m) => m.id);
  return {
    exportedAt: new Date().toISOString(),
    patient: { id: user?.id, name: user?.name, ...profile },
    preferences: await getPreferences(db, patientId),
    memories: mems,
    people: await db.select().from(people).where(eq(people.patientId, patientId)),
    memoryPeople: ids.length ? await db.select().from(memoryPeople).where(inArray(memoryPeople.memoryId, ids)) : [],
    memoryObjects: ids.length ? await db.select().from(memoryObjects).where(inArray(memoryObjects.memoryId, ids)) : [],
    collections: await db.select().from(collections).where(eq(collections.patientId, patientId)),
    sessions: (await db.select().from(gameSessions).where(eq(gameSessions.patientId, patientId))).map((row) => ({ ...row, activity: undefined })),
    levelProgress: await db.select().from(levelProgress).where(eq(levelProgress.patientId, patientId)),
    coins: await db.select().from(coinTransactions).where(eq(coinTransactions.patientId, patientId)),
    challengeOffers: await db.select().from(challengeOffers).where(eq(challengeOffers.patientId, patientId)),
    auditLog: await db.select().from(auditLog).where(eq(auditLog.patientId, patientId)).orderBy(desc(auditLog.createdAt)),
  };
}

export async function recentAudit(patientId: string, limit = 30) {
  const db = await getDb();
  const rows = await db
    .select({ log: auditLog, actor: users.name })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(eq(auditLog.patientId, patientId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({ action: r.log.action, actor: r.actor ?? "—", at: r.log.createdAt.toISOString(), target: r.log.target }));
}

// ─── People ───────────────────────────────────────────────────

export async function listPeople(patientId: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const rows = await db.select().from(people).where(eq(people.patientId, patientId)).orderBy(asc(people.name));
  const links = rows.length
    ? await db
        .select({ link: memoryPeople, memory: memories })
        .from(memoryPeople)
        .innerJoin(memories, eq(memories.id, memoryPeople.memoryId))
        .where(inArray(memoryPeople.personId, rows.map((r) => r.id)))
    : [];
  const canSign = isCloudinaryConfigured();
  return rows.map((p) => {
    const mine = links.filter((l) => l.link.personId === p.id);
    const withFace = mine.find((l) => l.link.face) ?? mine[0];
    return {
      id: p.id,
      name: p.name,
      relationshipKey: p.relationshipKey,
      relationshipLabel: p.relationshipLabel,
      relationship: relationshipLabel(p.relationshipKey, p.relationshipLabel, "en"),
      relationshipTe: relationshipLabel(p.relationshipKey, p.relationshipLabel, "te"),
      notes: p.notes,
      photos: mine.length,
      approvedPhotos: mine.filter((l) => l.memory.status === "approved" && !l.memory.sensitive).length,
      face:
        canSign && withFace && withFace.memory.mediaType === "photo"
          ? faceCrop(withFace.memory, withFace.link.face ?? null, p.name, 160, delivery)
          : null,
    };
  });
}

export async function upsertPerson(
  caregiverId: string,
  patientId: string,
  input: { id?: string; name: string; relationshipKey: string; relationshipLabel?: string | null; notes?: string | null },
) {
  const db = await getDb();
  const name = input.name.trim().slice(0, 80);
  if (!name) throw badRequest("Please enter a name.");
  if (input.id) {
    const res = await db
      .update(people)
      .set({ name, relationshipKey: input.relationshipKey || "custom", relationshipLabel: input.relationshipLabel?.trim() || null, notes: input.notes?.trim() || null })
      .where(and(eq(people.id, input.id), eq(people.patientId, patientId)))
      .returning({ id: people.id });
    if (!res.length) throw notFound("Person not found.");
    await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "person.update", target: input.id });
    return input.id;
  }
  const id = crypto.randomUUID();
  await db.insert(people).values({
    id,
    patientId,
    name,
    relationshipKey: input.relationshipKey || "custom",
    relationshipLabel: input.relationshipLabel?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "person.create", target: id });
  return id;
}

export async function deletePerson(caregiverId: string, patientId: string, personId: string) {
  const db = await getDb();
  await db.delete(people).where(and(eq(people.id, personId), eq(people.patientId, patientId)));
  await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "person.delete", target: personId });
}

// ─── Albums & stories ─────────────────────────────────────────

export async function listCollections(patientId: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const cols = await db.select().from(collections).where(eq(collections.patientId, patientId)).orderBy(desc(collections.updatedAt));
  const items = cols.length
    ? await db
        .select({ item: collectionItems, memory: memories })
        .from(collectionItems)
        .innerJoin(memories, eq(memories.id, collectionItems.memoryId))
        .where(inArray(collectionItems.collectionId, cols.map((c) => c.id)))
        .orderBy(asc(collectionItems.position))
    : [];
  const canSign = isCloudinaryConfigured();
  return cols.map((c) => ({
    id: c.id,
    kind: c.kind,
    title: c.title,
    description: c.description,
    category: c.category,
    items: items
      .filter((i) => i.item.collectionId === c.id)
      .map((i) => ({
        id: i.item.id,
        memoryId: i.memory.id,
        title: i.memory.title,
        status: i.memory.status,
        caption: i.item.caption,
        memoryCaption: i.memory.caption,
        narrationMemoryId: i.item.narrationMemoryId,
        thumb: canSign && i.memory.mediaType !== "audio" ? thumb(i.memory, i.memory.title || "memory", 200, delivery) : null,
      })),
  }));
}

export async function saveCollection(
  caregiverId: string,
  patientId: string,
  input: {
    id?: string;
    kind: "album" | "story";
    title: string;
    description?: string | null;
    category?: Category | null;
    items: { memoryId: string; caption?: string | null; narrationMemoryId?: string | null }[];
  },
) {
  const db = await getDb();
  const title = input.title.trim().slice(0, 80);
  if (!title) throw badRequest("Please give it a title.");
  const memoryIds = [...new Set(input.items.flatMap((i) => [i.memoryId, i.narrationMemoryId].filter(Boolean) as string[]))];
  if (memoryIds.length) {
    const owned = await db
      .select({ id: memories.id })
      .from(memories)
      .where(and(eq(memories.patientId, patientId), inArray(memories.id, memoryIds)));
    if (owned.length !== memoryIds.length) throw badRequest("Some memories don't belong to this patient.");
  }
  const id = input.id ?? crypto.randomUUID();
  await db.transaction(async (tx) => {
    if (input.id) {
      const res = await tx
        .update(collections)
        .set({ title, kind: input.kind, description: input.description?.trim() || null, category: input.category ?? null, updatedAt: new Date() })
        .where(and(eq(collections.id, input.id), eq(collections.patientId, patientId)))
        .returning({ id: collections.id });
      if (!res.length) throw notFound("Album not found.");
      await tx.delete(collectionItems).where(eq(collectionItems.collectionId, id));
    } else {
      await tx.insert(collections).values({
        id,
        patientId,
        kind: input.kind,
        title,
        description: input.description?.trim() || null,
        category: input.category ?? null,
      });
    }
    if (input.items.length) {
      await tx.insert(collectionItems).values(
        input.items.map((i, position) => ({
          id: crypto.randomUUID(),
          collectionId: id,
          memoryId: i.memoryId,
          position,
          caption: i.caption?.trim() || null,
          narrationMemoryId: i.narrationMemoryId || null,
        })),
      );
    }
    await tx.insert(auditLog).values({ actorId: caregiverId, patientId, action: input.id ? "collection.update" : "collection.create", target: id });
  });
  return id;
}

export async function deleteCollection(caregiverId: string, patientId: string, id: string) {
  const db = await getDb();
  await db.delete(collections).where(and(eq(collections.id, id), eq(collections.patientId, patientId)));
  await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "collection.delete", target: id });
}

// ─── Daily Life pairs ─────────────────────────────────────────

export async function listDailyPairs(patientId: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const rows = await db.select().from(dailyPairs).where(eq(dailyPairs.patientId, patientId)).orderBy(desc(dailyPairs.createdAt));
  const ids = [...new Set(rows.flatMap((r) => [r.leftMemoryId, r.rightMemoryId]))];
  const mems = ids.length ? await db.select().from(memories).where(inArray(memories.id, ids)) : [];
  const byId = new Map(mems.map((m) => [m.id, m]));
  const canSign = isCloudinaryConfigured();
  return rows.map((r) => ({
    id: r.id,
    leftLabel: r.leftLabel,
    rightLabel: r.rightLabel,
    left: canSign && byId.get(r.leftMemoryId) ? thumb(byId.get(r.leftMemoryId)!, r.leftLabel, 160, delivery) : null,
    right: canSign && byId.get(r.rightMemoryId) ? thumb(byId.get(r.rightMemoryId)!, r.rightLabel, 160, delivery) : null,
    ready: byId.get(r.leftMemoryId)?.status === "approved" && byId.get(r.rightMemoryId)?.status === "approved",
  }));
}

export async function createDailyPair(
  caregiverId: string,
  patientId: string,
  input: { leftMemoryId: string; leftLabel: string; rightMemoryId: string; rightLabel: string },
) {
  const db = await getDb();
  const owned = await db
    .select({ id: memories.id, mediaType: memories.mediaType })
    .from(memories)
    .where(and(eq(memories.patientId, patientId), inArray(memories.id, [input.leftMemoryId, input.rightMemoryId])));
  if (owned.length !== (input.leftMemoryId === input.rightMemoryId ? 1 : 2) || owned.some((o) => o.mediaType !== "photo")) {
    throw badRequest("Please choose two of this patient's photos.");
  }
  if (!input.leftLabel.trim() || !input.rightLabel.trim()) throw badRequest("Please name both pictures.");
  const id = crypto.randomUUID();
  await db.insert(dailyPairs).values({
    id,
    patientId,
    leftMemoryId: input.leftMemoryId,
    leftLabel: input.leftLabel.trim().slice(0, 60),
    rightMemoryId: input.rightMemoryId,
    rightLabel: input.rightLabel.trim().slice(0, 60),
  });
  await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "daily-pair.create", target: id });
  return id;
}

export async function deleteDailyPair(caregiverId: string, patientId: string, id: string) {
  const db = await getDb();
  await db.delete(dailyPairs).where(and(eq(dailyPairs.id, id), eq(dailyPairs.patientId, patientId)));
  await db.insert(auditLog).values({ actorId: caregiverId, patientId, action: "daily-pair.delete", target: id });
}

// ─── Cloudinary status ────────────────────────────────────────

export async function cloudinaryStatus(opts: { setup?: boolean } = {}) {
  if (!isCloudinaryConfigured()) {
    return { configured: false as const, database: dbKind() };
  }
  let created: string[] = [];
  let setupError: string | undefined;
  if (opts.setup) {
    try {
      created = (await ensureMetadataFields()).created;
    } catch (err) {
      setupError = errorMessage(err);
    }
  }
  const [mode, metadata, search] = await Promise.all([folderMode(), metadataStatus(), searchHealth()]);
  return {
    configured: true as const,
    cloudName: cloudName(),
    rootFolder: ROOT_FOLDER,
    deliveryType: DELIVERY_TYPE,
    folderMode: mode,
    metadata,
    search,
    created,
    setupError,
    database: dbKind(),
  };
}
