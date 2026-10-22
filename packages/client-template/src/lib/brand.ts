import { promises as fs } from "fs";
import path from "path";
import type { BrandConfig, LanguageMode } from "./types";
import {
  DEFAULT_ORDERING_FEATURES,
  normalizeOrderingFeatures,
} from "./extensions/ordering";
import { normalizePayments } from "./payments";

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
  slogan: null,
  sloganEn: null,
  taxPercent: 0,
  taxInclusive: true,
  taxNumber: null,
  extensions: {
    ordering: DEFAULT_ORDERING_FEATURES,
    payments: normalizePayments(null),
  },
};

const SECRET_FILE = path.join(DATA_DIR, ".dashboard-secret");

/** Raw brand.json as stored on disk (may include legacy `dashboardPassword`). */
async function readBrandFile(): Promise<Partial<BrandConfig> | null> {
  try {
    const raw = await fs.readFile(BRAND_FILE, "utf8");
    return JSON.parse(raw) as Partial<BrandConfig>;
  } catch {
    return null;
  }
}

/**
 * Normalized brand config. NEVER contains the dashboard password — that lives in
 * `DASHBOARD_PASSWORD` / `data/.dashboard-secret` and is read only by
 * `getDashboardPassword()`. Safe to pass to client components.
 */
export async function readBrand(): Promise<BrandConfig> {
  const parsed = await readBrandFile();
  if (!parsed) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(BRAND_FILE, JSON.stringify(DEFAULT_BRAND, null, 2));
    return { ...DEFAULT_BRAND, dashboardPassword: "" };
  }
  return {
    ...DEFAULT_BRAND,
    ...parsed,
    dashboardPassword: "",
    languages: normalizeLanguages(parsed.languages),
    colors: { ...DEFAULT_BRAND.colors, ...parsed.colors },
    taxPercent: Math.max(0, Math.min(50, Number(parsed.taxPercent) || 0)),
    taxInclusive: parsed.taxInclusive !== false,
    taxNumber: parsed.taxNumber ? String(parsed.taxNumber) : null,
    extensions: {
      ordering: normalizeOrderingFeatures(parsed.extensions?.ordering),
      payments: normalizePayments(parsed.extensions?.payments),
    },
  } as BrandConfig;
}

/** Persist brand.json, keeping any password already stored on disk untouched. */
export async function writeBrand(next: BrandConfig): Promise<void> {
  const current = await readBrandFile();
  const { dashboardPassword: _drop, ...rest } = next;
  void _drop;
  const out: Record<string, unknown> = { ...rest };
  if (current?.dashboardPassword) out.dashboardPassword = current.dashboardPassword;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(BRAND_FILE, JSON.stringify(out, null, 2), "utf8");
}

/** Brand fields a guest is allowed to see (no email, no secrets). */
export function toPublicBrand(brand: BrandConfig): BrandConfig {
  return { ...brand, dashboardPassword: "", notificationEmail: null };
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
    "--brand-muted": "#6B5E52",
    "--brand-line": "rgba(26,20,16,0.08)",
    "--brand-card": "#ffffff",
  };
}

/** Owner password: env → data/.dashboard-secret → legacy brand.json field. */
export async function getDashboardPassword(): Promise<string> {
  if (process.env.DASHBOARD_PASSWORD) return process.env.DASHBOARD_PASSWORD;
  try {
    const secret = (await fs.readFile(SECRET_FILE, "utf8")).trim();
    if (secret) return secret;
  } catch {
    // no secret file
  }
  const raw = await readBrandFile();
  if (raw?.dashboardPassword) return String(raw.dashboardPassword);
  if (process.env.NODE_ENV === "production") {
    console.warn("[obelix] DASHBOARD_PASSWORD is not set — using insecure default");
  }
  return "obelix123";
}

export function defaultLocale(languages: LanguageMode): "ar" | "en" {
  if (languages === "en") return "en";
  return "ar";
}
