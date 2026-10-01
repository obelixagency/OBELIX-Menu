/**
 * Cashier shifts — open/close day-close summaries from POS orders.
 * Enabled when POS is on (no separate agency flag for MVP).
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readBrand } from "./brand";
import { hasPos } from "./extensions/ordering";
import { readOrderingStore, type Order } from "./ordering-data";

export type Shift = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  openingCash: number;
  note: string | null;
  countedCash?: number | null;
  expectedCash?: number | null;
  cashVariance?: number | null;
  /** Snapshot filled on close */
  totals: {
    orderCount: number;
    revenue: number;
    byPayment: Record<string, { count: number; revenue: number }>;
  } | null;
};

type ShiftsFile = { shifts: Shift[] };

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "shifts.json");

function empty(): ShiftsFile {
  return { shifts: [] };
}

function normalize(raw: Partial<ShiftsFile>): ShiftsFile {
  return {
    shifts: Array.isArray(raw.shifts)
      ? raw.shifts.filter((s) => s && s.id && s.openedAt)
      : [],
  };
}

async function load(): Promise<ShiftsFile> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<ShiftsFile>);
  } catch {
    const data = empty();
    await save(data);
    return data;
  }
}

async function save(data: ShiftsFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function shiftsFeatureOn(): Promise<boolean> {
  const brand = await readBrand();
  return hasPos(brand.extensions?.ordering);
}

function summarizeOrders(orders: Order[]) {
  const byPayment: Record<string, { count: number; revenue: number }> = {};
  let revenue = 0;
  let orderCount = 0;
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    if (o.channel !== "pos" && o.source !== "pos") continue;
    const total = Number(o.totals?.grandTotal) || 0;
    orderCount += 1;
    revenue = Math.round((revenue + total) * 100) / 100;
    const key = o.paymentMethod || "unpaid";
    const cur = byPayment[key] || { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue = Math.round((cur.revenue + total) * 100) / 100;
    byPayment[key] = cur;
  }
  return { orderCount, revenue, byPayment };
}

export async function listShifts(limit = 40): Promise<Shift[]> {
  const data = await load();
  return [...data.shifts]
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, limit);
}

export async function getOpenShift(): Promise<Shift | null> {
  const data = await load();
  return data.shifts.find((s) => !s.closedAt) || null;
}

export async function openShift(input: {
  openedBy: string;
  openingCash?: number;
}): Promise<Shift> {
  if (!(await shiftsFeatureOn())) throw new Error("POS/shifts disabled");
  const data = await load();
  if (data.shifts.some((s) => !s.closedAt)) {
    throw new Error("فيه وردية مفتوحة بالفعل");
  }
  const shift: Shift = {
    id: randomUUID(),
    openedAt: new Date().toISOString(),
    closedAt: null,
    openedBy: input.openedBy || "staff",
    closedBy: null,
    openingCash: Math.max(0, Number(input.openingCash) || 0),
    note: null,
    countedCash: null,
    expectedCash: null,
    cashVariance: null,
    totals: null,
  };
  data.shifts.unshift(shift);
  if (data.shifts.length > 200) data.shifts = data.shifts.slice(0, 200);
  await save(data);
  return shift;
}

export async function closeShift(input: {
  closedBy: string;
  note?: string;
  countedCash?: number;
}): Promise<Shift> {
  if (!(await shiftsFeatureOn())) throw new Error("POS/shifts disabled");
  const data = await load();
  const idx = data.shifts.findIndex((s) => !s.closedAt);
  if (idx === -1) throw new Error("مفيش وردية مفتوحة");
  const shift = data.shifts[idx];
  const closedAt = new Date().toISOString();
  const store = await readOrderingStore();
  const inRange = store.orders.filter(
    (o) => o.createdAt >= shift.openedAt && o.createdAt <= closedAt
  );
  const totals = summarizeOrders(inRange);
  const expectedCash =
    Math.round(
      (shift.openingCash + (totals.byPayment.cash?.revenue || 0)) * 100
    ) / 100;
  const counted =
    input.countedCash === undefined || input.countedCash === null
      ? null
      : Math.max(0, Number(input.countedCash) || 0);
  const cashVariance =
    counted != null
      ? Math.round((counted - expectedCash) * 100) / 100
      : null;
  data.shifts[idx] = {
    ...shift,
    closedAt,
    closedBy: input.closedBy || "staff",
    note: input.note?.trim().slice(0, 500) || null,
    totals,
    expectedCash,
    countedCash: counted,
    cashVariance,
  };
  await save(data);
  return data.shifts[idx];
}

/** Live totals for the open shift (not yet closed). */
export async function openShiftLiveTotals(): Promise<{
  shift: Shift | null;
  live: ReturnType<typeof summarizeOrders> | null;
}> {
  const shift = await getOpenShift();
  if (!shift) return { shift: null, live: null };
  const store = await readOrderingStore();
  const now = new Date().toISOString();
  const inRange = store.orders.filter(
    (o) => o.createdAt >= shift.openedAt && o.createdAt <= now
  );
  return { shift, live: summarizeOrders(inRange) };
}
