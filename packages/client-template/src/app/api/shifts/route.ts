import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, isAuthenticated, readSession } from "@/lib/auth";
import {
  closeShift,
  listShifts,
  openShift,
  openShiftLiveTotals,
  shiftsFeatureOn,
} from "@/lib/shifts-data";
import { noStoreHeaders } from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

async function gate() {
  if (!(await isAuthenticated())) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders() }
      ),
    };
  }
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner" && role !== "cashier") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: noStoreHeaders() }
      ),
    };
  }
  if (!(await shiftsFeatureOn())) {
    return {
      error: NextResponse.json(
        { error: "Shifts require POS", enabled: false },
        { status: 400, headers: noStoreHeaders() }
      ),
    };
  }
  return { role };
}

export async function GET() {
  const g = await gate();
  if ("error" in g && g.error) return g.error;
  const { shift, live } = await openShiftLiveTotals();
  const shifts = await listShifts(30);
  return NextResponse.json(
    { enabled: true, open: shift, live, shifts },
    { headers: noStoreHeaders() }
  );
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if ("error" in g && g.error) return g.error;
  const session = await readSession();
  const who =
    session?.username ||
    (session?.role === "owner" ? "owner" : session?.role) ||
    "staff";
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    if (action === "open") {
      const shift = await openShift({
        openedBy: who,
        openingCash: body.openingCash,
      });
      return NextResponse.json(
        { shift },
        { status: 201, headers: noStoreHeaders() }
      );
    }
    if (action === "close") {
      const shift = await closeShift({
        closedBy: who,
        note: body.note,
        countedCash: body.countedCash,
      });
      return NextResponse.json({ shift }, { headers: noStoreHeaders() });
    }
    return NextResponse.json(
      { error: "action must be open or close" },
      { status: 400, headers: noStoreHeaders() }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
