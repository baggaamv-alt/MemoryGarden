import { z } from "zod";
import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { CategorySchema, optionalText, optionalYear } from "@/lib/api/schemas";
import { deleteMemory, memoryDetail, updateMemory } from "@/lib/services/memories";

type P = { pid: string; mid: string };

export const GET = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient } = await caregiverPatient(pid);
  return json(await memoryDetail(patient, mid, await deliveryFor(req)));
});

const Patch = z.object({
  title: z.string().trim().max(120).optional(),
  category: CategorySchema.optional(),
  event: optionalText(120),
  year: optionalYear,
  approxDate: optionalText(60),
  location: optionalText(120),
  language: z.enum(["en", "te"]).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  caption: optionalText(1000),
  tags: z.array(z.string().max(40)).max(20).optional(),
  sensitive: z.boolean().optional(),
  linkedMemoryId: z.string().max(64).nullable().optional(),
  linkedPersonId: z.string().max(64).nullable().optional(),
});

export const PATCH = route<P>(async (req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  await updateMemory(caregiver.id, patient, mid, await readJson(req, Patch));
  return json(await memoryDetail(patient, mid, await deliveryFor(req)));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const { pid, mid } = await ctx.params;
  const { patient, caregiver } = await caregiverPatient(pid);
  return json(await deleteMemory(caregiver.id, patient, mid));
});
