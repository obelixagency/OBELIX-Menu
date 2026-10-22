import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readBrand, toPublicBrand, writeBrand } from "@/lib/brand";
import { normalizePayments } from "@/lib/payments";

export async function GET() {
  const brand = await readBrand();
  // Owner dashboard needs notificationEmail; guests get the public view only.
  const authed = await isAuthenticated();
  const { dashboardPassword: _, ...safe } = authed ? brand : toPublicBrand(brand);
  void _;
  return NextResponse.json({ brand: safe });
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
      slogan:
        body.slogan !== undefined
          ? String(body.slogan || "").trim() || null
          : brand.slogan,
      sloganEn:
        body.sloganEn !== undefined
          ? String(body.sloganEn || "").trim() || null
          : brand.sloganEn,
      taxPercent:
        body.taxPercent !== undefined
          ? Math.max(0, Math.min(50, Number(body.taxPercent) || 0))
          : brand.taxPercent || 0,
      taxInclusive:
        body.taxInclusive !== undefined
          ? Boolean(body.taxInclusive)
          : brand.taxInclusive !== false,
      taxNumber:
        body.taxNumber !== undefined
          ? String(body.taxNumber || "").trim() || null
          : brand.taxNumber,
      extensions: {
        ...brand.extensions,
        ordering: brand.extensions.ordering,
        payments:
          body.payments !== undefined
            ? normalizePayments({
                ...brand.extensions.payments,
                ...body.payments,
              })
            : normalizePayments(brand.extensions.payments),
      },
    };
    await writeBrand(next);
    const { dashboardPassword: __, ...publicBrand } = next;
    void __;
    return NextResponse.json({ brand: publicBrand });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
