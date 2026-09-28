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
  name: string;
  nameEn?: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
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
    );
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
        const totalQty =
          prev.reduce((s, l) => s + l.qty, 0) +
          (prev.some((l) => l.itemId === item.itemId) ? 0 : qty);
        const existing = prev.find((l) => l.itemId === item.itemId);
        if (existing) {
          const nextQty = existing.qty + qty;
          const without = prev.reduce((s, l) => s + l.qty, 0) - existing.qty;
          if (without + nextQty > maxItems) return prev;
          return prev.map((l) =>
            l.itemId === item.itemId ? { ...l, qty: nextQty } : l
          );
        }
        if (totalQty > maxItems) return prev;
        return [...prev, { ...item, qty }];
      });
      setOpen(true);
    },
    [maxItems]
  );

  const setQty = useCallback((itemId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.itemId !== itemId);
      return prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l));
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
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
