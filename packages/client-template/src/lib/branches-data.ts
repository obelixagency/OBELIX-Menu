/**
 * Multi-branch — shared catalog, per-branch stock (via inventory) & price overrides.
 * When multiBranchEnabled is off, everything uses DEFAULT_BRANCH_ID invisibly.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readBrand } from "./brand";
import { hasMultiBranch } from "./extensions/ordering";

export const DEFAULT_BRANCH_ID = "main";
export const BRANCH_COOKIE = "obelix_branch";

export type Branch = {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

export type PriceOverride = {
  productId: string;
  /** null/omit = use catalog price */
  price?: number | null;
  /** null/omit = use product.available */
  available?: boolean | null;
};

type BranchesFile = {
  branches: Branch[];
  defaultBranchId: string;
  pricing: Record<string, PriceOverride[]>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "branches.json");

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "branch"
  );
}

function defaultMain(): Branch {
  return {
    id: DEFAULT_BRANCH_ID,
    name: "الفرع الرئيسي",
    nameEn: "Main",
    slug: "main",
    active: true,
    sortOrder: 0,
  };
}

function empty(): BranchesFile {
  const main = defaultMain();
  return {
    branches: [main],
    defaultBranchId: main.id,
    pricing: {},
  };
}

function normalize(raw: Partial<BranchesFile>): BranchesFile {
  let branches = Array.isArray(raw.branches)
    ? raw.branches.filter((b) => b && b.id && b.name)
    : [];
  if (branches.length === 0) branches = [defaultMain()];
  const ids = new Set(branches.map((b) => b.id));
  let defaultBranchId = raw.defaultBranchId || branches[0].id;
  if (!ids.has(defaultBranchId)) defaultBranchId = branches[0].id;
  const pricing: Record<string, PriceOverride[]> = {};
  if (raw.pricing && typeof raw.pricing === "object") {
    for (const [bid, list] of Object.entries(raw.pricing)) {
      if (!Array.isArray(list)) continue;
      pricing[bid] = list
        .filter((p) => p && typeof p.productId === "string")
        .map((p) => ({
          productId: p.productId,
          price:
            p.price === null || p.price === undefined
              ? null
              : Math.max(0, Number(p.price) || 0),
          available:
            p.available === null || p.available === undefined
              ? null
              : Boolean(p.available),
        }));
    }
  }
  return {
    branches: branches
      .map((b, i) => ({
        id: b.id,
        name: String(b.name).slice(0, 80),
        nameEn: b.nameEn ? String(b.nameEn).slice(0, 80) : undefined,
        slug: b.slug || slugify(b.nameEn || b.name),
        active: b.active !== false,
        sortOrder: Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : i,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    defaultBranchId,
    pricing,
  };
}

async function load(): Promise<BranchesFile> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<BranchesFile>);
  } catch {
    const data = empty();
    await save(data);
    return data;
  }
}

