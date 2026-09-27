/**
 * Extension point — Ordering (NOT enabled in v1)
 *
 * Future phases can wire WhatsApp CTA, cart, or payment here without
 * reshaping the public menu or dashboard CRUD.
 *
 * Keep `brand.json → extensions.ordering.enabled` false until then.
 */
export type OrderingProvider = "whatsapp" | "cart" | "external" | null;

export type OrderingExtension = {
  enabled: boolean;
  provider: OrderingProvider;
  note: string;
};

export const ORDERING_STUB: OrderingExtension = {
  enabled: false,
  provider: null,
  note: "v1 is view-only. Enable ordering in a later release.",
};

export function isOrderingEnabled(ext?: OrderingExtension): boolean {
  return Boolean(ext?.enabled);
}
