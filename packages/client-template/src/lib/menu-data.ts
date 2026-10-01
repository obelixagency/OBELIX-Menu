import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Category,
  Contact,
  MenuData,
  Product,
  Review,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const MENU_FILE = path.join(DATA_DIR, "menu.json");

const SEED: MenuData = {
  categories: [
    {
      id: "cat-drinks",
      name: "مشروبات",
      nameEn: "Drinks",
      parentId: null,
      sortOrder: 1,
      active: true,
    },
    {
      id: "cat-hot",
      name: "مشروبات ساخنة",
      nameEn: "Hot Drinks",
      parentId: "cat-drinks",
      sortOrder: 1,
      active: true,
      discountType: "percent",
      discountValue: 10,
    },
    {
      id: "cat-cold",
      name: "مشروبات باردة",
      nameEn: "Cold Drinks",
      parentId: "cat-drinks",
      sortOrder: 2,
      active: true,
    },
    {
      id: "cat-food",
      name: "أكل",
      nameEn: "Food",
      parentId: null,
      sortOrder: 2,
      active: true,
    },
    {
      id: "cat-breakfast",
      name: "فطور",
      nameEn: "Breakfast",
      parentId: "cat-food",
      sortOrder: 1,
      active: true,
    },
    {
      id: "cat-sweets",
      name: "حلويات",
      nameEn: "Desserts",
      parentId: "cat-food",
      sortOrder: 2,
      active: true,
    },
  ],
  products: [
    {
      id: "p1",
      categoryId: "cat-hot",
      name: "إسبريسو",
      nameEn: "Espresso",
      description: "شوت مزدوج من بن محمّص يومياً",
      descriptionEn: "Double shot of freshly roasted beans",
      price: 45,
      discountType: "fixed",
      discountValue: 5,
      image: null,
      available: true,
      featured: true,
      sortOrder: 1,
    },
    {
      id: "p2",
      categoryId: "cat-hot",
      name: "كابتشينو",
      nameEn: "Cappuccino",
      description: "رغوة حليب كثيفة مع إسبريسو",
      descriptionEn: "Dense milk foam with espresso",
      price: 60,
      image: null,
      available: true,
      featured: true,
      sortOrder: 2,
    },
    {
      id: "p3",
      categoryId: "cat-hot",
      name: "قهوة تركي",
      nameEn: "Turkish Coffee",
      description: "على الرمل، سادة أو مضبوطة أو زيادة",
      descriptionEn: "Sand-brewed, plain or sweet",
      price: 35,
      image: null,
      available: true,
      featured: false,
      sortOrder: 3,
    },
    {
      id: "p4",
      categoryId: "cat-hot",
      name: "شاي كشري بالنعناع",
      nameEn: "Mint Koshary Tea",
      description: "شاي ثقيل زي البيوت",
      descriptionEn: "Strong house-style tea with mint",
      price: 25,
      image: null,
      available: true,
      featured: false,
      sortOrder: 4,
    },
    {
      id: "p6",
      categoryId: "cat-cold",
      name: "آيس لاتيه",
      nameEn: "Iced Latte",
      description: "لاتيه مثلّج — مناسب لحرّ القاهرة",
      descriptionEn: "Iced latte for Cairo heat",
      price: 70,
      image: null,
      available: true,
      featured: true,
      sortOrder: 1,
    },
    {
      id: "p8",
      categoryId: "cat-cold",
      name: "عصير مانجو بلدي",
      nameEn: "Fresh Mango",
      description: "مانجو إسماعيلية بدون سكر مضاف",
      descriptionEn: "Ismailia mango, no added sugar",
      price: 55,
      image: null,
      available: true,
      featured: false,
      sortOrder: 2,
    },
    {
      id: "p10",
      categoryId: "cat-breakfast",
      name: "فول بزيت الزيتون",
      nameEn: "Foul",
      description: "فول مدمس مع زيت زيتون وكمون",
      descriptionEn: "Fava beans with olive oil and cumin",
      price: 45,
      image: null,
      available: true,
      featured: false,
      sortOrder: 1,
    },
    {
      id: "p12",
      categoryId: "cat-breakfast",
      name: "كرواسون زبدة",
      nameEn: "Butter Croissant",
      description: "طازج من الفرن كل صباح",
      descriptionEn: "Fresh from the oven every morning",
      price: 50,
      discountType: "percent",
      discountValue: 15,
      image: null,
      available: true,
      featured: true,
      sortOrder: 2,
    },
    {
      id: "p13",
      categoryId: "cat-sweets",
      name: "بسبوسة بالقشطة",
      nameEn: "Basbousa",
      description: "بسبوسة بيتية غنية بالسمن",
      descriptionEn: "Homestyle basbousa with cream",
      price: 40,
      image: null,
      available: true,
      featured: true,
      sortOrder: 1,
    },
    {
      id: "p14",
      categoryId: "cat-sweets",
      name: "كنافة بالقشطة",
      nameEn: "Kunafa",
      description: "حصة فردية — سخنة عند الطلب",
      descriptionEn: "Single portion — hot on request",
      price: 65,
      image: null,
      available: true,
      featured: false,
      sortOrder: 2,
    },
  ],
  contacts: [
    {
      id: "c-wa",
      type: "whatsapp",
      label: "واتساب",
      value: "201000000000",
      active: true,
    },
    {
      id: "c-ig",
      type: "instagram",
      label: "Instagram",
      value: "https://instagram.com/qahwa_elbeit",
      active: true,
    },
    {
      id: "c-phone",
      type: "phone",
      label: "تليفون",
      value: "+201000000000",
      active: true,
    },
  ],
  reviews: [
    {
      id: "r1",
      createdAt: "2026-09-20T10:00:00.000Z",
      visible: true,
      firstVisit: false,
      overall: 5,
      hygiene: 4.5,
      taste: 5,
      comeBack: true,
      anythingElse: "قهوة ممتازة وأجواء هادية — رجّع تاني أكيد",
      name: "أحمد",
      mobile: "01000000000",
      email: "ahmed@example.com",
      heardAbout: "Instagram",
      rating: 5,
      comment: "قهوة ممتازة وأجواء هادية — رجّع تاني أكيد",
      productId: "p1",
    },
    {
      id: "r2",
      createdAt: "2026-09-22T14:30:00.000Z",
      visible: true,
      firstVisit: true,
      overall: 4,
      hygiene: 4,
      taste: 4.5,
      comeBack: true,
      anythingElse: "البسبوسة طعم بيوت، والسعر مناسب",
      name: "سارة",
      mobile: "01100000000",
      email: "",
      heardAbout: "صديق",
      rating: 4,
      comment: "البسبوسة طعم بيوت، والسعر مناسب",
      productId: "p13",
    },
  ],
  banners: [],
  meta: {
    cafe: "قهوة البيت",
    city: "القاهرة",
    note: "منيو تجريبي عربي حقيقي لـ OBELIX Menu v1",
  },
};

