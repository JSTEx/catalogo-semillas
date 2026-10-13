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
  "in_transit",
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
  in_transit: {
    label: "En camino",
    short: "En camino",
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
  domicilio: { label: "Domicilio" },
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

/** Ruta publica de seguimiento para el cliente. */
export function orderTrackingPath(id: string): string {
  return `/pedido/${id}`;
}

/** Origen del sitio (para enlaces absolutos); usa el navegador si aplica. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
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
  "in_transit",
  "delivered",
];

/** Indice del estado dentro del flujo; -1 si esta cancelado. */
export function orderStatusStep(status: OrderStatus): number {
  return ORDER_STATUS_FLOW.indexOf(status);
}