import { promises as fs } from "fs";
import path from "path";
import { randomUUID, createHash } from "crypto";
import type {
  OrderChannel,
  OrderStatus,
  Station,
} from "./extensions/ordering";
import { readBrand } from "./brand";
import { getCategory, getProduct, listCategories } from "./menu-data";
import {
  priceAfterDiscount as priceDisc,
  resolveDiscount as resolveDisc,
  configuredBasePrice,
  missingRequiredOptions,
  optionLabels,
  type OptionSelection,
} from "./types";
import { deductStock, restoreStock } from "./inventory-data";
import {
  applyBranchToProduct,
  resolveBranchId,
} from "./branches-data";
import { moneyTotals, type DeliveryArea } from "./commerce";
import { addStamp } from "./loyalty-data";

export type Zone = {
  id: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  active: boolean;
};

export type Table = {
  id: string;
  label: string;
  labelAr?: string;
  zoneId?: string | null;
  sortOrder: number;
  active: boolean;
};

export type OrderLine = {
  itemId: string;
  name: string;
  nameAr: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  station: Station;
  prep?: string[];
  stockItems?: { itemId: string; qty: number }[];
};

export type DeliveryInfo = {
  phone: string;
  addressLine: string;
  notes?: string;
  areaId?: string;
  areaName?: string;
};

export type PickupInfo = {
  phone: string;
  name?: string;
};

export type Order = {
  id: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  channel: OrderChannel;
  tableId?: string | null;
  zoneId?: string | null;
  tableLabel?: string | null;
  zoneLabel?: string | null;
  delivery?: DeliveryInfo | null;
  pickup?: PickupInfo | null;
  status: OrderStatus;
  guestNote?: string;
  source: "public_menu" | "pos";
  /** Branch that owns stock/price for this order */
  branchId?: string | null;
  /** Set when closed from POS counter */
  paymentMethod?: "cash" | "card" | "other" | null;
  paidAt?: string | null;
  lines: OrderLine[];
  totals: {
    subtotal: number;
    tax?: number;
    deliveryFee?: number;
    grandTotal: number;
    taxInclusive?: boolean;
  };
  loyalty?: { stamps: number; rewardEarned: boolean } | null;
};

export type OrderingSettings = {
  guestNoteEnabled: boolean;
  maxItemsPerOrder: number;
  soundEnabled: boolean;
  deliveryMinOrder: number;
  deliveryAreas: DeliveryArea[];
  loyaltyEnabled: boolean;
  stampsForReward: number;
  seasonalNote?: string;
  seasonalNoteEn?: string;
  alerts?: {
    alertOnDelivery: boolean;
    alertOnDineIn: boolean;
    alertOnPos: boolean;
    alertOnPickup?: boolean;
    whatsappPhone: string;
    callMeBotApiKey: string;
    webhookUrl: string;
  };
};

