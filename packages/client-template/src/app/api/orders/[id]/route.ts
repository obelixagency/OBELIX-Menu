import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import type { OrderStatus } from "@/lib/extensions/ordering";
import {
  getOrderById,
  noStoreHeaders,
  updateOrderStatus,
} from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json(
      { error: "غير موجود" },
      { status: 404, headers: noStoreHeaders() }
    );
  }
  return NextResponse.json({ order }, { headers: noStoreHeaders() });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const status = body.status as OrderStatus;
    const role = (body.role as "owner" | "cashier" | "station") || "owner";
    if (!status) {
      return NextResponse.json(
        { error: "الحالة مطلوبة" },
        { status: 400, headers: noStoreHeaders() }
      );
    }
    const order = await updateOrderStatus(id, status, role);
    return NextResponse.json({ order }, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
