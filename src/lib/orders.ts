import type { OrderItem, OrderDTO } from "./types";
import { formatMoney } from "./money";
import type { ProductStatus } from "./product-status";

export function isOrderable(p: {
  status: ProductStatus;
  priceCents: number;
  stock: number;
}): boolean {
  return (
    p.priceCents > 0 &&
    p.stock > 0 &&
    p.status !== "out_of_stock" &&
    p.status !== "coming_soon"
  );
}

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; short: string; dot: string; active: string }
> = {
  new: {
    label: "Nuevo",
    short: "Nuevo",
    dot: "bg-sky-500",
    active: "border-sky-500 bg-sky-500 text-white",
  },
  confirmed: {
    label: "Confirmado",
    short: "Confirmado",
    dot: "bg-amber-500",
    active: "border-amber-500 bg-amber-500 text-white",
  },
  preparing: {
    label: "Preparando",
    short: "Preparando",
    dot: "bg-orange-500",
    active: "border-orange-500 bg-orange-500 text-white",
  },
  ready: {
    label: "Listo",
    short: "Listo",
    dot: "bg-teal-500",
    active: "border-teal-500 bg-teal-500 text-white",
  },
  dispatched: {
    label: "Despachado",
    short: "Despachado",
    dot: "bg-violet-500",
    active: "border-violet-500 bg-violet-500 text-white",
  },
  delivered: {
    label: "Entregado",
    short: "Entregado",
    dot: "bg-emerald-500",
    active: "border-emerald-500 bg-emerald-500 text-white",
  },
  cancelled: {
    label: "Cancelado",
    short: "Cancelado",
    dot: "bg-rose-500",
    active: "border-rose-500 bg-rose-500 text-white",
  },
};

