/** Client-safe WhatsApp helpers (no Node fs). */

export function normalizePhoneDigits(raw: string): string {
  const trimmed = String(raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("01") && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return `20${digits}`;
  }
  return digits;
}

export function whatsappClickUrl(phone: string, text: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type AlertOrderLike = {
  code: string;
  channel: string;
  tableLabel?: string | null;
  zoneLabel?: string | null;
  delivery?: { phone: string; addressLine: string } | null;
  guestNote?: string;
  lines: { name: string; nameAr?: string; qty: number }[];
  totals: { grandTotal: number };
};

export function buildOrderAlertText(
  order: AlertOrderLike,
  storeName: string
): string {
  const channelAr =
    order.channel === "delivery"
      ? "توصيل"
      : order.channel === "pos"
        ? "POS"
        : "طاولة";
  const lines = order.lines
    .map((l) => `• ${l.qty}× ${l.nameAr || l.name}`)
    .join("\n");
  const where =
    order.channel === "delivery"
      ? `📍 ${order.delivery?.addressLine || "—"}\n📞 ${order.delivery?.phone || "—"}`
      : order.tableLabel
        ? `🪑 ${order.zoneLabel ? `${order.zoneLabel} / ` : ""}${order.tableLabel}`
        : "حضور";
  const note = order.guestNote ? `\nملاحظة: ${order.guestNote}` : "";
  return (
    `طلب جديد — ${storeName}\n` +
    `#${order.code} · ${channelAr}\n` +
    `${where}\n` +
    `${lines}\n` +
    `الإجمالي: ${order.totals.grandTotal}${note}`
  );
}
