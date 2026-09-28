import "server-only";
import { eq } from "drizzle-orm";
import type { Executor } from "../db";
import { preferences, type Preferences } from "../db/schema";
import {
  DEFAULT_ACCESSIBILITY,
  DEFAULT_CHALLENGE,
  DEFAULT_CONSENT,
  DEFAULT_VOICE,
  type AccessibilityPrefs,
  type ChallengePrefs,
  type ConsentPrefs,
  type Lang,
  type VoicePrefs,
} from "../types";

export function defaultPreferences(patientId: string, language: Lang, starterPack = true) {
  return {
    patientId,
    language,
    enabledGames: [] as string[],
    preferredGames: [] as string[],
    preferredCategories: [] as string[],
    sessionMinutes: 20,
    breakReminderMinutes: 15,
    exposureSeconds: 0,
    voice: DEFAULT_VOICE,
    accessibility: DEFAULT_ACCESSIBILITY,
    challenge: DEFAULT_CHALLENGE,
    consent: DEFAULT_CONSENT,
    starterPack,
    dailyAdventures: true,
    allDestinationsOpen: false,
  };
}

/** Merges stored JSON with defaults so newly added settings always have a value. */
function normalize(p: Preferences): Preferences {
  return {
    ...p,
    voice: { ...DEFAULT_VOICE, ...(p.voice as Partial<VoicePrefs>) },
    accessibility: { ...DEFAULT_ACCESSIBILITY, ...(p.accessibility as Partial<AccessibilityPrefs>) },
    challenge: {
      ...DEFAULT_CHALLENGE,
      ...(p.challenge as Partial<ChallengePrefs>),
      levels: { ...(p.challenge?.levels ?? {}) },
      snooze: { ...(p.challenge?.snooze ?? {}) },
    },
    consent: { ...DEFAULT_CONSENT, ...(p.consent as Partial<ConsentPrefs>) },
  };
}

export async function getPreferences(exec: Executor, patientId: string): Promise<Preferences> {
  const [row] = await exec.select().from(preferences).where(eq(preferences.patientId, patientId)).limit(1);
  if (row) return normalize(row);
  const [created] = await exec
    .insert(preferences)
    .values(defaultPreferences(patientId, "en"))
    .onConflictDoNothing()
    .returning();
  if (created) return normalize(created);
  const [again] = await exec.select().from(preferences).where(eq(preferences.patientId, patientId)).limit(1);
  return normalize(again);
}

export async function updatePreferences(exec: Executor, patientId: string, patch: Partial<Omit<Preferences, "patientId">>) {
  const current = await getPreferences(exec, patientId);
  const next = {
    ...patch,
    voice: patch.voice ? { ...current.voice, ...patch.voice } : undefined,
    accessibility: patch.accessibility ? { ...current.accessibility, ...patch.accessibility } : undefined,
    challenge: patch.challenge ? { ...current.challenge, ...patch.challenge } : undefined,
    consent: patch.consent ? { ...current.consent, ...patch.consent } : undefined,
    updatedAt: new Date(),
  };
  const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined));
  const [row] = await exec.update(preferences).set(clean).where(eq(preferences.patientId, patientId)).returning();
  return normalize(row);
}
