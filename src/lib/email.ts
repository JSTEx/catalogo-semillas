import { Resend } from "resend";
import type { OrderDTO } from "./types";
import { formatMoney } from "./money";
import type { OrderStatus } from "./orders";
import {
  PAYMENT_META,
  DELIVERY_META,
  orderTrackingUrl,
  orderItemsSummary,
  confirmWhatsAppLink,
  siteOrigin,
} from "./orders";

/**
 * Notificaciones por correo (Resend).
 *
 * Variables de entorno:
 * - RESEND_API_KEY       API key de Resend (si falta, no se envia nada).
 * - NOTIFY_EMAIL_TO      correo(s) del negocio separados por coma.
 * - EMAIL_FROM           remitente (por defecto Resend onboarding).
 *
 * Nota: enviar a clientes (direcciones arbitrarias) requiere tener un dominio
 * verificado en Resend. Con el remitente de pruebas solo llega al correo dueno
 * de la cuenta.
 */
let client: Resend | null = null;

function apiKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}

function businessRecipients(): string[] {
  return (process.env.NOTIFY_EMAIL_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function sender(): string {
  return process.env.EMAIL_FROM || "JecsitoShop <onboarding@resend.dev>";
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (c) => map[c]!);
}

/** Envio de bajo nivel: nunca lanza, solo registra errores. */
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const key = apiKey();
  if (!key || to.length === 0) return;

  client ??= new Resend(key);
  try {
    const { error } = await client.emails.send({
      from: sender(),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] Resend respondio con error", error);
    }
  } catch (err) {
    console.error("[email] No se pudo enviar el correo", err);
  }
}

function detailText(order: OrderDTO): string[] {
  return [
    `Pago: ${PAYMENT_META[order.payment].label}`,
    `Entrega: ${DELIVERY_META[order.delivery].label}`,
    order.address ? `Direccion: ${order.address}` : null,
  ].filter((l): l is string => l !== null);
}

function totalsText(order: OrderDTO): string[] {
  return [
    `Subtotal: ${formatMoney(order.productsTotal)}`,
    order.shippingCents > 0 ? `Envio: ${formatMoney(order.shippingCents)}` : null,
    `Total: ${formatMoney(order.totalCents)}`,
  ].filter((l): l is string => l !== null);
}

/* ----------------------------- Correo al negocio ---------------------------- */

