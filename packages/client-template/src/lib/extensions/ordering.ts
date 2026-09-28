/**
 * Ordering feature flags — exported from agency into brand.json.
 * Master OFF ⇒ no cart / dine-in / delivery / staff order UI.
 */

export type OrderingProvider = "whatsapp" | "cart" | "external" | null;

export type Station = "kitchen" | "barista" | "unassigned";

export type OrderChannel = "dine_in" | "delivery" | "pos";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type PosPaymentMethod = "cash" | "card" | "other";

export type OrderingFeatures = {
  /** Master switch — when false, ignore all other ordering flags for UX */
  orderFromMenu: boolean;
  tableOrderingEnabled: boolean;
  deliveryEnabled: boolean;
  zonesIndoorOutdoor: boolean;
  cashierScreen: boolean;
  kitchenScreen: boolean;
  baristaScreen: boolean;
  /** Full POS sell screen — requires orderFromMenu */
  posEnabled: boolean;
  /** Multi-user staff logins (users.json) — when off, shared dashboard password */
  staffAccountsEnabled: boolean;
  /** Track stock qty per product; deduct on menu/POS orders */
  inventoryEnabled: boolean;
  /** Multiple branches — shared catalog, per-branch stock & price overrides */
  multiBranchEnabled: boolean;
  /** Soft settings (also overridable in ordering.json) */
  guestNoteEnabled: boolean;
  maxItemsPerOrder: number;
  /** Legacy stub fields kept for older brand.json */
  enabled?: boolean;
  provider?: OrderingProvider;
  note?: string;
};

export type OrderingExtension = OrderingFeatures;

export const DEFAULT_ORDERING_FEATURES: OrderingFeatures = {
  orderFromMenu: false,
  tableOrderingEnabled: false,
  deliveryEnabled: false,
  zonesIndoorOutdoor: false,
  cashierScreen: false,
  kitchenScreen: false,
  baristaScreen: false,
  posEnabled: false,
  staffAccountsEnabled: false,
  inventoryEnabled: false,
  multiBranchEnabled: false,
  guestNoteEnabled: true,
  maxItemsPerOrder: 50,
  enabled: false,
  provider: null,
  note: "Ordering off until agency enables order-from-menu for this client.",
};

/** @deprecated use DEFAULT_ORDERING_FEATURES */
export const ORDERING_STUB = DEFAULT_ORDERING_FEATURES;

export function normalizeOrderingFeatures(
  raw?: Partial<OrderingFeatures> | null
): OrderingFeatures {
  const merged: OrderingFeatures = {
    ...DEFAULT_ORDERING_FEATURES,
    ...raw,
  };
  // Legacy: enabled true without orderFromMenu → treat as master on
  if (raw?.orderFromMenu === undefined && raw?.enabled === true) {
    merged.orderFromMenu = true;
  }
  merged.orderFromMenu = Boolean(merged.orderFromMenu);
  merged.tableOrderingEnabled = Boolean(merged.tableOrderingEnabled);
  merged.deliveryEnabled = Boolean(merged.deliveryEnabled);
  merged.zonesIndoorOutdoor = Boolean(merged.zonesIndoorOutdoor);
  merged.cashierScreen = Boolean(merged.cashierScreen);
  merged.kitchenScreen = Boolean(merged.kitchenScreen);
  merged.baristaScreen = Boolean(merged.baristaScreen);
  merged.posEnabled = Boolean(merged.posEnabled);
  merged.staffAccountsEnabled = Boolean(merged.staffAccountsEnabled);
  merged.inventoryEnabled = Boolean(merged.inventoryEnabled);
  merged.multiBranchEnabled = Boolean(merged.multiBranchEnabled);
  merged.guestNoteEnabled = merged.guestNoteEnabled !== false;
  const max = Number(merged.maxItemsPerOrder);
  merged.maxItemsPerOrder =
    Number.isFinite(max) && max > 0 ? Math.min(200, Math.floor(max)) : 50;
  // Mirror master onto legacy enabled
  merged.enabled = merged.orderFromMenu;
  return merged;
}

export function isOrderingEnabled(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu;
}

export function hasTableOrdering(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu && f.tableOrderingEnabled;
}

export function hasDeliveryOrdering(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu && f.deliveryEnabled;
}

export function hasAnyOrderChannel(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  return hasTableOrdering(ext) || hasDeliveryOrdering(ext);
}

export function hasPos(ext?: Partial<OrderingFeatures> | null): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu && f.posEnabled;
}

export function hasStaffAccounts(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  return normalizeOrderingFeatures(ext).staffAccountsEnabled;
}

export function hasInventory(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu && f.inventoryEnabled;
}

export function hasMultiBranch(
  ext?: Partial<OrderingFeatures> | null
): boolean {
  const f = normalizeOrderingFeatures(ext);
  return f.orderFromMenu && f.multiBranchEnabled;
}
