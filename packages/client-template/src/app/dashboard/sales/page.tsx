import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!features.orderFromMenu) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">تقرير المبيعات</h1>
        <p className="text-sm text-black/50">
          ملخص يومي من طلبات المنيو والـ POS — إيراد، قنوات، دفع، وأصناف.
        </p>
      </div>
      <SalesClient currency={brand.currency || "EGP"} />
    </div>
  );
}
