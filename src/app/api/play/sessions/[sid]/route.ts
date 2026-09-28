import { patientRef } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { getSessionView } from "@/lib/game/engine";

export const GET = route<{ sid: string }>(async (_req, ctx) => {
  const { sid } = await ctx.params;
  const p = await patientRef();
  return json({ session: await getSessionView(p.patientId, sid) });
});
