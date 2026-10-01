"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { CartProvider, useCart } from "@/components/menu/cart-context";
import { CartCheckout } from "@/components/menu/cart-checkout";
import { OptionPicker } from "@/components/menu/option-picker";
import {
  configuredBasePrice,
  lineKey,
  optionLabels,
  priceAfterDiscount,
  resolveDiscount,
  type Category,
  type OptionSelection,
  type Product,
} from "@/lib/types";

type Props = {
  locale: Locale;
  currency: string;
  maxItems: number;
  tableOrdering: boolean;
  delivery: boolean;
  zonesEnabled: boolean;
  guestNoteEnabled: boolean;
  /** Remaining stock; null when inventory tracking is off */
  stockQty?: number | null;
  branchId?: string;
  product: Product;
  category?: Category | null;
};

export function ItemOrderPanel(props: Props) {
  return (
    <CartProvider maxItems={props.maxItems}>
      <ItemOrderPanelInner {...props} />
    </CartProvider>
  );
}

function ItemOrderPanelInner({
  locale,
  currency,
  tableOrdering,
  delivery,
  zonesEnabled,
  guestNoteEnabled,
  stockQty = null,
  branchId,
  product,
  category,
}: Props) {
  const cart = useCart();
  const maxQty =
    typeof stockQty === "number"
      ? Math.max(1, Math.min(99, stockQty))
      : 99;
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const ar = locale === "ar";
  const hasOptions = (product.optionGroups || []).length > 0;
  const discount = resolveDiscount(product, category);
  const shelf = priceAfterDiscount(product.price, discount);

  function commit(selections: OptionSelection[] = [], count: number) {
    setErr(null);
    if (typeof stockQty === "number") {
      const inCart = cart.lines
        .filter((l) => l.itemId === product.id)
        .reduce((s, l) => s + l.qty, 0);
      if (inCart + count > stockQty) {
        setErr(ar ? `المتبقي ${stockQty} فقط` : `Only ${stockQty} left`);
        return;
      }
    }
    const base = configuredBasePrice(product, selections);
    const pricing = priceAfterDiscount(base, discount);
    const extrasAr = optionLabels(product, selections, "ar");
    const extrasEn = optionLabels(product, selections, "en");
    cart.addItem(
      {
        itemId: product.id,
        lineKey: lineKey(product.id, selections),
        name: extrasAr.length ? `${product.name} · ${extrasAr.join(" · ")}` : product.name,
        nameEn: extrasEn.length
          ? `${product.nameEn || product.name} · ${extrasEn.join(" · ")}`
          : product.nameEn,
        unitPrice: pricing.final,
        image: product.image,
        options: selections,
      },
      count
    );
  }

  function add() {
    if (hasOptions) {
      setPicking(true);
      return;
    }
    commit([], qty);
  }

  return (
    <>
      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-black/55">
            {ar ? "الكمية" : "Quantity"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-lg font-bold touch-manipulation"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={ar ? "تقليل" : "Decrease"}
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-lg font-bold touch-manipulation"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              aria-label={ar ? "زيادة" : "Increase"}
            >
              +
            </button>
          </div>
        </div>

        {typeof stockQty === "number" && stockQty <= 10 && (
          <p className="mt-2 text-xs text-black/45">
            {ar ? `متبقي ${stockQty}` : `${stockQty} left`}
          </p>
        )}
        {hasOptions && (
          <p className="mt-2 text-xs text-black/45">
            {ar ? "اختر الحجم أو الإضافة قبل الإضافة للسلة" : "Choose size or extras before adding"}
          </p>
        )}
        {err && (
          <p className="mt-2 text-xs font-medium text-red-600">{err}</p>
        )}

        <button
          type="button"
          onClick={add}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white touch-manipulation"
          style={{ background: "var(--brand-primary)" }}
        >
          {ar ? "أضف للسلة" : "Add to cart"}
          {!hasOptions && (
            <span className="opacity-90">
              · {formatPrice(shelf.final * qty, currency, locale)}
            </span>
          )}
        </button>
      </div>

      {cart.count > 0 && (
        <button
          type="button"
          onClick={() => cart.setOpen(true)}
          className="fixed bottom-4 start-4 end-4 z-40 mx-auto flex h-14 max-w-md items-center justify-between rounded-2xl px-5 font-bold text-white shadow-lg touch-manipulation"
          style={{ background: "var(--brand-primary)" }}
        >
          <span>
            {ar ? `السلة · ${cart.count}` : `Cart · ${cart.count}`}
          </span>
          <span>{formatPrice(cart.subtotal, currency, locale)}</span>
        </button>
      )}

      {picking && (
        <OptionPicker
          product={product}
          category={category}
          locale={locale}
          currency={currency}
          onCancel={() => setPicking(false)}
          onConfirm={(selections) => {
            commit(selections, qty);
            setPicking(false);
          }}
        />
      )}

      <CartCheckout
        locale={locale}
        currency={currency}
        tableOrdering={tableOrdering}
        delivery={delivery}
        zonesEnabled={zonesEnabled}
        guestNoteEnabled={guestNoteEnabled}
        branchId={branchId}
      />
    </>
  );
}
