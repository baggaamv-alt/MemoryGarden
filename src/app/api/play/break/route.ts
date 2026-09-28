import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { breakEvent } from "@/lib/services/play";

export const POST = route(async (req) => {
  const { kind } = await readJson(req, z.object({ kind: z.enum(["taken", "shown", "declined"]) }));
  return json({ effects: await breakEvent(await patientRef(), kind) });
});
