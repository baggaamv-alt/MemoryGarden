import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Executor } from "../db";
import { challengeOffers, gameEvents, gameSessions, levelProgress, type GameSession } from "../db/schema";
import { conflict, notFound, badRequest } from "../api/http";
import type { DeliveryOptions } from "../cloudinary/urls";
import { BADGE_BY_ID, growthName } from "../content/rewards";
import { celebrateLine, comfortLine, loc, t } from "../i18n";
import { getPreferences, updatePreferences } from "../services/preferences";
import type { GameType, Lang } from "../types";
import { currentLevel, paramsFor, shouldOffer, SNOOZE_AFTER, type SessionSummary } from "./challenge";
import { markDailyTasks } from "./daily";
import { GAMES } from "./games";
import { GENERATORS, isUnavailable } from "./generators";
import { loadPool } from "./pool";
import { computeMap, findLevelDef } from "./progress";
import { WORLDS } from "./worlds";
import { addCoins, COINS, evaluateBadges, getWallet, growGarden, hasPlayedGameBefore, visitWorld } from "./rewards";
import {
  emptyProgress,
  type AnswerInput,
  type AnswerResult,
  type ChallengeOfferView,
  type Feedback,
  type HintPayload,
  type HintResult,
  type RewardSummary,
  type RoundProgress,
  type ServerActivity,
  type ServerRound,
  type SessionState,
  type SessionView,
} from "./types";
import { mulberry32 } from "./util";

export type PatientCtx = { patientId: string; code: string; timezone: string };

type StoredState = SessionState & {
  startBonuses?: { reason: string; amount: number }[];
  summary?: RewardSummary;
};

function viewOf(row: GameSession): SessionView {
  const activity = row.activity as ServerActivity;
  const state = row.state as StoredState;
  return {
    id: row.id,
    game: activity.game,
    levelId: row.levelId,
    worldId: row.worldId,
    title: activity.title,
    intro: activity.intro,
    lang: activity.lang,
    rounds: activity.rounds.map((r) => r.view),
    progress: state.rounds,
    current: state.current,
    status: row.status,
    caregiverSupported: row.caregiverSupported,
    source: row.poolSource ?? "database",
  };
}

async function recentMemoryIds(exec: Executor, patientId: string) {
  const rows = await exec
    .select({ ids: gameSessions.memoryIds })
    .from(gameSessions)
    .where(eq(gameSessions.patientId, patientId))
    .orderBy(desc(gameSessions.startedAt))
    .limit(5);
  return new Set(rows.flatMap((r) => r.ids));
}

// ─── Start ────────────────────────────────────────────────────

