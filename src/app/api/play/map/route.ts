import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { mapState, visitWorldEvent } from "@/lib/services/play";

export const GET = route(async () => json(await mapState(await patientRef())));

/** Opening a world counts as visiting a destination. */
export const POST = route(async (req) => {
  const { worldId } = await readJson(req, z.object({ worldId: z.string().max(80) }));
  return json({ effects: await visitWorldEvent(await patientRef(), worldId) });
});
