import { NextRequest, NextResponse } from "next/server";

const COOKIE = "obelix_client_session";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return toHex(sig);
}

async function isValidSession(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const secret =
    process.env.SESSION_SECRET || "obelix-client-dev-secret-change-me";
  const expected = await hmacHex(secret, payload);
  if (expected.length !== sig.length) return false;
  let ok = true;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== sig[i]) ok = false;
  }
  return ok;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard/login")) {
    return NextResponse.next();
  }
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const raw = req.cookies.get(COOKIE)?.value;
  if (!(await isValidSession(raw))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
