import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { challengeOffers, gameEvents, gameSessions, memories, patientEvents } from "../db/schema";
import { CATEGORY_INFO } from "../content/categories";
import { GAMES } from "../game/games";
import { localDay } from "../game/daily";
import type { ServerActivity } from "../game/types";
import type { Category, GameType } from "../types";

export const INSIGHTS_DISCLAIMER =
  "These insights describe activity inside Memory Garden's games only. They are not a clinical assessment and cannot show changes in memory, cognition or dementia. Many everyday things — mood, tiredness, time of day, the photos chosen — affect how a game goes. Please talk to a clinician about health questions.";

type SessionRow = typeof gameSessions.$inferSelect;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const minutes = (ms: number | null | undefined) => Math.round(((ms ?? 0) / 60000) * 10) / 10;

function firstTryRate(rows: SessionRow[]) {
  const rounds = rows.reduce((n, r) => n + r.roundsCompleted, 0);
  if (!rounds) return null;
  return rows.reduce((n, r) => n + r.firstTryCorrect, 0) / rounds;
}

export async function patientInsights(patient: { id: string; name: string; timezone: string }, opts: { days?: number } = {}) {
  const days = Math.min(90, Math.max(7, opts.days ?? 30));
  const db = await getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sessions = await db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, patient.id), gte(gameSessions.startedAt, since)))
    .orderBy(desc(gameSessions.startedAt));
  const finished = sessions.filter((s) => s.status !== "in_progress");
  const tz = patient.timezone;

  // Daily activity (for the chart) — local calendar days in the patient's timezone.
  const dayKeys: string[] = [];
  for (let i = Math.min(days, 30) - 1; i >= 0; i--) dayKeys.push(localDay(tz, new Date(Date.now() - i * 86400000)));
  const daily = dayKeys.map((day) => {
    const rows = finished.filter((s) => localDay(tz, s.startedAt) === day);
    return {
      day,
      completed: rows.filter((r) => r.status === "completed").length,
      endedEarly: rows.filter((r) => r.status === "ended_early").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
      minutes: Math.round(rows.reduce((n, r) => n + (r.durationMs ?? 0), 0) / 60000),
    };
  });

  const weekAgo = Date.now() - 7 * 86400000;
  const twoWeeksAgo = Date.now() - 14 * 86400000;
  const thisWeek = finished.filter((s) => s.startedAt.getTime() >= weekAgo);
  const lastWeek = finished.filter((s) => s.startedAt.getTime() >= twoWeeksAgo && s.startedAt.getTime() < weekAgo);
  const joined = (rows: SessionRow[]) => rows.filter((r) => r.status !== "skipped");

  // Per-game detail, comparing like with like (same game at the same internal setting).
  const games = [...new Set(finished.map((s) => s.gameType))] as GameType[];
  const statements: string[] = [];
  const perGame = games.map((game) => {
    const rows = finished.filter((s) => s.gameType === game);
    const joinedRows = joined(rows);
    const rate = firstTryRate(joinedRows);
    const rounds = joinedRows.reduce((n, r) => n + r.roundsCompleted, 0);
    const hints = joinedRows.reduce((n, r) => n + r.hintsUsed, 0);
    const times = joinedRows.map((r) => r.avgResponseMs).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
    const name = GAMES[game]?.name.en ?? game;

    // Trend: the latest setting only; last 3 vs the 3 before.
    const level = joinedRows[0]?.challengeLevel;
    const same = joinedRows.filter((r) => r.challengeLevel === level);
    let trend: "more" | "fewer" | "similar" | null = null;
    if (same.length >= 4) {
      const recent = same.slice(0, 3);
      const earlier = same.slice(3, 6);
      const a = firstTryRate(recent);
      const b = firstTryRate(earlier);
      if (a !== null && b !== null) {
        if (a - b >= 0.15) {
          trend = "more";
          statements.push(
            `In ${name}, recent sessions had more first-try answers (${pct(a)}) than earlier sessions at the same setting (${pct(b)}).`,
          );
        } else if (b - a >= 0.15) {
          trend = "fewer";
          statements.push(
            `In ${name}, recent sessions had fewer first-try answers (${pct(a)}) than earlier ones at the same setting (${pct(b)}). This describes game play only; hints and a gentler setting are always available.`,
          );
        } else trend = "similar";
      }
    }
    return {
      game,
      name,
      icon: GAMES[game]?.icon ?? "✨",
      sessions: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      endedEarly: rows.filter((r) => r.status === "ended_early").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
      firstTryRate: rate,
      hintsPerRound: rounds ? hints / rounds : null,
      medianResponseMs: times.length ? times[Math.floor(times.length / 2)] : null,
      avgMinutes: joinedRows.length ? minutes(joinedRows.reduce((n, r) => n + (r.durationMs ?? 0), 0) / joinedRows.length) : 0,
      currentSetting: level ?? null,
      trend,
      // Per-session series at the current setting (oldest → newest) for the small chart.
      series: same
        .slice(0, 10)
        .reverse()
        .map((r) => ({ at: r.startedAt.toISOString(), rate: r.roundsCompleted ? r.firstTryCorrect / r.roundsCompleted : null, hints: r.hintsUsed })),
    };
  });

  const doneThis = joined(thisWeek).length;
  const doneLast = joined(lastWeek).length;
  if (doneThis || doneLast) {
    if (doneThis > doneLast) statements.unshift(`${patient.name} took part in more activities this week (${doneThis}) than the week before (${doneLast}).`);
    else if (doneThis < doneLast) statements.unshift(`${patient.name} took part in ${doneThis} activities this week (${doneLast} the week before).`);
    else statements.unshift(`${patient.name} took part in ${doneThis} activities this week — the same as the week before.`);
  }
  const favorite = [...perGame].sort((a, b) => b.sessions - a.sessions)[0];
  if (favorite && favorite.sessions >= 2) statements.push(`${patient.name} chose ${favorite.name} most often in this period.`);

  // Memory categories that appeared in activities.
  const memIds = [...new Set(joined(finished).flatMap((s) => s.memoryIds))];
  const cats = memIds.length
    ? await db.select({ id: memories.id, category: memories.category }).from(memories).where(inArray(memories.id, memIds))
    : [];
  const catCounts = new Map<string, number>();
  for (const s of joined(finished)) {
    const seen = new Set(cats.filter((c) => s.memoryIds.includes(c.id)).map((c) => c.category));
    for (const c of seen) catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  const categories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => ({ category: c, label: CATEGORY_INFO[c as Category]?.label.en ?? c, icon: CATEGORY_INFO[c as Category]?.icon ?? "💫", sessions: n }));
  if (categories[0]) statements.push(`${patient.name} spent the most time with ${categories[0].label.toLowerCase()} memories.`);

  const breaks = await db
    .select({ type: patientEvents.type, createdAt: patientEvents.createdAt })
    .from(patientEvents)
    .where(
      and(
        eq(patientEvents.patientId, patient.id),
        inArray(patientEvents.type, ["break_taken", "break_reminder", "break_declined"]),
        gte(patientEvents.createdAt, since),
      ),
    );

  const offers = await db
    .select()
    .from(challengeOffers)
    .where(eq(challengeOffers.patientId, patient.id))
    .orderBy(desc(challengeOffers.offeredAt))
    .limit(30);

  const hintEvents = finished.length
    ? await db
        .select({ sessionId: gameEvents.sessionId })
        .from(gameEvents)
        .where(and(eq(gameEvents.patientId, patient.id), eq(gameEvents.type, "hint"), gte(gameEvents.createdAt, since)))
    : [];

  return {
    disclaimer: INSIGHTS_DISCLAIMER,
    days,
    summary: {
      activitiesThisWeek: doneThis,
      activitiesLastWeek: doneLast,
      minutesThisWeek: Math.round(thisWeek.reduce((n, r) => n + (r.durationMs ?? 0), 0) / 60000),
      minutesLastWeek: Math.round(lastWeek.reduce((n, r) => n + (r.durationMs ?? 0), 0) / 60000),
      activeDays: daily.slice(-14).filter((d) => d.completed + d.endedEarly > 0).length,
      skippedThisWeek: thisWeek.filter((r) => r.status === "skipped").length,
      hintsThisPeriod: hintEvents.length,
      breaksTaken: breaks.filter((b) => b.type === "break_taken").length,
      breakReminders: breaks.filter((b) => b.type === "break_reminder").length,
      togetherSessions: joined(finished).filter((r) => r.caregiverSupported).length,
    },
    statements,
    daily,
    perGame,
    categories,
    history: finished.slice(0, 60).map((s) => ({
      id: s.id,
      at: s.startedAt.toISOString(),
      game: s.gameType,
      gameName: GAMES[s.gameType as GameType]?.name.en ?? s.gameType,
      title: (s.activity as ServerActivity | null)?.title ?? "",
      status: s.status,
      minutes: minutes(s.durationMs),
      rounds: s.roundsTotal,
      roundsCompleted: s.roundsCompleted,
      attempts: s.attempts,
      correct: s.correct,
      firstTry: s.firstTryCorrect,
      hints: s.hintsUsed,
      skips: s.skips,
      avgResponseMs: s.avgResponseMs,
      coins: s.coinsAwarded,
      setting: s.challengeLevel,
      together: s.caregiverSupported,
      source: s.poolSource,
    })),
    challengeLog: offers.map((o) => ({
      id: o.id,
      at: o.offeredAt.toISOString(),
      game: GAMES[o.gameType as GameType]?.name.en ?? o.gameType,
      direction: o.direction,
      from: o.fromLevel,
      to: o.toLevel,
      status: o.status,
      respondedAt: o.respondedAt?.toISOString() ?? null,
    })),
  };
}
