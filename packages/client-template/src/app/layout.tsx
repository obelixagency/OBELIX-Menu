import type { Metadata } from "next";
import localFont from "next/font/local";
import { readBrand, brandCssVars } from "@/lib/brand";
import "./globals.css";

// Self-hosted Cairo (no Google Fonts at build/runtime). Latin + Arabic subsets
// are separate families so each script resolves to its own glyph file.
const cairoLatin = localFont({
  src: [{ path: "./fonts/cairo-latin-400-normal.woff2", weight: "400", style: "normal" },{ path: "./fonts/cairo-latin-500-normal.woff2", weight: "500", style: "normal" },{ path: "./fonts/cairo-latin-600-normal.woff2", weight: "600", style: "normal" },{ path: "./fonts/cairo-latin-700-normal.woff2", weight: "700", style: "normal" },{ path: "./fonts/cairo-latin-800-normal.woff2", weight: "800", style: "normal" }],
  variable: "--font-cairo-latin",
  display: "swap",
});
const cairo = localFont({
  src: [{ path: "./fonts/cairo-arabic-400-normal.woff2", weight: "400", style: "normal" },{ path: "./fonts/cairo-arabic-500-normal.woff2", weight: "500", style: "normal" },{ path: "./fonts/cairo-arabic-600-normal.woff2", weight: "600", style: "normal" },{ path: "./fonts/cairo-arabic-700-normal.woff2", weight: "700", style: "normal" },{ path: "./fonts/cairo-arabic-800-normal.woff2", weight: "800", style: "normal" }],
  variable: "--font-cairo",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await readBrand();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return {
    title: `${brand.displayName} — المنيو`,
    description: `قائمة ${brand.displayName}`,
    applicationName: `${brand.displayName} POS`,
    manifest: `${base}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: `${brand.displayName} POS`,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
        { url: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" }],
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await readBrand();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  // When served under a sub-path (e.g. /pilot or /<client-slug>), prefix every
  // app-relative fetch("/api/...") so dashboard/menu calls hit THIS client app
  // and not the agency app mounted at the domain root.
  const fetchShim = base
    ? `(function(){var b=${JSON.stringify(base)};var f=window.fetch;if(!f||f.__obxBase)return;var w=function(i,o){if(typeof i==="string"&&i.charAt(0)==="/"&&i.charAt(1)!=="/"&&i!==b&&i.indexOf(b+"/")!==0){i=b+i}return f.call(this,i,o)};w.__obxBase=1;window.fetch=w})();`
    : "";
  return (
    <html lang="ar" dir="rtl">
      <head>
        {fetchShim ? <script dangerouslySetInnerHTML={{ __html: fetchShim }} /> : null}
      </head>
      <body
        className={`${cairoLatin.variable} ${cairo.variable} font-sans antialiased`}
        style={brandCssVars(brand)}
      >
        {children}
      </body>
    </html>
  );
}
