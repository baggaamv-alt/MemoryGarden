// Types shared by the server and the browser. Keep this file free of server-only imports.

export type Lang = "en" | "te";
export const LANGS: Lang[] = ["en", "te"];
export const LANG_LABELS: Record<Lang, string> = { en: "English", te: "తెలుగు (Telugu)" };

export type TextSize = "normal" | "large" | "xlarge";

export type AccessibilityPrefs = {
  textSize: TextSize;
  highContrast: boolean;
  calmMode: boolean;
  sound: boolean;
  lowBandwidth: boolean;
};

export const DEFAULT_ACCESSIBILITY: AccessibilityPrefs = {
  textSize: "large",
  highContrast: false,
  calmMode: false,
  sound: true,
  lowBandwidth: false,
};

export type VoicePrefs = {
  /** Mimo reads instructions aloud. */
  enabled: boolean;
  /** Read each new instruction automatically (otherwise only on tapping the speaker). */
  autoRead: boolean;
  rate: number;
  /** Show the microphone button for spoken commands where the browser supports it. */
  commands: boolean;
};

export const DEFAULT_VOICE: VoicePrefs = { enabled: true, autoRead: true, rate: 0.9, commands: true };

export type ConsentPrefs = {
  /** Record how long answers take (shown to caregivers only). */
  trackResponseTimes: boolean;
  /** Allow optional Cloudinary AI suggestions (captions/objects) — always caregiver-reviewed. */
  aiSuggestions: boolean;
  /** Keep activity history for caregiver insights. */
  activityInsights: boolean;
};

export const DEFAULT_CONSENT: ConsentPrefs = {
  trackResponseTimes: true,
  aiSuggestions: false,
  activityInsights: true,
};

export const GAME_TYPES = [
  "memory-reveal",
  "who-is-this",
  "remember-scene",
  "memory-match",
  "find-memory",
  "whats-missing",
  "picture-puzzle",
  "memory-story",
  "sound-memory",
  "daily-life",
] as const;
export type GameType = (typeof GAME_TYPES)[number];

export type ChallengePrefs = {
  /** Internal challenge setting per game (1 = most familiar). Never shown to the patient. */
  levels: Partial<Record<GameType, number>>;
  /** Caregiver-set ceiling. */
  maxLevel: number;
  /** Whether Mimo may offer a bigger challenge at all. */
  offersEnabled: boolean;
  /** Sessions of a game to wait before offering again (after "Keep it familiar" / "Maybe later"). */
  snooze: Partial<Record<GameType, number>>;
};

export const DEFAULT_CHALLENGE: ChallengePrefs = { levels: {}, maxLevel: 5, offersEnabled: true, snooze: {} };

export type MediaType = "photo" | "video" | "audio";
export type MemoryStatus = "pending" | "approved" | "excluded";

/** Pixel coordinates inside the stored Cloudinary original. */
export type Box = { x: number; y: number; w: number; h: number };

export const CATEGORIES = [
  "family",
  "home",
  "garden",
  "food",
  "festivals",
  "celebrations",
  "music",
  "nature",
  "animals",
  "places",
  "childhood",
  "friends",
  "travel",
  "work",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type AiObjectSuggestion = {
  label: string;
  box: Box;
  confidence: number;
  status: "pending" | "accepted" | "dismissed";
};

export type AiInfo = {
  caption?: { text: string; status: "pending" | "approved" | "dismissed"; at: string };
  objects?: AiObjectSuggestion[];
  error?: string;
  requestedAt?: string;
};

export type SyncInfo = {
  metadataSynced: boolean;
  syncedAt?: string;
  error?: string;
  searchIndexedAt?: string;
  searchCheckedAt?: string;
};

export type EquippedSlots = {
  hat?: string | null;
  glasses?: string | null;
  scarf?: string | null;
  outfit?: string | null;
  shoes?: string | null;
  accessory?: string | null;
  animation?: string | null;
  companion?: string | null;
};

export type CharacterAppearance = {
  color: string;
  sprout: "leaf" | "bud" | "clover";
  cheeks: boolean;
};

export const DEFAULT_APPEARANCE: CharacterAppearance = { color: "peach", sprout: "leaf", cheeks: true };

export type LevelStatus = "locked" | "available" | "completed" | "revisit" | "growing";

export type DailyTask = {
  id: string;
  type: "visit-world" | "play-game" | "favorite-memory" | "match" | "garden" | "dress-mimo";
  target?: string;
  done: boolean;
  doneAt?: string;
};

/** A delivered picture: signed Cloudinary URL(s) with responsive candidates. */
export type Img = {
  src: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt: string;
};