export async function startActivity(
  p: PatientCtx,
  input: { levelId: string; together?: boolean },
  delivery: DeliveryOptions,
): Promise<SessionView> {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = (prefs.language === "te" ? "te" : "en") as Lang;
  // Retrieval runs outside any transaction: it calls the Cloudinary Search API.
  const pool = await loadPool(db, { id: p.patientId, code: p.code });
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang, { persist: true, pool });
  const found = findLevelDef(map.defs, input.levelId);
  if (!found) throw notFound("That place is not on the map.");
  const lv = map.worlds.find((w) => w.id === found.world.id)?.levels.find((l) => l.id === input.levelId);
  if (!lv || lv.status === "locked") throw conflict("That place opens a little later.", "locked");
  if (lv.status === "growing") throw conflict(lv.growingReason ?? "This place is still growing.", "growing");

  const game = found.level.game;
  const challenge = currentLevel(prefs.challenge, game);
  const params = paramsFor(challenge, prefs.exposureSeconds);
  const seed = crypto.randomInt(1, 2 ** 31 - 1);
  const rounds = await GENERATORS[game]({
    pool,
    game,
    level: found.level,
    variant: found.level.variant,
    params,
    lang,
    rng: mulberry32(seed),
    delivery,
    starterPack: prefs.starterPack,
    recent: await recentMemoryIds(db, p.patientId),
  });
  if (isUnavailable(rounds)) throw conflict(rounds.unavailable, "growing");

  const activity: ServerActivity = {
    version: 1,
    game,
    lang,
    title: lv.title,
    intro: loc(GAMES[game].intro, lang),
    rounds,
    seed,
  };
  const state: StoredState = {
    current: 0,
    rounds: rounds.map(() => ({ ...emptyProgress(), startedAt: Date.now() })),
    responseTimes: [],
    startBonuses: [],
  };
  const id = crypto.randomUUID();
  const worldId = found.world.id;

  await db.transaction(async (tx) => {
    if (await visitWorld(tx, p.patientId, worldId)) state.startBonuses!.push({ reason: "new_destination", amount: COINS.newDestination });
    const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "visit-world" && task.target === worldId);
    if (daily.justCompleted) state.startBonuses!.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    await tx.insert(gameSessions).values({
      id,
      patientId: p.patientId,
      gameType: game,
      worldId,
      levelId: found.level.id,
      memoryIds: [...new Set(rounds.flatMap((r) => r.memoryIds))],
      challengeLevel: challenge,
      activity,
      state,
      roundsTotal: rounds.length,
      caregiverSupported: !!input.together,
      poolSource: pool.source,
    });
    await tx
      .insert(levelProgress)
      .values({ patientId: p.patientId, levelId: found.level.id, worldId, status: "available", lastPlayedAt: new Date(), timesPlayed: 1 })
      .onConflictDoUpdate({
        target: [levelProgress.patientId, levelProgress.levelId],
        set: { lastPlayedAt: new Date(), timesPlayed: sql`${levelProgress.timesPlayed} + 1` },
      });
  });

  const [row] = await db.select().from(gameSessions).where(eq(gameSessions.id, id)).limit(1);
  return viewOf(row);
}

export async function getSessionView(patientId: string, sessionId: string): Promise<SessionView> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.patientId, patientId)))
    .limit(1);
  if (!row) throw notFound("That activity could not be found.");
  return viewOf(row);
}

/** The most recent unfinished activity (for "Continue where we left off"). */
export async function unfinishedSession(patientId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: gameSessions.id, activity: gameSessions.activity, startedAt: gameSessions.startedAt })
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, patientId), eq(gameSessions.status, "in_progress")))
    .orderBy(desc(gameSessions.startedAt))
    .limit(1);
  if (!row || Date.now() - row.startedAt.getTime() > 1000 * 60 * 60 * 24) return null;
  return { id: row.id, title: (row.activity as ServerActivity).title };
}

// ─── Answers ──────────────────────────────────────────────────

async function lockSession(exec: Executor, patientId: string, sessionId: string) {
  const [row] = await exec
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.patientId, patientId)))
    .for("update")
    .limit(1);
  if (!row) throw notFound("That activity could not be found.");
  return row;
}

function nextOpenRound(state: SessionState, from: number) {
  for (let i = from; i < state.rounds.length; i++) if (!state.rounds[i].done) return i;
  for (let i = 0; i < state.rounds.length; i++) if (!state.rounds[i].done) return i;
  return state.rounds.length;
}

function finishRound(prog: RoundProgress, round: ServerRound, outcome: NonNullable<RoundProgress["outcome"]>) {
  prog.done = true;
  prog.outcome = outcome;
  if (round.key.kind === "choice") prog.correctIds = round.key.correct;
  if (round.reveal) {
    prog.revealText = round.reveal.text;
    prog.revealImage = round.reveal.image;
  }
}

