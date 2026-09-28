import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { BoxSchema } from "@/lib/api/schemas";
import { addObject, removeObject } from "@/lib/services/memories";

type P = { pid: string; mid: string };

const Add = z.object({ label: z.string().trim().min(1).max(60), box: BoxSchema.nullable().optional() });

/** Caregiver-verified things in a photo (used by Remember the Scene and What's Missing?). */
export const POST = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  const id = await addObject(caregiver.id, patient, mid, await readJson(req, Add));
  return json({ ok: true, id });
});

export const DELETE = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  const { objectId } = await readJson(req, z.object({ objectId: z.string().max(64) }));
  await removeObject(caregiver.id, patient, mid, objectId);
  return json({ ok: true });
});
