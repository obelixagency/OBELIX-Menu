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

export function InventoryClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setEnabled(data.enabled !== false);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

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
        body: JSON.stringify({ productId, qty, lowAt }),
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

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
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
              {lowCount}
            </p>
          </CardContent>
        </Card>
      </div>

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
        <label className="space-y-1 text-xs">
          <span className="text-black/50">الكمية</span>
          <Input
            type="number"
            min={0}
            className="h-10 w-24"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
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
