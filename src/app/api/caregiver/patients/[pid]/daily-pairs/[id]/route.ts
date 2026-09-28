import { caregiverPatient } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { deleteDailyPair } from "@/lib/services/caregiver";

export const DELETE = route<{ pid: string; id: string }>(async (_req, ctx) => {
  const { pid, id } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await deleteDailyPair(caregiver.id, pid, id);
  return json({ ok: true });
});
