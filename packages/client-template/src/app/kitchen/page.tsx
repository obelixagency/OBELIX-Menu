import { redirect } from "next/navigation";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";
import { requireStaffAccess } from "@/lib/require-staff";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  await requireStaffAccess("/kitchen", ["owner", "kitchen"]);
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.kitchenScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="Kitchen"
      role="station"
      currency={brand.currency || "EGP"}
      stationFilter="kitchen"
    />
  );
}
