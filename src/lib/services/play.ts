import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, type Executor } from "../db";
import {
  characters,
  gameSessions,
  gardenState,
  memories,
  ownedItems,
  patientBadges,
  patientEvents,
  worldState,
} from "../db/schema";
import { conflict, notFound, badRequest } from "../api/http";
import { isCloudinaryConfigured } from "../cloudinary/client";
import { searchMemories } from "../cloudinary/search";
import { photo, thumb, type DeliveryOptions } from "../cloudinary/urls";
import { CATEGORY_INFO } from "../content/categories";
import { BADGES, GROWTH, growthName } from "../content/rewards";
import { CATEGORY_SLOT, isGardenItem, SHOP_BY_ID, SHOP_ITEMS, type ShopItem, type UnlockRequirement, type WearSlot } from "../content/shop";
import { loc, t } from "../i18n";
import { ensureDaily, localDay, markDailyTasks } from "../game/daily";
import { unfinishedSession, pendingOffer } from "../game/engine";
import { GAMES } from "../game/games";
import { completedSessionCount, computeMap } from "../game/progress";
import { addCoins, COINS, evaluateBadges, getWallet, logEvent, visitWorld } from "../game/rewards";
import { WORLDS } from "../game/worlds";
import { getPreferences } from "./preferences";
import type { Category, CharacterAppearance, EquippedSlots, Lang } from "../types";

export type PatientRef = { patientId: string; code: string; timezone: string; addressAs: string };

const asLang = (v: string): Lang => (v === "te" ? "te" : "en");

export type Effects = { coins: { reason: string; amount: number }[]; badges: { id: string; name: string; icon: string }[] };

async function collectEffects(exec: Executor, patientId: string, lang: Lang, coins: { reason: string; amount: number }[]): Promise<Effects> {
  const badgeIds = await evaluateBadges(exec, patientId);
  return {
    coins: [...coins, ...badgeIds.map(() => ({ reason: "badge", amount: COINS.badge }))],
    badges: badgeIds.map((id) => {
      const b = BADGES.find((x) => x.id === id)!;
      return { id, name: loc(b.name, lang), icon: b.icon };
    }),
  };
}

// ─── Home ─────────────────────────────────────────────────────

