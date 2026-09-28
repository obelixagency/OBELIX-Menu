import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getStationRouting,
  noStoreHeaders,
  setStationRouting,
} from "@/lib/ordering-data";
import type { Station } from "@/lib/extensions/ordering";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const stationRouting = await getStationRouting();
  return NextResponse.json({ stationRouting }, { headers: noStoreHeaders() });
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const routing = (body.stationRouting || {}) as Record<string, Station>;
    const stationRouting = await setStationRouting(routing);
    return NextResponse.json({ stationRouting }, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
