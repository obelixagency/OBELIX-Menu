import { redirect } from "next/navigation";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { readBrand } from "@/lib/brand";
import { hasMultiBranch } from "@/lib/extensions/ordering";
import { BranchesClient } from "./branches-client";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  const role = (await getSessionRole()) || "owner";
  if (role !== "owner") redirect("/dashboard");

  const brand = await readBrand();
  if (!hasMultiBranch(brand.extensions?.ordering)) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">الفروع</h1>
        <p className="text-sm text-black/50">
          منيو واحد مشترك — لكل فرع مخزون مستقل وأسعار اختيارية.
        </p>
      </div>
      <BranchesClient currency={brand.currency || "EGP"} />
    </div>
  );
}
