import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { TablesClient } from "./tables-client";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.tableOrderingEnabled) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">الطاولات والمناطق</h1>
        <p className="text-sm text-black/50">
          أضف / عدّل / أخفِ الطاولات بحرية. الزائر يختار من القائمة النشطة فقط.
        </p>
      </div>
      <TablesClient zonesEnabled={f.zonesIndoorOutdoor} />
    </div>
  );
}
