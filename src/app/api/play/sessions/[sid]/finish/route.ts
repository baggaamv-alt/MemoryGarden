import { patientRef } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { finishActivity } from "@/lib/game/engine";

/** Ends the activity (finished, stopped early or skipped) and returns participation rewards. */
export const POST = route<{ sid: string }>(async (_req, ctx) => {
  const { sid } = await ctx.params;
  const p = await patientRef();
  return json({ summary: await finishActivity(p, sid) });
});
