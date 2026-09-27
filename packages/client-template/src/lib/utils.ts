import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LABELS: Record<string, { ar: string; en: string; suffix?: boolean }> = {
  EGP: { ar: "ج.م", en: "EGP", suffix: true },
  USD: { ar: "$", en: "$", suffix: false },
  EUR: { ar: "€", en: "€", suffix: false },
  SAR: { ar: "ر.س", en: "SAR", suffix: true },
  AED: { ar: "د.إ", en: "AED", suffix: true },
  GBP: { ar: "£", en: "£", suffix: false },
};

export function formatPrice(
  price: number,
  currency = "EGP",
  locale: "ar" | "en" = "ar"
): string {
  const code = (currency || "EGP").toUpperCase();
  const meta = CURRENCY_LABELS[code];
  const amount = price.toFixed(2);
  if (!meta) return `${amount} ${code}`;
  const label = locale === "en" ? meta.en : meta.ar;
  return meta.suffix ? `${amount} ${label}` : `${label}${amount}`;
}

/** @deprecated use formatPrice */
export function formatPriceEGP(price: number): string {
  return formatPrice(price, "EGP", "ar");
}

export const COMMON_CURRENCIES = [
  { code: "EGP", label: "EGP — جنيه مصري" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "SAR", label: "SAR — ريال سعودي" },
  { code: "AED", label: "AED — درهم إماراتي" },
  { code: "GBP", label: "GBP — Pound Sterling" },
] as const;
