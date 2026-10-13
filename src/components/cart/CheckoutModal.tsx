"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";
import { customerWhatsAppLink } from "@/lib/orders";
import type { OrderDTO } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Delivery = "retiro" | "domicilio";
type Payment = "efectivo" | "transferencia";

export default function CheckoutModal({ open, onClose }: Props) {
  const { items, totalCents, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("retiro");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderDTO | null>(null);

  if (!open) return null;

  function reset() {
    setName("");
    setPhone("");
    setDelivery("retiro");
    setAddress("");
    setPayment("efectivo");
    setNotes("");
    setError(null);
    setSuccess(null);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Escribe tu nombre");
    if (phone.trim().length < 7) return setError("Escribe un telefono valido");
    if (delivery === "domicilio" && address.trim().length < 5) {
      return setError("Para domicilio indica una direccion");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
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
                ? "Te contactaremos para confirmar el costo del envio a domicilio."
                : "Te contactaremos para coordinar la entrega."}{" "}
              Total: <strong>{formatMoney(success.totalCents)}</strong>.
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
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
                className="w-full rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Finalizar pedido
            </h2>
            <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
              Subtotal: <strong>{formatMoney(totalCents)}</strong>. Sin pagos en
              linea: coordinas el pago al contactarte.
            </p>

            <form onSubmit={submit} className="space-y-4">
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
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Direccion de entrega"
                  aria-label="Direccion de entrega"
                  maxLength={200}
                  className={inputClass}
                />
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
                  {submitting ? "Enviando..." : "Enviar pedido"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}