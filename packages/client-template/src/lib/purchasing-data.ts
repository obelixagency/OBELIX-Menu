import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readBrand } from "./brand";
import { hasPurchasing } from "./extensions/ordering";
import { increaseStock } from "./inventory-data";
import { getDefaultBranchId, isMultiBranchOn } from "./branches-data";
import { listProducts } from "./menu-data";
import { buildSalesReport, dayRangeIso } from "./ordering-data";

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  openingBalance: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseLine = {
  id: string;
  productId: string | null;
  description: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
};

export type PurchaseStatus = "draft" | "ordered" | "received" | "cancelled";

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: PurchaseStatus;
  branchId: string;
  notes: string;
  lines: PurchaseLine[];
  total: number;
  createdAt: string;
  updatedAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
};

export type SupplierPayment = {
  id: string;
  supplierId: string;
  amount: number;
  method: "cash" | "transfer" | "other";
  note: string;
  paidAt: string;
  createdAt: string;
};

export type PurchasingStore = {
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  payments: SupplierPayment[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "purchasing.json");

function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function emptyStore(): PurchasingStore {
  return { suppliers: [], purchases: [], payments: [] };
}

function normalizeLine(raw: Partial<PurchaseLine>): PurchaseLine | null {
  const qty = Math.max(0, Number(raw.qty) || 0);
  const unitCost = Math.max(0, Number(raw.unitCost) || 0);
  const description = String(raw.description || "").trim();
  const productId =
    typeof raw.productId === "string" && raw.productId.trim()
      ? raw.productId.trim()
      : null;
  if (!description && !productId) return null;
  if (qty <= 0) return null;
  return {
    id: raw.id || randomUUID(),
    productId,
    description: description || productId || "Item",
    qty,
    unitCost: money(unitCost),
    lineTotal: money(qty * unitCost),
  };
}

function normalize(raw: Partial<PurchasingStore>): PurchasingStore {
  const suppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];
  const purchases = Array.isArray(raw.purchases) ? raw.purchases : [];
  const payments = Array.isArray(raw.payments) ? raw.payments : [];
  return {
    suppliers: suppliers
      .filter((s) => s && typeof s.id === "string" && s.name)
      .map((s) => ({
        id: s.id,
        name: String(s.name).trim(),
        phone: String(s.phone || "").trim(),
        notes: String(s.notes || "").trim(),
        openingBalance: money(s.openingBalance),
        active: s.active !== false,
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || s.createdAt || new Date().toISOString(),
      })),
    purchases: purchases
      .filter((p) => p && typeof p.id === "string" && p.supplierId)
      .map((p) => {
        const lines = (Array.isArray(p.lines) ? p.lines : [])
          .map((l) => normalizeLine(l))
          .filter((l): l is PurchaseLine => l !== null);
        const total = money(lines.reduce((s, l) => s + l.lineTotal, 0));
        const status: PurchaseStatus = [
          "draft",
          "ordered",
          "received",
          "cancelled",
        ].includes(p.status as PurchaseStatus)
          ? (p.status as PurchaseStatus)
          : "draft";
        return {
          id: p.id,
          supplierId: p.supplierId,
          status,
          branchId: String(p.branchId || "main"),
          notes: String(p.notes || "").trim(),
          lines,
          total,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
          orderedAt: p.orderedAt || null,
          receivedAt: p.receivedAt || null,
        };
      }),
    payments: payments
      .filter((p) => p && typeof p.id === "string" && p.supplierId)
      .map((p) => ({
        id: p.id,
        supplierId: p.supplierId,
        amount: money(p.amount),
        method:
          p.method === "transfer" || p.method === "other" ? p.method : "cash",
        note: String(p.note || "").trim(),
        paidAt: p.paidAt || p.createdAt || new Date().toISOString(),
        createdAt: p.createdAt || new Date().toISOString(),
      })),
  };
}

async function saveStore(store: PurchasingStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function ensurePurchasingStore(): Promise<PurchasingStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<PurchasingStore>);
  } catch {
    const store = emptyStore();
    await saveStore(store);
    return store;
  }
}

export async function isPurchasingOn(): Promise<boolean> {
  const brand = await readBrand();
  return hasPurchasing(brand.extensions?.ordering);
}

