import "server-only";
import { and, count, countDistinct, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import type { Executor } from "../db";
import {
  characters,
  coinTransactions,
  dailyAdventures,
  gameSessions,
  gardenState,
  levelProgress,
  patientBadges,
  patientEvents,
  wallets,
  worldState,
} from "../db/schema";
import { BADGES, GROWTH, WORLD_KEEPSAKES } from "../content/rewards";
import { CATEGORY_SLOT } from "../content/shop";

export const COINS = {
  activityComplete: 10,
  participation: 6,
  newActivity: 10,
  newDestination: 15,
  together: 5,
  favoriteRevisit: 5,
  dailyAdventure: 20,
  badge: 10,
} as const;

export async function addCoins(
  exec: Executor,
  patientId: string,
  amount: number,
  reason: string,
  refId?: string | null,
  note?: string,
) {
  if (!amount) return;
  await exec.insert(coinTransactions).values({ patientId, amount, reason, refId: refId ?? null, note: note ?? null });
  const earned = Math.max(0, amount);
  await exec
    .insert(wallets)
    .values({ patientId, balance: amount, lifetimeEarned: earned })
    .onConflictDoUpdate({
      target: wallets.patientId,
      set: {
        balance: sql`${wallets.balance} + ${amount}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${earned}`,
        updatedAt: new Date(),
      },
    });
}

export async function getWallet(exec: Executor, patientId: string) {
  const [w] = await exec.select().from(wallets).where(eq(wallets.patientId, patientId)).limit(1);
  return w ?? { patientId, balance: 0, lifetimeEarned: 0, updatedAt: new Date() };
}

async function grantBadge(exec: Executor, patientId: string, badgeId: string) {
  const inserted = await exec
    .insert(patientBadges)
    .values({ patientId, badgeId })
    .onConflictDoNothing()
    .returning({ badgeId: patientBadges.badgeId });
  if (inserted.length) {
    await addCoins(exec, patientId, COINS.badge, "badge", badgeId);
    return true;
  }
  return false;
}

const WORLD_BADGE: Record<string, string> = {
  w1: "cozy-gardener",
  w2: "family-storyteller",
  w3: "festival-explorer",
  w4: "meadow-wanderer",
  w5: "golden-keeper",
};

/** Checks every badge condition from recorded activity; returns the ones newly earned. */
export async function evaluateBadges(exec: Executor, patientId: string): Promise<string[]> {
  const owned = new Set(
    (await exec.select({ id: patientBadges.badgeId }).from(patientBadges).where(eq(patientBadges.patientId, patientId))).map((r) => r.id),
  );
  const pending = BADGES.map((b) => b.id).filter((id) => !owned.has(id));
  if (!pending.length) return [];

  const finished = and(eq(gameSessions.patientId, patientId), inArray(gameSessions.status, ["completed", "ended_early"]));
  const [{ sessions }] = await exec.select({ sessions: count() }).from(gameSessions).where(finished);
  const [{ games }] = await exec.select({ games: countDistinct(gameSessions.gameType) }).from(gameSessions).where(finished);
  const perGame = await exec
    .select({ game: gameSessions.gameType, n: count() })
    .from(gameSessions)
    .where(finished)
    .groupBy(gameSessions.gameType);
  const gameCount = (g: string) => Number(perGame.find((r) => r.game === g)?.n ?? 0);
  const [{ together }] = await exec
    .select({ together: count() })
    .from(gameSessions)
    .where(and(finished, eq(gameSessions.caregiverSupported, true)));
  const worldLevels = await exec
    .select({ world: levelProgress.worldId, n: count() })
    .from(levelProgress)
    .where(and(eq(levelProgress.patientId, patientId), eq(levelProgress.status, "completed")))
    .groupBy(levelProgress.worldId);
  const [{ visited }] = await exec
    .select({ visited: count() })
    .from(worldState)
    .where(
      and(
        eq(worldState.patientId, patientId),
        isNotNull(worldState.firstVisitedAt),
        inArray(worldState.worldId, ["w1", "w2", "w3", "w4", "w5"]),
      ),
    );
  const events = await exec
    .select({ type: patientEvents.type, n: count() })
    .from(patientEvents)
    .where(and(eq(patientEvents.patientId, patientId), inArray(patientEvents.type, ["favorite_revisit", "break_taken"])))
    .groupBy(patientEvents.type);
  const eventCount = (t: string) => Number(events.find((e) => e.type === t)?.n ?? 0);
  const [{ days }] = await exec
    .select({ days: count() })
    .from(dailyAdventures)
    .where(and(eq(dailyAdventures.patientId, patientId), isNotNull(dailyAdventures.completedAt)));
  const [garden] = await exec.select().from(gardenState).where(eq(gardenState.patientId, patientId)).limit(1);
  const [character] = await exec.select().from(characters).where(eq(characters.patientId, patientId)).limit(1);
  const wearing = character
    ? Object.entries(character.equipped ?? {}).filter(
        ([slot, v]) => v && Object.values(CATEGORY_SLOT).includes(slot as never) && slot !== "animation",
      ).length
    : 0;

  const conditions: Record<string, boolean> = {
    "first-adventure": Number(sessions) >= 1,
    "memory-explorer": Number(sessions) >= 10,
    "curious-mind": Number(games) >= 5,
    "world-traveler": Number(visited) >= 5,
    "favorite-revisited": eventCount("favorite_revisit") >= 1,
    "story-lover": gameCount("memory-story") >= 1,
    "music-lover": gameCount("sound-memory") >= 1,
    "garden-builder": (garden?.placed.length ?? 0) >= 3,
    "stylish-friend": wearing >= 3,
    "daily-delight": Number(days) >= 1,
    "together-time": Number(together) >= 1,
    "restful-soul": eventCount("break_taken") >= 1,
  };
  for (const [world, badge] of Object.entries(WORLD_BADGE)) {
    conditions[badge] = Number(worldLevels.find((r) => r.world === world)?.n ?? 0) >= 3;
  }

  const earned: string[] = [];
  for (const id of pending) {
    if (conditions[id] && (await grantBadge(exec, patientId, id))) earned.push(id);
  }
  return earned;
}

/** The garden grows from taking part: completed visits, worlds visited and daily adventures. */
export async function growGarden(exec: Executor, patientId: string): Promise<string[]> {
  const [row] = await exec.select().from(gardenState).where(eq(gardenState.patientId, patientId)).limit(1);
  const grown = row?.grown ?? [];
  const have = new Set(grown.map((g) => g.id));

  const [{ sessions }] = await exec
    .select({ sessions: count() })
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, patientId), inArray(gameSessions.status, ["completed", "ended_early"])));
  const visitedWorlds = await exec
    .select({ worldId: worldState.worldId })
    .from(worldState)
    .where(and(eq(worldState.patientId, patientId), isNotNull(worldState.firstVisitedAt)));
  const [{ days }] = await exec
    .select({ days: count() })
    .from(dailyAdventures)
    .where(and(eq(dailyAdventures.patientId, patientId), isNotNull(dailyAdventures.completedAt)));

  const want: string[] = [];
  for (const g of GROWTH) if (Number(sessions) >= g.at) want.push(g.id);
  for (const w of visitedWorlds) if (WORLD_KEEPSAKES[w.worldId]) want.push(WORLD_KEEPSAKES[w.worldId].id);
  for (let i = 1; i <= Math.min(7, Number(days)); i++) want.push(`daily-flower-${i}`);

  const fresh = want.filter((id) => !have.has(id));
  if (!fresh.length) return [];
  const at = new Date().toISOString();
  const next = [...grown, ...fresh.map((id) => ({ id, at }))];
  await exec
    .insert(gardenState)
    .values({ patientId, grown: next, placed: row?.placed ?? [] })
    .onConflictDoUpdate({ target: gardenState.patientId, set: { grown: next, updatedAt: new Date() } });
  return fresh;
}