function normalizeMenu(raw: Partial<MenuData> & { categories?: Category[] }): MenuData {
  const categories = (raw.categories || []).map((c) => ({
    ...c,
    parentId: c.parentId ?? null,
    discountType: c.discountType ?? null,
    discountValue: c.discountValue ?? 0,
  }));
  const products = (raw.products || []).map((p) => ({
    ...p,
    discountType: p.discountType ?? null,
    discountValue: p.discountValue ?? 0,
    optionGroups: Array.isArray(p.optionGroups) ? p.optionGroups : [],
    comboItems: Array.isArray(p.comboItems) ? p.comboItems : [],
    prepEnabled: Boolean(p.prepEnabled),
    offerFrom: p.offerFrom || null,
    offerUntil: p.offerUntil || null,
  }));
  return {
    categories,
    products,
    contacts: raw.contacts || [],
    reviews: raw.reviews || [],
    banners: (raw.banners || []).map((b) => ({
      ...b,
      startsAt: b.startsAt || null,
      endsAt: b.endsAt || null,
    })),
    meta: {
      ...(raw.meta || {}),
      promoEnabled:
        typeof raw.meta?.promoEnabled === "boolean"
          ? raw.meta.promoEnabled
          : true,
    },
  };
}

async function ensureMenu(): Promise<MenuData> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(MENU_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<MenuData>;
    // Migrate old flat menus missing parentId/contacts/reviews
    const needsWrite =
      !Array.isArray(parsed.contacts) ||
      !Array.isArray(parsed.reviews) ||
      (parsed.categories || []).some((c) => c.parentId === undefined);
    const menu = normalizeMenu(parsed);
    if (needsWrite || !(parsed.categories || []).length) {
      // If empty or pre-v2 structure without nesting sample, keep user data but normalize
      if (!(parsed.categories || []).length) {
        await fs.writeFile(MENU_FILE, JSON.stringify(SEED, null, 2), "utf8");
        return SEED;
      }
      await saveMenu(menu);
    }
    return menu;
  } catch {
    await fs.writeFile(MENU_FILE, JSON.stringify(SEED, null, 2), "utf8");
    return SEED;
  }
}

