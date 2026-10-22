import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isAuthenticated } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "الحد 5MB" }, { status: 400 });
  }
  // Trust the bytes, not the filename: PNG / JPEG / WebP only.
  const isPng = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isPng && !isJpg && !isWebp) {
    return NextResponse.json({ error: "الصور المسموحة: PNG أو JPG أو WebP" }, { status: 400 });
  }
  const safeExt = isPng ? ".png" : isWebp ? ".webp" : ".jpg";
  const name = `${randomUUID()}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return NextResponse.json({ url: `/uploads/${name}` });
}
