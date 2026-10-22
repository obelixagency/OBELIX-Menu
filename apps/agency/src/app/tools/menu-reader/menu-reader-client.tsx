"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadSheet, type SheetRow } from "@/lib/menu-sheet";

type Row = {
  parent: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: string;
};

const COLS: { key: keyof Row; label: string; w: string; dir?: "ltr" }[] = [
  { key: "parent", label: "القسم الرئيسي", w: "w-28" },
  { key: "category", label: "القسم", w: "w-28" },
  { key: "categoryEn", label: "Category", w: "w-28", dir: "ltr" },
  { key: "name", label: "الصنف", w: "w-36" },
  { key: "nameEn", label: "Name", w: "w-36", dir: "ltr" },
  { key: "description", label: "الوصف", w: "w-40" },
  { key: "price", label: "السعر", w: "w-20", dir: "ltr" },
];

export default function MenuReaderClient({ geminiReady }: { geminiReady: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [translate, setTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [model, setModel] = useState("");
  const [clientName, setClientName] = useState("");

  async function read() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (translate) fd.append("translate", "1");
      const res = await fetch("/api/menu-reader", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشلت القراءة");
      const out: Row[] = (data.rows || []).map((r: SheetRow & { price: number | null }) => ({
        parent: r.parent || "",
        category: r.category || "",
        categoryEn: r.categoryEn || "",
        name: r.name || "",
        nameEn: r.nameEn || "",
        description: r.description || "",
        descriptionEn: r.descriptionEn || "",
        price: r.price === null || r.price === undefined ? "" : String(r.price),
      }));
      if (!out.length) throw new Error("ملقيناش أصناف — جرّب صور أوضح أو كل صفحة في صورة لوحدها");
      setRows(out);
      setModel(data.model || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت القراءة");
    } finally {
      setBusy(false);
    }
  }

  function update(i: number, key: keyof Row, v: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  }

  const missingPrice = rows.filter((r) => r.price.trim() === "").length;

  async function download() {
    const slug = (clientName || "client").trim().replace(/[^\w؀-ۿ-]+/g, "-");
    await downloadSheet(`menu-${slug}.xlsx`, rows.map((r) => ({ ...r, available: "نعم", image: "" })));
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>قراءة منيو بالذكاء الاصطناعي</CardTitle>
          <CardDescription>
            ارفع صور المنيو الورق أو ملف PDF، والسيستم يطلّع الأقسام والأصناف والأسعار في جدول. راجعه وعدّل اللي محتاج، ونزّله Excel وارفعه في داشبورد العميل من «المنتجات ← استيراد المنيو من Excel».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!geminiReady && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
              مفتاح Gemini مش متحط على السيرفر لسه. ضيف <code dir="ltr">GEMINI_API_KEY</code> في ملف <code dir="ltr">.env</code> بتاع الوكالة واعمل ريستارت.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
              اختار صور / PDF
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              className="hidden"
              data-testid="reader-files"
              onChange={(e) => {
                setFiles(Array.from(e.target.files || []).slice(0, 10));
                setRows([]);
                setError(null);
              }}
            />
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={translate} onChange={(e) => setTranslate(e.target.checked)} />
              ترجم الأسماء الناقصة (عربي ↔ إنجليزي)
            </label>
            <Button type="button" onClick={read} disabled={busy || !files.length || !geminiReady}>
              {busy ? "بيقرأ المنيو… (ممكن ياخد دقيقة)" : "اقرأ المنيو"}
            </Button>
          </div>
          {files.length > 0 && (
            <p className="text-xs text-white/50">
              {files.length} ملف: {files.map((f) => f.name).join("، ")} — الحد 10 ملفات و18MB في المرة.
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {rows.length} صنف {model && <span className="text-xs font-normal text-white/40">({model})</span>}
            </CardTitle>
            <CardDescription>
              الذكاء الاصطناعي ممكن يغلط في سعر أو اسم — راجع الجدول مع المنيو الأصلي قبل ما تنزّله.
              {missingPrice > 0 && <span className="text-amber-300"> فيه {missingPrice} صنف من غير سعر (متعلّمين بالأصفر) — مش هيتسمّعوا لحد ما تحطلهم سعر.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="sticky top-0 bg-[#111]">
                  <tr>
                    {COLS.map((c) => (
                      <th key={c.key} className="p-2 text-start font-semibold text-white/60">{c.label}</th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-white/5 ${r.price.trim() === "" ? "bg-amber-400/10" : ""}`}>
                      {COLS.map((c) => (
                        <td key={c.key} className={`p-1 ${c.w}`}>
                          <input
                            value={r[c.key]}
                            dir={c.dir}
                            onChange={(e) => update(i, c.key, e.target.value)}
                            className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-white focus:border-[var(--obx-yellow)] focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          aria-label="احذف الصف"
                          className="text-white/40 hover:text-red-400"
                          onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="اسم العميل (لاسم الملف)"
                className="h-10 rounded-xl border border-white/15 bg-transparent px-3 text-sm text-white"
              />
              <Button type="button" onClick={download}>تحميل Excel للاستيراد</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRows((rs) => [...rs, { parent: "", category: "", categoryEn: "", name: "", nameEn: "", description: "", descriptionEn: "", price: "" }])}
              >
                + صف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
