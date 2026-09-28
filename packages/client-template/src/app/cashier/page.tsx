import { redirect } from "next/navigation";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";
import { requireStaffAccess } from "@/lib/require-staff";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  await requireStaffAccess("/cashier", ["owner", "cashier"]);
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.cashierScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="Cashier"
      role="cashier"
      currency={brand.currency || "EGP"}
      showAllLines
    />
  );
}
