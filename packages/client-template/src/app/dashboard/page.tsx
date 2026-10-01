import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { listCategories, listProducts } from "@/lib/menu-data";
import { readBrand } from "@/lib/brand";
import { normalizeOrderingFeatures } from "@/lib/extensions/ordering";
import { listOrders, buildSalesReport } from "@/lib/ordering-data";
import { listInventory } from "@/lib/inventory-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function DashboardHome() {
  if (!(await isAuthenticated())) {
    redirect("/dashboard/login");
  }

  const [brand, categories, products] = await Promise.all([
    readBrand(),
    listCategories(),
    listProducts(),
  ]);
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const orderingOn = features.orderFromMenu;
  const purchasingOn = features.purchasingEnabled;
  const inventoryOn = features.inventoryEnabled && features.orderFromMenu;
  const available = products.filter((p) => p.available).length;

  const recent = orderingOn
    ? (await listOrders({ openOnly: true })).slice(0, 5)
    : [];
  const sales = orderingOn ? await buildSalesReport() : null;
  const lowStock = inventoryOn
    ? (await listInventory()).filter((i) => i.qty <= i.lowAt).length
    : 0;

  const emptyMenu = categories.length === 0;

  const statusLabel: Record<string, string> = {
    new: "جديد",
    preparing: "يُحضَّر",
    ready: "جاهز",
    served: "قُدّم",
    cancelled: "ملغى",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`صباح الخير — ${brand.displayName}`}
        description={
          orderingOn
            ? "إدارة المنيو والطلبات من مكان واحد."
            : "إدارة الفئات والمنتجات. الطلب من المنيو غير مفعّل من الوكالة."
        }
        actions={
          <Link href="/" target="_blank">
            <Button variant="outline">فتح المنيو</Button>
          </Link>
        }
      />

      {emptyMenu ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ابدأ بمنيوّك</CardTitle>
            <CardDescription>
              لا فئات بعد — أضف فئة ثم المنتجات ليظهر المنيو للضيوف.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/categories">
              <Button>أضف فئة</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="الفئات" value={categories.length} />
          <Kpi label="المنتجات" value={products.length} hint={`${available} متاح`} />
          {orderingOn && (
            <Kpi label="طلبات اليوم" value={sales?.orderCount ?? 0} />
          )}
          {orderingOn && (
            <Kpi
              label="مبيعات اليوم"
              value={`${sales?.revenue ?? 0}`}
              hint={brand.currency || "EGP"}
            />
          )}
          {inventoryOn && <Kpi label="تنبيه مخزون" value={lowStock} />}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/products">
          <Button>منتج جديد</Button>
        </Link>
        {purchasingOn && (
          <Link href="/dashboard/purchasing">
            <Button variant="secondary">المشتريات</Button>
          </Link>
        )}
        {orderingOn && (
          <Link href="/dashboard/orders">
            <Button variant="outline">الطلبات</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {orderingOn && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">آخر الطلبات</CardTitle>
              <CardDescription>المفتوحة الآن</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.length === 0 && (
                <p className="text-sm text-[var(--brand-muted)]">
                  لا طلبات مفتوحة.
                </p>
              )}
              {recent.map((o) => (
                <Link
                  key={o.id}
                  href="/dashboard/orders"
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--brand-line)] px-3 text-sm"
                >
                  <span className="font-semibold">#{o.code}</span>
                  <span className="truncate text-[var(--brand-muted)]">
                    {o.tableLabel || o.channel}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background:
                        o.status === "new"
                          ? "color-mix(in srgb, var(--brand-accent) 25%, white)"
                          : "color-mix(in srgb, var(--brand-primary) 12%, white)",
                      color: "var(--brand-primary)",
                    }}
                  >
                    {statusLabel[o.status] || o.status}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">البراند</CardTitle>
            <CardDescription>
              الألوان واللوجو من حزمة الوكالة — لا تُعدَّل من هنا.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                className="h-14 w-14 rounded-2xl object-contain ring-1 ring-[var(--brand-line)]"
              />
            ) : null}
            <div className="flex gap-3">
              <Swatch color={brand.colors.primary} name="Primary" />
              <Swatch color={brand.colors.accent} name="Accent" />
              <Swatch color={brand.colors.surface} name="Surface" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-[var(--brand-muted)]">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--brand-primary)]">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-[var(--brand-muted)]">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Swatch({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="h-8 w-8 rounded-full border border-[var(--brand-line)]"
        style={{ background: color }}
      />
      <span className="text-[10px] text-[var(--brand-muted)]">{name}</span>
    </div>
  );
}
