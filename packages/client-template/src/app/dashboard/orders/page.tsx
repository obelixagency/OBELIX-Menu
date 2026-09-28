import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { OrdersDashboardClient } from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">الطلبات</h1>
        <p className="text-sm text-black/50">
          متابعة حالة الطلبات — تحديث تلقائي. الدفع عند الكاشير أو عند التوصيل.
        </p>
      </div>
      <OrdersDashboardClient currency={brand.currency || "EGP"} />
    </div>
  );
}
