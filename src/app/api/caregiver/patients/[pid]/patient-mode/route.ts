import { caregiverPatient } from "@/lib/api/context";
import { endSession, setCaregiverLock, startSession } from "@/lib/auth/session";
import { isSecureRequest, json, route } from "@/lib/api/http";

/**
 * Opens Memory Garden for the patient on this device. The caregiver area locks until the
 * caregiver re-enters their password, so the patient can't wander into the dashboard.
 */
export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { session } = await caregiverPatient(pid);
  await endSession("patient");
  await startSession({ kind: "patient", userId: pid, patientId: pid, secure: isSecureRequest(req) });
  await setCaregiverLock(session.id, true);
  return json({ ok: true, redirect: "/play" });
});
