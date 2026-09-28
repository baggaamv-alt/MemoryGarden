import type { Localized } from "../i18n";
import type { EquippedSlots } from "../types";

export type ShopCategory =
  | "hat"
  | "glasses"
  | "scarf"
  | "outfit"
  | "shoes"
  | "accessory"
  | "companion"
  | "animation"
  | "garden"
  | "seasonal";

export type UnlockRequirement =
  | { type: "world-visited"; worldId: string }
  | { type: "badge"; badgeId: string }
  | { type: "completions"; count: number };

export type ShopItem = {
  id: string;
  name: Localized;
  category: ShopCategory;
  price: number;
  unlock?: UnlockRequirement;
  seasonal?: string;
};

export type WearSlot = keyof EquippedSlots;

export const CATEGORY_SLOT: Partial<Record<ShopCategory, WearSlot>> = {
  hat: "hat",
  glasses: "glasses",
  scarf: "scarf",
  outfit: "outfit",
  shoes: "shoes",
  accessory: "accessory",
  companion: "companion",
  animation: "animation",
};

export const SHOP_CATEGORIES: { id: ShopCategory; label: Localized; icon: string }[] = [
  { id: "hat", label: { en: "Hats", te: "టోపీలు" }, icon: "👒" },
  { id: "glasses", label: { en: "Glasses", te: "కళ్ళద్దాలు" }, icon: "👓" },
  { id: "scarf", label: { en: "Scarves", te: "కండువాలు" }, icon: "🧣" },
  { id: "outfit", label: { en: "Outfits", te: "దుస్తులు" }, icon: "👘" },
  { id: "shoes", label: { en: "Shoes", te: "చెప్పులు" }, icon: "🥿" },
  { id: "accessory", label: { en: "Things to hold", te: "చేతి వస్తువులు" }, icon: "☂️" },
  { id: "companion", label: { en: "Little friends", te: "చిన్ని నేస్తాలు" }, icon: "🦋" },
  { id: "animation", label: { en: "Movements", te: "కదలికలు" }, icon: "✨" },
  { id: "garden", label: { en: "Garden", te: "తోట అలంకరణలు" }, icon: "🪴" },
  { id: "seasonal", label: { en: "Festive", te: "పండుగ అలంకరణలు" }, icon: "🪔" },
];

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "hat-straw", category: "hat", price: 30, name: { en: "Straw Sun Hat", te: "గడ్డి టోపీ" } },
  { id: "hat-gardener", category: "hat", price: 30, name: { en: "Gardener's Cap", te: "తోటమాలి టోపీ" } },
  { id: "hat-beanie", category: "hat", price: 35, name: { en: "Cozy Knit Cap", te: "ఉన్ని టోపీ" } },
  { id: "hat-monkey", category: "hat", price: 40, name: { en: "Monkey Cap", te: "మంకీ క్యాప్" } },
  { id: "hat-sunflower", category: "hat", price: 45, name: { en: "Sunflower Hat", te: "పొద్దుతిరుగుడు టోపీ" } },
  { id: "hat-jasmine", category: "hat", price: 50, name: { en: "Jasmine Flowers", te: "మల్లెపూల దండ" } },
  { id: "hat-flowercrown", category: "hat", price: 55, name: { en: "Flower Crown", te: "పూల కిరీటం" } },
  { id: "hat-party", category: "hat", price: 25, name: { en: "Party Hat", te: "పార్టీ టోపీ" } },
  {
    id: "hat-crown", category: "hat", price: 120, name: { en: "Little Golden Crown", te: "బంగారు కిరీటం" },
    unlock: { type: "badge", badgeId: "memory-explorer" },
  },
  // Glasses
  { id: "glasses-reading", category: "glasses", price: 25, name: { en: "Reading Glasses", te: "చదువు కళ్ళద్దాలు" } },
  { id: "glasses-round", category: "glasses", price: 30, name: { en: "Round Glasses", te: "గుండ్రటి కళ్ళద్దాలు" } },
  { id: "glasses-sun", category: "glasses", price: 40, name: { en: "Sunglasses", te: "చలువ కళ్ళద్దాలు" } },
  { id: "glasses-heart", category: "glasses", price: 50, name: { en: "Heart Glasses", te: "హృదయం కళ్ళద్దాలు" } },
  // Scarves
  { id: "scarf-striped", category: "scarf", price: 30, name: { en: "Striped Scarf", te: "చారల కండువా" } },
  { id: "scarf-muffler", category: "scarf", price: 35, name: { en: "Woolly Muffler", te: "ఉన్ని మఫ్లర్" } },
  { id: "scarf-silk", category: "scarf", price: 45, name: { en: "Silk Stole", te: "పట్టు కండువా" } },
  {
    id: "scarf-garland", category: "scarf", price: 50, name: { en: "Marigold Garland", te: "బంతిపూల దండ" },
    unlock: { type: "world-visited", worldId: "w3" },
  },
  // Outfits
  { id: "outfit-apron", category: "outfit", price: 40, name: { en: "Garden Apron", te: "తోటపని ఆప్రాన్" } },
  { id: "outfit-raincoat", category: "outfit", price: 50, name: { en: "Raincoat", te: "రెయిన్‌కోట్" } },
  { id: "outfit-sweater", category: "outfit", price: 55, name: { en: "Cozy Sweater", te: "వెచ్చని స్వెటర్" } },
  { id: "outfit-kurta", category: "outfit", price: 60, name: { en: "Cotton Kurta", te: "నూలు కుర్తా" } },
  {
    id: "outfit-saree", category: "outfit", price: 80, name: { en: "Silk Saree", te: "పట్టు చీర" },
    unlock: { type: "world-visited", worldId: "w3" },
  },
  {
    id: "outfit-dhoti", category: "outfit", price: 70, name: { en: "Festive Dhoti", te: "పండుగ పంచె" },
    unlock: { type: "world-visited", worldId: "w3" },
  },
  // Shoes
  { id: "shoes-chappal", category: "shoes", price: 20, name: { en: "Comfy Chappals", te: "చెప్పులు" } },
  { id: "shoes-slippers", category: "shoes", price: 30, name: { en: "Fluffy Slippers", te: "మెత్తని చెప్పులు" } },
  { id: "shoes-rainboots", category: "shoes", price: 35, name: { en: "Rain Boots", te: "వాన బూట్లు" } },
  { id: "shoes-mojari", category: "shoes", price: 45, name: { en: "Festive Mojari", te: "పండుగ మోజరీలు" } },
  // Things to hold
  { id: "acc-balloon", category: "accessory", price: 20, name: { en: "Balloon", te: "బెలూన్" } },
  { id: "acc-chai", category: "accessory", price: 25, name: { en: "Cup of Chai", te: "చాయ్ కప్పు" } },
  { id: "acc-book", category: "accessory", price: 30, name: { en: "Storybook", te: "కథల పుస్తకం" } },
  { id: "acc-wateringcan", category: "accessory", price: 35, name: { en: "Watering Can", te: "నీళ్ళ డబ్బా" } },
  { id: "acc-umbrella", category: "accessory", price: 35, name: { en: "Umbrella", te: "గొడుగు" } },
  { id: "acc-bouquet", category: "accessory", price: 40, name: { en: "Flower Bouquet", te: "పూల గుత్తి" } },
  {
    id: "acc-kite", category: "accessory", price: 45, name: { en: "Sankranti Kite", te: "సంక్రాంతి గాలిపటం" },
    seasonal: "Sankranti",
  },
  // Little friends
  { id: "comp-butterfly", category: "companion", price: 80, name: { en: "Butterfly Friend", te: "సీతాకోకచిలుక నేస్తం" } },
  { id: "comp-sparrow", category: "companion", price: 80, name: { en: "Little Sparrow", te: "పిచ్చుక నేస్తం" } },
  {
    id: "comp-kitten", category: "companion", price: 100, name: { en: "Kitten", te: "పిల్లి పిల్ల" },
    unlock: { type: "completions", count: 10 },
  },
  // Movements
  { id: "anim-wave", category: "animation", price: 40, name: { en: "Friendly Wave", te: "చేయి ఊపడం" } },
  { id: "anim-sparkle", category: "animation", price: 50, name: { en: "Sparkles", te: "మెరుపులు" } },
  { id: "anim-twirl", category: "animation", price: 60, name: { en: "Gentle Twirl", te: "గిరగిరా తిరగడం" } },
  { id: "anim-dance", category: "animation", price: 70, name: { en: "Happy Dance", te: "సంతోష నృత్యం" } },
  // Garden decorations
  { id: "garden-muggu", category: "garden", price: 35, name: { en: "Rangoli (Muggu)", te: "ముగ్గు" } },
  { id: "garden-windchime", category: "garden", price: 40, name: { en: "Wind Chimes", te: "గాలి గంటలు" } },
  { id: "garden-lantern", category: "garden", price: 45, name: { en: "Garden Lantern", te: "తోట లాంతరు" } },
  { id: "garden-birdhouse", category: "garden", price: 50, name: { en: "Birdhouse", te: "పిట్టగూడు" } },
  { id: "garden-bench", category: "garden", price: 55, name: { en: "Garden Bench", te: "తోట బెంచీ" } },
  { id: "garden-birdbath", category: "garden", price: 60, name: { en: "Bird Bath", te: "పక్షుల నీటి తొట్టి" } },
  { id: "garden-tulsi", category: "garden", price: 70, name: { en: "Tulsi Planter", te: "తులసి కోట" } },
  { id: "garden-swing", category: "garden", price: 90, name: { en: "Wooden Swing", te: "ఉయ్యాల" } },
  {
    id: "garden-fountain", category: "garden", price: 100, name: { en: "Little Fountain", te: "చిన్న ఫౌంటెన్" },
    unlock: { type: "badge", badgeId: "garden-builder" },
  },
  // Festive decorations
  { id: "season-diyas", category: "seasonal", price: 50, name: { en: "Diya Lamps", te: "దీపాలు" }, seasonal: "Deepavali" },
  { id: "season-kites", category: "seasonal", price: 50, name: { en: "Festival Kites", te: "గాలిపటాలు" }, seasonal: "Sankranti" },
  { id: "season-toran", category: "seasonal", price: 50, name: { en: "Mango Leaf Toran", te: "మామిడాకుల తోరణం" }, seasonal: "Ugadi" },
  { id: "season-star", category: "seasonal", price: 50, name: { en: "Christmas Star", te: "క్రిస్మస్ నక్షత్రం" }, seasonal: "Christmas" },
  { id: "season-lanterns", category: "seasonal", price: 50, name: { en: "Eid Lanterns", te: "రంజాన్ లాంతర్లు" }, seasonal: "Eid" },
  {
    id: "season-bathukamma", category: "seasonal", price: 60, name: { en: "Bathukamma Flowers", te: "బతుకమ్మ" },
    seasonal: "Bathukamma", unlock: { type: "world-visited", worldId: "w3" },
  },
];

export const SHOP_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

export function isGardenItem(item: ShopItem) {
  return item.category === "garden" || item.category === "seasonal";
}
