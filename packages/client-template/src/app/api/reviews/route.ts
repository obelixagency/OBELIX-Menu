import { NextRequest, NextResponse } from "next/server";
import { createReview, listReviews } from "@/lib/menu-data";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { sendRateFormEmail } from "@/lib/mail";

export async function GET(req: NextRequest) {
  const all = await listReviews();
  const admin = req.nextUrl.searchParams.get("all") === "1";
  if (admin) {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ reviews: all });
  }
  return NextResponse.json({
    reviews: all.filter((r) => r.visible),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (
      body.overall == null ||
      body.hygiene == null ||
      body.taste == null
    ) {
      return NextResponse.json(
        { error: "التقييمات مطلوبة" },
        { status: 400 }
      );
    }
    const review = await createReview({
      firstVisit: Boolean(body.firstVisit),
      overall: Number(body.overall),
      hygiene: Number(body.hygiene),
      taste: Number(body.taste),
      comeBack: Boolean(body.comeBack),
      anythingElse: body.anythingElse,
      name: body.name,
      mobile: body.mobile,
      email: body.email,
      heardAbout: body.heardAbout,
    });

    const brand = await readBrand();
    let mail = { sent: false, skipped: true as boolean, error: undefined as string | undefined };
    if (brand.notificationEmail) {
      mail = await sendRateFormEmail({
        to: brand.notificationEmail,
        clientName: brand.displayName,
        payload: {
          "1 First visit": review.firstVisit ? "Yes" : "No",
          "2 Overall": review.overall,
          "3 Hygiene": review.hygiene,
          "4 Taste": review.taste,
          "5 Come back": review.comeBack ? "Yes" : "No",
          "6 Anything else": review.anythingElse,
          "7 Name": review.name,
          "8 Mobile": review.mobile,
          "9 Email": review.email,
          "10 Heard about": review.heardAbout,
          "Submitted at": review.createdAt,
        },
      });
    }

    return NextResponse.json({ review, mail }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
