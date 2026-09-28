import { z } from "zod";
import { deliveryFor, patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { openMemory, setFavorite } from "@/lib/services/play";

export const GET = route<{ mid: string }>(async (req, ctx) => {
  const { mid } = await ctx.params;
  const p = await patientRef();
  return json(await openMemory(p, mid, await deliveryFor(req, p.patientId)));
});

export const POST = route<{ mid: string }>(async (req, ctx) => {
  const { mid } = await ctx.params;
  const { favorite } = await readJson(req, z.object({ favorite: z.boolean() }));
  return json(await setFavorite(await patientRef(), mid, favorite));
});
