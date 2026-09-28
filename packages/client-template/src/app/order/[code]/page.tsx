"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

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
  delivery?: { phoneMasked: string; addressLine: string } | null;
  guestNote?: string;
  lines: {
    name: string;
    nameAr: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  totals: { subtotal: number; grandTotal: number };
};

export default function OrderStatusPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/orders/status?code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      setOrder(null);
      return;
    }
    setOrder(data.order);
    setError(null);
  }, [code]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const ar = locale === "ar";

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
          <p className="text-sm text-black/50">
            {order.channel === "delivery"
              ? ar
                ? "توصيل — الدفع عند الاستلام"
                : "Delivery — pay on delivery"
              : ar
                ? `طاولة${order.tableLabel ? ` · ${order.tableLabel}` : ""} — الحساب عند الكاشير`
                : `Dine-in${order.tableLabel ? ` · ${order.tableLabel}` : ""} — pay at cashier`}
          </p>
          <ul className="space-y-1 border-t border-black/5 pt-3 text-sm">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {l.qty}× {ar ? l.nameAr : l.name}
                </span>
                <span>{formatPrice(l.lineTotal, "EGP", locale)}</span>
              </li>
            ))}
          </ul>
          <p className="text-right text-base font-bold">
            {formatPrice(order.totals.grandTotal, "EGP", locale)}
          </p>
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
