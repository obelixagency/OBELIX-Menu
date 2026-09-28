import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasInventory } from "@/lib/extensions/ordering";
import { buildInventoryReport } from "@/lib/inventory-data";
import { noStoreHeaders } from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
  const brand = await readBrand();
  if (!hasInventory(brand.extensions?.ordering)) {
    return NextResponse.json(
      { error: "Inventory disabled", enabled: false },
      { status: 200, headers: noStoreHeaders() }
    );
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const report = await buildInventoryReport({ from, to });
  return NextResponse.json(
    { enabled: true, report, currency: brand.currency || "EGP" },
    { headers: noStoreHeaders() }
  );
}
