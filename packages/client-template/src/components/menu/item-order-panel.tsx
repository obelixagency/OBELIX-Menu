"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { CartProvider, useCart } from "@/components/menu/cart-context";
import { CartCheckout } from "@/components/menu/cart-checkout";

type Props = {
  locale: Locale;
  currency: string;
  maxItems: number;
  tableOrdering: boolean;
  delivery: boolean;
  zonesEnabled: boolean;
  guestNoteEnabled: boolean;
  item: {
    itemId: string;
    name: string;
    nameEn?: string;
    unitPrice: number;
    image?: string | null;
  };
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
  item,
}: Props) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const ar = locale === "ar";

  function add() {
    cart.addItem(
      {
        itemId: item.itemId,
        name: item.name,
        nameEn: item.nameEn,
        unitPrice: item.unitPrice,
        image: item.image,
      },
      qty
    );
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
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label={ar ? "زيادة" : "Increase"}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={add}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white touch-manipulation"
          style={{ background: "var(--brand-primary)" }}
        >
          {ar ? "أضف للسلة" : "Add to cart"}
          <span className="opacity-90">
            · {formatPrice(item.unitPrice * qty, currency, locale)}
          </span>
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

      <CartCheckout
        locale={locale}
        currency={currency}
        tableOrdering={tableOrdering}
        delivery={delivery}
        zonesEnabled={zonesEnabled}
        guestNoteEnabled={guestNoteEnabled}
      />
    </>
  );
}