export async function listSuppliers(includeInactive = false): Promise<Supplier[]> {
  const store = await ensurePurchasingStore();
  const rows = includeInactive
    ? store.suppliers
    : store.suppliers.filter((s) => s.active);
  return rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export async function createSupplier(input: {
  name: string;
  phone?: string;
  notes?: string;
  openingBalance?: number;
}): Promise<Supplier> {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("اسم المورد مطلوب");
  const store = await ensurePurchasingStore();
  const now = new Date().toISOString();
  const row: Supplier = {
    id: randomUUID(),
    name,
    phone: String(input.phone || "").trim(),
    notes: String(input.notes || "").trim(),
    openingBalance: money(Number(input.openingBalance) || 0),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  store.suppliers.push(row);
  await saveStore(store);
  return row;
}

export async function updateSupplier(
  id: string,
  patch: Partial<Pick<Supplier, "name" | "phone" | "notes" | "openingBalance" | "active">>
): Promise<Supplier> {
  const store = await ensurePurchasingStore();
  const idx = store.suppliers.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("المورد غير موجود");
  const cur = store.suppliers[idx];
  const name =
    patch.name !== undefined ? String(patch.name).trim() : cur.name;
  if (!name) throw new Error("اسم المورد مطلوب");
  store.suppliers[idx] = {
    ...cur,
    name,
    phone: patch.phone !== undefined ? String(patch.phone).trim() : cur.phone,
    notes: patch.notes !== undefined ? String(patch.notes).trim() : cur.notes,
    openingBalance:
      patch.openingBalance !== undefined
        ? money(patch.openingBalance)
        : cur.openingBalance,
    active: patch.active !== undefined ? Boolean(patch.active) : cur.active,
    updatedAt: new Date().toISOString(),
  };
  await saveStore(store);
  return store.suppliers[idx];
}

function poTotal(lines: PurchaseLine[]): number {
  return money(lines.reduce((s, l) => s + l.lineTotal, 0));
}

export async function listPurchases(): Promise<PurchaseOrder[]> {
  const store = await ensurePurchasingStore();
  return [...store.purchases].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function createPurchase(input: {
  supplierId: string;
  notes?: string;
  branchId?: string;
  lines: Partial<PurchaseLine>[];
}): Promise<PurchaseOrder> {
  const store = await ensurePurchasingStore();
  const supplier = store.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier || !supplier.active) throw new Error("المورد غير موجود");
  const products = await listProducts();
  const productIds = new Set(products.map((p) => p.id));
  const lines: PurchaseLine[] = [];
  for (const raw of input.lines || []) {
    const line = normalizeLine(raw);
    if (!line) continue;
    if (line.productId && !productIds.has(line.productId)) {
      throw new Error("صنف المنيو غير موجود");
    }
    if (line.productId) {
      const p = products.find((x) => x.id === line.productId);
      if (p && (!line.description || line.description === line.productId)) {
        line.description = p.name;
      }
    }
    lines.push(line);
  }
  if (!lines.length) throw new Error("أضف سطراً واحداً على الأقل");
  const now = new Date().toISOString();
  const branchId = input.branchId || (await getDefaultBranchId());
  const po: PurchaseOrder = {
    id: randomUUID(),
    supplierId: input.supplierId,
    status: "draft",
    branchId,
    notes: String(input.notes || "").trim(),
    lines,
    total: poTotal(lines),
    createdAt: now,
    updatedAt: now,
    orderedAt: null,
    receivedAt: null,
  };
  store.purchases.push(po);
  await saveStore(store);
  return po;
}

export async function updatePurchaseDraft(
  id: string,
  patch: {
    notes?: string;
    branchId?: string;
    lines?: Partial<PurchaseLine>[];
  }
): Promise<PurchaseOrder> {
  const store = await ensurePurchasingStore();
  const idx = store.purchases.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("أمر الشراء غير موجود");
  const cur = store.purchases[idx];
  if (cur.status !== "draft") {
    throw new Error("يمكن تعديل المسودة فقط");
  }
  const products = await listProducts();
  const productIds = new Set(products.map((p) => p.id));
  let lines = cur.lines;
  if (patch.lines) {
    lines = [];
    for (const raw of patch.lines) {
      const line = normalizeLine(raw);
      if (!line) continue;
      if (line.productId && !productIds.has(line.productId)) {
        throw new Error("صنف المنيو غير موجود");
      }
      lines.push(line);
    }
    if (!lines.length) throw new Error("أضف سطراً واحداً على الأقل");
  }
  store.purchases[idx] = {
    ...cur,
    notes: patch.notes !== undefined ? String(patch.notes).trim() : cur.notes,
    branchId: patch.branchId || cur.branchId,
    lines,
    total: poTotal(lines),
    updatedAt: new Date().toISOString(),
  };
  await saveStore(store);
  return store.purchases[idx];
}

export async function setPurchaseStatus(
  id: string,
  status: PurchaseStatus
): Promise<PurchaseOrder> {
  const store = await ensurePurchasingStore();
  const idx = store.purchases.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("أمر الشراء غير موجود");
  const cur = store.purchases[idx];
  const now = new Date().toISOString();
  if (status === cur.status) return cur;
  if (cur.status === "received") {
    throw new Error("لا يمكن تغيير أمر مستلم");
  }
  if (cur.status === "cancelled") {
    throw new Error("الأمر ملغى");
  }
  if (status === "ordered") {
    if (cur.status !== "draft") throw new Error("الطلب يتم من المسودة فقط");
    store.purchases[idx] = {
      ...cur,
      status: "ordered",
      orderedAt: now,
      updatedAt: now,
    };
  } else if (status === "cancelled") {
    if (cur.status !== "draft" && cur.status !== "ordered") {
      throw new Error("لا يمكن إلغاء هذا الأمر");
    }
    store.purchases[idx] = { ...cur, status: "cancelled", updatedAt: now };
  } else if (status === "received") {
    return receivePurchase(id);
  } else if (status === "draft") {
    throw new Error("لا رجوع للمسودة");
  }
  await saveStore(store);
  return store.purchases[idx];
}

export async function receivePurchase(id: string): Promise<PurchaseOrder> {
  const store = await ensurePurchasingStore();
  const idx = store.purchases.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("أمر الشراء غير موجود");
  const cur = store.purchases[idx];
  if (cur.status !== "ordered") {
    throw new Error("الاستلام من حالة «مطلوب» فقط");
  }
  const stockLines = cur.lines
    .filter((l) => l.productId)
    .map((l) => ({ productId: l.productId as string, qty: l.qty }));
  if (stockLines.length) {
    await increaseStock(stockLines, cur.branchId);
  }
  const now = new Date().toISOString();
  store.purchases[idx] = {
    ...cur,
    status: "received",
    receivedAt: now,
    updatedAt: now,
  };
  await saveStore(store);
  return store.purchases[idx];
}

export async function listPayments(): Promise<SupplierPayment[]> {
  const store = await ensurePurchasingStore();
  return [...store.payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function recordPayment(input: {
  supplierId: string;
  amount: number;
  method?: SupplierPayment["method"];
  note?: string;
  paidAt?: string;
}): Promise<SupplierPayment> {
  const amount = money(input.amount);
  if (amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  const store = await ensurePurchasingStore();
  const supplier = store.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier) throw new Error("المورد غير موجود");
  const now = new Date().toISOString();
  const row: SupplierPayment = {
    id: randomUUID(),
    supplierId: input.supplierId,
    amount,
    method: input.method || "cash",
    note: String(input.note || "").trim(),
    paidAt: input.paidAt || now,
    createdAt: now,
  };
  store.payments.push(row);
  await saveStore(store);
  return row;
}

function committedTotal(po: PurchaseOrder): number {
  if (po.status === "ordered" || po.status === "received") return po.total;
  return 0;
}

export type SupplierBalance = {
  supplier: Supplier;
  purchases: number;
  payments: number;
  balance: number;
};

export async function supplierBalances(): Promise<SupplierBalance[]> {
  const store = await ensurePurchasingStore();
  return store.suppliers
    .filter((s) => s.active)
    .map((supplier) => {
      const purchases = money(
        store.purchases
          .filter((p) => p.supplierId === supplier.id)
          .reduce((s, p) => s + committedTotal(p), 0)
      );
      const payments = money(
        store.payments
          .filter((p) => p.supplierId === supplier.id)
          .reduce((s, p) => s + p.amount, 0)
      );
      return {
        supplier,
        purchases,
        payments,
        balance: money(supplier.openingBalance + purchases - payments),
      };
    })
    .sort((a, b) => b.balance - a.balance);
}

export async function purchasingPnL(opts?: {
  from?: string;
  to?: string;
}): Promise<{
  from: string;
  to: string;
  sales: number;
  purchasesReceived: number;
  payments: number;
  gross: number;
  orderCount: number;
}> {
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

  const [sales, store] = await Promise.all([
    buildSalesReport({ from, to, timezone }),
    ensurePurchasingStore(),
  ]);
  const purchasesReceived = money(
    store.purchases
      .filter(
        (p) =>
          p.status === "received" &&
          p.receivedAt &&
          p.receivedAt >= from! &&
          p.receivedAt <= to!
      )
      .reduce((s, p) => s + p.total, 0)
  );
  const payments = money(
    store.payments
      .filter((p) => p.paidAt >= from! && p.paidAt <= to!)
      .reduce((s, p) => s + p.amount, 0)
  );
  return {
    from,
    to,
    sales: money(sales.revenue),
    purchasesReceived,
    payments,
    gross: money(sales.revenue - purchasesReceived),
    orderCount: sales.orderCount,
  };
}

export async function purchasingMeta() {
  const [products, multi] = await Promise.all([
    listProducts(),
    isMultiBranchOn(),
  ]);
  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
    })),
    multiBranch: multi,
    defaultBranchId: await getDefaultBranchId(),
  };
}
