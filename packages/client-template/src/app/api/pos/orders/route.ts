import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { createPosOrder, noStoreHeaders } from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner" && role !== "cashier") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  try {
    const body = await req.json();
    const order = await createPosOrder({
      tableId: body.tableId || null,
      guestNote: body.guestNote,
      paymentMethod: body.paymentMethod,
      lines: body.lines || [],
    });
    return NextResponse.json(
      {
        order: {
          id: order.id,
          code: order.code,
          status: order.status,
          channel: order.channel,
          paymentMethod: order.paymentMethod,
          totals: order.totals,
          createdAt: order.createdAt,
        },
      },
      { status: 201, headers: noStoreHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
