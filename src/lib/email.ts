import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { OrderDTO } from "./types";
import { formatMoney } from "./money";
import {
  orderStatusDescription,
  orderStatusLabel,
  orderStatusForDelivery,
  type OrderStatus,
} from "./orders";
import {
  PAYMENT_META,
  DELIVERY_META,
  orderTrackingUrl,
  orderItemsSummary,
  confirmWhatsAppLink,
  siteOrigin,
} from "./orders";

/**
 * Notificaciones por correo.
 *
 * Dos proveedores, en orden de prioridad:
 * 1. Gmail SMTP (nodemailer) si estan GMAIL_USER + GMAIL_APP_PASSWORD.
 *    Permite enviar a cualquier cliente sin dominio propio.
 * 2. Resend si esta RESEND_API_KEY (con el remitente de pruebas solo llega
 *    al correo dueno de la cuenta; para clientes requiere dominio verificado).
 *
 * Variables de entorno:
 * - GMAIL_USER / GMAIL_APP_PASSWORD   envio por Gmail (recomendado, gratis).
 * - RESEND_API_KEY / NOTIFY_EMAIL_TO / EMAIL_FROM   envio por Resend.
 * - EMAIL_LOGO_URL   URL absoluta del logo (por defecto <sitio>/logo.png).
 * - BUSINESS_LEGAL_NAME / BUSINESS_ADDRESS   razon social y direccion fisica
 *   que se muestran en el pie de cada correo (requisito anti-spam / RFC 2142).
 *
 * Anti-spam:
 * - Los correos al cliente (notifyEmail) incluyen la cabecera List-Unsubscribe
 *   con un mailto: al remitente, para poder darse de baja desde el propio
 *   cliente de correo.
 * - El pie lleva razon social y direccion fisica (identificacion del remitente).
 *
 * La plantilla usa una paleta clara para mantener la lectura en cualquier cliente.
 * Si no hay proveedor configurado, no se envia nada (la app sigue normal).
 */
let client: Resend | null = null;
let smtp: Transporter | null = null;

/* Paleta clara y de alto contraste compatible con clientes de correo. */
const PAGE = "#f3f6f5";
const CARD = "#ffffff";
const SURFACE = "#f8faf9";
const LINE = "#e2e8e5";
const INK = "#17211d";
const TEXT = "#34423b";
const MUTED = "#64736b";
const BRAND = "#10b981";
const BRAND_SOFT = "#047857";
const BRAND_INK = "#ecfdf5";
const TRACKING = "#d1fae5";
const TRACKING_INK = "#065f46";
const NOTE_BG = "#fffbeb";
const NOTE_LINE = "#fcd34d";
const NOTE_TEXT = "#78350f";

function apiKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}

function gmailUser(): string | undefined {
  return process.env.GMAIL_USER;
}

function gmailPass(): string | undefined {
  const raw = process.env.GMAIL_APP_PASSWORD;
  return raw ? raw.replace(/\s+/g, "") : undefined;
}

function smtpConfigured(): boolean {
  return Boolean(gmailUser() && gmailPass());
}

function logoUrl(): string {
  const explicit = process.env.EMAIL_LOGO_URL?.trim();
  return explicit || `${siteOrigin()}/logo.png`;
}

function businessRecipients(): string[] {
  const list = (process.env.NOTIFY_EMAIL_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0 && gmailUser()) return [gmailUser()!];
  return list;
}

function gmailFrom(): string {
  return `JecsitoShop <${gmailUser()}>`;
}

function resendFrom(): string {
  return process.env.EMAIL_FROM || "JecsitoShop <onboarding@resend.dev>";
}

function getSmtp(): Transporter {
  if (smtp) return smtp;
  smtp = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser(), pass: gmailPass() },
  });
  return smtp;
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

/** Cabeceras extra (p. ej. List-Unsubscribe) opcionales en cada envio. */
type EmailHeaders = Record<string, string>;

/**
 * Direccion usada como destino del mailto: de List-Unsubscribe.
 * Prefiere la parte <correo> de EMAIL_FROM; si no, GMAIL_USER.
 */
function unsubscribeAddress(): string | undefined {
  const from = process.env.EMAIL_FROM?.trim();
  const angled = from?.match(/<([^>]+)>/);
  if (angled?.[1]) return angled[1];
  if (from && from.includes("@")) return from;
  return gmailUser();
}

