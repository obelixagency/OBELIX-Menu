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
import type { Category, DiscountType, Product, ProductOptionGroup } from "@/lib/types";
import { ProductOptionsEditor } from "@/components/dashboard/product-options-editor";
import { isoToLocalInput, localInputToIso } from "@/lib/commerce";

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
  const [filter, setFilter] = useState<"all" | "available" | "hidden" | "featured">("all");
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkType, setBulkType] = useState<DiscountType>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prepEnabled, setPrepEnabled] = useState(false);
  const [comboItems, setComboItems] = useState<{ productId: string; qty: number }[]>(
    []
  );
  const [offerFrom, setOfferFrom] = useState("");
  const [offerUntil, setOfferUntil] = useState("");

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

  function resetForm() {
    setEditingId(null);
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
    setOptionGroups([]);
    setPrepEnabled(false);
    setComboItems([]);
    setOfferFrom("");
    setOfferUntil("");
  }

  function fillForm(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setNameEn(p.nameEn || "");
    setDescription(p.description || "");
    setDescriptionEn(p.descriptionEn || "");
    setPrice(String(p.price));
    setCategoryId(p.categoryId);
    setDiscountType(p.discountType || null);
    setDiscountValue(p.discountValue ? String(p.discountValue) : "");
    setAvailable(p.available);
    setFeatured(p.featured);
    setImage(p.image);
    setOptionGroups(p.optionGroups || []);
    setPrepEnabled(Boolean(p.prepEnabled));
    setComboItems(p.comboItems || []);
    setOfferFrom(isoToLocalInput(p.offerFrom));
    setOfferUntil(isoToLocalInput(p.offerUntil));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
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
      optionGroups,
      prepEnabled,
      comboItems: comboItems.filter((c) => c.productId && c.qty > 0),
      offerFrom: localInputToIso(offerFrom),
      offerUntil: localInputToIso(offerUntil),
    };
    const res = await fetch(
      editingId ? `/api/products/${editingId}` : "/api/products",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (res.status === 401) {
      router.push("/dashboard/login");
      return;
    }
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    resetForm();
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

  if (loading) return <p className="text-sm text-[var(--brand-muted)]">جاري التحميل…</p>;

  const filtered = products.filter((p) => {
    if (filter === "available") return p.available;
    if (filter === "hidden") return !p.available;
    if (filter === "featured") return p.featured;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-8">المنتجات</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          خصم الصنف يتجاوز خصم الفئة إن وُجد الاثنان.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "الكل"],
            ["available", "متاح"],
            ["hidden", "مخفي"],
            ["featured", "مميز"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`min-h-10 rounded-full px-3.5 text-xs font-semibold ${
              filter === key
                ? "bg-[var(--brand-primary)] text-white"
                : "border border-[var(--brand-line)] bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "تعديل المنتج" : "إضافة منتج"}
          </CardTitle>
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
                <option value="price">سعر جديد (رقم مكان رقم)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dval">
                {discountType === "price" ? "السعر بعد الخصم" : "قيمة الخصم"}
              </Label>
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
            <ProductOptionsEditor
              groups={optionGroups}
              onChange={setOptionGroups}
            />
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={prepEnabled}
                onChange={(e) => setPrepEnabled(e.target.checked)}
              />
              شيبس تحضير (حار / من غير بصل / استواء)
            </label>
            <div className="sm:col-span-2 space-y-2 rounded-xl border border-[var(--brand-line)] p-3">
              <p className="text-sm font-semibold">كومبو / وجبة (خصم مخزون المكوّنات)</p>
              <p className="text-xs text-[var(--brand-muted)]">
                اتركه فارغًا لصنف عادي. للكومبو اختر الأصناف والكميات اللي تتنقص من المخزون.
              </p>
              {comboItems.map((row, i) => (
                <div key={`${row.productId}-${i}`} className="flex flex-wrap gap-2">
                  <select
                    className="h-11 min-w-[12rem] flex-1 rounded-md border border-black/15 bg-white px-3 text-sm"
                    value={row.productId}
                    onChange={(e) =>
                      setComboItems((rows) =>
                        rows.map((r, j) =>
                          j === i ? { ...r, productId: e.target.value } : r
                        )
                      )
                    }
                  >
                    <option value="">اختر صنف</option>
                    {products
                      .filter((p) => p.id !== editingId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    className="h-11 w-24"
                    value={row.qty}
                    onChange={(e) =>
                      setComboItems((rows) =>
                        rows.map((r, j) =>
                          j === i
                            ? { ...r, qty: Math.max(1, Number(e.target.value) || 1) }
                            : r
                        )
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setComboItems((rows) => rows.filter((_, j) => j !== i))
                    }
                  >
                    حذف
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setComboItems((rows) => [...rows, { productId: "", qty: 1 }])
                }
              >
                إضافة مكوّن
              </Button>
            </div>
            <div>
              <Label htmlFor="ofrom">ظاهر من (اختياري)</Label>
              <Input
                id="ofrom"
                type="datetime-local"
                value={offerFrom}
                onChange={(e) => setOfferFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ountil">ظاهر حتى (اختياري)</Label>
              <Input
                id="ountil"
                type="datetime-local"
                value={offerUntil}
                onChange={(e) => setOfferUntil(e.target.value)}
              />
            </div>
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
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" className="w-full sm:w-auto">
                {editingId ? "حفظ التعديل" : "حفظ المنتج"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              )}
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">خصم على عدة منتجات</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <Label>النوع</Label>
            <select
              value={bulkType || ""}
              onChange={(e) =>
                setBulkType((e.target.value || null) as DiscountType)
              }
              className="flex h-11 rounded-xl border border-[var(--brand-line)] bg-white px-3 text-sm"
            >
              <option value="">إزالة الخصم</option>
              <option value="percent">نسبة %</option>
              <option value="price">سعر جديد</option>
            </select>
          </div>
          <div>
            <Label>القيمة</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              disabled={!bulkType}
              dir="ltr"
              className="text-left"
            />
          </div>
          <Button
            type="button"
            onClick={async () => {
              const productIds = Object.entries(selected)
                .filter(([, v]) => v)
                .map(([id]) => id);
              if (!productIds.length) {
                setError("اختر منتجات أولاً");
                return;
              }
              const res = await fetch("/api/products/discounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productIds,
                  discountType: bulkType,
                  discountValue: Number(bulkValue) || 0,
                }),
              });
              if (res.status === 401) router.push("/dashboard/login");
              setSelected({});
              await load();
            }}
          >
            تطبيق على المحدد
          </Button>
        </CardContent>
      </Card>

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(26,20,16,.06)]"
          >
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={!!selected[p.id]}
              onChange={(e) =>
                setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
              }
            />
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
                  ? ` · خصم ${p.discountType === "percent" ? `${p.discountValue}%` : p.discountType === "price" ? `سعر ${formatPrice(p.discountValue, currency, "ar")}` : formatPrice(p.discountValue, currency, "ar")}`
                  : ""}
                {(p.optionGroups || []).length
                  ? ` · ${(p.optionGroups || []).length} خيارات`
                  : ""}
                {(p.comboItems || []).length ? " · كومبو" : ""}
                {p.prepEnabled ? " · تحضير" : ""}
                {!p.available && " · غير متاح"}
                {p.featured && " · مميز"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fillForm(p)}>
                تعديل
              </Button>
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
