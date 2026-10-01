import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bookmark,
  ChefHat,
  Coffee,
  Contact,
  FolderTree,
  Home,
  ImageIcon,
  LayoutGrid,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export type DashRole = string;

export type DashFlags = {
  orderingOn: boolean;
  tableOn: boolean;
  stationsOn: boolean;
  staffOn: boolean;
  inventoryOn: boolean;
  purchasingOn: boolean;
  branchesOn: boolean;
  deliveryOn: boolean;
  cashierOn: boolean;
  kitchenOn: boolean;
  barOn: boolean;
  posOn: boolean;
};

export type DashNavItem = {
  href: string;
  key: string;
  ar: string;
  en: string;
  icon: LucideIcon;
  frozen?: boolean;
  show: (flags: DashFlags, isOwner: boolean, role: DashRole) => boolean;
};

export type DashNavGroup = {
  key: string;
  ar: string;
  en: string;
  items: DashNavItem[];
};

export const DASH_NAV: DashNavGroup[] = [
  {
    key: "overview",
    ar: "نظرة",
    en: "Overview",
    items: [
      {
        href: "/dashboard",
        key: "home",
        ar: "الرئيسية",
        en: "Home",
        icon: Home,
        show: (_f, isOwner) => isOwner,
      },
    ],
  },
  {
    key: "menu",
    ar: "المنيو",
    en: "Menu",
    items: [
      {
        href: "/dashboard/categories",
        key: "categories",
        ar: "الفئات",
        en: "Categories",
        icon: FolderTree,
        show: (_f, isOwner) => isOwner,
      },
      {
        href: "/dashboard/products",
        key: "products",
        ar: "المنتجات",
        en: "Products",
        icon: UtensilsCrossed,
        show: (_f, isOwner) => isOwner,
      },
      {
        href: "/dashboard/banners",
        key: "banners",
        ar: "العروض",
        en: "Banners",
        icon: ImageIcon,
        show: (_f, isOwner) => isOwner,
      },
      {
        href: "/dashboard/delivery",
        key: "delivery",
        ar: "التوصيل",
        en: "Delivery",
        icon: Truck,
        show: (f, isOwner) => isOwner && f.deliveryOn,
      },
    ],
  },
  {
    key: "guests",
    ar: "الضيوف",
    en: "Guests",
    items: [
      {
        href: "/dashboard/contacts",
        key: "contacts",
        ar: "التواصل",
        en: "Contacts",
        icon: Contact,
        show: (_f, isOwner) => isOwner,
      },
      {
        href: "/dashboard/reviews",
        key: "reviews",
        ar: "التقييمات",
        en: "Reviews",
        icon: Star,
        show: (_f, isOwner) => isOwner,
      },
    ],
  },
  {
    key: "sales",
    ar: "المبيعات",
    en: "Sales",
    items: [
      {
        href: "/dashboard/orders",
        key: "orders",
        ar: "الطلبات",
        en: "Orders",
        icon: ShoppingBag,
        show: (f, isOwner, role) =>
          f.orderingOn && (isOwner || role === "cashier"),
      },
      {
        href: "/dashboard/sales",
        key: "sales",
        ar: "المبيعات",
        en: "Sales",
        icon: BarChart3,
        show: (f, isOwner) => isOwner && f.orderingOn,
      },
    ],
  },
  {
    key: "floor",
    ar: "الصالة",
    en: "Floor",
    items: [
      {
        href: "/dashboard/tables",
        key: "tables",
        ar: "الطاولات",
        en: "Tables",
        icon: LayoutGrid,
        show: (f, isOwner) => isOwner && f.tableOn,
      },
      {
        href: "/dashboard/stations",
        key: "stations",
        ar: "المحطات",
        en: "Stations",
        icon: Bookmark,
        show: (f, isOwner) => isOwner && f.stationsOn,
      },
      {
        href: "/dashboard/staff",
        key: "staff",
        ar: "الموظفون",
        en: "Staff",
        icon: Users,
        show: (f, isOwner) => isOwner && f.staffOn,
      },
    ],
  },
  {
    key: "stock",
    ar: "المخزون",
    en: "Stock",
    items: [
      {
        href: "/dashboard/inventory",
        key: "inventory",
        ar: "المخزون",
        en: "Inventory",
        icon: Package,
        show: (f, isOwner) => isOwner && f.inventoryOn,
      },
      {
        href: "/dashboard/purchasing",
        key: "purchasing",
        ar: "المشتريات",
        en: "Purchasing",
        icon: Truck,
        show: (f, isOwner) => isOwner && f.purchasingOn,
      },
    ],
  },
  {
    key: "org",
    ar: "المنشأة",
    en: "Venue",
    items: [
      {
        href: "/dashboard/branches",
        key: "branches",
        ar: "الفروع",
        en: "Branches",
        icon: MapPin,
        show: (f, isOwner) => isOwner && f.branchesOn,
      },
      {
        href: "/dashboard/settings",
        key: "settings",
        ar: "الإعدادات",
        en: "Settings",
        icon: Settings,
        show: (_f, isOwner) => isOwner,
      },
    ],
  },
  {
    key: "ops",
    ar: "التشغيل",
    en: "Live ops",
    items: [
      {
        href: "/cashier",
        key: "cashier",
        ar: "الكاشير",
        en: "Cashier",
        icon: Wallet,
        show: (f, isOwner, role) =>
          f.cashierOn && (isOwner || role === "cashier"),
      },
      {
        href: "/kitchen",
        key: "kitchen",
        ar: "المطبخ",
        en: "Kitchen",
        icon: ChefHat,
        show: (f, isOwner, role) =>
          f.kitchenOn && (isOwner || role === "kitchen"),
      },
      {
        href: "/bar",
        key: "bar",
        ar: "البار",
        en: "Bar",
        icon: Coffee,
        show: (f, isOwner, role) =>
          f.barOn && (isOwner || role === "barista"),
      },
      {
        href: "/dashboard/shifts",
        key: "shifts",
        ar: "الورديات",
        en: "Shifts",
        icon: Store,
        show: (f, isOwner, role) =>
          f.posOn && (isOwner || role === "cashier"),
      },
      {
        href: "/pos",
        key: "pos",
        ar: "نقطة البيع",
        en: "POS",
        icon: ShoppingCart,
        frozen: true,
        show: (f, isOwner, role) =>
          f.posOn && (isOwner || role === "cashier"),
      },
    ],
  },
];

