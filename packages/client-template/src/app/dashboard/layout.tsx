import Link from "next/link";
import { readBrand } from "@/lib/brand";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await readBrand();
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--brand-surface)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden border-black/10 bg-white md:flex md:w-56 md:shrink-0 md:flex-col md:border-l">
          <div className="p-4">
            <p className="text-xs text-black/40">لوحة التحكم</p>
            <p className="truncate font-bold text-[var(--brand-primary)]">
              {brand.displayName}
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-2 pb-3">
            <DashLink href="/dashboard">الرئيسية</DashLink>
            <DashLink href="/dashboard/categories">الفئات</DashLink>
            <DashLink href="/dashboard/products">المنتجات</DashLink>
            <DashLink href="/dashboard/banners">العروض</DashLink>
            <DashLink href="/dashboard/contacts">التواصل</DashLink>
            <DashLink href="/dashboard/reviews">التقييمات</DashLink>
            <DashLink href="/dashboard/settings">الإعدادات</DashLink>
            <DashLink href="/">عرض المنيو</DashLink>
          </nav>
        </aside>

        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 md:hidden">
          <div className="min-w-0">
            <p className="text-[10px] text-black/40">لوحة التحكم</p>
            <p className="truncate text-sm font-bold text-[var(--brand-primary)]">
              {brand.displayName}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-black/10 px-3 py-2 text-xs font-medium"
          >
            المنيو
          </Link>
        </div>

        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
      </div>

      <DashboardMobileNav />
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
