import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  other: {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  },
};

/** Login is a full-screen gate — parent dashboard chrome is covered by the page. */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
