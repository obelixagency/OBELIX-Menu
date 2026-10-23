"use client";
import { mediaUrl } from "@/lib/base-path";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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

  const live = useMemo(
    () =>
      products.filter((p) => p.available && inSchedule(p.offerFrom, p.offerUntil)),
    [products]
  );

  /**
   * One section per category that directly holds items, in tree order
   * (parent sortOrder, then child sortOrder). Items whose category is missing
   * or hidden fall into a trailing "More" section so nothing disappears.
   */
  const sections = useMemo(() => {
    const active = categories.filter((c) => c.active);
    const byParent = new Map<string | null, Category[]>();
    for (const c of active) {
      const k = c.parentId ?? null;
      byParent.set(k, [...(byParent.get(k) || []), c]);
    }
    const ordered: Category[] = [];
    const walk = (parent: string | null) => {
      for (const c of (byParent.get(parent) || []).sort(
        (a, b) => a.sortOrder - b.sortOrder
      )) {
        ordered.push(c);
        walk(c.id);
      }
    };
    walk(null);
    const out: { id: string; cat: Category | null; items: Product[] }[] = [];
    const placed = new Set<string>();
    for (const c of ordered) {
      const items = live
        .filter((p) => p.categoryId === c.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (items.length) {
        out.push({ id: c.id, cat: c, items });
        items.forEach((p) => placed.add(p.id));
      }
    }
    const rest = live.filter((p) => !placed.has(p.id));
    if (rest.length) out.push({ id: "_more", cat: null, items: rest });
    return out;
  }, [categories, live]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return live.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.descriptionEn || "").toLowerCase().includes(q)
    );
  }, [live, query]);

  const featured = useMemo(
    () => (results ? [] : live.filter((p) => p.featured)),
    [live, results]
  );

  // Scroll-spy: highlight the tab of the section under the sticky bar.
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (results) return;
    const els = sections
      .map((s) => document.getElementById(`sec-${s.id}`))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.id.slice(4));
      },
      { rootMargin: "-120px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections, results]);

  useEffect(() => {
    if (!activeSection || !tabsRef.current) return;
    const tab = tabsRef.current.querySelector<HTMLElement>(
      `[data-sec="${activeSection}"]`
    );
    if (!tab) return;
    // Scroll only the tab strip; scrollIntoView would also move the page and
    // cancel the smooth jump to the section.
    const strip = tabsRef.current;
    const left =
      tab.offsetLeft - strip.clientWidth / 2 + tab.clientWidth / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [activeSection]);

  function jumpTo(id: string) {
    setActiveSection(id);
    document
      .getElementById(`sec-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const shownSection = activeSection ?? sections[0]?.id ?? null;

  const visibleReviews = reviews.filter((r) => r.visible).slice(0, 6);
  const cover = mediaUrl(brand.menuBackgroundUrl);
  const note = pickLocalized(locale, seasonalNote, seasonalNoteEn);
  const taxLine =
    brand.taxPercent && brand.taxPercent > 0
      ? brand.taxInclusive !== false
        ? locale === "en"
          ? `Prices include ${brand.taxPercent}% VAT`
          : `الأسعار شاملة ضريبة ${brand.taxPercent}%`
        : locale === "en"
          ? `+${brand.taxPercent}% VAT at checkout`
          : `+${brand.taxPercent}% ضريبة عند الحساب`
      : "";
  const tagline =
    pickLocalized(locale, brand.slogan, brand.sloganEn) ||
    (orderingOn
      ? locale === "en"
        ? "Order from your phone"
        : "اطلب من الموبايل"
      : locale === "en"
        ? "Digital menu"
        : "منيو رقمي");

  const rowProps = (p: Product) => ({
    product: p,
    category: catMap.get(p.categoryId),
    locale,
    currency,
    orderingOn,
    outOfStock: isOut(p.id),
    onAdd: orderingOn && !isOut(p.id) ? () => addProduct(p) : undefined,
  });

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[var(--brand-surface)] pb-24"
      dir={dirFor(locale)}
      lang={locale}
    >
      <header className="relative">
        {cover ? (
          <div className="relative h-44 w-full overflow-hidden sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 70%, rgba(0,0,0,.18) 100%)",
              }}
            />
          </div>
        ) : null}

        <div
          className={`absolute inset-x-0 top-0 z-10 mx-auto flex max-w-3xl justify-end gap-1.5 px-4 pt-3 ${
            cover ? "" : "relative"
          }`}
        >
          <button
            type="button"
            onClick={() => setRateOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--brand-accent)] shadow-sm backdrop-blur touch-manipulation"
            aria-label={locale === "en" ? "Rate your visit" : "قيّم زيارتك"}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.74 6.42 6.96.62-5.26 4.66 1.56 6.8L12 17.77l-5.99 3.23 1.56-6.8L2.3 9.54l6.96-.62L12 2.5z" />
            </svg>
          </button>
          {mode === "both" && (
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="h-10 rounded-full bg-white/90 px-4 text-sm font-bold text-[var(--brand-ink)] shadow-sm backdrop-blur touch-manipulation"
              lang={locale === "ar" ? "en" : "ar"}
            >
              {locale === "ar" ? "English" : "عربي"}
            </button>
          )}
        </div>

        <div
          className={`relative mx-auto flex max-w-3xl items-start gap-3 px-4 ${
            cover ? "" : "pt-4"
          }`}
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(brand.logoUrl) ?? undefined}
              alt={brand.displayName}
              className={`h-[72px] w-[72px] shrink-0 rounded-2xl bg-white object-contain p-1 shadow-md ring-4 ring-[var(--brand-surface)] ${cover ? "-mt-9" : ""}`}
            />
          ) : (
            <div
              className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold shadow-md ring-4 ring-[var(--brand-surface)] ${cover ? "-mt-9" : ""}`}
              style={{ color: brand.colors.primary }}
            >
              {brand.displayName.slice(0, 1)}
            </div>
          )}
          <div className={`min-w-0 flex-1 ${cover ? "pt-2" : "pt-1"}`}>
            <h1 className="truncate text-xl font-extrabold leading-tight tracking-tight text-[var(--brand-ink)]">
              {brand.displayName}
            </h1>
            <p className="truncate text-sm text-[var(--brand-muted)]">
              {branchLabel ? `${tagline} · ${branchLabel}` : tagline}
            </p>
          </div>
        </div>
        {(note || taxLine) && (
          <p className="mx-auto mt-2 max-w-3xl px-4 text-xs text-[var(--brand-muted)]">
            {[note, taxLine].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      {/* Sticky category tabs + search */}
      <div
        className="sticky top-0 z-30 mt-4 border-b border-[var(--brand-line)] backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--brand-surface) 94%, transparent)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          {searchOpen ? (
            <>
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={locale === "en" ? "Search the menu" : "ابحث في المنيو"}
                className="h-10 min-w-0 flex-1 rounded-full border border-[var(--brand-line)] bg-white px-4 text-base outline-none focus:ring-2 focus:ring-[var(--brand-primary)] sm:text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                className="h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-[var(--brand-primary)] touch-manipulation"
              >
                {locale === "en" ? "Close" : "إغلاق"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-ink)] touch-manipulation"
                aria-label={locale === "en" ? "Search the menu" : "ابحث في المنيو"}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </button>
              <div
                ref={tabsRef}
                className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
              >
                {sections.map((s) => {
                  const on = shownSection === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-sec={s.id}
                      onClick={() => jumpTo(s.id)}
                      aria-current={on}
                      className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors touch-manipulation ${
                        on
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--brand-ink)] hover:bg-black/5"
                      }`}
                    >
                      {s.cat
                        ? pickLocalized(locale, s.cat.name, s.cat.nameEn)
                        : locale === "en"
                          ? "More"
                          : "أصناف أخرى"}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4">
        {results ? (
          <section className="mt-5">
            <p className="mb-2 text-sm text-[var(--brand-muted)]">
              {results.length
                ? locale === "en"
                  ? `${results.length} results`
                  : `${results.length} نتيجة`
                : locale === "en"
                  ? "Nothing matches that. Try another word."
                  : "مفيش صنف بالاسم ده. جرّب كلمة تانية."}
            </p>
            {results.length > 0 && (
              <div className="divide-y divide-[var(--brand-line)] rounded-2xl bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,.05)]">
                {results.map((p) => (
                  <ProductRow key={p.id} {...rowProps(p)} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {banners.length > 0 && (
              <div className="mt-5">
                <PromoBannerCarousel banners={banners} locale={locale} />
              </div>
            )}

            {featured.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-lg font-extrabold text-[var(--brand-ink)]">
                  {locale === "en" ? "Most ordered" : "الأكثر طلباً"}
                </h2>
                <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
                  {featured.map((p) => (
                    <FeaturedCard key={p.id} {...rowProps(p)} />
                  ))}
                </div>
              </section>
            )}

            {sections.map((s) => (
              <section
                key={s.id}
                id={`sec-${s.id}`}
                className="mt-8 scroll-mt-20"
              >
                <h2 className="mb-2 flex items-baseline gap-2 text-lg font-extrabold text-[var(--brand-ink)]">
                  {s.cat
                    ? pickLocalized(locale, s.cat.name, s.cat.nameEn)
                    : locale === "en"
                      ? "More"
                      : "أصناف أخرى"}
                  {s.cat?.discountType && (s.cat.discountValue ?? 0) > 0 ? (
                    <span className="rounded-full bg-[var(--brand-accent)] px-2 py-0.5 text-[11px] font-bold text-[#1a1410]">
                      {s.cat.discountType === "percent"
                        ? locale === "en"
                          ? `${s.cat.discountValue}% off`
                          : `خصم ${s.cat.discountValue}%`
                        : locale === "en"
                          ? "Offer"
                          : "عرض"}
                    </span>
                  ) : null}
                </h2>
                <div className="divide-y divide-[var(--brand-line)] rounded-2xl bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,.05)]">
                  {s.items.map((p) => (
                    <ProductRow key={p.id} {...rowProps(p)} />
                  ))}
                </div>
              </section>
            ))}

            {live.length === 0 && (
              <p className="mt-10 text-center text-sm text-[var(--brand-muted)]">
                {locale === "en"
                  ? "The menu is being updated. Please check back shortly."
                  : "المنيو بيتحدّث دلوقتي. ارجع بعد شوية."}
              </p>
            )}
          </>
        )}

        {visibleReviews.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[var(--brand-ink)]">
                {locale === "en" ? "What guests say" : "آراء الضيوف"}
              </h2>
              <button
                type="button"
                onClick={() => setRateOpen(true)}
                className="min-h-10 text-sm font-semibold text-[var(--brand-primary)] underline-offset-2 touch-manipulation hover:underline"
              >
                {locale === "en" ? "Rate your visit" : "قيّم زيارتك"}
              </button>
            </div>
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {visibleReviews.map((r) => (
                <li
                  key={r.id}
                  className="w-[78%] max-w-xs shrink-0 snap-start rounded-2xl bg-white p-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,.05)]"
                >
                  <span
                    className="text-[var(--brand-accent)]"
                    aria-label={`${Math.round(reviewOverall(r))} / 5`}
                  >
                    {"★".repeat(Math.round(reviewOverall(r)))}
                  </span>
                  {(r.anythingElse || r.comment) && (
                    <p className="mt-1 line-clamp-3 text-[var(--brand-ink)]">
                      {r.anythingElse || r.comment}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--brand-muted)]">
                    {r.name || (locale === "en" ? "Guest" : "ضيف")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {contacts.filter((c) => c.active).length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-extrabold text-[var(--brand-ink)]">
              {locale === "en" ? "Get in touch" : "تواصل معانا"}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {contacts
                .filter((c) => c.active)
                .map((c) => (
                  <li key={c.id}>
                    <a
                      href={contactHref(c)}
                      target={c.type === "phone" ? undefined : "_blank"}
                      rel="noreferrer"
                      className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[var(--brand-ink)] shadow-[0_1px_2px_rgba(0,0,0,.05)] hover:bg-white/80"
                    >
                      {c.label || contactLabel(c.type, locale)}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <PublicMenuFooter displayName={brand.displayName} locale={locale} />
      </main>

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
                {locale === "en" ? "View order" : "عرض الطلب"}
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

type RowProps = {
  product: Product;
  category?: Category;
  locale: Locale;
  currency: string;
  orderingOn?: boolean;
  outOfStock?: boolean;
  onAdd?: () => void;
};

function discountBadge(
  d: ReturnType<typeof resolveDiscount>,
  locale: Locale
): string | null {
  if (!d) return null;
  if (d.type === "percent") return locale === "en" ? `-${d.value}%` : `خصم ${d.value}%`;
  return locale === "en" ? "Offer" : "عرض";
}

function Thumb({ product, title, className }: { product: Product; title: string; className: string }) {
  return product.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(product.image) ?? undefined}
      alt=""
      loading="lazy"
      className={`${className} object-cover`}
    />
  ) : (
    <div
      className={`${className} flex items-center justify-center text-2xl font-extrabold text-[var(--brand-primary)]/35`}
      style={{ background: "linear-gradient(145deg, var(--brand-surface), #fff)" }}
    >
      {title.slice(0, 1)}
    </div>
  );
}

function AddButton({ locale, onAdd, className }: { locale: Locale; onAdd: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onAdd();
      }}
      className={`${className} flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--brand-primary)] shadow-md ring-1 ring-black/5 touch-manipulation active:scale-95`}
      aria-label={locale === "en" ? "Add to order" : "أضف للطلب"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

function ProductRow({
  product,
  category,
  locale,
  currency,
  outOfStock,
  onAdd,
}: RowProps) {
  const discount = resolveDiscount(product, category);
  const pricing = priceAfterDiscount(product.price, discount);
  const title = pickLocalized(locale, product.name, product.nameEn);
  const desc = pickLocalized(locale, product.description, product.descriptionEn);
  const badge = pricing.hasDiscount ? discountBadge(discount, locale) : null;
  const href = `/item/${product.id}`;

  return (
    <div className={`flex gap-3 py-3.5 ${outOfStock ? "opacity-55" : ""}`}>
      <Link href={href} className="min-w-0 flex-1 py-0.5">
        <h3 className="font-bold leading-snug text-[var(--brand-ink)]">{title}</h3>
        {desc && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--brand-muted)]">
            {desc}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-extrabold text-[var(--brand-ink)]">
            {(product.optionGroups || []).length > 0
              ? locale === "en"
                ? `From ${formatPrice(pricing.final, currency, locale)}`
                : `من ${formatPrice(pricing.final, currency, locale)}`
              : formatPrice(pricing.final, currency, locale)}
          </span>
          {pricing.hasDiscount && (
            <span className="text-xs text-[var(--brand-muted)] line-through">
              {formatPrice(pricing.original, currency, locale)}
            </span>
          )}
          {badge && (
            <span className="rounded-full bg-[var(--brand-accent)] px-2 py-0.5 text-[11px] font-bold text-[#1a1410]">
              {badge}
            </span>
          )}
          {outOfStock && (
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold text-black/60">
              {locale === "en" ? "Sold out" : "خلص"}
            </span>
          )}
        </div>
      </Link>
      <div className="relative shrink-0 self-start">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <Thumb product={product} title={title} className="h-[104px] w-[104px] rounded-xl" />
        </Link>
        {onAdd && !outOfStock && (
          <AddButton locale={locale} onAdd={onAdd} className="absolute -bottom-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2" />
        )}
      </div>
    </div>
  );
}

function FeaturedCard({
  product,
  category,
  locale,
  currency,
  outOfStock,
  onAdd,
}: RowProps) {
  const discount = resolveDiscount(product, category);
  const pricing = priceAfterDiscount(product.price, discount);
  const title = pickLocalized(locale, product.name, product.nameEn);
  const badge = pricing.hasDiscount ? discountBadge(discount, locale) : null;

  return (
    <div
      className={`relative w-[44%] min-w-[150px] max-w-[200px] shrink-0 snap-start ${outOfStock ? "opacity-55" : ""}`}
    >
      <div className="relative">
        <Link href={`/item/${product.id}`} tabIndex={-1} aria-hidden="true" className="block">
          <Thumb product={product} title={title} className="aspect-square w-full rounded-2xl" />
        </Link>
        {badge && (
          <span className="pointer-events-none absolute top-2 start-2 rounded-full bg-[var(--brand-accent)] px-2 py-0.5 text-[11px] font-bold text-[#1a1410]">
            {badge}
          </span>
        )}
        {onAdd && !outOfStock && (
          <AddButton locale={locale} onAdd={onAdd} className="absolute bottom-2 end-2" />
        )}
      </div>
      <Link href={`/item/${product.id}`} className="block">
        <h3 className="mt-2 line-clamp-1 text-sm font-bold text-[var(--brand-ink)]">{title}</h3>
        <p className="text-sm">
          <span className="font-extrabold text-[var(--brand-ink)]">
            {formatPrice(pricing.final, currency, locale)}
          </span>
          {pricing.hasDiscount && (
            <span className="ms-1.5 text-xs text-[var(--brand-muted)] line-through">
              {formatPrice(pricing.original, currency, locale)}
            </span>
          )}
        </p>
      </Link>
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
    phone: ["اتصل بينا", "Call us"],
    instagram: ["إنستجرام", "Instagram"],
    facebook: ["فيسبوك", "Facebook"],
    tiktok: ["تيك توك", "TikTok"],
    email: ["إيميل", "Email"],
    maps: ["الموقع على الخريطة", "Directions"],
  };
  return locale === "en" ? map[type][1] : map[type][0];
}
