"use client";

import type { OrderStatus } from "./orders";

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
  delivery: "retiro" | "domicilio";
  itemCount: number;
  status: OrderStatus;
}

const STORAGE_KEY = "jecsitoshop:orders";
const LEGACY_KEY = "jecsitoshop:last-order";
const MAX_STORED = 50;

const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "in_transit",
  "delivered",
  "cancelled",
];

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
    delivery: v.delivery === "domicilio" ? "domicilio" : "retiro",
    itemCount: typeof v.itemCount === "number" ? v.itemCount : 0,
    status:
      v.status && ORDER_STATUSES.includes(v.status) ? v.status : "new",
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

function persist(orders: StoredOrder[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // localStorage puede no estar disponible; se ignora.
  }
  window.dispatchEvent(new Event(MY_ORDER_EVENT));
}

export function saveMyOrder(order: {
  id: string;
  number: number;
  totalCents?: number;
  payment?: "efectivo" | "transferencia";
  delivery?: "retiro" | "domicilio";
  itemCount?: number;
  status?: OrderStatus;
}): void {
  if (typeof window === "undefined") return;
  const entry: StoredOrder = {
    id: order.id,
    number: order.number,
    createdAt: new Date().toISOString(),
    totalCents: order.totalCents ?? 0,
    payment: order.payment ?? "efectivo",
    delivery: order.delivery ?? "retiro",
    itemCount: order.itemCount ?? 0,
    status: order.status ?? "new",
  };
  const next = [entry, ...readMyOrders().filter((o) => o.id !== entry.id)].slice(
    0,
    MAX_STORED,
  );
  persist(next);
}

/** Actualiza el estado guardado de un pedido (tras consultar o cancelar). */
export function updateMyOrderStatus(id: string, status: OrderStatus): void {
  if (typeof window === "undefined") return;
  const current = readMyOrders();
  let changed = false;
  const next = current.map((o) => {
    if (o.id === id && o.status !== status) {
      changed = true;
      return { ...o, status };
    }
    return o;
  });
  if (changed) persist(next);
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
