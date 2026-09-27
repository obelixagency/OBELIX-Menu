import { NextRequest, NextResponse } from "next/server";
import { getClient, saveClientLogo } from "@/lib/clients";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "الحد الأقصى للصورة 5 ميجابايت" },
      { status: 400 }
    );
  }

  const logoPath = await saveClientLogo(id, file.name, buffer);
  return NextResponse.json({ logoPath });
}
