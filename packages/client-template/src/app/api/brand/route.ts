import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";

export async function GET() {
  const brand = await readBrand();
  const { dashboardPassword: _, ...publicBrand } = brand;
  void _;
  return NextResponse.json({ brand: publicBrand });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const brand = await readBrand();
    const next = {
      ...brand,
      notificationEmail:
        body.notificationEmail !== undefined
          ? String(body.notificationEmail || "").trim() || null
          : brand.notificationEmail,
      currency: body.currency
        ? String(body.currency).toUpperCase().slice(0, 8)
        : brand.currency,
      menuBackgroundUrl:
        body.menuBackgroundUrl !== undefined
          ? body.menuBackgroundUrl
            ? String(body.menuBackgroundUrl)
            : null
          : brand.menuBackgroundUrl,
    };
    const file = path.join(process.cwd(), "data", "brand.json");
    await fs.writeFile(file, JSON.stringify(next, null, 2), "utf8");
    const { dashboardPassword: __, ...publicBrand } = next;
    void __;
    return NextResponse.json({ brand: publicBrand });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
