"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  dirFor,
  localesFor,
  pickLocalized,
  type Locale,
} from "@/lib/i18n";
import type { LanguageMode } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import {
  downloadEscPosFile,
  printThermalReceipt,
} from "@/lib/thermal-print";

type CatalogProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  nameEn: string;
  price: number;
  image: string | null;
  stockQty?: number | null;
  outOfStock?: boolean;
};

type CatalogCategory = {
  id: string;
  name: string;
  nameEn: string;
  parentId: string | null;
};

type CatalogTable = {
  id: string;
  label: string;
  labelAr: string;
};

type BrandInfo = {
  displayName: string;
  logoUrl: string | null;
  colors: { primary: string; accent: string; surface: string };
  currency: string;
  languages: LanguageMode;
};

type TicketLine = {
  itemId: string;
  name: string;
  nameEn: string;
  qty: number;
  unitPrice: number;
};

type PaymentMethod = "cash" | "card" | "other";

const COPY = {
  en: {
    all: "All",
    walkIn: "Walk-in",
    table: "Table",
    ticket: "Ticket",
    empty: "Tap items to add",
    total: "Total",
    cash: "Cash",
    card: "Card",
    other: "Other",
    clear: "Clear",
    closing: "Closing…",
    closed: "Closed",
    code: "Code",
    loading: "Loading…",
    error: "Could not load POS",
    back: "Dashboard",
    cashier: "Cashier",
    note: "Note (optional)",
    powered: "Powered by OBELIX",
    print: "Print 80mm",
    escPos: "ESC/POS",
    openShift: "Open shift",
    closeShift: "Close shift",
    shiftOpen: "Shift open",
    shiftClosed: "No open shift",
  },
  ar: {
    all: "الكل",
    walkIn: "حضور",
    table: "طاولة",
    ticket: "التذكرة",
    empty: "اضغط على صنف للإضافة",
    total: "الإجمالي",
    cash: "كاش",
    card: "بطاقة",
    other: "أخرى",
    clear: "مسح",
    closing: "جاري الإقفال…",
    closed: "تم الإقفال",
    code: "الكود",
    loading: "جاري التحميل…",
    error: "تعذّر تحميل نقطة البيع",
    back: "الداشبورد",
    cashier: "كاشير",
    note: "ملاحظة (اختياري)",
    powered: "مدعوم من OBELIX",
    print: "طباعة ٨٠مم",
    escPos: "ESC/POS",
    openShift: "فتح وردية",
    closeShift: "تقفيل وردية",
    shiftOpen: "وردية مفتوحة",
    shiftClosed: "مفيش وردية",
  },
} as const;

