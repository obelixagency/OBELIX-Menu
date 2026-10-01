import { NextRequest, NextResponse } from "next/server";
import { readBrand } from "@/lib/brand";
import { listContacts } from "@/lib/menu-data";
import {
  buildWhatsAppOrderText,
  waMeUrl,
} from "@/lib/commerce";
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
  const brand = await readBrand();
  const view = publicOrderView(order);
  const contacts = await listContacts();
  const wa = contacts.find((c) => c.type === "whatsapp" && c.active);
  const text = buildWhatsAppOrderText({
    locale: "ar",
    storeName: brand.displayName,
    code: order.code,
    channel: order.channel,
    lines: order.lines,
    grandTotal: order.totals.grandTotal,
    currency: brand.currency || "EGP",
    where:
      order.delivery?.addressLine ||
      order.tableLabel ||
      (order.channel === "pickup" ? "استلام من الفرع" : ""),
  });
  const whatsappUrl = wa ? waMeUrl(wa.value, text) : null;
  return NextResponse.json(
    {
      order: view,
      currency: brand.currency || "EGP",
      taxNumber: brand.taxNumber || null,
      whatsappUrl,
    },
    { headers: noStoreHeaders() }
  );
}
