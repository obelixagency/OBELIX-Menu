/** Money, delivery, prep chips, WhatsApp share text — EG/GCC cafe ops. */

export type DeliveryArea = {
  id: string;
  name: string;
  nameAr: string;
  fee: number;
  active: boolean;
  sortOrder: number;
};

export type ComboPart = { productId: string; qty: number };

export const PREP_PRESETS = [
  { id: "spicy_hot", ar: "حار", en: "Spicy" },
  { id: "spicy_mild", ar: "خفيف حرّ", en: "Mild spice" },
  { id: "no_onion", ar: "من غير بصل", en: "No onion" },
  { id: "no_garlic", ar: "من غير توم", en: "No garlic" },
  { id: "well", ar: "مستوي", en: "Well done" },
  { id: "medium", ar: "متوسط", en: "Medium" },
  { id: "rare", ar: "نصف نيء", en: "Rare" },
] as const;

export type PrepId = (typeof PREP_PRESETS)[number]["id"];

export function prepLabel(id: string, locale: "ar" | "en"): string {
  const p = PREP_PRESETS.find((x) => x.id === id);
  if (!p) return id;
  return locale === "en" ? p.en : p.ar;
}

export function moneyTotals(
  subtotal: number,
  opts: {
    deliveryFee?: number;
    taxPercent?: number;
    taxInclusive?: boolean;
  } = {}
): {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  grandTotal: number;
  taxInclusive: boolean;
} {
  const goods = Math.max(0, Math.round(Number(subtotal) * 100) / 100);
  const deliveryFee = Math.max(
    0,
    Math.round(Number(opts.deliveryFee || 0) * 100) / 100
  );
  const p = Math.max(0, Number(opts.taxPercent) || 0);
  const taxInclusive = Boolean(opts.taxInclusive) && p > 0;
  let tax = 0;
  if (p > 0) {
    if (taxInclusive) {
      tax = Math.round(((goods * p) / (100 + p)) * 100) / 100;
    } else {
      tax = Math.round(goods * (p / 100) * 100) / 100;
    }
  }
  const grandTotal =
    Math.round((goods + deliveryFee + (taxInclusive ? 0 : tax)) * 100) / 100;
  return { subtotal: goods, tax, deliveryFee, grandTotal, taxInclusive };
}

export function inSchedule(
  from?: string | null,
  until?: string | null,
  now = new Date()
): boolean {
  if (from) {
    const t = Date.parse(from);
    if (Number.isFinite(t) && now.getTime() < t) return false;
  }
  if (until) {
    const t = Date.parse(until);
    if (Number.isFinite(t) && now.getTime() > t) return false;
  }
  return true;
}

export function buildWhatsAppOrderText(input: {
  locale: "ar" | "en";
  storeName: string;
  code: string;
  channel: string;
  lines: { name: string; nameAr?: string; qty: number; lineTotal: number }[];
  grandTotal: number;
  currency: string;
  where?: string;
}): string {
  const ar = input.locale === "ar";
  const ch =
    input.channel === "delivery"
      ? ar
        ? "توصيل"
        : "Delivery"
      : input.channel === "pickup"
        ? ar
          ? "استلام من الفرع"
          : "Pickup"
        : ar
          ? "طاولة"
          : "Dine-in";
  const items = input.lines
    .map((l) => {
      const n = ar ? l.nameAr || l.name : l.name;
      return `${l.qty}× ${n}`;
    })
    .join("\n");
  const total = `${input.grandTotal} ${input.currency}`;
  if (ar) {
    return [
      `طلب ${input.storeName}`,
      `#${input.code}`,
      ch + (input.where ? ` · ${input.where}` : ""),
      items,
      `الإجمالي: ${total}`,
    ].join("\n");
  }
  return [
    `Order ${input.storeName}`,
    `#${input.code}`,
    ch + (input.where ? ` · ${input.where}` : ""),
    items,
    `Total: ${total}`,
  ].join("\n");
}

export function waMeUrl(phone: string, text: string): string | null {
  const n = phone.replace(/[^\d]/g, "");
  if (n.length < 8) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** datetime-local value from ISO */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
