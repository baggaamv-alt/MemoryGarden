import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AccessibilityPrefs,
  AiInfo,
  Box,
  ChallengePrefs,
  CharacterAppearance,
  ConsentPrefs,
  DailyTask,
  EquippedSlots,
  SyncInfo,
  VoicePrefs,
} from "../types";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const textArray = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

// ─── People & access ──────────────────────────────────────────

/** Caregivers sign in; patients are users without a password who play in "patient mode". */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  role: text("role", { enum: ["caregiver", "patient"] }).notNull(),
  email: text("email").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const patientProfiles = pgTable("patient_profiles", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Short code used in Cloudinary folders and metadata, e.g. P001. */
  code: text("code").notNull().unique(),
  /** How Mimo greets the patient, e.g. "Amma". */
  addressAs: text("address_as").notNull(),
  birthYear: integer("birth_year"),
  hometown: text("hometown"),
  about: text("about"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const careLinks = pgTable(
  "care_links",
  {
    caregiverId: text("caregiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Relationship of the caregiver to the patient, e.g. "Daughter". */
    relationship: text("relationship").notNull().default("Caregiver"),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("owner"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.caregiverId, t.patientId] })],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    /** SHA-256 of the cookie token — the raw token is never stored. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["caregiver", "patient"] }).notNull(),
    patientId: text("patient_id").references(() => users.id, { onDelete: "cascade" }),
    /** A caregiver session is locked while patient mode is open on the same device. */
    locked: boolean("locked").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

// ─── Memories ─────────────────────────────────────────────────

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["photo", "video", "audio"] }).notNull(),
    resourceType: text("resource_type", { enum: ["image", "video"] }).notNull(),
    deliveryType: text("delivery_type", { enum: ["authenticated", "upload"] }).notNull(),
    publicId: text("public_id").notNull().unique(),
    assetId: text("asset_id"),
    version: bigint("version", { mode: "number" }),
    format: text("format"),
    width: integer("width"),
    height: integer("height"),
    duration: real("duration"),
    bytes: integer("bytes"),
    assetFolder: text("asset_folder"),
    originalFilename: text("original_filename"),
    category: text("category").notNull().default("other"),
    title: text("title").notNull().default(""),
    event: text("event"),
    year: integer("year"),
    approxDate: text("approx_date"),
    location: text("location"),
    language: text("language").notNull().default("en"),
    importance: integer("importance").notNull().default(3),
    /** Caregiver-approved caption. AI suggestions live in `ai` until approved. */
    caption: text("caption"),
    tags: textArray("tags"),
    faces: jsonb("faces").$type<Box[]>().notNull().default([]),
    ai: jsonb("ai").$type<AiInfo>().notNull().default({}),
    status: text("status", { enum: ["pending", "approved", "excluded"] }).notNull().default("pending"),
    /** Caregiver marked as sensitive — never used in activities. */
    sensitive: boolean("sensitive").notNull().default(false),
    gameEligible: boolean("game_eligible").notNull().default(false),
    favorite: boolean("favorite").notNull().default(false),
    favoritedAt: ts("favorited_at"),
    /** Audio clip → the photo memory it belongs to (Sound & Memory). */
    linkedMemoryId: text("linked_memory_id"),
    /** Audio clip → the person speaking/singing, when known. */
    linkedPersonId: text("linked_person_id"),
    sync: jsonb("sync").$type<SyncInfo>().notNull().default({ metadataSynced: false }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    /** Where an imported memory came from (e.g. "legacy:photo:<id>"), so re-imports never duplicate. */
    sourceRef: text("source_ref").unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("memories_patient_idx").on(t.patientId),
    index("memories_patient_status_idx").on(t.patientId, t.status),
  ],
);

export const people = pgTable(
  "people",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Key from the relationship list (e.g. "daughter") or "custom". */
    relationshipKey: text("relationship_key").notNull().default("custom"),
    /** Caregiver's own wording, shown when present (e.g. "Chinni's husband"). */
    relationshipLabel: text("relationship_label"),
    notes: text("notes"),
    sourceRef: text("source_ref").unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("people_patient_idx").on(t.patientId)],
);

