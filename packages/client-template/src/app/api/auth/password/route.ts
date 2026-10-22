import { NextRequest, NextResponse } from "next/server";
import { readSession, verifyPassword } from "@/lib/auth";
import { readBrand, setDashboardPassword } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { findUserById, updateUser, verifyPasswordHash } from "@/lib/staff-users";
import { checkLoginRate, clientIp, recordLoginFailure, resetLoginRate } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Change the signed-in user's own password (current password required). */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const ip = clientIp(req);
  const gate = checkLoginRate(`pw:${ip}`);
  if (!gate.ok) {
    return NextResponse.json({ error: "محاولات كتير — جرّب بعد شوية" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  if (next.length < 8) {
    return NextResponse.json({ error: "الباسورد الجديد لازم 8 حروف على الأقل" }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: "الباسورد الجديد لازم يختلف عن القديم" }, { status: 400 });
  }

  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);

  if (features.staffAccountsEnabled && session.userId) {
    const user = await findUserById(session.userId);
    if (!user || !verifyPasswordHash(current, user.passwordHash)) {
      recordLoginFailure(`pw:${ip}`);
      return NextResponse.json({ error: "الباسورد الحالي غلط" }, { status: 400 });
    }
    await updateUser(user.id, { password: next });
  } else {
    if (session.role !== "owner" || !(await verifyPassword(current))) {
      recordLoginFailure(`pw:${ip}`);
      return NextResponse.json({ error: "الباسورد الحالي غلط" }, { status: 400 });
    }
    await setDashboardPassword(next);
  }
  resetLoginRate(`pw:${ip}`);
  return NextResponse.json({ ok: true });
}
