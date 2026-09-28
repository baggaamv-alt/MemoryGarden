import type { Lang } from "../types";
import { en, type TextKey } from "./en";
import { te } from "./te";

export type { TextKey };

/** A piece of content written in every supported language. */
export type Localized = Record<Lang, string>;

const dictionaries: Record<Lang, Record<TextKey, string>> = { en, te };

export type Params = Record<string, string | number | undefined | null>;

function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function t(lang: Lang, key: TextKey, params?: Params): string {
  const dict = dictionaries[lang] ?? en;
  return interpolate(dict[key] ?? en[key] ?? key, params);
}

export function loc(value: Localized | string | undefined | null, lang: Lang): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en;
}

/** BCP-47 tag used for speech synthesis/recognition. */
export function speechLang(lang: Lang | string): string {
  if (lang === "te") return "te-IN";
  if (lang === "hi") return "hi-IN";
  return "en-IN";
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "te";
}

const CELEBRATE: TextKey[] = ["mimo.celebrate.1", "mimo.celebrate.2", "mimo.celebrate.3", "mimo.celebrate.4"];
const COMFORT: TextKey[] = ["mimo.comfort.1", "mimo.comfort.2", "mimo.comfort.3"];

export function celebrateLine(lang: Lang, seed: number) {
  return t(lang, CELEBRATE[Math.abs(seed) % CELEBRATE.length]);
}

export function comfortLine(lang: Lang, seed: number) {
  return t(lang, COMFORT[Math.abs(seed) % COMFORT.length]);
}
