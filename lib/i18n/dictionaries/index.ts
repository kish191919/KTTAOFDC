import type { Locale } from "@/lib/i18n/config";
import { en } from "./en";
import { ko, type Dictionary } from "./ko";

const dictionaries: Record<Locale, Dictionary> = { ko, en };

/** 그 언어의 화면 문구 묶음 */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}

export type { Dictionary };
