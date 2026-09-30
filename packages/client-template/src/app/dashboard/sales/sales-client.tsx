"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SalesReport = {
  from: string;
  to: string;
  timezone: string;
  orderCount: number;
  cancelledCount: number;
  openCount: number;
  revenue: number;
  averageTicket: number;
  byChannel: Record<string, { count: number; revenue: number }>;
  byPayment: Record<string, { count: number; revenue: number }>;
  byStatus: Record<string, { count: number; revenue: number }>;
  topItems: {
    itemId: string;
    name: string;
    nameAr: string;
    qty: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    code: string;
    createdAt: string;
    channel: string;
    status: string;
    paymentMethod: string | null;
    grandTotal: number;
  }[];
};

const CHANNEL_AR: Record<string, string> = {
  dine_in: "طاولة",
  delivery: "توصيل",
  pos: "POS",
};

const PAY_AR: Record<string, string> = {
  cash: "كاش",
  card: "بطاقة",
  other: "أخرى",
  unpaid: "بدون دفع مسجّل",
};

const STATUS_AR: Record<string, string> = {
  new: "جديد",
  preparing: "تحضير",
  ready: "جاهز",
  served: "تم التقديم",
  cancelled: "ملغي",
};

function todayCairoYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function downloadCsv(report: SalesReport, currency: string) {
  const lines: string[] = [];
  lines.push("section,key,count,revenue");
  lines.push(`summary,revenue,${report.orderCount},${report.revenue}`);
  lines.push(`summary,averageTicket,1,${report.averageTicket}`);
  for (const [k, v] of Object.entries(report.byChannel)) {
    lines.push(`channel,${k},${v.count},${v.revenue}`);
  }
  for (const [k, v] of Object.entries(report.byPayment)) {
    lines.push(`payment,${k},${v.count},${v.revenue}`);
  }
  for (const item of report.topItems) {
    lines.push(
      `item,"${(item.nameAr || item.name).replace(/"/g, '""')}",${item.qty},${item.revenue}`
    );
  }
  lines.push("");
  lines.push("code,createdAt,channel,payment,status,grandTotal,currency");
  for (const o of report.recentOrders) {
    lines.push(
      [
        o.code,
        o.createdAt,
        o.channel,
        o.paymentMethod || "unpaid",
        o.status,
        o.grandTotal,
        currency,
      ].join(",")
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-${report.from.slice(0, 10)}_${report.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SalesClient({ currency }: { currency: string }) {
  const today = todayCairoYmd();
  const [mode, setMode] = useState<"day" | "range">("day");
  const [day, setDay] = useState(today);
  const [fromDay, setFromDay] = useState(shiftYmd(today, -6));
  const [toDay, setToDay] = useState(today);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        mode === "day"
          ? `day=${encodeURIComponent(day)}`
          : `from=${encodeURIComponent(fromDay)}&to=${encodeURIComponent(toDay)}`;
      const res = await fetch(`/api/sales/report?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setReport(data.report as SalesReport);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [mode, day, fromDay, toDay]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "day" ? "default" : "outline"}
          className="h-10"
          onClick={() => setMode("day")}
        >
          يوم واحد
        </Button>
        <Button
          type="button"
          variant={mode === "range" ? "default" : "outline"}
          className="h-10"
          onClick={() => setMode("range")}
        >
          فترة
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {mode === "day" ? (
          <>
            <label className="space-y-1 text-sm">
              <span className="block text-black/50">اليوم (توقيت القاهرة)</span>
              <input
                type="date"
                className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm"
                value={day}
                max={today}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setDay(shiftYmd(day, -1))}
            >
              يوم سابق
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => setDay(today)}
            >
              اليوم
            </Button>
          </>
        ) : (
          <>
            <label className="space-y-1 text-sm">
              <span className="block text-black/50">من</span>
              <input
                type="date"
                className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm"
                value={fromDay}
                max={toDay}
                onChange={(e) => setFromDay(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-black/50">إلى</span>
              <input
                type="date"
                className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm"
                value={toDay}
                max={today}
                min={fromDay}
                onChange={(e) => setToDay(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => {
                setFromDay(shiftYmd(today, -6));
                setToDay(today);
              }}
            >
              آخر ٧ أيام
            </Button>
          </>
        )}
        <Button type="button" className="h-11" onClick={load} disabled={loading}>
          {loading ? "جاري التحديث…" : "تحديث"}
        </Button>
        {report && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => downloadCsv(report, currency)}
          >
            تصدير CSV
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && report && report.orderCount === 0 && report.cancelledCount === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-black/55">
            لا مبيعات في هذه الفترة — أقفل تذكرة من الـ POS أو انتظر طلبات المنيو.
          </CardContent>
        </Card>
      )}

      {report && (report.orderCount > 0 || report.cancelledCount > 0) && (
        <>
          <p className="text-xs text-black/45">
            الفترة:{" "}
            {new Date(report.from).toLocaleString("ar-EG", {
              timeZone: "Africa/Cairo",
            })}{" "}
            →{" "}
            {new Date(report.to).toLocaleString("ar-EG", {
              timeZone: "Africa/Cairo",
            })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              title="الإيراد"
              value={formatPrice(report.revenue, currency, "ar")}
            />
            <Stat title="عدد الطلبات" value={String(report.orderCount)} />
            <Stat
              title="متوسط التذكرة"
              value={formatPrice(report.averageTicket, currency, "ar")}
            />
            <Stat
              title="مفتوحة / ملغاة"
              value={`${report.openCount} / ${report.cancelledCount}`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <BreakdownCard
              title="حسب القناة"
              rows={Object.entries(report.byChannel).map(([k, v]) => ({
                label: CHANNEL_AR[k] || k,
                count: v.count,
                revenue: v.revenue,
              }))}
              currency={currency}
            />
            <BreakdownCard
              title="حسب طريقة الدفع"
              rows={Object.entries(report.byPayment).map(([k, v]) => ({
                label: PAY_AR[k] || k,
                count: v.count,
                revenue: v.revenue,
              }))}
              currency={currency}
            />
          </div>

          <BreakdownCard
            title="حسب الحالة"
            rows={Object.entries(report.byStatus).map(([k, v]) => ({
              label: STATUS_AR[k] || k,
              count: v.count,
              revenue: v.revenue,
            }))}
            currency={currency}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">أكثر الأصناف مبيعاً</CardTitle>
              <CardDescription>حسب الإيراد في الفترة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.topItems.length === 0 ? (
                <p className="text-sm text-black/45">لا أصناف</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {report.topItems.map((item) => (
                    <li
                      key={item.itemId}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {item.nameAr || item.name}
                        <span className="ms-2 text-black/40">×{item.qty}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--brand-primary)]">
                        {formatPrice(item.revenue, currency, "ar")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">الطلبات</CardTitle>
              <CardDescription>غير الملغاة · الأحدث أولاً (حتى ٤٠)</CardDescription>
            </CardHeader>
            <CardContent>
              {report.recentOrders.length === 0 ? (
                <p className="text-sm text-black/45">لا طلبات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-start text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-black/45">
                        <th className="py-2 pe-2 font-medium">الكود</th>
                        <th className="py-2 pe-2 font-medium">الوقت</th>
                        <th className="py-2 pe-2 font-medium">القناة</th>
                        <th className="py-2 pe-2 font-medium">الدفع</th>
                        <th className="py-2 pe-2 font-medium">الحالة</th>
                        <th className="py-2 font-medium">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.recentOrders.map((o) => (
                        <tr key={o.id} className="border-b border-black/5">
                          <td className="py-2 pe-2 font-mono text-xs">
                            {o.code}
                          </td>
                          <td className="py-2 pe-2 text-black/55">
                            {new Date(o.createdAt).toLocaleString("ar-EG", {
                              timeZone: "Africa/Cairo",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 pe-2">
                            {CHANNEL_AR[o.channel] || o.channel}
                          </td>
                          <td className="py-2 pe-2">
                            {PAY_AR[o.paymentMethod || "unpaid"] ||
                              o.paymentMethod ||
                              "—"}
                          </td>
                          <td className="py-2 pe-2">
                            {STATUS_AR[o.status] || o.status}
                          </td>
                          <td className="py-2 tabular-nums">
                            {formatPrice(o.grandTotal, currency, "ar")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-black/45">{title}</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-[var(--brand-primary)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: { label: string; count: number; revenue: number }[];
  currency: string;
}) {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-black/45">—</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {row.label}
                  <span className="ms-1 text-black/40">({row.count})</span>
                </span>
                <span className="tabular-nums">
                  {formatPrice(row.revenue, currency, "ar")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
