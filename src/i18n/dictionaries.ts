import type { Locale } from "./config";
import en from "./messages/en.json";
import es from "./messages/es.json";

const dictionaries = { en, es } as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
