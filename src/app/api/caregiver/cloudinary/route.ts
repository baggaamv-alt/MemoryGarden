import { requireCaregiver } from "@/lib/auth/session";
import { json, route } from "@/lib/api/http";
import { cloudinaryStatus } from "@/lib/services/caregiver";

/** Connection, folder mode, structured metadata fields and Search API health. */
export const GET = route(async () => {
  await requireCaregiver();
  return json(await cloudinaryStatus());
});

/** Creates Memory Garden's structured metadata fields in the Cloudinary product environment. */
export const POST = route(async () => {
  await requireCaregiver();
  return json(await cloudinaryStatus({ setup: true }));
});
