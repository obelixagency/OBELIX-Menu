import { NextRequest, NextResponse } from "next/server";
import { readBrand } from "@/lib/brand";
import { getSessionRole, isAuthenticated, readSession } from "@/lib/auth";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import {
  canManageStaff,
  createUser,
  deleteUser,
  ensureSeedOwner,
  isStaffRole,
  listUsers,
  publicUser,
  updateUser,
  type StaffRole,
} from "@/lib/staff-users";
import { getDashboardPassword } from "@/lib/brand";

export const dynamic = "force-dynamic";

async function requireOwner() {
  if (!(await isAuthenticated())) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (await getSessionRole()) || "owner";
  if (!canManageStaff(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!features.staffAccountsEnabled) {
    return {
      error: NextResponse.json(
        { error: "Staff accounts are disabled for this package" },
        { status: 400 }
      ),
    };
  }
  return { brand, features };
}

export async function GET() {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  const brand = await readBrand();
  await ensureSeedOwner(getDashboardPassword(brand));
  const users = await listUsers();
  const session = await readSession();
  return NextResponse.json({
    users: users.map(publicUser),
    me: session
      ? { role: session.role, username: session.username, userId: session.userId }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json().catch(() => ({}));
  try {
    const user = await createUser({
      username: String(body.username || ""),
      password: String(body.password || ""),
      role: body.role as StaffRole,
    });
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    const patch: {
      password?: string;
      role?: StaffRole;
      active?: boolean;
    } = {};
    if (body.password) patch.password = String(body.password);
    if (body.role && isStaffRole(body.role)) patch.role = body.role;
    if (typeof body.active === "boolean") patch.active = body.active;
    const user = await updateUser(id, patch);
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireOwner();
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
