"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  priceAfterDiscount,
  resolveDiscount,
  configuredBasePrice,
  lineKey,
  optionLabels,
  reviewOverall,
  type Banner,
  type BrandConfig,
  type Category,
  type Contact,
  type Product,
  type Review,
} from "@/lib/types";
import { inSchedule, prepLabel } from "@/lib/commerce";
import { dirFor, pickLocalized, type Locale } from "@/lib/i18n";
import { childrenOf } from "@/lib/menu-data-browser";
import { RateFormModal } from "@/components/menu/rate-form-modal";
import { PromoBannerCarousel } from "@/components/menu/promo-banners";
import { PublicMenuFooter } from "@/components/menu/public-footer";
import { CartProvider, useCart } from "@/components/menu/cart-context";
import { CartCheckout } from "@/components/menu/cart-checkout";
import { OptionPicker } from "@/components/menu/option-picker";
import {
  isOrderingEnabled,
  normalizeOrderingFeatures,
} from "@/lib/extensions/ordering";

type Props = {
  brand: BrandConfig;
  categories: Category[];
  products: Product[];
  contacts: Contact[];
  reviews: Review[];
  banners: Banner[];
  /** productId → remaining qty; empty when inventory off */
  stockMap?: Record<string, number>;
  inventoryEnabled?: boolean;
  branchId?: string;
  branchLabel?: string;
  seasonalNote?: string;
  seasonalNoteEn?: string;
};

export function PublicMenu(props: Props) {
  const features = normalizeOrderingFeatures(props.brand.extensions?.ordering);
  return (
    <CartProvider maxItems={features.maxItemsPerOrder || 50}>
      <PublicMenuInner {...props} features={features} />
    </CartProvider>
  );
}

