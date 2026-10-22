import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { AgencyHeader } from "@/components/agency-header";
import { AgencyLocaleProvider } from "@/components/locale-provider";
import {
  AGENCY_LANG_COOKIE,
  DEFAULT_AGENCY_LOCALE,
  dictionaries,
  dirForLocale,
  parseAgencyLocale,
} from "@/lib/i18n";
import "./globals.css";

// Self-hosted Cairo (no Google Fonts at build/runtime)
const cairoLatin = localFont({ src: [{ path: "./fonts/cairo-latin-400-normal.woff2", weight: "400", style: "normal" },{ path: "./fonts/cairo-latin-500-normal.woff2", weight: "500", style: "normal" },{ path: "./fonts/cairo-latin-600-normal.woff2", weight: "600", style: "normal" },{ path: "./fonts/cairo-latin-700-normal.woff2", weight: "700", style: "normal" },{ path: "./fonts/cairo-latin-800-normal.woff2", weight: "800", style: "normal" }], variable: "--font-cairo-latin", display: "swap" });
const cairo = localFont({ src: [{ path: "./fonts/cairo-arabic-400-normal.woff2", weight: "400", style: "normal" },{ path: "./fonts/cairo-arabic-500-normal.woff2", weight: "500", style: "normal" },{ path: "./fonts/cairo-arabic-600-normal.woff2", weight: "600", style: "normal" },{ path: "./fonts/cairo-arabic-700-normal.woff2", weight: "700", style: "normal" },{ path: "./fonts/cairo-arabic-800-normal.woff2", weight: "800", style: "normal" }], variable: "--font-cairo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = parseAgencyLocale(jar.get(AGENCY_LANG_COOKIE)?.value);
  const meta = dictionaries[locale].meta;
  return {
    title: meta.title,
    description: meta.description,
  };
}

// Auth-gated agency UI must not be CDN/static cached without session checks.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const locale = parseAgencyLocale(
    jar.get(AGENCY_LANG_COOKIE)?.value ?? DEFAULT_AGENCY_LOCALE
  );
  const dir = dirForLocale(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${cairoLatin.variable} ${cairo.variable} font-sans antialiased`}>
        <AgencyLocaleProvider initialLocale={locale}>
          <div className="relative flex min-h-screen w-full">
            <AgencyHeader />
            <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </div>
          </div>
        </AgencyLocaleProvider>
      </body>
    </html>
  );
}
