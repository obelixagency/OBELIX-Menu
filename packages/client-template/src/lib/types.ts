import type { OrderingExtension } from "./extensions/ordering";

export type LanguageMode = "ar" | "en" | "both";

export type DiscountType = "percent" | "fixed" | null;

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
  extensions: {
    ordering: OrderingExtension;
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
};

export type MenuData = {
  categories: Category[];
  products: Product[];
  contacts: Contact[];
  reviews: Review[];
  banners: Banner[];
  meta?: Record<string, unknown>;
};

export function resolveDiscount(
  product: Product,
  category?: Category | null
): { type: "percent" | "fixed"; value: number } | null {
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
  discount: { type: "percent" | "fixed"; value: number } | null
): { original: number; final: number; hasDiscount: boolean } {
  if (!discount) return { original: price, final: price, hasDiscount: false };
  let final =
    discount.type === "percent"
      ? price * (1 - discount.value / 100)
      : price - discount.value;
  final = Math.max(0, Math.round(final * 100) / 100);
  return { original: price, final, hasDiscount: final < price };
}

export function reviewOverall(r: Review): number {
  return r.overall ?? r.rating ?? 0;
}