async function saveMenu(menu: MenuData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MENU_FILE, JSON.stringify(menu, null, 2), "utf8");
}

export async function readMenu(): Promise<MenuData> {
  return ensureMenu();
}

export async function listCategories(): Promise<Category[]> {
  const menu = await ensureMenu();
  return [...menu.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listProducts(): Promise<Product[]> {
  const menu = await ensureMenu();
  return [...menu.products].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProduct(id: string): Promise<Product | null> {
  const menu = await ensureMenu();
  return menu.products.find((p) => p.id === id) ?? null;
}

export async function getCategory(id: string): Promise<Category | null> {
  const menu = await ensureMenu();
  return menu.categories.find((c) => c.id === id) ?? null;
}

export async function createCategory(
  input: Omit<Category, "id"> & { id?: string }
): Promise<Category> {
  const menu = await ensureMenu();
  const category: Category = {
    id: input.id || randomUUID(),
    name: input.name,
    nameEn: input.nameEn,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? menu.categories.length + 1,
    active: input.active ?? true,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
  };
  menu.categories.push(category);
  await saveMenu(menu);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Category>
): Promise<Category> {
  const menu = await ensureMenu();
  const idx = menu.categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("الفئة غير موجودة");
  // Prevent setting parent to self or descendant
  if (patch.parentId) {
    if (patch.parentId === id) throw new Error("لا يمكن جعل الفئة أباً لنفسها");
    const descendants = new Set<string>();
    const walk = (pid: string) => {
      for (const c of menu.categories) {
        if (c.parentId === pid) {
          descendants.add(c.id);
          walk(c.id);
        }
      }
    };
    walk(id);
    if (descendants.has(patch.parentId)) {
      throw new Error("لا يمكن نقل فئة تحت أحد أبنائها");
    }
  }
  menu.categories[idx] = { ...menu.categories[idx], ...patch, id };
  await saveMenu(menu);
  return menu.categories[idx];
}

export async function deleteCategory(id: string) {
  const menu = await ensureMenu();
  const toDelete = new Set<string>();
  const walk = (pid: string) => {
    toDelete.add(pid);
    for (const c of menu.categories) {
      if (c.parentId === pid) walk(c.id);
    }
  };
  walk(id);
  menu.categories = menu.categories.filter((c) => !toDelete.has(c.id));
  menu.products = menu.products.map((p) =>
    toDelete.has(p.categoryId) ? { ...p, categoryId: "" } : p
  );
  await saveMenu(menu);
}

export async function createProduct(
  input: Omit<Product, "id"> & { id?: string }
): Promise<Product> {
  const menu = await ensureMenu();
  const product: Product = {
    id: input.id || randomUUID(),
    categoryId: input.categoryId,
    name: input.name,
    nameEn: input.nameEn,
    description: input.description,
    descriptionEn: input.descriptionEn,
    price: Number(input.price),
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    image: input.image ?? null,
    available: input.available ?? true,
    featured: input.featured ?? false,
    sortOrder: input.sortOrder ?? menu.products.length + 1,
    optionGroups: input.optionGroups || [],
    comboItems: input.comboItems || [],
    prepEnabled: Boolean(input.prepEnabled),
    offerFrom: input.offerFrom || null,
    offerUntil: input.offerUntil || null,
  };
  menu.products.push(product);
  await saveMenu(menu);
  return product;
}

export async function updateProduct(
  id: string,
  patch: Partial<Product>
): Promise<Product> {
  const menu = await ensureMenu();
  const idx = menu.products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("المنتج غير موجود");
  menu.products[idx] = {
    ...menu.products[idx],
    ...patch,
    id,
    price:
      patch.price !== undefined
        ? Number(patch.price)
        : menu.products[idx].price,
  };
  await saveMenu(menu);
  return menu.products[idx];
}

export async function deleteProduct(id: string) {
  const menu = await ensureMenu();
  menu.products = menu.products.filter((p) => p.id !== id);
  await saveMenu(menu);
}

export async function listContacts(): Promise<Contact[]> {
  const menu = await ensureMenu();
  return menu.contacts;
}

export async function createContact(
  input: Omit<Contact, "id"> & { id?: string }
): Promise<Contact> {
  const menu = await ensureMenu();
  const contact: Contact = {
    id: input.id || randomUUID(),
    type: input.type,
    label: input.label,
    value: input.value,
    active: input.active ?? true,
  };
  menu.contacts.push(contact);
  await saveMenu(menu);
  return contact;
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>
): Promise<Contact> {
  const menu = await ensureMenu();
  const idx = menu.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("وسيلة التواصل غير موجودة");
  menu.contacts[idx] = { ...menu.contacts[idx], ...patch, id };
  await saveMenu(menu);
  return menu.contacts[idx];
}

export async function deleteContact(id: string) {
  const menu = await ensureMenu();
  menu.contacts = menu.contacts.filter((c) => c.id !== id);
  await saveMenu(menu);
}

export async function listReviews(): Promise<Review[]> {
  const menu = await ensureMenu();
  return [...menu.reviews].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function createReview(input: {
  firstVisit?: boolean;
  overall: number;
  hygiene: number;
  taste: number;
  comeBack?: boolean;
  anythingElse?: string;
  name?: string;
  mobile?: string;
  email?: string;
  heardAbout?: string;
}): Promise<Review> {
  const menu = await ensureMenu();
  const clamp = (n: number) =>
    Math.min(5, Math.max(0.5, Math.round(Number(n) * 2) / 2));
  const overall = clamp(input.overall);
  const hygiene = clamp(input.hygiene);
  const taste = clamp(input.taste);
  const review: Review = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    visible: true,
    firstVisit: Boolean(input.firstVisit),
    overall,
    hygiene,
    taste,
    comeBack: Boolean(input.comeBack),
    anythingElse: input.anythingElse?.trim() || "",
    name: input.name?.trim() || "",
    mobile: input.mobile?.trim() || "",
    email: input.email?.trim() || "",
    heardAbout: input.heardAbout?.trim() || "",
    // legacy mirrors for old UI bits
    rating: overall,
    comment: input.anythingElse?.trim() || "",
  };
  menu.reviews.push(review);
  await saveMenu(menu);
  return review;
}

export async function updateReview(
  id: string,
  patch: Partial<Review>
): Promise<Review> {
  const menu = await ensureMenu();
  const idx = menu.reviews.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("التقييم غير موجود");
  menu.reviews[idx] = { ...menu.reviews[idx], ...patch, id };
  await saveMenu(menu);
  return menu.reviews[idx];
}

export async function deleteReview(id: string) {
  const menu = await ensureMenu();
  menu.reviews = menu.reviews.filter((r) => r.id !== id);
  await saveMenu(menu);
}

export async function isPromoEnabled(): Promise<boolean> {
  const menu = await ensureMenu();
  return menu.meta?.promoEnabled !== false;
}

export async function setPromoEnabled(enabled: boolean) {
  const menu = await ensureMenu();
  menu.meta = { ...(menu.meta || {}), promoEnabled: enabled };
  await saveMenu(menu);
  return menu.meta;
}

export async function applyProductDiscounts(
  productIds: string[],
  discountType: Product["discountType"],
  discountValue: number
) {
  const menu = await ensureMenu();
  const set = new Set(productIds);
  menu.products = menu.products.map((p) =>
    set.has(p.id)
      ? {
          ...p,
          discountType: discountType || null,
          discountValue: discountType ? Number(discountValue) || 0 : 0,
        }
      : p
  );
  await saveMenu(menu);
  return menu.products.filter((p) => set.has(p.id));
}

export async function listBanners() {
  const menu = await ensureMenu();
  return [...menu.banners].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createBanner(input: {
  imageUrl: string;
  sortOrder?: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const menu = await ensureMenu();
  const banner = {
    id: randomUUID(),
    imageUrl: input.imageUrl,
    sortOrder: input.sortOrder ?? menu.banners.length + 1,
    active: input.active ?? true,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
  };
  menu.banners.push(banner);
  await saveMenu(menu);
  return banner;
}

export async function updateBanner(
  id: string,
  patch: Partial<{
    imageUrl: string;
    sortOrder: number;
    active: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }>
) {
  const menu = await ensureMenu();
  const idx = menu.banners.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("البانر غير موجود");
  menu.banners[idx] = { ...menu.banners[idx], ...patch, id };
  await saveMenu(menu);
  return menu.banners[idx];
}

export async function deleteBanner(id: string) {
  const menu = await ensureMenu();
  menu.banners = menu.banners.filter((b) => b.id !== id);
  await saveMenu(menu);
}

/** Category path from root → leaf */
export function categoryPath(
  categories: Category[],
  categoryId: string
): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: Category[] = [];
  let cur: Category | undefined = byId.get(categoryId);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function childrenOf(
  categories: Category[],
  parentId: string | null
): Category[] {
  return categories
    .filter((c) => (c.parentId ?? null) === parentId && c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
