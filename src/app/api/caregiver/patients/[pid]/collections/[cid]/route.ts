import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { deleteCollection, saveCollection } from "@/lib/services/caregiver";
import { CollectionBody } from "../schema";

type P = { pid: string; cid: string };

export const PUT = route<P>(async (req, ctx) => {
  const { pid, cid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await saveCollection(caregiver.id, pid, { ...(await readJson(req, CollectionBody)), id: cid });
  return json({ ok: true });
});

export const DELETE = route<P>(async (_req, ctx) => {
  const { pid, cid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  await deleteCollection(caregiver.id, pid, cid);
  return json({ ok: true });
});
