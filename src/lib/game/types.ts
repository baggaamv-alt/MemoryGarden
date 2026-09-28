import type { GameType, Img, Lang } from "../types";

// ─── What the browser sees (no answer keys) ───────────────────

export type OptionView = {
  id: string;
  label: string;
  sublabel?: string;
  image?: Img;
  icon?: string;
  /** Language of the label, for read-aloud. */
  lang?: string;
};

export type CardView = {
  id: string;
  side?: "left" | "right";
  label?: string;
  sublabel?: string;
  image?: Img;
  icon?: string;
};

export type PreviewView = {
  image: Img;
  prompt: string;
  /** null = self-paced (default). A number means the picture fades after this long (no countdown shown). */
  exposureMs: number | null;
};

export type ChoiceRound = {
  kind: "choice";
  id: string;
  prompt: string;
  image?: Img;
  /** Memory Reveal: blur stages, strongest first; the last one is the clear photo. */
  stages?: Img[];
  video?: { src: string; poster?: Img };
  audio?: { src: string; label?: string };
  preview?: PreviewView;
  options: OptionView[];
  multi?: boolean;
  /** Any answer is welcome (e.g. "Yes, I remember" / "Tell me about it"). */
  open?: boolean;
  optionStyle: "text" | "picture" | "picture-large";
  hintsAllowed: number;
};

export type MatchRound = {
  kind: "match";
  id: string;
  prompt: string;
  cards: CardView[];
  concealed: boolean;
  hintsAllowed: number;
};

export type PuzzleRound = {
  kind: "puzzle";
  id: string;
  prompt: string;
  rows: number;
  cols: number;
  width: number;
  height: number;
  ghost: Img;
  ghostOpacity: number;
  full: Img;
  pieces: { id: string; image: Img }[];
  hintsAllowed: number;
};

export type SlideView = {
  id: string;
  image?: Img;
  video?: { src: string; poster?: Img };
  caption: string;
  sublabel?: string;
  lang?: string;
  narration?: { src: string };
};

export type StoryRound = {
  kind: "story";
  id: string;
  prompt: string;
  title: string;
  slides: SlideView[];
  hintsAllowed: 0;
};

export type OrderRound = {
  kind: "order";
  id: string;
  prompt: string;
  items: { id: string; image: Img; label: string }[];
  hintsAllowed: number;
};

export type RoundView = ChoiceRound | MatchRound | PuzzleRound | StoryRound | OrderRound;

export type RoundProgress = {
  done: boolean;
  outcome?: "correct" | "revealed" | "skipped" | "completed";
  attempts: number;
  wrong: number;
  hintsUsed: number;
  stage: number;
  eliminated: string[];
  chosen: string[];
  correctIds?: string[];
  matched: string[];
  placed: Record<string, number>;
  order?: string[];
  viewed: number;
  previewSeen: boolean;
  /** Warm closing line, e.g. "This is Lakshmi, your daughter." */
  revealText?: string;
  revealImage?: Img;
  startedAt?: number;
};

export type SessionStatus = "in_progress" | "completed" | "ended_early" | "skipped";

export type SessionView = {
  id: string;
  game: GameType;
  levelId: string | null;
  worldId: string | null;
  title: string;
  intro: string;
  lang: Lang;
  rounds: RoundView[];
  progress: RoundProgress[];
  current: number;
  status: SessionStatus;
  caregiverSupported: boolean;
  /** Where the memories came from: Cloudinary Search, or the database while search catches up. */
  source: string;
};

// ─── Answers & hints ──────────────────────────────────────────

export type AnswerInput =
  | { kind: "choice"; optionIds: string[] }
  | { kind: "match"; a: string; b: string }
  | { kind: "puzzle"; pieceId: string; slot: number }
  | { kind: "order"; order: string[] }
  | { kind: "story"; slide: number }
  | { kind: "preview-seen" }
  | { kind: "reveal-all" }
  | { kind: "skip" };

export type Feedback = {
  tone: "celebrate" | "comfort" | "neutral";
  message: string;
  correct?: boolean;
};

export type AnswerResult = {
  progress: RoundProgress;
  feedback: Feedback | null;
  roundDone: boolean;
  sessionDone: boolean;
  current: number;
};

export type HintPayload = {
  type: "stage" | "eliminate" | "text" | "image" | "show-preview" | "pair" | "piece" | "first";
  text?: string;
  image?: Img;
  eliminated?: string[];
  pair?: [string, string];
  piece?: { pieceId: string; slot: number };
  firstId?: string;
  stage?: number;
};

export type HintResult = { hint: HintPayload | null; progress: RoundProgress; message: string };

// ─── Server-only activity (stored in game_sessions.activity) ──

export type RoundKey =
  | { kind: "choice"; correct: string[]; open?: boolean; multi?: boolean }
  | { kind: "match"; pairs: [string, string][] }
  | { kind: "puzzle"; solution: Record<string, number> }
  | { kind: "order"; order: string[]; years: Record<string, number> }
  | { kind: "story" };

export type HintDef =
  | { type: "stage" }
  | { type: "eliminate" }
  | { type: "text"; text: string }
  | { type: "image"; image: Img; text?: string }
  | { type: "show-preview" }
  | { type: "pair" }
  | { type: "piece" }
  | { type: "first" };

export type ServerRound = {
  view: RoundView;
  key: RoundKey;
  hints: HintDef[];
  memoryIds: string[];
  /** Text + picture shown once the round is finished (correct, revealed or skipped). */
  reveal?: { text: string; image?: Img };
};

export type ServerActivity = {
  version: 1;
  game: GameType;
  lang: Lang;
  title: string;
  intro: string;
  rounds: ServerRound[];
  seed: number;
};

export type SessionState = {
  current: number;
  rounds: RoundProgress[];
  responseTimes: number[];
};

export function emptyProgress(): RoundProgress {
  return {
    done: false,
    attempts: 0,
    wrong: 0,
    hintsUsed: 0,
    stage: 0,
    eliminated: [],
    chosen: [],
    matched: [],
    placed: {},
    viewed: 0,
    previewSeen: false,
  };
}

// ─── Rewards summary returned when an activity ends ───────────

export type RewardSummary = {
  status: SessionStatus;
  coins: { reason: string; amount: number }[];
  totalCoins: number;
  balance: number;
  badges: { id: string; name: string; icon: string }[];
  garden: { id: string; name: string }[];
  stamp: { levelId: string; title: string } | null;
  levelsOpened: string[];
  worldsOpened: { id: string; name: string }[];
  challengeOffer: ChallengeOfferView | null;
  dailyCompleted: boolean;
};

export type ChallengeOfferView = {
  id: string;
  game: GameType;
  gameName: string;
  direction: "up" | "down";
};
