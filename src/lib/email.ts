import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
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
 *
 * El diseno usa el modo nocturno del sitio (fondo carbon + esmeralda).
 * Si no hay proveedor configurado, no se envia nada (la app sigue normal).
 */
let client: Resend | null = null;
let smtp: Transporter | null = null;

/* Paleta basada en el modo oscuro del sitio (globals.css + brand esmeralda). */
const PAGE = "#0c0a09";
const CARD = "#1c1917";
const SURFACE = "#292524";
const LINE = "#292524";
const INK = "#f5f5f4";
const TEXT = "#e7e5e4";
const MUTED = "#a8a29e";
const BRAND = "#10b981";
const BRAND_SOFT = "#34d399";
const BRAND_INK = "#064e3b";
const TRACKING = "#38bdf8";
const TRACKING_INK = "#082f49";
const NOTE_BG = "#3f2d0a";
const NOTE_LINE = "#78350f";
const NOTE_TEXT = "#fde68a";

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

/** Envio de bajo nivel: elige proveedor; nunca lanza, solo registra errores. */
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string,
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
      });
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
    });
    if (error) {
      console.error("[email] Resend respondio con error", error);
    }
  } catch (err) {
    console.error("[email] No se pudo enviar el correo", err);
  }
}

/* ------------------------------ Plantilla base ----------------------------- */

const FONT =
  "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Marco visual comun: fondo oscuro, encabezado de marca y pie. */
function shell(preheader: string, inner: string, footer: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
  </head>
  <body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
      preheader,
    )}</div>
    <div style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
        <tr>
          <td>
            <div style="background:${CARD};border:1px solid ${LINE};border-bottom:2px solid ${BRAND};border-radius:18px 18px 0 0;padding:20px 26px;">
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
      <p style="max-width:560px;margin:18px auto 0;text-align:center;color:#57534e;font-size:12px;line-height:1.5;">${footer}</p>
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
    outline: `background:${SURFACE};color:${TEXT};border:1px solid #44403c;`,
  }[variant];
  return `<a href="${href}" style="display:inline-block;${style}text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:12px;margin:0 8px 8px 0;">${label}</a>`;
}

function sectionTitle(label: string): string {
  return `<p style="margin:0 0 10px;color:${MUTED};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">${label}</p>`;
}

function card(inner: string): string {
  return `<div style="background:${SURFACE};border:1px solid #44403c;border-radius:14px;padding:16px;">${inner}</div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:${MUTED};font-size:13px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;color:${INK};font-size:13px;text-align:right;font-weight:600;">${value}</td>
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
        )}" width="44" height="44" alt="" style="border-radius:10px;background:#0c0a09;display:block;object-fit:contain;" />
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
      <td style="padding:2px 0;color:${strong ? "#a7f3d0" : MUTED};font-size:${strong ? "15px" : "13px"};font-weight:${strong ? "800" : "400"};">${label}</td>
      <td style="padding:2px 0;text-align:right;color:${strong ? "#ecfdf5" : TEXT};font-size:${strong ? "15px" : "13px"};font-weight:${strong ? "800" : "600"};">${value}</td>
    </tr>`;
  return `<div style="background:${BRAND_INK};border:1px solid #047857;border-radius:14px;padding:14px 16px;margin-top:16px;">
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

const CUSTOMER_STATUS_EMOJI: Record<OrderStatus, string> = {
  new: "🧾",
  confirmed: "✅",
  in_transit: "🚚",
  delivered: "🎉",
  cancelled: "⚠️",
};

function customerHtml(order: OrderDTO, status: OrderStatus): string {
  const tracking = orderTrackingUrl(order.id);
  const receiptNote =
    order.payment === "transferencia" &&
    status !== "delivered" &&
    status !== "cancelled"
      ? note(
          "Recuerda enviarnos el comprobante de tu transferencia por WhatsApp para confirmar el pago.",
        )
      : "";

  const inner = `
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:34px;line-height:1;">${CUSTOMER_STATUS_EMOJI[status]}</div>
      <h1 style="margin:10px 0 6px;color:${INK};font-size:21px;font-weight:800;letter-spacing:-0.02em;">${CUSTOMER_STATUS_TITLES[status]}</h1>
      <p style="margin:0;color:${MUTED};font-size:14px;">Pedido N° ${order.number}</p>
    </div>
    <p style="margin:0 0 18px;color:${TEXT};font-size:14px;line-height:1.6;text-align:center;">Hola ${escapeHtml(
      order.customerName,
    )}, ${CUSTOMER_STATUS_LINES[status]}</p>
    ${sectionTitle("Tu pedido")}
    ${card(itemsTable(order))}
    ${totalsBox(order)}
    ${receiptNote}
    ${
      tracking
        ? `<div style="margin-top:20px;text-align:center;">${button(
            tracking,
            "Ver estado de mi pedido",
            "sky",
          )}</div>`
        : ""
    }`;

  return shell(
    `${CUSTOMER_STATUS_TITLES[status]} · Pedido N° ${order.number}`,
    inner,
    "Recibes este correo porque pediste actualizaciones de tu pedido. JecsitoShop.",
  );
}

function customerText(order: OrderDTO, status: OrderStatus): string {
  const tracking = orderTrackingUrl(order.id);
  return [
    `${CUSTOMER_STATUS_TITLES[status]} · Pedido N° ${order.number}`,
    "",
    `Hola ${order.customerName}, ${CUSTOMER_STATUS_LINES[status]}`,
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