export function labelOf(
  item: { ar: string; en: string },
  locale: Locale
): string {
  return locale === "en" ? item.en : item.ar;
}

export function visibleGroups(
  flags: DashFlags,
  isOwner: boolean,
  role: DashRole
): DashNavGroup[] {
  return DASH_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.show(flags, isOwner, role)),
  })).filter((g) => g.items.length > 0);
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function mobilePrimaryTabs(
  flags: DashFlags,
  locale: Locale
): { href: string; ar: string; en: string; icon: LucideIcon }[] {
  const ordersHref = flags.orderingOn
    ? "/dashboard/orders"
    : "/dashboard/categories";
  const salesHref = flags.orderingOn
    ? "/dashboard/sales"
    : "/dashboard/banners";
  return [
    { href: "/dashboard", ar: "الرئيسية", en: "Home", icon: Home },
    {
      href: ordersHref,
      ar: flags.orderingOn ? "طلبات" : "فئات",
      en: flags.orderingOn ? "Orders" : "Cats",
      icon: flags.orderingOn ? ShoppingBag : FolderTree,
    },
    {
      href: "/dashboard/products",
      ar: "منتجات",
      en: "Items",
      icon: UtensilsCrossed,
    },
    {
      href: salesHref,
      ar: flags.orderingOn ? "مبيعات" : "عروض",
      en: flags.orderingOn ? "Sales" : "Offers",
      icon: flags.orderingOn ? BarChart3 : ImageIcon,
    },
  ].map((t) => ({ ...t, label: locale === "en" ? t.en : t.ar }));
}
