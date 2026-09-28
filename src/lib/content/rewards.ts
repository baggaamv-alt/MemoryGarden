import type { Localized } from "../i18n";

export type BadgeDef = { id: string; name: Localized; description: Localized; icon: string; color: string };

export const BADGES: BadgeDef[] = [
  {
    id: "first-adventure", icon: "🌱", color: "var(--color-sage)",
    name: { en: "First Adventure", te: "మొదటి విహారం" },
    description: { en: "Finished the very first visit", te: "మొదటి సందర్శన పూర్తి చేశారు" },
  },
  {
    id: "memory-explorer", icon: "🧭", color: "var(--color-sky)",
    name: { en: "Memory Explorer", te: "జ్ఞాపకాల అన్వేషి" },
    description: { en: "Enjoyed 10 visits", te: "10 సందర్శనలు ఆస్వాదించారు" },
  },
  {
    id: "curious-mind", icon: "💡", color: "var(--color-gold)",
    name: { en: "Curious Mind", te: "కుతూహల మనసు" },
    description: { en: "Tried 5 different activities", te: "5 రకాల ఆటలు ప్రయత్నించారు" },
  },
  {
    id: "cozy-gardener", icon: "🌷", color: "var(--color-sage)",
    name: { en: "Cozy Gardener", te: "హాయైన తోటమాలి" },
    description: { en: "Visited 3 places in the Cozy Garden", te: "హాయైన తోటలో 3 చోట్లు చూశారు" },
  },
  {
    id: "family-storyteller", icon: "📸", color: "var(--color-peach)",
    name: { en: "Family Storyteller", te: "కుటుంబ కథకులు" },
    description: { en: "Visited 3 places in the Family Village", te: "కుటుంబ పల్లెలో 3 చోట్లు చూశారు" },
  },
  {
    id: "festival-explorer", icon: "🪔", color: "var(--color-gold)",
    name: { en: "Festival Explorer", te: "పండుగ అన్వేషి" },
    description: { en: "Visited 3 places on Festival Street", te: "పండుగ వీధిలో 3 చోట్లు చూశారు" },
  },
  {
    id: "meadow-wanderer", icon: "🦋", color: "var(--color-sky)",
    name: { en: "Meadow Wanderer", te: "పచ్చికలో విహారి" },
    description: { en: "Visited 3 places in the Memory Meadow", te: "జ్ఞాపకాల పచ్చికలో 3 చోట్లు చూశారు" },
  },
  {
    id: "golden-keeper", icon: "🌅", color: "var(--color-gold)",
    name: { en: "Keeper of Golden Years", te: "బంగారు రోజుల సంరక్షకులు" },
    description: { en: "Visited 3 places in the Golden Years", te: "బంగారు రోజుల్లో 3 చోట్లు చూశారు" },
  },
  {
    id: "world-traveler", icon: "🗺️", color: "var(--color-lavender)",
    name: { en: "World Traveler", te: "లోక సంచారి" },
    description: { en: "Visited all five worlds", te: "ఐదు లోకాలూ చూశారు" },
  },
  {
    id: "favorite-revisited", icon: "💖", color: "var(--color-coral)",
    name: { en: "Favorite Memory Revisited", te: "ఇష్టమైన జ్ఞాపకం మళ్ళీ" },
    description: { en: "Came back to a favorite memory", te: "ఇష్టమైన జ్ఞాపకాన్ని మళ్ళీ చూశారు" },
  },
  {
    id: "story-lover", icon: "📖", color: "var(--color-lavender)",
    name: { en: "Story Lover", te: "కథల ప్రేమికులు" },
    description: { en: "Enjoyed a whole memory story", te: "ఒక జ్ఞాపకాల కథ పూర్తిగా ఆస్వాదించారు" },
  },
  {
    id: "music-lover", icon: "🎶", color: "var(--color-sky)",
    name: { en: "Music Lover", te: "సంగీత ప్రియులు" },
    description: { en: "Listened to a familiar sound", te: "తెలిసిన శబ్దాన్ని విన్నారు" },
  },
  {
    id: "garden-builder", icon: "🏡", color: "var(--color-sage)",
    name: { en: "Garden Builder", te: "తోట నిర్మాత" },
    description: { en: "Placed 3 decorations in the garden", te: "తోటలో 3 అలంకరణలు పెట్టారు" },
  },
  {
    id: "stylish-friend", icon: "🎀", color: "var(--color-coral)",
    name: { en: "Stylish Friend", te: "అందమైన నేస్తం" },
    description: { en: "Dressed Mimo in 3 treasures", te: "మిమోకి 3 కానుకలు వేశారు" },
  },
  {
    id: "daily-delight", icon: "☀️", color: "var(--color-gold)",
    name: { en: "Daily Delight", te: "రోజువారీ ఆనందం" },
    description: { en: "Finished a little daily adventure", te: "ఒక రోజు చిన్న విహారం పూర్తి చేశారు" },
  },
  {
    id: "together-time", icon: "🤝", color: "var(--color-peach)",
    name: { en: "Together Time", te: "కలిసి ఆడిన సమయం" },
    description: { en: "Played together with someone", te: "ఎవరితోనైనా కలిసి ఆడారు" },
  },
  {
    id: "restful-soul", icon: "🍵", color: "var(--color-sage)",
    name: { en: "Restful Soul", te: "ప్రశాంత మనసు" },
    description: { en: "Took a restful break", te: "కాసేపు విశ్రాంతి తీసుకున్నారు" },
  },
];

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

