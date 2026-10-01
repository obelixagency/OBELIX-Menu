import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { TablesClient } from "./tables-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.tableOrderingEnabled) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="الطاولات"
        description="أضف أو عدّل الطاولات. الزائر يختار من القائمة النشطة فقط."
      />
      <TablesClient zonesEnabled={f.zonesIndoorOutdoor} />
    </div>
  );
}
