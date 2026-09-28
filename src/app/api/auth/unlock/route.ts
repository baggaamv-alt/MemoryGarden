import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { endSession, requireCaregiver, setCaregiverLock } from "@/lib/auth/session";
import { clientIp, json, rateLimit, readJson, route, unauthorized } from "@/lib/api/http";

const Body = z.object({
  password: z.string().min(1).max(200),
  /** Also close Memory Garden (patient mode) on this device. */
  closePatientMode: z.boolean().optional(),
});

/** Re-opens the caregiver area after patient mode was started on this device. */
export const POST = route(async (req) => {
  const { session, user } = await requireCaregiver({ allowLocked: true });
  rateLimit(`unlock:${clientIp(req)}:${user.id}`, 8, 10 * 60 * 1000);
  const body = await readJson(req, Body);
  if (!(await verifyPassword(body.password, user.passwordHash))) throw unauthorized("That password doesn't match.");
  await setCaregiverLock(session.id, false);
  if (body.closePatientMode) await endSession("patient");
  return json({ ok: true });
});
