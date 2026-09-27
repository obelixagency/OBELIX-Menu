import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/menu-data";

export async function GET() {
  const products = await listProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { error: "الاسم والسعر مطلوبان" },
        { status: 400 }
      );
    }
    const product = await createProduct({
      categoryId: body.categoryId || "",
      name: body.name,
      nameEn: body.nameEn,
      description: body.description,
      descriptionEn: body.descriptionEn,
      price: Number(body.price),
      discountType: body.discountType ?? null,
      discountValue: body.discountValue ?? 0,
      image: body.image ?? null,
      available: body.available ?? true,
      featured: body.featured ?? false,
      sortOrder: body.sortOrder ?? 0,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