export async function homeState(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const [character] = await db.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
  const wallet = await getWallet(db, p.patientId);
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang, { persist: true });

  const [lastSession] = await db
    .select({ at: gameSessions.startedAt })
    .from(gameSessions)
    .where(eq(gameSessions.patientId, p.patientId))
    .orderBy(desc(gameSessions.startedAt))
    .limit(1);
  const [lastEvent] = await db
    .select({ at: patientEvents.createdAt })
    .from(patientEvents)
    .where(and(eq(patientEvents.patientId, p.patientId), eq(patientEvents.type, "home_visit")))
    .orderBy(desc(patientEvents.createdAt))
    .limit(1);
  const lastSeen = [lastSession?.at, lastEvent?.at].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
  const returning = lastSeen ? Date.now() - lastSeen.getTime() > 20 * 60 * 60 * 1000 : false;
  await logEvent(db, p.patientId, "home_visit");

  const owned = await db.select().from(ownedItems).where(eq(ownedItems.patientId, p.patientId));
  const ownedIds = new Set(owned.map((o) => o.itemId));
  const [favoriteCount] = await db
    .select({ n: count() })
    .from(memories)
    .where(and(eq(memories.patientId, p.patientId), eq(memories.favorite, true), eq(memories.status, "approved")));
  const cheapestGarden = SHOP_ITEMS.filter((i) => isGardenItem(i) && !ownedIds.has(i.id)).sort((a, b) => a.price - b.price)[0];
  const daily = character
    ? await ensureDaily(db, p.patientId, p.timezone, prefs, map.worlds, {
        hasFavorites: Number(favoriteCount?.n ?? 0) > 0,
        canBuyGardenItem: !!cheapestGarden && wallet.balance >= cheapestGarden.price,
        ownsWearable: owned.some((o) => {
          const item = SHOP_BY_ID.get(o.itemId);
          return item && !!CATEGORY_SLOT[item.category];
        }),
      })
    : null;

  const mimo = character?.name ?? "Mimo";
  const worldName = (id?: string) => map.worlds.find((w) => w.id === id)?.name ?? "";
  const taskText = (task: NonNullable<typeof daily>["tasks"][number]) => {
    switch (task.type) {
      case "visit-world":
        return t(lang, "task.visit-world", { world: worldName(task.target) });
      case "play-game":
        return t(lang, "task.play-game", { game: task.target ? loc(GAMES[task.target as keyof typeof GAMES]?.name, lang) : "" });
      case "favorite-memory":
        return t(lang, "task.favorite-memory");
      case "match":
        return t(lang, "task.match");
      case "garden":
        return t(lang, task.target === "buy" ? "task.garden.buy" : "task.garden");
      case "dress-mimo":
        return t(lang, "task.dress-mimo", { mimo });
    }
  };
  const taskHref = (task: NonNullable<typeof daily>["tasks"][number]) => {
    switch (task.type) {
      case "visit-world":
        return `/play/map?world=${task.target}`;
      case "play-game": {
        const level = map.worlds.flatMap((w) => w.levels).find((l) => l.game === task.target && ["available", "revisit", "completed"].includes(l.status));
        return level ? `/play/map?level=${level.id}` : "/play/map";
      }
      case "favorite-memory":
        return "/play/album?tab=favorites";
      case "match": {
        const level = map.worlds
          .flatMap((w) => w.levels)
          .find((l) => (l.game === "memory-match" || l.game === "daily-life") && ["available", "revisit", "completed"].includes(l.status));
        return level ? `/play/map?level=${level.id}` : "/play/map";
      }
      case "garden":
        return task.target === "buy" ? "/play/shop?category=garden" : "/play/garden";
      case "dress-mimo":
        return "/play/shop?tab=collection";
    }
  };

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: safeTz(p.timezone) }).format(new Date()));
  const greetKey = hour < 12 ? "greet.morning" : hour < 17 ? "greet.afternoon" : "greet.evening";
  const greeting = !character
    ? t(lang, "greet.firstTime", { mimo })
    : returning
      ? t(lang, "greet.welcomeBack", { name: p.addressAs, mimo })
      : t(lang, "greet.explore", { name: p.addressAs });

  return {
    patient: { name: p.addressAs, code: p.code },
    lang,
    prefs: {
      accessibility: prefs.accessibility,
      voice: prefs.voice,
      language: lang,
      breakReminderMinutes: prefs.breakReminderMinutes,
      sessionMinutes: prefs.sessionMinutes,
    },
    character: character ? { name: character.name, appearance: character.appearance, equipped: character.equipped } : null,
    wallet: { balance: wallet.balance, lifetimeEarned: wallet.lifetimeEarned },
    greeting,
    timeGreeting: t(lang, greetKey, { name: p.addressAs }),
    returning,
    daily: daily
      ? { completed: daily.completed, tasks: daily.tasks.map((task) => ({ ...task, text: taskText(task), href: taskHref(task) })) }
      : null,
    offer: await pendingOffer(p.patientId, lang),
    resume: await unfinishedSession(p.patientId),
    worldsOpen: map.worlds.filter((w) => w.unlocked).length,
    cloudinaryReady: isCloudinaryConfigured(),
  };
}

function safeTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "Asia/Kolkata";
  }
}

// ─── Map ──────────────────────────────────────────────────────

export async function mapState(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang, { persist: true });
  const [character] = await db.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
  return {
    lang,
    worlds: map.worlds,
    totalCompleted: map.totalCompleted,
    character: character ? { name: character.name, appearance: character.appearance, equipped: character.equipped } : null,
  };
}

/** Opening a world page counts as visiting that destination (first visit earns coins + a keepsake). */
export async function visitWorldEvent(p: PatientRef, worldId: string) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang);
  const world = map.worlds.find((w) => w.id === worldId);
  if (!world || !world.unlocked) throw conflict("That place opens a little later.", "locked");
  return db.transaction(async (tx) => {
    const coins: Effects["coins"] = [];
    if (await visitWorld(tx, p.patientId, worldId)) coins.push({ reason: "new_destination", amount: COINS.newDestination });
    const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "visit-world" && task.target === worldId);
    if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    return collectEffects(tx, p.patientId, lang, coins);
  });
}

// ─── Character & shop ─────────────────────────────────────────

export async function saveCharacter(patientId: string, input: { name: string; appearance: CharacterAppearance }) {
  const db = await getDb();
  const name = input.name.trim().slice(0, 24) || "Mimo";
  await db
    .insert(characters)
    .values({ patientId, name, appearance: input.appearance, equipped: {} })
    .onConflictDoUpdate({ target: characters.patientId, set: { name, appearance: input.appearance, updatedAt: new Date() } });
}

