import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPos, normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { listCategories, listProducts } from "@/lib/menu-data";
import { listTables, noStoreHeaders } from "@/lib/ordering-data";
import {
  priceAfterDiscount,
  resolveDiscount,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const brand = await readBrand();
  if (!hasPos(brand.extensions?.ordering)) {
    return NextResponse.json(
      { error: "POS disabled" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const [categories, products, tables] = await Promise.all([
    listCategories(),
    listProducts(),
    features.tableOrderingEnabled ? listTables() : Promise.resolve([]),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const catalog = products
    .filter((p) => p.available)
    .map((p) => {
      const cat = p.categoryId ? catMap.get(p.categoryId) : null;
      const discount = resolveDiscount(p, cat || undefined);
      const pricing = priceAfterDiscount(p.price, discount);
      return {
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        nameEn: p.nameEn || p.name,
        price: pricing.final,
        image: p.image,
      };
    });

  const cats = categories
    .filter((c) => c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn || c.name,
      parentId: c.parentId,
    }));

  return NextResponse.json(
    {
      brand: {
        displayName: brand.displayName,
        logoUrl: brand.logoUrl,
        colors: brand.colors,
        currency: brand.currency || "EGP",
        languages: brand.languages || "both",
      },
      features: {
        tableOrderingEnabled: features.tableOrderingEnabled,
      },
      categories: cats,
      products: catalog,
      tables: tables
        .filter((t) => t.active)
        .map((t) => ({
          id: t.id,
          label: t.label,
          labelAr: t.labelAr || t.label,
        })),
    },
    { headers: noStoreHeaders() }
  );
}
