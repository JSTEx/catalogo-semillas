"use client";

import { useEffect, useState } from "react";
import { MY_ORDER_EVENT, readMyOrders, type StoredOrder } from "@/lib/my-order";
import { orderTrackingPath, PAYMENT_META } from "@/lib/orders";
import { formatMoney } from "@/lib/money";

const INITIAL_VISIBLE = 10;

export default function MisPedidos() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    const sync = () => {
      setOrders(readMyOrders());
      setLoaded(true);
    };
    sync();
    window.addEventListener(MY_ORDER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MY_ORDER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const shown = orders.slice(0, visible);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300"
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
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Volver al catalogo
          </a>
          <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Mis pedidos
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!loaded ? null : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/50">
            <p className="text-base font-semibold text-stone-700 dark:text-stone-200">
              Aun no tienes pedidos guardados
            </p>
            <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
              Los pedidos que hagas desde este dispositivo apareceran aqui para
              que puedas seguir su estado.
            </p>
            <a
              href="/"
              className="mt-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Ir al catalogo
            </a>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {shown.map((order) => {
                const date = order.createdAt
                  ? new Date(order.createdAt).toLocaleString("es", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Pedido N° {order.number}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {date}
                        {order.totalCents > 0
                          ? ` · ${formatMoney(order.totalCents)}`
                          : ""}
                        {" · "}
                        {PAYMENT_META[order.payment].label}
                      </p>
                    </div>
                    <a
                      href={orderTrackingPath(order.id)}
                      className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                    >
                      Ver estado
                    </a>
                  </li>
                );
              })}
            </ul>

            {orders.length > visible && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + INITIAL_VISIBLE)}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Ver mas pedidos ({orders.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
