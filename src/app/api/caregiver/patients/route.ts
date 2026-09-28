import { z } from "zod";
import { requireCaregiver } from "@/lib/auth/session";
import { json, readJson, route } from "@/lib/api/http";
import { createPatient, listPatients } from "@/lib/services/caregiver";

export const GET = route(async () => {
  const { user } = await requireCaregiver();
  return json({ patients: await listPatients(user.id) });
});

const Body = z.object({
  name: z.string().trim().min(1, "Please enter a name.").max(80),
  addressAs: z.string().trim().max(40).default(""),
  language: z.enum(["en", "te"]).default("en"),
  birthYear: z.number().int().min(1900).max(2030).nullable().optional(),
  hometown: z.string().trim().max(80).nullable().optional(),
  about: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(60).optional(),
  relationship: z.string().trim().max(60).default("Caregiver"),
  starterPack: z.boolean().default(true),
});

export const POST = route(async (req) => {
  const { user } = await requireCaregiver();
  const body = await readJson(req, Body);
  const created = await createPatient(user.id, body);
  return json(created, { status: 201 });
});