export type OrderingStore = {
  zones: Zone[];
  tables: Table[];
  /** categoryId → station */
  stationRouting: Record<string, Station>;
  settings: OrderingSettings;
  orders: Order[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERING_FILE = path.join(DATA_DIR, "ordering.json");

const DEFAULT_ZONES: Zone[] = [
  {
    id: "zone-indoor",
    name: "Indoor",
    nameAr: "داخلي",
    sortOrder: 1,
    active: true,
  },
  {
    id: "zone-outdoor",
    name: "Outdoor",
    nameAr: "خارجي",
    sortOrder: 2,
    active: true,
  },
];

function emptyStore(): OrderingStore {
  return {
    zones: [],
    tables: [],
    stationRouting: {},
    settings: {
      guestNoteEnabled: true,
      maxItemsPerOrder: 50,
      soundEnabled: true,
      deliveryMinOrder: 0,
      deliveryAreas: [],
      loyaltyEnabled: false,
      stampsForReward: 10,
      seasonalNote: "",
      seasonalNoteEn: "",
      alerts: {
        alertOnDelivery: true,
        alertOnDineIn: false,
        alertOnPos: false,
        alertOnPickup: true,
        whatsappPhone: "",
        callMeBotApiKey: "",
        webhookUrl: "",
      },
    },
    orders: [],
  };
}

function normalizeAlerts(
  raw?: Partial<NonNullable<OrderingSettings["alerts"]>> | null
): NonNullable<OrderingSettings["alerts"]> {
  return {
    alertOnDelivery: raw?.alertOnDelivery !== false,
    alertOnDineIn: Boolean(raw?.alertOnDineIn),
    alertOnPos: Boolean(raw?.alertOnPos),
    alertOnPickup: raw?.alertOnPickup !== false,
    whatsappPhone: String(raw?.whatsappPhone || "").trim(),
    callMeBotApiKey: String(raw?.callMeBotApiKey || "").trim(),
    webhookUrl: String(raw?.webhookUrl || "").trim(),
  };
}

function normalizeAreas(raw: unknown): DeliveryArea[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && a.name)
    .map((a: DeliveryArea, i: number) => ({
      id: String(a.id || `area-${i}`),
      name: String(a.name),
      nameAr: String(a.nameAr || a.name),
      fee: Math.max(0, Number(a.fee) || 0),
      active: a.active !== false,
      sortOrder: Number(a.sortOrder) || i + 1,
    }));
}

function normalizeStore(raw: Partial<OrderingStore>): OrderingStore {
  return {
    zones: Array.isArray(raw.zones) ? raw.zones : [],
    tables: Array.isArray(raw.tables) ? raw.tables : [],
    stationRouting:
      raw.stationRouting && typeof raw.stationRouting === "object"
        ? raw.stationRouting
        : {},
    settings: {
      guestNoteEnabled: raw.settings?.guestNoteEnabled !== false,
      maxItemsPerOrder:
        Number(raw.settings?.maxItemsPerOrder) > 0
          ? Math.min(200, Math.floor(Number(raw.settings?.maxItemsPerOrder)))
          : 50,
      soundEnabled: raw.settings?.soundEnabled !== false,
      deliveryMinOrder: Math.max(
        0,
        Number(raw.settings?.deliveryMinOrder) || 0
      ),
      deliveryAreas: normalizeAreas(raw.settings?.deliveryAreas),
      loyaltyEnabled: Boolean(raw.settings?.loyaltyEnabled),
      stampsForReward: Math.max(
        2,
        Math.min(50, Number(raw.settings?.stampsForReward) || 10)
      ),
      seasonalNote: String(raw.settings?.seasonalNote || ""),
      seasonalNoteEn: String(raw.settings?.seasonalNoteEn || ""),
      alerts: normalizeAlerts(raw.settings?.alerts),
    },
    orders: Array.isArray(raw.orders) ? raw.orders : [],
  };
}

async function ensureStore(): Promise<OrderingStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(ORDERING_FILE, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<OrderingStore>);
  } catch {
    const store = emptyStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: OrderingStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORDERING_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function readOrderingStore(): Promise<OrderingStore> {
  return ensureStore();
}

export async function getOrderingSettings(): Promise<OrderingSettings> {
  const store = await ensureStore();
  const brand = await readBrand();
  const feat = brand.extensions?.ordering;
  return {
    guestNoteEnabled:
      feat?.guestNoteEnabled !== false && store.settings.guestNoteEnabled,
    maxItemsPerOrder:
      feat?.maxItemsPerOrder || store.settings.maxItemsPerOrder || 50,
    soundEnabled: store.settings.soundEnabled,
    deliveryMinOrder: store.settings.deliveryMinOrder || 0,
    deliveryAreas: store.settings.deliveryAreas || [],
    loyaltyEnabled: Boolean(store.settings.loyaltyEnabled),
    stampsForReward: store.settings.stampsForReward || 10,
    seasonalNote: store.settings.seasonalNote || "",
    seasonalNoteEn: store.settings.seasonalNoteEn || "",
    alerts: normalizeAlerts(store.settings.alerts),
  };
}

export async function updateOrderingSettings(
  patch: Partial<OrderingSettings>
): Promise<OrderingSettings> {
  const store = await ensureStore();
  const nextAlerts =
    patch.alerts !== undefined
      ? normalizeAlerts({ ...store.settings.alerts, ...patch.alerts })
      : normalizeAlerts(store.settings.alerts);
  store.settings = {
    ...store.settings,
    ...patch,
    alerts: nextAlerts,
  };
  await saveStore(store);
  return getOrderingSettings();
}

/* ─── Zones ─── */

export async function listZones(): Promise<Zone[]> {
  const store = await ensureStore();
  return [...store.zones].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function seedDefaultZonesIfEmpty(): Promise<Zone[]> {
  const store = await ensureStore();
  if (store.zones.length === 0) {
    store.zones = DEFAULT_ZONES.map((z) => ({ ...z }));
    await saveStore(store);
  }
  return listZones();
}

export async function upsertZone(
  input: Partial<Zone> & { name: string; nameAr: string }
): Promise<Zone> {
  const store = await ensureStore();
  if (input.id) {
    const idx = store.zones.findIndex((z) => z.id === input.id);
    if (idx === -1) throw new Error("المنطقة غير موجودة");
    store.zones[idx] = {
      ...store.zones[idx],
      ...input,
      id: store.zones[idx].id,
    };
    await saveStore(store);
    return store.zones[idx];
  }
  if (store.zones.length >= 2) {
    throw new Error("الحد الأقصى منطقتان في هذه المرحلة");
  }
  const zone: Zone = {
    id: randomUUID(),
    name: input.name,
    nameAr: input.nameAr,
    sortOrder: input.sortOrder ?? store.zones.length + 1,
    active: input.active ?? true,
  };
  store.zones.push(zone);
  await saveStore(store);
  return zone;
}

export async function deleteZone(id: string) {
  const store = await ensureStore();
  store.zones = store.zones.filter((z) => z.id !== id);
  store.tables = store.tables.map((t) =>
    t.zoneId === id ? { ...t, zoneId: null } : t
  );
  await saveStore(store);
}

/* ─── Tables ─── */

export async function listTables(): Promise<Table[]> {
  const store = await ensureStore();
  return [...store.tables].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertTable(
  input: Partial<Table> & { label: string }
): Promise<Table> {
  const store = await ensureStore();
  if (input.id) {
    const idx = store.tables.findIndex((t) => t.id === input.id);
    if (idx === -1) throw new Error("الطاولة غير موجودة");
    store.tables[idx] = {
      ...store.tables[idx],
      ...input,
      id: store.tables[idx].id,
    };
    await saveStore(store);
    return store.tables[idx];
  }
  const table: Table = {
    id: randomUUID(),
    label: input.label.trim(),
    labelAr: input.labelAr?.trim() || input.label.trim(),
    zoneId: input.zoneId ?? null,
    sortOrder: input.sortOrder ?? store.tables.length + 1,
    active: input.active ?? true,
  };
  store.tables.push(table);
  await saveStore(store);
  return table;
}

export async function deleteTable(id: string) {
  const store = await ensureStore();
  store.tables = store.tables.filter((t) => t.id !== id);
  await saveStore(store);
}

/* ─── Station routing ─── */

export async function getStationRouting(): Promise<Record<string, Station>> {
  const store = await ensureStore();
  return { ...store.stationRouting };
}

export async function setStationRouting(
  routing: Record<string, Station>
): Promise<Record<string, Station>> {
  const store = await ensureStore();
  const cleaned: Record<string, Station> = {};
  for (const [k, v] of Object.entries(routing)) {
    if (v === "kitchen" || v === "barista" || v === "unassigned") {
      cleaned[k] = v;
    }
  }
  store.stationRouting = cleaned;
  await saveStore(store);
  return cleaned;
}

export async function resolveStationForCategory(
  categoryId: string
): Promise<Station> {
  const store = await ensureStore();
  const direct = store.stationRouting[categoryId];
  if (direct) return direct;
  // Walk parents
  const categories = await listCategories();
  const byId = new Map(categories.map((c) => [c.id, c]));
  let cur = byId.get(categoryId);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    const s = store.stationRouting[cur.id];
    if (s) return s;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return "unassigned";
}

/* ─── Orders ─── */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const rateHits = new Map<string, number[]>();

export function checkOrderRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateHits.set(ip, hits);
  return true;
}

function makeOrderCode(): string {
  const n = Math.floor(Math.random() * 9000) + 1000;
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  return `${a}${b}${n}`;
}

export async function listOrders(opts?: {
  status?: OrderStatus | OrderStatus[];
  channel?: OrderChannel;
  since?: string;
  station?: Station;
  openOnly?: boolean;
}): Promise<Order[]> {
  const store = await ensureStore();
  let orders = [...store.orders];
  if (opts?.since) {
    orders = orders.filter((o) => o.updatedAt >= opts.since! || o.createdAt >= opts.since!);
  }
  if (opts?.channel) {
    orders = orders.filter((o) => o.channel === opts.channel);
  }
  if (opts?.status) {
    const set = new Set(
      Array.isArray(opts.status) ? opts.status : [opts.status]
    );
    orders = orders.filter((o) => set.has(o.status));
  }
  if (opts?.openOnly) {
    orders = orders.filter(
      (o) => !["served", "cancelled"].includes(o.status)
    );
  }
  if (opts?.station) {
    orders = orders.filter((o) =>
      o.lines.some((l) => l.station === opts.station)
    );
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const store = await ensureStore();
  return store.orders.find((o) => o.id === id) ?? null;
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const store = await ensureStore();
  const c = code.trim().toUpperCase();
  return store.orders.find((o) => o.code.toUpperCase() === c) ?? null;
}

function pricedLineFromProduct(
  product: NonNullable<Awaited<ReturnType<typeof getProduct>>>,
  category: Awaited<ReturnType<typeof getCategory>>,
  qty: number,
  selections: OptionSelection[],
  station: Station,
  prep: string[] = []
) {
  const missing = missingRequiredOptions(product, selections);
  if (missing.length) {
    throw new Error(`اختر ${missing[0].name}`);
  }
  const base = configuredBasePrice(product, selections);
  const discount = resolveDisc(product, category);
  const pricing = priceDisc(base, discount);
  const extraAr = optionLabels(product, selections, "ar");
  const extraEn = optionLabels(product, selections, "en");
  const prepAr = prep.map((id) => {
    const map: Record<string, string> = {
      spicy_hot: "حار",
      spicy_mild: "خفيف حرّ",
      no_onion: "من غير بصل",
      no_garlic: "من غير توم",
      well: "مستوي",
      medium: "متوسط",
      rare: "نصف نيء",
    };
    return map[id] || id;
  });
  const prepEn = prep.map((id) => {
    const map: Record<string, string> = {
      spicy_hot: "Spicy",
      spicy_mild: "Mild spice",
      no_onion: "No onion",
      no_garlic: "No garlic",
      well: "Well done",
      medium: "Medium",
      rare: "Rare",
    };
    return map[id] || id;
  });
  const bitsAr = [...extraAr, ...prepAr];
  const bitsEn = [...extraEn, ...prepEn];
  const suffixAr = bitsAr.length ? ` · ${bitsAr.join(" · ")}` : "";
  const suffixEn = bitsEn.length ? ` · ${bitsEn.join(" · ")}` : "";
  const combo = Array.isArray(product.comboItems) ? product.comboItems : [];
  const stockItems =
    combo.length > 0
      ? combo.map((c) => ({
          itemId: c.productId,
          qty: Math.max(1, Number(c.qty) || 1) * qty,
        }))
      : [{ itemId: product.id, qty }];
  return {
    itemId: product.id,
    name: `${product.nameEn || product.name}${suffixEn}`,
    nameAr: `${product.name}${suffixAr}`,
    qty,
    unitPrice: pricing.final,
    lineTotal: Math.round(pricing.final * qty * 100) / 100,
    station,
    prep,
    stockItems,
  } satisfies OrderLine;
}

export type CreateOrderInput = {
  channel: OrderChannel;
  tableId?: string;
  zoneId?: string;
  delivery?: {
    phone: string;
    addressLine: string;
    notes?: string;
    areaId?: string;
  };
  pickup?: { phone: string; name?: string };
  guestNote?: string;
  lines: {
    itemId: string;
    qty: number;
    options?: OptionSelection[];
    prep?: string[];
  }[];
  branchId?: string | null;
  /** honeypot — must be empty */
  website?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.website) {
    throw new Error("طلب مرفوض");
  }
  const brand = await readBrand();
  const feat = brand.extensions?.ordering;
  if (!feat?.orderFromMenu) {
    throw new Error("الطلب من المنيو غير مفعّل");
  }
  if (input.channel === "dine_in" && !feat.tableOrderingEnabled) {
    throw new Error("طلب الطاولة غير مفعّل");
  }
  if (input.channel === "delivery" && !feat.deliveryEnabled) {
    throw new Error("التوصيل غير مفعّل");
  }
  if (input.channel === "pickup" && !feat.pickupEnabled) {
    throw new Error("الاستلام من الفرع غير مفعّل");
  }
  if (
    input.channel !== "dine_in" &&
    input.channel !== "delivery" &&
    input.channel !== "pickup"
  ) {
    throw new Error("قناة طلب غير صالحة");
  }
  if (!input.lines?.length) {
    throw new Error("السلة فارغة");
  }

  const settings = await getOrderingSettings();
  const totalQty = input.lines.reduce((s, l) => s + Number(l.qty || 0), 0);
  if (totalQty <= 0) throw new Error("السلة فارغة");
  if (totalQty > settings.maxItemsPerOrder) {
    throw new Error(`الحد الأقصى ${settings.maxItemsPerOrder} صنف لكل طلب`);
  }

  const store = await ensureStore();
  const branchId = await resolveBranchId(input.branchId);
  let tableLabel: string | null = null;
  let zoneLabel: string | null = null;
  let tableId: string | null = null;
  let zoneId: string | null = null;
  let delivery: DeliveryInfo | null = null;
  let pickup: PickupInfo | null = null;
  let deliveryFee = 0;

  if (input.channel === "dine_in") {
    if (!input.tableId) throw new Error("اختر طاولة");
    const table = store.tables.find((t) => t.id === input.tableId && t.active);
    if (!table) throw new Error("الطاولة غير متاحة");
    tableId = table.id;
    tableLabel = table.labelAr || table.label;
    if (feat.zonesIndoorOutdoor) {
      const zid = input.zoneId || table.zoneId;
      if (!zid) throw new Error("اختر المنطقة");
      const zone = store.zones.find((z) => z.id === zid && z.active);
      if (!zone) throw new Error("المنطقة غير متاحة");
      if (table.zoneId && table.zoneId !== zone.id) {
        throw new Error("الطاولة ليست في هذه المنطقة");
      }
      zoneId = zone.id;
      zoneLabel = zone.nameAr || zone.name;
    }
  } else if (input.channel === "pickup") {
    const phone = String(input.pickup?.phone || input.delivery?.phone || "").trim();
    if (!phone || phone.length < 8) {
      throw new Error("رقم الموبايل مطلوب للاستلام");
    }
    pickup = {
      phone,
      name: input.pickup?.name?.trim() || undefined,
    };
  } else {
    const phone = String(input.delivery?.phone || "").trim();
    const addressLine = String(input.delivery?.addressLine || "").trim();
    if (!phone || phone.length < 8) {
      throw new Error("رقم الموبايل مطلوب");
    }
    if (!addressLine || addressLine.length < 5) {
      throw new Error("العنوان مطلوب");
    }
    const areas = (settings.deliveryAreas || []).filter((a) => a.active);
    let area: DeliveryArea | undefined;
    if (areas.length) {
      area = areas.find((a) => a.id === input.delivery?.areaId);
      if (!area) throw new Error("اختر منطقة التوصيل");
      deliveryFee = area.fee;
    }
    delivery = {
      phone,
      addressLine,
      notes: input.delivery?.notes?.trim() || undefined,
      areaId: area?.id,
      areaName: area ? area.nameAr || area.name : undefined,
    };
  }

  const lines: OrderLine[] = [];
  for (const raw of input.lines) {
    const qty = Math.floor(Number(raw.qty));
    if (!raw.itemId || qty < 1) continue;
    let product = await getProduct(raw.itemId);
    if (!product) {
      throw new Error("صنف غير متاح — حدّث السلة");
    }
    product = await applyBranchToProduct(branchId, product);
    if (!product.available) {
      throw new Error("صنف غير متاح — حدّث السلة");
    }
    const selections = Array.isArray(raw.options) ? raw.options : [];
    const category = product.categoryId
      ? await getCategory(product.categoryId)
      : null;
    const station = product.categoryId
      ? await resolveStationForCategory(product.categoryId)
      : "unassigned";
    const prep = Array.isArray(raw.prep) ? raw.prep.map(String).slice(0, 8) : [];
    lines.push(
      pricedLineFromProduct(product, category, qty, selections, station, prep)
    );
  }
  if (!lines.length) throw new Error("السلة فارغة");

  const subtotal = Math.round(
    lines.reduce((s, l) => s + l.lineTotal, 0) * 100
  ) / 100;

  if (input.channel === "delivery" && settings.deliveryMinOrder > 0) {
    if (subtotal + 0.001 < settings.deliveryMinOrder) {
      throw new Error(
        `الحد الأدنى للتوصيل ${settings.deliveryMinOrder}`
      );
    }
  }

  const stockMoves = lines.flatMap(
    (l) => l.stockItems || [{ itemId: l.itemId, qty: l.qty }]
  );
  await deductStock(stockMoves, branchId);

  const totals = moneyTotals(subtotal, {
    deliveryFee,
    taxPercent: brand.taxPercent,
    taxInclusive: brand.taxInclusive !== false,
  });

  const loyaltyPhone = delivery?.phone || pickup?.phone || "";
  let loyalty: Order["loyalty"] = null;
  if (settings.loyaltyEnabled && loyaltyPhone) {
    loyalty = await addStamp(loyaltyPhone, settings.stampsForReward);
  }

  const now = new Date().toISOString();
  let code = makeOrderCode();
  // uniqueness
  for (let i = 0; i < 5; i++) {
    if (!store.orders.some((o) => o.code === code)) break;
    code = makeOrderCode();
  }

  const order: Order = {
    id: randomUUID(),
    code,
    createdAt: now,
    updatedAt: now,
    channel: input.channel,
    tableId,
    zoneId,
    tableLabel,
    zoneLabel,
    delivery,
    pickup,
    status: "new",
    guestNote:
      settings.guestNoteEnabled && input.guestNote
        ? input.guestNote.trim().slice(0, 500)
        : undefined,
    source: "public_menu",
    branchId,
    lines,
    totals,
    loyalty,
  };

  store.orders.unshift(order);
  // Soft retention: keep last 500
  if (store.orders.length > 500) {
    store.orders = store.orders.slice(0, 500);
  }
  await saveStore(store);
  // Staff alerts (WhatsApp / webhook) — never block the guest response
  void import("@/lib/order-alerts").then(({ notifyNewOrder }) =>
    notifyNewOrder(order)
  );
  return order;
}

export type CreatePosOrderInput = {
  tableId?: string | null;
  guestNote?: string;
  paymentMethod: "cash" | "card" | "other";
  lines: { itemId: string; qty: number; options?: OptionSelection[] }[];
  branchId?: string | null;
};

/** Authenticated POS ticket close — walk-in or optional table */
export async function createPosOrder(
  input: CreatePosOrderInput
): Promise<Order> {
  const brand = await readBrand();
  const feat = brand.extensions?.ordering;
  if (!feat?.orderFromMenu) {
    throw new Error("Ordering is disabled");
  }
  if (!feat.posEnabled) {
    throw new Error("POS is disabled");
  }
  const method = input.paymentMethod;
  if (method !== "cash" && method !== "card" && method !== "other") {
    throw new Error("Invalid payment method");
  }
  if (!input.lines?.length) {
    throw new Error("Ticket is empty");
  }

  const settings = await getOrderingSettings();
  const totalQty = input.lines.reduce((s, l) => s + Number(l.qty || 0), 0);
  if (totalQty <= 0) throw new Error("Ticket is empty");
  if (totalQty > settings.maxItemsPerOrder) {
    throw new Error(`Max ${settings.maxItemsPerOrder} items per ticket`);
  }

  const store = await ensureStore();
  const branchId = await resolveBranchId(input.branchId);
  let tableLabel: string | null = null;
  let zoneLabel: string | null = null;
  let tableId: string | null = null;
  let zoneId: string | null = null;

  if (input.tableId) {
    if (!feat.tableOrderingEnabled) {
      throw new Error("Table ordering is disabled");
    }
    const table = store.tables.find((t) => t.id === input.tableId && t.active);
    if (!table) throw new Error("Table unavailable");
    tableId = table.id;
    tableLabel = table.labelAr || table.label;
    if (table.zoneId) {
      const zone = store.zones.find((z) => z.id === table.zoneId && z.active);
      if (zone) {
        zoneId = zone.id;
        zoneLabel = zone.nameAr || zone.name;
      }
    }
  }

  const lines: OrderLine[] = [];
  for (const raw of input.lines) {
    const qty = Math.floor(Number(raw.qty));
    if (!raw.itemId || qty < 1) continue;
    let product = await getProduct(raw.itemId);
    if (!product) {
      throw new Error("Item unavailable — refresh catalog");
    }
    product = await applyBranchToProduct(branchId, product);
    if (!product.available) {
      throw new Error("Item unavailable — refresh catalog");
    }
    const selections = Array.isArray(raw.options) ? raw.options : [];
    const category = product.categoryId
      ? await getCategory(product.categoryId)
      : null;
    const station = product.categoryId
      ? await resolveStationForCategory(product.categoryId)
      : "unassigned";
    lines.push(
      pricedLineFromProduct(product, category, qty, selections, station)
    );
  }
  if (!lines.length) throw new Error("Ticket is empty");

  await deductStock(
    lines.flatMap((l) => l.stockItems || [{ itemId: l.itemId, qty: l.qty }]),
    branchId
  );

  const subtotal =
    Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const totals = moneyTotals(subtotal, {
    taxPercent: brand.taxPercent,
    taxInclusive: brand.taxInclusive !== false,
  });

  const now = new Date().toISOString();
  let code = makeOrderCode();
  for (let i = 0; i < 5; i++) {
    if (!store.orders.some((o) => o.code === code)) break;
    code = makeOrderCode();
  }

  const needsStation = lines.some(
    (l) => l.station === "kitchen" || l.station === "barista"
  );

  const order: Order = {
    id: randomUUID(),
    code,
    createdAt: now,
    updatedAt: now,
    channel: "pos",
    tableId,
    zoneId,
    tableLabel,
    zoneLabel,
    delivery: null,
    status: needsStation ? "preparing" : "served",
    guestNote:
      settings.guestNoteEnabled && input.guestNote
        ? input.guestNote.trim().slice(0, 500)
        : undefined,
    source: "pos",
    branchId,
    paymentMethod: method,
    paidAt: now,
    lines,
    totals,
  };

  store.orders.unshift(order);
  if (store.orders.length > 500) {
    store.orders = store.orders.slice(0, 500);
  }
  await saveStore(store);
  void import("@/lib/order-alerts").then(({ notifyNewOrder }) =>
    notifyNewOrder(order)
  );
  return order;
}

const OWNER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

const STATION_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing"],
  preparing: ["ready"],
  ready: [],
  served: [],
  cancelled: [],
};

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  role: "owner" | "cashier" | "station" = "owner"
): Promise<Order> {
  const store = await ensureStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error("الطلب غير موجود");
  const order = store.orders[idx];
  const allowed =
    role === "station"
      ? STATION_TRANSITIONS[order.status]
      : OWNER_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    throw new Error(`لا يمكن التحويل من ${order.status} إلى ${status}`);
  }
  if (status === "cancelled" && order.status !== "cancelled") {
    await restoreStock(
      order.lines.flatMap(
        (l) => l.stockItems || [{ itemId: l.itemId, qty: l.qty }]
      ),
      order.branchId || undefined
    );
  }
  store.orders[idx] = {
    ...order,
    status,
    updatedAt: new Date().toISOString(),
  };
  await saveStore(store);
  return store.orders[idx];
}

