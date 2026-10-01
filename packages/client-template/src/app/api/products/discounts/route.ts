import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { applyProductDiscounts } from "@/lib/menu-data";
import type { DiscountType } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const ids = Array.isArray(body.productIds) ? body.productIds : [];
    if (!ids.length) {
      return NextResponse.json({ error: "اختر منتجات" }, { status: 400 });
    }
    const discountType = (body.discountType || null) as DiscountType;
    const products = await applyProductDiscounts(
      ids.map(String),
      discountType,
      Number(body.discountValue) || 0
    );
    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
