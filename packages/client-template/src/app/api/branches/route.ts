import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import {
  BRANCH_COOKIE,
  createBranch,
  getDefaultBranchId,
  isMultiBranchOn,
  listBranches,
  resolveBranchId,
  setDefaultBranch,
  setPriceOverride,
  updateBranch,
} from "@/lib/branches-data";
import { noStoreHeaders } from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

async function gate(ownerOnly = false) {
  if (!(await isAuthenticated())) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders() }
      ),
    };
  }
  const role = (await getSessionRole()) || "owner";
  if (ownerOnly && role !== "owner") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: noStoreHeaders() }
      ),
    };
  }
  if (role !== "owner" && role !== "cashier") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: noStoreHeaders() }
      ),
    };
  }
  return { role };
}

export async function GET(req: NextRequest) {
  const g = await gate();
  if ("error" in g && g.error) return g.error;
  const enabled = await isMultiBranchOn();
  const branches = await listBranches(false);
  const defaultBranchId = await getDefaultBranchId();
  const hint =
    req.nextUrl.searchParams.get("branch") ||
    req.cookies.get(BRANCH_COOKIE)?.value ||
    null;
  const activeBranchId = await resolveBranchId(hint);
  return NextResponse.json(
    {
      enabled,
      branches,
      defaultBranchId,
      activeBranchId,
    },
    { headers: noStoreHeaders() }
  );
}

export async function POST(req: NextRequest) {
  const g = await gate(true);
  if ("error" in g && g.error) return g.error;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "select") {
      const id = await resolveBranchId(body.branchId);
      const res = NextResponse.json(
        { activeBranchId: id },
        { headers: noStoreHeaders() }
      );
      res.cookies.set(BRANCH_COOKIE, id, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    if (!(await isMultiBranchOn())) {
      return NextResponse.json(
        { error: "الفروع المتعددة غير مفعّلة" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (action === "create") {
      const branch = await createBranch({
        name: body.name,
        nameEn: body.nameEn,
        slug: body.slug,
      });
      return NextResponse.json(
        { branch },
        { status: 201, headers: noStoreHeaders() }
      );
    }
    if (action === "update") {
      const branch = await updateBranch(body.id, {
        name: body.name,
        nameEn: body.nameEn,
        slug: body.slug,
        active: body.active,
        sortOrder: body.sortOrder,
      });
      return NextResponse.json({ branch }, { headers: noStoreHeaders() });
    }
    if (action === "setDefault") {
      await setDefaultBranch(body.id);
      return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
    }
    if (action === "price") {
      const override = await setPriceOverride(body.branchId, body.productId, {
        price: body.price,
        available: body.available,
      });
      return NextResponse.json({ override }, { headers: noStoreHeaders() });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400, headers: noStoreHeaders() }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
