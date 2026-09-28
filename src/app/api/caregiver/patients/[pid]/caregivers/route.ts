import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { addCaregiverByEmail } from "@/lib/services/caregiver";

const Body = z.object({ email: z.string().trim().email(), relationship: z.string().trim().max(60).default("Caregiver") });

export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const body = await readJson(req, Body);
  await addCaregiverByEmail(caregiver.id, pid, body.email, body.relationship);
  return json({ ok: true });
});
