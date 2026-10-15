"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { OrderDTO } from "@/lib/types";
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  PAYMENT_META,
  DELIVERY_META,
  confirmWhatsAppLink,
  statusNotifyWhatsAppLink,
  orderTrackingUrl,
  type OrderStatus,
} from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { normalizeSearch } from "@/lib/search";

interface Props {
  orders: OrderDTO[];
  onOrdersChange: Dispatch<SetStateAction<OrderDTO[]>>;
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
    </svg>
  );
}

export default function AdminOrders({ orders, onOrdersChange }: Props) {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shippingDraft, setShippingDraft] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    if (!window.confirm(`¿Eliminar el pedido N° ${number}?`)) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo eliminar");
      }
      onOrdersChange((prev) => prev.filter((o) => o.id !== id));
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

  return (
    <div>
      <div className="mb-3">
        <div className="relative w-full sm:max-w-sm">
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
            className="w-full rounded-2xl border border-stone-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-800 outline-none backdrop-blur-md transition-all duration-300 placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-300",
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
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-300",
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
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center text-sm text-stone-500 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400">
          No hay pedidos en esta vista.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((order) => {
            const date = new Date(order.createdAt).toLocaleString("es", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <article
                key={order.id}
                className="flex flex-col gap-3 rounded-3xl border border-stone-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Pedido N° {order.number}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{date}</p>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white",
                      ORDER_STATUS_META[order.status].active,
                    ].join(" ")}
                  >
                    {ORDER_STATUS_META[order.status].short}
                  </span>
                </header>

                <div className="rounded-2xl bg-stone-50/80 px-3 py-2 text-sm dark:bg-stone-800/50">
                  <p className="font-semibold text-stone-800 dark:text-stone-100">
                    {order.customerName}
                  </p>
                  <p className="text-stone-500 dark:text-stone-400">{order.customerPhone}</p>
                  {order.customerEmail && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {order.customerEmail}
                      {order.notifyEmail
                        ? " · recibe actualizaciones por correo"
                        : ""}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {DELIVERY_META[order.delivery].label}
                    {order.delivery === "domicilio" && order.address
                      ? ` · ${order.address}`
                      : ""}
                    {" · "}
                    {PAYMENT_META[order.payment].label}
                  </p>
                </div>

                <ul className="flex flex-col gap-1 text-sm">
                  {order.items.map((it) => (
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

                {order.notes && (
                  <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    Nota: {order.notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-stone-200/60 pt-3 text-sm dark:border-stone-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 dark:text-stone-400">Envio $</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={
                        shippingDraft[order.id] ??
                        (order.shippingCents === 0 ? "" : (order.shippingCents / 100).toFixed(2))
                      }
                      onChange={(e) =>
                        setShippingDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      onBlur={() => saveShipping(order)}
                      disabled={busyId === order.id}
                      placeholder="0.00"
                      aria-label="Costo de envio"
                      className="h-8 w-20 rounded-xl border border-stone-200 bg-white/80 px-2 text-sm text-stone-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200"
                    />
                  </div>
                  <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Total: {formatMoney(order.totalCents)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {ORDER_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busyId === order.id || order.status === s}
                      onClick={() => patch(order.id, { status: s })}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                        order.status === s
                          ? ORDER_STATUS_META[s].active
                          : "border-stone-200 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:text-stone-300",
                      ].join(" ")}
                    >
                      {ORDER_STATUS_META[s].short}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyLink(order.id)}
                      aria-label="Copiar enlace de seguimiento"
                      className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    >
                      {copiedId === order.id ? "Copiado" : "Copiar enlace"}
                    </button>
                    <a
                      href={confirmWhatsAppLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Enviar confirmacion del pedido con el enlace de seguimiento"
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    >
                      <WhatsAppIcon />
                      Confirmar
                    </a>
                    <a
                      href={statusNotifyWhatsAppLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Avisar al cliente que el pedido esta "${ORDER_STATUS_META[order.status].label}"`}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
                    >
                      <WhatsAppIcon />
                      Avisar
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(order.id, order.number)}
                      disabled={busyId === order.id}
                      aria-label="Eliminar pedido"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}