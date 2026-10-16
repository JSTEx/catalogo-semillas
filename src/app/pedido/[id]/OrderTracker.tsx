"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { PublicOrderDTO } from "@/lib/types";
import type { OrderStatus } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_META,
  ORDER_STATUS_FLOW,
  orderStatusStep,
  businessWhatsAppLink,
  orderTrackingUrl,
  formatDateTime,
  DELIVERY_META,
  PAYMENT_META,
} from "@/lib/orders";
import { updateMyOrderStatus } from "@/lib/my-order";
import SeedImage from "@/components/SeedImage";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

const HERO: Record<OrderStatus, { emoji: string; bg: string; line: string }> = {
  new: {
    emoji: "🧾",
    bg: "border-sky-200 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent dark:border-sky-500/30",
    line: "Recibimos tu pedido. Te confirmaremos en breve.",
  },
  confirmed: {
    emoji: "✅",
    bg: "border-amber-200 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent dark:border-amber-500/30",
    line: "Tu pedido esta confirmado. Lo estamos preparando.",
  },
  in_transit: {
    emoji: "🚚",
    bg: "border-violet-200 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent dark:border-violet-500/30",
    line: "Tu pedido va en camino.",
  },
  delivered: {
    emoji: "🎉",
    bg: "border-emerald-200 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent dark:border-emerald-500/30",
    line: "Tu pedido fue entregado. Gracias por tu compra.",
  },
  cancelled: {
    emoji: "⚠️",
    bg: "border-rose-200 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent dark:border-rose-500/30",
    line: "Este pedido fue cancelado. Si fue un error, escribenos por WhatsApp.",
  },
};

const STEP_DESC: Record<OrderStatus, string> = {
  new: "Recibimos tu pedido",
  confirmed: "Confirmado y en preparacion",
  in_transit: "En camino hacia ti",
  delivered: "Entregado",
  cancelled: "",
};

function InfoCard({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900",
        className ?? "",
      ].join(" ")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-stone-800 dark:text-stone-100">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function OrderTracker({
  initial,
}: {
  initial: PublicOrderDTO;
}) {
  const [order, setOrder] = useState<PublicOrderDTO>(initial);
  const [live, setLive] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPhone, setCancelPhone] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

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
          updateMyOrderStatus(data.order.id, data.order.status);
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
  const hero = HERO[order.status];
  const step = orderStatusStep(order.status);
  const cancelled = order.status === "cancelled";
  const canUploadReceipt =
    order.payment === "transferencia" &&
    !cancelled &&
    order.status !== "delivered";
  const waText = `Hola! Consulto por mi pedido N° ${order.number}.`;

  const created = order.createdAt ? formatDateTime(order.createdAt, "long") : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(orderTrackingUrl(order.id));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard no disponible
    }
  }

  async function confirmCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cancelPhone }),
      });
      const data = (await res.json().catch(() => null)) as
        | { order?: PublicOrderDTO; error?: string }
        | null;
      if (!res.ok || !data?.order) {
        setCancelError(data?.error ?? "No se pudo cancelar el pedido");
        return;
      }
      setOrder(data.order);
      updateMyOrderStatus(order.id, "cancelled");
      setCancelOpen(false);
      setCancelPhone("");
    } catch {
      setCancelError("No se pudo cancelar el pedido");
    } finally {
      setCancelling(false);
    }
  }

  async function uploadReceipt(file: File) {
    setReceiptError(null);
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orders/${order.id}/receipt`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | { order?: PublicOrderDTO; error?: string }
        | null;
      if (!res.ok || !data?.order) {
        throw new Error(data?.error ?? "No se pudo subir el comprobante");
      }
      setOrder(data.order);
      updateMyOrderStatus(data.order.id, data.order.status);
    } catch (e) {
      setReceiptError(
        e instanceof Error ? e.message : "No se pudo subir el comprobante",
      );
    } finally {
      setUploadingReceipt(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className={["rounded-3xl border p-6 shadow-sm", hero.bg].join(" ")}>
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm dark:bg-stone-900/80">
            {hero.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={["h-2.5 w-2.5 rounded-full", meta.dot].join(" ")} />
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                {meta.label}
              </h1>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-stone-600 dark:text-stone-300">
              Pedido N° {order.number}
            </p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {hero.line}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            title="Copiar enlace de seguimiento"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {copied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
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
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
            <span>{copied ? "Copiado" : "Copiar enlace"}</span>
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard
          label="Pago"
          value={PAYMENT_META[order.payment].label}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          }
        />
        <InfoCard
          label="Entrega"
          value={DELIVERY_META[order.delivery].label}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2" />
              <path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
          }
        />
        {created && (
          <InfoCard
            label="Fecha del pedido"
            value={created}
            className="sm:col-span-2"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
              </svg>
            }
          />
        )}
      </section>

      {!cancelled && (
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
                  <p
                    className={[
                      "text-xs",
                      current
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-stone-400 dark:text-stone-500",
                    ].join(" ")}
                  >
                    {STEP_DESC[s]}
                    {current ? " · el pedido esta aqui ahora" : ""}
                  </p>
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
      </section>

      {order.payment === "transferencia" && !cancelled && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-900 dark:text-amber-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
            Pago por transferencia
          </h2>
          {order.receiptUrl ? (
            <>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
                {order.status === "delivered"
                  ? "Gracias por tu pago. Comprobante registrado."
                  : "Ya subiste el comprobante. Te avisaremos cuando lo confirmemos."}
              </p>
              <a
                href={order.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-3 rounded-2xl border border-amber-300 bg-white/80 p-2 pr-4 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:bg-white dark:border-amber-400/40 dark:bg-stone-900/60 dark:text-amber-200 dark:hover:bg-stone-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.receiptUrl}
                  alt="Comprobante de pago"
                  className="h-14 w-14 rounded-xl object-cover"
                />
                Ver comprobante subido
              </a>
            </>
          ) : (
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
              {order.status === "delivered"
                ? "Gracias por tu pago."
                : "Sube el comprobante de transferencia aquí para agilizar la entrega."}
            </p>
          )}

          {canUploadReceipt && (
            <div className="mt-3">
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingReceipt}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadReceipt(file);
                }}
              />
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                disabled={uploadingReceipt}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white/80 px-4 py-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-white disabled:opacity-60 dark:border-amber-500/30 dark:bg-stone-900/60 dark:text-amber-300 dark:hover:bg-stone-900"
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
                  <path d="M12 3v12" />
                  <path d="m7 8 5-5 5 5" />
                  <path d="M5 21h14" />
                </svg>
                {uploadingReceipt
                  ? "Subiendo..."
                  : order.receiptUrl
                    ? "Cambiar comprobante"
                    : "Subir comprobante"}
              </button>
              {receiptError && (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {receiptError}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <a
          href={businessWhatsAppLink(waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
        >
          <WhatsAppIcon />
          Escribir por WhatsApp
        </a>
        {order.status === "new" && (
          <button
            type="button"
            onClick={() => {
              setCancelError(null);
              setCancelOpen(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Cancelar pedido
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/mis-pedidos"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Volver al catalogo
          </Link>
        </div>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Cancelar pedido N° {order.number}
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Esta accion no se puede deshacer. Para confirmar, escribe el
              telefono con el que hiciste el pedido.
            </p>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-label="Telefono del pedido"
              value={cancelPhone}
              onChange={(e) => setCancelPhone(e.target.value)}
              placeholder="Ej. 7000 0000"
              className="mt-4 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
            {cancelError && (
              <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                {cancelError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelling || cancelPhone.trim().length < 7}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {cancelling ? "Cancelando..." : "Si, cancelar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
