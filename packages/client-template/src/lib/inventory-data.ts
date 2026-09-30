import { promises as fs } from "fs";
import path from "path";
import { readBrand } from "./brand";
import { hasInventory } from "./extensions/ordering";
import { listProducts } from "./menu-data";
import {
  DEFAULT_BRANCH_ID,
  getDefaultBranchId,
  isMultiBranchOn,
  listBranches,
} from "./branches-data";

export type InventoryItem = {
  productId: string;
  /** Always set — "main" when multi-branch is off */
  branchId: string;
  qty: number;
  lowAt: number;
  updatedAt: string;
};

export type InventoryStore = {
  items: InventoryItem[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const INV_FILE = path.join(DATA_DIR, "inventory.json");
const DEFAULT_QTY = 50;
const DEFAULT_LOW = 5;

function emptyStore(): InventoryStore {
  return { items: [] };
}

function normalize(raw: Partial<InventoryStore>): InventoryStore {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    items: items
      .filter((i) => i && typeof i.productId === "string")
      .map((i) => ({
        productId: i.productId,
        branchId:
          typeof (i as InventoryItem).branchId === "string" &&
          (i as InventoryItem).branchId
            ? (i as InventoryItem).branchId
            : DEFAULT_BRANCH_ID,
        qty: Math.max(0, Math.floor(Number(i.qty) || 0)),
        lowAt: Math.max(0, Math.floor(Number(i.lowAt) || DEFAULT_LOW)),
        updatedAt: i.updatedAt || new Date().toISOString(),
      })),
  };
}

function itemKey(branchId: string, productId: string) {
  return `${branchId}::${productId}`;
}

async function ensureStore(): Promise<InventoryStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(INV_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<InventoryStore>);
  } catch {
    const store = emptyStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: InventoryStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INV_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function isInventoryOn(): Promise<boolean> {
  const brand = await readBrand();
  return hasInventory(brand.extensions?.ordering);
}

async function branchIdsToSync(): Promise<string[]> {
  if (await isMultiBranchOn()) {
    const branches = await listBranches(true);
    if (branches.length) return branches.map((b) => b.id);
  }
  return [await getDefaultBranchId()];
}

/** Ensure every active product has a stock row per relevant branch. */
export async function syncInventoryWithProducts(
  branchId?: string
): Promise<InventoryItem[]> {
  const store = await ensureStore();
  const products = await listProducts();
  const targets = branchId ? [branchId] : await branchIdsToSync();
  const map = new Map(
    store.items.map((i) => [itemKey(i.branchId, i.productId), i])
  );
  const now = new Date().toISOString();
  let changed = false;

  for (const bid of targets) {
    for (const p of products) {
      const k = itemKey(bid, p.id);
      if (!map.has(k)) {
        map.set(k, {
          productId: p.id,
          branchId: bid,
          qty: DEFAULT_QTY,
          lowAt: DEFAULT_LOW,
          updatedAt: now,
        });
        changed = true;
      }
    }
  }

  // Drop orphan product rows (any branch)
  for (const [k, row] of [...map.entries()]) {
    if (!products.some((p) => p.id === row.productId)) {
      map.delete(k);
      changed = true;
    }
  }

  // When multi-branch on, drop rows for deleted branches
  if (await isMultiBranchOn()) {
    const alive = new Set((await listBranches(false)).map((b) => b.id));
    for (const [k, row] of [...map.entries()]) {
      if (!alive.has(row.branchId)) {
        map.delete(k);
        changed = true;
      }
    }
  }

  if (changed) {
    store.items = [...map.values()];
    await saveStore(store);
  }

  if (branchId) {
    return store.items.filter((i) => i.branchId === branchId);
  }
  return store.items;
}

export async function listInventory(
  branchId?: string
): Promise<InventoryItem[]> {
  if (!(await isInventoryOn())) return [];
  const bid = branchId || (await getDefaultBranchId());
  return syncInventoryWithProducts(bid);
}

export async function getStockMap(
  branchId?: string
): Promise<Record<string, number>> {
  if (!(await isInventoryOn())) return {};
  const bid = branchId || (await getDefaultBranchId());
  const items = await syncInventoryWithProducts(bid);
  const out: Record<string, number> = {};
  for (const i of items) {
    if (i.branchId === bid) out[i.productId] = i.qty;
  }
  return out;
}

export async function setStock(
  productId: string,
  patch: { qty?: number; lowAt?: number },
  branchId?: string
): Promise<InventoryItem> {
  if (!(await isInventoryOn())) {
    throw new Error("Inventory is disabled");
  }
  const bid = branchId || (await getDefaultBranchId());
  await syncInventoryWithProducts(bid);
  const store = await ensureStore();
  const idx = store.items.findIndex(
    (i) => i.productId === productId && i.branchId === bid
  );
  if (idx === -1) throw new Error("Product not in inventory");
  const cur = store.items[idx];
  store.items[idx] = {
    ...cur,
    qty:
      patch.qty !== undefined
        ? Math.max(0, Math.floor(Number(patch.qty)))
        : cur.qty,
    lowAt:
      patch.lowAt !== undefined
        ? Math.max(0, Math.floor(Number(patch.lowAt)))
        : cur.lowAt,
    updatedAt: new Date().toISOString(),
  };
  await saveStore(store);
  return store.items[idx];
}

/**
 * Atomically check + deduct. Throws if any line exceeds stock.
 * No-op when inventory flag is off.
 */
export async function deductStock(
  lines: { itemId: string; qty: number }[],
  branchId?: string
): Promise<void> {
  if (!(await isInventoryOn())) return;
  const bid = branchId || (await getDefaultBranchId());
  await syncInventoryWithProducts(bid);
  const store = await ensureStore();
  const map = new Map(
    store.items.map((i) => [itemKey(i.branchId, i.productId), i])
  );
  const needed = new Map<string, number>();
  for (const line of lines) {
    const q = Math.floor(Number(line.qty) || 0);
    if (!line.itemId || q < 1) continue;
    needed.set(line.itemId, (needed.get(line.itemId) || 0) + q);
  }
  for (const [id, need] of needed) {
    const row = map.get(itemKey(bid, id));
    const have = row?.qty ?? 0;
    if (have < need) {
      throw new Error(
        `الكمية غير كافية للصنف (مطلوب ${need} · متاح ${have})`
      );
    }
  }
  const now = new Date().toISOString();
  for (const [id, need] of needed) {
    const row = map.get(itemKey(bid, id))!;
    row.qty -= need;
    row.updatedAt = now;
  }
  store.items = [...map.values()];
  await saveStore(store);
}

/** Restore stock when an order is cancelled. */
export async function restoreStock(
  lines: { itemId: string; qty: number }[],
  branchId?: string
): Promise<void> {
  if (!(await isInventoryOn())) return;
  const bid = branchId || (await getDefaultBranchId());
  await syncInventoryWithProducts(bid);
  const store = await ensureStore();
  const map = new Map(
    store.items.map((i) => [itemKey(i.branchId, i.productId), i])
  );
  const now = new Date().toISOString();
  for (const line of lines) {
    const q = Math.floor(Number(line.qty) || 0);
    if (!line.itemId || q < 1) continue;
    const row = map.get(itemKey(bid, line.itemId));
    if (!row) continue;
    row.qty += q;
    row.updatedAt = now;
  }
  store.items = [...map.values()];
  await saveStore(store);
}

/**
 * Stock snapshot + sold qty in a period (from non-cancelled orders).
 */
export async function buildInventoryReport(opts?: {
  from?: string;
  to?: string;
  branchId?: string;
}): Promise<{
  from: string;
  to: string;
  branchId: string;
  lowCount: number;
  outCount: number;
  items: {
    productId: string;
    name: string;
    nameEn?: string;
    qty: number;
    lowAt: number;
    low: boolean;
    out: boolean;
    soldQty: number;
  }[];
}> {
  const { dayRangeIso, readOrderingStore } = await import("./ordering-data");
  const timezone = "Africa/Cairo";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let from = opts?.from;
  let to = opts?.to;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) from = dayRangeIso(from).from;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) to = dayRangeIso(to).to;
  if (!from || !to) {
    const range = dayRangeIso(today);
    from = from || range.from;
    to = to || range.to;
  }
  if (from > to) {
    const s = from;
    from = to;
    to = s;
  }

  const bid = opts?.branchId || (await getDefaultBranchId());
  const [stock, products, store] = await Promise.all([
    listInventory(bid),
    listProducts(),
    readOrderingStore(),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const sold = new Map<string, number>();
  const multi = await isMultiBranchOn();

  for (const o of store.orders) {
    if (o.status === "cancelled") continue;
    if (o.createdAt < from || o.createdAt > to) continue;
    if (multi && o.branchId && o.branchId !== bid) continue;
    for (const line of o.lines || []) {
      sold.set(line.itemId, (sold.get(line.itemId) || 0) + line.qty);
    }
  }

  const items = stock.map((s) => {
    const p = byId.get(s.productId);
    const soldQty = sold.get(s.productId) || 0;
    return {
      productId: s.productId,
      name: p?.name || s.productId,
      nameEn: p?.nameEn,
      qty: s.qty,
      lowAt: s.lowAt,
      low: s.qty <= s.lowAt,
      out: s.qty <= 0,
      soldQty,
    };
  });

  items.sort((a, b) => {
    if (a.out !== b.out) return a.out ? -1 : 1;
    if (a.low !== b.low) return a.low ? -1 : 1;
    return b.soldQty - a.soldQty;
  });

  return {
    from,
    to,
    branchId: bid,
    lowCount: items.filter((i) => i.low).length,
    outCount: items.filter((i) => i.out).length,
    items,
  };
}