async function save(data: BranchesFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function isMultiBranchOn(): Promise<boolean> {
  const brand = await readBrand();
  return hasMultiBranch(brand.extensions?.ordering);
}

export async function listBranches(activeOnly = false): Promise<Branch[]> {
  const data = await load();
  return activeOnly ? data.branches.filter((b) => b.active) : data.branches;
}

export async function getDefaultBranchId(): Promise<string> {
  const data = await load();
  return data.defaultBranchId || DEFAULT_BRANCH_ID;
}

export async function getBranch(idOrSlug: string): Promise<Branch | null> {
  const data = await load();
  return (
    data.branches.find((b) => b.id === idOrSlug || b.slug === idOrSlug) ||
    null
  );
}

/** Resolve active branch id: prefer hint, else default. Always returns a valid id. */
export async function resolveBranchId(
  hint?: string | null
): Promise<string> {
  const data = await load();
  if (!(await isMultiBranchOn())) {
    return data.defaultBranchId || DEFAULT_BRANCH_ID;
  }
  if (hint) {
    const found = data.branches.find(
      (b) => (b.id === hint || b.slug === hint) && b.active
    );
    if (found) return found.id;
  }
  const def = data.branches.find((b) => b.id === data.defaultBranchId && b.active);
  if (def) return def.id;
  const first = data.branches.find((b) => b.active);
  return first?.id || DEFAULT_BRANCH_ID;
}

export async function createBranch(input: {
  name: string;
  nameEn?: string;
  slug?: string;
}): Promise<Branch> {
  if (!(await isMultiBranchOn())) throw new Error("الفروع المتعددة غير مفعّلة");
  const data = await load();
  const name = String(input.name || "").trim();
  if (!name) throw new Error("اسم الفرع مطلوب");
  let slug = slugify(input.slug || input.nameEn || name);
  const base = slug;
  let n = 2;
  while (data.branches.some((b) => b.slug === slug)) {
    slug = `${base}-${n++}`;
  }
  const branch: Branch = {
    id: randomUUID(),
    name,
    nameEn: input.nameEn?.trim() || undefined,
    slug,
    active: true,
    sortOrder: data.branches.length,
  };
  data.branches.push(branch);
  data.pricing[branch.id] = [];
  await save(data);
  return branch;
}

export async function updateBranch(
  id: string,
  patch: Partial<Pick<Branch, "name" | "nameEn" | "slug" | "active" | "sortOrder">>
): Promise<Branch> {
  if (!(await isMultiBranchOn())) throw new Error("الفروع المتعددة غير مفعّلة");
  const data = await load();
  const idx = data.branches.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("الفرع غير موجود");
  const cur = data.branches[idx];
  let slug = cur.slug;
  if (patch.slug !== undefined) {
    slug = slugify(patch.slug);
    if (data.branches.some((b) => b.id !== id && b.slug === slug)) {
      throw new Error("الـ slug مستخدم");
    }
  }
  data.branches[idx] = {
    ...cur,
    name: patch.name !== undefined ? String(patch.name).trim().slice(0, 80) : cur.name,
    nameEn:
      patch.nameEn !== undefined
        ? patch.nameEn
          ? String(patch.nameEn).trim().slice(0, 80)
          : undefined
        : cur.nameEn,
    slug,
    active: patch.active !== undefined ? Boolean(patch.active) : cur.active,
    sortOrder:
      patch.sortOrder !== undefined
        ? Number(patch.sortOrder) || 0
        : cur.sortOrder,
  };
  if (!data.branches[idx].name) throw new Error("اسم الفرع مطلوب");
  // Keep at least one active default
  if (
    data.defaultBranchId === id &&
    data.branches[idx].active === false
  ) {
    const other = data.branches.find((b) => b.id !== id && b.active);
    if (other) data.defaultBranchId = other.id;
    else throw new Error("لازم يفضل فرع واحد على الأقل نشط");
  }
  await save(data);
  return data.branches[idx];
}

export async function setDefaultBranch(id: string): Promise<void> {
  if (!(await isMultiBranchOn())) throw new Error("الفروع المتعددة غير مفعّلة");
  const data = await load();
  const b = data.branches.find((x) => x.id === id && x.active);
  if (!b) throw new Error("الفرع غير موجود أو غير نشط");
  data.defaultBranchId = id;
  await save(data);
}

export async function getPriceOverrides(
  branchId: string
): Promise<PriceOverride[]> {
  const data = await load();
  return data.pricing[branchId] || [];
}

export async function setPriceOverride(
  branchId: string,
  productId: string,
  patch: { price?: number | null; available?: boolean | null }
): Promise<PriceOverride> {
  if (!(await isMultiBranchOn())) throw new Error("الفروع المتعددة غير مفعّلة");
  const data = await load();
  if (!data.branches.some((b) => b.id === branchId)) {
    throw new Error("الفرع غير موجود");
  }
  const list = data.pricing[branchId] ? [...data.pricing[branchId]] : [];
  const idx = list.findIndex((p) => p.productId === productId);
  const next: PriceOverride = {
    productId,
    price:
      patch.price === undefined
        ? idx >= 0
          ? list[idx].price ?? null
          : null
        : patch.price,
    available:
      patch.available === undefined
        ? idx >= 0
          ? list[idx].available ?? null
          : null
        : patch.available,
  };
  // Drop row if both null (no override)
  const empty =
    (next.price === null || next.price === undefined) &&
    (next.available === null || next.available === undefined);
  if (empty) {
    if (idx >= 0) list.splice(idx, 1);
  } else if (idx >= 0) {
    list[idx] = next;
  } else {
    list.push(next);
  }
  data.pricing[branchId] = list;
  await save(data);
  return next;
}

/** Apply branch price/availability overrides onto a product snapshot. */
export async function applyBranchToProduct<
  T extends { id: string; price: number; available: boolean }
>(branchId: string, product: T): Promise<T> {
  if (!(await isMultiBranchOn())) return product;
  const overrides = await getPriceOverrides(branchId);
  const o = overrides.find((x) => x.productId === product.id);
  if (!o) return product;
  return {
    ...product,
    price:
      o.price !== null && o.price !== undefined ? Number(o.price) : product.price,
    available:
      o.available !== null && o.available !== undefined
        ? Boolean(o.available)
        : product.available,
  };
}
