"use client";

/**
 * Guarda los pedidos del cliente en el propio dispositivo (localStorage) para
 * que pueda revisarlos sin iniciar sesion.
 */
export interface StoredOrder {
  id: string;
  number: number;
  createdAt: string;
  totalCents: number;
  payment: "efectivo" | "transferencia";
}

const STORAGE_KEY = "jecsitoshop:orders";
const LEGACY_KEY = "jecsitoshop:last-order";
const MAX_STORED = 50;

/** Evento que se dispara cuando cambia el historial (misma pestana). */
export const MY_ORDER_EVENT = "jecsitoshop:my-order";

function normalize(value: unknown): StoredOrder | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<StoredOrder>;
  if (typeof v.id !== "string" || typeof v.number !== "number") return null;
  return {
    id: v.id,
    number: v.number,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : "",
    totalCents: typeof v.totalCents === "number" ? v.totalCents : 0,
    payment: v.payment === "transferencia" ? "transferencia" : "efectivo",
  };
}

export function readMyOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalize).filter((o): o is StoredOrder => o !== null);
      }
    }
    // Compatibilidad con la version anterior (un solo pedido guardado).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const single = normalize(JSON.parse(legacy));
      if (single) return [single];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveMyOrder(order: {
  id: string;
  number: number;
  totalCents?: number;
  payment?: "efectivo" | "transferencia";
}): void {
  if (typeof window === "undefined") return;
  try {
    const entry: StoredOrder = {
      id: order.id,
      number: order.number,
      createdAt: new Date().toISOString(),
      totalCents: order.totalCents ?? 0,
      payment: order.payment ?? "efectivo",
    };
    const next = [
      entry,
      ...readMyOrders().filter((o) => o.id !== entry.id),
    ].slice(0, MAX_STORED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // localStorage puede no estar disponible; se ignora.
  }
  window.dispatchEvent(new Event(MY_ORDER_EVENT));
}

export function clearMyOrders(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignorar
  }
  window.dispatchEvent(new Event(MY_ORDER_EVENT));
}
