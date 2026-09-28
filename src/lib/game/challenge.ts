import type { ChallengePrefs, GameType } from "../types";

/**
 * Internal challenge settings. These numbers are never shown to the patient and there are no
 * "easy/medium/hard" labels anywhere in the patient interface. A higher setting is only ever
 * applied after the patient explicitly says "Yes, let's try!" (see `shouldOffer`).
 */
export type ChallengeParams = {
  /** Answer choices shown in choice rounds. */
  options: number;
  /** Rounds per activity. */
  rounds: number;
  /** Blur strengths for Memory Reveal stages (last stage is always the clear photo). */
  blurStages: number[];
  /** Pairs in Memory Match / Daily Life Match. */
  pairs: number;
  /** Cards are face down (classic memory) — only for identical-picture matching. */
  concealed: boolean;
  /** Puzzle grid. */
  grid: [rows: number, cols: number];
  /** Ghost image opacity under the puzzle board (visual guidance). */
  ghostOpacity: number;
  /** Seconds before the scene is put away (0 = self-paced, the default). */
  exposureSeconds: number;
  /** How many details we ask about in Remember the Scene. */
  sceneDetails: number;
  /** Items in a timeline. */
  timelineItems: number;
  /** Hints available per round. */
  hints: number;
  /** Show relationship next to names as a gentle built-in hint. */
  showRelationship: boolean;
  /** Show picture crops next to labels as answer options. */
  visualOptions: boolean;
};

const TABLE: ChallengeParams[] = [
  {
    options: 2, rounds: 3, blurStages: [900, 350, 0], pairs: 2, concealed: false, grid: [2, 2], ghostOpacity: 0.45,
    exposureSeconds: 0, sceneDetails: 1, timelineItems: 2, hints: 3, showRelationship: true, visualOptions: true,
  },
  {
    options: 3, rounds: 3, blurStages: [1300, 700, 250, 0], pairs: 3, concealed: false, grid: [2, 2], ghostOpacity: 0.35,
    exposureSeconds: 0, sceneDetails: 1, timelineItems: 3, hints: 3, showRelationship: true, visualOptions: true,
  },
  {
    options: 3, rounds: 4, blurStages: [1600, 1000, 500, 150, 0], pairs: 4, concealed: false, grid: [2, 3], ghostOpacity: 0.25,
    exposureSeconds: 0, sceneDetails: 2, timelineItems: 3, hints: 3, showRelationship: false, visualOptions: true,
  },
  {
    options: 4, rounds: 4, blurStages: [1900, 1300, 700, 300, 0], pairs: 5, concealed: true, grid: [3, 3], ghostOpacity: 0.18,
    exposureSeconds: 12, sceneDetails: 2, timelineItems: 4, hints: 2, showRelationship: false, visualOptions: false,
  },
  {
    options: 4, rounds: 5, blurStages: [2000, 1500, 900, 400, 0], pairs: 6, concealed: true, grid: [3, 3], ghostOpacity: 0.1,
    exposureSeconds: 10, sceneDetails: 3, timelineItems: 4, hints: 2, showRelationship: false, visualOptions: false,
  },
];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = TABLE.length;

export function clampLevel(n: number, max = MAX_LEVEL) {
  return Math.max(MIN_LEVEL, Math.min(Math.min(max, MAX_LEVEL), Math.round(n)));
}

export function paramsFor(level: number, caregiverExposureSeconds = 0): ChallengeParams {
  const p = { ...TABLE[clampLevel(level) - 1] };
  // A caregiver-configured viewing interval wins. Otherwise viewing is self-paced, except at the
  // settings the patient explicitly opted into, where the picture fades gently (never a countdown).
  if (caregiverExposureSeconds > 0) p.exposureSeconds = caregiverExposureSeconds;
  return p;
}

export function currentLevel(prefs: ChallengePrefs, game: GameType) {
  return clampLevel(prefs.levels[game] ?? 1, prefs.maxLevel);
}

export type SessionSummary = {
  gameType: string;
  challengeLevel: number;
  status: string;
  roundsCompleted: number;
  firstTryCorrect: number;
  hintsUsed: number;
  skips: number;
};

/**
 * Decide whether Mimo may *ask* about a change. Nothing changes until the patient answers.
 * - "up": the last 3 finished sessions of this game at the current setting went comfortably
 *   (most rounds right on the first try, few hints, nothing skipped).
 * - "down": the last 2 sessions at this setting looked effortful — we offer (never force) gentler.
 */
export function shouldOffer(
  prefs: ChallengePrefs,
  game: GameType,
  recent: SessionSummary[],
): { direction: "up" | "down"; from: number; to: number } | null {
  if (!prefs.offersEnabled) return null;
  const level = currentLevel(prefs, game);
  const snooze = prefs.snooze[game] ?? 0;
  const same = recent.filter((s) => s.gameType === game && s.challengeLevel === level && s.status !== "skipped");

  if (same.length >= 2 && level > MIN_LEVEL) {
    const lastTwo = same.slice(0, 2);
    const effortful = lastTwo.every((s) => {
      const rounds = Math.max(1, s.roundsCompleted);
      return s.firstTryCorrect / rounds < 0.34 && s.hintsUsed / rounds >= 1;
    });
    if (effortful && snooze <= 0) return { direction: "down", from: level, to: level - 1 };
  }

  if (snooze > 0) return null;
  if (level >= Math.min(prefs.maxLevel, MAX_LEVEL)) return null;
  if (same.length < 3) return null;
  const lastThree = same.slice(0, 3);
  const comfortable = lastThree.every((s) => {
    const rounds = Math.max(1, s.roundsCompleted);
    return s.status === "completed" && s.firstTryCorrect / rounds >= 0.75 && s.hintsUsed / rounds <= 0.5 && s.skips === 0;
  });
  return comfortable ? { direction: "up", from: level, to: level + 1 } : null;
}

/** Sessions to wait before asking again after each response. */
export const SNOOZE_AFTER = { keep_familiar: 6, later: 2 } as const;
