import { readBrand } from "@/lib/brand";
import type { Order } from "@/lib/ordering-data";
import { getOrderingSettings } from "@/lib/ordering-data";

export type OrderAlertSettings = {
  /** Notify restaurant staff on new delivery orders */
  alertOnDelivery: boolean;
  /** Also notify on dine-in (public menu) */
  alertOnDineIn: boolean;
  /** E.164 or local digits for CallMeBot / wa.me */
  whatsappPhone: string;
  /** CallMeBot API key — enables server-side WhatsApp text */
  callMeBotApiKey: string;
  /** Optional generic webhook (n8n / Make / Zapier) */
  webhookUrl: string;
};

export const DEFAULT_ALERT_SETTINGS: OrderAlertSettings = {
  alertOnDelivery: true,
  alertOnDineIn: false,
  whatsappPhone: "",
  callMeBotApiKey: "",
  webhookUrl: "",
};

/** Digits only, keep leading country code if present */
export function normalizePhoneDigits(raw: string): string {
  const trimmed = String(raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  // Egyptian local 01xxxxxxxxx → 20…
  if (digits.startsWith("01") && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return `20${digits}`;
  }
  return digits;
}

export function buildOrderAlertText(
  order: Order,
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

export function whatsappClickUrl(phone: string, text: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

async function sendCallMeBot(
  phone: string,
  apikey: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const digits = normalizePhoneDigits(phone);
  if (!digits || !apikey) return { ok: false, error: "missing phone/key" };
  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(digits)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const body = await res.text();
    if (!res.ok) {
      console.error("[alerts] CallMeBot HTTP", res.status, body.slice(0, 200));
      return { ok: false, error: `CallMeBot ${res.status}` };
    }
    // API returns 200 even for some errors — soft check
    if (/error|invalid|not activated/i.test(body) && !/message queued|success/i.test(body)) {
      console.error("[alerts] CallMeBot body", body.slice(0, 300));
      return { ok: false, error: body.slice(0, 120) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[alerts] CallMeBot error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "callmebot error",
    };
  }
}

async function sendWebhook(
  webhookUrl: string,
  payload: unknown
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[alerts] webhook HTTP", res.status, t.slice(0, 200));
      return { ok: false, error: `webhook ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[alerts] webhook error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "webhook error",
    };
  }
}

/**
 * Fire-and-forget staff alert for a new order.
 * Never throws to caller — ordering must not fail if alerts fail.
 */
export async function notifyNewOrder(order: Order): Promise<void> {
  try {
    const settings = await getOrderingSettings();
    const alerts = settings.alerts || DEFAULT_ALERT_SETTINGS;
    const want =
      (order.channel === "delivery" && alerts.alertOnDelivery) ||
      (order.channel === "dine_in" && alerts.alertOnDineIn);
    if (!want) return;

    const brand = await readBrand();
    const text = buildOrderAlertText(order, brand.displayName);
    const waLink = whatsappClickUrl(alerts.whatsappPhone, text);

    const jobs: Promise<unknown>[] = [];

    if (alerts.callMeBotApiKey && alerts.whatsappPhone) {
      jobs.push(
        sendCallMeBot(
          alerts.whatsappPhone,
          alerts.callMeBotApiKey,
          text
        ).then((r) => {
          if (!r.ok) console.warn("[alerts] WhatsApp send failed", r.error);
          else console.info("[alerts] WhatsApp sent", order.code);
        })
      );
    }

    if (alerts.webhookUrl) {
      jobs.push(
        sendWebhook(alerts.webhookUrl, {
          event: "order.created",
          store: brand.displayName,
          order: {
            id: order.id,
            code: order.code,
            channel: order.channel,
            status: order.status,
            createdAt: order.createdAt,
            branchId: order.branchId,
            tableLabel: order.tableLabel,
            zoneLabel: order.zoneLabel,
            delivery: order.delivery,
            guestNote: order.guestNote,
            lines: order.lines,
            totals: order.totals,
          },
          text,
          whatsappUrl: waLink,
        }).then((r) => {
          if (!r.ok) console.warn("[alerts] webhook failed", r.error);
          else console.info("[alerts] webhook ok", order.code);
        })
      );
    }

    if (!jobs.length && waLink) {
      // No server send configured — log click link for operators / future UI
      console.info("[alerts] no CallMeBot/webhook — wa.me ready", {
        code: order.code,
        waLink,
      });
    }

    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[alerts] notifyNewOrder", err);
  }
}
