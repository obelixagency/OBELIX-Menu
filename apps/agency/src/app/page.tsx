"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

export default function HomePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []))
      .catch(() => setError("تعذّر تحميل العملاء"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">العملاء</h2>
          <p className="text-sm text-white/50">
            كل عميل = حزمة منيو + داشبورد قابلة للرفع على دومين منفصل
          </p>
        </div>
        <Link href="/clients/new" className="w-full sm:w-auto">
          <Button type="button" className="w-full sm:w-auto">
            إنشاء عميل
          </Button>
        </Link>
      </div>

      {loading && <p className="text-sm text-white/50">جاري التحميل…</p>}
      {error && (
        <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && clients.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>لا يوجد عملاء بعد</CardTitle>
            <CardDescription>
              ابدأ بإنشاء أول عميل مع اللوجو والألوان، ثم صدّر الحزمة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/clients/new">
              <Button className="w-full sm:w-auto">إنشاء أول عميل</Button>
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
                <span className="mr-auto text-xs text-white/40">
                  {c.lastExportedAt
                    ? `آخر تصدير: ${new Date(c.lastExportedAt).toLocaleDateString("ar-EG")}`
                    : "لم يُصدَّر بعد"}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
