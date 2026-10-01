import { readBrand, defaultLocale } from "@/lib/brand";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const orderingOn = features.orderFromMenu;
  const authed = await isAuthenticated();
  const role = authed ? (await getSessionRole()) || "owner" : "owner";
  const isOwner = !authed || role === "owner";

  return (
    <DashboardChrome
      displayName={brand.displayName}
      logoUrl={brand.logoUrl}
      role={role}
      languages={brand.languages}
      defaultLocale={defaultLocale(brand.languages)}
      isOwner={isOwner}
      flags={{
        orderingOn,
        tableOn: orderingOn && features.tableOrderingEnabled,
        stationsOn:
          orderingOn && (features.kitchenScreen || features.baristaScreen),
        staffOn: features.staffAccountsEnabled,
        inventoryOn: features.inventoryEnabled && features.orderFromMenu,
        purchasingOn: features.purchasingEnabled,
        branchesOn: features.multiBranchEnabled && features.orderFromMenu,
        deliveryOn: features.deliveryEnabled && orderingOn,
        cashierOn: features.cashierScreen && orderingOn,
        kitchenOn: features.kitchenScreen && orderingOn,
        barOn: features.baristaScreen && orderingOn,
        posOn: features.posEnabled,
      }}
    >
      {children}
    </DashboardChrome>
  );
}
