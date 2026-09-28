import { NextRequest, NextResponse } from "next/server";
import {
  checkOrderRateLimit,
  getOrderByCode,
  noStoreHeaders,
  publicOrderView,
} from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

/** Guest status lookup by order code */
export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkOrderRateLimit(`status:${ip}`)) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر دقيقة" },
      { status: 429, headers: noStoreHeaders() }
    );
  }

  const code = new URL(req.url).searchParams.get("code") || "";
  if (!code.trim()) {
    return NextResponse.json(
      { error: "كود الطلب مطلوب" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  const order = await getOrderByCode(code);
  if (!order) {
    return NextResponse.json(
      { error: "الطلب غير موجود" },
      { status: 404, headers: noStoreHeaders() }
    );
  }
  return NextResponse.json(
    { order: publicOrderView(order) },
    { headers: noStoreHeaders() }
  );
}
