export type BrandColors = {
  primary: string;
  accent: string;
  surface: string;
};

export type LanguageMode = "ar" | "en" | "both";

/** Agency-controlled ordering feature flags (exported into client brand.json) */
export type OrderingFeatures = {
  orderFromMenu: boolean;
  tableOrderingEnabled: boolean;
  deliveryEnabled: boolean;
  zonesIndoorOutdoor: boolean;
  cashierScreen: boolean;
  kitchenScreen: boolean;
  baristaScreen: boolean;
  /** Full POS sell screen — requires orderFromMenu */
  posEnabled: boolean;
  /** Multi-user staff logins on the client package */
  staffAccountsEnabled: boolean;
  /** Track stock and deduct on orders */
  inventoryEnabled: boolean;
  /** Shared catalog with per-branch stock & prices */
  multiBranchEnabled: boolean;
  /** Purchasing, suppliers, lightweight accounting — independent of POS/menu */
  purchasingEnabled: boolean;
  guestNoteEnabled?: boolean;
  maxItemsPerOrder?: number;
};

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
  purchasingEnabled: false,
  guestNoteEnabled: true,
  maxItemsPerOrder: 50,
};

export function normalizeOrderingFeatures(
  raw?: Partial<OrderingFeatures> | null
): OrderingFeatures {
  return {
    ...DEFAULT_ORDERING_FEATURES,
    ...raw,
    orderFromMenu: Boolean(raw?.orderFromMenu),
    tableOrderingEnabled: Boolean(raw?.tableOrderingEnabled),
    deliveryEnabled: Boolean(raw?.deliveryEnabled),
    zonesIndoorOutdoor: Boolean(raw?.zonesIndoorOutdoor),
    cashierScreen: Boolean(raw?.cashierScreen),
    kitchenScreen: Boolean(raw?.kitchenScreen),
    baristaScreen: Boolean(raw?.baristaScreen),
    posEnabled: Boolean(raw?.posEnabled),
    staffAccountsEnabled: Boolean(raw?.staffAccountsEnabled),
    inventoryEnabled: Boolean(raw?.inventoryEnabled),
    multiBranchEnabled: Boolean(raw?.multiBranchEnabled),
    purchasingEnabled: Boolean(raw?.purchasingEnabled),
    guestNoteEnabled: raw?.guestNoteEnabled !== false,
    maxItemsPerOrder:
      Number(raw?.maxItemsPerOrder) > 0
        ? Math.min(200, Math.floor(Number(raw?.maxItemsPerOrder)))
        : 50,
  };
}

export type ClientRecord = {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logoPath: string | null;
  colors: BrandColors;
  font: string;
  currency: string;
  domain: string;
  dashboardPassword: string;
  languages: LanguageMode;
  menuBackgroundPath: string | null;
  ordering: OrderingFeatures;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  lastExportedAt: string | null;
  packagePath: string | null;
};

export type CreateClientInput = {
  name: string;
  slug: string;
  displayName?: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor?: string;
  font?: string;
  currency?: string;
  domain?: string;
  dashboardPassword?: string;
  languages?: LanguageMode;
  ordering?: Partial<OrderingFeatures>;
};