export function PosClient({ staffName }: { staffName?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [tableOrdering, setTableOrdering] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [tableId, setTableId] = useState<string>("");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{
    code: string;
    method: PaymentMethod;
    lines: TicketLine[];
    total: number;
  } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [branches, setBranches] = useState<
    { id: string; name: string; nameEn?: string; slug: string }[]
  >([]);
  const [branchId, setBranchId] = useState<string>("");
  const [multiBranch, setMultiBranch] = useState(false);

  const load = useCallback(async (preferredBranch?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = preferredBranch
        ? `?branch=${encodeURIComponent(preferredBranch)}`
        : "";
      const [catRes, shiftRes] = await Promise.all([
        fetch(`/api/pos/catalog${qs}`),
        fetch("/api/shifts"),
      ]);
      const data = await catRes.json();
      if (!catRes.ok) throw new Error(data.error || "Failed");
      setBrand(data.brand);
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setTables(data.tables || []);
      setTableOrdering(Boolean(data.features?.tableOrderingEnabled));
      setMultiBranch(Boolean(data.features?.multiBranch));
      setBranches(data.branches || []);
      if (data.branchId) setBranchId(data.branchId);
      const mode = (data.brand?.languages || "both") as LanguageMode;
      setLocale(mode === "ar" ? "ar" : "en");
      if (shiftRes.ok) {
        const s = await shiftRes.json();
        setShiftOpen(Boolean(s.open));
      } else {
        setShiftOpen(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function switchBranch(id: string) {
    setBranchId(id);
    setLines([]);
    setLastCode(null);
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select", branchId: id }),
    });
    await load(id);
  }

  const t = COPY[locale];
  const dir = dirFor(locale);
  const localeOptions = brand ? localesFor(brand.languages) : (["en"] as Locale[]);

  const leafCategories = useMemo(() => {
    const parents = new Set(
      categories.filter((c) => c.parentId).map((c) => c.parentId as string)
    );
    // Prefer leaf cats that have products; fallback to all active
    const withProducts = new Set(products.map((p) => p.categoryId).filter(Boolean));
    return categories.filter(
      (c) => withProducts.has(c.id) || (!parents.has(c.id) && !c.parentId)
    );
  }, [categories, products]);

  const visibleProducts = useMemo(() => {
    if (categoryId === "all") return products;
    const childIds = new Set(
      categories.filter((c) => c.parentId === categoryId).map((c) => c.id)
    );
    childIds.add(categoryId);
    return products.filter((p) => p.categoryId && childIds.has(p.categoryId));
  }, [products, categoryId, categories]);

  const total = useMemo(
    () =>
      Math.round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) * 100) /
      100,
    [lines]
  );

  function addProduct(p: CatalogProduct) {
    if (p.outOfStock) {
      setPayError(locale === "ar" ? "نفد المخزون" : "Out of stock");
      return;
    }
    setLastCode(null);
    setPayError(null);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.itemId === p.id);
      const nextQty = i >= 0 ? prev[i].qty + 1 : 1;
      if (typeof p.stockQty === "number" && nextQty > p.stockQty) {
        setPayError(
          locale === "ar"
            ? `المتبقي ${p.stockQty} فقط`
            : `Only ${p.stockQty} left`
        );
        return prev;
      }
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: nextQty };
        return next;
      }
      return [
        ...prev,
        {
          itemId: p.id,
          name: p.name,
          nameEn: p.nameEn,
          qty: 1,
          unitPrice: p.price,
        },
      ];
    });
  }

  function setQty(itemId: string, qty: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0)
    );
  }

  async function closeTicket(method: PaymentMethod) {
    if (!lines.length || closing) return;
    setClosing(true);
    setPayError(null);
    const snapshot = { lines: [...lines], total };
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          tableId: tableId || null,
          guestNote: note || undefined,
          branchId: branchId || undefined,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const code = data.order?.code || null;
      setLastCode(code);
      if (code) {
        setLastReceipt({
          code,
          method,
          lines: snapshot.lines,
          total: snapshot.total,
        });
      }
      setLines([]);
      setNote("");
      // refresh stock badges
      load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Error");
    } finally {
      setClosing(false);
    }
  }

  async function toggleShift(action: "open" | "close") {
    setShiftBusy(true);
    setPayError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, openingCash: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShiftOpen(action === "open");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Error");
    } finally {
      setShiftBusy(false);
    }
  }

  function receiptPayload() {
    if (!lastReceipt || !brand) return null;
    return {
      storeName: brand.displayName,
      code: lastReceipt.code,
      currency: brand.currency,
      method: lastReceipt.method,
      total: lastReceipt.total,
      locale,
      dir,
      lines: lastReceipt.lines.map((l) => ({
        name: pickLocalized(locale, l.name, l.nameEn),
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
    };
  }

  function printLastReceipt() {
    const payload = receiptPayload();
    if (!payload) return;
    printThermalReceipt(payload);
  }

  function downloadLastEscPos() {
    const payload = receiptPayload();
    if (!payload) return;
    downloadEscPosFile(payload);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm opacity-60">
        {t.loading}
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error || t.error}</p>
        <Link href="/dashboard" className="underline text-sm">
          {t.back}
        </Link>
      </div>
    );
  }

  const primary = brand.colors.primary;
  const accent = brand.colors.accent;
  const surface = brand.colors.surface;

  return (
    <div
      className="flex min-h-screen flex-col"
      dir={dir}
      lang={locale}
      style={{ background: surface, color: "#1a1410" }}
    >
      <header
        className="flex flex-wrap items-center gap-3 border-b border-black/10 px-3 py-2.5 sm:px-4"
        style={{ background: "#fff" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: primary }}
            >
              {brand.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold" style={{ color: primary }}>
              {brand.displayName}
            </p>
            <p className="text-[11px] opacity-50">
              {t.cashier}
              {staffName ? ` · ${staffName}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {multiBranch && branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="min-h-10 rounded-md border border-black/15 bg-white px-2 text-sm font-medium"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {pickLocalized(locale, b.name, b.nameEn || b.name)}
                </option>
              ))}
            </select>
          )}
          {localeOptions.length > 1 && (
            <div className="inline-flex overflow-hidden rounded-md border border-black/15">
              {localeOptions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={cn(
                    "min-h-9 min-w-9 px-2 text-xs font-bold",
                    locale === loc ? "text-white" : "bg-white opacity-60"
                  )}
                  style={
                    locale === loc ? { background: primary } : undefined
                  }
                  onClick={() => setLocale(loc)}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {tableOrdering && (
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="min-h-10 rounded-md border border-black/15 bg-white px-2 text-sm"
            >
              <option value="">{t.walkIn}</option>
              {tables.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  {t.table}:{" "}
                  {pickLocalized(locale, tb.labelAr, tb.label)}
                </option>
              ))}
            </select>
          )}

          <Link
            href="/dashboard"
            className="min-h-10 rounded-md border border-black/15 bg-white px-3 text-xs font-medium leading-10"
          >
            {t.back}
          </Link>
        </div>
      </header>

      {shiftOpen !== null && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-3 py-2 sm:px-4"
          style={{ background: shiftOpen ? `${accent}22` : "#fff8f0" }}
        >
          <p className="text-xs font-medium sm:text-sm">
            {shiftOpen ? t.shiftOpen : t.shiftClosed}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/shifts"
              className="text-[11px] opacity-50 underline"
            >
              {locale === "ar" ? "التفاصيل" : "Details"}
            </Link>
            <button
              type="button"
              disabled={shiftBusy}
              onClick={() => toggleShift(shiftOpen ? "close" : "open")}
              className="min-h-9 rounded-md border border-black/15 bg-white px-3 text-xs font-bold disabled:opacity-40"
              style={
                shiftOpen
                  ? undefined
                  : { background: primary, color: "#fff", borderColor: primary }
              }
            >
              {shiftBusy ? "…" : shiftOpen ? t.closeShift : t.openShift}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-0 lg:flex-row">
        {/* Catalog */}
        <section className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <Chip
              active={categoryId === "all"}
              primary={primary}
              onClick={() => setCategoryId("all")}
            >
              {t.all}
            </Chip>
            {leafCategories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                primary={primary}
                onClick={() => setCategoryId(c.id)}
              >
                {pickLocalized(locale, c.name, c.nameEn)}
              </Chip>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.outOfStock}
                onClick={() => addProduct(p)}
                className={cn(
                  "flex min-h-[5.5rem] flex-col items-start justify-between rounded-xl border border-black/10 bg-white p-3 text-start shadow-sm transition active:scale-[0.98]",
                  p.outOfStock && "cursor-not-allowed opacity-45"
                )}
              >
                <span className="line-clamp-2 text-sm font-semibold">
                  {pickLocalized(locale, p.name, p.nameEn)}
                </span>
                <span className="mt-auto flex w-full items-end justify-between gap-1 pt-2">
                  <span className="text-sm font-bold" style={{ color: primary }}>
                    {formatPrice(p.price, brand.currency, locale)}
                  </span>
                  {typeof p.stockQty === "number" && (
                    <span className="text-[10px] text-black/40">
                      {p.outOfStock
                        ? locale === "ar"
                          ? "نفد"
                          : "0"
                        : `×${p.stockQty}`}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Ticket */}
        <aside
          className="flex w-full flex-col border-t border-black/10 bg-white lg:w-[380px] lg:border-s lg:border-t-0"
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <h2 className="font-bold" style={{ color: primary }}>
              {t.ticket}
            </h2>
            {lines.length > 0 && (
              <button
                type="button"
                className="text-xs opacity-50 underline"
                onClick={() => setLines([])}
              >
                {t.clear}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {lines.length === 0 && (
              <p className="py-8 text-center text-sm opacity-40">{t.empty}</p>
            )}
            {lines.map((l) => (
              <div
                key={l.itemId}
                className="flex items-center gap-2 rounded-lg border border-black/5 bg-[var(--brand-surface)] px-2 py-2"
                style={{ background: surface }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {pickLocalized(locale, l.name, l.nameEn)}
                  </p>
                  <p className="text-xs opacity-50">
                    {formatPrice(l.unitPrice * l.qty, brand.currency, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <QtyBtn onClick={() => setQty(l.itemId, l.qty - 1)}>−</QtyBtn>
                  <span className="min-w-6 text-center text-sm font-bold">
                    {l.qty}
                  </span>
                  <QtyBtn onClick={() => setQty(l.itemId, l.qty + 1)}>+</QtyBtn>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-black/10 p-4">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.note}
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
            />
            <div className="flex items-end justify-between">
              <span className="text-sm opacity-60">{t.total}</span>
              <span className="text-xl font-extrabold" style={{ color: primary }}>
                {formatPrice(total, brand.currency, locale)}
              </span>
            </div>

            {payError && (
              <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
                {payError}
              </p>
            )}
            {lastCode && (
              <div
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                style={{ background: `${accent}33` }}
              >
                <p className="text-xs font-medium">
                  {t.closed} — {t.code} {lastCode}
                </p>
                {lastReceipt && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={printLastReceipt}
                      className="min-h-8 rounded-md border border-black/15 bg-white px-2.5 text-[11px] font-bold"
                    >
                      {t.print}
                    </button>
                    <button
                      type="button"
                      onClick={downloadLastEscPos}
                      title="ESC/POS text"
                      className="min-h-8 rounded-md border border-black/15 bg-white px-2 text-[10px] font-bold opacity-70"
                    >
                      {t.escPos}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(["cash", "card", "other"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={!lines.length || closing}
                  onClick={() => closeTicket(m)}
                  className="min-h-12 rounded-lg text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: primary }}
                >
                  {closing ? "…" : t[m]}
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] opacity-30">{t.powered}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Chip({
  active,
  primary,
  onClick,
  children,
}: {
  active: boolean;
  primary: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
        active ? "text-white" : "border border-black/15 bg-white"
      )}
      style={active ? { background: primary } : undefined}
    >
      {children}
    </button>
  );
}

function QtyBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-black/15 bg-white text-base font-bold"
    >
      {children}
    </button>
  );
}
