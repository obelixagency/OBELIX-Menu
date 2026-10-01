import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPurchasing } from "@/lib/extensions/ordering";
import { noStoreHeaders } from "@/lib/ordering-data";
import {
  createPurchase,
  isPurchasingOn,
  listPurchases,
  listSuppliers,
  purchasingMeta,
  receivePurchase,
  recordPayment,
  setPurchaseStatus,
  updatePurchaseDraft,
  type PurchaseStatus,
} from "@/lib/purchasing-data";
import { listBranches } from "@/lib/branches-data";

export const dynamic = "force-dynamic";

async function guard() {
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
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const [purchases, suppliers, meta, brand, branches] = await Promise.all([
    listPurchases(),
    listSuppliers(false),
    purchasingMeta(),
    readBrand(),
    listBranches(true).catch(() => []),
  ]);
  return NextResponse.json(
    {
      enabled: await isPurchasingOn(),
      purchases,
      suppliers,
      products: meta.products,
      multiBranch: meta.multiBranch,
      defaultBranchId: meta.defaultBranchId,
      branches,
      currency: brand.currency || "EGP",
    },
    { headers: noStoreHeaders() }
  );
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const body = await req.json();
    const action = String(body.action || "create");
    if (action === "receive") {
      const po = await receivePurchase(body.id);
      return NextResponse.json({ purchase: po }, { headers: noStoreHeaders() });
    }
    if (action === "status") {
      const po = await setPurchaseStatus(
        body.id,
        String(body.status) as PurchaseStatus
      );
      return NextResponse.json({ purchase: po }, { headers: noStoreHeaders() });
    }
    if (action === "payment") {
      const payment = await recordPayment({
        supplierId: body.supplierId,
        amount: body.amount,
        method: body.method,
        note: body.note,
        paidAt: body.paidAt,
      });
      return NextResponse.json({ payment }, { headers: noStoreHeaders() });
    }
    const po = await createPurchase({
      supplierId: body.supplierId,
      notes: body.notes,
      branchId: body.branchId,
      lines: body.lines || [],
    });
    return NextResponse.json({ purchase: po }, { headers: noStoreHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { error: "id required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }
    const po = await updatePurchaseDraft(body.id, {
      notes: body.notes,
      branchId: body.branchId,
      lines: body.lines,
    });
    return NextResponse.json({ purchase: po }, { headers: noStoreHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
