import type { Localized } from "../i18n";
import type { Category, GameType } from "../types";

export type LevelVariant =
  | "identical"
  | "face-name"
  | "person-relationship"
  | "event-photo"
  | "object-pair"
  | "find-person"
  | "timeline"
  | "everyday"
  | "festival"
  | "nature";

export type LevelDef = {
  id: string;
  worldId: string;
  index: number;
  title: Localized;
  game: GameType;
  variant?: LevelVariant;
  /** Preferred memory categories for this destination. */
  categories?: Category[];
  /** Only use the preferred categories (otherwise any approved memory may be used). */
  strict?: boolean;
  /** Restrict to one caregiver album (bonus worlds). */
  collectionId?: string;
  /** Extra coins on the first visit. */
  firstVisitBonus: number;
};

export type WorldTheme = {
  sky: string;
  ground: string;
  accent: string;
  path: string;
  icon: string;
  scenery: "garden" | "village" | "festival" | "meadow" | "golden" | "trail";
};

export type WorldDef = {
  id: string;
  index: number;
  name: Localized;
  description: Localized;
  categories: Category[];
  /** Completed visits (anywhere) needed before this world opens. */
  unlockAfter: number;
  theme: WorldTheme;
  bonus?: boolean;
  levels: LevelDef[];
};

type LevelSeed = [title: Localized, game: GameType, variant?: LevelVariant, categories?: Category[], strict?: boolean];

function makeLevels(worldId: string, defaultCats: Category[], seeds: LevelSeed[]): LevelDef[] {
  return seeds.map(([title, game, variant, categories, strict], i) => ({
    id: `${worldId}-l${i + 1}`,
    worldId,
    index: i + 1,
    title,
    game,
    variant,
    categories: categories ?? defaultCats,
    strict,
    firstVisitBonus: 5 + Math.floor(i / 3) * 2,
  }));
}

const W1_CATS: Category[] = ["home", "garden", "food", "other"];
const W2_CATS: Category[] = ["family", "friends"];
const W3_CATS: Category[] = ["festivals", "celebrations", "food", "music"];
const W4_CATS: Category[] = ["nature", "animals", "places", "garden"];
const W5_CATS: Category[] = ["childhood", "places", "family", "work"];

