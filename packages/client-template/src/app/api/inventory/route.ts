import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasInventory } from "@/lib/extensions/ordering";
import { listInventory, setStock } from "@/lib/inventory-data";
import { listProducts } from "@/lib/menu-data";
import { noStoreHeaders } from "@/lib/ordering-data";
import {
  BRANCH_COOKIE,
  isMultiBranchOn,
  listBranches,
  resolveBranchId,
} from "@/lib/branches-data";

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
      { error: "Inventory disabled", enabled: false, items: [] },
      { status: 200, headers: noStoreHeaders() }
    );
  }
  const hint =
    req.nextUrl.searchParams.get("branch") ||
    req.cookies.get(BRANCH_COOKIE)?.value ||
    null;
  const branchId = await resolveBranchId(hint);
  const multi = await isMultiBranchOn();
  const [stock, products, branches] = await Promise.all([
    listInventory(branchId),
    listProducts(),
    multi ? listBranches(true) : Promise.resolve([]),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = stock.map((s) => {
    const p = byId.get(s.productId);
    return {
      ...s,
      name: p?.name || s.productId,
      nameEn: p?.nameEn,
      available: p?.available ?? false,
      low: s.qty <= s.lowAt,
    };
  });
  return NextResponse.json(
    {
      enabled: true,
      items,
      currency: brand.currency || "EGP",
      branchId,
      multiBranch: multi,
      branches,
    },
    { headers: noStoreHeaders() }
  );
}

export async function PATCH(req: NextRequest) {
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
  if (!hasInventory(brand.extensions?.ordering)) {
    return NextResponse.json(
      { error: "Inventory disabled" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  try {
    const body = await req.json();
    if (!body.productId) {
      return NextResponse.json(
        { error: "productId required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }
    const hint =
      body.branchId ||
      req.cookies.get(BRANCH_COOKIE)?.value ||
      null;
    const branchId = await resolveBranchId(hint);
    const item = await setStock(
      body.productId,
      {
        qty: body.qty,
        lowAt: body.lowAt,
      },
      branchId
    );
    return NextResponse.json({ item }, { headers: noStoreHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
