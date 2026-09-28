import Link from "next/link";
import { notFound } from "next/navigation";
import { readBrand, defaultLocale } from "@/lib/brand";
import {
  getCategory,
  getProduct,
  listReviews,
} from "@/lib/menu-data";
import {
  priceAfterDiscount,
  resolveDiscount,
} from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { pickLocalized } from "@/lib/i18n";
import {
  isOrderingEnabled,
  normalizeOrderingFeatures,
} from "@/lib/extensions/ordering";
import { getStockMap, isInventoryOn } from "@/lib/inventory-data";
import { PublicMenuFooter } from "@/components/menu/public-footer";
import { ItemOrderPanel } from "@/components/menu/item-order-panel";

type Ctx = { params: Promise<{ id: string }> };

export default async function ItemPage({ params }: Ctx) {
  const { id } = await params;
  const [brand, product] = await Promise.all([readBrand(), getProduct(id)]);
  if (!product || !product.available) notFound();

  const category = product.categoryId
    ? await getCategory(product.categoryId)
    : null;
  const discount = resolveDiscount(product, category);
  const pricing = priceAfterDiscount(product.price, discount);
  const locale = defaultLocale(brand.languages);
  const currency = brand.currency || "EGP";
  const features = normalizeOrderingFeatures(brand.extensions?.ordering);
  const orderingOn = isOrderingEnabled(features);
  const invOn = await isInventoryOn();
  const stockMap = invOn ? await getStockMap() : {};
  const stockQty = invOn ? (stockMap[product.id] ?? 0) : null;
  const outOfStock = stockQty !== null && stockQty <= 0;
  const title = pickLocalized(locale, product.name, product.nameEn);
  const desc = pickLocalized(
    locale,
    product.description,
    product.descriptionEn
  );
  const reviews = (await listReviews()).filter(
    (r) => r.visible && r.productId === product.id
  );
  const bg = brand.menuBackgroundUrl;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--brand-surface)]">
      {bg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bg}
            alt=""
            className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0.94) 100%)",
            }}
          />
        </>
      )}
      <div className="relative mx-auto max-w-lg">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${brand.colors.accent}, ${brand.colors.primary})`,
          }}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-extrabold text-white/40">
              {title.slice(0, 1)}
            </div>
          )}
          <Link
            href="/"
            className="absolute start-3 top-3 min-h-11 rounded-full bg-black/50 px-4 text-sm font-medium text-white backdrop-blur"
          >
            {locale === "en" ? "Back" : "رجوع"}
          </Link>
        </div>

        <div className="space-y-4 px-4 py-5">
          <div>
            {category && (
              <p className="text-xs font-medium text-[var(--brand-primary)]">
                {pickLocalized(locale, category.name, category.nameEn)}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold text-[var(--brand-ink)]">
              {title}
            </h1>
            {product.nameEn && brand.languages === "both" && locale === "ar" && (
              <p className="text-sm text-black/45" dir="ltr">
                {product.nameEn}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-bold text-[var(--brand-primary)]">
              {formatPrice(pricing.final, currency, locale)}
            </p>
            {pricing.hasDiscount && (
              <>
                <p className="text-base text-black/40 line-through">
                  {formatPrice(pricing.original, currency, locale)}
                </p>
                <span className="rounded bg-[var(--brand-accent)] px-2 py-0.5 text-xs font-bold text-black">
                  {discount?.type === "percent"
                    ? `-${discount.value}%`
                    : `-${formatPrice(discount?.value || 0, currency, locale)}`}
                </span>
              </>
            )}
            {outOfStock && (
              <span className="rounded bg-black/10 px-2 py-0.5 text-xs font-bold text-black/55">
                {locale === "en" ? "Sold out" : "نفد"}
              </span>
            )}
          </div>

          {desc && (
            <p className="text-sm leading-relaxed text-black/70">{desc}</p>
          )}

          {orderingOn ? (
            outOfStock ? (
              <p className="rounded-xl border border-black/10 bg-white p-4 text-center text-sm text-black/55">
                {locale === "en"
                  ? "This item is currently sold out."
                  : "الصنف نفد حالياً من المخزون."}
              </p>
            ) : (
              <ItemOrderPanel
                locale={locale}
                currency={currency}
                maxItems={features.maxItemsPerOrder || 50}
                tableOrdering={features.tableOrderingEnabled}
                delivery={features.deliveryEnabled}
                zonesEnabled={
                  features.tableOrderingEnabled && features.zonesIndoorOutdoor
                }
                guestNoteEnabled={features.guestNoteEnabled}
                stockQty={stockQty}
                item={{
                  itemId: product.id,
                  name: product.name,
                  nameEn: product.nameEn,
                  unitPrice: pricing.final,
                  image: product.image,
                }}
              />
            )
          ) : (
            <p className="text-center text-xs text-black/40">
              {locale === "en"
                ? "Ordering is not enabled for this menu."
                : "الطلب من المنيو غير مفعّل لهذا العميل."}
            </p>
          )}

          {reviews.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h2 className="mb-2 text-sm font-bold">
                {locale === "en" ? "Reviews" : "تقييمات هذا الصنف"}
              </h2>
              <ul className="space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <span className="text-[var(--brand-accent)]">
                      {"★".repeat(r.rating ?? 0)}
                    </span>{" "}
                    {r.comment}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={orderingOn && !outOfStock ? "pb-20" : undefined}>
            <PublicMenuFooter displayName={brand.displayName} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
