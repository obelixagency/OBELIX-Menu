import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cairo } from "next/font/google";
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

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
      <body className={`${cairo.variable} font-sans antialiased`}>
        <AgencyLocaleProvider initialLocale={locale}>
          <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
            <AgencyHeader />
            {children}
          </div>
        </AgencyLocaleProvider>
      </body>
    </html>
  );
}
