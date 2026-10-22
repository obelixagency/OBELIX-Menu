import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireMenuEditor } from "@/lib/auth";
import { importMenuRows, MAX_IMPORT_ROWS, type ImportRow } from "@/lib/menu-import";

export const dynamic = "force-dynamic";

/** Bulk import categories + products from the parsed Excel/CSV sheet. */
export async function POST(req: NextRequest) {
  const denied = await requireMenuEditor();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? (body.rows as ImportRow[]) : null;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "الملف فاضي أو مش مقروء" }, { status: 400 });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `الحد الأقصى ${MAX_IMPORT_ROWS} صنف` }, { status: 400 });
  }
  try {
    const result = await importMenuRows(rows, { replace: body?.replace === true });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل الاستيراد";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Undo the last import (restores the menu saved right before it). */
export async function DELETE() {
  const denied = await requireMenuEditor();
  if (denied) return denied;
  const dir = path.join(process.cwd(), "data");
  const backup = path.join(dir, "menu.before-import.json");
  try {
    await fs.access(backup);
  } catch {
    return NextResponse.json({ error: "مفيش استيراد سابق نرجع منه" }, { status: 404 });
  }
  await fs.copyFile(backup, path.join(dir, "menu.json"));
  await fs.unlink(backup).catch(() => {});
  return NextResponse.json({ ok: true });
}
