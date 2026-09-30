import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StationsClient } from "./stations-client";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || (!f.kitchenScreen && !f.baristaScreen)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">توجيه المحطات</h1>
        <p className="text-sm text-black/50">
          حسب الفئة — مطبخ أو باريستا (تخصيص لكل صنف لاحقاً).
        </p>
      </div>
      <StationsClient />
    </div>
  );
}