export const WORLDS: WorldDef[] = [
  {
    id: "w1",
    index: 1,
    name: { en: "The Cozy Garden", te: "హాయైన తోట" },
    description: {
      en: "Flowers, familiar things and the comforts of home.",
      te: "పూలు, తెలిసిన వస్తువులు, ఇంటి హాయి.",
    },
    categories: W1_CATS,
    unlockAfter: 0,
    theme: { sky: "#FFF4E0", ground: "#CFE3C5", accent: "#7FAF7A", path: "#F3D9B1", icon: "🌷", scenery: "garden" },
    levels: makeLevels("w1", W1_CATS, [
      [{ en: "Peek at Home", te: "ఇంటి వైపు ఓ చూపు" }, "memory-reveal"],
      [{ en: "Twin Pictures", te: "జంట బొమ్మలు" }, "memory-match", "identical"],
      [{ en: "Where Does It Belong?", te: "ఏది ఎక్కడ?" }, "daily-life", "everyday"],
      [{ en: "Garden Treasure Hunt", te: "తోటలో నిధి వేట" }, "find-memory"],
      [{ en: "A Good Look Around", te: "చుట్టూ ఓ చూపు" }, "remember-scene"],
      [{ en: "Flower Puzzle", te: "పూల పజిల్" }, "picture-puzzle"],
      [{ en: "Things We Use", te: "మనం వాడే వస్తువులు" }, "memory-match", "object-pair"],
      [{ en: "Hide and Seek", te: "దాగుడుమూతలు" }, "whats-missing"],
      [{ en: "Sounds of Home", te: "ఇంటి శబ్దాలు" }, "sound-memory"],
      [{ en: "Our Home Story", te: "మా ఇంటి కథ" }, "memory-story"],
    ]),
  },
  {
    id: "w2",
    index: 2,
    name: { en: "The Family Village", te: "కుటుంబ పల్లె" },
    description: {
      en: "Loved ones, familiar faces and family albums.",
      te: "ఆత్మీయులు, తెలిసిన ముఖాలు, కుటుంబ ఆల్బమ్‌లు.",
    },
    categories: W2_CATS,
    unlockAfter: 2,
    theme: { sky: "#FDEBDD", ground: "#E9D7B8", accent: "#E08E6D", path: "#F6E3C8", icon: "🏡", scenery: "village" },
    levels: makeLevels("w2", W2_CATS, [
      [{ en: "Family Glimpse", te: "కుటుంబపు ఓ చూపు" }, "memory-reveal"],
      [{ en: "Familiar Faces", te: "తెలిసిన ముఖాలు" }, "who-is-this"],
      [{ en: "Faces and Names", te: "ముఖాలు - పేర్లు" }, "memory-match", "face-name"],
      [{ en: "Family Treasure Hunt", te: "కుటుంబ జ్ఞాపకాల వేట" }, "find-memory"],
      [{ en: "Can You Find Them?", te: "వారెవరో చూపిస్తారా?" }, "who-is-this", "find-person"],
      [{ en: "Who's Who", te: "ఎవరు ఎవరికి ఏమవుతారు" }, "memory-match", "person-relationship"],
      [{ en: "The Day We All Met", te: "అందరూ కలిసిన రోజు" }, "remember-scene"],
      [{ en: "Family Puzzle", te: "కుటుంబ పజిల్" }, "picture-puzzle"],
      [{ en: "Voices We Love", te: "ఆత్మీయ స్వరాలు" }, "sound-memory"],
      [{ en: "Family Album Story", te: "కుటుంబ ఆల్బమ్ కథ" }, "memory-story"],
    ]),
  },
  {
    id: "w3",
    index: 3,
    name: { en: "The Festival Street", te: "పండుగ వీధి" },
    description: { en: "Celebrations, music, food and festivals.", te: "వేడుకలు, సంగీతం, వంటలు, పండుగలు." },
    categories: W3_CATS,
    unlockAfter: 5,
    theme: { sky: "#FFF1D6", ground: "#F4D6A6", accent: "#D9A441", path: "#FBE7C2", icon: "🪔", scenery: "festival" },
    levels: makeLevels("w3", W3_CATS, [
      [{ en: "Festival Lights", te: "పండుగ దీపాలు" }, "find-memory"],
      [{ en: "Celebration Reveal", te: "వేడుక ఆవిష్కరణ" }, "memory-reveal"],
      [{ en: "Celebration Pairs", te: "వేడుకల జతలు" }, "memory-match", "event-photo"],
      [{ en: "Festive Details", te: "పండుగ వివరాలు" }, "remember-scene"],
      [{ en: "Hidden Decoration", te: "దాగిన అలంకరణ" }, "whats-missing"],
      [{ en: "Festival Pairs", te: "పండుగ జతలు" }, "daily-life", "festival"],
      [{ en: "Festival Songs", te: "పండుగ పాటలు" }, "sound-memory"],
      [{ en: "Festival Puzzle", te: "పండుగ పజిల్" }, "picture-puzzle"],
      [{ en: "Treats and Things", te: "పిండివంటలు, వస్తువులు" }, "memory-match", "object-pair"],
      [{ en: "Festival Memories", te: "పండుగ జ్ఞాపకాలు" }, "memory-story"],
    ]),
  },
  {
    id: "w4",
    index: 4,
    name: { en: "The Memory Meadow", te: "జ్ఞాపకాల పచ్చిక బయలు" },
    description: {
      en: "Nature, animals and favorite outdoor places.",
      te: "ప్రకృతి, జంతువులు, ఇష్టమైన బయటి ప్రదేశాలు.",
    },
    categories: W4_CATS,
    unlockAfter: 8,
    theme: { sky: "#E6F2FA", ground: "#C6E0B4", accent: "#6FA8C9", path: "#EAF1D8", icon: "🦋", scenery: "meadow" },
    levels: makeLevels("w4", W4_CATS, [
      [{ en: "Meadow Glimpse", te: "పచ్చికలో ఓ చూపు" }, "memory-reveal"],
      [{ en: "Nature Treasure Hunt", te: "ప్రకృతిలో నిధి వేట" }, "find-memory"],
      [{ en: "Outdoor Details", te: "బయటి వివరాలు" }, "remember-scene"],
      [{ en: "Nature Pairs", te: "ప్రకృతి జతలు" }, "daily-life", "nature"],
      [{ en: "Meadow Puzzle", te: "పచ్చిక పజిల్" }, "picture-puzzle"],
      [{ en: "Hiding in the Meadow", te: "పచ్చికలో దాగుడుమూతలు" }, "whats-missing"],
      [{ en: "Twin Views", te: "జంట దృశ్యాలు" }, "memory-match", "identical"],
      [{ en: "Sounds Outdoors", te: "బయటి శబ్దాలు" }, "sound-memory"],
      [{ en: "Faces Outdoors", te: "బయట కలిసిన ముఖాలు" }, "who-is-this"],
      [{ en: "Places We Loved", te: "మనం ఇష్టపడిన ప్రదేశాలు" }, "memory-story"],
    ]),
  },
  {
    id: "w5",
    index: 5,
    name: { en: "The Golden Years", te: "బంగారు రోజులు" },
    description: {
      en: "Childhood, old photographs and life stories.",
      te: "బాల్యం, పాత ఫోటోలు, జీవిత కథలు.",
    },
    categories: W5_CATS,
    unlockAfter: 11,
    theme: { sky: "#FFF0CC", ground: "#EED9A8", accent: "#C99A3D", path: "#F8E8C0", icon: "🌅", scenery: "golden" },
    levels: makeLevels("w5", W5_CATS, [
      [{ en: "Long Ago", te: "చాలా కాలం క్రితం" }, "memory-reveal"],
      [{ en: "Then and Now", te: "అప్పుడు - ఇప్పుడు" }, "memory-story", "timeline"],
      [{ en: "Moments and Pictures", te: "సందర్భాలు - ఫోటోలు" }, "memory-match", "event-photo"],
      [{ en: "Faces From the Past", te: "పాత ఫోటోల్లో ముఖాలు" }, "who-is-this"],
      [{ en: "Golden Treasure Hunt", te: "బంగారు జ్ఞాపకాల వేట" }, "find-memory"],
      [{ en: "Old Photo Puzzle", te: "పాత ఫోటో పజిల్" }, "picture-puzzle"],
      [{ en: "A Closer Look", te: "దగ్గరగా ఓ చూపు" }, "remember-scene"],
      [{ en: "Life's Journey", te: "జీవిత ప్రయాణం" }, "memory-story", "timeline"],
      [{ en: "Songs of Our Time", te: "మన కాలపు పాటలు" }, "sound-memory"],
      [{ en: "My Life Story", te: "నా జీవిత కథ" }, "memory-story"],
    ]),
  },
];

