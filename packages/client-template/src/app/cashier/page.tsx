import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.cashierScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="الكاشير"
      role="cashier"
      currency={brand.currency || "EGP"}
      showAllLines
    />
  );
}
