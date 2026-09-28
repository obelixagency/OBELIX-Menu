import Link from "next/link";
import { readBrand } from "@/lib/brand";
import { getSessionRole, isAuthenticated } from "@/lib/auth";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await readBrand();
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const orderingOn = features.orderFromMenu;
  const tableOn = orderingOn && features.tableOrderingEnabled;
  const stationsOn =
    orderingOn && (features.kitchenScreen || features.baristaScreen);
  const staffOn = features.staffAccountsEnabled;
  const authed = await isAuthenticated();
  const role = authed ? (await getSessionRole()) || "owner" : "owner";
  const isOwner = !authed || role === "owner";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--brand-surface)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col md:flex-row">
        <aside className="hidden border-black/10 bg-white md:flex md:w-56 md:shrink-0 md:flex-col md:border-l">
          <div className="p-4">
            <p className="text-xs text-black/40">Dashboard</p>
            <p className="truncate font-bold text-[var(--brand-primary)]">
              {brand.displayName}
            </p>
            {authed && staffOn && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-black/40">
                {role}
              </p>
            )}
          </div>
          <nav className="flex flex-col gap-1 px-2 pb-3">
            {isOwner && (
              <>
                <DashLink href="/dashboard">Home</DashLink>
                <DashLink href="/dashboard/categories">Categories</DashLink>
                <DashLink href="/dashboard/products">Products</DashLink>
                <DashLink href="/dashboard/banners">Banners</DashLink>
                <DashLink href="/dashboard/contacts">Contacts</DashLink>
                <DashLink href="/dashboard/reviews">Reviews</DashLink>
              </>
            )}
            {orderingOn && (isOwner || role === "cashier") && (
              <DashLink href="/dashboard/orders">Orders</DashLink>
            )}
            {isOwner && orderingOn && (
              <DashLink href="/dashboard/sales">Sales</DashLink>
            )}
            {isOwner && tableOn && (
              <DashLink href="/dashboard/tables">Tables</DashLink>
            )}
            {isOwner && stationsOn && (
              <DashLink href="/dashboard/stations">Stations</DashLink>
            )}
            {isOwner && staffOn && (
              <DashLink href="/dashboard/staff">Staff</DashLink>
            )}
            {isOwner && features.inventoryEnabled && features.orderFromMenu && (
              <DashLink href="/dashboard/inventory">Inventory</DashLink>
            )}
            {isOwner && (
              <DashLink href="/dashboard/settings">Settings</DashLink>
            )}
            {features.cashierScreen && (isOwner || role === "cashier") && (
              <DashLink href="/cashier">Cashier</DashLink>
            )}
            {features.kitchenScreen && (isOwner || role === "kitchen") && (
              <DashLink href="/kitchen">Kitchen</DashLink>
            )}
            {features.baristaScreen && (isOwner || role === "barista") && (
              <DashLink href="/bar">Bar</DashLink>
            )}
            {features.posEnabled && (isOwner || role === "cashier") && (
              <DashLink href="/pos">POS</DashLink>
            )}
            <DashLink href="/">View menu</DashLink>
          </nav>
        </aside>

        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 md:hidden">
          <div className="min-w-0">
            <p className="text-[10px] text-black/40">Dashboard</p>
            <p className="truncate text-sm font-bold text-[var(--brand-primary)]">
              {brand.displayName}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-black/10 px-3 py-2 text-xs font-medium"
          >
            Menu
          </Link>
        </div>

        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
      </div>

      {isOwner && (
        <DashboardMobileNav
          orderingOn={orderingOn}
          tableOn={tableOn}
          stationsOn={stationsOn}
        />
      )}
    </div>
  );
}

function DashLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="min-h-11 rounded-md px-3 py-2.5 text-sm text-[var(--brand-ink)] hover:bg-[var(--brand-surface)]"
    >
      {children}
    </Link>
  );
}