function businessHtml(order: OrderDTO): string {
  const tracking = orderTrackingUrl(order.id);
  const waLink = confirmWhatsAppLink(order);
  const rows = order.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#44403c;font-size:14px;">
            ${escapeHtml(it.name)} <span style="color:#a8a29e;">×${it.quantity}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#44403c;font-size:14px;text-align:right;white-space:nowrap;">
            ${formatMoney(it.priceCents * it.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  const detail = (label: string, value: string) => `
    <tr>
      <td style="padding:4px 0;color:#78716c;font-size:13px;">${label}</td>
      <td style="padding:4px 0;color:#292524;font-size:13px;text-align:right;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:24px;">
        <p style="margin:0 0 4px;color:#a8a29e;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">JecsitoShop</p>
        <h1 style="margin:0 0 16px;color:#1c1917;font-size:20px;">Nuevo pedido N° ${order.number}</h1>
        <table style="width:100%;border-collapse:collapse;">
          ${detail("Cliente", escapeHtml(order.customerName))}
          ${detail("Telefono", escapeHtml(order.customerPhone))}
          ${order.customerEmail ? detail("Correo", escapeHtml(order.customerEmail)) : ""}
          ${detail("Entrega", DELIVERY_META[order.delivery].label)}
          ${order.address ? detail("Direccion", escapeHtml(order.address)) : ""}
          ${detail("Pago", PAYMENT_META[order.payment].label)}
          ${order.notes ? detail("Notas", escapeHtml(order.notes)) : ""}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          ${rows}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          ${detail("Subtotal", formatMoney(order.productsTotal))}
          ${
            order.shippingCents > 0
              ? detail("Envio", formatMoney(order.shippingCents))
              : ""
          }
          <tr>
            <td style="padding:8px 0 0;color:#1c1917;font-size:15px;font-weight:700;">Total</td>
            <td style="padding:8px 0 0;color:#1c1917;font-size:15px;font-weight:700;text-align:right;">${formatMoney(order.totalCents)}</td>
          </tr>
        </table>
        <div style="margin-top:20px;">
          ${
            tracking
              ? `<a href="${tracking}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;margin:0 8px 8px 0;">Ver seguimiento</a>`
              : ""
          }
          <a href="${waLink}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;margin:0 8px 8px 0;">Escribir al cliente</a>
          <a href="${siteOrigin()}/admin" style="display:inline-block;background:#ffffff;border:1px solid #e7e5e4;color:#57534e;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;">Ir al panel</a>
        </div>
      </div>
      <p style="text-align:center;color:#a8a29e;font-size:12px;margin-top:16px;">Notificacion automatica de JecsitoShop.</p>
    </div>
  </body>
</html>`;
}

function businessText(order: OrderDTO): string {
  const tracking = orderTrackingUrl(order.id);
  return [
    `Nuevo pedido N° ${order.number}`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefono: ${order.customerPhone}`,
    order.customerEmail ? `Correo: ${order.customerEmail}` : null,
    orderItemsSummary(order.items),
    "",
    ...totalsText(order),
    ...detailText(order),
    order.notes ? `Notas: ${order.notes}` : null,
    "",
    tracking ? `Seguimiento: ${tracking}` : null,
    `Panel: ${siteOrigin()}/admin`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/** Notifica al negocio que entro un pedido nuevo. */
export async function sendNewOrderEmail(order: OrderDTO): Promise<void> {
  await sendEmail(
    businessRecipients(),
    `Nuevo pedido N° ${order.number} · ${order.customerName} · ${formatMoney(order.totalCents)}`,
    businessHtml(order),
    businessText(order),
  );
}

/* ----------------------------- Correo al cliente ---------------------------- */

const CUSTOMER_STATUS_TITLES: Record<OrderStatus, string> = {
  new: "Recibimos tu pedido",
  confirmed: "Tu pedido fue confirmado",
  in_transit: "Tu pedido va en camino",
  delivered: "Tu pedido fue entregado",
  cancelled: "Tu pedido fue cancelado",
};

const CUSTOMER_STATUS_LINES: Record<OrderStatus, string> = {
  new: "Ya recibimos tu pedido. Te confirmaremos en breve.",
  confirmed: "Tu pedido quedo confirmado. Pronto lo preparamos.",
  in_transit: "Tu pedido ya va en camino.",
  delivered: "Tu pedido fue entregado. Gracias por tu compra.",
  cancelled: "Tu pedido fue cancelado. Escribenos si tienes dudas.",
};

function customerHtml(order: OrderDTO, status: OrderStatus): string {
  const tracking = orderTrackingUrl(order.id);
  const rows = order.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#44403c;font-size:14px;">
            ${escapeHtml(it.name)} <span style="color:#a8a29e;">×${it.quantity}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;color:#44403c;font-size:14px;text-align:right;white-space:nowrap;">
            ${formatMoney(it.priceCents * it.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  const receiptNote =
    order.payment === "transferencia" &&
    status !== "delivered" &&
    status !== "cancelled"
      ? `<p style="margin:16px 0 0;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;color:#92400e;font-size:13px;">Recuerda enviarnos el comprobante de tu transferencia por WhatsApp para confirmar el pago.</p>`
      : "";

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:24px;">
        <p style="margin:0 0 4px;color:#a8a29e;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">JecsitoShop</p>
        <h1 style="margin:0 0 8px;color:#1c1917;font-size:20px;">${CUSTOMER_STATUS_TITLES[status]} · N° ${order.number}</h1>
        <p style="margin:0 0 16px;color:#57534e;font-size:14px;">Hola ${escapeHtml(order.customerName)}, ${CUSTOMER_STATUS_LINES[status]}</p>
        <table style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr>
            <td style="padding:8px 0 0;color:#1c1917;font-size:15px;font-weight:700;">Total</td>
            <td style="padding:8px 0 0;color:#1c1917;font-size:15px;font-weight:700;text-align:right;">${formatMoney(order.totalCents)}</td>
          </tr>
        </table>
        ${receiptNote}
        ${
          tracking
            ? `<div style="margin-top:20px;"><a href="${tracking}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:12px;">Ver estado de mi pedido</a></div>`
            : ""
        }
      </div>
      <p style="text-align:center;color:#a8a29e;font-size:12px;margin-top:16px;">Recibes este correo porque pediste actualizaciones de tu pedido. JecsitoShop.</p>
    </div>
  </body>
</html>`;
}

function customerText(order: OrderDTO, status: OrderStatus): string {
  const tracking = orderTrackingUrl(order.id);
  return [
    `${CUSTOMER_STATUS_TITLES[status]} · N° ${order.number}`,
    "",
    `Hola ${order.customerName}, ${CUSTOMER_STATUS_LINES[status]}`,
    "",
    orderItemsSummary(order.items),
    "",
    ...totalsText(order),
    ...detailText(order),
    order.payment === "transferencia" &&
    status !== "delivered" &&
    status !== "cancelled"
      ? "Recuerda enviarnos el comprobante de tu transferencia por WhatsApp."
      : null,
    "",
    tracking ? `Estado del pedido: ${tracking}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/** Avisa al cliente (si pidio actualizaciones) del estado de su pedido. */
export async function sendCustomerOrderEmail(order: OrderDTO): Promise<void> {
  if (!order.notifyEmail || !order.customerEmail) return;
  await sendEmail(
    [order.customerEmail],
    `${CUSTOMER_STATUS_TITLES[order.status]} · Pedido N° ${order.number}`,
    customerHtml(order, order.status),
    customerText(order, order.status),
  );
}
