import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { readBrand, brandCssVars } from "@/lib/brand";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${cairo.variable} font-sans antialiased`}
        style={brandCssVars(brand)}
      >
        {children}
      </body>
    </html>
  );
}
