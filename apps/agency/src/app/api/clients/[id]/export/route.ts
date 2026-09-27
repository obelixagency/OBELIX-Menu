import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getClient } from "@/lib/clients";
import { exportClientPackage } from "@/lib/export-package";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  try {
    const result = await exportClientPackage(client);
    return NextResponse.json({
      ok: true,
      packageDir: result.packageDir,
      zipName: path.basename(result.zipPath),
      downloadUrl: `/api/clients/${id}/export?download=1`,
      message:
        "تم توليد حزمة العميل. ارفع المجلد أو ملف ZIP على دومين/هوست العميل.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل التصدير";
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download");
  if (download !== "1") {
    return NextResponse.json({
      packagePath: client.packagePath,
      lastExportedAt: client.lastExportedAt,
    });
  }

  const zipPath = path.join(process.cwd(), "generated", `${client.slug}.zip`);
  try {
    const data = await fs.readFile(zipPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${client.slug}.zip"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "لا يوجد تصدير بعد — اضغط «توليد الحزمة» أولاً" },
      { status: 404 }
    );
  }
}
