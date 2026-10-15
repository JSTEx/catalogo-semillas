"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";
import {
  businessWhatsAppLink,
  customerWhatsAppLink,
  orderTrackingPath,
} from "@/lib/orders";
import { saveMyOrder } from "@/lib/my-order";
import type { OrderDTO } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Delivery = "retiro" | "domicilio";
type Payment = "efectivo" | "transferencia";
type Step = "form" | "review";

export default function CheckoutModal({ open, onClose }: Props) {
  const { items, totalCents, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>("retiro");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderDTO | null>(null);

  if (!open) return null;

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setNotifyEmail(false);
    setDelivery("retiro");
    setAddress("");
    setPayment("efectivo");
    setNotes("");
    setStep("form");
    setError(null);
    setSuccess(null);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validate(): string | null {
    if (name.trim().length < 2) return "Escribe tu nombre";
    if (phone.trim().length < 7) return "Escribe un telefono valido";
    if (
      (notifyEmail || email.trim().length > 0) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return "Escribe un correo valido";
    }
    if (delivery === "domicilio" && address.trim().length < 5) {
      return "Para domicilio indica una direccion exacta";
    }
    return null;
  }

  function goReview(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep("review");
  }

  async function sendOrder() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          notifyEmail: notifyEmail && email.trim().length > 0,
          delivery,
          address: delivery === "domicilio" ? address.trim() : undefined,
          payment,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            productId: it.product.id,
            quantity: it.quantity,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { order?: OrderDTO; error?: string }
        | null;
      if (!res.ok || !data?.order) {
        throw new Error(data?.error ?? "No se pudo enviar el pedido");
      }
      setSuccess(data.order);
      saveMyOrder({
        id: data.order.id,
        number: data.order.number,
        totalCents: data.order.totalCents,
        payment: data.order.payment,
        delivery: data.order.delivery,
        itemCount: data.order.items.reduce((n, it) => n + it.quantity, 0),
        status: data.order.status,
      });
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30";
  const radioClass = (active: boolean) =>
    [
      "flex-1 cursor-pointer rounded-2xl border px-3 py-2.5 text-center text-sm font-medium transition-all duration-300",
      active
        ? "border-brand-400 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-300"
        : "border-stone-200 bg-white/60 text-stone-600 hover:border-brand-200 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
    ].join(" ");

  const deliveryLabel =
    delivery === "domicilio" ? "Domicilio (Uber)" : "Retiro / Entrega directa";
  const paymentLabel = payment === "transferencia" ? "Transferencia" : "Efectivo";

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={close}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur-md sm:p-8 dark:border-stone-700/60 dark:bg-stone-900/95"
      >
        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Pedido N° {success.number} registrado
            </h2>
            <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
              {success.delivery === "domicilio"
                ? "Te contactaremos para confirmar el costo del envio segun tu zona."
                : "Te contactaremos para coordinar la entrega."}{" "}
              Total: <strong>{formatMoney(success.totalCents)}</strong>.
            </p>

            {success.payment === "transferencia" && (
              <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="font-semibold">Pago por transferencia</p>
                <p className="mt-1">
                  Recuerda enviar tu comprobante de transferencia por WhatsApp
                  para confirmar el pago.
                </p>
                <a
                  href={businessWhatsAppLink(
                    `Hola! Adjunto el comprobante de transferencia de mi pedido N° ${success.number}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  Enviar comprobante por WhatsApp
                </a>
              </div>
            )}

            <div className="mt-1 flex w-full flex-col gap-2">
              <a
                href={orderTrackingPath(success.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600"
              >
                Ver estado de mi pedido
              </a>
              <a
                href={customerWhatsAppLink(success)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-all duration-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                Enviar detalle por WhatsApp
              </a>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Listo
              </button>
            </div>
          </div>
        ) : step === "review" ? (
          <>
            <h2 className="mb-1 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Revisa tus datos
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
              Verifica que todo este correcto antes de enviar el pedido.
            </p>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                <dt className="text-stone-500 dark:text-stone-400">Nombre</dt>
                <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                  {name}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                <dt className="text-stone-500 dark:text-stone-400">Telefono</dt>
                <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                  {phone}
                </dd>
              </div>
              {email.trim() && (
                <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                  <dt className="text-stone-500 dark:text-stone-400">Correo</dt>
                  <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                    {email}
                    {notifyEmail && email.trim()
                      ? " · con actualizaciones"
                      : ""}
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                <dt className="text-stone-500 dark:text-stone-400">Entrega</dt>
                <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                  {deliveryLabel}
                  {delivery === "domicilio" && address ? ` · ${address}` : ""}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                <dt className="text-stone-500 dark:text-stone-400">Pago</dt>
                <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                  {paymentLabel}
                </dd>
              </div>
              {notes.trim() && (
                <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                  <dt className="text-stone-500 dark:text-stone-400">Notas</dt>
                  <dd className="text-right font-medium text-stone-800 dark:text-stone-100">
                    {notes}
                  </dd>
                </div>
              )}
            </dl>

            <ul className="mt-4 flex flex-col gap-1 rounded-2xl border border-stone-200/70 px-4 py-3 text-sm dark:border-stone-700/70">
              {items.map((it) => (
                <li
                  key={it.product.id}
                  className="flex items-center justify-between gap-2 text-stone-600 dark:text-stone-300"
                >
                  <span className="min-w-0 truncate">
                    {it.quantity}× {it.product.name}
                  </span>
                  <span className="shrink-0">
                    {formatMoney(it.product.priceCents * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Subtotal
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {formatMoney(totalCents)}
              </span>
            </div>

            {delivery === "domicilio" && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                El costo del envio depende de tu zona y se confirma al
                contactarte.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Editar datos
              </button>
              <button
                type="button"
                onClick={sendOrder}
                disabled={submitting}
                className="flex-1 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Confirmar y enviar"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Finalizar pedido
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
              Subtotal: <strong>{formatMoney(totalCents)}</strong>. Sin pagos en
              linea: coordinas el pago al contactarte.
            </p>

            <form onSubmit={goReview} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  aria-label="Tu nombre"
                  maxLength={80}
                  className={inputClass}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Tu telefono (WhatsApp)"
                  aria-label="Tu telefono"
                  inputMode="tel"
                  maxLength={20}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <input
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmail(v);
                    if (v.trim().length === 0) setNotifyEmail(false);
                  }}
                  placeholder="Tu correo (opcional)"
                  aria-label="Tu correo"
                  inputMode="email"
                  maxLength={254}
                  className={inputClass}
                />
                {email.trim().length > 0 && (
                  <label className="flex items-start gap-2 rounded-2xl border border-stone-200 bg-white/60 px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                    />
                    <span>
                      Quiero recibir actualizaciones de mi pedido por correo
                      <span className="block text-xs text-stone-400 dark:text-stone-500">
                        Te avisamos cuando cambie el estado (confirmado, en
                        camino, entregado).
                      </span>
                    </span>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Entrega
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDelivery("retiro")}
                    aria-pressed={delivery === "retiro"}
                    className={radioClass(delivery === "retiro")}
                  >
                    Retiro / Entrega directa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery("domicilio")}
                    aria-pressed={delivery === "domicilio"}
                    className={radioClass(delivery === "domicilio")}
                  >
                    Domicilio (Uber)
                  </button>
                </div>
              </div>

              {delivery === "domicilio" && (
                <div className="space-y-1.5">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Direccion exacta con punto de referencia"
                    aria-label="Direccion exacta de entrega"
                    maxLength={200}
                    className={inputClass}
                  />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Escribe la direccion completa (calle, casa, colonia y una
                    referencia). El costo del envio depende de la zona y se
                    confirma al contactarte.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Forma de pago
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayment("efectivo")}
                    aria-pressed={payment === "efectivo"}
                    className={radioClass(payment === "efectivo")}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayment("transferencia")}
                    aria-pressed={payment === "transferencia"}
                    className={radioClass(payment === "transferencia")}
                  >
                    Transferencia
                  </button>
                </div>
                {payment === "transferencia" && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Si pagas por transferencia, despues de enviar el pedido
                    podras enviarnos el comprobante por WhatsApp.
                  </p>
                )}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas (opcional)"
                aria-label="Notas"
                maxLength={300}
                rows={2}
                className={inputClass}
              />

              {error && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Revisar y continuar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
