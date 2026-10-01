import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createBanner, isPromoEnabled, listBanners, setPromoEnabled } from "@/lib/menu-data";

export async function GET() {
  const [banners, promoEnabled] = await Promise.all([
    listBanners(),
    isPromoEnabled(),
  ]);
  return NextResponse.json({
    banners: promoEnabled ? banners.filter((b) => b.active) : [],
    all: banners,
    promoEnabled,
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const body = await req.json();
  if (typeof body.promoEnabled === "boolean") {
    await setPromoEnabled(body.promoEnabled);
  }
  const [banners, promoEnabled] = await Promise.all([
    listBanners(),
    isPromoEnabled(),
  ]);
  return NextResponse.json({ all: banners, promoEnabled });
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