export async function answerRound(
  patientId: string,
  sessionId: string,
  roundIndex: number,
  input: AnswerInput,
  responseMs?: number,
): Promise<AnswerResult> {
  const db = await getDb();
  const prefs = await getPreferences(db, patientId);
  return db.transaction(async (tx) => {
    const row = await lockSession(tx, patientId, sessionId);
    if (row.status !== "in_progress") throw conflict("This activity has already finished.", "finished");
    const activity = row.activity as ServerActivity;
    const state = row.state as StoredState;
    const round = activity.rounds[roundIndex];
    const prog = state.rounds[roundIndex];
    if (!round || !prog) throw badRequest("That part of the activity doesn't exist.");
    const lang = activity.lang;
    const seed = activity.seed + roundIndex * 7 + prog.attempts;

    const counters = { attempts: 0, correct: 0, firstTry: 0, skips: 0 };
    let feedback: Feedback | null = null;
    let eventType = input.kind;
    let eventCorrect: boolean | null = null;

    if (prog.done && input.kind !== "story") {
      return { progress: prog, feedback: null, roundDone: true, sessionDone: nextOpenRound(state, 0) >= state.rounds.length, current: state.current };
    }

    const celebrate = (message = celebrateLine(lang, seed)): Feedback => ({ tone: "celebrate", message, correct: true });
    const comfort = (message = comfortLine(lang, seed)): Feedback => ({ tone: "comfort", message, correct: false });

    switch (input.kind) {
      case "skip": {
        finishRound(prog, round, "skipped");
        counters.skips = 1;
        feedback = { tone: "neutral", message: t(lang, "mimo.skipped") };
        break;
      }
      case "preview-seen": {
        prog.previewSeen = true;
        break;
      }
      case "choice": {
        if (round.key.kind !== "choice" || round.view.kind !== "choice") throw badRequest("Unexpected answer.");
        const view = round.view;
        const key = round.key;
        const valid = input.optionIds.filter((id) => view.options.some((o) => o.id === id) && !prog.eliminated.includes(id));
        if (!valid.length) throw badRequest("Please choose one of the answers.");
        prog.attempts += 1;
        prog.chosen = valid;
        counters.attempts = 1;
        if (key.open) {
          finishRound(prog, round, "completed");
          counters.correct = 1;
          counters.firstTry = 1;
          eventCorrect = true;
          feedback = celebrate();
          break;
        }
        const right = valid.filter((id) => key.correct.includes(id));
        const wrong = valid.filter((id) => !key.correct.includes(id));
        const ok = key.multi ? right.length > 0 && wrong.length === 0 : right.length === 1 && valid.length === 1;
        eventCorrect = ok;
        if (ok) {
          counters.correct = 1;
          if (prog.attempts === 1) counters.firstTry = 1;
          finishRound(prog, round, "correct");
          feedback = celebrate();
        } else {
          prog.wrong += 1;
          for (const id of wrong) if (!prog.eliminated.includes(id)) prog.eliminated.push(id);
          if (view.stages && prog.stage < view.stages.length - 1) prog.stage += 1; // a clearer picture helps, free
          const remaining = view.options.filter((o) => !prog.eliminated.includes(o.id));
          if (prog.attempts >= 2 || remaining.length <= key.correct.length) {
            finishRound(prog, round, "revealed");
            feedback = comfort();
          } else {
            feedback = comfort();
          }
        }
        break;
      }
      case "match": {
        if (round.key.kind !== "match" || round.view.kind !== "match") throw badRequest("Unexpected answer.");
        const ids = new Set(round.view.cards.map((c) => c.id));
        if (!ids.has(input.a) || !ids.has(input.b) || input.a === input.b) throw badRequest("Those cards aren't on the table.");
        if (prog.matched.includes(input.a) || prog.matched.includes(input.b)) break;
        prog.attempts += 1;
        counters.attempts = 1;
        const pair = round.key.pairs.find(([x, y]) => (x === input.a && y === input.b) || (x === input.b && y === input.a));
        eventCorrect = !!pair;
        if (pair) {
          prog.matched.push(input.a, input.b);
          counters.correct = 1;
          feedback = celebrate(t(lang, "game.pairFound"));
          if (prog.matched.length >= round.key.pairs.length * 2) {
            if (prog.wrong <= Math.floor(round.key.pairs.length / 3)) counters.firstTry = 1;
            finishRound(prog, round, "correct");
            feedback = celebrate();
          }
        } else {
          prog.wrong += 1;
          feedback = comfort(t(lang, "game.pairNot"));
        }
        break;
      }
      case "puzzle": {
        if (round.key.kind !== "puzzle" || round.view.kind !== "puzzle") throw badRequest("Unexpected answer.");
        const solution = round.key.solution;
        if (!(input.pieceId in solution)) throw badRequest("That piece isn't part of this puzzle.");
        const slots = round.view.rows * round.view.cols;
        if (!Number.isInteger(input.slot) || input.slot < 0 || input.slot >= slots) throw badRequest("That spot isn't on the board.");
        if (prog.placed[input.pieceId] !== undefined || Object.values(prog.placed).includes(input.slot)) break;
        prog.attempts += 1;
        counters.attempts = 1;
        eventCorrect = solution[input.pieceId] === input.slot;
        if (eventCorrect) {
          prog.placed[input.pieceId] = input.slot;
          counters.correct = 1;
          feedback = celebrate(t(lang, "game.fits"));
          if (Object.keys(prog.placed).length >= Object.keys(solution).length) {
            if (prog.wrong <= 2) counters.firstTry = 1;
            finishRound(prog, round, "correct");
            feedback = celebrate();
          }
        } else {
          prog.wrong += 1;
          feedback = comfort(t(lang, "game.notHere"));
        }
        break;
      }
      case "reveal-all": {
        if (round.key.kind === "puzzle") prog.placed = { ...round.key.solution };
        if (round.key.kind === "match") prog.matched = round.key.pairs.flat();
        if (round.key.kind === "order") prog.order = round.key.order;
        finishRound(prog, round, "revealed");
        feedback = { tone: "neutral", message: round.reveal?.text ?? "" };
        break;
      }
      case "order": {
        if (round.key.kind !== "order" || round.view.kind !== "order") throw badRequest("Unexpected answer.");
        const expected = new Set(round.view.items.map((i) => i.id));
        if (input.order.length !== expected.size || !input.order.every((id) => expected.has(id))) {
          throw badRequest("Please place every picture.");
        }
        prog.attempts += 1;
        counters.attempts = 1;
        const years = round.key.years;
        const ok = input.order.every((id, i) => i === 0 || years[input.order[i - 1]] <= years[id]);
        eventCorrect = ok;
        prog.order = input.order;
        if (ok) {
          counters.correct = 1;
          if (prog.attempts === 1) counters.firstTry = 1;
          finishRound(prog, round, "correct");
          feedback = celebrate();
        } else {
          prog.wrong += 1;
          if (prog.attempts >= 2) {
            prog.order = round.key.order;
            finishRound(prog, round, "revealed");
          }
          feedback = comfort();
        }
        break;
      }
      case "story": {
        if (round.view.kind !== "story") throw badRequest("Unexpected answer.");
        const last = round.view.slides.length - 1;
        prog.viewed = Math.max(prog.viewed, Math.min(last, Math.max(0, Math.floor(input.slide))));
        if (!prog.done && prog.viewed >= last) {
          finishRound(prog, round, "completed");
          counters.correct = 1;
          counters.firstTry = 1;
          feedback = celebrate(t(lang, "game.finishStory"));
        }
        eventType = "story";
        break;
      }
    }

    const roundDone = prog.done;
    if (roundDone) state.current = nextOpenRound(state, roundIndex + 1);
    const ms = typeof responseMs === "number" && responseMs > 0 && responseMs < 10 * 60 * 1000 ? Math.round(responseMs) : null;
    if (ms && counters.attempts && prefs.consent.trackResponseTimes) state.responseTimes.push(ms);
    const times = state.responseTimes;

    await tx
      .update(gameSessions)
      .set({
        state,
        attempts: sql`${gameSessions.attempts} + ${counters.attempts}`,
        correct: sql`${gameSessions.correct} + ${counters.correct}`,
        firstTryCorrect: sql`${gameSessions.firstTryCorrect} + ${counters.firstTry}`,
        skips: sql`${gameSessions.skips} + ${counters.skips}`,
        roundsCompleted: state.rounds.filter((r) => r.done && r.outcome !== "skipped").length,
        avgResponseMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      })
      .where(eq(gameSessions.id, sessionId));
    if (input.kind !== "preview-seen") {
      await tx.insert(gameEvents).values({
        sessionId,
        patientId,
        roundIndex,
        type: eventType,
        correct: eventCorrect,
        responseMs: prefs.consent.trackResponseTimes ? ms : null,
        data: { input: summarizeInput(input), outcome: prog.outcome ?? null },
      });
    }

    return {
      progress: prog,
      feedback,
      roundDone,
      sessionDone: state.rounds.every((r) => r.done),
      current: state.current,
    };
  });
}

