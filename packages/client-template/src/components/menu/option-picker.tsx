"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  configuredBasePrice,
  missingRequiredOptions,
  optionLabels,
  priceAfterDiscount,
  resolveDiscount,
  type Category,
  type OptionSelection,
  type Product,
} from "@/lib/types";
import { pickLocalized, type Locale } from "@/lib/i18n";

export function OptionPicker({
  product,
  category,
  locale,
  currency,
  onCancel,
  onConfirm,
}: {
  product: Product;
  category?: Category | null;
  locale: Locale;
  currency: string;
  onCancel: () => void;
  onConfirm: (selections: OptionSelection[]) => void;
}) {
  const groups = product.optionGroups || [];
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      if (g.values[0]) init[g.id] = g.values[0].id;
    }
    return init;
  });

  const selections: OptionSelection[] = useMemo(
    () =>
      Object.entries(sel).map(([groupId, valueId]) => ({ groupId, valueId })),
    [sel]
  );

  const discount = resolveDiscount(product, category);
  const base = configuredBasePrice(product, selections);
  const pricing = priceAfterDiscount(base, discount);
  const missing = missingRequiredOptions(product, selections);
  const extras = optionLabels(product, selections, locale);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onCancel}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-2xl"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <h2 className="text-lg font-bold">
          {pickLocalized(locale, product.name, product.nameEn)}
        </h2>
        <p className="text-sm text-[var(--brand-muted)]">
          {extras.length ? extras.join(" · ") : ""}
        </p>
        {groups.map((g) => (
          <div key={g.id} className="mt-3">
            <p className="mb-1 text-xs font-semibold text-[var(--brand-muted)]">
              {pickLocalized(locale, g.name, g.nameEn)}
              {g.required ? " *" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const active = sel[g.id] === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSel((s) => ({ ...s, [g.id]: v.id }))}
                    className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
                      active
                        ? "bg-[var(--brand-primary)] text-white"
                        : "border border-[var(--brand-line)]"
                    }`}
                  >
                    {pickLocalized(locale, v.name, v.nameEn)}
                    {g.priceMode === "delta" && v.price
                      ? ` ${v.price > 0 ? "+" : ""}${v.price}`
                      : g.priceMode === "replace"
                        ? ` · ${v.price}`
                        : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {pricing.hasDiscount && (
              <p className="text-xs text-[var(--brand-muted)] line-through">
                {formatPrice(pricing.original, currency, locale)}
              </p>
            )}
            <p className="text-lg font-bold text-[var(--brand-primary)]">
              {formatPrice(pricing.final, currency, locale)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              {locale === "en" ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="button"
              disabled={missing.length > 0}
              onClick={() => onConfirm(selections)}
            >
              {locale === "en" ? "Add" : "أضف"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
