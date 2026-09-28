import "server-only";
import { and, eq } from "drizzle-orm";
import type { Executor } from "../db";
import { dailyAdventures, type Preferences } from "../db/schema";
import type { DailyTask, GameType } from "../types";
import { addCoins, COINS } from "./rewards";
import type { WorldView } from "./progress";
import { mulberry32, shuffle } from "./util";

export function localDay(timeZone: string, d = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function seedFrom(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PLAYABLE = new Set(["available", "completed", "revisit"]);

export type DailyExtras = {
  hasFavorites: boolean;
  canBuyGardenItem: boolean;
  ownsWearable: boolean;
};

/**
 * Today's Little Adventure: 3–4 gentle tasks chosen from what is actually playable, the caregiver's
 * preferred activities and a little variety. Any order, no streaks, nothing lost by missing a day.
 */
export async function ensureDaily(
  exec: Executor,
  patientId: string,
  timeZone: string,
  prefs: Pick<Preferences, "dailyAdventures" | "preferredGames">,
  worlds: WorldView[],
  extras: DailyExtras,
): Promise<{ day: string; tasks: DailyTask[]; completed: boolean } | null> {
  if (!prefs.dailyAdventures) return null;
  const day = localDay(timeZone);
  const [existing] = await exec
    .select()
    .from(dailyAdventures)
    .where(and(eq(dailyAdventures.patientId, patientId), eq(dailyAdventures.day, day)))
    .limit(1);
  if (existing) return { day, tasks: existing.tasks, completed: !!existing.completedAt };

  const rng = mulberry32(seedFrom(patientId + day));
  const open = worlds.filter((w) => w.unlocked && w.levels.some((l) => PLAYABLE.has(l.status)));
  const tasks: DailyTask[] = [];

  if (open.length) {
    const nonFirst = open.filter((w) => w.id !== "w1");
    const world = shuffle(nonFirst.length ? nonFirst : open, rng)[0];
    tasks.push({ id: "visit", type: "visit-world", target: world.id, done: false });
  }

  const games = new Set<GameType>();
  for (const w of open) for (const l of w.levels) if (PLAYABLE.has(l.status)) games.add(l.game);
  const matchable = games.has("memory-match") || games.has("daily-life");
  const candidates = [...games].filter((g) => g !== "memory-match" && g !== "daily-life");
  const preferred = candidates.filter((g) => prefs.preferredGames.includes(g));
  const game = shuffle(preferred.length ? preferred : candidates, rng)[0];
  if (game) tasks.push({ id: "play", type: "play-game", target: game, done: false });

  if (extras.hasFavorites) tasks.push({ id: "favorite", type: "favorite-memory", done: false });
  else if (matchable) tasks.push({ id: "match", type: "match", done: false });

  if (extras.ownsWearable && rng() < 0.5) tasks.push({ id: "dress", type: "dress-mimo", done: false });
  else tasks.push({ id: "garden", type: "garden", target: extras.canBuyGardenItem ? "buy" : "visit", done: false });

  if (extras.hasFavorites && matchable && tasks.length < 4) tasks.push({ id: "match", type: "match", done: false });

  await exec.insert(dailyAdventures).values({ patientId, day, tasks }).onConflictDoNothing();
  return { day, tasks, completed: false };
}

/** Ticks off matching tasks for today. Awards the daily bonus when the last one is done. */
export async function markDailyTasks(
  exec: Executor,
  patientId: string,
  timeZone: string,
  predicate: (t: DailyTask) => boolean,
): Promise<{ justCompleted: boolean; changed: boolean }> {
  const day = localDay(timeZone);
  const [row] = await exec
    .select()
    .from(dailyAdventures)
    .where(and(eq(dailyAdventures.patientId, patientId), eq(dailyAdventures.day, day)))
    .limit(1);
  if (!row || row.completedAt) return { justCompleted: false, changed: false };
  let changed = false;
  const now = new Date().toISOString();
  const tasks = row.tasks.map((t) => {
    if (!t.done && predicate(t)) {
      changed = true;
      return { ...t, done: true, doneAt: now };
    }
    return t;
  });
  if (!changed) return { justCompleted: false, changed: false };
  const all = tasks.every((t) => t.done);
  await exec
    .update(dailyAdventures)
    .set({ tasks, completedAt: all ? new Date() : null })
    .where(and(eq(dailyAdventures.patientId, patientId), eq(dailyAdventures.day, day)));
  if (all) await addCoins(exec, patientId, COINS.dailyAdventure, "daily_adventure", day);
  return { justCompleted: all, changed: true };
}
