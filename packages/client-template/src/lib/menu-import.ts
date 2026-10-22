import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Category, MenuData, Product } from "./types";
import { readMenu } from "./menu-data";

/** One row of the import sheet, already mapped to known fields (strings). */
export type ImportRow = {
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

export type ImportResult = {
  categoriesCreated: number;
  productsCreated: number;
  productsUpdated: number;
  skipped: { row: number; reason: string }[];
  /** row image-file name → product id, so the UI can attach bulk images */
  imageMap: Record<string, string>;
};

export const MAX_IMPORT_ROWS = 2000;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** "١٢٠ ج.م" / "120.00 EGP" / "1,250" → number, or NaN */
export function parsePrice(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").trim();
  if (!s) return NaN;
  s = s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  s = s.replace(/٫/g, ".").replace(/[,٬\s]/g, "");
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

function parseAvailable(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return true;
  return !["no", "false", "0", "لا", "غير متاح", "مش متاح", "x"].includes(s);
}

const clean = (v: unknown, max = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const key = (v: string) => v.trim().toLowerCase();

function findCategory(menu: MenuData, name: string, parentId: string | null): Category | undefined {
  const k = key(name);
  return menu.categories.find(
    (c) => (c.parentId ?? null) === parentId && (key(c.name) === k || key(c.nameEn || "") === k)
  );
}

export async function importMenuRows(
  rows: ImportRow[],
  opts: { replace?: boolean } = {}
): Promise<ImportResult> {
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`الحد الأقصى ${MAX_IMPORT_ROWS} صنف في الملف`);
  const menu = await readMenu();
  if (opts.replace) {
    menu.categories = [];
    menu.products = [];
  }
  const result: ImportResult = { categoriesCreated: 0, productsCreated: 0, productsUpdated: 0, skipped: [], imageMap: {} };

  const ensureCat = (name: string, nameEn: string, parentId: string | null): Category => {
    const existing = findCategory(menu, name, parentId) || (nameEn ? findCategory(menu, nameEn, parentId) : undefined);
    if (existing) {
      if (nameEn && !existing.nameEn) existing.nameEn = nameEn;
      return existing;
    }
    const cat: Category = {
      id: randomUUID(),
      name,
      nameEn: nameEn || undefined,
      parentId,
      sortOrder: menu.categories.filter((c) => (c.parentId ?? null) === parentId).length + 1,
      active: true,
      discountType: null,
      discountValue: 0,
    };
    menu.categories.push(cat);
    result.categoriesCreated++;
    return cat;
  };

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1 in the sheet
    const name = clean(r.name, 120);
    const nameEn = clean(r.nameEn, 120);
    const catName = clean(r.category, 80);
    const catEn = clean(r.categoryEn, 80);
    const parentName = clean(r.parent, 80);
    const price = parsePrice(r.price);
    if (!name && !nameEn) return; // fully empty row
    if (!name && nameEn) {
      result.skipped.push({ row: rowNo, reason: "اسم الصنف بالعربي فاضي" });
      return;
    }
    if (!catName && !catEn) {
      result.skipped.push({ row: rowNo, reason: "القسم فاضي" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      result.skipped.push({ row: rowNo, reason: "السعر مش رقم صحيح" });
      return;
    }
    const parent = parentName ? ensureCat(parentName, "", null) : null;
    const cat = ensureCat(catName || catEn, catName ? catEn : "", parent ? parent.id : null);

    const existing = menu.products.find(
      (p) => p.categoryId === cat.id && key(p.name) === key(name)
    );
    const fields: Partial<Product> = {
      name,
      nameEn: nameEn || existing?.nameEn,
      description: clean(r.description, 600) || existing?.description,
      descriptionEn: clean(r.descriptionEn, 600) || existing?.descriptionEn,
      price: Math.round(price * 100) / 100,
      available: parseAvailable(r.available),
    };
    let id: string;
    if (existing) {
      Object.assign(existing, fields);
      id = existing.id;
      result.productsUpdated++;
    } else {
      const product: Product = {
        id: randomUUID(),
        categoryId: cat.id,
        name,
        nameEn: fields.nameEn,
        description: fields.description,
        descriptionEn: fields.descriptionEn,
        price: fields.price!,
        discountType: null,
        discountValue: 0,
        image: null,
        available: fields.available ?? true,
        featured: false,
        sortOrder: menu.products.filter((p) => p.categoryId === cat.id).length + 1,
        optionGroups: [],
        comboItems: [],
        prepEnabled: false,
        offerFrom: null,
        offerUntil: null,
      };
      menu.products.push(product);
      id = product.id;
      result.productsCreated++;
    }
    const img = clean(r.image, 200);
    if (img) result.imageMap[img.toLowerCase()] = id;
  });

  const file = path.join(process.cwd(), "data", "menu.json");
  // Keep a one-step undo copy before overwriting the live menu.
  await fs.copyFile(file, path.join(process.cwd(), "data", "menu.before-import.json")).catch(() => {});
  await fs.writeFile(file, JSON.stringify(menu, null, 2), "utf8");
  return result;
}
