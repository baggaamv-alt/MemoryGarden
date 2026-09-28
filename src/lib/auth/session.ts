import "server-only";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { authSessions, careLinks, patientProfiles, users } from "../db/schema";
import { ApiError, notFound, unauthorized } from "../api/http";

export const COOKIE = { caregiver: "mg_cg", patient: "mg_pt" } as const;
type Kind = keyof typeof COOKIE;

const TTL_MS: Record<Kind, number> = {
  caregiver: 1000 * 60 * 60 * 24 * 30, // 30 days
  patient: 1000 * 60 * 60 * 24 * 180, // patient mode stays open on a home tablet
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function startSession(opts: { kind: Kind; userId: string; patientId?: string; secure: boolean }) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS[opts.kind]);
  const db = await getDb();
  await db.insert(authSessions).values({
    id: hashToken(token),
    userId: opts.userId,
    kind: opts.kind,
    patientId: opts.patientId ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(COOKIE[opts.kind], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: opts.secure,
    path: "/",
    expires: expiresAt,
  });
}

async function readSessionRow(kind: Kind) {
  const jar = await cookies();
  const token = jar.get(COOKIE[kind])?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db.select().from(authSessions).where(eq(authSessions.id, hashToken(token))).limit(1);
  if (!row || row.kind !== kind || row.expiresAt.getTime() < Date.now()) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, row.id));
  }
  return row;
}

export async function endSession(kind: Kind) {
  const jar = await cookies();
  const token = jar.get(COOKIE[kind])?.value;
  if (token) {
    const db = await getDb();
    await db.delete(authSessions).where(eq(authSessions.id, hashToken(token)));
  }
  jar.delete(COOKIE[kind]);
}

export async function getCaregiver() {
  const session = await readSessionRow("caregiver");
  if (!session) return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.role !== "caregiver") return null;
  return { session, user };
}

export async function getPatientContext() {
  const session = await readSessionRow("patient");
  if (!session?.patientId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: users, profile: patientProfiles })
    .from(users)
    .innerJoin(patientProfiles, eq(patientProfiles.patientId, users.id))
    .where(eq(users.id, session.patientId))
    .limit(1);
  if (!row) return null;
  return { session, patientId: session.patientId, user: row.user, profile: row.profile };
}

export async function setCaregiverLock(sessionId: string, locked: boolean) {
  const db = await getDb();
  await db.update(authSessions).set({ locked }).where(eq(authSessions.id, sessionId));
}

// ─── Guards for route handlers ────────────────────────────────

export async function requireCaregiver(opts: { allowLocked?: boolean } = {}) {
  const c = await getCaregiver();
  if (!c) throw unauthorized();
  if (c.session.locked && !opts.allowLocked) {
    throw new ApiError(423, "The caregiver area is locked while Memory Garden is open for the patient.", "locked");
  }
  return c;
}

export async function requirePatientAccess(caregiverId: string, patientId: string) {
  const db = await getDb();
  const [link] = await db
    .select()
    .from(careLinks)
    .where(and(eq(careLinks.caregiverId, caregiverId), eq(careLinks.patientId, patientId)))
    .limit(1);
  if (!link) throw notFound("Patient not found.");
  return link;
}

/** Caregiver + access to the patient in the URL, in one call. */
export async function requireCaregiverFor(patientId: string) {
  const c = await requireCaregiver();
  const link = await requirePatientAccess(c.user.id, patientId);
  return { ...c, link };
}

export async function requirePatient() {
  const p = await getPatientContext();
  if (!p) throw unauthorized("Memory Garden isn't open for a patient on this device.");
  return p;
}

// ─── Guards for pages ─────────────────────────────────────────

export async function pageCaregiver() {
  const c = await getCaregiver();
  if (!c) redirect("/login");
  if (c.session.locked) redirect("/unlock");
  return c;
}

export async function pageCaregiverFor(patientId: string) {
  const c = await pageCaregiver();
  const db = await getDb();
  const [link] = await db
    .select()
    .from(careLinks)
    .where(and(eq(careLinks.caregiverId, c.user.id), eq(careLinks.patientId, patientId)))
    .limit(1);
  if (!link) redirect("/caregiver");
  return { ...c, link };
}

export async function pagePatient() {
  const p = await getPatientContext();
  if (!p) redirect("/");
  return p;
}
