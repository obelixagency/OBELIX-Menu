"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Category, DiscountType } from "@/lib/types";

export default function CategoriesClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [languages, setLanguages] = useState<"ar" | "en" | "both">("both");

  async function load() {
    const [cRes, bRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/brand"),
    ]);
    const cData = await cRes.json();
    const bData = await bRes.json();
    setCategories(cData.categories || []);
    setLanguages(bData.brand?.languages || "both");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const options = useMemo(() => {
    return categories.map((c) => ({
      id: c.id,
      label: indentLabel(categories, c),
    }));
  }, [categories]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: languages === "en" ? nameEn || name : name,
        nameEn: languages !== "ar" ? nameEn : undefined,
        parentId: parentId || null,
        discountType: discountType || null,
        discountValue: discountValue ? Number(discountValue) : 0,
      }),
    });
    const data = await res.json();
    if (res.status === 401) {
      router.push("/dashboard/login");
      return;
    }
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    setName("");
    setNameEn("");
    setParentId("");
    setDiscountType(null);
    setDiscountValue("");
    await load();
  }

  async function toggleActive(cat: Category) {
    const res = await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cat.active }),
    });
    if (res.status === 401) router.push("/dashboard/login");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("حذف الفئة وكل الفئات الفرعية؟")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.status === 401) router.push("/dashboard/login");
    await load();
  }

  if (loading) return <p className="text-sm text-black/50">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-8">الفئات</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          فئات متداخلة. خصم الفئة يطبّق على أصنافها ما لم يكن للصنف خصم خاص.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة فئة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            {languages !== "en" && (
              <div>
                <Label htmlFor="name">الاسم بالعربي</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            {languages !== "ar" && (
              <div>
                <Label htmlFor="nameEn">English name</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  required={languages === "en"}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="parent">تحت فئة (اختياري)</Label>
              <select
                id="parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                <option value="">— جذر —</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="dtype">خصم الفئة</Label>
              <select
                id="dtype"
                value={discountType || ""}
                onChange={(e) =>
                  setDiscountType(
                    (e.target.value || null) as DiscountType
                  )
                }
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                <option value="">بدون</option>
                <option value="percent">نسبة %</option>
                <option value="price">سعر جديد (رقم مكان رقم)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dval">قيمة الخصم</Label>
              <Input
                id="dval"
                type="number"
                min="0"
                step="0.5"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={!discountType}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                إضافة
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/8 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {indentLabel(categories, c)}
              </p>
              <p className="text-xs text-black/45">
                {c.nameEn ? `${c.nameEn} · ` : ""}
                {c.discountType && c.discountValue
                  ? `خصم: ${c.discountType === "percent" ? `${c.discountValue}%` : c.discountType === "price" ? `سعر ${c.discountValue}` : `${c.discountValue} ج.م`}`
                  : "بدون خصم فئة"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={c.active ? "secondary" : "outline"}
                onClick={() => toggleActive(c)}
              >
                {c.active ? "نشط" : "معطّل"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(c.id)}>
                حذف
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function indentLabel(all: Category[], cat: Category): string {
  let depth = 0;
  let cur: Category | undefined = cat;
  const byId = new Map(all.map((c) => [c.id, c]));
  const guard = new Set<string>();
  while (cur?.parentId && !guard.has(cur.parentId)) {
    guard.add(cur.parentId);
    depth += 1;
    cur = byId.get(cur.parentId);
  }
  const prefix = depth ? `${"— ".repeat(depth)}` : "";
  return `${prefix}${cat.name}`;
}
