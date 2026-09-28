import { caregiverPatient, deliveryFor } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { listCollections, saveCollection } from "@/lib/services/caregiver";
import { CollectionBody } from "./schema";

export const GET = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  await caregiverPatient(pid);
  return json({ collections: await listCollections(pid, await deliveryFor(req)) });
});

export const POST = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const id = await saveCollection(caregiver.id, pid, await readJson(req, CollectionBody));
  return json({ id }, { status: 201 });
});
