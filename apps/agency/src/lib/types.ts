export type BrandColors = {
  primary: string;
  accent: string;
  surface: string;
};

export type LanguageMode = "ar" | "en" | "both";

export type ClientRecord = {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logoPath: string | null;
  colors: BrandColors;
  font: string;
  currency: string;
  domain: string;
  dashboardPassword: string;
  languages: LanguageMode;
  menuBackgroundPath: string | null;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  lastExportedAt: string | null;
  packagePath: string | null;
};

export type CreateClientInput = {
  name: string;
  slug: string;
  displayName?: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor?: string;
  font?: string;
  currency?: string;
  domain?: string;
  dashboardPassword?: string;
  languages?: LanguageMode;
};