async function unlockStatus(exec: Executor, patientId: string) {
  const visited = new Set(
    (
      await exec
        .select({ id: worldState.worldId })
        .from(worldState)
        .where(and(eq(worldState.patientId, patientId), isNotNull(worldState.firstVisitedAt)))
    ).map((r) => r.id),
  );
  const badges = new Set(
    (await exec.select({ id: patientBadges.badgeId }).from(patientBadges).where(eq(patientBadges.patientId, patientId))).map((r) => r.id),
  );
  const completions = await completedSessionCount(exec, patientId);
  return (req: UnlockRequirement | undefined) => {
    if (!req) return true;
    if (req.type === "world-visited") return visited.has(req.worldId);
    if (req.type === "badge") return badges.has(req.badgeId);
    return completions >= req.count;
  };
}

function requirementText(req: UnlockRequirement | undefined, lang: Lang) {
  if (!req) return "";
  if (req.type === "world-visited") return loc(WORLDS.find((w) => w.id === req.worldId)?.name, lang);
  if (req.type === "badge") return loc(BADGES.find((b) => b.id === req.badgeId)?.name, lang);
  return lang === "te" ? `${req.count} సందర్శనలు` : `${req.count} visits`;
}

export async function shopState(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const wallet = await getWallet(db, p.patientId);
  const owned = new Set((await db.select().from(ownedItems).where(eq(ownedItems.patientId, p.patientId))).map((o) => o.itemId));
  const [character] = await db.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
  const [garden] = await db.select().from(gardenState).where(eq(gardenState.patientId, p.patientId)).limit(1);
  const isUnlocked = await unlockStatus(db, p.patientId);
  const equipped = character?.equipped ?? {};
  const placed = new Set(garden?.placed ?? []);
  return {
    lang,
    balance: wallet.balance,
    character: character ? { name: character.name, appearance: character.appearance, equipped } : null,
    items: SHOP_ITEMS.map((item) => {
      const slot = CATEGORY_SLOT[item.category];
      const unlocked = isUnlocked(item.unlock);
      return {
        id: item.id,
        name: loc(item.name, lang),
        category: item.category,
        price: item.price,
        slot: slot ?? null,
        owned: owned.has(item.id),
        equipped: slot ? equipped[slot] === item.id : false,
        placed: placed.has(item.id),
        unlocked,
        requirement: unlocked ? null : requirementText(item.unlock, lang),
        seasonal: item.seasonal ?? null,
      };
    }),
  };
}

export async function buyItem(p: PatientRef, itemId: string) {
  const item = SHOP_BY_ID.get(itemId);
  if (!item) throw notFound("That treasure isn't in the shop.");
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const isUnlocked = await unlockStatus(db, p.patientId);
  if (!isUnlocked(item.unlock)) throw conflict("This treasure opens a little later.", "locked");
  return db.transaction(async (tx) => {
    const [already] = await tx
      .select()
      .from(ownedItems)
      .where(and(eq(ownedItems.patientId, p.patientId), eq(ownedItems.itemId, itemId)))
      .limit(1);
    if (already) throw conflict("This treasure is already yours.", "owned");
    const wallet = await getWallet(tx, p.patientId);
    if (wallet.balance < item.price) throw conflict("A few more coins are needed.", "not_enough");
    await tx.insert(ownedItems).values({ patientId: p.patientId, itemId, source: "purchase" });
    await addCoins(tx, p.patientId, -item.price, "purchase", itemId);
    const coins: Effects["coins"] = [];
    if (isGardenItem(item)) {
      // Garden decorations go straight into the garden (they can be moved out any time).
      const [garden] = await tx.select().from(gardenState).where(eq(gardenState.patientId, p.patientId)).limit(1);
      const placed = [...new Set([...(garden?.placed ?? []), itemId])];
      await tx
        .insert(gardenState)
        .values({ patientId: p.patientId, grown: garden?.grown ?? [], placed })
        .onConflictDoUpdate({ target: gardenState.patientId, set: { placed, updatedAt: new Date() } });
      const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "garden");
      if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    }
    const effects = await collectEffects(tx, p.patientId, lang, coins);
    const after = await getWallet(tx, p.patientId);
    return { balance: after.balance, effects };
  });
}