/** Things that grow in the garden simply by taking part (never bought, never lost). */
export type GrowthDef = { id: string; name: Localized; at: number; kind: "plant" | "creature" | "keepsake" };

export const GROWTH: GrowthDef[] = [
  { id: "sprout", at: 1, kind: "plant", name: { en: "First Sprout", te: "మొదటి మొలక" } },
  { id: "marigold", at: 2, kind: "plant", name: { en: "Marigolds", te: "బంతిపూలు" } },
  { id: "rose", at: 4, kind: "plant", name: { en: "Rose Bush", te: "గులాబీ మొక్క" } },
  { id: "jasmine", at: 6, kind: "plant", name: { en: "Jasmine Vine", te: "మల్లె తీగ" } },
  { id: "sunflower", at: 8, kind: "plant", name: { en: "Sunflowers", te: "పొద్దుతిరుగుడు పూలు" } },
  { id: "butterflies", at: 10, kind: "creature", name: { en: "Butterflies", te: "సీతాకోకచిలుకలు" } },
  { id: "hibiscus", at: 12, kind: "plant", name: { en: "Hibiscus", te: "మందార పువ్వు" } },
  { id: "mango-tree", at: 15, kind: "plant", name: { en: "Mango Tree", te: "మామిడి చెట్టు" } },
  { id: "lotus-pond", at: 18, kind: "plant", name: { en: "Lotus Pond", te: "తామర కొలను" } },
  { id: "parrots", at: 21, kind: "creature", name: { en: "Parrots", te: "చిలుకలు" } },
  { id: "neem-tree", at: 25, kind: "plant", name: { en: "Neem Tree", te: "వేప చెట్టు" } },
  { id: "rainbow", at: 30, kind: "keepsake", name: { en: "Rainbow", te: "ఇంద్రధనుస్సు" } },
  { id: "coconut-tree", at: 35, kind: "plant", name: { en: "Coconut Tree", te: "కొబ్బరి చెట్టు" } },
  { id: "garden-cat", at: 40, kind: "creature", name: { en: "Garden Cat", te: "తోట పిల్లి" } },
];

/** Keepsakes that appear when a world is first visited. */
export const WORLD_KEEPSAKES: Record<string, { id: string; name: Localized }> = {
  w1: { id: "keep-gate", name: { en: "Garden Gate", te: "తోట గేటు" } },
  w2: { id: "keep-house", name: { en: "Little House", te: "చిన్న ఇల్లు" } },
  w3: { id: "keep-bunting", name: { en: "Festival Bunting", te: "పండుగ తోరణాలు" } },
  w4: { id: "keep-cow", name: { en: "Meadow Calf", te: "లేగ దూడ" } },
  w5: { id: "keep-sun", name: { en: "Golden Sun", te: "బంగారు సూర్యుడు" } },
};

/** Daily adventure bonus flowers (one per completed day, up to 7 shown). */
export const DAILY_FLOWER: GrowthDef = { id: "daily-flower", at: 0, kind: "plant", name: { en: "Daily Flower", te: "రోజు పువ్వు" } };

export function growthName(id: string): Localized | undefined {
  const g = GROWTH.find((x) => x.id === id);
  if (g) return g.name;
  const k = Object.values(WORLD_KEEPSAKES).find((x) => x.id === id);
  if (k) return k.name;
  if (id.startsWith("daily-flower")) return DAILY_FLOWER.name;
  return undefined;
}
