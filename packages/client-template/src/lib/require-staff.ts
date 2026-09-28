import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated, readSession } from "@/lib/auth";
import {
  canAccessPath,
  roleHomePath,
  type StaffRole,
} from "@/lib/staff-users";

/** Redirect unauthenticated or wrong-role users. Owners pass everything. */
export async function requireStaffAccess(
  pathname: string,
  allowed?: StaffRole[]
): Promise<StaffRole> {
  if (!(await isAuthenticated())) {
    redirect("/dashboard/login");
  }
  const role = (await getSessionRole()) || "owner";
  if (allowed && !allowed.includes(role) && role !== "owner") {
    redirect(roleHomePath(role));
  }
  if (!canAccessPath(role, pathname)) {
    redirect(roleHomePath(role));
  }
  return role;
}

export async function requireOwnerOnly(): Promise<void> {
  await requireStaffAccess("/dashboard", ["owner"]);
  const session = await readSession();
  if (session && session.role !== "owner") {
    redirect(roleHomePath(session.role));
  }
}
