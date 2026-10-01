"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  itemId: string;
  lineKey: string;
  name: string;
  nameEn?: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
  options?: { groupId: string; valueId: string }[];
  prep?: string[];
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (lineKey: string, qty: number) => void;
  removeItem: (lineKey: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "obelix_menu_cart_v1";

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) =>
        l &&
        typeof l.itemId === "string" &&
        typeof l.name === "string" &&
        Number(l.unitPrice) >= 0 &&
        Number(l.qty) > 0
    ).map((l) => ({
      ...l,
      lineKey: l.lineKey || l.itemId,
    }));
  } catch {
    return [];
  }
}

export function CartProvider({
  children,
  maxItems = 50,
}: {
  children: ReactNode;
  maxItems?: number;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStoredLines());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota */
    }
  }, [lines, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartLine, "qty">, qty = 1) => {
      setLines((prev) => {
        const key = item.lineKey || item.itemId;
        const existing = prev.find((l) => l.lineKey === key);
        const totalQty =
          prev.reduce((s, l) => s + l.qty, 0) + (existing ? 0 : qty);
        if (existing) {
          const nextQty = existing.qty + qty;
          const without = prev.reduce((s, l) => s + l.qty, 0) - existing.qty;
          if (without + nextQty > maxItems) return prev;
          return prev.map((l) =>
            l.lineKey === key ? { ...l, qty: nextQty } : l
          );
        }
        if (totalQty > maxItems) return prev;
        return [...prev, { ...item, lineKey: key, qty }];
      });
      setOpen(true);
    },
    [maxItems]
  );

  const setQty = useCallback((lineKey: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.lineKey !== lineKey);
      return prev.map((l) => (l.lineKey === lineKey ? { ...l, qty } : l));
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setLines((prev) => prev.filter((l) => l.lineKey !== lineKey));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotal = useMemo(
    () =>
      Math.round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) * 100) /
      100,
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      addItem,
      setQty,
      removeItem,
      clear,
      open,
      setOpen,
    }),
    [lines, count, subtotal, addItem, setQty, removeItem, clear, open]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
