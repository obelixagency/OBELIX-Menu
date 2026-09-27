"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "الرئيسية", match: (p: string) => p === "/dashboard" },
  {
    href: "/dashboard/products",
    label: "منتجات",
    match: (p: string) => p.startsWith("/dashboard/products"),
  },
  {
    href: "/dashboard/banners",
    label: "عروض",
    match: (p: string) => p.startsWith("/dashboard/banners"),
  },
  {
    href: "/dashboard/reviews",
    label: "تقييم",
    match: (p: string) => p.startsWith("/dashboard/reviews"),
  },
  {
    href: "/dashboard/settings",
    label: "إعدادات",
    match: (p: string) =>
      p.startsWith("/dashboard/settings") ||
      p.startsWith("/dashboard/contacts") ||
      p.startsWith("/dashboard/categories"),
  },
];

export function DashboardMobileNav() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/dashboard/login")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="تنقل لوحة التحكم"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 py-1">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center rounded-md px-0.5 text-[10px] font-medium touch-manipulation sm:text-[11px]",
                  active
                    ? "text-[var(--brand-primary)]"
                    : "text-black/55"
                )}
              >
                <span
                  className={cn(
                    "mb-0.5 h-1 w-5 rounded-full",
                    active ? "bg-[var(--brand-primary)]" : "bg-transparent"
                  )}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
