import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { analyzeMemory, reviewAi } from "@/lib/services/memories";

type P = { pid: string; mid: string };

/** Ask the optional Cloudinary AI add-ons for suggestions (stored for review only). */
export const POST = route<P>(async (_req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  return json({ ai: await analyzeMemory(caregiver.id, patient, mid) });
});

const Review = z.object({
  caption: z.object({ action: z.enum(["approve", "dismiss"]), text: z.string().trim().max(1000).optional() }).optional(),
  object: z
    .object({ index: z.number().int().min(0), action: z.enum(["accept", "dismiss"]), label: z.string().trim().max(60).optional() })
    .optional(),
});

export const PATCH = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  await reviewAi(caregiver.id, patient, mid, await readJson(req, Review));
  return json({ ok: true });
});
