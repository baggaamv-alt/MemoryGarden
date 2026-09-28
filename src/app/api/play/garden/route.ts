import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { gardenView, gardenVisitEvent, placeInGarden } from "@/lib/services/play";

export const GET = route(async () => json(await gardenView(await patientRef())));

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("visit") }),
  z.object({ action: z.literal("place"), itemId: z.string().max(64), placed: z.boolean() }),
]);

export const POST = route(async (req) => {
  const p = await patientRef();
  const body = await readJson(req, Body);
  if (body.action === "visit") return json({ effects: await gardenVisitEvent(p) });
  return json(await placeInGarden(p, body.itemId, body.placed));
});