export async function equipItem(p: PatientRef, slot: WearSlot, itemId: string | null) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  if (itemId) {
    const item = SHOP_BY_ID.get(itemId);
    if (!item || CATEGORY_SLOT[item.category] !== slot) throw badRequest("That treasure doesn't go there.");
  }
  return db.transaction(async (tx) => {
    if (itemId) {
      const [own] = await tx
        .select()
        .from(ownedItems)
        .where(and(eq(ownedItems.patientId, p.patientId), eq(ownedItems.itemId, itemId)))
        .limit(1);
      if (!own) throw conflict("That treasure isn't in your collection yet.", "not_owned");
    }
    const [character] = await tx.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
    if (!character) throw conflict("Let's meet your garden friend first.", "no_character");
    const equipped: EquippedSlots = { ...(character.equipped ?? {}), [slot]: itemId };
    await tx.update(characters).set({ equipped, updatedAt: new Date() }).where(eq(characters.patientId, p.patientId));
    const coins: Effects["coins"] = [];
    if (itemId) {
      const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "dress-mimo");
      if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    }
    return { equipped, effects: await collectEffects(tx, p.patientId, lang, coins) };
  });
}

export async function placeInGarden(p: PatientRef, itemId: string, place: boolean) {
  const item = SHOP_BY_ID.get(itemId);
  if (!item || !isGardenItem(item)) throw badRequest("That treasure doesn't go in the garden.");
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  return db.transaction(async (tx) => {
    const [own] = await tx
      .select()
      .from(ownedItems)
      .where(and(eq(ownedItems.patientId, p.patientId), eq(ownedItems.itemId, itemId)))
      .limit(1);
    if (!own) throw conflict("That treasure isn't in your collection yet.", "not_owned");
    const [garden] = await tx.select().from(gardenState).where(eq(gardenState.patientId, p.patientId)).limit(1);
    const current = new Set(garden?.placed ?? []);
    if (place) current.add(itemId);
    else current.delete(itemId);
    const placed = [...current];
    await tx
      .insert(gardenState)
      .values({ patientId: p.patientId, grown: garden?.grown ?? [], placed })
      .onConflictDoUpdate({ target: gardenState.patientId, set: { placed, updatedAt: new Date() } });
    return { placed, effects: await collectEffects(tx, p.patientId, lang, []) };
  });
}

// ─── Garden ───────────────────────────────────────────────────

export async function gardenView(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const [garden] = await db.select().from(gardenState).where(eq(gardenState.patientId, p.patientId)).limit(1);
  const [character] = await db.select().from(characters).where(eq(characters.patientId, p.patientId)).limit(1);
  const done = await completedSessionCount(db, p.patientId);
  const next = GROWTH.find((g) => g.at > done);
  const owned = (await db.select().from(ownedItems).where(eq(ownedItems.patientId, p.patientId)))
    .map((o) => SHOP_BY_ID.get(o.itemId))
    .filter((i): i is ShopItem => !!i && isGardenItem(i));
  return {
    lang,
    grown: (garden?.grown ?? []).map((g) => ({ ...g, name: loc(growthName(g.id), lang) })),
    placed: garden?.placed ?? [],
    ownedDecorations: owned.map((i) => ({ id: i.id, name: loc(i.name, lang), placed: (garden?.placed ?? []).includes(i.id) })),
    nextIn: next ? next.at - done : null,
    character: character ? { name: character.name, appearance: character.appearance, equipped: character.equipped } : null,
  };
}

export async function gardenVisitEvent(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  return db.transaction(async (tx) => {
    await logEvent(tx, p.patientId, "garden_visit");
    const coins: Effects["coins"] = [];
    const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "garden" && task.target !== "buy");
    if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    return collectEffects(tx, p.patientId, lang, coins);
  });
}

export async function breakEvent(p: PatientRef, kind: "taken" | "shown" | "declined") {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  return db.transaction(async (tx) => {
    await logEvent(tx, p.patientId, kind === "taken" ? "break_taken" : kind === "shown" ? "break_reminder" : "break_declined");
    return collectEffects(tx, p.patientId, lang, []);
  });
}

// ─── Album & memories ─────────────────────────────────────────

