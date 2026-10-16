"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MY_ORDER_EVENT,
  clearMyOrders,
  isActiveOrder,
  readMyOrders,
  reconcileMyOrders,
  removeMyOrder,
  type StoredOrder,
} from "@/lib/my-order";
import {
  orderTrackingPath,
  PAYMENT_META,
  DELIVERY_META,
  ORDER_STATUS_META,
  formatDateTime,
  type OrderStatus,
} from "@/lib/orders";
import { formatMoney } from "@/lib/money";

const INITIAL_VISIBLE = 10;

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.active,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {meta.label}
    </span>
  );
}

function OrderCard({
  order,
  status,
  onRemove,
}: {
  order: StoredOrder;
  status: OrderStatus;
  onRemove: (id: string) => void;
}) {
  const date = order.createdAt ? formatDateTime(order.createdAt, "short") : "";
  const final = status === "delivered" || status === "cancelled";

  return (
    <li
      className={[
        "rounded-3xl border border-stone-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-colors dark:border-stone-800/70 dark:bg-stone-900/70",
        final ? "opacity-90" : "hover:border-brand-200 dark:hover:border-brand-500/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Pedido N° {order.number}
          </p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {date}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
        {order.itemCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
            </svg>
            {order.itemCount} articulo{order.itemCount === 1 ? "" : "s"}
          </span>
        )}
        <span>{DELIVERY_META[order.delivery].label}</span>
        <span>{PAYMENT_META[order.payment].label}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200/70 pt-3 dark:border-stone-800/70">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Total</p>
          <p className="text-base font-bold text-stone-900 dark:text-stone-50">
            {formatMoney(order.totalCents)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRemove(order.id)}
            title="Quitar de este dispositivo"
            aria-label={`Quitar el pedido N° ${order.number} de este dispositivo`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 text-stone-400 transition-colors hover:border-red-200 hover:text-red-500 dark:border-stone-700 dark:text-stone-500 dark:hover:border-red-500/40 dark:hover:text-red-400"
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
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <a
            href={orderTrackingPath(order.id)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Ver estado
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
              <path d="m9 18 6-6-6-6" />
            </svg>
          </a>
        </div>
      </div>
    </li>
  );
}

export default function MisPedidos() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [live, setLive] = useState<Record<string, OrderStatus>>({});

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

  const idsKey = orders.map((o) => o.id).join(",");

  useEffect(() => {
    if (!idsKey) return;
    let active = true;
    const pull = async () => {
      try {
        const res = await fetch(`/api/orders/status?ids=${idsKey}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          statuses?: Record<string, OrderStatus>;
        };
        if (!active || !data?.statuses) return;
        setLive(data.statuses);
        // Los pedidos que ya no existen (borrados desde el admin) se quitan del
        // historial local, para que el conteo coincida con la realidad.
        reconcileMyOrders(data.statuses);
      } catch {
        // silencio: se mantiene el estado guardado
      }
    };
    pull();
    const onFocus = () => {
      if (document.visibilityState === "visible") pull();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [idsKey]);

  const statusOf = useCallback(
    (order: StoredOrder) => live[order.id] ?? order.status,
    [live],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const order = orders.find((o) => o.id === id);
      const label = order ? `el pedido N° ${order.number}` : "este pedido";
      if (
        window.confirm(
          `Se quitara ${label} de este dispositivo. ¿Quieres continuar?`,
        )
      ) {
        removeMyOrder(id);
      }
    },
    [orders],
  );

  const activeOrders = orders.filter((o) => isActiveOrder(statusOf(o)));
  const pastOrders = orders.filter((o) => !isActiveOrder(statusOf(o)));
  const activeShown = activeOrders.slice(0, visible);
  const pastShown = pastOrders.slice(0, Math.max(visible - activeOrders.length, 0));
  const hiddenCount = orders.length - activeShown.length - pastShown.length;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
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
            <span className="hidden sm:inline">Volver al catalogo</span>
            <span className="sm:hidden">Catalogo</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-500 shadow-sm">
              <Image
                src="/logo.png"
                alt=""
                width={146}
                height={96}
                aria-hidden="true"
                className="h-4 w-auto"
              />
            </span>
            <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Mis pedidos
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!loaded ? null : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <p className="text-base font-semibold text-stone-700 dark:text-stone-200">
              Aun no tienes pedidos guardados
            </p>
            <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
              Los pedidos que hagas desde este dispositivo apareceran aqui para
              que puedas seguir su estado.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Ir al catalogo
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-stone-200/70 bg-stone-50/70 px-4 py-3 text-xs text-stone-500 dark:border-stone-800/70 dark:bg-stone-900/50 dark:text-stone-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p>
                Estos pedidos se guardan en este dispositivo. Para verlos en otro,
                abre el enlace de seguimiento que te compartimos al confirmar tu
                pedido.
              </p>
            </div>

            {activeOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  En curso
                </h2>
                <ul className="flex flex-col gap-3">
                  {activeShown.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      status={statusOf(order)}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </section>
            )}

            {pastShown.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Historial
                </h2>
                <ul className="flex flex-col gap-3">
                  {pastShown.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      status={statusOf(order)}
                      onRemove={handleRemove}
                    />
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-5 flex flex-col items-center gap-3">
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + INITIAL_VISIBLE)}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Ver mas pedidos ({hiddenCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Se quitaran todos los pedidos guardados en este dispositivo. ¿Continuar?",
                    )
                  ) {
                    clearMyOrders();
                  }
                }}
                className="text-xs font-medium text-stone-400 underline-offset-2 transition-colors hover:text-red-500 hover:underline dark:text-stone-500 dark:hover:text-red-400"
              >
                Vaciar historial de este dispositivo
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
