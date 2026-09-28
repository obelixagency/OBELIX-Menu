"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { useCart } from "./cart-context";

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

type Props = {
  locale: Locale;
  currency: string;
  tableOrdering: boolean;
  delivery: boolean;
  zonesEnabled: boolean;
  guestNoteEnabled: boolean;
};

export function CartCheckout({
  locale,
  currency,
  tableOrdering,
  delivery,
  zonesEnabled,
  guestNoteEnabled,
}: Props) {
  const cart = useCart();
  const router = useRouter();
  const ar = locale === "ar";

  const [channel, setChannel] = useState<"dine_in" | "delivery" | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [tableId, setTableId] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  useEffect(() => {
    if (!cart.open) return;
    fetch("/api/ordering/config?guest=1")
      .then((r) => r.json())
      .then((d) => {
        setTables(d.tables || []);
        setZones(d.zones || []);
      })
      .catch(() => {});
  }, [cart.open]);

  useEffect(() => {
    if (tableOrdering && !delivery) setChannel("dine_in");
    else if (delivery && !tableOrdering) setChannel("delivery");
  }, [tableOrdering, delivery]);

  const filteredTables = useMemo(() => {
    if (!zonesEnabled || !zoneId) return tables;
    return tables.filter((t) => t.zoneId === zoneId);
  }, [tables, zonesEnabled, zoneId]);

  if (!cart.open) return null;

  async function submit() {
    setError(null);
    if (!cart.lines.length) {
      setError(ar ? "السلة فارغة" : "Cart is empty");
      return;
    }
    const ch =
      channel ||
      (tableOrdering ? "dine_in" : delivery ? "delivery" : null);
    if (!ch) {
      setError(ar ? "اختر نوع الطلب" : "Choose order type");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: ch,
          tableId: ch === "dine_in" ? tableId : undefined,
          zoneId: ch === "dine_in" && zonesEnabled ? zoneId : undefined,
          delivery:
            ch === "delivery"
              ? { phone, addressLine: address, notes: deliveryNotes }
              : undefined,
          guestNote: guestNoteEnabled ? guestNote : undefined,
          lines: cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
          website: honeypot,
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
                  key={l.itemId}
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
                      onClick={() => cart.setQty(l.itemId, l.qty - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md border"
                      onClick={() => cart.setQty(l.itemId, l.qty + 1)}
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
              {tableOrdering && delivery && (
                <div className="flex gap-2">
                  <ChannelBtn
                    active={channel === "dine_in"}
                    onClick={() => setChannel("dine_in")}
                    label={ar ? "طاولة" : "Dine-in"}
                  />
                  <ChannelBtn
                    active={channel === "delivery"}
                    onClick={() => setChannel("delivery")}
                    label={ar ? "توصيل" : "Delivery"}
                  />
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
                        <option value="">
                          {ar ? "اختر…" : "Select…"}
                        </option>
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
                      <option value="">
                        {ar ? "اختر…" : "Select…"}
                      </option>
                      {filteredTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {ar ? t.labelAr || t.label : t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {channel === "delivery" && (
                <>
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
                {channel === "delivery"
                  ? ar
                    ? "الدفع عند الاستلام — مفيش دفع أونلاين."
                    : "Pay on delivery — no online payment."
                  : ar
                    ? "الحساب عند الكاشير / على الطاولة — مفيش دفع أونلاين."
                    : "Pay at cashier / table — no online payment."}
              </p>

              {/* honeypot */}
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
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span>{ar ? "الإجمالي" : "Total"}</span>
            <span>{formatPrice(cart.subtotal, currency, locale)}</span>
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
                disabled={submitting}
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
      className={`h-11 flex-1 rounded-lg border text-sm font-semibold ${
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
          : "border-black/15"
      }`}
    >
      {label}
    </button>
  );
}
