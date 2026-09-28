"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgencyLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import type { AgencyLocale } from "@/lib/i18n";

export function AgencyHeader() {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useAgencyLocale();

  if (pathname === "/login") {
    return (
      <div className="mb-4 flex justify-end">
        <LangToggle locale={locale} setLocale={setLocale} t={t} />
      </div>
    );
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  }

  function switchLang(next: AgencyLocale) {
    setLocale(next);
    router.refresh();
  }

  return (
    <header className="mb-6 border-b border-white/10 pb-4 sm:mb-10 sm:pb-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/obelix-logo.png"
            alt="OBELIX"
            className="h-11 w-11 shrink-0 rounded-lg object-cover sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-tight text-white sm:text-xl">
              OBELIX Menu
            </p>
            <p className="truncate text-xs text-white/45">{t.header.tagline}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <LangToggle locale={locale} setLocale={switchLang} t={t} />
          <NavLink href="/" active={pathname === "/"}>
            {t.header.clients}
          </NavLink>
          <Link href="/clients/new">
            <Button type="button" size="sm">
              {t.header.newClient}
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? "…" : t.header.logout}
          </Button>
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          <LangToggle locale={locale} setLocale={switchLang} t={t} />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={open ? t.header.closeMenu : t.header.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-[var(--obx-bg-elevated)] p-3 sm:hidden">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              "min-h-11 rounded-md px-3 py-3 text-sm font-medium",
              pathname === "/"
                ? "bg-[var(--obx-yellow)] text-black"
                : "text-white hover:bg-white/5"
            )}
          >
            {t.header.clients}
          </Link>
          <Link
            href="/clients/new"
            onClick={() => setOpen(false)}
            className={cn(
              "min-h-11 rounded-md px-3 py-3 text-sm font-medium",
              pathname?.startsWith("/clients/new")
                ? "bg-[var(--obx-yellow)] text-black"
                : "text-white hover:bg-white/5"
            )}
          >
            {t.header.newClient}
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="min-h-11 rounded-md px-3 py-3 text-start text-sm font-medium text-white/80 hover:bg-white/5"
          >
            {loggingOut ? t.header.loggingOut : t.header.logout}
          </button>
        </div>
      )}
    </header>
  );
}

function LangToggle({
  locale,
  setLocale,
  t,
}: {
  locale: AgencyLocale;
  setLocale: (next: AgencyLocale) => void;
  t: ReturnType<typeof useAgencyLocale>["t"];
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-white/15"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        className={cn(
          "min-h-9 min-w-9 px-2 text-xs font-bold tracking-wide transition",
          locale === "en"
            ? "bg-[var(--obx-yellow)] text-black"
            : "bg-transparent text-white/60 hover:text-white"
        )}
        aria-pressed={locale === "en"}
        aria-label={t.header.switchToEn}
        onClick={() => setLocale("en")}
      >
        {t.header.langEn}
      </button>
      <button
        type="button"
        className={cn(
          "min-h-9 min-w-9 px-2 text-xs font-bold tracking-wide transition",
          locale === "ar"
            ? "bg-[var(--obx-yellow)] text-black"
            : "bg-transparent text-white/60 hover:text-white"
        )}
        aria-pressed={locale === "ar"}
        aria-label={t.header.switchToAr}
        onClick={() => setLocale("ar")}
      >
        {t.header.langAr}
      </button>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition",
        active
          ? "text-[var(--obx-yellow)]"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}
