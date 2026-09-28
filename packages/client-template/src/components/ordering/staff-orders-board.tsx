"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus, Station } from "@/lib/extensions/ordering";

type Order = {
  id: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  channel: "dine_in" | "delivery";
  tableLabel?: string | null;
  zoneLabel?: string | null;
  delivery?: { phone: string; addressLine: string } | null;
  status: OrderStatus;
  guestNote?: string;
  lines: {
    name: string;
    nameAr: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    station: Station;
  }[];
  totals: { subtotal: number; grandTotal: number };
};

type Props = {
  title: string;
  stationFilter?: Station;
  role: "cashier" | "station" | "owner";
  currency?: string;
  showAllLines?: boolean;
};

const STATUS_AR: Record<OrderStatus, string> = {
  new: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  served: "تم التقديم",
  cancelled: "ملغي",
};

export function StaffOrdersBoard({
  title,
  stationFilter,
  role,
  currency = "EGP",
  showAllLines = true,
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const knownNew = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    if (!soundOn) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtx.current) audioCtx.current = new Ctx();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // ignore
    }
  }, [soundOn]);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ open: "1" });
      if (stationFilter) q.set("station", stationFilter);
      const res = await fetch(`/api/orders?${q}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل");
      const list = (data.orders || []) as Order[];
      const newOnes = list.filter(
        (o) => o.status === "new" && !knownNew.current.has(o.id)
      );
      if (knownNew.current.size > 0 && newOnes.length > 0) playBeep();
      for (const o of list) {
        if (o.status === "new") knownNew.current.add(o.id);
      }
      setOrders(list);
      setLastRefresh(new Date().toLocaleTimeString("ar-EG"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, [stationFilter, playBeep]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        role: role === "station" ? "station" : "cashier",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل التحديث");
      return;
    }
    await load();
  }

  function actionsFor(o: Order): { label: string; status: OrderStatus }[] {
    if (role === "station") {
      if (o.status === "new") return [{ label: "تحضير", status: "preparing" }];
      if (o.status === "preparing")
        return [{ label: "جاهز", status: "ready" }];
      return [];
    }
    const map: Record<OrderStatus, { label: string; status: OrderStatus }[]> = {
      new: [
        { label: "تحضير", status: "preparing" },
        { label: "إلغاء", status: "cancelled" },
      ],
      preparing: [
        { label: "جاهز", status: "ready" },
        { label: "إلغاء", status: "cancelled" },
      ],
      ready: [
        { label: "تم التقديم", status: "served" },
        { label: "إلغاء", status: "cancelled" },
      ],
      served: [],
      cancelled: [],
    };
    return map[o.status];
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-[#FACF1C]">{title}</h1>
          <p className="text-xs text-white/45">
            آخر تحديث: {lastRefresh || "—"} · تحديث تلقائي كل ٤ ثوانٍ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSoundOn(true)}
            className={`min-h-11 rounded-md px-3 text-sm font-semibold ${
              soundOn
                ? "bg-[#FACF1C] text-black"
                : "border border-[#FACF1C] text-[#FACF1C]"
            }`}
          >
            {soundOn ? "الصوت مفعّل" : "تفعيل الصوت"}
          </button>
          <Link
            href="/dashboard/orders"
            className="flex min-h-11 items-center rounded-md border border-white/20 px-3 text-sm"
          >
            الداشبورد
          </Link>
        </div>
      </header>

      {error && (
        <p className="m-4 rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <ul className="mx-auto grid max-w-6xl gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => {
          const lines = showAllLines
            ? o.lines
            : stationFilter
              ? o.lines.filter((l) => l.station === stationFilter)
              : o.lines;
          if (stationFilter && lines.length === 0) return null;
          return (
            <li
              key={o.id}
              className={`rounded-xl border p-4 ${
                o.status === "new"
                  ? "border-[#FACF1C] bg-[#FACF1C]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-bold text-[#FACF1C]">
                    #{o.code}
                  </p>
                  <p className="text-xs text-white/50">
                    {new Date(o.createdAt).toLocaleTimeString("ar-EG")}
                  </p>
                </div>
                <span className="rounded bg-white/10 px-2 py-1 text-xs">
                  {STATUS_AR[o.status]}
                </span>
              </div>
              <p className="mb-2 text-sm">
                {o.channel === "delivery" ? (
                  <>
                    <span className="text-[#FACF1C]">توصيل</span> ·{" "}
                    {o.delivery?.phone} · {o.delivery?.addressLine}
                  </>
                ) : (
                  <>
                    <span className="text-[#FACF1C]">طاولة</span> ·{" "}
                    {o.zoneLabel ? `${o.zoneLabel} / ` : ""}
                    {o.tableLabel}
                  </>
                )}
              </p>
              {o.guestNote && (
                <p className="mb-2 text-xs text-white/60">ملاحظة: {o.guestNote}</p>
              )}
              <ul className="mb-3 space-y-1 text-sm">
                {lines.map((l, i) => (
                  <li key={`${o.id}-${i}`} className="flex justify-between gap-2">
                    <span>
                      {l.qty}× {l.nameAr || l.name}
                      {!showAllLines ? null : (
                        <span className="ms-1 text-[10px] text-white/35">
                          ({l.station})
                        </span>
                      )}
                    </span>
                    <span className="text-white/50">
                      {formatPrice(l.lineTotal, currency, "ar")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mb-3 text-sm font-bold">
                {formatPrice(o.totals.grandTotal, currency, "ar")}
              </p>
              <div className="flex flex-wrap gap-2">
                {actionsFor(o).map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => setStatus(o.id, a.status)}
                    className={`min-h-11 rounded-md px-3 text-sm font-semibold ${
                      a.status === "cancelled"
                        ? "border border-red-400/50 text-red-300"
                        : "bg-[#FACF1C] text-black"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {orders.length === 0 && !error && (
        <p className="py-20 text-center text-white/40">لا توجد طلبات مفتوحة</p>
      )}
    </div>
  );
}
