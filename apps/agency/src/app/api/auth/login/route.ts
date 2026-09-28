import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE,
  createSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!process.env.AGENCY_PASSWORD) {
    return NextResponse.json(
      { error: "لم تُضبط كلمة مرور الوكالة على السيرفر" },
      { status: 503 }
    );
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return NextResponse.json(
      { error: "كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  }

  const token = await createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
