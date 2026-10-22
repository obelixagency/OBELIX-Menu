import type { NextRequest } from "next/server";

/** In-memory login throttle: 8 failed attempts per IP per 15 minutes. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
/** Global cap across all IPs — stops X-Forwarded-For spoofing from bypassing the per-IP limit. */
const MAX_GLOBAL_FAILS = 60;
const GLOBAL = "__all__";
const fails = new Map<string, { count: number; first: number }>();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function checkLoginRate(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const g = checkBucket(GLOBAL, MAX_GLOBAL_FAILS);
  if (!g.ok) return g;
  return checkBucket(ip, MAX_FAILS);
}

function checkBucket(ip: string, max: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const e = fails.get(ip);
  if (!e) return { ok: true };
  if (now - e.first > WINDOW_MS) {
    fails.delete(ip);
    return { ok: true };
  }
  if (e.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((e.first + WINDOW_MS - now) / 1000) };
  }
  return { ok: true };
}

export function recordLoginFailure(ip: string) {
  bump(GLOBAL);
  bump(ip);
}

function bump(ip: string) {
  const now = Date.now();
  const e = fails.get(ip);
  if (!e || now - e.first > WINDOW_MS) fails.set(ip, { count: 1, first: now });
  else e.count += 1;
  if (fails.size > 5000) {
    const g = fails.get(GLOBAL);
    fails.clear();
    if (g) fails.set(GLOBAL, g);
  }
}

export function resetLoginRate(ip: string) {
  fails.delete(ip);
}
