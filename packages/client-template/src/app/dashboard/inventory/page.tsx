import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasInventory } from "@/lib/extensions/ordering";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasInventory(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">المخازن</h1>
        <p className="text-sm text-black/50">
          كميات الأصناف وحدود التنبيه — تتحدث مع كل بيع من المنيو أو الـ POS.
        </p>
      </div>
      <InventoryClient />
    </div>
  );
}
