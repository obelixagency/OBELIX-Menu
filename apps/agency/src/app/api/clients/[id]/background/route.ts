import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getClient, getUploadsDir, updateClient } from "@/lib/clients";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("background");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "الحد الأقصى للصورة 8 ميجابايت" },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext)
    ? ext
    : ".jpg";
  const destName = `${client.slug}-bg${safeExt}`;
  const uploads = getUploadsDir();
  await fs.mkdir(uploads, { recursive: true });
  await fs.writeFile(path.join(uploads, destName), buffer);
  const relative = `uploads/${destName}`;
  await updateClient(id, { menuBackgroundPath: relative });
  return NextResponse.json({ backgroundPath: relative });
}
