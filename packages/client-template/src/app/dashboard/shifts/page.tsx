import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPos } from "@/lib/extensions/ordering";
import { ShiftsClient } from "./shifts-client";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner" && role !== "cashier") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasPos(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="الورديات"
        description="فتح وتقفيل وردية الكاشير — ملخص كاش/بطاقة من مبيعات الـ POS."
      />
      <ShiftsClient currency={brand.currency || "EGP"} />
    </div>
  );
}
