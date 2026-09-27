"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { formatPrice } from "@/lib/utils";
import type { Category, DiscountType, Product } from "@/lib/types";

export default function ProductsClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<"ar" | "en" | "both">("both");
  const [currency, setCurrency] = useState("EGP");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [pRes, cRes, bRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
      fetch("/api/brand"),
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    const bData = await bRes.json();
    setProducts(pData.products || []);
    setCategories(cData.categories || []);
    setLanguages(bData.brand?.languages || "both");
    setCurrency(bData.brand?.currency || "EGP");
    if (!categoryId && cData.categories?.[0]) {
      setCategoryId(cData.categories[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "فشل الرفع");
      setImage(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: languages === "en" ? nameEn || name : name,
        nameEn: languages !== "ar" ? nameEn : undefined,
        description: languages !== "en" ? description : undefined,
        descriptionEn: languages !== "ar" ? descriptionEn : undefined,
        price: Number(price),
        categoryId,
        discountType: discountType || null,
        discountValue: discountValue ? Number(discountValue) : 0,
        available,
        featured,
        image,
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
    setDescription("");
    setDescriptionEn("");
    setPrice("");
    setDiscountType(null);
    setDiscountValue("");
    setFeatured(false);
    setAvailable(true);
    setImage(null);
    await load();
  }

  async function toggle(field: "available" | "featured", product: Product) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !product[field] }),
    });
    if (res.status === 401) router.push("/dashboard/login");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("حذف المنتج؟")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.status === 401) router.push("/dashboard/login");
    await load();
  }

  if (loading) return <p className="text-sm text-black/50">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">المنتجات</h1>
        <p className="text-xs text-black/45">
          خصم الصنف يتجاوز خصم الفئة إن وُجد الاثنان.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة منتج</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            {languages !== "en" && (
              <div>
                <Label htmlFor="name">الاسم</Label>
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
            <div>
              <Label htmlFor="price">السعر (ج.م)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            <div>
              <Label htmlFor="category">الفئة</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.nameEn ? ` / ${c.nameEn}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="dtype">خصم الصنف</Label>
              <select
                id="dtype"
                value={discountType || ""}
                onChange={(e) =>
                  setDiscountType((e.target.value || null) as DiscountType)
                }
                className="flex h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm"
              >
                <option value="">بدون (ورث فئة إن وُجد)</option>
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت ج.م</option>
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
            <div>
              <Label htmlFor="image">صورة</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
              {uploading && (
                <p className="mt-1 text-xs text-black/45">جاري الرفع…</p>
              )}
              {image && (
                <p className="mt-1 text-xs text-emerald-700" dir="ltr">
                  {image}
                </p>
              )}
            </div>
            {languages !== "en" && (
              <div className="sm:col-span-2">
                <Label htmlFor="desc">وصف</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
            {languages !== "ar" && (
              <div className="sm:col-span-2">
                <Label htmlFor="descEn">Description (EN)</Label>
                <Input
                  id="descEn"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              متاح
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              مميز
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                حفظ المنتج
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-black/8 bg-white px-3 py-2"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--brand-surface)]">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-[var(--brand-primary)]/40">
                  {p.name.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-black/45">
                {formatPrice(p.price, currency, "ar")}
                {p.discountType && p.discountValue
                  ? ` · خصم ${p.discountType === "percent" ? `${p.discountValue}%` : formatPrice(p.discountValue, currency, "ar")}`
                  : ""}
                {!p.available && " · غير متاح"}
                {p.featured && " · مميز"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggle("available", p)}
              >
                {p.available ? "إخفاء" : "إظهار"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggle("featured", p)}
              >
                {p.featured ? "إلغاء التمييز" : "تمييز"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(p.id)}>
                حذف
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