function summarizeInput(input: AnswerInput): Record<string, unknown> {
  switch (input.kind) {
    case "choice":
      return { kind: "choice", n: input.optionIds.length };
    case "match":
      return { kind: "match" };
    case "puzzle":
      return { kind: "puzzle", slot: input.slot };
    case "order":
      return { kind: "order", n: input.order.length };
    case "story":
      return { kind: "story", slide: input.slide };
    default:
      return { kind: input.kind };
  }
}

// ─── Hints ────────────────────────────────────────────────────

export async function hintRound(patientId: string, sessionId: string, roundIndex: number): Promise<HintResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const row = await lockSession(tx, patientId, sessionId);
    if (row.status !== "in_progress") throw conflict("This activity has already finished.", "finished");
    const activity = row.activity as ServerActivity;
    const state = row.state as StoredState;
    const round = activity.rounds[roundIndex];
    const prog = state.rounds[roundIndex];
    if (!round || !prog) throw badRequest("That part of the activity doesn't exist.");
    const lang = activity.lang;
    if (prog.done || prog.hintsUsed >= round.view.hintsAllowed) {
      return { hint: null, progress: prog, message: t(lang, "hint.none") };
    }

    let payload: HintPayload | null = null;
    let message = t(lang, "mimo.hint");
    for (let i = prog.hintsUsed; i < round.hints.length && !payload; i++) {
      const def = round.hints[i];
      switch (def.type) {
        case "stage": {
          const stages = round.view.kind === "choice" ? round.view.stages : undefined;
          if (stages && prog.stage < stages.length - 1) {
            prog.stage += 1;
            payload = { type: "stage", stage: prog.stage };
            message = t(lang, "hint.clearer");
          }
          break;
        }
        case "eliminate": {
          if (round.view.kind !== "choice" || round.key.kind !== "choice") break;
          const key = round.key;
          const remaining = round.view.options.filter((o) => !prog.eliminated.includes(o.id));
          const removable = remaining.filter((o) => !key.correct.includes(o.id));
          if (remaining.length > key.correct.length + 1 && removable.length) {
            const pick = removable[(activity.seed + i) % removable.length];
            prog.eliminated.push(pick.id);
            payload = { type: "eliminate", eliminated: [pick.id] };
            message = t(lang, "hint.eliminate");
          }
          break;
        }
        case "text":
          payload = { type: "text", text: def.text };
          message = def.text;
          break;
        case "image":
          payload = { type: "image", image: def.image, text: def.text };
          message = def.text ?? t(lang, "hint.context");
          break;
        case "show-preview":
          payload = { type: "show-preview" };
          message = t(lang, "hint.lookAgain");
          break;
        case "pair": {
          if (round.key.kind !== "match") break;
          const pair = round.key.pairs.find(([a, b]) => !prog.matched.includes(a) && !prog.matched.includes(b));
          if (pair) {
            prog.matched.push(...pair);
            payload = { type: "pair", pair };
            message = t(lang, "hint.pair");
            if (prog.matched.length >= round.key.pairs.length * 2) finishRound(prog, round, "completed");
          }
          break;
        }
        case "piece": {
          if (round.key.kind !== "puzzle") break;
          const solution = round.key.solution;
          const next = Object.keys(solution).find((id) => prog.placed[id] === undefined);
          if (next) {
            prog.placed[next] = solution[next];
            payload = { type: "piece", piece: { pieceId: next, slot: solution[next] } };
            message = t(lang, "hint.piece");
            if (Object.keys(prog.placed).length >= Object.keys(solution).length) finishRound(prog, round, "completed");
          }
          break;
        }
        case "first": {
          if (round.key.kind !== "order") break;
          const firstId = round.key.order[prog.hintsUsed] ?? round.key.order[0];
          payload = { type: "first", firstId };
          message = t(lang, "hint.first");
          break;
        }
      }
    }
    if (!payload) return { hint: null, progress: prog, message: t(lang, "hint.none") };

    prog.hintsUsed += 1;
    if (prog.done) state.current = nextOpenRound(state, roundIndex + 1);
    await tx
      .update(gameSessions)
      .set({
        state,
        hintsUsed: sql`${gameSessions.hintsUsed} + 1`,
        roundsCompleted: state.rounds.filter((r) => r.done && r.outcome !== "skipped").length,
      })
      .where(eq(gameSessions.id, sessionId));
    await tx.insert(gameEvents).values({ sessionId, patientId, roundIndex, type: "hint", data: { hint: payload.type } });
    return { hint: payload, progress: prog, message };
  });
}

