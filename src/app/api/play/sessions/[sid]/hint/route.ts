import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { hintRound } from "@/lib/game/engine";

export const POST = route<{ sid: string }>(async (req, ctx) => {
  const { sid } = await ctx.params;
  const p = await patientRef();
  const { round } = await readJson(req, z.object({ round: z.number().int().min(0).max(50) }));
  return json(await hintRound(p.patientId, sid, round));
});
