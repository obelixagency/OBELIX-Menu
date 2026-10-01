"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";

const STATUS_AR: Record<string, string> = {
  new: "تم استلام الطلب",
  preparing: "قيد التحضير",
  ready: "جاهز",
  served: "تم التقديم",
  cancelled: "ملغي",
};

const STATUS_EN: Record<string, string> = {
  new: "Order received",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

type PublicOrder = {
  code: string;
  status: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
  tableLabel?: string | null;
  zoneLabel?: string | null;
  delivery?: { phoneMasked: string; addressLine: string; areaName?: string } | null;
  pickup?: { phoneMasked: string; name?: string } | null;
  guestNote?: string;
  lines: {
    name: string;
    nameAr: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    prep?: string[];
  }[];
  totals: {
    subtotal: number;
    tax?: number;
    deliveryFee?: number;
    grandTotal: number;
    taxInclusive?: boolean;
  };
  loyalty?: { stamps: number; rewardEarned: boolean } | null;
};

export default function OrderStatusPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [currency, setCurrency] = useState("EGP");
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [taxNumber, setTaxNumber] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      withBasePath(`/api/orders/status?code=${encodeURIComponent(code)}`),
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      setOrder(null);
      return;
    }
    setOrder(data.order);
    setCurrency(data.currency || "EGP");
    setWhatsappUrl(data.whatsappUrl || null);
    setTaxNumber(data.taxNumber || null);
    setError(null);
  }, [code]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const ar = locale === "ar";

  function channelCopy(ch: string) {
    if (ch === "delivery") {
      return ar ? "توصيل — الدفع عند الاستلام" : "Delivery — pay on delivery";
    }
    if (ch === "pickup") {
      return ar ? "استلام من الفرع" : "Pickup at the branch";
    }
    return ar
      ? `طاولة${order?.tableLabel ? ` · ${order.tableLabel}` : ""} — الحساب عند الكاشير`
      : `Dine-in${order?.tableLabel ? ` · ${order.tableLabel}` : ""} — pay at cashier`;
  }

  return (
    <div
      className="mx-auto min-h-screen max-w-lg bg-[var(--brand-surface,#F7F1E8)] px-4 py-8"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="mb-4 flex justify-between">
        <Link href="/" className="text-sm text-[var(--brand-primary)]">
          {ar ? "← المنيو" : "← Menu"}
        </Link>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => setLocale(ar ? "en" : "ar")}
        >
          {ar ? "EN" : "عربي"}
        </button>
      </div>

      <h1 className="text-2xl font-extrabold text-[var(--brand-primary)]">
        {ar ? "حالة الطلب" : "Order status"}
      </h1>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="font-mono text-3xl font-bold tracking-wider">
            #{order.code}
          </p>
          <p className="text-lg font-semibold">
            {(ar ? STATUS_AR : STATUS_EN)[order.status] || order.status}
          </p>
          <p className="text-sm text-black/50">{channelCopy(order.channel)}</p>
          {order.delivery?.addressLine && (
            <p className="text-sm text-black/55">{order.delivery.addressLine}</p>
          )}
          <ul className="space-y-1 border-t border-black/5 pt-3 text-sm">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {l.qty}× {ar ? l.nameAr : l.name}
                </span>
                <span>{formatPrice(l.lineTotal, currency, locale)}</span>
              </li>
            ))}
          </ul>
          {order.totals.deliveryFee ? (
            <p className="flex justify-between text-sm text-black/55">
              <span>{ar ? "توصيل" : "Delivery"}</span>
              <span>
                {formatPrice(order.totals.deliveryFee, currency, locale)}
              </span>
            </p>
          ) : null}
          {order.totals.tax ? (
            <p className="flex justify-between text-sm text-black/55">
              <span>
                {order.totals.taxInclusive
                  ? ar
                    ? "شامل الضريبة"
                    : "Tax included"
                  : ar
                    ? "الضريبة"
                    : "Tax"}
              </span>
              <span>{formatPrice(order.totals.tax, currency, locale)}</span>
            </p>
          ) : null}
          <p className="text-right text-base font-bold">
            {formatPrice(order.totals.grandTotal, currency, locale)}
          </p>
          {taxNumber && (
            <p className="text-xs text-black/40" dir="ltr">
              {ar ? "الرقم الضريبي" : "Tax no."}: {taxNumber}
            </p>
          )}
          {order.loyalty?.rewardEarned && (
            <p className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
              {ar ? "هديّة ولاء مستحقة في الزيارة الجاية" : "Loyalty reward earned"}
            </p>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#25D366] text-sm font-semibold text-white"
            >
              {ar ? "مشاركة الطلب على واتساب" : "Share order on WhatsApp"}
            </a>
          )}
          <p className="text-xs text-black/40">
            {ar ? "يتحدّث تلقائياً" : "Auto-refreshes"} ·{" "}
            {new Date(order.updatedAt).toLocaleTimeString(
              ar ? "ar-EG" : "en-GB"
            )}
          </p>
        </div>
      )}
    </div>
  );
}
