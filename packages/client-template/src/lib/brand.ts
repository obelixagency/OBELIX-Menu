import { promises as fs } from "fs";
import path from "path";
import type { BrandConfig, LanguageMode } from "./types";
import {
  DEFAULT_ORDERING_FEATURES,
  normalizeOrderingFeatures,
} from "./extensions/ordering";

const DATA_DIR = path.join(process.cwd(), "data");
const BRAND_FILE = path.join(DATA_DIR, "brand.json");

const DEFAULT_BRAND: BrandConfig = {
  displayName: "قهوة البيت",
  slug: "qahwa-elbeit",
  logoUrl: "/uploads/logo-qahwa.svg",
  colors: {
    primary: "#5C3A1E",
    accent: "#D4A017",
    surface: "#F7F1E8",
  },
  font: "Cairo",
  currency: "EGP",
  domain: "menu.qahwa-elbeit.example.com",
  dashboardPassword: "obelix123",
  languages: "both",
  notificationEmail: null,
  menuBackgroundUrl: null,
  extensions: {
    ordering: DEFAULT_ORDERING_FEATURES,
  },
};

export async function readBrand(): Promise<BrandConfig> {
  try {
    const raw = await fs.readFile(BRAND_FILE, "utf8");
    const parsed = JSON.parse(raw) as BrandConfig;
    return {
      ...DEFAULT_BRAND,
      ...parsed,
      languages: normalizeLanguages(parsed.languages),
      colors: { ...DEFAULT_BRAND.colors, ...parsed.colors },
      extensions: {
        ordering: normalizeOrderingFeatures(parsed.extensions?.ordering),
      },
    };
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(BRAND_FILE, JSON.stringify(DEFAULT_BRAND, null, 2));
    return DEFAULT_BRAND;
  }
}

export function normalizeLanguages(value: unknown): LanguageMode {
  if (value === "ar" || value === "en" || value === "both") return value;
  return "both";
}

export function brandCssVars(brand: BrandConfig): Record<string, string> {
  return {
    "--brand-primary": brand.colors.primary,
    "--brand-accent": brand.colors.accent,
    "--brand-surface": brand.colors.surface,
    "--brand-ink": "#1a1410",
  };
}

export function getDashboardPassword(brand: BrandConfig): string {
  return (
    process.env.DASHBOARD_PASSWORD ||
    brand.dashboardPassword ||
    "obelix123"
  );
}

export function defaultLocale(languages: LanguageMode): "ar" | "en" {
  if (languages === "en") return "en";
  return "ar";
}