export async function albumState(p: PatientRef, delivery: DeliveryOptions) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang);
  const earned = await db.select().from(patientBadges).where(eq(patientBadges.patientId, p.patientId));
  const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));
  const favorites = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.patientId, p.patientId),
        eq(memories.favorite, true),
        eq(memories.status, "approved"),
        eq(memories.sensitive, false),
        inArray(memories.mediaType, ["photo", "video"]),
      ),
    )
    .orderBy(desc(memories.favoritedAt));
  const eligible = await db
    .select({ category: memories.category, n: count() })
    .from(memories)
    .where(
      and(
        eq(memories.patientId, p.patientId),
        eq(memories.status, "approved"),
        eq(memories.gameEligible, true),
        eq(memories.sensitive, false),
        inArray(memories.mediaType, ["photo", "video"]),
      ),
    )
    .groupBy(memories.category);

  const canSign = isCloudinaryConfigured();
  return {
    lang,
    stamps: map.worlds
      .filter((w) => !w.bonus)
      .map((w) => ({
        worldId: w.id,
        worldName: w.name,
        icon: w.theme.icon,
        accent: w.theme.accent,
        levels: w.levels.map((l) => ({
          id: l.id,
          title: l.title,
          icon: l.icon,
          earned: l.status === "completed" || l.status === "revisit",
        })),
      })),
    badges: BADGES.map((b) => ({
      id: b.id,
      name: loc(b.name, lang),
      description: loc(b.description, lang),
      icon: b.icon,
      color: b.color,
      earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
    })),
    favorites: canSign
      ? favorites.map((m) => ({
          id: m.id,
          title: m.title || loc(CATEGORY_INFO[m.category as Category]?.label, lang),
          thumb: thumb(m, m.title || "memory", 360, delivery),
        }))
      : [],
    categories: eligible
      .filter((c) => Number(c.n) > 0)
      .map((c) => ({
        id: c.category,
        label: loc(CATEGORY_INFO[c.category as Category]?.label, lang),
        icon: CATEGORY_INFO[c.category as Category]?.icon ?? "💫",
        count: Number(c.n),
      })),
  };
}

/** "Explore memories": category browsing retrieved through the Cloudinary Search API. */
export async function exploreCategory(p: PatientRef, category: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const rows = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.patientId, p.patientId),
        eq(memories.status, "approved"),
        eq(memories.gameEligible, true),
        eq(memories.sensitive, false),
        eq(memories.category, category),
        inArray(memories.mediaType, ["photo", "video"]),
      ),
    );
  let ordered = rows;
  let source: "cloudinary-search" | "database" = "database";
  try {
    const res = await searchMemories({ patientCode: p.code, eligibleOnly: true, categories: [category], maxResults: 60 });
    const byPublic = new Map(rows.map((m) => [m.publicId, m]));
    const found = res.resources.map((r) => byPublic.get(r.public_id)).filter((m): m is (typeof rows)[number] => !!m);
    const rest = rows.filter((m) => !found.includes(m));
    ordered = [...found, ...rest];
    source = "cloudinary-search";
  } catch {
    /* fall back to database order */
  }
  return {
    lang,
    source,
    items: ordered.slice(0, 24).map((m) => ({
      id: m.id,
      title: m.title || loc(CATEGORY_INFO[m.category as Category]?.label, lang),
      thumb: thumb(m, m.title || "memory", 360, delivery),
      favorite: m.favorite,
    })),
  };
}

export async function openMemory(p: PatientRef, memoryId: string, delivery: DeliveryOptions) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const [m] = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.id, memoryId),
        eq(memories.patientId, p.patientId),
        eq(memories.status, "approved"),
        eq(memories.sensitive, false),
      ),
    )
    .limit(1);
  if (!m || m.mediaType === "audio") throw notFound("That memory isn't available.");

  const effects = await db.transaction(async (tx) => {
    const coins: Effects["coins"] = [];
    if (m.favorite) {
      const day = localDay(p.timezone);
      const [already] = await tx
        .select({ n: count() })
        .from(patientEvents)
        .where(
          and(
            eq(patientEvents.patientId, p.patientId),
            eq(patientEvents.type, "favorite_revisit"),
            sql`${patientEvents.data}->>'memoryId' = ${m.id}`,
            sql`${patientEvents.data}->>'day' = ${day}`,
          ),
        );
      if (Number(already?.n ?? 0) === 0) {
        await logEvent(tx, p.patientId, "favorite_revisit", { memoryId: m.id, day });
        await addCoins(tx, p.patientId, COINS.favoriteRevisit, "favorite_revisit", m.id);
        coins.push({ reason: "favorite_revisit", amount: COINS.favoriteRevisit });
      }
      const daily = await markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "favorite-memory");
      if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
    }
    return collectEffects(tx, p.patientId, lang, coins);
  });

  return {
    memory: {
      id: m.id,
      title: m.title,
      caption: m.caption,
      year: m.year,
      location: m.location,
      language: m.language,
      favorite: m.favorite,
      image: photo(m, m.title || "memory", delivery),
    },
    effects,
  };
}

