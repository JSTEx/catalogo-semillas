"use client";

/**
 * Guarda el ultimo pedido del cliente en el propio dispositivo (localStorage)
 * para que pueda volver a ver su estado sin necesidad de iniciar sesion.
 */
export interface StoredOrder {
  id: string;
  number: number;
  createdAt: string;
}

const STORAGE_KEY = "jecsitoshop:last-order";

/** Evento que se dispara cuando cambia el pedido guardado (misma pestana). */
export const MY_ORDER_EVENT = "jecsitoshop:my-order";

export function saveMyOrder(order: { id: string; number: number }): void {
  if (typeof window === "undefined") return;
  try {
    const value: StoredOrder = {
      id: order.id,
      number: order.number,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage puede no estar disponible (modo privado); se ignora.
  }
  window.dispatchEvent(new Event(MY_ORDER_EVENT));
}

export function readMyOrder(): StoredOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOrder>;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.number !== "number") {
      return null;
    }
    return {
      id: parsed.id,
      number: parsed.number,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
    };
  } catch {
    return null;
  }
}

export function clearMyOrder(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
  window.dispatchEvent(new Event(MY_ORDER_EVENT));
}
