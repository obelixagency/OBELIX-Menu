import { redirect } from "next/navigation";
import { isAuthenticated, getSessionRole } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { canManageStaff } from "@/lib/staff-users";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (!canManageStaff(role)) redirect("/dashboard");
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!features.staffAccountsEnabled) redirect("/dashboard");
  return <StaffClient />;
}
