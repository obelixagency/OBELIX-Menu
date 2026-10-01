"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

type Totals = {
  orderCount: number;
  revenue: number;
  byPayment: Record<string, { count: number; revenue: number }>;
};

type Shift = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  openingCash: number;
  note: string | null;
  totals: Totals | null;
  countedCash?: number | null;
  expectedCash?: number | null;
  cashVariance?: number | null;
};

const PAY_AR: Record<string, string> = {
  cash: "كاش",
  card: "بطاقة",
  other: "أخرى",
  unpaid: "بدون دفع",
};

export function ShiftsClient({ currency }: { currency: string }) {
  const [open, setOpen] = useState<Shift | null>(null);
  const [live, setLive] = useState<Totals | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openingCash, setOpeningCash] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      setOpen(data.open || null);
      setLive(data.live || null);
      setShifts(data.shifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function act(action: "open" | "close") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "open"
            ? { action, openingCash: Number(openingCash) || 0 }
            : {
                action,
                note,
                countedCash:
                  countedCash === "" ? undefined : Number(countedCash) || 0,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      setNote("");
      setCountedCash("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-black/50">جاري التحميل…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {open ? "وردية مفتوحة" : "مفيش وردية مفتوحة"}
          </CardTitle>
          <CardDescription>
            تقفيل اليوم بيلخّص مبيعات الـ POS من فتح الوردية لحد الإقفال.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!open ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1 text-sm">
                <span className="text-black/50">عهدة افتتاح (كاش)</span>
                <Input
                  type="number"
                  min={0}
                  className="h-11 w-36"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                />
              </label>
              <Button
                type="button"
                className="h-11"
                disabled={busy}
                onClick={() => act("open")}
              >
                فتح وردية
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-black/55">
                فتحها{" "}
                <span className="font-medium text-black">{open.openedBy}</span> ·{" "}
                {new Date(open.openedAt).toLocaleString("ar-EG", {
                  timeZone: "Africa/Cairo",
                })}
                {open.openingCash > 0 && (
                  <>
                    {" "}
                    · عهدة{" "}
                    {formatPrice(open.openingCash, currency, "ar")}
                  </>
                )}
              </p>
              {live && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat
                    label="إيراد الوردية"
                    value={formatPrice(live.revenue, currency, "ar")}
                  />
                  <Stat label="طلبات POS" value={String(live.orderCount)} />
                  <Stat
                    label="مبيعات كاش"
                    value={formatPrice(
                      live.byPayment.cash?.revenue || 0,
                      currency,
                      "ar"
                    )}
                  />
                  <Stat
                    label="كاش متوقع في الدرج"
                    value={formatPrice(
                      (open.openingCash || 0) +
                        (live.byPayment.cash?.revenue || 0),
                      currency,
                      "ar"
                    )}
                  />
                </div>
              )}
              <label className="block space-y-1 text-sm">
                <span className="text-black/50">كاش معدود عند الإقفال</span>
                <Input
                  type="number"
                  min={0}
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="h-11"
                  placeholder="عدّ الدرج"
                  dir="ltr"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-black/50">ملاحظة الإقفال (اختياري)</span>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-11"
                  placeholder="مثلاً: فرق درج…"
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                disabled={busy}
                onClick={() => act("close")}
              >
                تقفيل الوردية
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">الورديات السابقة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shifts.filter((s) => s.closedAt).length === 0 ? (
            <p className="text-sm text-black/45">لا ورديات مقفلة بعد</p>
          ) : (
            shifts
              .filter((s) => s.closedAt)
              .map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-black/10 bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">
                      {new Date(s.openedAt).toLocaleDateString("ar-EG", {
                        timeZone: "Africa/Cairo",
                      })}
                    </span>
                    <span className="tabular-nums text-[var(--brand-primary)]">
                      {formatPrice(s.totals?.revenue || 0, currency, "ar")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-black/45">
                    {s.openedBy} → {s.closedBy} · {s.totals?.orderCount || 0}{" "}
                    طلب
                  </p>
                  {s.totals && (
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {Object.entries(s.totals.byPayment).map(([k, v]) => (
                        <li
                          key={k}
                          className="rounded-md bg-black/5 px-2 py-1"
                        >
                          {PAY_AR[k] || k}:{" "}
                          {formatPrice(v.revenue, currency, "ar")}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.note && (
                    <p className="mt-2 text-xs text-black/50">{s.note}</p>
                  )}
                  {s.expectedCash != null && (
                    <p className="mt-1 text-xs text-black/50">
                      متوقع{" "}
                      {formatPrice(s.expectedCash, currency, "ar")}
                      {s.countedCash != null
                        ? ` · معدود ${formatPrice(s.countedCash, currency, "ar")}`
                        : ""}
                      {s.cashVariance != null
                        ? ` · فرق ${formatPrice(s.cashVariance, currency, "ar")}`
                        : ""}
                    </p>
                  )}
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-[var(--brand-surface)] p-3">
      <p className="text-[10px] text-black/45">{label}</p>
      <p className="text-lg font-bold tabular-nums text-[var(--brand-primary)]">
        {value}
      </p>
    </div>
  );
}
