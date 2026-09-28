import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { setMemoryStatus } from "@/lib/services/memories";

const Body = z.object({ status: z.enum(["pending", "approved", "excluded"]) });

/** Approve for activities, keep out of activities, or send back to review. */
export const POST = route<{ pid: string; mid: string }>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  const { status } = await readJson(req, Body);
  await setMemoryStatus(caregiver.id, patient, mid, status);
  return json({ ok: true, status });
});
