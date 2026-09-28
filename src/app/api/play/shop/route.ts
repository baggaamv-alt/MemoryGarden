import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { buyItem, shopState } from "@/lib/services/play";

export const GET = route(async () => json(await shopState(await patientRef())));

/** Purchases use earned Memory Coins only — there are no real-money purchases anywhere. */
export const POST = route(async (req) => {
  const { itemId } = await readJson(req, z.object({ itemId: z.string().max(64) }));
  return json(await buyItem(await patientRef(), itemId));
});