export async function logEvent(exec: Executor, patientId: string, type: string, data: Record<string, unknown> = {}) {
  await exec.insert(patientEvents).values({ patientId, type, data });
}

/** Marks a world as visited the first time; returns true when that is new. */
export async function visitWorld(exec: Executor, patientId: string, worldId: string) {
  const [row] = await exec
    .select()
    .from(worldState)
    .where(and(eq(worldState.patientId, patientId), eq(worldState.worldId, worldId)))
    .limit(1);
  if (row?.firstVisitedAt) return false;
  if (row) {
    await exec
      .update(worldState)
      .set({ firstVisitedAt: new Date() })
      .where(and(eq(worldState.patientId, patientId), eq(worldState.worldId, worldId)));
  } else {
    await exec.insert(worldState).values({ patientId, worldId, firstVisitedAt: new Date() }).onConflictDoNothing();
  }
  await addCoins(exec, patientId, COINS.newDestination, "new_destination", worldId);
  return true;
}

export async function hasPlayedGameBefore(exec: Executor, patientId: string, game: string, excludeSessionId: string) {
  const [{ n }] = await exec
    .select({ n: count() })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.patientId, patientId),
        eq(gameSessions.gameType, game),
        ne(gameSessions.id, excludeSessionId),
        inArray(gameSessions.status, ["completed", "ended_early"]),
      ),
    );
  return Number(n) > 0;
}
