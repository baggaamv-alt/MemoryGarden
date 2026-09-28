import { z } from "zod";
import { deliveryFor, patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { startActivity } from "@/lib/game/engine";

const Body = z.object({ levelId: z.string().max(120), together: z.boolean().optional() });

/** Starts an activity at a destination, generated from the patient's approved memories. */
export const POST = route(async (req) => {
  const p = await patientRef();
  const body = await readJson(req, Body);
  const session = await startActivity(p, body, await deliveryFor(req, p.patientId));
  return json({ session }, { status: 201 });
});
