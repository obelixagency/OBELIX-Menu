import type { OrderingExtension } from "./extensions/ordering";
import type { PaymentsConfig } from "./payments";
export type {
  OrderingExtension,
  OrderingFeatures,
  OrderChannel,
  OrderStatus,
  Station,
} from "./extensions/ordering";

export type LanguageMode = "ar" | "en" | "both";

/** percent = % off · price = new shelf price · fixed = legacy amount-off */
export type DiscountType = "percent" | "price" | "fixed" | null;

export type OptionPriceMode = "replace" | "delta";

export type ProductOptionValue = {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  nameEn?: string;
  required: boolean;
  priceMode: OptionPriceMode;
  values: ProductOptionValue[];
};

export type OptionSelection = { groupId: string; valueId: string };

export type ContactType =
  | "whatsapp"
  | "phone"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "email"
  | "maps";

export type BrandConfig = {
  displayName: string;
  slug: string;
  logoUrl: string | null;
  colors: {
    primary: string;
    accent: string;
    surface: string;
  };
  font: string;
  currency: string;
  domain: string;
  dashboardPassword: string;
  languages: LanguageMode;
  /** Where Rate Form submissions are emailed (optional) */
  notificationEmail?: string | null;
  /** Optional full-bleed public menu background image URL */
  menuBackgroundUrl?: string | null;
  /** Short line under the name on the public menu */
  slogan?: string | null;
  sloganEn?: string | null;
  /** VAT / sales tax percent shown on menu + receipt */
  taxPercent?: number;
  /** When true, shelf prices already include tax */
  taxInclusive?: boolean;
  /** Printed on receipts (KSA/UAE/EG tax number) */
  taxNumber?: string | null;
  extensions: {
    ordering: OrderingExtension;
    /** Gateway-agnostic online payments slot — inactive until provider credentials */
    payments?: PaymentsConfig;
  };
};

export type Category = {
  id: string;
  name: string;
  nameEn?: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  discountType?: DiscountType;
  discountValue?: number;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  discountType?: DiscountType;
  discountValue?: number;
  image: string | null;
  available: boolean;
  featured: boolean;
  sortOrder: number;
  optionGroups?: ProductOptionGroup[];
  /** Combo / meal: component SKUs deducted from inventory */
  comboItems?: { productId: string; qty: number }[];
  /** Show spicy / no-onion / doneness chips */
  prepEnabled?: boolean;
  /** Optional visibility window (Ramadan / timed offer) */
  offerFrom?: string | null;
  offerUntil?: string | null;
};

export type Contact = {
  id: string;
  type: ContactType;
  label?: string;
  value: string;
  active: boolean;
};

/** Rate Form submission (v1) — also accepts legacy simple reviews */
export type Review = {
  id: string;
  createdAt: string;
  visible: boolean;
  // Rate Form fields
  firstVisit?: boolean;
  overall?: number;
  hygiene?: number;
  taste?: number;
  comeBack?: boolean;
  anythingElse?: string;
  name?: string;
  mobile?: string;
  email?: string;
  heardAbout?: string;
  // Legacy simple review
  rating?: number;
  comment?: string;
  productId?: string | null;
};

export type Banner = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type MenuData = {
  categories: Category[];
  products: Product[];
  contacts: Contact[];
  reviews: Review[];
  banners: Banner[];
  meta?: {
    promoEnabled?: boolean;
    [key: string]: unknown;
  };
};

export function resolveDiscount(
  product: Product,
  category?: Category | null
): { type: "percent" | "price" | "fixed"; value: number } | null {
  if (product.discountType && product.discountValue != null && product.discountValue > 0) {
    return { type: product.discountType, value: product.discountValue };
  }
  if (
    category?.discountType &&
    category.discountValue != null &&
    category.discountValue > 0
  ) {
    return { type: category.discountType, value: category.discountValue };
  }
  return null;
}

export function priceAfterDiscount(
  price: number,
  discount: { type: "percent" | "price" | "fixed"; value: number } | null
): { original: number; final: number; hasDiscount: boolean } {
  if (!discount) return { original: price, final: price, hasDiscount: false };
  let final = price;
  if (discount.type === "percent") {
    final = price * (1 - discount.value / 100);
  } else if (discount.type === "price") {
    final = discount.value;
  } else {
    final = price - discount.value;
  }
  final = Math.max(0, Math.round(final * 100) / 100);
  return { original: price, final, hasDiscount: final < price - 0.001 };
}

export function configuredBasePrice(
  product: Product,
  selections: OptionSelection[] = []
): number {
  let price = Number(product.price) || 0;
  const groups = product.optionGroups || [];
  const map = new Map(selections.map((s) => [s.groupId, s.valueId]));
  for (const g of groups) {
    const vid = map.get(g.id);
    const val = g.values.find((v) => v.id === vid);
    if (!val) continue;
    if (g.priceMode === "replace") price = Number(val.price) || 0;
    else price += Number(val.price) || 0;
  }
  return Math.max(0, Math.round(price * 100) / 100);
}

export function missingRequiredOptions(
  product: Product,
  selections: OptionSelection[] = []
): ProductOptionGroup[] {
  const map = new Map(selections.map((s) => [s.groupId, s.valueId]));
  return (product.optionGroups || []).filter((g) => {
    if (!g.required) return false;
    const vid = map.get(g.id);
    return !g.values.some((v) => v.id === vid);
  });
}

export function optionLabels(
  product: Product,
  selections: OptionSelection[] = [],
  locale: "ar" | "en" = "ar"
): string[] {
  const map = new Map(selections.map((s) => [s.groupId, s.valueId]));
  const out: string[] = [];
  for (const g of product.optionGroups || []) {
    const val = g.values.find((v) => v.id === map.get(g.id));
    if (!val) continue;
    out.push(locale === "en" ? val.nameEn || val.name : val.name);
  }
  return out;
}

export function lineKey(
  itemId: string,
  selections: OptionSelection[] = [],
  prep: string[] = []
) {
  const part = [...selections]
    .map((s) => `${s.groupId}:${s.valueId}`)
    .sort()
    .join("|");
  const p = [...prep].sort().join(",");
  if (!part && !p) return itemId;
  return `${itemId}::${part}::${p}`;
}

export function reviewOverall(r: Review): number {
  return r.overall ?? r.rating ?? 0;
}
