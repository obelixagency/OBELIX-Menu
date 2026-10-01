import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPurchasing } from "@/lib/extensions/ordering";
import { noStoreHeaders } from "@/lib/ordering-data";
import {
  createSupplier,
  isPurchasingOn,
  listSuppliers,
  updateSupplier,
} from "@/lib/purchasing-data";

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
      { error: "Purchasing disabled", enabled: false },
      { status: 403, headers: noStoreHeaders() }
    );
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const suppliers = await listSuppliers(true);
  return NextResponse.json(
    { enabled: await isPurchasingOn(), suppliers },
    { headers: noStoreHeaders() }
  );
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const body = await req.json();
    const supplier = await createSupplier({
      name: body.name,
      phone: body.phone,
      notes: body.notes,
      openingBalance: body.openingBalance,
    });
    return NextResponse.json({ supplier }, { headers: noStoreHeaders() });
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
    const supplier = await updateSupplier(body.id, {
      name: body.name,
      phone: body.phone,
      notes: body.notes,
      openingBalance: body.openingBalance,
      active: body.active,
    });
    return NextResponse.json({ supplier }, { headers: noStoreHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
