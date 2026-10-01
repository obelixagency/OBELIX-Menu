import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPurchasing } from "@/lib/extensions/ordering";
import { PurchasingClient } from "./purchasing-client";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasPurchasing(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">المشتريات والموردون</h1>
        <p className="text-sm text-black/50">
          أوامر شراء، استلام للمخزون، أرصدة موردين، ومقارنة مبيعات مقابل تكلفة الاستلام — بدون محاسبة ضريبية كاملة.
        </p>
      </div>
      <PurchasingClient />
    </div>
  );
}
