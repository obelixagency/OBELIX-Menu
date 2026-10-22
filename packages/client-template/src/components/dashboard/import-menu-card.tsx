"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category, Product } from "@/lib/types";
import { downloadSheet, imageKeys, readSheetFile, type SheetRow } from "@/lib/menu-sheet";

type ImportResult = {
  categoriesCreated: number;
  productsCreated: number;
  productsUpdated: number;
  skipped: { row: number; reason: string }[];
  imageMap: Record<string, string>;
};

const norm = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[\s_\-]+/g, " ").trim();

/** Bulk menu import (Excel/CSV) + bulk product photos, for the products page. */
export function ImportMenuCard({ onChanged }: { onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [imgReport, setImgReport] = useState<{ done: number; unmatched: string[]; failed: string[] } | null>(null);
  const [imgProgress, setImgProgress] = useState("");

  async function pickFile(f: File | undefined) {
    setMsg(null);
    setResult(null);
    setRows(null);
    if (!f) return;
    try {
      const parsed = await readSheetFile(f);
      if (!parsed.length) throw new Error("الملف مفيهوش أصناف");
      setRows(parsed);
      setFileName(f.name);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "مش قادرين نقرأ الملف" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runImport() {
    if (!rows) return;
    if (replace && !window.confirm("هيتمسح المنيو الحالي كله (الأقسام والأصناف) ويتحط مكانه الملف. متأكد؟")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, replace }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الاستيراد");
      setResult(data as ImportResult);
      setRows(null);
      setMsg({ ok: true, text: "تم الاستيراد ✓ — المنيو اتحدّث" });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "فشل الاستيراد" });
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!window.confirm("نرجّع المنيو زي ما كان قبل آخر استيراد؟")) return;
    setBusy(true);
    const res = await fetch("/api/products/import", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setResult(null);
    setMsg(res.ok ? { ok: true, text: "رجعنا المنيو لآخر نسخة قبل الاستيراد" } : { ok: false, text: data.error || "فشل التراجع" });
    if (res.ok) onChanged();
  }

  async function exportCurrent() {
    const [p, c] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    const cats: Category[] = c.categories || [];
    const byId = new Map(cats.map((x) => [x.id, x]));
    const out: SheetRow[] = (p.products as Product[]).map((x) => {
      const cat = byId.get(x.categoryId);
      const parent = cat?.parentId ? byId.get(cat.parentId) : undefined;
      return {
        parent: parent?.name || "",
        category: cat?.name || "",
        categoryEn: cat?.nameEn || "",
        name: x.name,
        nameEn: x.nameEn || "",
        description: x.description || "",
        descriptionEn: x.descriptionEn || "",
        price: x.price,
        available: x.available,
        image: "",
      };
    });
    await downloadSheet("menu-export.xlsx", out);
  }

  async function uploadImages(files: FileList | null) {
    if (!files || !files.length) return;
    setImgReport(null);
    const list = Array.from(files);
    const products: Product[] = (await fetch("/api/products").then((r) => r.json())).products || [];
    const byName = new Map<string, string>();
    for (const p of products) {
      byName.set(norm(p.name), p.id);
      if (p.nameEn) byName.set(norm(p.nameEn), p.id);
    }
    const fromSheet = result?.imageMap || {};
    const unmatched: string[] = [];
    const failed: string[] = [];
    let done = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setImgProgress(`${i + 1} / ${list.length}`);
      const [full, base] = imageKeys(f.name);
      const id = fromSheet[full] || fromSheet[base] || byName.get(norm(f.name));
      if (!id) {
        unmatched.push(f.name);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("file", f);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "upload");
        const patch = await fetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: upData.url }),
        });
        if (!patch.ok) throw new Error("save");
        done++;
      } catch (e) {
        failed.push(`${f.name} — ${e instanceof Error ? e.message : ""}`);
      }
    }
    setImgProgress("");
    setImgReport({ done, unmatched, failed });
    if (imgRef.current) imgRef.current.value = "";
    if (done) onChanged();
  }

  const preview = rows?.slice(0, 8) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">استيراد المنيو من Excel</CardTitle>
        <CardDescription>
          نزّل القالب، املاه بالأقسام والأصناف والأسعار، وارفعه — المنيو كله بيتسمّع مرة واحدة. لو الصنف موجود بنفس الاسم في نفس القسم، بيتحدّث سعره ووصفه بدل ما يتكرر.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => downloadSheet("obelix-menu-template.xlsx")}>
            تحميل القالب
          </Button>
          <Button type="button" variant="outline" onClick={exportCurrent}>
            تحميل المنيو الحالي Excel
          </Button>
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
            رفع ملف Excel / CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            data-testid="import-file"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {rows && (
          <div className="space-y-3 rounded-xl border border-[var(--brand-line)] p-3">
            <p className="text-sm font-semibold">
              {fileName}: {rows.length} صنف جاهز للاستيراد
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="text-[var(--brand-muted)]">
                    <th className="p-1 text-start">القسم</th>
                    <th className="p-1 text-start">الصنف</th>
                    <th className="p-1 text-start">English</th>
                    <th className="p-1 text-start">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--brand-line)]">
                      <td className="p-1">{[r.parent, r.category].filter(Boolean).join(" ← ")}</td>
                      <td className="p-1">{r.name}</td>
                      <td className="p-1">{r.nameEn}</td>
                      <td className="p-1">{String(r.price ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > preview.length && (
                <p className="mt-1 text-xs text-[var(--brand-muted)]">و{rows.length - preview.length} صنف كمان…</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              امسح المنيو الحالي واستبدله بالملف ده
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={runImport} disabled={busy}>
                {busy ? "جاري الاستيراد…" : "استورد"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setRows(null)} disabled={busy}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

        {result && (
          <div className="space-y-1 rounded-xl bg-[var(--brand-surface)] p-3 text-sm">
            <p>
              أقسام جديدة: {result.categoriesCreated} · أصناف جديدة: {result.productsCreated} · أصناف اتحدّثت: {result.productsUpdated}
            </p>
            {result.skipped.length > 0 && (
              <div className="text-red-600">
                <p>صفوف ما اتسمّعتش ({result.skipped.length}):</p>
                <ul className="list-inside list-disc">
                  {result.skipped.slice(0, 10).map((s) => (
                    <li key={s.row}>صف {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" className="text-xs underline" onClick={undo} disabled={busy}>
              تراجع عن الاستيراد ده
            </button>
          </div>
        )}

        <div className="space-y-2 border-t border-[var(--brand-line)] pt-4">
          <p className="text-sm font-semibold">صور الأصناف دفعة واحدة</p>
          <p className="text-xs text-[var(--brand-muted)]">
            سمّي كل صورة باسم الصنف (عربي أو إنجليزي) أو بنفس الاسم اللي في عمود «اسم ملف الصورة»، واختارهم كلهم مرة واحدة. PNG أو JPG أو WebP، أقل من 5MB للصورة.
          </p>
          <Button type="button" variant="outline" onClick={() => imgRef.current?.click()} disabled={!!imgProgress}>
            {imgProgress ? `جاري الرفع ${imgProgress}` : "اختار الصور"}
          </Button>
          <input
            ref={imgRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            data-testid="import-images"
            onChange={(e) => uploadImages(e.target.files)}
          />
          {imgReport && (
            <div className="text-sm">
              <p className="text-green-700">اتحطت {imgReport.done} صورة على أصنافها</p>
              {imgReport.unmatched.length > 0 && (
                <p className="text-amber-700">ملقيناش صنف بالاسم ده: {imgReport.unmatched.slice(0, 8).join("، ")}</p>
              )}
              {imgReport.failed.length > 0 && (
                <p className="text-red-600">فشلت: {imgReport.failed.slice(0, 5).join("، ")}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
