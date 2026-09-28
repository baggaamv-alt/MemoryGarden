import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { respondToOffer } from "@/lib/game/engine";

const Body = z.object({ offerId: z.string().max(64), response: z.enum(["accepted", "keep_familiar", "later"]) });

/** The patient's own answer to Mimo's question. Nothing changes without a "Yes, let's try!". */
export const POST = route(async (req) => {
  const p = await patientRef();
  const body = await readJson(req, Body);
  return json(await respondToOffer(p.patientId, body.offerId, body.response));
});