/** Games that work with any set of photos — used to build bonus worlds from new memories. */
const BONUS_SEQUENCE: [GameType, LevelVariant?][] = [
  ["memory-reveal"],
  ["find-memory"],
  ["memory-match", "identical"],
  ["picture-puzzle"],
  ["remember-scene"],
  ["whats-missing"],
  ["who-is-this"],
  ["memory-match", "event-photo"],
  ["sound-memory"],
  ["memory-story"],
];

const BONUS_THEMES: WorldTheme[] = [
  { sky: "#EFE8FA", ground: "#D9CDEF", accent: "#9C87C9", path: "#F1EBFA", icon: "🌙", scenery: "trail" },
  { sky: "#E3F3EF", ground: "#C3E2D6", accent: "#5FA38E", path: "#E9F5EF", icon: "🍃", scenery: "trail" },
  { sky: "#FCE8E6", ground: "#F2CFCA", accent: "#D77F76", path: "#FBEDEA", icon: "🌺", scenery: "trail" },
];

export type BonusSource =
  | { kind: "album"; id: string; title: string; count: number }
  | { kind: "category"; category: Category; count: number };

export function bonusWorldId(src: BonusSource) {
  return src.kind === "album" ? `b-album-${src.id}` : `b-cat-${src.category}`;
}

export function makeBonusWorld(src: BonusSource, n: number, categoryLabel?: Localized): WorldDef {
  const id = bonusWorldId(src);
  const name: Localized =
    src.kind === "album"
      ? { en: `${src.title} Trail`, te: `${src.title} దారి` }
      : {
          en: `${categoryLabel?.en ?? src.category} Trail`,
          te: `${categoryLabel?.te ?? src.category} దారి`,
        };
  const categories: Category[] = src.kind === "category" ? [src.category] : [];
  return {
    id,
    index: 6 + n,
    name,
    description: {
      en: "A new path made from memories your family added.",
      te: "మీ కుటుంబం చేర్చిన జ్ఞాపకాలతో వేసిన కొత్త దారి.",
    },
    categories,
    unlockAfter: 3,
    theme: BONUS_THEMES[n % BONUS_THEMES.length],
    bonus: true,
    levels: BONUS_SEQUENCE.map(([game, variant], i) => ({
      id: `${id}-l${i + 1}`,
      worldId: id,
      index: i + 1,
      title: { en: "", te: "" },
      game,
      variant,
      categories,
      strict: true,
      collectionId: src.kind === "album" ? src.id : undefined,
      firstVisitBonus: 6,
    })),
  };
}

export function findLevel(worlds: WorldDef[], levelId: string): LevelDef | undefined {
  for (const w of worlds) {
    const l = w.levels.find((x) => x.id === levelId);
    if (l) return l;
  }
  return undefined;
}

export const TOTAL_CORE_LEVELS = WORLDS.reduce((n, w) => n + w.levels.length, 0);
