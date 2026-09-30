import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getDashboardPassword, readBrand } from "./brand";
import {
  ensureSeedOwner,
  findUserByUsername,
  isStaffRole,
  verifyPasswordHash,
  type StaffRole,
} from "./staff-users";
import { normalizeOrderingFeatures } from "./extensions/ordering";

const COOKIE = "obelix_client_session";

export type SessionPayload = {
  ok: true;
  slug: string;
  role: StaffRole;
  userId: string | null;
  username: string | null;
  ts: number;
};

function sign(value: string): string {
  const secret =
    process.env.SESSION_SECRET || "obelix-client-dev-secret-change-me";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): SessionPayload | null {
  try {
    // Legacy format: ok:slug:timestamp
    if (raw.startsWith("ok:")) {
      const parts = raw.split(":");
      if (parts.length < 3) return null;
      return {
        ok: true,
        slug: parts[1],
        role: "owner",
        userId: null,
        username: null,
        ts: Number(parts[2]) || 0,
      };
    }
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed?.ok || !parsed.slug || !isStaffRole(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const brand = await readBrand();
  const expected = getDashboardPassword(brand);
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return password === expected;
  }
}

export async function createSessionCookie(
  opts?: Partial<Pick<SessionPayload, "role" | "userId" | "username">>
): Promise<string> {
  const brand = await readBrand();
  const payload: SessionPayload = {
    ok: true,
    slug: brand.slug,
    role: opts?.role && isStaffRole(opts.role) ? opts.role : "owner",
    userId: opts?.userId ?? null,
    username: opts?.username ?? null,
    ts: Date.now(),
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig) return null;
  const expected = sign(encoded);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  return decodePayload(encoded);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await readSession()) !== null;
}

export async function getSessionRole(): Promise<StaffRole | null> {
  const session = await readSession();
  return session?.role ?? null;
}

export type LoginResult =
  | { ok: true; role: StaffRole; redirect: string }
  | { ok: false; error: string };

/**
 * Login — always username + password.
 * - staffAccountsEnabled ON → users.json
 * - OFF → username must be `owner` + shared dashboard password
 */
export async function attemptLogin(input: {
  password: string;
  username?: string;
}): Promise<LoginResult> {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const password = String(input.password || "");
  const username = String(input.username || "").trim();

  if (!username || !password) {
    return { ok: false, error: "Username and password are required" };
  }

  if (features.staffAccountsEnabled) {
    await ensureSeedOwner(getDashboardPassword(brand));
    const user = await findUserByUsername(username);
    if (!user || !user.active || !verifyPasswordHash(password, user.passwordHash)) {
      return { ok: false, error: "Invalid username or password" };
    }
    return {
      ok: true,
      role: user.role,
      redirect:
        user.role === "owner"
          ? "/dashboard"
          : user.role === "cashier"
            ? "/cashier"
            : user.role === "kitchen"
              ? "/kitchen"
              : "/bar",
    };
  }

  if (username.toLowerCase() !== "owner") {
    return { ok: false, error: "Invalid username or password" };
  }
  const ok = await verifyPassword(password);
  if (!ok) {
    return { ok: false, error: "Invalid username or password" };
  }
  return { ok: true, role: "owner", redirect: "/dashboard" };
}

export async function loginAndCreateCookie(input: {
  password: string;
  username?: string;
}): Promise<
  | { ok: true; token: string; role: StaffRole; redirect: string }
  | { ok: false; error: string }
> {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const result = await attemptLogin(input);
  if (!result.ok) return result;

  let userId: string | null = null;
  let username: string | null = String(input.username || "").trim() || null;
  if (features.staffAccountsEnabled && username) {
    const user = await findUserByUsername(username);
    userId = user?.id ?? null;
    username = user?.username ?? username;
  }

  const token = await createSessionCookie({
    role: result.role,
    userId,
    username,
  });
  return { ok: true, token, role: result.role, redirect: result.redirect };
}

export { COOKIE };