/** Cabeceras anti-spam para correos al cliente (baja en un clic/mensaje). */
function unsubscribeHeaders(order: OrderDTO): EmailHeaders {
  const headers: EmailHeaders = {};
  const addr = unsubscribeAddress();
  if (addr) {
    headers["List-Unsubscribe"] = `<mailto:${addr}?subject=Baja%20pedido%20${encodeURIComponent(order.number)}>`;
  }
  return headers;
}

/** Envio de bajo nivel: elige proveedor; nunca lanza, solo registra errores. */
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string,
  headers?: EmailHeaders,
): Promise<void> {
  if (to.length === 0) return;

  if (smtpConfigured()) {
    try {
      await getSmtp().sendMail({
        from: gmailFrom(),
        to: to.join(", "),
        subject,
        html,
        text,
        headers,
      });
      console.log(`[email] enviado (gmail) a ${to.join(", ")}: ${subject}`);
    } catch (err) {
      console.error("[email] No se pudo enviar por SMTP de Gmail", err);
    }
    return;
  }

  const key = apiKey();
  if (!key) return;

  client ??= new Resend(key);
  try {
    const { error } = await client.emails.send({
      from: resendFrom(),
      to,
      subject,
      html,
      text,
      headers,
    });
    if (error) {
      console.error("[email] Resend respondio con error", error);
    } else {
      console.log(`[email] enviado (resend) a ${to.join(", ")}: ${subject}`);
    }
  } catch (err) {
    console.error("[email] No se pudo enviar el correo", err);
  }
}

/* ------------------------------ Plantilla base ----------------------------- */

const FONT =
  "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Marco visual claro y adaptable para clientes de correo. */
function shell(preheader: string, inner: string, footer: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
  </head>
  <body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
      preheader,
    )}</div>
    <div style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
        <tr>
          <td>
            <div style="background:${CARD};border:1px solid ${LINE};border-bottom:3px solid ${BRAND};border-radius:18px 18px 0 0;padding:20px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${escapeHtml(
                      logoUrl(),
                    )}" alt="JecsitoShop" height="40" style="display:block;height:40px;width:auto;border:0;outline:none;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <span style="color:${BRAND_SOFT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Tienda</span>
                  </td>
                </tr>
              </table>
            </div>
            <div style="background:${CARD};border:1px solid ${LINE};border-top:0;border-radius:0 0 18px 18px;padding:26px;">
              ${inner}
            </div>
          </td>
        </tr>
      </table>
      <p style="max-width:600px;margin:18px auto 0;text-align:center;color:${MUTED};font-size:12px;line-height:1.6;">${footer}</p>
    </div>
  </body>
</html>`;
}

function button(
  href: string,
  label: string,
  variant: "solid" | "sky" | "outline",
): string {
  const style = {
    solid: `background:${BRAND};color:${BRAND_INK};border:1px solid ${BRAND};`,
    sky: `background:${TRACKING};color:${TRACKING_INK};border:1px solid ${TRACKING};`,
    outline: `background:${SURFACE};color:${TEXT};border:1px solid #cbd5d1;`,
  }[variant];
  return `<a href="${href}" style="display:inline-block;${style}text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:12px;margin:0 8px 8px 0;">${label}</a>`;
}

function sectionTitle(label: string): string {
  return `<p style="margin:0 0 10px;color:${MUTED};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">${label}</p>`;
}

function card(inner: string): string {
  return `<div style="background:${SURFACE};border:1px solid ${LINE};border-radius:14px;padding:16px;">${inner}</div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:${MUTED};font-size:13px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;color:${INK};font-size:13px;text-align:right;font-weight:600;white-space:pre-line;">${value}</td>
  </tr>`;
}

