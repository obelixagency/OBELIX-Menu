import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StationsClient } from "./stations-client";
import { PageHeader } from "@/components/dashboard/page-header";

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
      <PageHeader
        title="المحطات"
        description="توجيه الأصناف للمطبخ أو البار حسب الفئة."
      />
      <StationsClient />
    </div>
  );
}