export async function setFavorite(p: PatientRef, memoryId: string, favorite: boolean) {
  const db = await getDb();
  const [m] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.patientId, p.patientId), eq(memories.status, "approved")))
    .limit(1);
  if (!m) throw notFound("That memory isn't available.");
  await db
    .update(memories)
    .set({ favorite, favoritedAt: favorite ? new Date() : null, updatedAt: new Date() })
    .where(eq(memories.id, memoryId));
  const prefs = await getPreferences(db, p.patientId);
  const coins: Effects["coins"] = [];
  if (favorite) {
    const daily = await db.transaction((tx) =>
      markDailyTasks(tx, p.patientId, p.timezone, (task) => task.type === "favorite-memory"),
    );
    if (daily.justCompleted) coins.push({ reason: "daily_adventure", amount: COINS.dailyAdventure });
  }
  return { favorite, effects: await db.transaction((tx) => collectEffects(tx, p.patientId, asLang(prefs.language), coins)) };
}

// ─── My Journey (patient-facing progress) ─────────────────────

export async function journeyState(p: PatientRef) {
  const db = await getDb();
  const prefs = await getPreferences(db, p.patientId);
  const lang = asLang(prefs.language);
  const map = await computeMap(db, { id: p.patientId, code: p.code }, prefs, lang);
  const wallet = await getWallet(db, p.patientId);
  const [items] = await db.select({ n: count() }).from(ownedItems).where(eq(ownedItems.patientId, p.patientId));
  const [badges] = await db.select({ n: count() }).from(patientBadges).where(eq(patientBadges.patientId, p.patientId));
  const [garden] = await db.select().from(gardenState).where(eq(gardenState.patientId, p.patientId)).limit(1);
  const games = await db
    .select({ game: gameSessions.gameType, n: count() })
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, p.patientId), inArray(gameSessions.status, ["completed", "ended_early"])))
    .groupBy(gameSessions.gameType)
    .orderBy(desc(count()))
    .limit(3);
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
  const recentSessions = await db
    .select({ ids: gameSessions.memoryIds })
    .from(gameSessions)
    .where(and(eq(gameSessions.patientId, p.patientId), gte(gameSessions.startedAt, since)));
  const ids = [...new Set(recentSessions.flatMap((r) => r.ids))];
  const cats = ids.length
    ? await db
        .select({ category: memories.category, n: count() })
        .from(memories)
        .where(inArray(memories.id, ids))
        .groupBy(memories.category)
        .orderBy(desc(count()))
        .limit(3)
    : [];
  const core = map.worlds.filter((w) => !w.bonus);
  return {
    lang,
    worldsVisited: map.worlds.filter((w) => w.visited).length,
    worldsTotal: map.worlds.length,
    levelsCompleted: map.worlds.reduce((n, w) => n + w.completed, 0),
    levelsTotal: core.reduce((n, w) => n + w.total, 0) + map.worlds.filter((w) => w.bonus).reduce((n, w) => n + w.total, 0),
    worlds: map.worlds.map((w) => ({ id: w.id, name: w.name, icon: w.theme.icon, completed: w.completed, total: w.total, visited: w.visited, unlocked: w.unlocked })),
    coinsLifetime: wallet.lifetimeEarned,
    balance: wallet.balance,
    itemsOwned: Number(items?.n ?? 0),
    badges: Number(badges?.n ?? 0),
    gardenCount: garden?.grown.length ?? 0,
    favoriteGames: games.map((g) => {
      const info = GAMES[g.game as keyof typeof GAMES];
      return { game: g.game, name: loc(info?.name, lang), icon: info?.icon ?? "✨" };
    }),
    favoriteCategories: cats.map((c) => ({
      id: c.category,
      label: loc(CATEGORY_INFO[c.category as Category]?.label, lang),
      icon: CATEGORY_INFO[c.category as Category]?.icon ?? "💫",
    })),
  };
}
