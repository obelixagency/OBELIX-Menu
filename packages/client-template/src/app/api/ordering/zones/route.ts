import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  deleteZone,
  listZones,
  noStoreHeaders,
  seedDefaultZonesIfEmpty,
  upsertZone,
} from "@/lib/ordering-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  await seedDefaultZonesIfEmpty();
  const zones = await listZones();
  return NextResponse.json({ zones }, { headers: noStoreHeaders() });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.name?.trim() || !body.nameAr?.trim()) {
      return NextResponse.json(
        { error: "اسم المنطقة بالعربي والإنجليزي مطلوب" },
        { status: 400 }
      );
    }
    const zone = await upsertZone({
      id: body.id,
      name: body.name,
      nameAr: body.nameAr,
      sortOrder: body.sortOrder,
      active: body.active,
    });
    return NextResponse.json(
      { zone },
      { status: body.id ? 200 : 201, headers: noStoreHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
    }
    await deleteZone(body.id);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
