import { NextRequest, NextResponse } from "next/server";
import { requireAgency } from "@/lib/auth";
import { MenuReaderError, READER_LIMITS, readMenuWithGemini } from "@/lib/menu-reader";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

function sniffMime(buf: Buffer, declared: string): string | null {
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp" && /^(heic|heix|mif1|msf1|heif)/.test(buf.subarray(8, 12).toString("ascii"))) {
    return declared === "image/heif" ? "image/heif" : "image/heic";
  }
  return null;
}

/** POST multipart: files[] (menu photos or PDF), translate=1 → { rows, model } */
export async function POST(req: NextRequest) {
  const denied = await requireAgency();
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "ارفع صور أو PDF" }, { status: 400 });
  const raw = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!raw.length) return NextResponse.json({ error: "ارفع صور أو PDF" }, { status: 400 });
  if (raw.length > READER_LIMITS.maxFiles) {
    return NextResponse.json({ error: `الحد ${READER_LIMITS.maxFiles} ملفات في المرة` }, { status: 400 });
  }
  const total = raw.reduce((s, f) => s + f.size, 0);
  if (total > READER_LIMITS.maxTotalBytes) {
    return NextResponse.json({ error: "الملفات أكبر من 18MB — صغّر الصور أو قسّمها على مرتين" }, { status: 400 });
  }
  const files: { mime: string; data: Buffer }[] = [];
  for (const f of raw) {
    const data = Buffer.from(await f.arrayBuffer());
    const mime = sniffMime(data, f.type);
    if (!mime || !READER_LIMITS.mimes.includes(mime)) {
      return NextResponse.json({ error: `«${f.name}» مش صورة أو PDF مدعوم (JPG / PNG / WebP / HEIC / PDF)` }, { status: 400 });
    }
    files.push({ mime, data });
  }
  try {
    const result = await readMenuWithGemini(files, { translate: form.get("translate") === "1" });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MenuReaderError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("menu-reader", err);
    return NextResponse.json({ error: "حصلت مشكلة في قراءة المنيو" }, { status: 500 });
  }
}
