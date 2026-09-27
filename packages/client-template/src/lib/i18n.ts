import type { LanguageMode } from "./types";

export type Locale = "ar" | "en";

export function pickLocalized(
  locale: Locale,
  ar?: string | null,
  en?: string | null
): string {
  if (locale === "en") return (en || ar || "").trim();
  return (ar || en || "").trim();
}

export function localesFor(mode: LanguageMode): Locale[] {
  if (mode === "ar") return ["ar"];
  if (mode === "en") return ["en"];
  return ["ar", "en"];
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
