import { NextRequest, NextResponse } from "next/server";
import { createClient, listClients } from "@/lib/clients";

export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
    }
    const client = await createClient({
      name: body.name,
      slug: body.slug || body.name,
      displayName: body.displayName,
      primaryColor: body.primaryColor || "#1B5E4A",
      accentColor: body.accentColor || "#C4A35A",
      surfaceColor: body.surfaceColor || "#F4F7F5",
      font: body.font || "Cairo",
      currency: body.currency || "EGP",
      domain: body.domain,
      dashboardPassword: body.dashboardPassword || "obelix123",
      languages: body.languages || "both",
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل إنشاء العميل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
