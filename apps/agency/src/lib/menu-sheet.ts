// Browser-side helpers for the OBELIX menu import sheet (Excel / CSV).
// Same file lives in apps/agency/src/lib/menu-sheet.ts — keep them in sync.
import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";

export type SheetRow = {
  parent?: string;
  category?: string;
  categoryEn?: string;
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price?: string | number;
  available?: string | boolean;
  image?: string;
};

type Field = keyof SheetRow;

/** Template columns, in order. `aliases` are accepted header spellings (any case). */
export const SHEET_COLUMNS: { field: Field; title: string; width: number; aliases: string[] }[] = [
  { field: "parent", title: "القسم الرئيسي (Main category)", width: 24, aliases: ["القسم الرئيسي", "main category", "parent", "parent category"] },
  { field: "category", title: "القسم (Category)", width: 22, aliases: ["القسم", "الفئة", "category", "section"] },
  { field: "categoryEn", title: "القسم بالإنجليزي (Category EN)", width: 24, aliases: ["القسم بالإنجليزي", "القسم بالانجليزي", "category en", "category english"] },
  { field: "name", title: "اسم الصنف (Name AR)", width: 26, aliases: ["اسم الصنف", "الاسم", "اسم الصنف بالعربي", "name ar", "name", "item", "product"] },
  { field: "nameEn", title: "الاسم بالإنجليزي (Name EN)", width: 26, aliases: ["الاسم بالإنجليزي", "الاسم بالانجليزي", "اسم الصنف بالإنجليزي", "name en", "english name"] },
  { field: "description", title: "الوصف (Description AR)", width: 34, aliases: ["الوصف", "الوصف بالعربي", "description ar", "description"] },
  { field: "descriptionEn", title: "الوصف بالإنجليزي (Description EN)", width: 34, aliases: ["الوصف بالإنجليزي", "الوصف بالانجليزي", "description en"] },
  { field: "price", title: "السعر (Price)", width: 12, aliases: ["السعر", "price", "سعر"] },
  { field: "available", title: "متاح (Available)", width: 14, aliases: ["متاح", "available", "متوفر"] },
  { field: "image", title: "اسم ملف الصورة (Image file)", width: 26, aliases: ["اسم ملف الصورة", "الصورة", "صورة", "image", "image file", "photo"] },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s_\-.:]+/g, " ")
    .trim();

/** Map a header cell to a field: matches the whole header, or the part before/inside "( )". */
export function headerToField(header: string): Field | null {
  const h = String(header ?? "");
  const parts = [h, h.split("(")[0], (h.match(/\(([^)]*)\)/) || [])[1] || ""].map(norm).filter(Boolean);
  for (const col of SHEET_COLUMNS) {
    const aliases = [col.title, ...col.aliases].map(norm);
    if (parts.some((p) => aliases.includes(p))) return col.field;
  }
  return null;
}

/** Turn a 2-D grid (first row = headers) into rows. Throws a readable Arabic error. */
export function gridToRows(grid: unknown[][]): SheetRow[] {
  const headerIdx = grid.findIndex((r) => r.some((c) => headerToField(String(c ?? ""))));
  if (headerIdx === -1) throw new Error("ملقيناش أسماء الأعمدة. استخدم ملف القالب.");
  const map = grid[headerIdx].map((c) => headerToField(String(c ?? "")));
  if (!map.includes("name") || !map.includes("price")) {
    throw new Error("لازم يكون فيه عمود «اسم الصنف» وعمود «السعر» على الأقل.");
  }
  const rows: SheetRow[] = [];
  for (const r of grid.slice(headerIdx + 1)) {
    const row: SheetRow = {};
    map.forEach((f, i) => {
      if (!f) return;
      const v = r[i];
      if (v === null || v === undefined || v === "") return;
      (row as Record<string, unknown>)[f] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
    });
    if (row.name || row.nameEn || row.price !== undefined) rows.push(row);
  }
  return rows;
}

/** Minimal RFC-4180 CSV parser (handles quotes, commas/semicolons, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const firstLine = t.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

export async function readSheetFile(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  if (file.size > 5 * 1024 * 1024) throw new Error("الملف أكبر من 5MB");
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return gridToRows(parseCsv(await file.text()));
  }
  if (name.endsWith(".xlsx")) {
    const grid = (await readSheet(file)) as unknown[][];
    return gridToRows(grid);
  }
  if (name.endsWith(".xls")) throw new Error("صيغة .xls القديمة مش مدعومة — احفظ الملف كـ .xlsx");
  throw new Error("ارفع ملف Excel (.xlsx) أو CSV");
}

const HEADER_STYLE = { fontWeight: "bold" as const, backgroundColor: "#F5C400", textColor: "#0A0A0A" };

/** Download an .xlsx in the import format. With no rows → a template with 3 example rows. */
export async function downloadSheet(fileName: string, rows?: SheetRow[]) {
  const data: SheetRow[] = rows && rows.length
    ? rows
    : [
        { parent: "مشروبات", category: "مشروبات ساخنة", categoryEn: "Hot Drinks", name: "إسبريسو", nameEn: "Espresso", description: "شوت مزدوج", descriptionEn: "Double shot", price: 45, available: "نعم", image: "espresso.jpg" },
        { parent: "مشروبات", category: "مشروبات باردة", categoryEn: "Cold Drinks", name: "آيس لاتيه", nameEn: "Iced Latte", description: "", descriptionEn: "", price: 70, available: "نعم", image: "" },
        { parent: "", category: "حلويات", categoryEn: "Desserts", name: "تشيز كيك", nameEn: "Cheesecake", description: "بصوص الفراولة", descriptionEn: "Strawberry sauce", price: 85, available: "لا", image: "" },
      ];
  const header = SHEET_COLUMNS.map((c) => ({ value: c.title, ...HEADER_STYLE }));
  const body = data.map((r) =>
    SHEET_COLUMNS.map((c) => {
      const v = r[c.field];
      if (c.field === "price") {
        const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, ""));
        return Number.isFinite(n) && String(v ?? "") !== "" ? { value: n, type: Number } : null;
      }
      if (c.field === "available" && typeof v === "boolean") return { value: v ? "نعم" : "لا" };
      return v === undefined || v === null || v === "" ? null : { value: String(v) };
    })
  );
  await writeXlsxFile([header, ...body] as never, {
    sheet: "Menu",
    rightToLeft: true,
    columns: SHEET_COLUMNS.map((c) => ({ width: c.width })),
    stickyRowsCount: 1,
  } as never).toFile(fileName);
}

/** Lowercased file name and name without extension — used to match bulk images. */
export function imageKeys(fileName: string): string[] {
  const n = fileName.toLowerCase().trim();
  return [n, n.replace(/\.[a-z0-9]+$/, "")];
}