// ─── Finish & rewards ─────────────────────────────────────────

export async function finishActivity(p: PatientCtx, sessionId: string): Promise<RewardSummary> {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = (prefs.language === "te" ? "te" : "en") as Lang;

  const summary = await db.transaction(async (tx) => {
    const row = await lockSession(tx, p.patientId, sessionId);
    const state = row.state as StoredState;
    if (row.status !== "in_progress") return state.summary ?? emptySummary(row.status as RewardSummary["status"]);
    const activity = row.activity as ServerActivity;
    const engaged = state.rounds.some((r) => (r.done && r.outcome !== "skipped") || r.attempts > 0 || r.viewed > 0 || r.hintsUsed > 0);
    const allDone = state.rounds.every((r) => r.done);
    const allSkipped = state.rounds.every((r) => r.outcome === "skipped" || !r.done);
    const status: RewardSummary["status"] = allDone && !allSkipped ? "completed" : engaged ? "ended_early" : "skipped";
    const coins: { reason: string; amount: number }[] = [...(state.startBonuses ?? [])];
    let stamp: RewardSummary["stamp"] = null;

    if (status !== "skipped") {
      const award = async (amount: number, reason: string) => {
        await addCoins(tx, p.patientId, amount, reason, sessionId);
        coins.push({ reason, amount });
      };
      await award(status === "completed" ? COINS.activityComplete : COINS.participation, status === "completed" ? "activity_complete" : "participation");
      if (!(await hasPlayedGameBefore(tx, p.patientId, activity.game, sessionId))) await award(COINS.newActivity, "new_activity");
      if (row.caregiverSupported) await award(COINS.together, "together");

      if (row.levelId) {
        const [lp] = await tx
          .select()
          .from(levelProgress)
          .where(and(eq(levelProgress.patientId, p.patientId), eq(levelProgress.levelId, row.levelId)))
          .limit(1);
        const firstTime = !lp || lp.status !== "completed";
        if (firstTime) {
          // Core destinations carry their own bonus; destinations on bonus trails give 6.
          const bonus = findLevelDef(WORLDS, row.levelId)?.level.firstVisitBonus ?? 6;
          await award(bonus, "first_visit");
          stamp = { levelId: row.levelId, title: activity.title };
        }
        const earnedHere = coins.filter((c) => !(state.startBonuses ?? []).includes(c)).reduce((n, c) => n + c.amount, 0);
        await tx
          .insert(levelProgress)
          .values({
            patientId: p.patientId,
            levelId: row.levelId,
            worldId: row.worldId ?? "w1",
            status: "completed",
            firstCompletedAt: new Date(),
            lastCompletedAt: new Date(),
            timesCompleted: 1,
            coinsEarned: earnedHere,
          })
          .onConflictDoUpdate({
            target: [levelProgress.patientId, levelProgress.levelId],
            set: {
              status: "completed",
              firstCompletedAt: sql`coalesce(${levelProgress.firstCompletedAt}, now())`,
              lastCompletedAt: new Date(),
              timesCompleted: sql`${levelProgress.timesCompleted} + 1`,
              coinsEarned: sql`${levelProgress.coinsEarned} + ${earnedHere}`,
            },
          });
      }
    }

    await tx
      .update(gameSessions)
      .set({
        status,
        endedAt: new Date(),
        durationMs: Date.now() - row.startedAt.getTime(),
        roundsCompleted: state.rounds.filter((r) => r.done && r.outcome !== "skipped").length,
      })
      .where(eq(gameSessions.id, sessionId));

    let dailyCompleted = (state.startBonuses ?? []).some((b) => b.reason === "daily_adventure");
    if (status !== "skipped") {
      const game = activity.game;
      const daily = await markDailyTasks(
        tx,
        p.patientId,
        p.timezone,
        (task) =>
          (task.type === "play-game" && task.target === game) ||
          (task.type === "match" && (game === "memory-match" || game === "daily-life")),
      );
      if (daily.justCompleted) {
        coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
        dailyCompleted = true;
      }
    }

    const badgeIds = await evaluateBadges(tx, p.patientId);
    coins.push(...badgeIds.map(() => ({ reason: "badge", amount: COINS.badge })));
    const grown = await growGarden(tx, p.patientId);

    // Challenge consent: count down any snooze, then see whether Mimo may *ask*.
    let offer: ChallengeOfferView | null = null;
    if (status !== "skipped") offer = await maybeOffer(tx, p.patientId, activity.game, lang, sessionId);

    const wallet = await getWallet(tx, p.patientId);
    const result: RewardSummary = {
      status,
      coins,
      totalCoins: coins.reduce((n, c) => n + c.amount, 0),
      balance: wallet.balance,
      badges: badgeIds.map((id) => {
        const b = BADGE_BY_ID.get(id)!;
        return { id, name: loc(b.name, lang), icon: b.icon };
      }),
      garden: grown.map((id) => ({ id, name: loc(growthName(id), lang) })),
      stamp,
      levelsOpened: [],
      worldsOpened: [],
      challengeOffer: offer,
      dailyCompleted,
    };
    // Stored with the session so finishing twice never pays twice.
    await tx
      .update(gameSessions)
      .set({ coinsAwarded: result.totalCoins, state: { ...state, summary: result } })
      .where(eq(gameSessions.id, sessionId));
    return { result, fresh: true };
  });

  if (!("fresh" in summary)) return summary;
  const result = summary.result;
  // Places that opened because of this visit (persisted now so the map shows them immediately).
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang, { persist: true });
  result.levelsOpened = map.newlyOpenedLevels;
  result.worldsOpened = map.worlds.filter((w) => map.newlyOpenedWorlds.includes(w.id)).map((w) => ({ id: w.id, name: w.name }));
  if (result.levelsOpened.length || result.worldsOpened.length) {
    await db.transaction(async (tx) => {
      const row = await lockSession(tx, p.patientId, sessionId);
      await tx
        .update(gameSessions)
        .set({ state: { ...(row.state as StoredState), summary: result } })
        .where(eq(gameSessions.id, sessionId));
    });
  }
  return result;
}

