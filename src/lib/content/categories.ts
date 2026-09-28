import type { Localized } from "../i18n";
import type { Category } from "../types";

export const CATEGORY_INFO: Record<Category, { label: Localized; icon: string; color: string }> = {
  family: { label: { en: "Family", te: "కుటుంబం" }, icon: "👨‍👩‍👧", color: "var(--color-peach)" },
  home: { label: { en: "Home", te: "ఇల్లు" }, icon: "🏡", color: "var(--color-cream-deep)" },
  garden: { label: { en: "Garden", te: "తోట" }, icon: "🌼", color: "var(--color-sage)" },
  food: { label: { en: "Food", te: "వంటలు" }, icon: "🍲", color: "var(--color-peach)" },
  festivals: { label: { en: "Festivals", te: "పండుగలు" }, icon: "🪔", color: "var(--color-gold)" },
  celebrations: { label: { en: "Celebrations", te: "వేడుకలు" }, icon: "🎉", color: "var(--color-coral)" },
  music: { label: { en: "Music", te: "సంగీతం" }, icon: "🎶", color: "var(--color-lavender)" },
  nature: { label: { en: "Nature", te: "ప్రకృతి" }, icon: "🌳", color: "var(--color-sage)" },
  animals: { label: { en: "Animals", te: "జంతువులు" }, icon: "🐄", color: "var(--color-sky)" },
  places: { label: { en: "Places", te: "ప్రదేశాలు" }, icon: "🏞️", color: "var(--color-sky)" },
  childhood: { label: { en: "Childhood", te: "బాల్యం" }, icon: "🧸", color: "var(--color-lavender)" },
  friends: { label: { en: "Friends", te: "స్నేహితులు" }, icon: "🤝", color: "var(--color-coral)" },
  travel: { label: { en: "Travel", te: "ప్రయాణాలు" }, icon: "🚂", color: "var(--color-sky)" },
  work: { label: { en: "Work life", te: "ఉద్యోగ జీవితం" }, icon: "📚", color: "var(--color-cream-deep)" },
  other: { label: { en: "Other memories", te: "ఇతర జ్ఞాపకాలు" }, icon: "💫", color: "var(--color-lavender)" },
};

/** Suggested tags a caregiver can tap; translated for patient-facing prompts. */
export const TAG_LABELS: Record<string, Localized & { icon: string }> = {
  birthday: { en: "birthday", te: "పుట్టినరోజు", icon: "🎂" },
  wedding: { en: "wedding", te: "పెళ్లి", icon: "💐" },
  festival: { en: "festival", te: "పండుగ", icon: "🪔" },
  diwali: { en: "Deepavali", te: "దీపావళి", icon: "🪔" },
  sankranti: { en: "Sankranti", te: "సంక్రాంతి", icon: "🪁" },
  ugadi: { en: "Ugadi", te: "ఉగాది", icon: "🥭" },
  dasara: { en: "Dasara", te: "దసరా", icon: "🌼" },
  holi: { en: "Holi", te: "హోలీ", icon: "🎨" },
  christmas: { en: "Christmas", te: "క్రిస్మస్", icon: "🎄" },
  eid: { en: "Eid", te: "రంజాన్", icon: "🌙" },
  home: { en: "home", te: "ఇంటి", icon: "🏡" },
  garden: { en: "garden", te: "తోట", icon: "🌼" },
  food: { en: "food", te: "వంటల", icon: "🍲" },
  cooking: { en: "cooking", te: "వంట", icon: "🍳" },
  childhood: { en: "childhood", te: "బాల్యపు", icon: "🧸" },
  school: { en: "school", te: "బడి", icon: "🏫" },
  temple: { en: "temple", te: "గుడి", icon: "🛕" },
  travel: { en: "travel", te: "ప్రయాణ", icon: "🚂" },
  beach: { en: "beach", te: "సముద్రతీర", icon: "🏖️" },
  village: { en: "village", te: "ఊరి", icon: "🏘️" },
  family: { en: "family", te: "కుటుంబ", icon: "👨‍👩‍👧" },
  baby: { en: "baby", te: "పాపాయి", icon: "👶" },
  pets: { en: "pet", te: "పెంపుడు జంతువు", icon: "🐕" },
  music: { en: "music", te: "సంగీత", icon: "🎶" },
  friends: { en: "friends", te: "స్నేహితుల", icon: "🤝" },
  graduation: { en: "graduation", te: "పట్టా", icon: "🎓" },
  anniversary: { en: "anniversary", te: "వార్షికోత్సవ", icon: "💞" },
  picnic: { en: "picnic", te: "విహారయాత్ర", icon: "🧺" },
  rain: { en: "rainy day", te: "వాన", icon: "🌧️" },
  flowers: { en: "flower", te: "పూల", icon: "🌸" },
  animals: { en: "animal", te: "జంతువుల", icon: "🐄" },
  nature: { en: "nature", te: "ప్రకృతి", icon: "🌳" },
  celebration: { en: "celebration", te: "వేడుక", icon: "🎉" },
};

