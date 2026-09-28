import "server-only";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "../db";
import { patientProfiles, users } from "../db/schema";
import { requireCaregiverFor, requirePatient } from "../auth/session";
import type { DeliveryOptions } from "../cloudinary/urls";
import { getPreferences } from "../services/preferences";
import { notFound } from "./http";

/** The patient whose Memory Garden is open on this device. */
export async function patientRef() {
  const p = await requirePatient();
  return {
    patientId: p.patientId,
    code: p.profile.code,
    timezone: p.profile.timezone,
    addressAs: p.profile.addressAs,
  };
}

/**
 * Low-bandwidth delivery: honours the browser's Save-Data header, our client hint (slow
 * connection detected) and the patient's "save mobile data" preference.
 */
export async function deliveryFor(req: NextRequest, patientId?: string): Promise<DeliveryOptions> {
  if (req.headers.get("save-data") === "on" || req.headers.get("x-mg-save-data") === "1") return { saveData: true };
  if (patientId) {
    const db = await getDb();
    const prefs = await getPreferences(db, patientId);
    return { saveData: !!prefs.accessibility.lowBandwidth };
  }
  return {};
}

/** Caregiver with access to `patientId`, plus the patient's code/name/timezone. */
export async function caregiverPatient(patientId: string) {
  const ctx = await requireCaregiverFor(patientId);
  const db = await getDb();
  const [row] = await db
    .select({ name: users.name, code: patientProfiles.code, timezone: patientProfiles.timezone, addressAs: patientProfiles.addressAs })
    .from(patientProfiles)
    .innerJoin(users, eq(users.id, patientProfiles.patientId))
    .where(eq(patientProfiles.patientId, patientId))
    .limit(1);
  if (!row) throw notFound("Patient not found.");
  return {
    caregiver: ctx.user,
    session: ctx.session,
    link: ctx.link,
    patient: { id: patientId, code: row.code, name: row.name, timezone: row.timezone, addressAs: row.addressAs },
  };
}
