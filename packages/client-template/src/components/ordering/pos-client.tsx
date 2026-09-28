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
  printKitchenTicket,
  printThermalReceipt,
} from "@/lib/thermal-print";
import { withBasePath } from "@/lib/base-path";
import {
  enqueuePending,
  isNetworkError,
  listPending,
  loadCatalogCache,
  makeLocalCode,
  removePending,
  saveCatalogCache,
  updatePending,
  type PendingPosOrder,
} from "@/lib/pos-offline-queue";

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
    kitchen: "Kitchen",
    escPos: "ESC/POS",
    openShift: "Open shift",
    closeShift: "Close shift",
    shiftOpen: "Shift open",
    shiftClosed: "No open shift",
    offline: "Offline — sales queue locally",
    online: "Online",
    pendingSync: "pending to sync",
    syncNow: "Sync now",
    syncing: "Syncing…",
    queued: "Saved offline",
    offlineCatalog: "Using cached menu",
    syncFailed: "Sync failed — stock or server rejected",
    retry: "Retry",
    discard: "Discard",
    install: "Install POS",
    installHint: "Add to Home Screen for faster offline use",
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
    kitchen: "مطبخ",
    escPos: "ESC/POS",
    openShift: "فتح وردية",
    closeShift: "تقفيل وردية",
    shiftOpen: "وردية مفتوحة",
    shiftClosed: "مفيش وردية",
    offline: "أوفلاين — البيع بيتحفظ محلياً",
    online: "متصل",
    pendingSync: "في انتظار المزامنة",
    syncNow: "زامن الآن",
    syncing: "جاري المزامنة…",
    queued: "اتحفظ أوفلاين",
    offlineCatalog: "المنيو من الكاش",
    syncFailed: "المزامنة فشلت — غالباً مخزون أو رفض من السيرفر",
    retry: "إعادة",
    discard: "تجاهل",
    install: "تثبيت نقطة البيع",
    installHint: "ضيف للشاشة الرئيسية عشان الأوفلاين أسرع",
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
    whereLabel: string;
    note?: string;
  } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [branches, setBranches] = useState<
    { id: string; name: string; nameEn?: string; slug: string }[]
  >([]);
  const [branchId, setBranchId] = useState<string>("");
  const [multiBranch, setMultiBranch] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<PendingPosOrder[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [installEvent, setInstallEvent] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);

  function applyCatalog(data: {
    brand?: BrandInfo;
    categories?: CatalogCategory[];
    products?: CatalogProduct[];
    tables?: CatalogTable[];
    features?: { tableOrderingEnabled?: boolean; multiBranch?: boolean };
    branches?: { id: string; name: string; nameEn?: string; slug: string }[];
    branchId?: string;
  }) {
    if (data.brand) setBrand(data.brand);
    setCategories(data.categories || []);
    setProducts(data.products || []);
    setTables(data.tables || []);
    setTableOrdering(Boolean(data.features?.tableOrderingEnabled));
    setMultiBranch(Boolean(data.features?.multiBranch));
    setBranches(data.branches || []);
    if (data.branchId) setBranchId(data.branchId);
    const mode = (data.brand?.languages || "both") as LanguageMode;
    setLocale(mode === "ar" ? "ar" : "en");
  }

  const refreshPending = useCallback(async () => {
    try {
      setPending(await listPending());
    } catch {
      /* IDB unavailable */
    }
  }, []);

  const syncQueue = useCallback(async (onlyLocalId?: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      const rows = await listPending();
      const targets = onlyLocalId
        ? rows.filter((r) => r.localId === onlyLocalId)
        : rows;
      for (const row of targets) {
        if (row.status === "syncing") continue;
        await updatePending(row.localId, { status: "syncing", lastError: undefined });
        try {
          const res = await fetch(withBasePath("/api/pos/orders"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod: row.paymentMethod,
              tableId: row.tableId,
              guestNote: row.guestNote,
              branchId: row.branchId,
              lines: row.lines,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const errMsg = String(data.error || `HTTP ${res.status}`);
            await updatePending(row.localId, {
              status: "failed",
              lastError: errMsg,
            });
            continue;
          }
          await removePending(row.localId);
          const code = data.order?.code as string | undefined;
          if (code) {
            setLastCode(code);
            setLastReceipt({
              code,
              method: row.paymentMethod,
              lines: row.receiptLines,
              total: row.total,
              whereLabel: row.tableId || "walk-in",
              note: row.guestNote,
            });
          }
        } catch (err) {
          await updatePending(row.localId, {
            status: "pending",
            lastError: err instanceof Error ? err.message : "sync failed",
          });
          if (isNetworkError(err)) break;
        }
      }
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  const load = useCallback(
    async (preferredBranch?: string) => {
      setLoading(true);
      setError(null);
      try {
        const qs = preferredBranch
          ? `?branch=${encodeURIComponent(preferredBranch)}`
          : "";
        const [catRes, shiftRes] = await Promise.all([
          fetch(withBasePath(`/api/pos/catalog${qs}`)),
          fetch(withBasePath("/api/shifts")),
        ]);
        const data = await catRes.json();
        if (!catRes.ok) throw new Error(data.error || "Failed");
        applyCatalog(data);
        setUsingCache(false);
        await saveCatalogCache(
          (data.branchId as string) || preferredBranch || "default",
          data
        );
        if (shiftRes.ok) {
          const s = await shiftRes.json();
          setShiftOpen(Boolean(s.open));
        } else {
          setShiftOpen(null);
        }
      } catch (err) {
        const cached = await loadCatalogCache(preferredBranch).catch(() => null);
        if (cached?.payload && typeof cached.payload === "object") {
          applyCatalog(cached.payload as Parameters<typeof applyCatalog>[0]);
          setUsingCache(true);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Error");
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
    refreshPending();
  }, [load, refreshPending]);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      syncQueue().then(() => load());
    }
    function onOffline() {
      setOnline(false);
    }
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueue, load]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const swUrl = withBasePath("/pos-sw.js");
    const scope = withBasePath("/") || "/";
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => undefined);
  }, []);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      const ev = e as Event & {
        prompt: () => Promise<void>;
        userChoice?: Promise<{ outcome: string }>;
      };
      setInstallEvent({
        prompt: async () => {
          await ev.prompt();
          try {
            await ev.userChoice;
          } catch {
            /* ignore */
          }
          setInstallEvent(null);
          setShowInstallHint(false);
        },
      });
      setShowInstallHint(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    // iOS / already installed: soft hint once per session
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (!isStandalone && !sessionStorage.getItem("obelix_install_dismissed")) {
      setShowInstallHint(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function discardPending(localId: string) {
    await removePending(localId);
    await refreshPending();
  }

  async function switchBranch(id: string) {
    setBranchId(id);
    setLines([]);
    setLastCode(null);
    try {
      await fetch(withBasePath("/api/branches"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", branchId: id }),
      });
    } catch {
      /* offline — still load cached branch catalog if any */
    }
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

  function applyLocalStockDeduct(sold: { itemId: string; qty: number }[]) {
    setProducts((prev) =>
      prev.map((p) => {
        const hit = sold.find((s) => s.itemId === p.id);
        if (!hit || typeof p.stockQty !== "number") return p;
        const next = Math.max(0, p.stockQty - hit.qty);
        return { ...p, stockQty: next, outOfStock: next <= 0 };
      })
    );
  }

  async function closeTicket(method: PaymentMethod) {
    if (!lines.length || closing) return;
    setClosing(true);
    setPayError(null);
    const snapshot = { lines: [...lines], total };
    const whereLabel =
      tables.find((t) => t.id === tableId)?.label ||
      (locale === "ar" ? "حضور" : "walk-in");
    const noteSnap = note.trim() || undefined;
    const body = {
      paymentMethod: method,
      tableId: tableId || null,
      guestNote: noteSnap,
      branchId: branchId || undefined,
      lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
    };

    async function queueOffline(reason?: string) {
      const localCode = makeLocalCode();
      const localId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Date.now()}`;
      await enqueuePending({
        localId,
        localCode,
        createdAt: new Date().toISOString(),
        paymentMethod: method,
        tableId: body.tableId,
        guestNote: body.guestNote,
        branchId: body.branchId,
        lines: body.lines,
        receiptLines: snapshot.lines,
        total: snapshot.total,
      });
      applyLocalStockDeduct(body.lines);
      setLastCode(localCode);
      setLastReceipt({
        code: localCode,
        method,
        lines: snapshot.lines,
        total: snapshot.total,
        whereLabel,
        note: noteSnap,
      });
      setLines([]);
      setNote("");
      await refreshPending();
      if (reason) setPayError(null);
    }

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOffline();
        return;
      }
      const res = await fetch(withBasePath("/api/pos/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const code = data.order?.code || null;
      setLastCode(code);
      if (code) {
        setLastReceipt({
          code,
          method,
          lines: snapshot.lines,
          total: snapshot.total,
          whereLabel,
          note: noteSnap,
        });
      }
      setLines([]);
      setNote("");
      load();
    } catch (err) {
      if (isNetworkError(err)) {
        try {
          await queueOffline();
        } catch (qErr) {
          setPayError(qErr instanceof Error ? qErr.message : "Offline queue failed");
        }
      } else {
        setPayError(err instanceof Error ? err.message : "Error");
      }
    } finally {
      setClosing(false);
    }
  }

  async function toggleShift(action: "open" | "close") {
    setShiftBusy(true);
    setPayError(null);
    try {
      const res = await fetch(withBasePath("/api/shifts"), {
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

  function printLastKitchen() {
    if (!lastReceipt || !brand) return;
    printKitchenTicket({
      storeName: brand.displayName,
      code: lastReceipt.code,
      channelLabel: "POS",
      whereLabel: lastReceipt.whereLabel,
      lines: lastReceipt.lines.map((l) => ({
        name: pickLocalized(locale, l.name, l.nameEn),
        qty: l.qty,
      })),
      note: lastReceipt.note,
      locale,
      dir,
    });
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

      {(!online || pending.length > 0 || usingCache) && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-3 py-2 sm:px-4"
          style={{
            background: online ? "#eef6ff" : "#fff3e0",
          }}
        >
          <p className="text-xs font-medium sm:text-sm">
            {online ? t.online : t.offline}
            {usingCache ? ` · ${t.offlineCatalog}` : ""}
            {pending.length > 0
              ? ` · ${pending.length} ${t.pendingSync}`
              : ""}
          </p>
          {pending.length > 0 && online && (
            <button
              type="button"
              disabled={syncing}
              onClick={() => syncQueue().then(() => load())}
              className="min-h-9 rounded-md border border-black/15 bg-white px-3 text-xs font-bold disabled:opacity-40"
            >
              {syncing ? t.syncing : t.syncNow}
            </button>
          )}
        </div>
      )}

      {pending.some((p) => p.status === "failed") && (
        <div className="space-y-2 border-b border-red-200 bg-red-50 px-3 py-2 sm:px-4">
          <p className="text-xs font-semibold text-red-800">{t.syncFailed}</p>
          {pending
            .filter((p) => p.status === "failed")
            .map((p) => (
              <div
                key={p.localId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-white px-2 py-1.5"
              >
                <div className="min-w-0 text-xs">
                  <p className="font-bold">{p.localCode}</p>
                  <p className="truncate text-red-700 opacity-90">
                    {p.lastError || t.syncFailed}
                  </p>
                  <p className="opacity-50">
                    {formatPrice(p.total, brand.currency, locale)} ·{" "}
                    {p.lines.reduce((s, l) => s + l.qty, 0)}{" "}
                    {locale === "ar" ? "قطعة" : "items"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={syncing || !online}
                    onClick={() =>
                      updatePending(p.localId, { status: "pending" }).then(() =>
                        syncQueue(p.localId).then(() => load())
                      )
                    }
                    className="min-h-8 rounded-md border border-black/15 bg-white px-2 text-[11px] font-bold disabled:opacity-40"
                  >
                    {t.retry}
                  </button>
                  <button
                    type="button"
                    onClick={() => discardPending(p.localId)}
                    className="min-h-8 rounded-md border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-800"
                  >
                    {t.discard}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {showInstallHint && !pending.some((p) => p.status === "failed") && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white px-3 py-2 sm:px-4">
          <p className="text-xs opacity-70">{t.installHint}</p>
          <div className="flex gap-1">
            {installEvent && (
              <button
                type="button"
                onClick={() => installEvent.prompt()}
                className="min-h-8 rounded-md px-3 text-[11px] font-bold text-white"
                style={{ background: primary }}
              >
                {t.install}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowInstallHint(false);
                try {
                  sessionStorage.setItem("obelix_install_dismissed", "1");
                } catch {
                  /* ignore */
                }
              }}
              className="min-h-8 rounded-md border border-black/15 px-2 text-[11px]"
            >
              ✕
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
                  {lastCode.startsWith("OFF-") ? t.queued : t.closed} — {t.code}{" "}
                  {lastCode}
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
                      onClick={printLastKitchen}
                      className="min-h-8 rounded-md border border-black/15 bg-white px-2.5 text-[11px] font-bold"
                    >
                      {t.kitchen}
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
