import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPurchasing } from "@/lib/extensions/ordering";
import { PurchasingClient } from "./purchasing-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasPurchasing(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="المشتريات"
        description="موردون، أوامر شراء، استلام للمخزون، وأرصدة — بدون محاسبة ضريبية كاملة."
      />
      <PurchasingClient />
    </div>
  );
}