export const memoryPeople = pgTable(
  "memory_people",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    /** Face box chosen by the caregiver (from Cloudinary face detection or drawn by hand). */
    face: jsonb("face").$type<Box | null>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memory_people_unique").on(t.memoryId, t.personId)],
);

export const memoryObjects = pgTable(
  "memory_objects",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    box: jsonb("box").$type<Box | null>(),
    source: text("source", { enum: ["caregiver", "ai"] }).notNull().default("caregiver"),
    confidence: real("confidence"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("memory_objects_memory_idx").on(t.memoryId)],
);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["album", "story"] }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    sourceRef: text("source_ref").unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("collections_patient_idx").on(t.patientId)],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    /** Story caption for this page (falls back to the memory's approved caption). */
    caption: text("caption"),
    /** Optional recorded narration (an audio memory). */
    narrationMemoryId: text("narration_memory_id"),
  },
  (t) => [index("collection_items_collection_idx").on(t.collectionId)],
);

/** Caregiver-approved everyday pairs for Daily Life Match (e.g. her cup ↔ her kitchen). */
export const dailyPairs = pgTable("daily_pairs", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  leftMemoryId: text("left_memory_id")
    .notNull()
    .references(() => memories.id, { onDelete: "cascade" }),
  leftLabel: text("left_label").notNull(),
  leftBox: jsonb("left_box").$type<Box | null>(),
  rightMemoryId: text("right_memory_id")
    .notNull()
    .references(() => memories.id, { onDelete: "cascade" }),
  rightLabel: text("right_label").notNull(),
  rightBox: jsonb("right_box").$type<Box | null>(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ─── Play ─────────────────────────────────────────────────────

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    worldId: text("world_id"),
    levelId: text("level_id"),
    memoryIds: textArray("memory_ids"),
    challengeLevel: integer("challenge_level").notNull().default(1),
    status: text("status", { enum: ["in_progress", "completed", "ended_early", "skipped"] })
      .notNull()
      .default("in_progress"),
    /** Generated activity including the answer key. Never sent to the browser as-is. */
    activity: jsonb("activity").$type<unknown>().notNull(),
    state: jsonb("state").$type<unknown>().notNull(),
    roundsTotal: integer("rounds_total").notNull().default(0),
    roundsCompleted: integer("rounds_completed").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    firstTryCorrect: integer("first_try_correct").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    skips: integer("skips").notNull().default(0),
    avgResponseMs: integer("avg_response_ms"),
    caregiverSupported: boolean("caregiver_supported").notNull().default(false),
    coinsAwarded: integer("coins_awarded").notNull().default(0),
    poolSource: text("pool_source"),
    startedAt: ts("started_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
    durationMs: integer("duration_ms"),
  },
  (t) => [
    index("game_sessions_patient_idx").on(t.patientId, t.startedAt),
    index("game_sessions_patient_game_idx").on(t.patientId, t.gameType),
  ],
);

export const gameEvents = pgTable(
  "game_events",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    roundIndex: integer("round_index").notNull(),
    type: text("type").notNull(),
    correct: boolean("correct"),
    responseMs: integer("response_ms"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("game_events_session_idx").on(t.sessionId)],
);

export const levelProgress = pgTable(
  "level_progress",
  {
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    levelId: text("level_id").notNull(),
    worldId: text("world_id").notNull(),
    status: text("status", { enum: ["available", "completed"] }).notNull().default("available"),
    unlockedAt: ts("unlocked_at").notNull().defaultNow(),
    firstCompletedAt: ts("first_completed_at"),
    lastCompletedAt: ts("last_completed_at"),
    lastPlayedAt: ts("last_played_at"),
    timesPlayed: integer("times_played").notNull().default(0),
    timesCompleted: integer("times_completed").notNull().default(0),
    coinsEarned: integer("coins_earned").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.levelId] })],
);

export const worldState = pgTable(
  "world_state",
  {
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    worldId: text("world_id").notNull(),
    unlockedAt: ts("unlocked_at").notNull().defaultNow(),
    firstVisitedAt: ts("first_visited_at"),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.worldId] })],
);

// ─── Character, wallet, shop, rewards ─────────────────────────

