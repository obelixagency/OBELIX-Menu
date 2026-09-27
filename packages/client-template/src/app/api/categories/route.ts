import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createCategory,
  listCategories,
} from "@/lib/menu-data";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    const category = await createCategory({
      name: body.name,
      nameEn: body.nameEn,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      active: body.active ?? true,
      discountType: body.discountType ?? null,
      discountValue: body.discountValue ?? 0,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
