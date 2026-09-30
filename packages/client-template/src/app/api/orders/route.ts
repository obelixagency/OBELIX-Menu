import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import type { OrderChannel, OrderStatus, Station } from "@/lib/extensions/ordering";
import {
  checkOrderRateLimit,
  createOrder,
  listOrders,
  noStoreHeaders,
} from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const channel = url.searchParams.get("channel") as OrderChannel | null;
  const since = url.searchParams.get("since") || undefined;
  const station = url.searchParams.get("station") as Station | null;
  const openOnly = url.searchParams.get("open") === "1";

  let status: OrderStatus | OrderStatus[] | undefined;
  if (statusParam) {
    status = statusParam.split(",") as OrderStatus[];
  }

  const orders = await listOrders({
    status,
    channel: channel || undefined,
    since,
    station: station || undefined,
    openOnly,
  });

  return NextResponse.json({ orders }, { headers: noStoreHeaders() });
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkOrderRateLimit(ip)) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر دقيقة" },
      { status: 429, headers: noStoreHeaders() }
    );
  }

  try {
    const body = await req.json();
    const order = await createOrder({
      channel: body.channel,
      tableId: body.tableId,
      zoneId: body.zoneId,
      delivery: body.delivery,
      guestNote: body.guestNote,
      lines: body.lines || [],
      website: body.website,
      branchId: body.branchId,
    });
    return NextResponse.json(
      {
        order: {
          id: order.id,
          code: order.code,
          status: order.status,
          channel: order.channel,
          totals: order.totals,
          createdAt: order.createdAt,
        },
        trackUrl: `/order/${order.code}`,
      },
      { status: 201, headers: noStoreHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل إنشاء الطلب";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
