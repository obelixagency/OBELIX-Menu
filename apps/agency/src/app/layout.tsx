import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { AgencyHeader } from "@/components/agency-header";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "OBELIX Menu — داشبورد الوكالة",
  description: "توليد منيوهات متعددة العملاء مع Brand Kit — OBELIX Menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased`}>
        <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
          <AgencyHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
