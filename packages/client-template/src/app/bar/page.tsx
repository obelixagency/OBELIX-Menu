import { redirect } from "next/navigation";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";
import { requireStaffAccess } from "@/lib/require-staff";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  await requireStaffAccess("/bar", ["owner", "barista"]);
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.baristaScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="Bar"
      role="station"
      currency={brand.currency || "EGP"}
      stationFilter="barista"
    />
  );
}