function itemsTable(order: OrderDTO): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${order.items
      .map(
        (it) => `<tr>
      <td width="54" style="padding:8px 12px 8px 0;vertical-align:middle;">
        <img src="${escapeHtml(
          it.imageUrl,
        )}" width="44" height="44" alt="" style="border-radius:10px;background:#f1f5f3;display:block;object-fit:contain;" />
      </td>
      <td style="padding:8px 0;vertical-align:middle;font-size:14px;color:${INK};font-weight:600;">
        ${escapeHtml(it.name)}
        <div style="color:${MUTED};font-size:12px;font-weight:400;">${it.quantity} × ${formatMoney(
          it.priceCents,
        )}</div>
      </td>
      <td style="padding:8px 0;vertical-align:middle;text-align:right;font-size:14px;font-weight:700;color:${INK};white-space:nowrap;">
        ${formatMoney(it.priceCents * it.quantity)}
      </td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

function totalsBox(order: OrderDTO): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr>
      <td style="padding:4px 0;color:${strong ? BRAND_SOFT : MUTED};font-size:${strong ? "16px" : "13px"};font-weight:${strong ? "800" : "400"};">${label}</td>
      <td style="padding:4px 0;text-align:right;color:${strong ? BRAND_SOFT : TEXT};font-size:${strong ? "16px" : "13px"};font-weight:${strong ? "800" : "600"};">${value}</td>
    </tr>`;
  return `<div style="background:${BRAND_INK};border:1px solid #a7f3d0;border-radius:14px;padding:14px 16px;margin-top:16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row("Subtotal", formatMoney(order.productsTotal))}
      ${
        order.shippingCents > 0
          ? row("Envio", formatMoney(order.shippingCents))
          : ""
      }
      ${row("Total", formatMoney(order.totalCents), true)}
    </table>
  </div>`;
}

function note(text: string): string {
  return `<div style="margin-top:16px;background:${NOTE_BG};border:1px solid ${NOTE_LINE};border-radius:12px;padding:12px 14px;color:${NOTE_TEXT};font-size:13px;">${text}</div>`;
}

/* ----------------------------- Correo al negocio ---------------------------- */

function businessHtml(order: OrderDTO): string {
  const tracking = orderTrackingUrl(order.id);
  const inner = `
    <p style="margin:0 0 2px;color:${MUTED};font-size:13px;">Entro un pedido nuevo</p>
    <h1 style="margin:0 0 16px;color:${INK};font-size:24px;font-weight:800;letter-spacing:-0.02em;">Pedido N° ${order.number}</h1>
    ${card(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Cliente", escapeHtml(order.customerName))}
        ${detailRow("Telefono", escapeHtml(order.customerPhone))}
        ${order.customerEmail ? detailRow("Correo", escapeHtml(order.customerEmail)) : ""}
        ${detailRow("Pago", PAYMENT_META[order.payment].label)}
        ${detailRow("Entrega", DELIVERY_META[order.delivery].label)}
        ${order.address ? detailRow("Direccion", escapeHtml(order.address)) : ""}
      </table>`,
    )}
    ${
      order.notes
        ? note(`<strong>Nota:</strong> ${escapeHtml(order.notes)}`)
        : ""
    }
    <div style="margin-top:20px;">
      ${sectionTitle("Productos")}
      ${card(itemsTable(order))}
    </div>
    ${totalsBox(order)}
    <div style="margin-top:20px;">
      ${tracking ? button(tracking, "Ver seguimiento", "sky") : ""}
      ${button(confirmWhatsAppLink(order), "Escribir al cliente", "solid")}
      ${button(`${siteOrigin()}/admin`, "Ir al panel", "outline")}
    </div>`;

  return shell(
    `Nuevo pedido N° ${order.number} de ${order.customerName}`,
    inner,
    "Notificacion automatica de JecsitoShop.",
  );
}

export async function sendCustomerPaymentConfirmedEmail(
  order: OrderDTO,
): Promise<void> {
  if (!order.notifyEmail || !order.customerEmail) return;
  const tracking = orderTrackingUrl(order.id);
  const title = `Pago confirmado · Pedido N° ${order.number}`;
  const inner = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:36px;line-height:1;">✅</div>
      <h1 style="margin:10px 0 6px;color:${INK};font-size:22px;font-weight:800;">Pago confirmado</h1>
      <p style="margin:0;color:${MUTED};font-size:14px;">Pedido N° ${order.number}</p>
    </div>
    <p style="margin:0 0 18px;color:${TEXT};font-size:15px;line-height:1.6;text-align:center;">
      Hola ${escapeHtml(order.customerName)}, verificamos tu pago. Continuaremos con la preparación y entrega de tu pedido.
    </p>
    ${sectionTitle("Resumen del pedido")}
    ${card(itemsTable(order))}
    ${totalsBox(order)}
    ${
      tracking
        ? `<div style="margin-top:20px;text-align:center;">${button(
            tracking,
            "Ver estado de mi pedido",
            "solid",
          )}</div>`
        : ""
    }`;
  await sendEmail(
    [order.customerEmail],
    title,
    shell(title, inner, "Recibes este correo porque solicitaste actualizaciones de tu pedido. JecsitoShop."),
    [
      title,
      "",
      `Hola ${order.customerName}, verificamos tu pago.`,
      "Continuaremos con la preparación y entrega de tu pedido.",
      "",
      orderItemsSummary(order.items),
      "",
      `Total: ${formatMoney(order.totalCents)}`,
      tracking ? `Estado del pedido: ${tracking}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    unsubscribeHeaders(order),
  );
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
    `Subtotal: ${formatMoney(order.productsTotal)}`,
    order.shippingCents > 0 ? `Envio: ${formatMoney(order.shippingCents)}` : null,
    `Total: ${formatMoney(order.totalCents)}`,
    `Pago: ${PAYMENT_META[order.payment].label}`,
    `Estado del pago: ${
      order.paymentConfirmedAt
        ? "Confirmado"
        : order.payment === "transferencia" && order.receiptUrl
          ? "Archivo del comprobante recibido; pago no confirmado"
          : order.payment === "transferencia"
            ? "Pendiente de confirmacion"
            : "Pendiente de pago"
    }`,
    `Entrega: ${DELIVERY_META[order.delivery].label}`,
    order.address ? `Direccion: ${order.address}` : null,
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
  preparing: "Estamos preparando tu pedido",
  ready: "Tu pedido está listo",
  dispatched: "Tu pedido fue despachado",
  delivered: "Tu pedido fue entregado",
  cancelled: "Tu pedido fue cancelado",
};

const CUSTOMER_STATUS_LINES: Record<OrderStatus, string> = {
  new: "Ya recibimos tu pedido. Te confirmaremos en breve.",
  confirmed: "Tu pedido quedo confirmado. Pronto lo preparamos.",
  preparing: "Estamos preparando tu pedido.",
  ready: "Tu pedido está listo.",
  dispatched: "La empresa de envíos ya recibió tu pedido.",
  delivered: "Tu pedido fue entregado. Gracias por tu compra.",
  cancelled: "Tu pedido fue cancelado. Escribenos si tienes dudas.",
};

const CUSTOMER_STATUS_EMOJI: Record<OrderStatus, string> = {
  new: "🧾",
  confirmed: "✅",
  preparing: "📦",
  ready: "✅",
  dispatched: "📦",
  delivered: "🎉",
  cancelled: "⚠️",
};

function customerStatusTitle(order: OrderDTO, status: OrderStatus): string {
  const visibleStatus = orderStatusForDelivery(status, order.delivery);
  if (visibleStatus === "ready") {
    return `Tu pedido está ${orderStatusLabel(visibleStatus, order.delivery).toLocaleLowerCase("es")}`;
  }
  return CUSTOMER_STATUS_TITLES[visibleStatus];
}

function customerStatusLine(order: OrderDTO, status: OrderStatus): string {
  const visibleStatus = orderStatusForDelivery(status, order.delivery);
  if (visibleStatus === "ready" || visibleStatus === "dispatched") {
    return `${orderStatusDescription(visibleStatus, order.delivery)}.`;
  }
  return CUSTOMER_STATUS_LINES[visibleStatus];
}

function customerHtml(order: OrderDTO, status: OrderStatus): string {
  const title = customerStatusTitle(order, status);
  const statusLine = customerStatusLine(order, status);
  const visibleStatus = orderStatusForDelivery(status, order.delivery);
  const tracking = orderTrackingUrl(order.id);
  const receiptNote =
    order.payment === "transferencia" &&
    !order.paymentConfirmedAt &&
    visibleStatus !== "delivered" &&
    visibleStatus !== "cancelled"
      ? note(
          "Recibimos el archivo del comprobante, pero esto no confirma el pago. Verificaremos el ingreso y te avisaremos.",
        )
      : "";

  const inner = `
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:34px;line-height:1;">${CUSTOMER_STATUS_EMOJI[visibleStatus]}</div>
      <h1 style="margin:10px 0 6px;color:${INK};font-size:21px;font-weight:800;letter-spacing:-0.02em;">${title}</h1>
      <p style="margin:0;color:${MUTED};font-size:14px;">Pedido N° ${order.number}</p>
    </div>
    <p style="margin:0 0 18px;color:${TEXT};font-size:14px;line-height:1.6;text-align:center;">Hola ${escapeHtml(
      order.customerName,
    )}, ${statusLine}</p>
    ${sectionTitle("Tu pedido")}
    ${card(itemsTable(order))}
    ${totalsBox(order)}
    ${card(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Forma de pago", PAYMENT_META[order.payment].label)}
        ${detailRow(
          "Estado del pago",
          order.paymentConfirmedAt
            ? "Confirmado"
            : order.payment === "transferencia" && order.receiptUrl
              ? "Archivo recibido · pago aún no confirmado"
              : order.payment === "transferencia"
                ? "Pendiente de confirmación"
                : "Pendiente de pago",
        )}
        ${detailRow("Entrega", DELIVERY_META[order.delivery].label)}
      </table>`,
    )}
    ${receiptNote}
    ${
      tracking
        ? `<div style="margin-top:20px;text-align:center;">${button(
            tracking,
            order.payment === "transferencia" &&
            !order.paymentConfirmedAt &&
            visibleStatus !== "cancelled"
              ? "Subir comprobante y ver pedido"
              : "Ver estado de mi pedido",
            "solid",
          )}</div>`
        : ""
    }`;

  return shell(
    `${title} · Pedido N° ${order.number}`,
    inner,
    "Recibes este correo porque pediste actualizaciones de tu pedido. JecsitoShop.",
  );
}

function customerText(order: OrderDTO, status: OrderStatus): string {
  const title = customerStatusTitle(order, status);
  const statusLine = customerStatusLine(order, status);
  const visibleStatus = orderStatusForDelivery(status, order.delivery);
  const tracking = orderTrackingUrl(order.id);
  return [
    `${title} · Pedido N° ${order.number}`,
    "",
    `Hola ${order.customerName}, ${statusLine}`,
    "",
    orderItemsSummary(order.items),
    "",
    `Subtotal: ${formatMoney(order.productsTotal)}`,
    order.shippingCents > 0 ? `Envio: ${formatMoney(order.shippingCents)}` : null,
    `Total: ${formatMoney(order.totalCents)}`,
    `Pago: ${PAYMENT_META[order.payment].label}`,
    `Entrega: ${DELIVERY_META[order.delivery].label}`,
    order.address ? `Direccion: ${order.address}` : null,
    order.payment === "transferencia" &&
    !order.paymentConfirmedAt &&
    visibleStatus !== "delivered" &&
    visibleStatus !== "cancelled"
      ? "Sube tu comprobante desde el enlace de seguimiento. Confirmaremos el pago cuando verifiquemos el ingreso."
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
  const title = customerStatusTitle(order, order.status);
  await sendEmail(
    [order.customerEmail],
    `${title} · Pedido N° ${order.number}`,
    customerHtml(order, order.status),
    customerText(order, order.status),
    unsubscribeHeaders(order),
  );
}

/* --------------------------- Aviso de cancelacion --------------------------- */

function cancelledHtml(order: OrderDTO): string {
  const inner = `
    <p style="margin:0 0 2px;color:${MUTED};font-size:13px;">El cliente cancelo su pedido</p>
    <h1 style="margin:0 0 16px;color:#fda4af;font-size:24px;font-weight:800;letter-spacing:-0.02em;">Pedido N° ${order.number} cancelado</h1>
    ${card(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Cliente", escapeHtml(order.customerName))}
        ${detailRow("Telefono", escapeHtml(order.customerPhone))}
        ${detailRow("Total", formatMoney(order.totalCents))}
      </table>`,
    )}
    <p style="margin:16px 0 0;color:${TEXT};font-size:14px;line-height:1.6;">Puedes escribirle por WhatsApp si necesitas coordinar algo.</p>
    <div style="margin-top:20px;">
      ${button(confirmWhatsAppLink(order), "Escribir al cliente", "solid")}
      ${button(`${siteOrigin()}/admin`, "Ir al panel", "outline")}
    </div>`;
  return shell(
    `Pedido N° ${order.number} cancelado por el cliente`,
    inner,
    "Notificacion automatica de JecsitoShop.",
  );
}

function cancelledText(order: OrderDTO): string {
  return [
    `Pedido N° ${order.number} cancelado por el cliente`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefono: ${order.customerPhone}`,
    `Total: ${formatMoney(order.totalCents)}`,
    "",
    `Panel: ${siteOrigin()}/admin`,
  ].join("\n");
}

/** Notifica al negocio que el cliente cancelo su pedido. */
export async function sendOrderCancelledEmail(order: OrderDTO): Promise<void> {
  await sendEmail(
    businessRecipients(),
    `Pedido N° ${order.number} cancelado por el cliente`,
    cancelledHtml(order),
    cancelledText(order),
  );
}
