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

type Row = {
  productId: string;
  name: string;
  nameEn?: string;
  qty: number;
  lowAt: number;
  available: boolean;
  low: boolean;
};

type ReportItem = {
  productId: string;
  name: string;
  nameEn?: string;
  qty: number;
  lowAt: number;
  low: boolean;
  out: boolean;
  soldQty: number;
};

function todayCairoYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function InventoryClient() {
  const today = todayCairoYmd();
  const [items, setItems] = useState<Row[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [fromDay, setFromDay] = useState(shiftYmd(today, -6));
  const [toDay, setToDay] = useState(today);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [reportMeta, setReportMeta] = useState<{
    lowCount: number;
    outCount: number;
  } | null>(null);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<
    { id: string; name: string }[]
  >([]);
  const [multiBranch, setMultiBranch] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        from: fromDay,
        to: toDay,
      });
      if (branchId) qs.set("branch", branchId);
      const res = await fetch(`/api/inventory/report?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تقرير المخزون");
      setReportItems(data.report?.items || []);
      setReportMeta({
        lowCount: data.report?.lowCount || 0,
        outCount: data.report?.outCount || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, [fromDay, toDay, branchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
      const res = await fetch(`/api/inventory${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setEnabled(data.enabled !== false);
      setItems(data.items || []);
      setMultiBranch(Boolean(data.multiBranch));
      setBranches(data.branches || []);
      if (data.branchId) setBranchId(data.branchId);
      if (data.enabled !== false) await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [loadReport, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(productId: string, qty: number, lowAt: number) {
    setSaving(productId);
    setError(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty, lowAt, branchId: branchId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(null);
    }
  }

  async function switchBranch(id: string) {
    setBranchId(id);
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select", branchId: id }),
    });
  }

  if (loading) {
    return <p className="text-sm text-black/50">جاري التحميل…</p>;
  }

  if (!enabled) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-black/55">
          المخازن غير مفعّلة لهذا العميل — فعّلها من داشبورد الوكالة ثم أعد
          التصدير.
        </CardContent>
      </Card>
    );
  }

  const lowCount = items.filter((i) => i.low).length;
  const outCount = items.filter((i) => i.qty <= 0).length;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {multiBranch && branches.length > 0 && (
          <Card className="sm:col-span-3">
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <span className="text-sm text-black/50">الفرع:</span>
              <select
                className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm"
                value={branchId}
                onChange={(e) => switchBranch(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-black/45">الأصناف المتتبَّعة</p>
            <p className="text-2xl font-bold text-[var(--brand-primary)]">
              {items.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-black/45">تحت حد التنبيه</p>
            <p
              className={`text-2xl font-bold ${
                lowCount ? "text-red-600" : "text-[var(--brand-primary)]"
              }`}
            >
              {reportMeta?.lowCount ?? lowCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-black/45">نفد (٠)</p>
            <p
              className={`text-2xl font-bold ${
                outCount ? "text-red-600" : "text-[var(--brand-primary)]"
              }`}
            >
              {reportMeta?.outCount ?? outCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">حركة الفترة</CardTitle>
          <CardDescription>
            الكمية المباعة من الطلبات غير الملغاة + الرصيد الحالي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs">
              <span className="text-black/50">من</span>
              <Input
                type="date"
                className="h-10 w-40"
                value={fromDay}
                max={toDay}
                onChange={(e) => setFromDay(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-black/50">إلى</span>
              <Input
                type="date"
                className="h-10 w-40"
                value={toDay}
                max={today}
                min={fromDay}
                onChange={(e) => setToDay(e.target.value)}
              />
            </label>
            <Button type="button" className="h-10" onClick={loadReport}>
              تحديث التقرير
            </Button>
          </div>
          {reportItems.length === 0 ? (
            <p className="text-sm text-black/45">لا بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-black/45">
                    <th className="py-2 pe-2 font-medium">الصنف</th>
                    <th className="py-2 pe-2 font-medium">مباع</th>
                    <th className="py-2 pe-2 font-medium">رصيد</th>
                    <th className="py-2 font-medium">حالة</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((r) => (
                    <tr key={r.productId} className="border-b border-black/5">
                      <td className="py-2 pe-2">
                        <span className="font-medium">{r.name}</span>
                        {r.nameEn && (
                          <span className="ms-2 text-xs text-black/35" dir="ltr">
                            {r.nameEn}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pe-2 tabular-nums">{r.soldQty}</td>
                      <td className="py-2 pe-2 tabular-nums">{r.qty}</td>
                      <td className="py-2 text-xs font-medium">
                        {r.out ? (
                          <span className="text-red-600">نفد</span>
                        ) : r.low ? (
                          <span className="text-amber-700">نقص</span>
                        ) : (
                          <span className="text-black/40">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">الكميات</CardTitle>
          <CardDescription>
            تتخصم تلقائياً عند طلب المنيو أو إقفال تذكرة POS. الإلغاء يرجع الكمية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-black/45">لا منتجات بعد</p>
          ) : (
            items.map((row) => (
              <InventoryRow
                key={row.productId}
                row={row}
                saving={saving === row.productId}
                onSave={save}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Button type="button" variant="outline" onClick={load}>
        تحديث
      </Button>
    </div>
  );
}

function InventoryRow({
  row,
  saving,
  onSave,
}: {
  row: Row;
  saving: boolean;
  onSave: (id: string, qty: number, lowAt: number) => void;
}) {
  const [qty, setQty] = useState(String(row.qty));
  const [lowAt, setLowAt] = useState(String(row.lowAt));

  useEffect(() => {
    setQty(String(row.qty));
    setLowAt(String(row.lowAt));
  }, [row.qty, row.lowAt]);

  return (
    <div
      className={`rounded-lg border p-3 ${
        row.low ? "border-red-200 bg-red-50/60" : "border-black/10 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{row.name}</p>
          {row.nameEn && (
            <p className="text-xs text-black/40" dir="ltr">
              {row.nameEn}
            </p>
          )}
          {row.low && (
            <p className="mt-1 text-xs font-medium text-red-600">نقص مخزون</p>
          )}
        </div>
        {!row.available && (
          <span className="text-[10px] uppercase text-black/40">مخفي</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1 text-xs">
          <span className="text-black/50">الكمية</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 px-0 text-lg"
              disabled={saving || Number(qty) <= 0}
              onClick={() => {
                const next = Math.max(0, (Number(qty) || 0) - 1);
                setQty(String(next));
                onSave(row.productId, next, Number(lowAt) || 0);
              }}
              aria-label="تقليل"
            >
              −
            </Button>
            <Input
              type="number"
              min={0}
              className="h-10 w-20 text-center tabular-nums"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 px-0 text-lg"
              disabled={saving}
              onClick={() => {
                const next = (Number(qty) || 0) + 1;
                setQty(String(next));
                onSave(row.productId, next, Number(lowAt) || 0);
              }}
              aria-label="زيادة"
            >
              +
            </Button>
          </div>
        </div>
        <label className="space-y-1 text-xs">
          <span className="text-black/50">تنبيه عند ≤</span>
          <Input
            type="number"
            min={0}
            className="h-10 w-24"
            value={lowAt}
            onChange={(e) => setLowAt(e.target.value)}
          />
        </label>
        <Button
          type="button"
          className="h-10"
          disabled={saving}
          onClick={() =>
            onSave(row.productId, Number(qty) || 0, Number(lowAt) || 0)
          }
        >
          {saving ? "…" : "حفظ"}
        </Button>
      </div>
    </div>
  );
}