export const PAYMENT_METHODS = ["efectivo", "transferencia"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_META: Record<PaymentMethod, { label: string }> = {
  efectivo: { label: "Efectivo" },
  transferencia: { label: "Transferencia" },
};

export const DELIVERY_TYPES = ["retiro", "domicilio"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const DELIVERY_META: Record<DeliveryType, { label: string }> = {
  retiro: { label: "Retiro / Entrega directa" },
  domicilio: { label: "Envío a domicilio" },
};

export const EXPENSE_CATEGORIES = [
  "insumos",
  "envio",
  "empaque",
  "publicidad",
  "otros",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string }
> = {
  insumos: { label: "Insumos" },
  envio: { label: "Envio" },
  empaque: { label: "Empaque" },
  publicidad: { label: "Publicidad" },
  otros: { label: "Otros" },
};

/**
 * Formato de fecha/hora determinista (zona El Salvador). Evita que el servidor
 * (UTC) y el navegador rendericen distinto y provoquen errores de hidratacion.
 */
const SV_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/El_Salvador",
};

const SV_DATE_LONG: Intl.DateTimeFormatOptions = {
  ...SV_DATE,
  month: "long",
};

export function formatDateTime(
  value: string | number | Date,
  variant: "short" | "long" = "short",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(
      "es-SV",
      variant === "long" ? SV_DATE_LONG : SV_DATE,
    ).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

/** Fecha (sin hora) en zona El Salvador; determinista servidor/cliente. */
export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("es-SV", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/El_Salvador",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function orderItemsSummary(items: OrderItem[]): string {
  return items
    .map((it) => `- ${it.name} x${it.quantity} (${formatMoney(it.priceCents * it.quantity)})`)
    .join("\n");
}

/**
 * Numeros de WhatsApp en formato internacional (sin "+" ni espacios).
 * 50373282078 es el negocio (El Salvador).
 */
const BUSINESS_WA_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "50373282078";

export function waLink(number: string, text: string): string {
  const clean = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function businessWhatsAppLink(text: string): string {
  return waLink(BUSINESS_WA_NUMBER, text);
}

/** Mensaje que el cliente puede enviar al negocio con su pedido. */
export function orderToBusinessMessage(order: OrderDTO): string {
  const lines = [
    `Pedido N° ${order.number}`,
    `Nombre: ${order.customerName}`,
    orderItemsSummary(order.items),
    `Subtotal: ${formatMoney(order.productsTotal)}`,
    order.shippingCents > 0
      ? `Envio: ${formatMoney(order.shippingCents)}`
      : null,
    `Total: ${formatMoney(order.totalCents)}`,
    `Pago: ${PAYMENT_META[order.payment].label}`,
    `Entrega: ${DELIVERY_META[order.delivery].label}`,
    order.address ? `Direccion: ${order.address}` : null,
    order.notes ? `Notas: ${order.notes}` : null,
  ].filter((l) => l !== null);
  return lines.join("\n");
}

/** Mensaje que el negocio envia al cliente para confirmar. */
export function confirmOrderToCustomerMessage(order: OrderDTO): string {
  const trackingUrl = orderTrackingUrl(order.id);
  const lines = [
    `Hola ${order.customerName}! Recibimos tu pedido N° ${order.number}`,
    orderItemsSummary(order.items),
    order.shippingCents > 0
      ? `Envios: ${formatMoney(order.shippingCents)}`
      : null,
    `Total: ${formatMoney(order.totalCents)}`,
    `Entrega: ${DELIVERY_META[order.delivery].label}`,
    order.address ? `Direccion: ${order.address}` : null,
    trackingUrl ? `Sigue el estado de tu pedido aqui: ${trackingUrl}` : null,
    "Gracias por tu compra!",
  ].filter((l) => l !== null);
  return lines.join("\n");
}

export function customerWhatsAppLink(order: OrderDTO): string {
  return waLink(BUSINESS_WA_NUMBER, orderToBusinessMessage(order));
}

export function confirmWhatsAppLink(order: OrderDTO): string {
  return waLink(order.customerPhone, confirmOrderToCustomerMessage(order));
}

/** Mensaje corto al cliente segun el estado actual del pedido. */
export function statusNotifyMessage(order: OrderDTO): string {
  const trackingUrl = orderTrackingUrl(order.id);
  const visibleStatus = orderStatusForDelivery(order.status, order.delivery);
  const base: Record<OrderStatus, string> = {
    new: `Hola ${order.customerName}! Recibimos tu pedido N° ${order.number}. Te lo confirmamos en breve.`,
    confirmed: `Hola ${order.customerName}! Tu pedido N° ${order.number} quedo confirmado.`,
    preparing: `Hola ${order.customerName}! Estamos preparando tu pedido N° ${order.number}.`,
    ready: `Hola ${order.customerName}! Tu pedido N° ${order.number} está ${orderStatusLabel(visibleStatus, order.delivery).toLocaleLowerCase("es")}.`,
    dispatched: `Hola ${order.customerName}! Tu pedido N° ${order.number} ya fue despachado por la empresa de envíos.`,
    delivered: `Hola ${order.customerName}! Tu pedido N° ${order.number} fue entregado. Gracias por tu compra!`,
    cancelled: `Hola ${order.customerName}! Tu pedido N° ${order.number} fue cancelado. Escribenos si tienes dudas.`,
  };
  return [base[visibleStatus], trackingUrl ? `Sigue el estado aqui: ${trackingUrl}` : null]
    .filter((l) => l !== null)
    .join("\n");
}

/** Enlace de WhatsApp al cliente para avisar del estado actual del pedido. */
export function statusNotifyWhatsAppLink(order: OrderDTO): string {
  return waLink(order.customerPhone, statusNotifyMessage(order));
}

/**
 * Enlace de WhatsApp al cliente con el mensaje adecuado segun el estado:
 * en pedidos nuevos confirma con el detalle completo y el enlace de
 * seguimiento; en el resto avisa del estado actual.
 */
export function notifyCustomerWhatsAppLink(order: OrderDTO): string {
  const message =
    order.status === "new"
      ? confirmOrderToCustomerMessage(order)
      : statusNotifyMessage(order);
  return waLink(order.customerPhone, message);
}

/** Ruta publica de seguimiento para el cliente. */
export function orderTrackingPath(id: string): string {
  return `/pedido/${id}`;
}

/** Origen del sitio (para enlaces absolutos); usa el navegador si aplica. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");
  return "";
}

/** URL absoluta del seguimiento del pedido (para compartir). */
export function orderTrackingUrl(id: string): string {
  return `${siteOrigin()}${orderTrackingPath(id)}`;
}

/** Pasos visibles del flujo normal de un pedido (sin contar cancelado). */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
];

export function orderStatusForDelivery(
  status: OrderStatus,
  delivery: DeliveryType,
): OrderStatus {
  return status === "dispatched" && delivery === "retiro" ? "ready" : status;
}

export function orderStatusLabel(
  status: OrderStatus,
  delivery: DeliveryType,
): string {
  const visibleStatus = orderStatusForDelivery(status, delivery);
  if (visibleStatus === "ready") {
    return delivery === "domicilio" ? "Listo para enviar" : "Listo para retirar";
  }
  return ORDER_STATUS_META[visibleStatus].label;
}

export function orderStatusDescription(
  status: OrderStatus,
  delivery: DeliveryType,
): string {
  const visibleStatus = orderStatusForDelivery(status, delivery);
  const descriptions: Record<OrderStatus, string> = {
    new: "Recibimos tu pedido",
    confirmed: "Tu pedido fue confirmado",
    preparing: "Estamos preparando tu pedido",
    ready:
      delivery === "domicilio"
        ? "Tu pedido está listo para entregar a la mensajería"
        : "Tu pedido está listo; coordinaremos la entrega contigo",
    dispatched: "La empresa de envíos ya recibió tu pedido",
    delivered: "Tu pedido fue entregado",
    cancelled: "Este pedido fue cancelado",
  };
  return descriptions[visibleStatus];
}

export function orderStatusFlow(delivery: DeliveryType): OrderStatus[] {
  return delivery === "domicilio"
    ? ORDER_STATUS_FLOW
    : ORDER_STATUS_FLOW.filter((status) => status !== "dispatched");
}

/** Indice del estado dentro del flujo visible; -1 si está cancelado. */
export function orderStatusStep(
  status: OrderStatus,
  delivery: DeliveryType,
): number {
  return orderStatusFlow(delivery).indexOf(
    orderStatusForDelivery(status, delivery),
  );
}