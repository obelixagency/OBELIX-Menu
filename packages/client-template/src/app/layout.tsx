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
  return {
    title: `${brand.displayName} — المنيو`,
    description: `قائمة ${brand.displayName}`,
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
