import { z } from "zod";
import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { createDailyPair, listDailyPairs } from "@/lib/services/caregiver";

export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  await caregiverPatient(pid);
  return json({ pairs: await listDailyPairs(pid, await deliveryFor(req)) });
});

const Body = z.object({
  leftMemoryId: z.string().max(64),
  leftLabel: z.string().trim().min(1).max(60),
  rightMemoryId: z.string().max(64),
  rightLabel: z.string().trim().min(1).max(60),
});

export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const id = await createDailyPair(caregiver.id, pid, await readJson(req, Body));
  return json({ id }, { status: 201 });
});
