import { z } from "zod";
import { requireCaregiver } from "@/lib/auth/session";
import { json, readJson, rateLimit, route } from "@/lib/api/http";
import { isCloudinaryConfigured } from "@/lib/cloudinary/client";
import { importLegacyAccount } from "@/lib/legacy/importer";
import { legacyConfigured, openMongoLegacySource } from "@/lib/legacy/source";

/** Whether an import from the previous backend (memory-app-backend) is possible here. */
export const GET = route(async () => {
  await requireCaregiver();
  return json({ available: legacyConfigured(), cloudinary: isCloudinaryConfigured() });
});

const Body = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
  addressAs: z.string().trim().max(40).optional(),
  relationship: z.string().trim().max(60).optional(),
  language: z.enum(["en", "te"]).default("en"),
});

/** Imports one old account (proved by its own email + password) as a patient of this caregiver. */
export const POST = route(async (req) => {
  const { user } = await requireCaregiver();
  rateLimit(`legacy-import:${user.id}`, 10, 60 * 60 * 1000);
  const body = await readJson(req, Body);
  const source = await openMongoLegacySource();
  try {
    return json({ report: await importLegacyAccount(user.id, source, body) });
  } finally {
    await source.close();
  }
});
