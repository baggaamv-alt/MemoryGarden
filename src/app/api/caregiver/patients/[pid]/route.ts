import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { deletePatient, patientOverview, updatePatientProfile } from "@/lib/services/caregiver";

export const GET = route<{ pid: string }>(async (_req, ctx) => {
  const { pid } = await ctx.params;
  await caregiverPatient(pid);
  return json(await patientOverview(pid));
});

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  addressAs: z.string().trim().max(40).optional(),
  birthYear: z.number().int().min(1900).max(2030).nullable().optional(),
  hometown: z.string().trim().max(80).nullable().optional(),
  about: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(60).optional(),
});

export const PATCH = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await updatePatientProfile(caregiver.id, pid, await readJson(req, Patch));
  return json({ ok: true });
});

const Delete = z.object({ confirm: z.literal(true), deleteMedia: z.boolean().default(true) });

export const DELETE = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const body = await readJson(req, Delete);
  return json(await deletePatient(caregiver.id, pid, { deleteMedia: body.deleteMedia }));
});