function PublicMenuInner({
  brand,
  categories,
  products,
  contacts,
  reviews,
  banners,
  stockMap = {},
  inventoryEnabled = false,
  branchId,
  branchLabel,
  seasonalNote,
  seasonalNoteEn,
  features,
}: Props & {
  features: ReturnType<typeof normalizeOrderingFeatures>;
}) {
  const orderingOn = isOrderingEnabled(features);
  const inventoryOn = inventoryEnabled;
  const mode = brand.languages || "both";
  const currency = brand.currency || "EGP";
  const [locale, setLocale] = useState<Locale>(mode === "en" ? "en" : "ar");
  const [query, setQuery] = useState("");
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [picking, setPicking] = useState<Product | null>(null);
  const cart = useCart();

  function stockFor(id: string): number | null {
    if (!inventoryOn) return null;
    return stockMap[id] ?? 0;
  }

  function isOut(id: string): boolean {
    const s = stockFor(id);
    return s !== null && s <= 0;
  }

  const currentParent = pathIds.length ? pathIds[pathIds.length - 1] : null;
  const childCats = useMemo(
    () => childrenOf(categories, currentParent),
    [categories, currentParent]
  );

  const breadcrumb = useMemo(() => {
    return pathIds
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean) as Category[];
  }, [pathIds, categories]);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  function commitAdd(
    p: Product,
    selections: { groupId: string; valueId: string }[] = [],
    prep: string[] = []
  ) {
    if (isOut(p.id)) return;
    const discount = resolveDiscount(p, catMap.get(p.categoryId));
    const base = configuredBasePrice(p, selections);
    const pricing = priceAfterDiscount(base, discount);
    const have = stockFor(p.id);
    if (have !== null) {
      const inCart = cart.lines
        .filter((l) => l.itemId === p.id)
        .reduce((s, l) => s + l.qty, 0);
      if (inCart + 1 > have) return;
    }
    const extrasAr = [
      ...optionLabels(p, selections, "ar"),
      ...prep.map((id) => prepLabel(id, "ar")),
    ];
    const extrasEn = [
      ...optionLabels(p, selections, "en"),
      ...prep.map((id) => prepLabel(id, "en")),
    ];
    cart.addItem({
      itemId: p.id,
      lineKey: lineKey(p.id, selections, prep),
      name: extrasAr.length ? `${p.name} · ${extrasAr.join(" · ")}` : p.name,
      nameEn: extrasEn.length
        ? `${p.nameEn || p.name} · ${extrasEn.join(" · ")}`
        : p.nameEn,
      unitPrice: pricing.final,
      image: p.image,
      options: selections,
      prep,
    });
  }

  function addProduct(p: Product) {
    if ((p.optionGroups || []).length || p.prepEnabled) {
      setPicking(p);
      return;
    }
    commitAdd(p);
  }

  const productsHere = useMemo(() => {
    const live = products.filter(
      (p) => p.available && inSchedule(p.offerFrom, p.offerUntil)
    );
    if (!currentParent) return live;
    return live.filter((p) => p.categoryId === currentParent);
  }, [products, currentParent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = productsHere;
    if (q) {
      list = products.filter((p) => {
        if (!p.available) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nameEn || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.descriptionEn || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [productsHere, products, query]);

  const featured = useMemo(() => {
    if (query || currentParent) return [];
    return products.filter((p) => p.available && p.featured && inSchedule(p.offerFrom, p.offerUntil));
  }, [products, query, currentParent]);

  const visibleReviews = reviews.filter((r) => r.visible).slice(0, 6);
  const bg = brand.menuBackgroundUrl;

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[var(--brand-surface)]"
      dir={dirFor(locale)}
      lang={locale}
    >
      {bg ? (
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
      ) : null}

      <PromoBannerCarousel
        banners={banners.filter((b) => inSchedule(b.startsAt, b.endsAt))}
      />

      <header className="sticky top-0 z-20 border-b border-[var(--brand-line)] bg-[color-mix(in_srgb,var(--brand-surface)_88%,white)]/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.displayName}
              className="h-11 w-11 rounded-full bg-white object-contain p-0.5 shadow-sm ring-1 ring-[var(--brand-line)]"
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-sm"
              style={{ color: brand.colors.primary }}
            >
              {brand.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-tight sm:text-lg">
              {brand.displayName}
            </h1>
            {branchLabel ? (
              <p className="truncate text-xs text-[var(--brand-muted)]">
                {branchLabel}
              </p>
            ) : (
              <p className="truncate text-xs text-[var(--brand-muted)]">
                {pickLocalized(locale, brand.slogan, brand.sloganEn) ||
                  (orderingOn
                    ? locale === "en"
                      ? "Order from your phone"
                      : "اطلب من الموبايل"
                    : locale === "en"
                      ? "Digital menu"
                      : "منيو رقمي")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRateOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-accent)] touch-manipulation"
              aria-label={locale === "en" ? "Open Rate Form" : "فتح نموذج التقييم"}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2.5l2.74 6.42 6.96.62-5.26 4.66 1.56 6.8L12 17.77l-5.99 3.23 1.56-6.8L2.3 9.54l6.96-.62L12 2.5z" />
              </svg>
            </button>
            {mode === "both" && (
              <div className="flex gap-1 rounded-full border border-[var(--brand-line)] bg-white p-1 text-xs">
                <button
                  type="button"
                  className={`min-h-9 rounded-full px-3 touch-manipulation ${locale === "ar" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-muted)]"}`}
                  onClick={() => setLocale("ar")}
                >
                  عربي
                </button>
                <button
                  type="button"
                  className={`min-h-9 rounded-full px-3 touch-manipulation ${locale === "en" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-muted)]"}`}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
              </div>
            )}
          </div>
        </div>
        {(pickLocalized(locale, seasonalNote, seasonalNoteEn) ||
          (brand.taxPercent && brand.taxPercent > 0)) && (
          <p className="mx-auto max-w-3xl px-4 pb-2 text-xs text-[var(--brand-muted)]">
            {pickLocalized(locale, seasonalNote, seasonalNoteEn)}
            {brand.taxPercent && brand.taxPercent > 0
              ? `${pickLocalized(locale, seasonalNote, seasonalNoteEn) ? " · " : ""}${
                  brand.taxInclusive !== false
                    ? locale === "en"
                      ? `Prices include ${brand.taxPercent}% tax`
                      : `الأسعار شاملة ضريبة ${brand.taxPercent}%`
                    : locale === "en"
                      ? `+${brand.taxPercent}% tax at checkout`
                      : `+${brand.taxPercent}% ضريبة عند الحساب`
                }`
              : ""}
          </p>
        )}
      </header>

      <div className="relative mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-5">
        <div className="sticky top-0 z-10 -mx-3 border-b border-black/5 bg-white/90 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "en" ? "Search…" : "ابحث عن صنف…"}
            className="mb-3 h-11 w-full rounded-full border border-[var(--brand-line)] bg-white px-4 text-base outline-none focus:ring-2 focus:ring-[var(--brand-primary)] sm:text-sm"
          />

          {!query && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-black/50">
                <button
                  type="button"
                  className="min-h-9 rounded px-2 touch-manipulation hover:text-[var(--brand-primary)]"
                  onClick={() => setPathIds([])}
                >
                  {locale === "en" ? "Home" : "الرئيسية"}
                </button>
                {breadcrumb.map((c, i) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <span>/</span>
                    <button
                      type="button"
                      className="min-h-9 rounded px-2 touch-manipulation hover:text-[var(--brand-primary)]"
                      onClick={() => setPathIds(pathIds.slice(0, i + 1))}
                    >
                      {pickLocalized(locale, c.name, c.nameEn)}
                    </button>
                  </span>
                ))}
              </div>
              {childCats.length > 0 && (
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {childCats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPathIds([...pathIds, c.id])}
                      className="min-h-10 shrink-0 touch-manipulation rounded-full px-3.5 py-2 text-xs font-medium text-white"
                      style={{ background: "var(--brand-primary)" }}
                    >
                      {pickLocalized(locale, c.name, c.nameEn)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {featured.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">
              {locale === "en" ? "Featured" : "أصناف مميزة"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {featured.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  category={catMap.get(p.categoryId)}
                  locale={locale}
                  currency={currency}
                  index={i}
                  featured
                  orderingOn={orderingOn}
                  outOfStock={isOut(p.id)}
                  onAdd={
                    orderingOn && !isOut(p.id)
                      ? () => addProduct(p)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          {currentParent && !query && (
            <h2 className="mb-3 border-b border-black/10 pb-2 text-lg font-bold">
              {pickLocalized(
                locale,
                catMap.get(currentParent)?.name,
                catMap.get(currentParent)?.nameEn
              )}
            </h2>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered
              .filter((p) => (currentParent || query ? true : !p.featured))
              .map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  category={catMap.get(p.categoryId)}
                  locale={locale}
                  currency={currency}
                  index={i}
                  orderingOn={orderingOn}
                  outOfStock={isOut(p.id)}
                  onAdd={
                    orderingOn && !isOut(p.id)
                      ? () => addProduct(p)
                      : undefined
                  }
                />
              ))}
          </div>
          {filtered.length === 0 && childCats.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/45">
              {locale === "en" ? "No items" : "لا توجد أصناف"}
            </p>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[var(--brand-ink)]">
              {locale === "en" ? "Reviews" : "آراء العملاء"}
            </h2>
            <button
              type="button"
              onClick={() => setRateOpen(true)}
              className="min-h-10 text-sm font-medium text-[var(--brand-primary)] underline-offset-2 touch-manipulation hover:underline"
            >
              {locale === "en" ? "Leave a review" : "اترك تقييماً"}
            </button>
          </div>
          <ul className="space-y-2">
            {visibleReviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-black/8 bg-white/95 p-3 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--brand-accent)]">
                    {"★".repeat(Math.round(reviewOverall(r)))}
                  </span>
                  <span className="text-xs text-black/45">
                    {r.name || (locale === "en" ? "Guest" : "زائر")}
                  </span>
                </div>
                {(r.anythingElse || r.comment) && (
                  <p className="mt-1 text-[var(--brand-ink)]">
                    {r.anythingElse || r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {contacts.filter((c) => c.active).length > 0 && (
          <section className="mt-10 rounded-xl border border-black/10 bg-white/95 p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[var(--brand-primary)]">
              {locale === "en" ? "Contact" : "تواصل معنا"}
            </h2>
            <ul className="flex flex-col gap-2">
              {contacts
                .filter((c) => c.active)
                .map((c) => (
                  <li key={c.id}>
                    <a
                      href={contactHref(c)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-[var(--brand-surface)]"
                    >
                      <span className="font-medium">
                        {c.label || contactLabel(c.type, locale)}
                      </span>
                      <span className="truncate text-black/45" dir="ltr">
                        {c.value}
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {!orderingOn && (
          <div className="mt-8 rounded-xl border border-dashed border-black/15 bg-white/70 p-4 text-center text-xs text-black/45">
            {locale === "en"
              ? "Ordering is not enabled for this menu."
              : "الطلب من المنيو غير مفعّل لهذا العميل."}
          </div>
        )}

        <PublicMenuFooter displayName={brand.displayName} locale={locale} />
      </div>

      {orderingOn && (
        <>
          {cart.count > 0 && (
            <button
              type="button"
              onClick={() => cart.setOpen(true)}
              className="fixed bottom-4 start-4 end-4 z-40 mx-auto flex h-14 max-w-md items-center justify-between rounded-full px-5 font-bold text-white shadow-lg touch-manipulation"
              style={{ background: "var(--brand-primary)" }}
            >
              <span>
                {locale === "en"
                  ? `${cart.count} items · ${formatPrice(cart.subtotal, currency, locale)}`
                  : `${cart.count} أصناف · ${formatPrice(cart.subtotal, currency, locale)}`}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                {locale === "en" ? "Checkout" : "إتمام الطلب"}
              </span>
            </button>
          )}
          <CartCheckout
            locale={locale}
            currency={currency}
            tableOrdering={features.tableOrderingEnabled}
            delivery={features.deliveryEnabled}
            pickup={features.pickupEnabled}
            zonesEnabled={
              features.tableOrderingEnabled && features.zonesIndoorOutdoor
            }
            guestNoteEnabled={features.guestNoteEnabled}
            branchId={branchId}
            taxPercent={brand.taxPercent}
            taxInclusive={brand.taxInclusive !== false}
          />
        </>
      )}

      {picking && (
        <OptionPicker
          product={picking}
          category={catMap.get(picking.categoryId)}
          locale={locale}
          currency={currency}
          onCancel={() => setPicking(null)}
          onConfirm={(selections, prep) => {
            commitAdd(picking, selections, prep);
            setPicking(null);
          }}
        />
      )}

      <RateFormModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        locale={locale}
      />
    </div>
  );
}

function ProductCard({
  product,
  category,
  locale,
  currency,
  index,
  featured,
  orderingOn,
  outOfStock,
  onAdd,
}: {
  product: Product;
  category?: Category;
  locale: Locale;
  currency: string;
  index: number;
  featured?: boolean;
  orderingOn?: boolean;
  outOfStock?: boolean;
  onAdd?: () => void;
}) {
  const discount = resolveDiscount(product, category);
  const pricing = priceAfterDiscount(product.price, discount);
  const title = pickLocalized(locale, product.name, product.nameEn);
  const desc = pickLocalized(locale, product.description, product.descriptionEn);

  return (
    <div
      className={`flex min-w-0 gap-3 overflow-hidden rounded-2xl border border-[var(--brand-line)] bg-white p-3 shadow-[0_1px_2px_rgba(26,20,16,.06),0_8px_24px_rgba(26,20,16,.04)] transition ${
        outOfStock ? "opacity-60" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link
        href={`/item/${product.id}`}
        className="flex min-w-0 flex-1 gap-3 active:scale-[0.99]"
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-20 sm:w-20"
          style={{
            background: featured
              ? "linear-gradient(145deg, var(--brand-accent), var(--brand-primary))"
              : "linear-gradient(145deg, var(--brand-surface), #fff)",
          }}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-[var(--brand-primary)]/40">
              {title.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="break-words font-semibold leading-snug">{title}</h3>
            {featured && !outOfStock && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: "var(--brand-accent)", color: "#1a1410" }}
              >
                {locale === "en" ? "Featured" : "مميز"}
              </span>
            )}
            {outOfStock && (
              <span className="shrink-0 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-bold text-black/55">
                {locale === "en" ? "Sold out" : "نفد"}
              </span>
            )}
          </div>
          {desc && (
            <p className="mt-0.5 line-clamp-2 text-xs text-black/50">{desc}</p>
          )}
          {(product.optionGroups || []).length > 0 && (
            <p className="mt-1 text-[10px] font-semibold text-black/40">
              {locale === "en" ? "Options" : "خيارات"}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-bold text-[var(--brand-primary)]">
              {formatPrice(pricing.final, currency, locale)}
            </p>
            {pricing.hasDiscount && (
              <p className="text-xs text-black/40 line-through">
                {formatPrice(pricing.original, currency, locale)}
              </p>
            )}
          </div>
        </div>
      </Link>
      {orderingOn && onAdd && !outOfStock && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAdd();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-lg font-bold text-white touch-manipulation"
          style={{ background: "var(--brand-primary)" }}
          aria-label={locale === "en" ? "Add to cart" : "أضف للسلة"}
        >
          +
        </button>
      )}
      {orderingOn && outOfStock && (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full bg-black/10 text-[10px] font-bold text-black/40"
          aria-hidden
        >
          —
        </span>
      )}
    </div>
  );
}

function contactHref(c: Contact): string {
  switch (c.type) {
    case "whatsapp": {
      const n = c.value.replace(/[^\d]/g, "");
      return `https://wa.me/${n}`;
    }
    case "phone":
      return `tel:${c.value}`;
    case "email":
      return `mailto:${c.value}`;
    default:
      return c.value.startsWith("http") ? c.value : `https://${c.value}`;
  }
}

function contactLabel(type: Contact["type"], locale: Locale): string {
  const map: Record<Contact["type"], [string, string]> = {
    whatsapp: ["واتساب", "WhatsApp"],
    phone: ["تليفون", "Phone"],
    instagram: ["إنستجرام", "Instagram"],
    facebook: ["فيسبوك", "Facebook"],
    tiktok: ["تيك توك", "TikTok"],
    email: ["إيميل", "Email"],
    maps: ["الموقع", "Maps"],
  };
  return locale === "en" ? map[type][1] : map[type][0];
}
