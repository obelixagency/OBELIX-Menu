import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { StaffOrdersBoard } from "@/components/ordering/staff-orders-board";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const brand = await readBrand();
  const f = normalizeOrderingFeatures(brand.extensions?.ordering);
  if (!f.orderFromMenu || !f.baristaScreen) {
    redirect("/dashboard");
  }
  return (
    <StaffOrdersBoard
      title="الباريستا"
      role="station"
      stationFilter="barista"
      currency={brand.currency || "EGP"}
      showAllLines={false}
    />
  );
}
