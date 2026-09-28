"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

type Order = {
  id: string;
  code: string;
  createdAt: string;
  channel: "dine_in" | "delivery" | "pos";
  tableLabel?: string | null;
  zoneLabel?: string | null;
  delivery?: { phone: string; addressLine: string } | null;
  status: string;
  lines: { nameAr: string; name: string; qty: number; lineTotal: number }[];
  totals: { grandTotal: number };
};

const STATUS_AR: Record<string, string> = {
  new: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  served: "تم التقديم",
  cancelled: "ملغي",
};

export function OrdersDashboardClient({ currency }: { currency: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("open");
  const [channel, setChannel] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (status === "open") q.set("open", "1");
    else if (status !== "all") q.set("status", status);
    if (channel !== "all") q.set("channel", channel);
    const res = await fetch(`/api/orders?${q}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل");
      return;
    }
    setOrders(data.orders || []);
    setError(null);
  }, [status, channel]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function patch(id: string, next: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, role: "owner" }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "فشل");
    else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-11 rounded-md border px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">مفتوحة</option>
          <option value="all">الكل</option>
          <option value="new">جديد</option>
          <option value="preparing">تحضير</option>
          <option value="ready">جاهز</option>
          <option value="served">تم التقديم</option>
          <option value="cancelled">ملغي</option>
        </select>
        <select
          className="h-11 rounded-md border px-3 text-sm"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option value="all">كل القنوات</option>
          <option value="dine_in">طاولة</option>
          <option value="delivery">توصيل</option>
          <option value="pos">POS</option>
        </select>
        <Link
          href="/cashier"
          className="flex h-11 items-center rounded-md border px-3 text-sm"
        >
          الكاشير
        </Link>
        <Link
          href="/kitchen"
          className="flex h-11 items-center rounded-md border px-3 text-sm"
        >
          المطبخ
        </Link>
        <Link
          href="/bar"
          className="flex h-11 items-center rounded-md border px-3 text-sm"
        >
          البار
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono font-bold text-[var(--brand-primary)]">
                  #{o.code}
                </p>
                <p className="text-xs text-black/45">
                  {new Date(o.createdAt).toLocaleString("ar-EG")} ·{" "}
                  {o.channel === "delivery"
                    ? "توصيل"
                    : o.channel === "pos"
                      ? "POS"
                      : "طاولة"}
                  {o.tableLabel ? ` · ${o.tableLabel}` : ""}
                  {o.channel === "pos" && !o.tableLabel ? " · walk-in" : ""}
                  {o.delivery ? ` · ${o.delivery.phone}` : ""}
                </p>
              </div>
              <span className="rounded bg-black/5 px-2 py-1 text-xs">
                {STATUS_AR[o.status] || o.status}
              </span>
            </div>
            <ul className="mt-2 text-sm text-black/70">
              {o.lines.map((l, i) => (
                <li key={i}>
                  {l.qty}× {l.nameAr || l.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-bold">
              {formatPrice(o.totals.grandTotal, currency, "ar")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status === "new" && (
                <Btn onClick={() => patch(o.id, "preparing")}>تحضير</Btn>
              )}
              {o.status === "preparing" && (
                <Btn onClick={() => patch(o.id, "ready")}>جاهز</Btn>
              )}
              {o.status === "ready" && (
                <Btn onClick={() => patch(o.id, "served")}>تم التقديم</Btn>
              )}
              {!["served", "cancelled"].includes(o.status) && (
                <Btn variant="danger" onClick={() => patch(o.id, "cancelled")}>
                  إلغاء
                </Btn>
              )}
            </div>
          </li>
        ))}
      </ul>
      {orders.length === 0 && (
        <p className="py-10 text-center text-sm text-black/40">لا توجد طلبات</p>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md px-3 text-sm font-semibold ${
        variant === "danger"
          ? "border border-red-300 text-red-700"
          : "bg-[var(--brand-primary)] text-white"
      }`}
    >
      {children}
    </button>
  );
}
