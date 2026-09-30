import { NextRequest, NextResponse } from "next/server";
import { COOKIE, loginAndCreateCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const username =
    body.username !== undefined ? String(body.username) : undefined;

  const result = await loginAndCreateCookie({ password, username });
  if (!result.ok) {
    const res = NextResponse.json({ error: result.error }, { status: 401 });
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    return res;
  }

  const res = NextResponse.json({
    ok: true,
    role: result.role,
    redirect: result.redirect,
  });
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.cookies.set(COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
