import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { listCategories, listProducts } from "@/lib/menu-data";
import { readBrand } from "@/lib/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function DashboardHome() {
  if (!(await isAuthenticated())) {
    redirect("/dashboard/login");
  }

  const [brand, categories, products] = await Promise.all([
    readBrand(),
    listCategories(),
    listProducts(),
  ]);

  const available = products.filter((p) => p.available).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">مرحباً — {brand.displayName}</h1>
          <p className="text-sm text-black/50">
            إدارة الفئات والمنتجات
            {brand.extensions?.ordering?.orderFromMenu
              ? " والطلبات."
              : ". المنيو للعرض فقط ما لم تُفعَّل ميزة الطلب من الوكالة."}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="الفئات" value={categories.length} />
        <Stat title="المنتجات" value={products.length} />
        <Stat title="متاح للعرض" value={available} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/categories">
          <Button>إدارة الفئات</Button>
        </Link>
        <Link href="/dashboard/products">
          <Button variant="secondary">إدارة المنتجات</Button>
        </Link>
        {brand.extensions?.ordering?.orderFromMenu && (
          <Link href="/dashboard/orders">
            <Button variant="outline">الطلبات</Button>
          </Link>
        )}
        <Link href="/" target="_blank">
          <Button variant="outline">فتح المنيو</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">البراند</CardTitle>
          <CardDescription>
            الألوان واللوجو مضبوطة من حزمة الوكالة — لا تُعدَّل من هنا في v1.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-contain"
            />
          ) : null}
          <div className="flex gap-2">
            <span
              className="h-6 w-6 rounded-full border"
              style={{ background: brand.colors.primary }}
            />
            <span
              className="h-6 w-6 rounded-full border"
              style={{ background: brand.colors.accent }}
            />
            <span
              className="h-6 w-6 rounded-full border"
              style={{ background: brand.colors.surface }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-black/45">{title}</p>
        <p className="text-2xl font-bold text-[var(--brand-primary)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
