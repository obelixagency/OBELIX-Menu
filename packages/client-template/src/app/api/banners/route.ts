import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createBanner, listBanners } from "@/lib/menu-data";

export async function GET() {
  const banners = await listBanners();
  return NextResponse.json({
    banners: banners.filter((b) => b.active),
    all: banners,
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.imageUrl) {
      return NextResponse.json({ error: "الصورة مطلوبة" }, { status: 400 });
    }
    const banner = await createBanner({
      imageUrl: body.imageUrl,
      sortOrder: body.sortOrder,
      active: body.active ?? true,
    });
    return NextResponse.json({ banner }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
