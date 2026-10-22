import { NextResponse } from "next/server";
import { COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", sessionCookieOptions(0));
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    res.headers.append("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  }
  return res;
}
