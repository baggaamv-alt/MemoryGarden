import { z } from "zod";
import { caregiverPatient } from "@/lib/api/context";
import { json, readJson, route } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { clampLevel } from "@/lib/game/challenge";
import { getPreferences, updatePreferences } from "@/lib/services/preferences";
import { CATEGORIES, GAME_TYPES } from "@/lib/types";

export const GET = route<{ pid: string }>(async (_req, ctx) => {
  const { pid } = await ctx.params;
  await caregiverPatient(pid);
  const db = await getDb();
  return json({ preferences: await getPreferences(db, pid) });
});

const Game = z.enum(GAME_TYPES);

const Patch = z.object({
  language: z.enum(["en", "te"]).optional(),
  enabledGames: z.array(Game).optional(),
  preferredGames: z.array(Game).optional(),
  preferredCategories: z.array(z.enum(CATEGORIES)).optional(),
  sessionMinutes: z.number().int().min(5).max(120).optional(),
  breakReminderMinutes: z.number().int().min(0).max(120).optional(),
  exposureSeconds: z.number().int().min(0).max(60).optional(),
  starterPack: z.boolean().optional(),
  dailyAdventures: z.boolean().optional(),
  allDestinationsOpen: z.boolean().optional(),
  voice: z
    .object({ enabled: z.boolean(), autoRead: z.boolean(), rate: z.number().min(0.5).max(1.5), commands: z.boolean() })
    .partial()
    .optional(),
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
  consent: z.object({ trackResponseTimes: z.boolean(), aiSuggestions: z.boolean(), activityInsights: z.boolean() }).partial().optional(),
  challenge: z
    .object({
      maxLevel: z.number().int().min(1).max(5),
      offersEnabled: z.boolean(),
      /** Caregivers may reset a game to a gentler setting (never raise it without the patient). */
      resetGames: z.array(Game),
    })
    .partial()
    .optional(),
});

export const PATCH = route<{ pid: string }>(async (req, ctx) => {
  const { pid } = await ctx.params;
  const { caregiver } = await caregiverPatient(pid);
  const body = await readJson(req, Patch);
  const db = await getDb();
  const current = await getPreferences(db, pid);
  let challenge = undefined;
  if (body.challenge) {
    const maxLevel = body.challenge.maxLevel ?? current.challenge.maxLevel;
    const levels = { ...current.challenge.levels };
    for (const g of body.challenge.resetGames ?? []) levels[g] = 1;
    // A lower ceiling brings existing settings down with it; nothing is ever raised here.
    for (const g of Object.keys(levels) as (keyof typeof levels)[]) levels[g] = clampLevel(levels[g] ?? 1, maxLevel);
    challenge = { ...current.challenge, maxLevel, offersEnabled: body.challenge.offersEnabled ?? current.challenge.offersEnabled, levels };
  }
  const updated = await updatePreferences(db, pid, {
    language: body.language,
    enabledGames: body.enabledGames,
    preferredGames: body.preferredGames,
    preferredCategories: body.preferredCategories,
    sessionMinutes: body.sessionMinutes,
    breakReminderMinutes: body.breakReminderMinutes,
    exposureSeconds: body.exposureSeconds,
    starterPack: body.starterPack,
    dailyAdventures: body.dailyAdventures,
    allDestinationsOpen: body.allDestinationsOpen,
    voice: body.voice ? { ...current.voice, ...body.voice } : undefined,
    accessibility: body.accessibility ? { ...current.accessibility, ...body.accessibility } : undefined,
    consent: body.consent ? { ...current.consent, ...body.consent } : undefined,
    challenge,
  });
  await db.insert(auditLog).values({ actorId: caregiver.id, patientId: pid, action: "preferences.update", data: { fields: Object.keys(body) } });
  return json({ preferences: updated });
});
