"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderingFlagsEditor } from "@/components/ordering-flags-editor";
import {
  DEFAULT_ORDERING_FEATURES,
  type OrderingFeatures,
} from "@/lib/types";

type Client = {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logoPath: string | null;
  menuBackgroundPath?: string | null;
  colors: { primary: string; accent: string; surface: string };
  domain: string;
  dashboardPassword: string;
  languages?: "ar" | "en" | "both";
  currency?: string;
  font: string;
  ordering?: OrderingFeatures;
  status: string;
  lastExportedAt: string | null;
  packagePath: string | null;
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [savingFlags, setSavingFlags] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<OrderingFeatures>(
    DEFAULT_ORDERING_FEATURES
  );

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setClient(d.client);
          setOrdering({
            ...DEFAULT_ORDERING_FEATURES,
            ...(d.client.ordering || {}),
          });
        }
      })
      .catch(() => setError("تعذّر التحميل"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSaveOrdering() {
    if (!client) return;
    setSavingFlags(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordering }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      setClient(data.client);
      setOrdering({
        ...DEFAULT_ORDERING_FEATURES,
        ...(data.client.ordering || {}),
      });
      setMessage("تم حفظ ميزات الطلب — أعد تصدير الحزمة لتطبيقها على العميل");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSavingFlags(false);
    }
  }

  async function handleExport() {
    if (!client) return;
    setExporting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/export`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التصدير");
      setMessage(data.message);
      const refreshed = await fetch(`/api/clients/${client.id}`).then((r) =>
        r.json()
      );
      setClient(refreshed.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setExporting(false);
    }
  }

  async function handleBackground(file: File) {
    if (!client) return;
    setUploadingBg(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("background", file);
      const res = await fetch(`/api/clients/${client.id}/background`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل رفع الخلفية");
      const refreshed = await fetch(`/api/clients/${client.id}`).then((r) =>
        r.json()
      );
      setClient(refreshed.client);
      setMessage("تم تحديث خلفية المنيو — أعد التصدير لتضمينها في الحزمة");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setUploadingBg(false);
    }
  }

  if (loading) return <p className="text-sm text-white/50">جاري التحميل…</p>;
  if (error && !client)
    return <p className="text-sm text-red-300">{error}</p>;
  if (!client) return null;

  return (
    <main className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="min-h-11 text-sm text-white/50 hover:text-[var(--obx-yellow)]"
      >
        ← العودة للعملاء
      </button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10"
              style={{ background: client.colors.surface }}
            >
              {client.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/uploads/${client.logoPath.split("/").pop()}`}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: client.colors.primary }}
                >
                  {client.displayName.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl">
                {client.displayName}
              </CardTitle>
              <CardDescription className="break-all">
                {client.slug} · {client.domain}
              </CardDescription>
              <div className="mt-2 flex gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-white/20"
                  style={{ background: client.colors.primary }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-white/20"
                  style={{ background: client.colors.accent }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-white/20"
                  style={{ background: client.colors.surface }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">لغة المنيو</dt>
              <dd className="text-white">
                {client.languages === "ar"
                  ? "عربي فقط"
                  : client.languages === "en"
                    ? "English only"
                    : "عربي + English"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">العملة</dt>
              <dd className="font-mono text-white" dir="ltr">
                {client.currency || "EGP"}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">كلمة مرور الداشبورد</dt>
              <dd className="font-mono text-white" dir="ltr">
                {client.dashboardPassword}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">الخط</dt>
              <dd className="text-white">{client.font}</dd>
            </div>
            <div>
              <dt className="text-white/45">آخر تصدير</dt>
              <dd className="text-white">
                {client.lastExportedAt
                  ? new Date(client.lastExportedAt).toLocaleString("ar-EG")
                  : "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-white/45">مسار الحزمة</dt>
              <dd className="truncate font-mono text-xs text-white" dir="ltr">
                {client.packagePath || "—"}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold text-[var(--obx-yellow)]">
              خلفية المنيو العام
            </p>
            <p className="text-xs text-white/45">
              اختياري — تُصدَّر مع الحزمة. بدون صورة يُستخدم لون السطح من Brand
              Kit.
            </p>
            {client.menuBackgroundPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads/${client.menuBackgroundPath.split("/").pop()}`}
                alt=""
                className="mt-2 aspect-video w-full max-w-sm rounded-lg object-cover"
              />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingBg}
              className="block w-full text-sm text-white/70 file:me-3 file:rounded-md file:border-0 file:bg-[var(--obx-yellow)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleBackground(f);
              }}
            />
            {uploadingBg && (
              <p className="text-xs text-white/50">جاري الرفع…</p>
            )}
          </div>

          <div className="space-y-3">
            <OrderingFlagsEditor value={ordering} onChange={setOrdering} />
            <Button
              type="button"
              variant="secondary"
              disabled={savingFlags}
              onClick={handleSaveOrdering}
              className="w-full sm:w-auto"
            >
              {savingFlags ? "جاري حفظ الميزات…" : "حفظ ميزات الطلب"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap">
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              {exporting ? "جاري التوليد…" : "توليد / تصدير الحزمة"}
            </Button>
            {client.lastExportedAt && (
              <a
                href={`/api/clients/${client.id}/export?download=1`}
                className="w-full sm:w-auto"
              >
                <Button type="button" variant="secondary" className="w-full">
                  تحميل ZIP
                </Button>
              </a>
            )}
          </div>

          {message && (
            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="rounded-lg border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white/70">
            <p className="font-semibold text-[var(--obx-yellow)]">بعد التصدير</p>
            <ol className="mt-2 list-decimal space-y-2 pr-5">
              <li>
                انسخ مجلد{" "}
                <code className="break-all rounded bg-white/10 px-1 text-[var(--obx-yellow)]" dir="ltr">
                  apps/agency/generated/{client.slug}
                </code>{" "}
                أو حمّل الـ ZIP.
              </li>
              <li>
                ارفعه على هوست العميل ونِشّط الدومين (
                <span dir="ltr" className="break-all">
                  {client.domain}
                </span>
                ).
              </li>
              <li>
                شغّل{" "}
                <code className="rounded bg-white/10 px-1" dir="ltr">
                  docker compose up -d
                </code>{" "}
                أو{" "}
                <code className="break-all rounded bg-white/10 px-1" dir="ltr">
                  pnpm install && pnpm build && pnpm start
                </code>
                .
              </li>
              <li>
                المنيو على{" "}
                <code className="rounded bg-white/10 px-1" dir="ltr">
                  /
                </code>
                ، الداشبورد على{" "}
                <code className="rounded bg-white/10 px-1" dir="ltr">
                  /dashboard
                </code>
                .
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
