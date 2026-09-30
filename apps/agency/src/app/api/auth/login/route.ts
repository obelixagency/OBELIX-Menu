import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE,
  createSessionCookie,
  verifyCredentials,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let password = "";
  let username = "";
  try {
    const body = await req.json();
    password = String(body.password || "");
    username = String(body.username || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.AGENCY_PASSWORD) {
    return NextResponse.json(
      { error: "Agency password is not configured on the server" },
      { status: 503 }
    );
  }

  if (!username) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const ok = await verifyCredentials(username, password);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const token = await createSessionCookie();
  const res = NextResponse.json({ ok: true, redirect: "/" });
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
