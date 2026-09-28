import { NextRequest, NextResponse } from "next/server";
import { COOKIE, loginAndCreateCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const username =
    body.username !== undefined ? String(body.username) : undefined;

  const result = await loginAndCreateCookie({ password, username });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    role: result.role,
    redirect: result.redirect,
  });
  res.cookies.set(COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
