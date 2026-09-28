import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { BoxSchema } from "@/lib/api/schemas";
import { assignPerson, removePerson } from "@/lib/services/memories";

type P = { pid: string; mid: string };

const Assign = z.object({
  personId: z.string().max(64).optional(),
  newPerson: z
    .object({
      name: z.string().trim().min(1).max(80),
      relationshipKey: z.string().max(40).default("custom"),
      relationshipLabel: z.string().trim().max(60).nullable().optional(),
    })
    .optional(),
  face: BoxSchema.nullable().optional(),
});

/** Links a caregiver-named person to a face Cloudinary detected (or one drawn by hand). */
export const POST = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  const personId = await assignPerson(caregiver.id, patient, mid, await readJson(req, Assign));
  return json({ ok: true, personId });
});

const Remove = z.object({ personId: z.string().max(64) });

export const DELETE = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  const { personId } = await readJson(req, Remove);
  await removePerson(caregiver.id, patient, mid, personId);
  return json({ ok: true });
});