function emptySummary(status: RewardSummary["status"]): RewardSummary {
  return {
    status,
    coins: [],
    totalCoins: 0,
    balance: 0,
    badges: [],
    garden: [],
    stamp: null,
    levelsOpened: [],
    worldsOpened: [],
    challengeOffer: null,
    dailyCompleted: false,
  };
}

async function maybeOffer(exec: Executor, patientId: string, game: GameType, lang: Lang, sessionId: string) {
  const prefs = await getPreferences(exec, patientId);
  const snooze = { ...prefs.challenge.snooze };
  if ((snooze[game] ?? 0) > 0) {
    snooze[game] = (snooze[game] ?? 0) - 1;
    await updatePreferences(exec, patientId, { challenge: { ...prefs.challenge, snooze } });
    prefs.challenge.snooze = snooze;
  }
  const [pending] = await exec
    .select()
    .from(challengeOffers)
    .where(and(eq(challengeOffers.patientId, patientId), eq(challengeOffers.status, "pending")))
    .limit(1);
  if (pending) {
    return pending.gameType === game
      ? { id: pending.id, game, gameName: loc(GAMES[game].name, lang), direction: pending.direction }
      : null;
  }
  const recent = (await exec
    .select({
      gameType: gameSessions.gameType,
      challengeLevel: gameSessions.challengeLevel,
      status: gameSessions.status,
      roundsCompleted: gameSessions.roundsCompleted,
      firstTryCorrect: gameSessions.firstTryCorrect,
      hintsUsed: gameSessions.hintsUsed,
      skips: gameSessions.skips,
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.patientId, patientId),
        eq(gameSessions.gameType, game),
        inArray(gameSessions.status, ["completed", "ended_early"]),
      ),
    )
    .orderBy(desc(gameSessions.startedAt))
    .limit(6)) as SessionSummary[];
  const decision = shouldOffer(prefs.challenge, game, recent);
  if (!decision) return null;
  const id = crypto.randomUUID();
  await exec.insert(challengeOffers).values({
    id,
    patientId,
    gameType: game,
    direction: decision.direction,
    fromLevel: decision.from,
    toLevel: decision.to,
    sessionId,
  });
  return { id, game, gameName: loc(GAMES[game].name, lang), direction: decision.direction };
}

