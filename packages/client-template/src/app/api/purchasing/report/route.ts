import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPurchasing } from "@/lib/extensions/ordering";
import { noStoreHeaders } from "@/lib/ordering-data";
import {
  listPayments,
  purchasingPnL,
  supplierBalances,
} from "@/lib/purchasing-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: noStoreHeaders() }
    );
  }
  const brand = await readBrand();
  if (!hasPurchasing(brand.extensions?.ordering)) {
    return NextResponse.json(
      { error: "Purchasing disabled" },
      { status: 403, headers: noStoreHeaders() }
    );
  }
  const from = req.nextUrl.searchParams.get("from") || undefined;
  const to = req.nextUrl.searchParams.get("to") || undefined;
  const [pnl, balances, payments] = await Promise.all([
    purchasingPnL({ from, to }),
    supplierBalances(),
    listPayments(),
  ]);
  return NextResponse.json(
    {
      pnl,
      balances,
      payments,
      currency: brand.currency || "EGP",
    },
    { headers: noStoreHeaders() }
  );
}
