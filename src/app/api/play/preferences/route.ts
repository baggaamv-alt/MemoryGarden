import { z } from "zod";
import { patientRef } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { getPreferences, updatePreferences } from "@/lib/services/preferences";

/** Comfort settings the patient can change themselves (text size, calm mode, voice, language). */
const Body = z.object({
  language: z.enum(["en", "te"]).optional(),
  accessibility: z
    .object({
      textSize: z.enum(["normal", "large", "xlarge"]),
      highContrast: z.boolean(),
      calmMode: z.boolean(),
      sound: z.boolean(),
      lowBandwidth: z.boolean(),
    })
    .partial()
    .optional(),
  voice: z.object({ enabled: z.boolean(), autoRead: z.boolean(), commands: z.boolean() }).partial().optional(),
});

export const PATCH = route(async (req) => {
  const p = await patientRef();
  const body = await readJson(req, Body);
  const db = await getDb();
  const current = await getPreferences(db, p.patientId);
  const updated = await updatePreferences(db, p.patientId, {
    language: body.language,
    accessibility: body.accessibility ? { ...current.accessibility, ...body.accessibility } : undefined,
    voice: body.voice ? { ...current.voice, ...body.voice } : undefined,
  });
  return json({ accessibility: updated.accessibility, voice: updated.voice, language: updated.language });
});
