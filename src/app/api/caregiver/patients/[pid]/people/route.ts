import { z } from "zod";
import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { listPeople, upsertPerson } from "@/lib/services/caregiver";

export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  await caregiverPatient(pid);
  return json({ people: await listPeople(pid, await deliveryFor(req)) });
});

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  relationshipKey: z.string().max(40).default("custom"),
  relationshipLabel: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const id = await upsertPerson(caregiver.id, pid, await readJson(req, Body));
  return json({ id }, { status: 201 });
});
