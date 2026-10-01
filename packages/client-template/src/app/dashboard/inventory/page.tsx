import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasInventory } from "@/lib/extensions/ordering";
import { InventoryClient } from "./inventory-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasInventory(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="المخزون"
        description="كميات الأصناف وحدود التنبيه — تتحدث مع كل بيع من المنيو أو الـ POS."
      />
      <InventoryClient />
    </div>
  );
}
