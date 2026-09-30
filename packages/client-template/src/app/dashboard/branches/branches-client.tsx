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

type Branch = {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
};

export function BranchesClient({ currency }: { currency: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [defaultId, setDefaultId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceBranch, setPriceBranch] = useState("");
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, pRes] = await Promise.all([
        fetch("/api/branches", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);
      const bData = await bRes.json();
      if (!bRes.ok) throw new Error(bData.error || "فشل");
      setBranches(bData.branches || []);
      setDefaultId(bData.defaultBranchId || "");
      setActiveId(bData.activeBranchId || "");
      if (!priceBranch && bData.defaultBranchId) {
        setPriceBranch(bData.defaultBranchId);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const list = (pData.products || pData.items || []) as Product[];
        setProducts(
          list.map((p) => ({
            id: p.id,
            name: p.name,
            nameEn: p.nameEn,
            price: Number(p.price) || 0,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [priceBranch]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      await load();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
      return null;
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
          <CardTitle className="text-base">إضافة فرع</CardTitle>
          <CardDescription>
            هيتعمل للفرع مخزون مستقل تلقائياً على نفس أصناف المنيو.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="text-black/50">الاسم (عربي)</span>
            <Input
              className="h-11 w-44"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="فرع المعادي"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-black/50">EN (اختياري)</span>
            <Input
              className="h-11 w-40"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Maadi"
              dir="ltr"
            />
          </label>
          <Button
            type="button"
            className="h-11"
            disabled={busy || !name.trim()}
            onClick={async () => {
              const ok = await act({
                action: "create",
                name: name.trim(),
                nameEn: nameEn.trim() || undefined,
              });
              if (ok) {
                setName("");
                setNameEn("");
              }
            }}
          >
            إضافة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">الفروع</CardTitle>
          <CardDescription>
            النشط حالياً للـ POS/مخازن:{" "}
            <span className="font-medium text-black">
              {branches.find((b) => b.id === activeId)?.name || "—"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {branches.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {b.name}
                  {!b.active && (
                    <span className="ms-2 text-xs text-black/40">معطّل</span>
                  )}
                  {b.id === defaultId && (
                    <span className="ms-2 text-xs text-[var(--brand-primary)]">
                      افتراضي
                    </span>
                  )}
                </p>
                <p className="text-xs text-black/40" dir="ltr">
                  /{b.slug}
                  {b.nameEn ? ` · ${b.nameEn}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={busy}
                  onClick={() => act({ action: "select", branchId: b.id })}
                >
                  اختيار
                </Button>
                {b.id !== defaultId && b.active && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 text-xs"
                    disabled={busy}
                    onClick={() => act({ action: "setDefault", id: b.id })}
                  >
                    جعله افتراضي
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={busy}
                  onClick={() =>
                    act({ action: "update", id: b.id, active: !b.active })
                  }
                >
                  {b.active ? "تعطيل" : "تفعيل"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">أسعار فرع (اختياري)</CardTitle>
          <CardDescription>
            اتركه فاضي = سعر المنيو العام. مفيد لو فرع أغلى أو أرخص.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-black/50">الفرع</span>
            <select
              className="h-11 w-full max-w-xs rounded-md border border-black/15 bg-white px-3 text-sm"
              value={priceBranch}
              onChange={(e) => setPriceBranch(e.target.value)}
            >
              {branches
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          <ul className="divide-y divide-black/5">
            {products.slice(0, 40).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">
                  {p.name}
                  <span className="ms-2 text-xs text-black/40">
                    أساس {formatPrice(p.price, currency, "ar")}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-24"
                    placeholder="سعر الفرع"
                    value={priceEdits[p.id] ?? ""}
                    onChange={(e) =>
                      setPriceEdits((prev) => ({
                        ...prev,
                        [p.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    className="h-9 text-xs"
                    disabled={busy || !priceBranch}
                    onClick={() => {
                      const raw = priceEdits[p.id];
                      const price =
                        raw === undefined || raw === ""
                          ? null
                          : Number(raw);
                      return act({
                        action: "price",
                        branchId: priceBranch,
                        productId: p.id,
                        price,
                      });
                    }}
                  >
                    حفظ
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
