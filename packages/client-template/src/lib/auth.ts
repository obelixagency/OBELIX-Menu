import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getDashboardPassword, readBrand } from "./brand";

const COOKIE = "obelix_client_session";

function sign(value: string): string {
  const secret =
    process.env.SESSION_SECRET || "obelix-client-dev-secret-change-me";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function verifyPassword(password: string): Promise<boolean> {
  const brand = await readBrand();
  const expected = getDashboardPassword(brand);
  if (password.length !== expected.length) {
    // still compare to avoid trivial timing leak on length alone in tiny v1
  }
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return password === expected;
  }
}

export async function createSessionCookie(): Promise<string> {
  const brand = await readBrand();
  const payload = `ok:${brand.slug}:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export { COOKIE };
