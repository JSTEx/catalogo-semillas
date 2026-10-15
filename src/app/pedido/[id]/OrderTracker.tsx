"use client";

import { useEffect, useState } from "react";
import type { PublicOrderDTO } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_META,
  ORDER_STATUS_FLOW,
  orderStatusStep,
  businessWhatsAppLink,
  DELIVERY_META,
} from "@/lib/orders";
import SeedImage from "@/components/SeedImage";

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export default function OrderTracker({
  initial,
}: {
  initial: PublicOrderDTO;
}) {
  const [order, setOrder] = useState<PublicOrderDTO>(initial);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let active = true;
    async function pull() {
      try {
        const res = await fetch(`/api/orders/${initial.id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { order?: PublicOrderDTO };
        if (active && data?.order) {
          setOrder(data.order);
          setLive(true);
        }
      } catch {
        if (active) setLive(false);
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") pull();
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [initial.id]);

  const meta = ORDER_STATUS_META[order.status];
  const step = orderStatusStep(order.status);
  const cancelled = order.status === "cancelled";
  const waText = `Hola! Consulto por mi pedido N° ${order.number}.`;

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Estado del pedido
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pedido N° {order.number}
            </h1>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
            <span className={["h-2.5 w-2.5 rounded-full", meta.dot].join(" ")} />
            {meta.label}
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <span
            className={[
              "h-2 w-2 rounded-full",
              live ? "animate-pulse bg-emerald-500" : "bg-stone-400",
            ].join(" ")}
          />
          {live
            ? "Se actualiza solo, no necesitas recargar"
            : "Sin conexion: recarga la pagina"}
        </p>
      </header>

      {cancelled ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
          <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300">
            Pedido cancelado
          </h2>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300/80">
            Si tienes dudas, escribenos por WhatsApp.
          </p>
        </div>
      ) : (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Progreso
          </h2>
          <ol className="relative space-y-5 pl-8">
            <span className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-stone-200 dark:bg-stone-700" />
            {ORDER_STATUS_FLOW.map((s, i) => {
              const reached = step >= i;
              const current = order.status === s;
              return (
                <li key={s} className="relative">
                  <span
                    className={[
                      "absolute -left-8 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2",
                      reached
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
                    ].join(" ")}
                  >
                    {reached && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <p
                    className={[
                      "text-sm font-semibold",
                      reached
                        ? "text-stone-800 dark:text-stone-100"
                        : "text-stone-400 dark:text-stone-500",
                    ].join(" ")}
                  >
                    {ORDER_STATUS_META[s].label}
                  </p>
                  {current && (
                    <p className="text-xs text-brand-600 dark:text-brand-400">
                      El pedido esta aqui ahora
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Tu pedido
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((it) => (
            <li key={it.productId} className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                <SeedImage
                  src={it.imageUrl}
                  alt={it.name}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                  {it.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {it.quantity} x {formatMoney(it.priceCents)}
                </p>
              </div>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                {formatMoney(it.priceCents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-stone-200/70 pt-4 text-sm dark:border-stone-800/70">
          <div className="flex justify-between">
            <dt className="text-stone-500 dark:text-stone-400">Subtotal</dt>
            <dd className="font-medium text-stone-700 dark:text-stone-200">
              {formatMoney(order.productsTotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500 dark:text-stone-400">Envio</dt>
            <dd className="font-medium text-stone-700 dark:text-stone-200">
              {order.shippingCents > 0
                ? formatMoney(order.shippingCents)
                : order.delivery === "domicilio"
                  ? "Por confirmar"
                  : "Sin costo"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-stone-200/70 pt-2 text-base dark:border-stone-800/70">
            <dt className="font-semibold text-stone-800 dark:text-stone-100">
              Total
            </dt>
            <dd className="font-bold text-stone-900 dark:text-stone-50">
              {formatMoney(order.totalCents)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
          Entrega: {DELIVERY_META[order.delivery].label}
        </p>
      </section>

      {order.payment === "transferencia" &&
        order.status !== "delivered" &&
        order.status !== "cancelled" && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Pago por transferencia
            </h2>
            <p className="mt-1 text-amber-700 dark:text-amber-300/90">
              Aun no confirmamos tu pago. Envia el comprobante de transferencia
              por WhatsApp para agilizar la entrega.
            </p>
          </section>
        )}

      <div className="flex flex-col gap-2">
        {order.payment === "transferencia" && order.status !== "cancelled" && (
          <a
            href={businessWhatsAppLink(
              `Hola! Adjunto el comprobante de transferencia de mi pedido N° ${order.number}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <WhatsAppIcon />
            Enviar comprobante de pago
          </a>
        )}
        <a
          href={businessWhatsAppLink(waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
        >
          <WhatsAppIcon />
          Escribir por WhatsApp
        </a>
        <a
          href="/mis-pedidos"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Ver mis pedidos
        </a>
        <a
          href="/"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Volver al catalogo
        </a>
      </div>
    </div>
  );
}