export const characters = pgTable("characters", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Mimo"),
  appearance: jsonb("appearance").$type<CharacterAppearance>().notNull(),
  equipped: jsonb("equipped").$type<EquippedSlots>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const shopItems = pgTable("shop_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameTe: text("name_te").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  assetKey: text("asset_key").notNull(),
  unlockRequirement: jsonb("unlock_requirement").$type<Record<string, unknown> | null>(),
  seasonal: text("seasonal"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const ownedItems = pgTable(
  "owned_items",
  {
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    source: text("source", { enum: ["purchase", "reward"] }).notNull().default("purchase"),
    acquiredAt: ts("acquired_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.itemId] })],
);

export const wallets = pgTable("wallets", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const coinTransactions = pgTable(
  "coin_transactions",
  {
    id: serial("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    refId: text("ref_id"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("coin_tx_patient_idx").on(t.patientId, t.createdAt)],
);

export const patientBadges = pgTable(
  "patient_badges",
  {
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: ts("earned_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.badgeId] })],
);

export const gardenState = pgTable("garden_state", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Plants/creatures that grew from participation: [{ id, at }]. */
  grown: jsonb("grown").$type<{ id: string; at: string }[]>().notNull().default([]),
  /** Owned garden decorations currently shown in the garden. */
  placed: textArray("placed"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ─── Preferences, challenge consent, daily adventures ─────────

export const preferences = pgTable("preferences", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  enabledGames: textArray("enabled_games"),
  preferredGames: textArray("preferred_games"),
  preferredCategories: textArray("preferred_categories"),
  sessionMinutes: integer("session_minutes").notNull().default(20),
  breakReminderMinutes: integer("break_reminder_minutes").notNull().default(15),
  /** 0 = self-paced viewing in Remember the Scene (default: no countdown pressure). */
  exposureSeconds: integer("exposure_seconds").notNull().default(0),
  voice: jsonb("voice").$type<VoicePrefs>().notNull(),
  accessibility: jsonb("accessibility").$type<AccessibilityPrefs>().notNull(),
  challenge: jsonb("challenge").$type<ChallengePrefs>().notNull(),
  consent: jsonb("consent").$type<ConsentPrefs>().notNull(),
  starterPack: boolean("starter_pack").notNull().default(true),
  dailyAdventures: boolean("daily_adventures").notNull().default(true),
  allDestinationsOpen: boolean("all_destinations_open").notNull().default(false),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const challengeOffers = pgTable(
  "challenge_offers",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    direction: text("direction", { enum: ["up", "down"] }).notNull(),
    fromLevel: integer("from_level").notNull(),
    toLevel: integer("to_level").notNull(),
    status: text("status", { enum: ["pending", "accepted", "keep_familiar", "later"] })
      .notNull()
      .default("pending"),
    sessionId: text("session_id"),
    offeredAt: ts("offered_at").notNull().defaultNow(),
    respondedAt: ts("responded_at"),
  },
  (t) => [index("challenge_offers_patient_idx").on(t.patientId, t.offeredAt)],
);

export const dailyAdventures = pgTable(
  "daily_adventures",
  {
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Local calendar date in the patient's timezone (YYYY-MM-DD). */
    day: text("day").notNull(),
    tasks: jsonb("tasks").$type<DailyTask[]>().notNull(),
    completedAt: ts("completed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.patientId, t.day] })],
);

/** Lightweight activity log: destination visits, favorite revisits, breaks, visits to the garden. */
export const patientEvents = pgTable(
  "patient_events",
  {
    id: serial("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("patient_events_patient_idx").on(t.patientId, t.type, t.createdAt)],
);

/** Caregiver actions, shown in the privacy panel. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id"),
    patientId: text("patient_id"),
    action: text("action").notNull(),
    target: text("target"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_log_patient_idx").on(t.patientId, t.createdAt)],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type PatientProfile = typeof patientProfiles.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Person = typeof people.$inferSelect;
export type MemoryPerson = typeof memoryPeople.$inferSelect;
export type MemoryObject = typeof memoryObjects.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type DailyPair = typeof dailyPairs.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type LevelProgressRow = typeof levelProgress.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Preferences = typeof preferences.$inferSelect;
export type ChallengeOffer = typeof challengeOffers.$inferSelect;
