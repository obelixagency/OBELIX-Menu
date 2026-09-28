import { redirect } from "next/navigation";
import { readBrand } from "@/lib/brand";
import { hasPos } from "@/lib/extensions/ordering";
import { readSession } from "@/lib/auth";
import { requireStaffAccess } from "@/lib/require-staff";
import { PosClient } from "@/components/ordering/pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireStaffAccess("/pos", ["owner", "cashier"]);
  const brand = await readBrand();
  if (!hasPos(brand.extensions?.ordering)) {
    redirect("/dashboard");
  }
  const session = await readSession();

  return (
    <PosClient staffName={session?.username || null} />
  );
}
