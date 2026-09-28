import { endSession } from "@/lib/auth/session";
import { json, route } from "@/lib/api/http";

export const POST = route(async () => {
  await endSession("caregiver");
  return json({ ok: true });
});
