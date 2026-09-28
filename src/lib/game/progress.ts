import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import type { Executor } from "../db";
import { gameSessions, levelProgress, worldState, type Preferences } from "../db/schema";
import { CATEGORY_INFO } from "../content/categories";
import { loc } from "../i18n";
import type { Category, GameType, Lang, LevelStatus } from "../types";
import { GAMES } from "./games";
import { loadPoolSnapshot, type Pool } from "./pool";
import { contentCheck } from "./requirements";
import { makeBonusWorld, WORLDS, type BonusSource, type LevelDef, type WorldDef, type WorldTheme } from "./worlds";

export type LevelView = {
  id: string;
  index: number;
  title: string;
  game: GameType;
  gameName: string;
  icon: string;
  focus: string;
  intro: string;
  status: LevelStatus;
  growingReason?: string;
  timesCompleted: number;
  firstVisitBonus: number;
};

export type WorldView = {
  id: string;
  index: number;
  name: string;
  description: string;
  theme: WorldTheme;
  bonus: boolean;
  unlocked: boolean;
  visited: boolean;
  completed: number;
  total: number;
  remainingToUnlock: number;
  levels: LevelView[];
};

const BONUS_CATEGORIES: Category[] = ["travel", "work", "friends", "music"];

export function allWorldDefs(pool: Pool): WorldDef[] {
  const sources: BonusSource[] = [];
  for (const album of pool.albums) {
    const n = album.items.filter((i) => i.memory && i.memory.mediaType !== "audio").length;
    if (n >= 4) sources.push({ kind: "album", id: album.id, title: album.title, count: n });
  }
  for (const cat of BONUS_CATEGORIES) {
    const n = pool.visual.filter((m) => m.category === cat).length;
    if (n >= 4) sources.push({ kind: "category", category: cat, count: n });
  }
  return [
    ...WORLDS,
    ...sources.map((s, i) => makeBonusWorld(s, i, s.kind === "category" ? CATEGORY_INFO[s.category].label : undefined)),
  ];
}

export function findLevelDef(worlds: WorldDef[], levelId: string): { world: WorldDef; level: LevelDef } | null {
  for (const world of worlds) {
    const level = world.levels.find((l) => l.id === levelId);
    if (level) return { world, level };
  }
  return null;
}

export async function completedSessionCount(exec: Executor, patientId: string) {
  const [row] = await exec
    .select({ n: count() })
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, patientId), inArray(gameSessions.status, ["completed", "ended_early"])));
  return Number(row?.n ?? 0);
}

const REVISIT_AFTER_MS = 12 * 60 * 60 * 1000;

/**
 * Builds the adventure map. Destinations open through participation (never performance):
 * worlds open after a number of completed visits anywhere, and within a world the next three
 * playable places are always open. Places without enough approved content show as "growing"
 * and never block the path. Newly opened places/worlds are persisted when `persist` is set.
 */
export async function computeMap(
  exec: Executor,
  patient: { id: string; code: string },
  prefs: Pick<Preferences, "allDestinationsOpen" | "starterPack" | "enabledGames">,
  lang: Lang,
  opts: { persist?: boolean; pool?: Pool } = {},
) {
  const pool = opts.pool ?? (await loadPoolSnapshot(exec, patient));
  const worlds = allWorldDefs(pool);
  const progressRows = await exec.select().from(levelProgress).where(eq(levelProgress.patientId, patient.id));
  const worldRows = await exec.select().from(worldState).where(eq(worldState.patientId, patient.id));
  const totalCompleted = await completedSessionCount(exec, patient.id);
  const byLevel = new Map(progressRows.map((r) => [r.levelId, r]));
  const byWorld = new Map(worldRows.map((r) => [r.worldId, r]));
  const enabled = new Set(prefs.enabledGames.length ? prefs.enabledGames : Object.keys(GAMES));

  const newLevels: { levelId: string; worldId: string }[] = [];
  const newWorlds: string[] = [];
  const now = Date.now();

  const views: WorldView[] = worlds.map((w) => {
    const unlocked = prefs.allDestinationsOpen || totalCompleted >= w.unlockAfter || byWorld.has(w.id);
    if (unlocked && !byWorld.has(w.id)) newWorlds.push(w.id);
    let openBudget = 3;
    const levels: LevelView[] = w.levels.map((l) => {
      const row = byLevel.get(l.id);
      const info = GAMES[l.game];
      const check = enabled.has(l.game)
        ? contentCheck(l, pool, prefs.starterPack)
        : { ok: false, reason: "This activity is switched off in the caregiver settings." };
      let status: LevelStatus;
      if (!unlocked) status = "locked";
      else if (!check.ok) status = "growing";
      else if (row?.status === "completed") {
        status = row.lastCompletedAt && now - row.lastCompletedAt.getTime() > REVISIT_AFTER_MS ? "revisit" : "completed";
      } else if (row || prefs.allDestinationsOpen || openBudget > 0) {
        status = "available";
        openBudget -= 1;
        if (!row) newLevels.push({ levelId: l.id, worldId: w.id });
      } else status = "locked";
      return {
        id: l.id,
        index: l.index,
        title: loc(l.title, lang) || loc(info.name, lang),
        game: l.game,
        gameName: loc(info.name, lang),
        icon: info.icon,
        focus: loc(info.focus, lang),
        intro: loc(info.intro, lang),
        status,
        growingReason: check.ok ? undefined : check.reason,
        timesCompleted: row?.timesCompleted ?? 0,
        firstVisitBonus: l.firstVisitBonus,
      };
    });
    return {
      id: w.id,
      index: w.index,
      name: loc(w.name, lang),
      description: loc(w.description, lang),
      theme: w.theme,
      bonus: !!w.bonus,
      unlocked,
      visited: !!byWorld.get(w.id)?.firstVisitedAt,
      completed: levels.filter((l) => l.status === "completed" || l.status === "revisit").length,
      total: levels.length,
      remainingToUnlock: Math.max(0, w.unlockAfter - totalCompleted),
      levels,
    };
  });

  if (opts.persist) {
    if (newWorlds.length) {
      await exec
        .insert(worldState)
        .values(newWorlds.map((worldId) => ({ patientId: patient.id, worldId })))
        .onConflictDoNothing();
    }
    if (newLevels.length) {
      await exec
        .insert(levelProgress)
        .values(newLevels.map((x) => ({ patientId: patient.id, levelId: x.levelId, worldId: x.worldId, status: "available" as const })))
        .onConflictDoNothing();
    }
  }

  return {
    worlds: views,
    defs: worlds,
    pool,
    totalCompleted,
    // A newly opened world is only "news" once the patient has earned it (the first world is open from the start).
    newlyOpenedWorlds: newWorlds.filter((id) => id !== "w1"),
    newlyOpenedLevels: newLevels.map((x) => x.levelId),
  };
}
