import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "obelix_agency_session";

function getPassword(): string {
  return process.env.AGENCY_PASSWORD || "";
}

/** Default agency username when AGENCY_USERNAME is unset */
function getUsername(): string {
  return (process.env.AGENCY_USERNAME || "admin").trim() || "admin";
}

function getSecret(): string {
  return (
    process.env.SESSION_SECRET || "obelix-agency-dev-secret-change-me"
  );
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function safeEqualStr(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUser = getUsername();
  const expectedPass = getPassword();
  if (!expectedPass) return false;
  const userOk = safeEqualStr(
    String(username || "").trim().toLowerCase(),
    expectedUser.toLowerCase()
  );
  const passOk = safeEqualStr(String(password || ""), expectedPass);
  return userOk && passOk;
}

/** @deprecated use verifyCredentials — kept for any legacy callers */
export async function verifyPassword(password: string): Promise<boolean> {
  const expected = getPassword();
  if (!expected) return false;
  return safeEqualStr(password, expected);
}

export async function createSessionCookie(): Promise<string> {
  const payload = `ok:agency:${Date.now()}`;
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

export { COOKIE, getUsername as getAgencyUsername };