export const SUGGESTED_TAGS = Object.keys(TAG_LABELS);

export type Relationship = { key: string; label: Localized };

export const RELATIONSHIPS: Relationship[] = [
  { key: "husband", label: { en: "Husband", te: "భర్త" } },
  { key: "wife", label: { en: "Wife", te: "భార్య" } },
  { key: "son", label: { en: "Son", te: "కొడుకు" } },
  { key: "daughter", label: { en: "Daughter", te: "కూతురు" } },
  { key: "grandson", label: { en: "Grandson", te: "మనవడు" } },
  { key: "granddaughter", label: { en: "Granddaughter", te: "మనవరాలు" } },
  { key: "great-grandchild", label: { en: "Great-grandchild", te: "మునిమనవడు / మునిమనవరాలు" } },
  { key: "son-in-law", label: { en: "Son-in-law", te: "అల్లుడు" } },
  { key: "daughter-in-law", label: { en: "Daughter-in-law", te: "కోడలు" } },
  { key: "mother", label: { en: "Mother", te: "అమ్మ" } },
  { key: "father", label: { en: "Father", te: "నాన్న" } },
  { key: "elder-brother", label: { en: "Elder brother", te: "అన్నయ్య" } },
  { key: "younger-brother", label: { en: "Younger brother", te: "తమ్ముడు" } },
  { key: "elder-sister", label: { en: "Elder sister", te: "అక్క" } },
  { key: "younger-sister", label: { en: "Younger sister", te: "చెల్లెలు" } },
  { key: "nephew", label: { en: "Nephew", te: "మేనల్లుడు" } },
  { key: "niece", label: { en: "Niece", te: "మేనకోడలు" } },
  { key: "grandfather", label: { en: "Grandfather", te: "తాతయ్య" } },
  { key: "grandmother", label: { en: "Grandmother", te: "అమ్మమ్మ / నానమ్మ" } },
  { key: "uncle", label: { en: "Uncle", te: "మామయ్య / బాబాయి" } },
  { key: "aunt", label: { en: "Aunt", te: "అత్తయ్య / పిన్ని" } },
  { key: "cousin", label: { en: "Cousin", te: "బంధువు" } },
  { key: "friend", label: { en: "Friend", te: "స్నేహితులు" } },
  { key: "neighbour", label: { en: "Neighbour", te: "పొరుగువారు" } },
  { key: "caregiver", label: { en: "Caregiver", te: "సంరక్షకులు" } },
  { key: "self", label: { en: "You", te: "మీరు" } },
];

export function relationshipLabel(
  key: string,
  custom: string | null | undefined,
  lang: "en" | "te",
): string {
  if (custom && custom.trim()) return custom.trim();
  const r = RELATIONSHIPS.find((x) => x.key === key);
  return r ? r.label[lang] : "";
}

export function tagLabel(tag: string, lang: "en" | "te"): string {
  const known = TAG_LABELS[tag.toLowerCase()];
  return known ? known[lang] : tag.replace(/[-_]/g, " ");
}

export function tagIcon(tag: string): string {
  return TAG_LABELS[tag.toLowerCase()]?.icon ?? "💫";
}
