"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plus, Users, X } from "lucide-react";
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
      <div className="absolute end-4 top-4 z-20">
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

  const clientsActive = pathname === "/";
  const newActive = Boolean(pathname?.startsWith("/clients/new"));

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-e border-white/10 bg-[#0a0a0a] lg:flex">
        <Link href="/" className="flex items-center gap-3 px-4 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/obelix-logo.png"
            alt="OBELIX"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">
              OBELIX <span className="text-[var(--obx-yellow)]">Menu</span>
            </p>
            <p className="text-[10px] text-white/40">{t.header.tagline}</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <Link
            href="/"
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium",
              clientsActive
                ? "bg-[var(--obx-yellow)] text-black"
                : "text-white/75 hover:bg-white/5"
            )}
          >
            <Users className="h-4 w-4" />
            {t.header.clients}
          </Link>
          <Link
            href="/clients/new"
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium",
              newActive
                ? "bg-[var(--obx-yellow)] text-black"
                : "text-white/75 hover:bg-white/5"
            )}
          >
            <Plus className="h-4 w-4" />
            {t.header.newClient}
          </Link>
        </nav>
        <div className="space-y-3 border-t border-white/10 p-4">
          <LangToggle locale={locale} setLocale={switchLang} t={t} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? t.header.loggingOut : t.header.logout}
          </Button>
          <p className="text-center text-[10px] text-white/30">
            Powered by OBELIX
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/obelix-logo.png"
              alt="OBELIX"
              className="h-9 w-9 rounded-lg object-cover"
            />
            <p className="truncate text-sm font-extrabold text-white">
              OBELIX Menu
            </p>
          </Link>
          <div className="flex items-center gap-2">
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
          <div className="mt-3 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[var(--obx-bg-elevated)] p-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium",
                clientsActive
                  ? "bg-[var(--obx-yellow)] text-black"
                  : "text-white"
              )}
            >
              {t.header.clients}
            </Link>
            <Link
              href="/clients/new"
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium",
                newActive ? "bg-[var(--obx-yellow)] text-black" : "text-white"
              )}
            >
              {t.header.newClient}
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="min-h-11 rounded-xl px-3 text-start text-sm font-medium text-white/80"
            >
              {loggingOut ? t.header.loggingOut : t.header.logout}
            </button>
          </div>
        )}
      </header>
    </>
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
      className="inline-flex overflow-hidden rounded-full border border-white/15"
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
