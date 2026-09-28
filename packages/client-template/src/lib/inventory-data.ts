import { promises as fs } from "fs";
import path from "path";
import { readBrand } from "./brand";
import { hasInventory } from "./extensions/ordering";
import { listProducts } from "./menu-data";

export type InventoryItem = {
  productId: string;
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
        qty: Math.max(0, Math.floor(Number(i.qty) || 0)),
        lowAt: Math.max(0, Math.floor(Number(i.lowAt) || DEFAULT_LOW)),
        updatedAt: i.updatedAt || new Date().toISOString(),
      })),
  };
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

/** Ensure every active product has a stock row (seed defaults). */
export async function syncInventoryWithProducts(): Promise<InventoryItem[]> {
  const store = await ensureStore();
  const products = await listProducts();
  const map = new Map(store.items.map((i) => [i.productId, i]));
  const now = new Date().toISOString();
  let changed = false;
  for (const p of products) {
    if (!map.has(p.id)) {
      map.set(p.id, {
        productId: p.id,
        qty: DEFAULT_QTY,
        lowAt: DEFAULT_LOW,
        updatedAt: now,
      });
      changed = true;
    }
  }
  // Drop orphan rows for deleted products
  for (const id of [...map.keys()]) {
    if (!products.some((p) => p.id === id)) {
      map.delete(id);
      changed = true;
    }
  }
  if (changed) {
    store.items = [...map.values()];
    await saveStore(store);
  }
  return store.items;
}

export async function listInventory(): Promise<InventoryItem[]> {
  if (!(await isInventoryOn())) return [];
  return syncInventoryWithProducts();
}

export async function getStockMap(): Promise<Record<string, number>> {
  if (!(await isInventoryOn())) return {};
  const items = await syncInventoryWithProducts();
  const out: Record<string, number> = {};
  for (const i of items) out[i.productId] = i.qty;
  return out;
}

export async function setStock(
  productId: string,
  patch: { qty?: number; lowAt?: number }
): Promise<InventoryItem> {
  if (!(await isInventoryOn())) {
    throw new Error("Inventory is disabled");
  }
  await syncInventoryWithProducts();
  const store = await ensureStore();
  const idx = store.items.findIndex((i) => i.productId === productId);
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
  lines: { itemId: string; qty: number }[]
): Promise<void> {
  if (!(await isInventoryOn())) return;
  await syncInventoryWithProducts();
  const store = await ensureStore();
  const map = new Map(store.items.map((i) => [i.productId, i]));
  const needed = new Map<string, number>();
  for (const line of lines) {
    const q = Math.floor(Number(line.qty) || 0);
    if (!line.itemId || q < 1) continue;
    needed.set(line.itemId, (needed.get(line.itemId) || 0) + q);
  }
  for (const [id, need] of needed) {
    const row = map.get(id);
    const have = row?.qty ?? 0;
    if (have < need) {
      throw new Error(
        `الكمية غير كافية للصنف (مطلوب ${need} · متاح ${have})`
      );
    }
  }
  const now = new Date().toISOString();
  for (const [id, need] of needed) {
    const row = map.get(id)!;
    row.qty -= need;
    row.updatedAt = now;
  }
  store.items = [...map.values()];
  await saveStore(store);
}

/** Restore stock when an order is cancelled. */
export async function restoreStock(
  lines: { itemId: string; qty: number }[]
): Promise<void> {
  if (!(await isInventoryOn())) return;
  await syncInventoryWithProducts();
  const store = await ensureStore();
  const map = new Map(store.items.map((i) => [i.productId, i]));
  const now = new Date().toISOString();
  for (const line of lines) {
    const q = Math.floor(Number(line.qty) || 0);
    if (!line.itemId || q < 1) continue;
    const row = map.get(line.itemId);
    if (!row) continue;
    row.qty += q;
    row.updatedAt = now;
  }
  store.items = [...map.values()];
  await saveStore(store);
}
