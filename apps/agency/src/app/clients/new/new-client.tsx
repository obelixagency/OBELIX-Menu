"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function NewClientForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [primary, setPrimary] = useState("#1B5E4A");
  const [accent, setAccent] = useState("#C4A35A");
  const [surface, setSurface] = useState("#F4F7F5");
  const [password, setPassword] = useState("obelix123");
  const [languages, setLanguages] = useState<"ar" | "en" | "both">("both");
  const [currency, setCurrency] = useState("EGP");
  const [customCurrency, setCustomCurrency] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [background, setBackground] = useState<File | null>(null);
  const [ordering, setOrdering] = useState<OrderingFeatures>(
    DEFAULT_ORDERING_FEATURES
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || name,
          displayName: name,
          domain: domain || undefined,
          primaryColor: primary,
          accentColor: accent,
          surfaceColor: surface,
          dashboardPassword: password,
          languages,
          currency:
            currency === "CUSTOM"
              ? (customCurrency || "EGP").toUpperCase().slice(0, 8)
              : currency,
          ordering,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإنشاء");

      if (logo) {
        const fd = new FormData();
        fd.append("logo", logo);
        const logoRes = await fetch(`/api/clients/${data.client.id}/logo`, {
          method: "POST",
          body: fd,
        });
        if (!logoRes.ok) {
          const logoData = await logoRes.json();
          throw new Error(logoData.error || "فشل رفع اللوجو");
        }
      }

      if (background) {
        const fd = new FormData();
        fd.append("background", background);
        const bgRes = await fetch(
          `/api/clients/${data.client.id}/background`,
          { method: "POST", body: fd }
        );
        if (!bgRes.ok) {
          const bgData = await bgRes.json();
          throw new Error(bgData.error || "فشل رفع خلفية المنيو");
        }
      }

      router.push(`/clients/${data.client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>عميل جديد + Brand Kit</CardTitle>
          <CardDescription>
            الاسم، الـ slug، اللوجو، والألوان — ثم تولّد الحزمة من صفحة العميل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم العميل (عربي)</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: قهوة البيت"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (دومين فرعي / مجلد)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="qahwa-elbeit"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div>
              <Label htmlFor="domain">الدومين المستهدف</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="menu.qahwa-elbeit.com"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div>
              <Label htmlFor="logo">اللوجو</Label>
              <Input
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setLogo(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="background">خلفية المنيو العام (اختياري)</Label>
              <Input
                id="background"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setBackground(e.target.files?.[0] || null)}
              />
              <p className="mt-1 text-xs text-white/40">
                صورة كاملة العرض خلف المنيو — مع طبقة شفافة للقراءة على الموبايل
                والكمبيوتر.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="primary">أساسي</Label>
                <Input
                  id="primary"
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-12 cursor-pointer p-1"
                />
              </div>
              <div>
                <Label htmlFor="accent">تمييز</Label>
                <Input
                  id="accent"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-12 cursor-pointer p-1"
                />
              </div>
              <div>
                <Label htmlFor="surface">سطح</Label>
                <Input
                  id="surface"
                  type="color"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  className="h-12 cursor-pointer p-1"
                />
              </div>
            </div>
            <div
              className="rounded-lg border border-white/10 p-4"
              style={{ background: surface }}
            >
              <p className="text-sm text-black/50">معاينة سريعة</p>
              <p className="mt-1 text-lg font-bold" style={{ color: primary }}>
                {name || "اسم العميل"}
              </p>
              <span
                className="mt-2 inline-block rounded px-2 py-1 text-xs font-medium"
                style={{ background: accent, color: "#1a1a1a" }}
              >
                مميز
              </span>
            </div>
            <div>
              <Label htmlFor="languages">لغة المنيو العام</Label>
              <select
                id="languages"
                value={languages}
                onChange={(e) =>
                  setLanguages(e.target.value as "ar" | "en" | "both")
                }
                className="flex h-11 w-full rounded-md border border-white/15 bg-[var(--obx-bg-elevated)] px-3 text-sm text-white"
              >
                <option value="ar">عربي فقط</option>
                <option value="en">English only</option>
                <option value="both">عربي + English (تبديل في المنيو)</option>
              </select>
              <p className="mt-1 text-xs text-white/40">
                يحدد حقول الأسماء/الأوصاف في داشبورد العميل وتبديل اللغة في المنيو
                العام.
              </p>
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-11 w-full rounded-md border border-white/15 bg-[var(--obx-bg-elevated)] px-3 text-sm text-white"
              >
                <option value="EGP">EGP — جنيه مصري</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="SAR">SAR — ريال سعودي</option>
                <option value="AED">AED — درهم إماراتي</option>
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="CUSTOM">أخرى / Other…</option>
              </select>
              {currency === "CUSTOM" && (
                <Input
                  className="mt-2 text-left"
                  dir="ltr"
                  placeholder="e.g. KWD"
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  maxLength={8}
                />
              )}
            </div>
            <div>
              <Label htmlFor="password">كلمة مرور داشبورد العميل</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
            <OrderingFlagsEditor value={ordering} onChange={setOrdering} />
            {error && (
              <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "جاري الحفظ…" : "حفظ العميل"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/")}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
