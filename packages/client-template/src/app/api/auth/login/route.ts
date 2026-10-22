import { NextRequest, NextResponse } from "next/server";
import { COOKIE, loginAndCreateCookie, sessionCookieOptions } from "@/lib/auth";
import { checkLoginRate, clientIp, recordLoginFailure, resetLoginRate } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const gate = checkLoginRate(ip);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "محاولات كتير — جرّب بعد شوية / Too many attempts, try again later" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } }
    );
  }
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const username =
    body.username !== undefined ? String(body.username) : undefined;

  const result = await loginAndCreateCookie({ password, username });
  if (!result.ok) {
    recordLoginFailure(ip);
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
  resetLoginRate(ip);
  res.cookies.set(COOKIE, result.token, sessionCookieOptions(60 * 60 * 24 * 7));
  // Clear any legacy root-path cookie left by older builds (shared across apps).
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    res.headers.append(
      "Set-Cookie",
      `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
  }
  return res;
}
