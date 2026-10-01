"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  dirFor,
  localesFor,
  pickLocalized,
  type Locale,
} from "@/lib/i18n";
import type { LanguageMode, OptionSelection, ProductOptionGroup } from "@/lib/types";
import {
  configuredBasePrice,
  lineKey,
  optionLabels,
  priceAfterDiscount,
} from "@/lib/types";
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

/** Unified OBELIX POS chrome — not client Brand Kit */
const OX = {
  bg: "#0a0a0a",
  panel: "#141414",
  card: "#1a1a1a",
  line: "rgba(255,255,255,0.12)",
  muted: "rgba(255,255,255,0.55)",
  yellow: "#FACF1C",
  ink: "#0a0a0a",
} as const;

type CatalogProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  nameEn: string;
  price: number;
  rawPrice?: number;
  hasDiscount?: boolean;
  priceOriginal?: number;
  discount?: { type: "percent" | "price" | "fixed"; value: number } | null;
  image: string | null;
  stockQty?: number | null;
  outOfStock?: boolean;
  optionGroups?: ProductOptionGroup[];
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
  lineKey: string;
  name: string;
  nameEn: string;
  qty: number;
  unitPrice: number;
  image?: string | null;
  options?: OptionSelection[];
};

type PaymentMethod = "cash" | "card" | "other";

type HeldTicket = {
  id: string;
  lines: TicketLine[];
  note: string;
  tableId: string;
  total: number;
};

const COPY = {
  en: {
    all: "All",
    walkIn: "Walk-in",
    table: "Table",
    ticket: "Ticket",
    empty: "Tap items to add",
    total: "Subtotal",
    payment: "Payment",
    cash: "Cash",
    card: "Card",
    other: "Other",
    clear: "Clear all",
    hold: "Hold Ticket",
    resume: "Resume held",
    held: "Held",
    closing: "Closing…",
    closed: "Closed",
    code: "Code",
    loading: "Loading…",
    error: "Could not load POS",
    back: "Back",
    cashier: "Cashier",
    note: "Note (optional)",
    brandFooter: "OBELIX Menu",
    poweredBy: "Powered by OBELIX",
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
    items: "items",
  },
  ar: {
    all: "الكل",
    walkIn: "حضور",
    table: "طاولة",
    ticket: "التذكرة",
    empty: "اضغط على صنف للإضافة",
    total: "الإجمالي",
    payment: "الدفع",
    cash: "كاش",
    card: "بطاقة",
    other: "أخرى",
    clear: "مسح الكل",
    hold: "تعليق التذكرة",
    resume: "استئناف المعلّق",
    held: "معلّق",
    closing: "جاري الإقفال…",
    closed: "تم الإقفال",
    code: "الكود",
    loading: "جاري التحميل…",
    error: "تعذّر تحميل نقطة البيع",
    back: "رجوع",
    cashier: "كاشير",
    note: "ملاحظة (اختياري)",
    brandFooter: "OBELIX Menu",
    poweredBy: "Powered by OBELIX",
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
    items: "أصناف",
  },
} as const;

function mediaUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  return withBasePath(src);
}

