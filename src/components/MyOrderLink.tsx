"use client";

import { useEffect, useState } from "react";
import { MY_ORDER_EVENT, readMyOrder, type StoredOrder } from "@/lib/my-order";
import { orderTrackingPath } from "@/lib/orders";

/**
 * Acceso persistente al ultimo pedido del cliente (guardado en el dispositivo).
 * No requiere iniciar sesion.
 */
export default function MyOrderLink({ className }: { className?: string }) {
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    const sync = () => setOrder(readMyOrder());
    sync();
    window.addEventListener(MY_ORDER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MY_ORDER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!order) return null;

  return (
    <a
      href={orderTrackingPath(order.id)}
      title={`Ver el estado del pedido N° ${order.number}`}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
        className ?? "",
      ].join(" ")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M3 8 12 3l9 5v8l-9 5-9-5Z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </svg>
      <span className="hidden sm:inline">Mi pedido N° {order.number}</span>
      <span className="sm:hidden">Mi pedido</span>
    </a>
  );
}
