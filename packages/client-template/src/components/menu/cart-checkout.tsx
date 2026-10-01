"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { useCart } from "./cart-context";
import { withBasePath } from "@/lib/base-path";
import { moneyTotals, type DeliveryArea } from "@/lib/commerce";

type Table = {
  id: string;
  label: string;
  labelAr?: string;
  zoneId?: string | null;
  active: boolean;
};
type Zone = {
  id: string;
  name: string;
  nameAr: string;
  active: boolean;
};

type Channel = "dine_in" | "delivery" | "pickup";

type Props = {
  locale: Locale;
  currency: string;
  tableOrdering: boolean;
  delivery: boolean;
  pickup?: boolean;
  zonesEnabled: boolean;
  guestNoteEnabled: boolean;
  branchId?: string;
  taxPercent?: number;
  taxInclusive?: boolean;
};

export function CartCheckout({
  locale,
  currency,
  tableOrdering,
  delivery,
  pickup = false,
  zonesEnabled,
  guestNoteEnabled,
  branchId,
  taxPercent = 0,
  taxInclusive = true,
}: Props) {
  const cart = useCart();
  const router = useRouter();
  const ar = locale === "ar";

  const [channel, setChannel] = useState<Channel | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [minOrder, setMinOrder] = useState(0);
  const [zoneId, setZoneId] = useState("");
  const [tableId, setTableId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [payHint, setPayHint] = useState<string | null>(null);

  const channelCount =
    Number(tableOrdering) + Number(delivery) + Number(pickup);

  useEffect(() => {
    if (!cart.open) return;
    fetch(withBasePath("/api/ordering/config?guest=1"))
      .then((r) => r.json())
      .then((d) => {
        setTables(d.tables || []);
        setZones(d.zones || []);
        setAreas((d.settings?.deliveryAreas || []).filter((a: DeliveryArea) => a.active));
        setMinOrder(Number(d.settings?.deliveryMinOrder) || 0);
        const pay = d.payments;
        if (pay?.enabled && pay.provider && pay.provider !== "none") {
          setPayHint(
            ar
              ? `بوابة ${pay.provider} مختارة — لسه مفيش خصم أونلاين. الدفع عند الاستلام أو الفرع.`
              : `${pay.provider} selected — not charging yet. Pay on delivery / at the branch.`
          );
        } else setPayHint(null);
      })
      .catch(() => {});
  }, [cart.open, ar]);

  useEffect(() => {
    if (channelCount === 1) {
      if (tableOrdering) setChannel("dine_in");
      else if (delivery) setChannel("delivery");
      else if (pickup) setChannel("pickup");
    }
  }, [tableOrdering, delivery, pickup, channelCount]);

  const filteredTables = useMemo(() => {
    if (!zonesEnabled || !zoneId) return tables;
    return tables.filter((t) => t.zoneId === zoneId);
  }, [tables, zonesEnabled, zoneId]);

  const area = areas.find((a) => a.id === areaId);
  const deliveryFee =
    channel === "delivery" ? Number(area?.fee) || 0 : 0;
  const priced = moneyTotals(cart.subtotal, {
    deliveryFee,
    taxPercent,
    taxInclusive,
  });
  const belowMin =
    channel === "delivery" &&
    minOrder > 0 &&
    cart.subtotal + 0.001 < minOrder;

  if (!cart.open) return null;

  async function submit() {
    setError(null);
    if (!cart.lines.length) {
      setError(ar ? "السلة فارغة" : "Cart is empty");
      return;
    }
    const ch =
      channel ||
      (tableOrdering ? "dine_in" : delivery ? "delivery" : pickup ? "pickup" : null);
    if (!ch) {
      setError(ar ? "اختر نوع الطلب" : "Choose order type");
      return;
    }
    if (ch === "delivery" && belowMin) {
      setError(
        ar
          ? `الحد الأدنى للتوصيل ${minOrder}`
          : `Minimum delivery order ${minOrder}`
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(withBasePath("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: ch,
          tableId: ch === "dine_in" ? tableId : undefined,
          zoneId: ch === "dine_in" && zonesEnabled ? zoneId : undefined,
          delivery:
            ch === "delivery"
              ? {
                  phone,
                  addressLine: address,
                  notes: deliveryNotes,
                  areaId,
                }
              : undefined,
          pickup: ch === "pickup" ? { phone } : undefined,
          guestNote: guestNoteEnabled ? guestNote : undefined,
          lines: cart.lines.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            options: l.options || [],
            prep: l.prep || [],
          })),
          website: honeypot,
          branchId: branchId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      cart.clear();
      cart.setOpen(false);
      router.push(data.trackUrl || `/order/${data.order.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={() => cart.setOpen(false)}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        dir={ar ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="font-bold text-[var(--brand-primary)]">
            {step === "cart"
              ? ar
                ? "السلة"
                : "Cart"
              : ar
                ? "تأكيد الطلب"
                : "Confirm order"}
          </h2>
          <button
            type="button"
            className="min-h-10 px-2 text-sm text-black/50"
            onClick={() => cart.setOpen(false)}
          >
            {ar ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step === "cart" && (
            <ul className="space-y-3">
              {cart.lines.map((l) => (
                <li
                  key={l.lineKey}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {ar ? l.name : l.nameEn || l.name}
                    </p>
                    <p className="text-xs text-black/45">
                      {formatPrice(l.unitPrice, currency, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md border"
                      onClick={() => cart.setQty(l.lineKey, l.qty - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md border"
                      onClick={() => cart.setQty(l.lineKey, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
              {cart.lines.length === 0 && (
                <p className="py-8 text-center text-sm text-black/45">
                  {ar ? "السلة فارغة" : "Cart is empty"}
                </p>
              )}
            </ul>
          )}

          {step === "checkout" && (
            <div className="space-y-4 text-sm">
              {channelCount > 1 && (
                <div className="flex flex-wrap gap-2">
                  {tableOrdering && (
                    <ChannelBtn
                      active={channel === "dine_in"}
                      onClick={() => setChannel("dine_in")}
                      label={ar ? "طاولة" : "Dine-in"}
                    />
                  )}
                  {pickup && (
                    <ChannelBtn
                      active={channel === "pickup"}
                      onClick={() => setChannel("pickup")}
                      label={ar ? "استلام" : "Pickup"}
                    />
                  )}
                  {delivery && (
                    <ChannelBtn
                      active={channel === "delivery"}
                      onClick={() => setChannel("delivery")}
                      label={ar ? "توصيل" : "Delivery"}
                    />
                  )}
                </div>
              )}

              {channel === "dine_in" && (
                <>
                  {zonesEnabled && (
                    <div>
                      <label className="mb-1 block text-xs text-black/50">
                        {ar ? "المنطقة" : "Zone"}
                      </label>
                      <select
                        className="h-11 w-full rounded-md border px-3"
                        value={zoneId}
                        onChange={(e) => {
                          setZoneId(e.target.value);
                          setTableId("");
                        }}
                      >
                        <option value="">{ar ? "اختر…" : "Select…"}</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {ar ? z.nameAr : z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-black/50">
                      {ar ? "الطاولة" : "Table"}
                    </label>
                    <select
                      className="h-11 w-full rounded-md border px-3"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                    >
                      <option value="">{ar ? "اختر…" : "Select…"}</option>
                      {filteredTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {ar ? t.labelAr || t.label : t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {channel === "pickup" && (
                <div>
                  <label className="mb-1 block text-xs text-black/50">
                    {ar ? "موبايل (لجاهزية الطلب)" : "Phone (for pickup ready)"}
                  </label>
                  <input
                    className="h-11 w-full rounded-md border px-3 text-left"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              )}

              {channel === "delivery" && (
                <>
                  {areas.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs text-black/50">
                        {ar ? "منطقة التوصيل" : "Delivery area"}
                      </label>
                      <select
                        className="h-11 w-full rounded-md border px-3"
                        value={areaId}
                        onChange={(e) => setAreaId(e.target.value)}
                      >
                        <option value="">{ar ? "اختر الحي…" : "Select area…"}</option>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {ar ? a.nameAr : a.name} · {a.fee}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-black/50">
                      {ar ? "موبايل" : "Phone"}
                    </label>
                    <input
                      className="h-11 w-full rounded-md border px-3 text-left"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-black/50">
                      {ar ? "العنوان" : "Address"}
                    </label>
                    <textarea
                      className="min-h-20 w-full rounded-md border px-3 py-2"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-black/50">
                      {ar ? "ملاحظات التوصيل" : "Delivery notes"}
                    </label>
                    <input
                      className="h-11 w-full rounded-md border px-3"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    />
                  </div>
                  {belowMin && (
                    <p className="text-xs text-red-600">
                      {ar
                        ? `الحد الأدنى للتوصيل ${formatPrice(minOrder, currency, locale)}`
                        : `Minimum for delivery ${formatPrice(minOrder, currency, locale)}`}
                    </p>
                  )}
                </>
              )}

              {guestNoteEnabled && (
                <div>
                  <label className="mb-1 block text-xs text-black/50">
                    {ar ? "ملاحظة للطلب" : "Order note"}
                  </label>
                  <input
                    className="h-11 w-full rounded-md border px-3"
                    value={guestNote}
                    onChange={(e) => setGuestNote(e.target.value)}
                  />
                </div>
              )}

              <p className="rounded-md bg-[var(--brand-surface)] p-3 text-xs text-black/60">
                {payHint
                  ? payHint
                  : channel === "delivery"
                    ? ar
                      ? "الدفع عند الاستلام."
                      : "Pay on delivery."
                    : channel === "pickup"
                      ? ar
                        ? "ادفع عند الاستلام من الفرع."
                        : "Pay when you collect."
                      : ar
                        ? "الحساب عند الكاشير."
                        : "Pay at cashier."}
              </p>

              <input
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                aria-hidden
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-black/10 px-4 py-3">
          {priced.deliveryFee > 0 && (
            <div className="mb-1 flex justify-between text-xs text-black/50">
              <span>{ar ? "التوصيل" : "Delivery"}</span>
              <span>{formatPrice(priced.deliveryFee, currency, locale)}</span>
            </div>
          )}
          {priced.tax > 0 && (
            <div className="mb-1 flex justify-between text-xs text-black/50">
              <span>
                {ar
                  ? taxInclusive
                    ? "شامل الضريبة"
                    : "الضريبة"
                  : taxInclusive
                    ? "Incl. tax"
                    : "Tax"}
              </span>
              <span>{formatPrice(priced.tax, currency, locale)}</span>
            </div>
          )}
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span>{ar ? "الإجمالي" : "Total"}</span>
            <span>{formatPrice(priced.grandTotal, currency, locale)}</span>
          </div>
          {step === "cart" ? (
            <button
              type="button"
              disabled={!cart.lines.length}
              className="h-12 w-full rounded-lg font-bold text-white disabled:opacity-40"
              style={{ background: "var(--brand-primary)" }}
              onClick={() => setStep("checkout")}
            >
              {ar ? "متابعة الطلب" : "Continue"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="h-12 flex-1 rounded-lg border font-medium"
                onClick={() => setStep("cart")}
              >
                {ar ? "رجوع" : "Back"}
              </button>
              <button
                type="button"
                disabled={submitting || belowMin}
                className="h-12 flex-[2] rounded-lg font-bold text-white disabled:opacity-50"
                style={{ background: "var(--brand-primary)" }}
                onClick={submit}
              >
                {submitting
                  ? ar
                    ? "جاري الإرسال…"
                    : "Sending…"
                  : ar
                    ? "تأكيد الطلب"
                    : "Place order"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 min-w-[5.5rem] flex-1 rounded-lg border text-sm font-semibold ${
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
          : "border-black/15"
      }`}
    >
      {label}
    </button>
  );
}
