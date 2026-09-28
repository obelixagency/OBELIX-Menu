import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.kitchenScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="المطبخ"
      role="station"
      stationFilter="kitchen"
      currency={brand.currency || "EGP"}
      showAllLines={false}
    />
  );
}
