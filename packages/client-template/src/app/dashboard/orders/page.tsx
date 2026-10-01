import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { OrdersDashboardClient } from "./orders-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="الطلبات"
        description="متابعة الحالة — تحديث تلقائي. الدفع عند الكاشير أو عند التوصيل."
      />
      <OrdersDashboardClient currency={brand.currency || "EGP"} />
    </div>
  );
}
