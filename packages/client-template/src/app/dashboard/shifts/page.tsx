import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasPos } from "@/lib/extensions/ordering";
import { ShiftsClient } from "./shifts-client";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner" && role !== "cashier") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasPos(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">الورديات</h1>
        <p className="text-sm text-black/50">
          فتح وتقفيل وردية الكاشير — ملخص كاش/بطاقة من مبيعات الـ POS.
        </p>
      </div>
      <ShiftsClient currency={brand.currency || "EGP"} />
    </div>
  );
}
