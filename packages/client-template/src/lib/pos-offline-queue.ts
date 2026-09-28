/** IndexedDB queue + catalog cache for offline POS. */

const DB_NAME = "obelix-pos-offline";
const DB_VERSION = 1;
const STORE_QUEUE = "pendingOrders";
const STORE_CATALOG = "catalogCache";

export type PendingPosOrder = {
  localId: string;
  localCode: string;
  createdAt: string;
  paymentMethod: "cash" | "card" | "other";
  tableId: string | null;
  guestNote?: string;
  branchId?: string;
  lines: { itemId: string; qty: number }[];
  /** Snapshot for receipt while offline */
  receiptLines: {
    itemId: string;
    name: string;
    nameEn: string;
    qty: number;
    unitPrice: number;
  }[];
  total: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

export type CachedCatalog = {
  branchId: string;
  savedAt: string;
  payload: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(STORE_CATALOG)) {
        db.createObjectStore(STORE_CATALOG, { keyPath: "branchId" });
      }
    };
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IDB tx failed"));
    tx.onabort = () => reject(tx.error || new Error("IDB tx aborted"));
  });
}

export function makeLocalCode(): string {
  const n = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `OFF-${n}${r}`;
}

export async function enqueuePending(
  order: Omit<PendingPosOrder, "status">
): Promise<PendingPosOrder> {
  const row: PendingPosOrder = { ...order, status: "pending" };
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  tx.objectStore(STORE_QUEUE).put(row);
  await txDone(tx);
  db.close();
  return row;
}

export async function listPending(): Promise<PendingPosOrder[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readonly");
  const req = tx.objectStore(STORE_QUEUE).getAll();
  const rows = await new Promise<PendingPosOrder[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PendingPosOrder[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updatePending(
  localId: string,
  patch: Partial<PendingPosOrder>
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  const store = tx.objectStore(STORE_QUEUE);
  const existing = await new Promise<PendingPosOrder | undefined>(
    (resolve, reject) => {
      const g = store.get(localId);
      g.onsuccess = () => resolve(g.result as PendingPosOrder | undefined);
      g.onerror = () => reject(g.error);
    }
  );
  if (existing) {
    store.put({ ...existing, ...patch, localId });
  }
  await txDone(tx);
  db.close();
}

export async function removePending(localId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  tx.objectStore(STORE_QUEUE).delete(localId);
  await txDone(tx);
  db.close();
}

export async function saveCatalogCache(
  branchId: string,
  payload: unknown
): Promise<void> {
  const row: CachedCatalog = {
    branchId: branchId || "default",
    savedAt: new Date().toISOString(),
    payload,
  };
  const db = await openDb();
  const tx = db.transaction(STORE_CATALOG, "readwrite");
  tx.objectStore(STORE_CATALOG).put(row);
  await txDone(tx);
  db.close();
}

export async function loadCatalogCache(
  branchId?: string
): Promise<CachedCatalog | null> {
  const key = branchId || "default";
  const db = await openDb();
  const tx = db.transaction(STORE_CATALOG, "readonly");
  const store = tx.objectStore(STORE_CATALOG);
  const row = await new Promise<CachedCatalog | undefined>((resolve, reject) => {
    const g = store.get(key);
    g.onsuccess = () => resolve(g.result as CachedCatalog | undefined);
    g.onerror = () => reject(g.error);
  });
  // fallback: any cached catalog
  let fallback: CachedCatalog | null = null;
  if (!row) {
    const all = await new Promise<CachedCatalog[]>((resolve, reject) => {
      const g = store.getAll();
      g.onsuccess = () => resolve((g.result as CachedCatalog[]) || []);
      g.onerror = () => reject(g.error);
    });
    fallback = all.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] || null;
  }
  await txDone(tx);
  db.close();
  return row || fallback;
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed|offline/i.test(msg);
}
