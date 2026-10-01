"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";
import { dirFor, type Locale } from "@/lib/i18n";
import {
  isNavActive,
  labelOf,
  mobilePrimaryTabs,
  visibleGroups,
  type DashFlags,
} from "@/lib/dash-nav";

type Props = {
  displayName: string;
  logoUrl: string | null;
  role: string;
  languages: "ar" | "en" | "both";
  defaultLocale: Locale;
  flags: DashFlags;
  isOwner: boolean;
  children: React.ReactNode;
};

export function DashboardChrome({
  displayName,
  logoUrl,
  role,
  languages,
  defaultLocale,
  flags,
  isOwner,
  children,
}: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("obx-dash-locale");
      if (saved === "ar" || saved === "en") {
        if (languages === "both" || languages === saved) setLocale(saved);
      }
    } catch {
      /* ignore */
    }
  }, [languages]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/dashboard/login")) {
    return <>{children}</>;
  }

  const dir = dirFor(locale);
  const groups = useMemo(
    () => visibleGroups(flags, isOwner, role),
    [flags, isOwner, role]
  );
  const tabs = mobilePrimaryTabs(flags, locale);
  const frozenLabel = locale === "en" ? "as-is" : "لا يُغيَّر";

  function switchLocale(next: Locale) {
    setLocale(next);
    try {
      window.sessionStorage.setItem("obx-dash-locale", next);
    } catch {
      /* ignore */
    }
  }

  async function logout() {
    await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (flags.orderingOn) {
      router.push(`/dashboard/orders`);
    } else {
      router.push(`/dashboard/products`);
    }
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#F6F3EE] text-[var(--brand-ink)]"
      dir={dir}
      lang={locale}
    >
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-[var(--brand-line)] bg-white md:flex md:border-e">
          <div className="flex items-center gap-3 px-4 py-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-contain ring-1 ring-black/10"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-bold text-white">
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{displayName}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--brand-muted)]">
                {role}
              </p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-6">
            {groups.map((g) => (
              <div key={g.key} className="mb-4">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                  {labelOf(g, locale)}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((item) => {
                    const active = isNavActive(item.href, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className={cn(
                            "relative flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition",
                            active
                              ? "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] font-semibold text-[var(--brand-primary)]"
                              : "text-[var(--brand-ink)] hover:bg-black/[0.03]"
                          )}
                        >
                          {active && (
                            <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[var(--brand-primary)]" />
                          )}
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{labelOf(item, locale)}</span>
                          {item.frozen && (
                            <span className="ms-auto shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-muted)]">
                              {frozenLabel}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <Link
              href="/"
              className="mx-1 mt-2 flex min-h-11 items-center rounded-xl px-3 text-sm text-[var(--brand-muted)] hover:bg-black/[0.03]"
            >
              {locale === "en" ? "View menu" : "عرض المنيو"}
            </Link>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--brand-line)] bg-white/95 px-3 py-2.5 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-bold text-white">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{displayName}</p>
              </div>
            </div>
            <form
              onSubmit={onSearch}
              className="ms-auto hidden min-w-0 flex-1 md:block md:max-w-sm"
            >
              <label className="relative block">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={locale === "en" ? "Search…" : "ابحث"}
                  className="h-10 w-full rounded-full border border-[var(--brand-line)] bg-[#F6F3EE] pe-3 ps-9 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                />
              </label>
            </form>
            {languages === "both" && (
              <div className="ms-auto flex overflow-hidden rounded-full border border-[var(--brand-line)] text-[11px] font-bold md:ms-0">
                <button
                  type="button"
                  className={cn(
                    "min-h-9 px-2.5",
                    locale === "ar"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--brand-muted)]"
                  )}
                  onClick={() => switchLocale("ar")}
                >
                  عربي
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-h-9 px-2.5",
                    locale === "en"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--brand-muted)]"
                  )}
                  onClick={() => switchLocale("en")}
                >
                  EN
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[var(--brand-line)] px-3 text-xs font-semibold"
              aria-label={locale === "en" ? "Log out" : "خروج"}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">
                {locale === "en" ? "Log out" : "خروج"}
              </span>
            </button>
          </header>

          <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 md:pb-8">
            {children}
          </main>
        </div>
      </div>

      {isOwner && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--brand-line)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label={locale === "en" ? "Dashboard" : "لوحة التحكم"}
        >
          <ul className="mx-auto flex max-w-lg items-stretch">
            {tabs.map((tab) => {
              const active = isNavActive(tab.href, pathname);
              const Icon = tab.icon;
              return (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                      active
                        ? "text-[var(--brand-primary)]"
                        : "text-[var(--brand-muted)]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {locale === "en" ? tab.en : tab.ar}
                    <span
                      className={cn(
                        "h-0.5 w-6 rounded-full",
                        active ? "bg-[var(--brand-accent)]" : "bg-transparent"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                  moreOpen
                    ? "text-[var(--brand-primary)]"
                    : "text-[var(--brand-muted)]"
                )}
              >
                <span className="text-lg leading-none">•••</span>
                {locale === "en" ? "More" : "المزيد"}
                <span
                  className={cn(
                    "h-0.5 w-6 rounded-full",
                    moreOpen ? "bg-[var(--brand-accent)]" : "bg-transparent"
                  )}
                />
              </button>
            </li>
          </ul>
        </nav>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={locale === "en" ? "Close" : "إغلاق"}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-base font-bold">
                {locale === "en" ? "More" : "المزيد"}
              </p>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {groups.map((g) => (
              <div
                key={g.key}
                className="border-t border-[var(--brand-line)] px-2 py-2"
              >
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                  {labelOf(g, locale)}
                </p>
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm"
                    >
                      <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
                      <span>{labelOf(item, locale)}</span>
                      {item.frozen && (
                        <span className="ms-auto rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-muted)]">
                          {frozenLabel}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
            <Link
              href="/"
              className="mx-4 mt-2 mb-3 flex min-h-12 items-center justify-center rounded-xl border border-[var(--brand-line)] text-sm font-medium"
            >
              {locale === "en" ? "Open public menu" : "فتح المنيو"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