/** Public guest payload — strip excess PII for status page */
export function publicOrderView(order: Order) {
  return {
    code: order.code,
    status: order.status,
    channel: order.channel,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    tableLabel: order.tableLabel,
    zoneLabel: order.zoneLabel,
    delivery: order.delivery
      ? {
          phoneMasked: maskPhone(order.delivery.phone),
          addressLine: order.delivery.addressLine,
          areaName: order.delivery.areaName,
        }
      : null,
    pickup: order.pickup
      ? { phoneMasked: maskPhone(order.pickup.phone), name: order.pickup.name }
      : null,
    guestNote: order.guestNote,
    lines: order.lines.map((l) => ({
      name: l.name,
      nameAr: l.nameAr,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      station: l.station,
      prep: l.prep || [],
    })),
    totals: order.totals,
    loyalty: order.loyalty || null,
  };
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `${"*".repeat(Math.max(0, d.length - 3))}${d.slice(-3)}`;
}

export type SalesReport = {
  from: string;
  to: string;
  timezone: string;
  orderCount: number;
  cancelledCount: number;
  openCount: number;
  revenue: number;
  averageTicket: number;
  byChannel: Record<string, { count: number; revenue: number }>;
  byPayment: Record<string, { count: number; revenue: number }>;
  byStatus: Record<string, { count: number; revenue: number }>;
  bySource: Record<string, { count: number; revenue: number }>;
  topItems: {
    itemId: string;
    name: string;
    nameAr: string;
    qty: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    code: string;
    createdAt: string;
    channel: OrderChannel;
    status: OrderStatus;
    paymentMethod: Order["paymentMethod"];
    grandTotal: number;
  }[];
};

