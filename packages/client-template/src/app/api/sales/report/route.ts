import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { buildSalesReport, noStoreHeaders } from "@/lib/ordering-data";

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
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!features.orderFromMenu) {
    return NextResponse.json(
      { error: "Ordering is disabled" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const url = new URL(req.url);
  const day = url.searchParams.get("day") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json(
      { error: "Invalid day (use YYYY-MM-DD)" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const report = await buildSalesReport({ day, from, to });
  return NextResponse.json(
    { report, currency: brand.currency || "EGP" },
    { headers: noStoreHeaders() }
  );
}
