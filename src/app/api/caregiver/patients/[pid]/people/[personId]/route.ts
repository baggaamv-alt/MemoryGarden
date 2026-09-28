import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { deletePerson, upsertPerson } from "@/lib/services/caregiver";

type P = { pid: string; personId: string };

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  relationshipKey: z.string().max(40).default("custom"),
  relationshipLabel: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const PATCH = route<P>(async (req, ctx) => {
  const { pid, personId } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await upsertPerson(caregiver.id, pid, { ...(await readJson(req, Body)), id: personId });
  return json({ ok: true });
});

export const DELETE = route<P>(async (_req, ctx) => {
  const { pid, personId } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await deletePerson(caregiver.id, pid, personId);
  return json({ ok: true });
});
