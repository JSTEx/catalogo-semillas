"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import type { OrderDTO } from "@/lib/types";
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  PAYMENT_META,
  DELIVERY_META,
  notifyCustomerWhatsAppLink,
  orderTrackingUrl,
  formatDateTime,
  type OrderStatus,
} from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { normalizeSearch } from "@/lib/search";
import { useViewMode } from "@/lib/use-view-mode";
import { useBackdropClose } from "@/lib/use-backdrop-close";
import ViewToggle from "@/components/ViewToggle";

interface Props {
  orders: OrderDTO[];
  onOrdersChange: Dispatch<SetStateAction<OrderDTO[]>>;
}

const LAYOUT: Record<string, string> = {
  grid: "grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2",
  compact: "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3",
  list: "flex flex-col gap-2",
};

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

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white",
        ORDER_STATUS_META[status].active,
      ].join(" ")}
    >
      {ORDER_STATUS_META[status].short}
    </span>
  );
}

export default function AdminOrders({ orders, onOrdersChange }: Props) {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shippingDraft, setShippingDraft] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [view, setView] = useViewMode("admin-orders-view", "grid");
  const [openId, setOpenId] = useState<string | null>(null);
  const confirm = useConfirm();
  const backdrop = useBackdropClose(() => setOpenId(null));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return orders.filter((o) => {
      const inFilter = filter === "all" || o.status === filter;
      if (!inFilter) return false;
      if (q === "") return true;
      return (
        String(o.number).includes(q) ||
        normalizeSearch(o.customerName).includes(q) ||
        normalizeSearch(o.customerPhone).includes(q) ||
        o.items.some((it) => normalizeSearch(it.name).includes(q))
      );
    });
  }, [orders, filter, query]);

  const active = useMemo(
    () => orders.find((o) => o.id === openId) ?? null,
    [orders, openId],
  );

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { order?: OrderDTO; error?: string }
        | null;
      if (!res.ok || !data?.order) {
        throw new Error(data?.error ?? "No se pudo actualizar");
      }
      const updated = data.order;
      onOrdersChange((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, number: number) {
    const ok = await confirm({
      title: "Eliminar pedido",
      message: `¿Eliminar el pedido N° ${number}?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo eliminar");
      }
      onOrdersChange((prev) => prev.filter((o) => o.id !== id));
      setOpenId((prev) => (prev === id ? null : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  function saveShipping(order: OrderDTO) {
    const raw = shippingDraft[order.id];
    if (raw === undefined) return;
    const cents = Math.max(0, Math.round((parseFloat(raw) || 0) * 100));
    if (cents === order.shippingCents) return;
    patch(order.id, { shippingCents: cents });
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(orderTrackingUrl(id));
      setCopiedId(id);
      window.setTimeout(
        () => setCopiedId((c) => (c === id ? null : c)),
        1600,
      );
    } catch {
      setError("No se pudo copiar el enlace");
    }
  }

  async function uploadReceipt(order: OrderDTO, file: File) {
    setError(null);
    setBusyId(order.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = (await upRes.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!upRes.ok || !upData?.url) {
        throw new Error(upData?.error ?? "No se pudo subir el comprobante");
      }
      await patch(order.id, { receiptUrl: upData.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir el comprobante");
      setBusyId(null);
    }
  }

  function renderSummary(order: OrderDTO) {
    const date = formatDateTime(order.createdAt, "short");
    const units = order.items.reduce((sum, it) => sum + it.quantity, 0);
    const superCompact = view === "compact";

    if (superCompact) {
      return (
        <article
          key={order.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:rounded-2xl sm:p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
              Pedido N° {order.number}
            </p>
            <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
              {date}
            </p>
          </div>
          <StatusBadge status={order.status} />

          <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-xl bg-stone-50/80 px-2.5 py-2 dark:bg-stone-800/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-600 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700">
              {order.customerName.slice(0, 1).toUpperCase()}
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-stone-800 dark:text-stone-100">
              {order.customerName}
            </p>
            <span className="ml-auto shrink-0 text-[11px] text-stone-500 dark:text-stone-400">
              {units} {units === 1 ? "unidad" : "unidades"}
            </span>
          </div>

          <div className="col-span-2 flex items-center justify-between gap-3">
            <span className="text-base font-bold text-stone-900 dark:text-stone-100">
              {formatMoney(order.totalCents)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenId(order.id)}
                className="inline-flex min-h-9 items-center justify-center rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Ver detalle
              </button>
              <a
                href={notifyCustomerWhatsAppLink(order)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contactar por WhatsApp al cliente del pedido ${order.number}`}
                title="Contactar por WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <WhatsAppIcon />
              </a>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article
        key={order.id}
        className={[
          "flex flex-col gap-2.5 rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors dark:border-stone-700 dark:bg-stone-900",
          "p-3 sm:gap-3 sm:p-5",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-bold text-stone-900 dark:text-stone-100">
                Pedido N° {order.number}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{date}</p>
          </div>
          <StatusBadge status={order.status} />
        </header>

        <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-600 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700">
            {order.customerName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-stone-800 dark:text-stone-100">
              {order.customerName}
            </p>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              {order.customerPhone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 dark:bg-stone-800">
            {DELIVERY_META[order.delivery].label}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 dark:bg-stone-800">
            {PAYMENT_META[order.payment].label}
          </span>
          {order.delivery === "domicilio" && order.address && (
            <span className="line-clamp-1 rounded-full bg-stone-100 px-2.5 py-1 dark:bg-stone-800">
              {order.address}
            </span>
          )}
          </div>

        {order.notes && (
          <p className="line-clamp-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Nota: {order.notes}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between rounded-2xl border border-stone-200/70 px-4 py-2.5 text-sm dark:border-stone-800/70">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {units} {units === 1 ? "unidad" : "unidades"}
          </span>
          <span className="text-base font-bold text-stone-900 dark:text-stone-100">
            {formatMoney(order.totalCents)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenId(order.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md"
          >
            Ver detalle
          </button>
          <a
            href={notifyCustomerWhatsAppLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            title={
              order.status === "new"
                ? "Confirmar el pedido con el cliente"
                : "Avisar del estado actual al cliente"
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <WhatsAppIcon />
          </a>
        </div>
      </article>
    );
  }

  function renderRow(order: OrderDTO) {
    const date = formatDateTime(order.createdAt, "short");
    const units = order.items.reduce((sum, it) => sum + it.quantity, 0);
    return (
      <article
        key={order.id}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-stone-200/70 bg-white/70 p-3 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md sm:flex sm:gap-3 dark:border-stone-800/70 dark:bg-stone-900/70"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            Pedido N° {order.number}
          </p>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {date} · {order.customerName}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:order-last">
          <StatusBadge status={order.status} />
          <span className="shrink-0 text-sm font-bold text-stone-900 dark:text-stone-100">
            {formatMoney(order.totalCents)}
          </span>
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 sm:col-span-1 sm:flex-1 sm:flex-nowrap sm:gap-2 sm:text-xs">
          <span>{units} {units === 1 ? "unidad" : "unidades"}</span>
          <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-800">
            {DELIVERY_META[order.delivery].label}
          </span>
          <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-800">
            {PAYMENT_META[order.payment].label}
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <button
            type="button"
            onClick={() => setOpenId(order.id)}
            className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:flex-none"
          >
            Ver detalle
          </button>
          <a
            href={notifyCustomerWhatsAppLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contactar por WhatsApp al cliente del pedido ${order.number}`}
            title="Contactar por WhatsApp"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <WhatsAppIcon />
          </a>
        </div>
      </article>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por N°, nombre, telefono o producto"
            aria-label="Buscar pedidos"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-brand-500 dark:focus:ring-brand-500/30 sm:rounded-2xl sm:py-3 sm:pl-11 sm:pr-4"
          />
        </div>
        <div className="ml-auto">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1.5 sm:mb-5 sm:flex sm:flex-wrap sm:gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={[
            "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] font-medium transition-colors duration-200 sm:justify-start sm:gap-2 sm:px-3.5 sm:text-sm",
            filter === "all"
              ? "border-brand-500 bg-brand-500 text-white shadow-sm"
              : "border-stone-200 bg-white/70 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300",
          ].join(" ")}
        >
          Todos
          <span className="rounded-full bg-black/10 px-1.5 text-xs dark:bg-white/10">
            {counts.all}
          </span>
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={[
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] font-medium transition-colors duration-200 sm:justify-start sm:gap-2 sm:px-3.5 sm:text-sm",
              filter === s
                ? ORDER_STATUS_META[s].active
                : "border-stone-200 bg-white/70 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300",
            ].join(" ")}
          >
            <span className={["h-2 w-2 rounded-full", ORDER_STATUS_META[s].dot].join(" ")} />
            {ORDER_STATUS_META[s].short}
            <span className="rounded-full bg-black/10 px-1.5 text-xs dark:bg-white/10">
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div         className="rounded-2xl border border-dashed border-stone-300 bg-white py-14 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 sm:rounded-3xl sm:py-20">
          No hay pedidos en esta vista.
        </div>
      ) : (
        <div className={LAYOUT[view]}>
          {filtered.map((order) =>
            view === "list" ? renderRow(order) : renderSummary(order),
          )}
        </div>
      )}

      {active && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-sm dark:bg-black/70"
          {...backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del pedido N° ${active.number}`}
        >
          <div
            className="animate-scale-in my-4 flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold text-stone-900 dark:text-stone-50">
                  Pedido N° {active.number}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {formatDateTime(active.createdAt, "short")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={active.status} />
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  aria-label="Cerrar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
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
                </button>
              </div>
            </header>

            <div className="rounded-2xl bg-stone-50/80 px-3 py-2 text-sm dark:bg-stone-800/50">
              <p className="font-semibold text-stone-800 dark:text-stone-100">
                {active.customerName}
              </p>
              <p className="text-stone-500 dark:text-stone-400">
                {active.customerPhone}
              </p>
              {active.customerEmail && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {active.customerEmail}
                  {active.notifyEmail ? " · recibe actualizaciones por correo" : ""}
                </p>
              )}
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {DELIVERY_META[active.delivery].label}
                {active.delivery === "domicilio" && active.address
                  ? ` · ${active.address}`
                  : ""}
                {" · "}
                {PAYMENT_META[active.payment].label}
              </p>
            </div>

            <ul className="flex flex-col gap-1 text-sm">
              {active.items.map((it) => (
                <li
                  key={it.productId}
                  className="flex items-center justify-between gap-2 text-stone-600 dark:text-stone-300"
                >
                  <span className="min-w-0 truncate">
                    {it.quantity}× {it.name}
                  </span>
                  <span className="shrink-0 text-stone-500 dark:text-stone-400">
                    {formatMoney(it.priceCents * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {active.notes && (
              <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                Nota: {active.notes}
              </p>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-amber-700 dark:text-amber-300"
                  aria-hidden="true"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Comprobante de pago
                </span>
              </div>
              {active.receiptUrl ? (
                <div className="flex flex-col gap-3">
                  <a
                    href={active.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/80 p-2 pr-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-white dark:border-amber-400/40 dark:bg-stone-900/60 dark:text-stone-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={active.receiptUrl}
                      alt="Comprobante de pago"
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    Ver comprobante
                  </a>
                  <button
                    type="button"
                    onClick={() => patch(active.id, { receiptUrl: null })}
                    disabled={busyId === active.id}
                    className="self-start text-xs font-medium text-stone-500 transition-colors hover:text-red-500 disabled:opacity-50"
                  >
                    Quitar comprobante
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-stone-600 dark:text-stone-300/80">
                    Sin comprobante subido
                  </span>
                  <label className="self-start cursor-pointer rounded-2xl border border-amber-300 bg-amber-500/90 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-500">
                    Subir comprobante
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={busyId === active.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadReceipt(active, file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stone-200/60 pt-3 text-sm dark:border-stone-800/60">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 dark:text-stone-400">Envio $</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={
                    shippingDraft[active.id] ??
                    (active.shippingCents === 0
                      ? ""
                      : (active.shippingCents / 100).toFixed(2))
                  }
                  onChange={(e) =>
                    setShippingDraft((prev) => ({
                      ...prev,
                      [active.id]: e.target.value,
                    }))
                  }
                  onBlur={() => saveShipping(active)}
                  disabled={busyId === active.id}
                  placeholder="0.00"
                  aria-label="Costo de envio"
                  className="h-8 w-20 rounded-xl border border-stone-200 bg-white/80 px-2 text-sm text-stone-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200"
                />
              </div>
              <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                Total: {formatMoney(active.totalCents)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busyId === active.id || active.status === s}
                  onClick={() => patch(active.id, { status: s })}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                    active.status === s
                      ? ORDER_STATUS_META[s].active
                      : "border-stone-200 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:text-stone-300",
                  ].join(" ")}
                >
                  {ORDER_STATUS_META[s].short}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 pt-3 dark:border-stone-800/60">
              <button
                type="button"
                onClick={() => copyLink(active.id)}
                aria-label="Copiar enlace de seguimiento"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                {copiedId === active.id ? "Copiado" : "Copiar enlace"}
              </button>
              <a
                href={notifyCustomerWhatsAppLink(active)}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  active.status === "new"
                    ? "Confirmar el pedido con el cliente"
                    : `Avisar al cliente que el pedido esta "${ORDER_STATUS_META[active.status].label}"`
                }
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <WhatsAppIcon />
                {active.status === "new" ? "Confirmar" : "Avisar"}
              </a>
              <button
                type="button"
                onClick={() => remove(active.id, active.number)}
                disabled={busyId === active.id}
                aria-label="Eliminar pedido"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/15 dark:hover:text-red-300"
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
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
