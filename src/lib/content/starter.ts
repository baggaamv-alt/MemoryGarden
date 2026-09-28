import type { Localized } from "../i18n";

/**
 * Illustrated everyday cards for Daily Life Match. Caregivers approve (or switch off) this set
 * when creating the patient profile; personal pairs made from the family's own photos are
 * always preferred when they exist.
 */
export type StarterCard = { icon: string; label: Localized };
export type StarterPair = { id: string; set: "everyday" | "festival" | "nature"; left: StarterCard; right: StarterCard };

const c = (icon: string, en: string, te: string): StarterCard => ({ icon, label: { en, te } });

export const STARTER_PAIRS: StarterPair[] = [
  // Everyday routines
  { id: "e-tea", set: "everyday", left: c("☕", "Tea cup", "టీ కప్పు"), right: c("🫖", "Teapot", "టీ పాత్ర") },
  { id: "e-brush", set: "everyday", left: c("🪥", "Toothbrush", "టూత్ బ్రష్"), right: c("🚿", "Bathroom", "స్నానాల గది") },
  { id: "e-bed", set: "everyday", left: c("🛏️", "Bed", "మంచం"), right: c("🌙", "Night-time", "రాత్రి") },
  { id: "e-umbrella", set: "everyday", left: c("☂️", "Umbrella", "గొడుగు"), right: c("🌧️", "Rain", "వాన") },
  { id: "e-key", set: "everyday", left: c("🔑", "Key", "తాళం చెవి"), right: c("🚪", "Door", "తలుపు") },
  { id: "e-glasses", set: "everyday", left: c("👓", "Reading glasses", "కళ్ళద్దాలు"), right: c("📰", "Newspaper", "వార్తాపత్రిక") },
  { id: "e-soap", set: "everyday", left: c("🧼", "Soap", "సబ్బు"), right: c("🚰", "Tap water", "కుళాయి నీళ్ళు") },
  { id: "e-veg", set: "everyday", left: c("🥕", "Vegetables", "కూరగాయలు"), right: c("🍳", "Cooking", "వంట") },
  { id: "e-letter", set: "everyday", left: c("✉️", "Letter", "ఉత్తరం"), right: c("📮", "Post box", "తపాలా డబ్బా") },
  { id: "e-clock", set: "everyday", left: c("⏰", "Alarm clock", "అలారం గడియారం"), right: c("🌅", "Morning", "ఉదయం") },
  { id: "e-flowers", set: "everyday", left: c("💐", "Flowers", "పూలు"), right: c("🏺", "Vase", "పూలకుండి") },
  { id: "e-shoes", set: "everyday", left: c("👟", "Walking shoes", "నడక బూట్లు"), right: c("🚶", "Morning walk", "ఉదయపు నడక") },
  // Festivals
  { id: "f-kite", set: "festival", left: c("🪁", "Kite", "గాలిపటం"), right: c("🌾", "Sankranti harvest", "సంక్రాంతి పంట") },
  { id: "f-diya", set: "festival", left: c("🪔", "Diya lamp", "దీపం"), right: c("🎆", "Deepavali", "దీపావళి") },
  { id: "f-mango", set: "festival", left: c("🥭", "Mango", "మామిడి"), right: c("🌸", "Ugadi spring", "ఉగాది వసంతం") },
  { id: "f-colors", set: "festival", left: c("🎨", "Colors", "రంగులు"), right: c("🎉", "Holi", "హోలీ") },
  { id: "f-cake", set: "festival", left: c("🎂", "Birthday cake", "పుట్టినరోజు కేక్"), right: c("🎈", "Birthday party", "పుట్టినరోజు వేడుక") },
  { id: "f-tree", set: "festival", left: c("🎄", "Christmas tree", "క్రిస్మస్ చెట్టు"), right: c("⭐", "Star", "నక్షత్రం") },
  { id: "f-moon", set: "festival", left: c("🌙", "Crescent moon", "నెలవంక"), right: c("🕌", "Eid prayers", "రంజాన్ ప్రార్థన") },
  { id: "f-wedding", set: "festival", left: c("💍", "Ring", "ఉంగరం"), right: c("💐", "Wedding", "పెళ్లి") },
  // Nature
  { id: "n-cow", set: "nature", left: c("🐄", "Cow", "ఆవు"), right: c("🥛", "Milk", "పాలు") },
  { id: "n-bee", set: "nature", left: c("🐝", "Bee", "తేనెటీగ"), right: c("🌻", "Flower", "పువ్వు") },
  { id: "n-fish", set: "nature", left: c("🐟", "Fish", "చేప"), right: c("🌊", "Water", "నీరు") },
  { id: "n-hen", set: "nature", left: c("🐔", "Hen", "కోడి"), right: c("🥚", "Egg", "గుడ్డు") },
  { id: "n-seed", set: "nature", left: c("🌱", "Seedling", "మొలక"), right: c("☀️", "Sunshine", "ఎండ") },
  { id: "n-bird", set: "nature", left: c("🐦", "Bird", "పక్షి"), right: c("🌳", "Tree", "చెట్టు") },
  { id: "n-dog", set: "nature", left: c("🐕", "Dog", "కుక్క"), right: c("🦴", "Bone", "ఎముక") },
  { id: "n-monkey", set: "nature", left: c("🐒", "Monkey", "కోతి"), right: c("🍌", "Banana", "అరటిపండు") },
];
