"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAgencyLocale } from "@/components/locale-provider";

type Client = {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logoPath: string | null;
  colors: { primary: string; accent: string; surface: string };
  domain: string;
  status: string;
  lastExportedAt: string | null;
  packagePath: string | null;
};

export function HomeClient() {
  const router = useRouter();
  const { t, locale } = useAgencyLocale();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setClients(d.clients || []);
      })
      .catch(() => setError(t.home.loadError))
      .finally(() => setLoading(false));
  }, [router, t.home.loadError]);

  const dateLocale = locale === "ar" ? "ar-EG" : "en-GB";
  const q = query.trim().toLowerCase();
  const filtered = q
    ? clients.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q)
      )
    : clients;
  const live = clients.filter((c) => c.status === "live" || c.packagePath).length;
  const draft = clients.length - live;
  const lastExport = clients
    .map((c) => c.lastExportedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-white">{t.home.title}</h2>
          <p className="text-sm text-white/50">{t.home.subtitle}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="h-11 w-full rounded-full border border-white/15 bg-[#141414] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-[var(--obx-yellow)] sm:w-64"
          />
          <Link href="/clients/new" className="w-full sm:w-auto">
            <Button type="button" className="w-full sm:w-auto">
              {t.home.create}
            </Button>
          </Link>
        </div>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Clients" value={clients.length} />
          <Kpi label="Live" value={live} />
          <Kpi label="Draft" value={draft} />
          <Kpi
            label="Last export"
            value={
              lastExport
                ? new Date(lastExport).toLocaleDateString(dateLocale)
                : "—"
            }
            yellow
          />
        </div>
      )}

      {loading && <p className="text-sm text-white/50">{t.home.loading}</p>}
      {error && (
        <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && clients.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.home.emptyTitle}</CardTitle>
            <CardDescription>{t.home.emptyDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/clients/new">
              <Button className="w-full sm:w-auto">{t.home.createFirst}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="block min-w-0">
            <Card className="h-full transition hover:border-[var(--obx-yellow)]/40">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10"
                    style={{ background: c.colors.surface }}
                  >
                    {c.logoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/uploads/${c.logoPath.split("/").pop()}`}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span
                        className="text-lg font-bold"
                        style={{ color: c.colors.primary }}
                      >
                        {c.displayName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base sm:text-lg">
                      {c.displayName}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {c.slug} · {c.domain}
                    </CardDescription>
                    <span className="mt-2 inline-flex rounded-full bg-[var(--obx-yellow)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                      {c.packagePath ? "Live" : "Draft"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: c.colors.primary }}
                  title="Primary"
                />
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: c.colors.accent }}
                  title="Accent"
                />
                <span className="ms-auto text-xs text-white/40">
                  {c.lastExportedAt
                    ? `${t.home.lastExport}: ${new Date(c.lastExportedAt).toLocaleDateString(dateLocale)}`
                    : t.home.neverExported}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  yellow,
}: {
  label: string;
  value: number | string;
  yellow?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--obx-bg-card)] p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${yellow ? "text-[var(--obx-yellow)]" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
