"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProductDTO } from "@/lib/types";

export interface CartItem {
  product: ProductDTO;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalCents: number;
  loaded: boolean;
  add: (product: ProductDTO, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "cart";

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it) => it && it.product && typeof it.product.id === "string",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    setItems(readStorage());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento no disponible; ignorar
    }
  }, [items, loaded]);

  const add = useCallback((product: ProductDTO, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      const cap = product.stock > 0 ? product.stock : 99;
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id
            ? { ...it, quantity: Math.min(cap, Math.max(1, it.quantity + quantity)) }
            : it,
        );
      }
      return [
        ...prev,
        { product, quantity: Math.min(cap, Math.max(1, quantity)) },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.product.id !== productId) return it;
        const cap = it.product.stock > 0 ? it.product.stock : 99;
        return { ...it, quantity: Math.min(cap, Math.max(1, quantity)) };
      }),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((acc, it) => acc + it.quantity, 0),
    [items],
  );
  const totalCents = useMemo(
    () => items.reduce((acc, it) => acc + it.product.priceCents * it.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, count, totalCents, loaded, add, setQuantity, remove, clear }),
    [items, count, totalCents, loaded, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}