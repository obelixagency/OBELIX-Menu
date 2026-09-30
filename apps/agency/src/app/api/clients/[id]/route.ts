import { NextRequest, NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/clients";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const updated = await updateClient(id, {
      name: body.name ?? client.name,
      displayName: body.displayName ?? client.displayName,
      domain: body.domain ?? client.domain,
      dashboardPassword: body.dashboardPassword ?? client.dashboardPassword,
      languages: body.languages ?? client.languages,
      status: body.status ?? client.status,
      colors: {
        primary: body.primaryColor ?? client.colors.primary,
        accent: body.accentColor ?? client.colors.accent,
        surface: body.surfaceColor ?? client.colors.surface,
      },
      font: body.font ?? client.font,
      ...(body.ordering ? { ordering: body.ordering } : {}),
    });
    return NextResponse.json({ client: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل التحديث";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