function categoryIconKind(
  name: string,
  nameEn: string
): "all" | "coffee" | "food" | "drink" | "dessert" | "other" {
  const s = `${name} ${nameEn}`.toLowerCase();
  if (/coffee|espresso|كابتشينو|قهوة|hot drink|مشروب ساخن|turkish/.test(s))
    return "coffee";
  if (/dessert|sweet|حلو|كنافة|بسبوسة|muffin|cookie|dessert/.test(s))
    return "dessert";
  if (/food|أكل|breakfast|فطار|sandwich|foul|فول|croissant|toast/.test(s))
    return "food";
  if (/drink|juice|cold|مشروب|عصير|latte|mango|tea|شاي/.test(s)) return "drink";
  return "other";
}

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
  const [picking, setPicking] = useState<CatalogProduct | null>(null);
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
  const [held, setHeld] = useState<HeldTicket[]>([]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");

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

  const syncQueue = useCallback(
    async (onlyLocalId?: string) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      setSyncing(true);
      try {
        const rows = await listPending();
        const targets = onlyLocalId
          ? rows.filter((r) => r.localId === onlyLocalId)
          : rows;
        for (const row of targets) {
          if (row.status === "syncing") continue;
          await updatePending(row.localId, {
            status: "syncing",
            lastError: undefined,
          });
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
                lines: row.receiptLines.map((l) => ({
                  itemId: l.itemId,
                  lineKey: l.lineKey || l.itemId,
                  name: l.name,
                  nameEn: l.nameEn,
                  qty: l.qty,
                  unitPrice: l.unitPrice,
                  options: l.options,
                })),
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
    },
    [refreshPending]
  );

  const load = useCallback(async (preferredBranch?: string) => {
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
  }, []);

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
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (!isStandalone && !sessionStorage.getItem("obelix_install_dismissed")) {
      setShowInstallHint(true);
    }
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
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
      /* offline */
    }
    await load(id);
  }

  const t = COPY[locale];
  const dir = dirFor(locale);
  const localeOptions = brand
    ? localesFor(brand.languages)
    : (["en"] as Locale[]);

  const leafCategories = useMemo(() => {
    const parents = new Set(
      categories.filter((c) => c.parentId).map((c) => c.parentId as string)
    );
    const withProducts = new Set(
      products.map((p) => p.categoryId).filter(Boolean)
    );
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

  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.qty, 0),
    [lines]
  );

  function addProduct(p: CatalogProduct, selections: OptionSelection[] = []) {
    if (p.outOfStock) {
      setPayError(locale === "ar" ? "نفد المخزون" : "Out of stock");
      return;
    }
    if ((p.optionGroups || []).length && !selections.length) {
      setPicking(p);
      return;
    }
    const raw = p.rawPrice ?? p.price;
    const configured = configuredBasePrice(
      {
        id: p.id,
        categoryId: p.categoryId || "",
        name: p.name,
        price: raw,
        image: p.image,
        available: true,
        featured: false,
        sortOrder: 0,
        optionGroups: p.optionGroups,
      },
      selections
    );
    const pricing = priceAfterDiscount(configured, p.discount || null);
    const extrasAr = optionLabels(
      { ...p, price: raw, categoryId: p.categoryId || "", image: p.image, available: true, featured: false, sortOrder: 0 },
      selections,
      "ar"
    );
    const extrasEn = optionLabels(
      { ...p, price: raw, categoryId: p.categoryId || "", image: p.image, available: true, featured: false, sortOrder: 0 },
      selections,
      "en"
    );
    const key = lineKey(p.id, selections);
    setLastCode(null);
    setPayError(null);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.lineKey === key);
      const nextQty = i >= 0 ? prev[i].qty + 1 : 1;
      if (typeof p.stockQty === "number") {
        const sameProduct = prev
          .filter((l) => l.itemId === p.id)
          .reduce((s, l) => s + l.qty, 0);
        const extra = i >= 0 ? 0 : 1;
        if (sameProduct + extra > p.stockQty) {
          setPayError(
            locale === "ar"
              ? `المتبقي ${p.stockQty} فقط`
              : `Only ${p.stockQty} left`
          );
          return prev;
        }
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
          lineKey: key,
          name: extrasAr.length ? `${p.name} · ${extrasAr.join(" · ")}` : p.name,
          nameEn: extrasEn.length
            ? `${p.nameEn} · ${extrasEn.join(" · ")}`
            : p.nameEn,
          qty: 1,
          unitPrice: pricing.final,
          image: p.image,
          options: selections,
        },
      ];
    });
  }

  function setQty(lineKey: string, qty: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.lineKey === lineKey ? { ...l, qty } : l))
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

  function holdTicket() {
    if (!lines.length) {
      if (held.length) {
        const last = held[held.length - 1];
        setLines(last.lines);
        setNote(last.note);
        setTableId(last.tableId);
        setHeld((h) => h.slice(0, -1));
      }
      return;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `hold-${Date.now()}`;
    setHeld((h) => [
      ...h,
      { id, lines: [...lines], note, tableId, total },
    ]);
    setLines([]);
    setNote("");
    setLastCode(null);
    setPayError(null);
  }

  function resumeHeld(id: string) {
    const ticket = held.find((h) => h.id === id);
    if (!ticket) return;
    if (lines.length) {
      setPayError(
        locale === "ar"
          ? "امسح أو علّق التذكرة الحالية أولاً"
          : "Clear or hold the current ticket first"
      );
      return;
    }
    setLines(ticket.lines);
    setNote(ticket.note);
    setTableId(ticket.tableId);
    setHeld((h) => h.filter((x) => x.id !== id));
  }

  async function closeTicket(method: PaymentMethod) {
    if (!lines.length || closing) return;
    setClosing(true);
    setPayError(null);
    setPayMethod(method);
    const snapshot = { lines: [...lines], total };
    const whereLabel =
      tables.find((tb) => tb.id === tableId)?.label ||
      (locale === "ar" ? "حضور" : "walk-in");
    const noteSnap = note.trim() || undefined;
    const body = {
      paymentMethod: method,
      tableId: tableId || null,
      guestNote: noteSnap,
      branchId: branchId || undefined,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        qty: l.qty,
        options: l.options || [],
      })),
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
          setPayError(
            qErr instanceof Error ? qErr.message : "Offline queue failed"
          );
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

  function clientPrintBrand() {
    if (!brand) return undefined;
    return {
      logoUrl: mediaUrl(brand.logoUrl),
      primary: brand.colors.primary,
      accent: brand.colors.accent,
    };
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
      brand: clientPrintBrand(),
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
      brand: clientPrintBrand(),
    });
  }

  function downloadLastEscPos() {
    const payload = receiptPayload();
    if (!payload) return;
    downloadEscPosFile(payload);
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ background: OX.bg, color: OX.yellow }}
      >
        {t.loading}
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 p-6"
        style={{ background: OX.bg, color: "#fff" }}
      >
        <p className="text-sm text-red-300">{error || t.error}</p>
        <Link
          href="/dashboard"
          className="text-sm underline"
          style={{ color: OX.yellow }}
        >
          {t.back}
        </Link>
      </div>
    );
  }

  const logoSrc = mediaUrl(brand.logoUrl);

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      dir={dir}
      lang={locale}
      style={{ background: OX.bg, color: "#fff" }}
    >
      {/* Header — OBELIX chrome + tiny client mark */}
      <header
        className="flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-5"
        style={{ borderColor: OX.line, background: OX.panel }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Client logo — venue identity; chrome stays OBELIX */}
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={brand.displayName}
              className="h-12 w-12 shrink-0 rounded-xl object-contain bg-white/95 p-1"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black"
              style={{ background: OX.yellow, color: OX.ink }}
            >
              {brand.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              {brand.displayName}
            </p>
            <p className="truncate text-[11px]" style={{ color: OX.muted }}>
              <span style={{ color: OX.yellow }}>OBELIX</span> POS · {t.cashier}
              {staffName ? ` · ${staffName}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {multiBranch && branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => switchBranch(e.target.value)}
              className="min-h-10 rounded-lg border bg-transparent px-2 text-sm font-medium text-white"
              style={{ borderColor: OX.line }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-black">
                  {pickLocalized(locale, b.name, b.nameEn || b.name)}
                </option>
              ))}
            </select>
          )}

          {localeOptions.length > 1 && (
            <div
              className="inline-flex overflow-hidden rounded-lg border"
              style={{ borderColor: OX.line }}
            >
              {localeOptions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className="min-h-9 min-w-9 px-2 text-xs font-bold"
                  style={
                    locale === loc
                      ? { background: OX.yellow, color: OX.ink }
                      : { color: OX.muted }
                  }
                  onClick={() => setLocale(loc)}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Walk-in / table — center control in mockup spirit */}
          {tableOrdering ? (
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="min-h-11 min-w-[9rem] rounded-xl border-2 px-3 text-sm font-bold"
              style={{
                borderColor: OX.yellow,
                background: OX.card,
                color: "#fff",
              }}
            >
              <option value="" className="bg-black">
                {t.walkIn}
              </option>
              {tables.map((tb) => (
                <option key={tb.id} value={tb.id} className="bg-black">
                  {t.table}: {pickLocalized(locale, tb.labelAr, tb.label)}
                </option>
              ))}
            </select>
          ) : (
            <span
              className="flex min-h-11 items-center rounded-xl border-2 px-4 text-sm font-bold"
              style={{ borderColor: OX.yellow, color: OX.yellow }}
            >
              {t.walkIn}
            </span>
          )}

          {held.length > 0 && (
            <button
              type="button"
              onClick={() => resumeHeld(held[held.length - 1].id)}
              className="min-h-10 rounded-lg border px-3 text-xs font-bold"
              style={{ borderColor: OX.yellow, color: OX.yellow }}
            >
              {t.held} ×{held.length}
            </button>
          )}
        </div>
      </header>

      {/* Ops strips — compact, keep features */}
      {shiftOpen !== null && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 sm:px-5"
          style={{
            borderColor: OX.line,
            background: shiftOpen ? "rgba(250,207,28,0.08)" : "rgba(255,120,0,0.1)",
          }}
        >
          <p className="text-xs" style={{ color: OX.muted }}>
            {shiftOpen ? t.shiftOpen : t.shiftClosed}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/shifts"
              className="text-[11px] underline"
              style={{ color: OX.muted }}
            >
              {locale === "ar" ? "التفاصيل" : "Details"}
            </Link>
            <button
              type="button"
              disabled={shiftBusy}
              onClick={() => toggleShift(shiftOpen ? "close" : "open")}
              className="min-h-8 rounded-md px-3 text-xs font-bold disabled:opacity-40"
              style={
                shiftOpen
                  ? { border: `1px solid ${OX.line}`, color: "#fff" }
                  : { background: OX.yellow, color: OX.ink }
              }
            >
              {shiftBusy ? "…" : shiftOpen ? t.closeShift : t.openShift}
            </button>
          </div>
        </div>
      )}

      {(!online || pending.length > 0 || usingCache) && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 sm:px-5"
          style={{
            borderColor: OX.line,
            background: online ? "rgba(80,140,255,0.12)" : "rgba(255,160,0,0.15)",
          }}
        >
          <p className="text-xs" style={{ color: OX.muted }}>
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
              className="min-h-8 rounded-md px-3 text-xs font-bold disabled:opacity-40"
              style={{ background: OX.yellow, color: OX.ink }}
            >
              {syncing ? t.syncing : t.syncNow}
            </button>
          )}
        </div>
      )}

      {pending.some((p) => p.status === "failed") && (
        <div
          className="space-y-2 border-b px-3 py-2 sm:px-5"
          style={{ borderColor: "rgba(248,113,113,0.4)", background: "rgba(127,29,29,0.35)" }}
        >
          <p className="text-xs font-semibold text-red-200">{t.syncFailed}</p>
          {pending
            .filter((p) => p.status === "failed")
            .map((p) => (
              <div
                key={p.localId}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0 text-[11px] text-red-100/90">
                  <p className="font-mono font-bold">{p.localCode}</p>
                  <p className="opacity-70">
                    {formatPrice(p.total, brand.currency, locale)} ·{" "}
                    {p.lines.reduce((s, l) => s + l.qty, 0)} {t.items}
                  </p>
                  {p.lastError ? (
                    <p className="opacity-60">{p.lastError}</p>
                  ) : null}
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
                    className="min-h-8 rounded-md px-2 text-[11px] font-bold disabled:opacity-40"
                    style={{ background: OX.yellow, color: OX.ink }}
                  >
                    {t.retry}
                  </button>
                  <button
                    type="button"
                    onClick={() => discardPending(p.localId)}
                    className="min-h-8 rounded-md border border-red-400/40 px-2 text-[11px] font-bold text-red-200"
                  >
                    {t.discard}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {showInstallHint && !pending.some((p) => p.status === "failed") && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 sm:px-5"
          style={{ borderColor: OX.line }}
        >
          <p className="text-xs" style={{ color: OX.muted }}>
            {t.installHint}
          </p>
          <div className="flex gap-1">
            {installEvent && (
              <button
                type="button"
                onClick={() => installEvent.prompt()}
                className="min-h-8 rounded-md px-3 text-[11px] font-bold"
                style={{ background: OX.yellow, color: OX.ink }}
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
              className="min-h-8 px-2 text-[11px]"
              style={{ color: OX.muted }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col pb-[5.5rem] lg:flex-row lg:min-h-0 lg:overflow-hidden">
        {/* Catalog */}
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <CatChip
              active={categoryId === "all"}
              kind="all"
              onClick={() => setCategoryId("all")}
            >
              {t.all}
            </CatChip>
            {leafCategories.map((c) => (
              <CatChip
                key={c.id}
                active={categoryId === c.id}
                kind={categoryIconKind(c.name, c.nameEn)}
                onClick={() => setCategoryId(c.id)}
              >
                {pickLocalized(locale, c.name, c.nameEn)}
              </CatChip>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((p) => {
              const img = mediaUrl(p.image);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.outOfStock}
                  onClick={() => addProduct(p)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl text-start transition active:scale-[0.98]",
                    p.outOfStock && "cursor-not-allowed opacity-40"
                  )}
                  style={{ background: OX.card }}
                >
                  <div
                    className="relative aspect-[4/3] w-full overflow-hidden"
                    style={{ background: "#222" }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-3xl font-black opacity-30"
                        style={{ color: OX.yellow }}
                      >
                        {pickLocalized(locale, p.name, p.nameEn).slice(0, 1)}
                      </div>
                    )}
                    {typeof p.stockQty === "number" && (
                      <span
                        className="absolute bottom-1 end-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: "rgba(0,0,0,0.65)",
                          color: p.outOfStock ? "#f87171" : OX.muted,
                        }}
                      >
                        {p.outOfStock
                          ? locale === "ar"
                            ? "نفد"
                            : "0"
                          : `×${p.stockQty}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-2.5">
                    <span className="line-clamp-2 text-sm font-semibold text-white">
                      {pickLocalized(locale, p.name, p.nameEn)}
                    </span>
                    <span
                      className="mt-auto text-sm font-bold"
                      style={{ color: OX.yellow }}
                    >
                      {formatPrice(p.price, brand.currency, locale)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Ticket */}
        <aside
          className="flex w-full max-h-[70vh] flex-col border-t lg:max-h-none lg:h-full lg:w-[380px] lg:border-s lg:border-t-0 lg:overflow-hidden"
          style={{ borderColor: OX.line, background: OX.panel }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: OX.line }}
          >
            <h2 className="text-lg font-bold text-white">{t.ticket}</h2>
            {lines.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: OX.yellow }}
                onClick={() => setLines([])}
              >
                <TrashIcon />
                {t.clear}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {lines.length === 0 && (
              <p
                className="py-10 text-center text-sm"
                style={{ color: OX.muted }}
              >
                {t.empty}
              </p>
            )}
            {lines.map((l) => {
              const img = mediaUrl(l.image);
              return (
                <div
                  key={l.lineKey}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2"
                  style={{ background: OX.card }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full"
                    style={{ background: "#2a2a2a" }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-xs font-bold"
                        style={{ color: OX.yellow }}
                      >
                        {pickLocalized(locale, l.name, l.nameEn).slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {pickLocalized(locale, l.name, l.nameEn)}
                    </p>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: OX.yellow }}
                    >
                      {formatPrice(l.unitPrice * l.qty, brand.currency, locale)}
                    </p>
                  </div>
                  <div
                    className="flex items-center overflow-hidden rounded-lg border"
                    style={{ borderColor: OX.line }}
                  >
                    <QtyBtn onClick={() => setQty(l.lineKey, l.qty - 1)}>−</QtyBtn>
                    <span className="min-w-7 text-center text-sm font-bold">
                      {l.qty}
                    </span>
                    <QtyBtn onClick={() => setQty(l.lineKey, l.qty + 1)}>+</QtyBtn>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="space-y-3 border-t p-4"
            style={{ borderColor: OX.line }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.note}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30"
              style={{ borderColor: OX.line }}
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-white">
                {t.payment}
              </p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["cash", t.cash, <WalletIcon key="w" />],
                    ["card", t.card, <CardIcon key="c" />],
                    ["other", t.other, <DotsIcon key="d" />],
                  ] as const
                ).map(([m, label, icon]) => {
                  const selected = payMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!lines.length || closing}
                      onClick={() => {
                        setPayMethod(m);
                        void closeTicket(m);
                      }}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-35"
                      style={
                        selected
                          ? { background: OX.yellow, color: OX.ink }
                          : {
                              background: "transparent",
                              color: "#fff",
                              border: `1.5px solid ${OX.line}`,
                            }
                      }
                    >
                      {icon}
                      {closing && payMethod === m ? t.closing : label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-end justify-between pt-1">
              <span className="text-sm" style={{ color: OX.muted }}>
                {t.total}
                {itemCount > 0 ? ` (${itemCount} ${t.items})` : ""}
              </span>
              <span
                className="text-2xl font-extrabold"
                style={{ color: OX.yellow }}
              >
                {formatPrice(total, brand.currency, locale)}
              </span>
            </div>

            {payError && (
              <p className="rounded-md bg-red-500/20 px-2 py-1.5 text-xs text-red-200">
                {payError}
              </p>
            )}
            {lastCode && (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5"
                style={{ background: "rgba(250,207,28,0.15)" }}
              >
                <p className="text-xs font-medium" style={{ color: OX.yellow }}>
                  {lastCode.startsWith("OFF-") ? t.queued : t.closed} — {t.code}{" "}
                  {lastCode}
                </p>
                {lastReceipt && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={printLastReceipt}
                      className="min-h-8 rounded-md border px-2.5 text-[11px] font-bold text-white"
                      style={{ borderColor: OX.line }}
                    >
                      {t.print}
                    </button>
                    <button
                      type="button"
                      onClick={printLastKitchen}
                      className="min-h-8 rounded-md border px-2.5 text-[11px] font-bold text-white"
                      style={{ borderColor: OX.line }}
                    >
                      {t.kitchen}
                    </button>
                    <button
                      type="button"
                      onClick={downloadLastEscPos}
                      title="ESC/POS text"
                      className="min-h-8 rounded-md border px-2 text-[10px] font-bold text-white/70"
                      style={{ borderColor: OX.line }}
                    >
                      {t.escPos}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer — Back · OBELIX Menu · Hold · Powered by OBELIX */}
      <footer
        className="fixed inset-x-0 bottom-0 z-40 border-t px-3 py-2 sm:px-5"
        style={{ borderColor: OX.line, background: OX.panel }}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold text-white"
            style={{ borderColor: OX.line }}
          >
            <span aria-hidden>{dir === "rtl" ? "→" : "←"}</span>
            {t.back}
          </Link>

          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black"
                style={{ background: OX.yellow, color: OX.ink }}
              >
                OX
              </span>
              <span className="text-sm font-bold tracking-wide">
                <span style={{ color: OX.yellow }}>OBELIX</span>{" "}
                <span className="text-white">Menu</span>
              </span>
            </div>
            <p className="text-[10px]" style={{ color: OX.muted }}>
              {t.poweredBy}
            </p>
          </div>

          <button
            type="button"
            onClick={holdTicket}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-bold"
            style={{ borderColor: OX.yellow, color: OX.yellow }}
          >
            <HoldIcon />
            {lines.length ? t.hold : held.length ? t.resume : t.hold}
          </button>
        </div>
      </footer>

      {picking && (
        <PosOptionSheet
          product={picking}
          locale={locale}
          currency={brand?.currency || "EGP"}
          onCancel={() => setPicking(null)}
          onConfirm={(sel) => {
            addProduct(picking, sel);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function CatChip({
  active,
  kind,
  onClick,
  children,
}: {
  active: boolean;
  kind: "all" | "coffee" | "food" | "drink" | "dessert" | "other";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold"
      style={
        active
          ? { background: OX.yellow, color: OX.ink }
          : {
              background: OX.card,
              color: "#fff",
              border: `1px solid ${OX.line}`,
            }
      }
    >
      <CatGlyph kind={kind} />
      {children}
    </button>
  );
}

function CatGlyph({
  kind,
}: {
  kind: "all" | "coffee" | "food" | "drink" | "dessert" | "other";
}) {
  const common = "h-3.5 w-3.5";
  if (kind === "all") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
      </svg>
    );
  }
  if (kind === "coffee") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 19h12a4 4 0 0 0 0-8h-1V7H4v12zm14-6a2 2 0 1 1 0 4h-1v-4h1zM7 3h2v2H7V3zm3 1h2v2h-2V4zm3-1h2v2h-2V3z" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8 2 5 6 5 10c0 5 4 8 7 11 3-3 7-6 7-11 0-4-3-8-7-8zm0 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      </svg>
    );
  }
  if (kind === "drink") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2h10l-1 3H8L7 2zm1 5h8l1.5 13H6.5L8 7z" />
      </svg>
    );
  }
  if (kind === "dessert") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-3 0-5 2-5 5 0 1 .3 2 .8 3H5l1 10h12l1-10h-2.8c.5-1 .8-2 .8-3 0-3-2-5-5-5z" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
    </svg>
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
      className="flex h-9 w-9 items-center justify-center text-base font-bold text-white"
    >
      {children}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 7a3 3 0 0 1 3-3h12a2 2 0 0 1 2 2v1H6a1 1 0 0 0 0 2h14v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7zm14 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zm0 3h18v2H3V9z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

function HoldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 3h9l3 3v15H6V3zm2 4v2h8V7H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z" />
    </svg>
  );
}

function PosOptionSheet({
  product,
  locale,
  currency,
  onCancel,
  onConfirm,
}: {
  product: CatalogProduct;
  locale: Locale;
  currency: string;
  onCancel: () => void;
  onConfirm: (sel: OptionSelection[]) => void;
}) {
  const groups = product.optionGroups || [];
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      if (g.values[0]) init[g.id] = g.values[0].id;
    }
    return init;
  });
  const selections = Object.entries(sel).map(([groupId, valueId]) => ({
    groupId,
    valueId,
  }));
  const raw = product.rawPrice ?? product.price;
  const stub = {
    id: product.id,
    categoryId: product.categoryId || "",
    name: product.name,
    price: raw,
    image: product.image,
    available: true,
    featured: false,
    sortOrder: 0,
    optionGroups: groups,
  };
  const pricing = priceAfterDiscount(
    configuredBasePrice(stub, selections),
    product.discount || null
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <button type="button" className="absolute inset-0" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-md rounded-t-3xl p-4 sm:rounded-2xl"
        style={{ background: OX.panel }}
      >
        <h2 className="text-lg font-bold text-white">
          {pickLocalized(locale, product.name, product.nameEn)}
        </h2>
        {groups.map((g) => (
          <div key={g.id} className="mt-3">
            <p className="mb-1 text-xs" style={{ color: OX.muted }}>
              {pickLocalized(locale, g.name, g.nameEn)}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const active = sel[g.id] === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSel((s) => ({ ...s, [g.id]: v.id }))}
                    className="min-h-11 rounded-full px-3 text-sm font-semibold"
                    style={
                      active
                        ? { background: OX.yellow, color: OX.ink }
                        : {
                            border: `1px solid ${OX.line}`,
                            color: "#fff",
                          }
                    }
                  >
                    {pickLocalized(locale, v.name, v.nameEn)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg font-bold" style={{ color: OX.yellow }}>
            {formatPrice(pricing.final, currency, locale)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-xl border px-4 text-sm text-white"
              style={{ borderColor: OX.line }}
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selections)}
              className="min-h-11 rounded-xl px-4 text-sm font-bold"
              style={{ background: OX.yellow, color: OX.ink }}
            >
              {locale === "ar" ? "أضف" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