const CAIRO_TZ = "Africa/Cairo";

function wallClockParts(ms: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value || "0");
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second"),
  };
}

/** UTC ms for local Y-M-D H:M:S in `timezone` (iterative offset, no deps). */
function zonedLocalToUtcMs(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timezone: string
): number {
  let utc = Date.UTC(y, m - 1, d, h, mi, s);
  for (let i = 0; i < 4; i++) {
    const w = wallClockParts(utc, timezone);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
    const want = Date.UTC(y, m - 1, d, h, mi, s);
    utc += want - asUtc;
  }
  return utc;
}

/** Calendar day bounds in a timezone → ISO UTC range (inclusive day). */
export function dayRangeIso(
  dateYmd: string,
  timezone = CAIRO_TZ
): { from: string; to: string } {
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
    ? dateYmd
    : todayYmd(timezone);
  const [Y, M, D] = ymd.split("-").map(Number);
  const start = zonedLocalToUtcMs(Y, M, D, 0, 0, 0, timezone);
  const next = zonedLocalToUtcMs(Y, M, D + 1, 0, 0, 0, timezone);
  return {
    from: new Date(start).toISOString(),
    to: new Date(next - 1).toISOString(),
  };
}

function todayYmd(timezone = CAIRO_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function bumpBucket(
  map: Record<string, { count: number; revenue: number }>,
  key: string,
  revenue: number
) {
  const cur = map[key] || { count: 0, revenue: 0 };
  cur.count += 1;
  cur.revenue = Math.round((cur.revenue + revenue) * 100) / 100;
  map[key] = cur;
}

/**
 * Owner daily sales snapshot from ordering.json.
 * Revenue = non-cancelled orders in range (createdAt).
 */
export async function buildSalesReport(opts?: {
  from?: string;
  to?: string;
  /** YYYY-MM-DD — when set, overrides from/to with that Cairo calendar day */
  day?: string;
  timezone?: string;
}): Promise<SalesReport> {
  const timezone = opts?.timezone || CAIRO_TZ;
  let from: string;
  let to: string;

  if (opts?.day || (!opts?.from && !opts?.to)) {
    const range = dayRangeIso(opts?.day || todayYmd(timezone), timezone);
    from = range.from;
    to = range.to;
  } else {
    from = opts.from || dayRangeIso(todayYmd(timezone), timezone).from;
    to = opts.to || new Date().toISOString();
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
  }

  const store = await ensureStore();
  const inRange = store.orders.filter(
    (o) => o.createdAt >= from && o.createdAt <= to
  );

  const byChannel: SalesReport["byChannel"] = {};
  const byPayment: SalesReport["byPayment"] = {};
  const byStatus: SalesReport["byStatus"] = {};
  const bySource: SalesReport["bySource"] = {};
  const itemMap = new Map<
    string,
    { itemId: string; name: string; nameAr: string; qty: number; revenue: number }
  >();

  let revenue = 0;
  let orderCount = 0;
  let cancelledCount = 0;
  let openCount = 0;

  for (const o of inRange) {
    const total = Number(o.totals?.grandTotal) || 0;
    bumpBucket(byStatus, o.status, total);
    bumpBucket(byChannel, o.channel, total);
    bumpBucket(bySource, o.source || "public_menu", total);

    if (o.status === "cancelled") {
      cancelledCount += 1;
      continue;
    }

    orderCount += 1;
    revenue = Math.round((revenue + total) * 100) / 100;

    if (!["served", "cancelled"].includes(o.status)) {
      openCount += 1;
    }

    const payKey = o.paymentMethod || "unpaid";
    bumpBucket(byPayment, payKey, total);

    for (const line of o.lines || []) {
      const prev = itemMap.get(line.itemId) || {
        itemId: line.itemId,
        name: line.name,
        nameAr: line.nameAr,
        qty: 0,
        revenue: 0,
      };
      prev.qty += line.qty;
      prev.revenue = Math.round((prev.revenue + line.lineTotal) * 100) / 100;
      itemMap.set(line.itemId, prev);
    }
  }

  const topItems = [...itemMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
    .slice(0, 15);

  const recentOrders = [...inRange]
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map((o) => ({
      id: o.id,
      code: o.code,
      createdAt: o.createdAt,
      channel: o.channel,
      status: o.status,
      paymentMethod: o.paymentMethod ?? null,
      grandTotal: o.totals.grandTotal,
    }));

  return {
    from,
    to,
    timezone,
    orderCount,
    cancelledCount,
    openCount,
    revenue,
    averageTicket:
      orderCount > 0
        ? Math.round((revenue / orderCount) * 100) / 100
        : 0,
    byChannel,
    byPayment,
    byStatus,
    bySource,
    topItems,
    recentOrders,
  };
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Pragma: "no-cache",
  };
}

/** Stable fingerprint for demo/tests */
export function orderingDataFingerprint(): string {
  return createHash("sha1").update(ORDERING_FILE).digest("hex").slice(0, 8);
}
