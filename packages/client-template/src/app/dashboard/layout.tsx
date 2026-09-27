import { readBrand } from "@/lib/brand";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await readBrand();
  return (
    <DashboardShell displayName={brand.displayName}>{children}</DashboardShell>
  );
}
