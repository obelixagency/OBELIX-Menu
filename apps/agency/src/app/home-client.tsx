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

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">{t.home.title}</h2>
          <p className="text-sm text-white/50">{t.home.subtitle}</p>
        </div>
        <Link href="/clients/new" className="w-full sm:w-auto">
          <Button type="button" className="w-full sm:w-auto">
            {t.home.create}
          </Button>
        </Link>
      </div>

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
        {clients.map((c) => (
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