/** The patient's answer to "Would you like to try a little more of a challenge?" */
export async function respondToOffer(patientId: string, offerId: string, response: "accepted" | "keep_familiar" | "later") {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [offer] = await tx
      .select()
      .from(challengeOffers)
      .where(and(eq(challengeOffers.id, offerId), eq(challengeOffers.patientId, patientId)))
      .limit(1);
    if (!offer) throw notFound("That question has already been answered.");
    if (offer.status !== "pending") return { status: offer.status };
    await tx.update(challengeOffers).set({ status: response, respondedAt: new Date() }).where(eq(challengeOffers.id, offerId));
    const prefs = await getPreferences(tx, patientId);
    const game = offer.gameType as GameType;
    const challenge = { ...prefs.challenge, levels: { ...prefs.challenge.levels }, snooze: { ...prefs.challenge.snooze } };
    if (response === "accepted") {
      challenge.levels[game] = offer.toLevel;
      challenge.snooze[game] = 0;
    } else {
      challenge.snooze[game] = SNOOZE_AFTER[response];
    }
    await updatePreferences(tx, patientId, { challenge });
    return { status: response };
  });
}

export async function pendingOffer(patientId: string, lang: Lang): Promise<ChallengeOfferView | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(challengeOffers)
    .where(and(eq(challengeOffers.patientId, patientId), eq(challengeOffers.status, "pending")))
    .orderBy(desc(challengeOffers.offeredAt))
    .limit(1);
  if (!row) return null;
  const game = row.gameType as GameType;
  return { id: row.id, game, gameName: loc(GAMES[game].name, lang), direction: row.direction };
}
