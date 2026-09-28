import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { caregiverPatient } from "@/lib/api/context";
import { route } from "@/lib/api/http";
import { exportPatientData } from "@/lib/services/caregiver";

/** Downloads everything stored about the patient as JSON (media stays in Cloudinary). */
export const GET = route<{ pid: string }>(async (_req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver, patient } = await caregiverPatient(pid);
  const data = await exportPatientData(pid);
  const db = await getDb();
  await db.insert(auditLog).values({ actorId: caregiver.id, patientId: pid, action: "patient.export" });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="memory-garden-${patient.code}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
