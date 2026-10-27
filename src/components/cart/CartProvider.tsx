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
import { isOrderable } from "@/lib/orders";

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
  /** Actualiza los datos de los productos del carrito con el catalogo actual. */
  sync: (catalog: ProductDTO[]) => void;
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

  /**
   * Reconcilia el carrito con el catalogo vigente: actualiza precios, stock e
   * imagenes, y quita productos que ya no existen o no se pueden pedir.
   */
  const sync = useCallback((catalog: ProductDTO[]) => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    setItems((prev) => {
      let changed = false;
      const next: CartItem[] = [];
      for (const it of prev) {
        const latest = byId.get(it.product.id);
        if (!latest || !isOrderable(latest)) {
          changed = true;
          continue;
        }
        const quantity = Math.min(it.quantity, latest.stock);
        if (quantity < 1) {
          changed = true;
          continue;
        }
        if (quantity !== it.quantity || latest.updatedAt !== it.product.updatedAt) {
          changed = true;
        }
        next.push({
          product:
            latest.updatedAt !== it.product.updatedAt ? latest : it.product,
          quantity,
        });
      }
      return changed ? next : prev;
    });
  }, []);

  const count = useMemo(
    () => items.reduce((acc, it) => acc + it.quantity, 0),
    [items],
  );

  // Al volver a la pestana, refresca precios/existencias desde el catalogo.
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { products?: ProductDTO[] };
        if (active && Array.isArray(data.products)) sync(data.products);
      } catch {
        // sin conexion: se conserva el carrito actual
      }
    }
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [sync]);
  const totalCents = useMemo(
    () => items.reduce((acc, it) => acc + it.product.priceCents * it.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      count,
      totalCents,
      loaded,
      add,
      setQuantity,
      remove,
      clear,
      sync,
    }),
    [items, count, totalCents, loaded, add, setQuantity, remove, clear, sync],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}