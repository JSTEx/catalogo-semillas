"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";
import {
  businessWhatsAppLink,
  customerWhatsAppLink,
  orderTrackingPath,
} from "@/lib/orders";
import { saveMyOrder } from "@/lib/my-order";
import type { OrderDTO } from "@/lib/types";
import {
  EL_SALVADOR_DEPARTMENTS,
  HOME_DELIVERY_FEE_CENTS,
} from "@/lib/delivery";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Delivery = "retiro" | "domicilio";
type Payment = "efectivo" | "transferencia";
type Step = "form" | "review";

function DepartmentPicker({
  value,
  onChange,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = EL_SALVADOR_DEPARTMENTS.filter((department) =>
    department.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")),
  );

  return (
    <div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${inputClass} flex items-center justify-between gap-3 text-left`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${value ? "" : "text-stone-500 dark:text-stone-400"}`}
        >
          {value || "Elige departamento"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar departamento"
            aria-label="Buscar departamento"
            autoComplete="off"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-400"
          />
          <div
            role="listbox"
            aria-label="Departamentos de El Salvador"
            className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto"
          >
            {filtered.map((department) => (
              <button
                type="button"
                role="option"
                aria-selected={value === department}
                key={department}
                onClick={() => {
                  onChange(department);
                  setOpen(false);
                  setQuery("");
                }}
                className={[
                  "w-full rounded-xl px-3 py-2.5 text-left text-sm leading-5 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10",
                  value === department
                    ? "bg-brand-50 font-semibold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200"
                    : "text-stone-700 dark:text-stone-200",
                ].join(" ")}
              >
                {department}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-2 px-3 py-4 text-center text-sm text-stone-500 dark:text-stone-400">
                No encontramos ese departamento.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutModal({ open, onClose }: Props) {
  const { items, totalCents, clear } = useCart();
  const { data: session, status: sessionStatus } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>("retiro");
  const [department, setDepartment] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<Payment>("efectivo");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderDTO | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Prellena nombre y correo del usuario logueado (sin pisar lo que escriba).
  useEffect(() => {
    if (!open) {
      setPrefilled(false);
      return;
    }
    if (prefilled || sessionStatus === "loading") return;
    if (session?.user) {
      setName((value) => value || session.user?.name || "");
      setEmail((value) => value || session.user?.email || "");
    }
    setPrefilled(true);
  }, [open, prefilled, session, sessionStatus]);

  if (!open) return null;

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setNotifyEmail(false);
    setDelivery("retiro");
    setDepartment("");
    setMunicipality("");
    setStreetAddress("");
    setReference("");
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
    if (delivery === "domicilio") {
      if (!department) return "Selecciona un departamento";
      if (municipality.trim().length < 2) return "Escribe el municipio";
      if (streetAddress.trim().length < 5) {
        return "Escribe la dirección exacta";
      }
      if (reference.trim().length < 2) {
        return "Escribe una referencia para ubicarte";
      }
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
          department: delivery === "domicilio" ? department : undefined,
          municipality:
            delivery === "domicilio" ? municipality.trim() : undefined,
          streetAddress:
            delivery === "domicilio" ? streetAddress.trim() : undefined,
          reference: delivery === "domicilio" ? reference.trim() : undefined,
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
    delivery === "domicilio" ? "Envío a domicilio" : "Retiro / Entrega directa";
  const paymentLabel = payment === "transferencia" ? "Transferencia" : "Efectivo";
  const shippingCents =
    delivery === "domicilio" ? HOME_DELIVERY_FEE_CENTS : 0;
  const orderTotalCents = totalCents + shippingCents;
  const deliveryAddress = [
    `Departamento: ${department}`,
    `Municipio: ${municipality}`,
    `Dirección exacta: ${streetAddress}`,
    `Referencia: ${reference}`,
  ].join("\n");

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />
      <div
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
                ? `El envío a domicilio tiene una tarifa fija de ${formatMoney(HOME_DELIVERY_FEE_CENTS)}.`
                : "Te contactaremos para coordinar la entrega."}{" "}
              Total del pedido:{" "}
              <strong>{formatMoney(success.totalCents)}</strong>.
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
                </dd>
              </div>
              {delivery === "domicilio" && (
                <div className="rounded-2xl bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
                  <dt className="text-stone-500 dark:text-stone-400">
                    Dirección de entrega
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-right font-medium text-stone-800 dark:text-stone-100">
                    {deliveryAddress}
                  </dd>
                </div>
              )}
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

            <dl className="mt-3 space-y-2 rounded-2xl bg-stone-50/80 px-4 py-3 text-sm dark:bg-stone-800/50">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500 dark:text-stone-400">Subtotal</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-100">
                  {formatMoney(totalCents)}
                </dd>
              </div>
              {delivery === "domicilio" && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500 dark:text-stone-400">
                    Envío a domicilio (tarifa fija)
                  </dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-100">
                    {formatMoney(shippingCents)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2 dark:border-stone-700">
                <dt className="font-semibold text-stone-700 dark:text-stone-200">
                  Total
                </dt>
                <dd className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {formatMoney(orderTotalCents)}
                </dd>
              </div>
            </dl>

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
              Subtotal: <strong>{formatMoney(totalCents)}</strong>
              {delivery === "domicilio" && (
                <>
                  {" "}
                  · Envío a domicilio:{" "}
                  <strong>{formatMoney(HOME_DELIVERY_FEE_CENTS)}</strong>
                </>
              )}
              . El total final se muestra antes de confirmar. El pago se
              coordina al contactarte.
            </p>

            <form onSubmit={goReview} className="space-y-4">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Los campos marcados con * son obligatorios.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                  Nombre completo *
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    aria-label="Nombre completo"
                    autoComplete="name"
                    required
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                  Teléfono *
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Tu teléfono (WhatsApp)"
                    aria-label="Teléfono"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={20}
                    className={inputClass}
                  />
                </label>
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
                    onClick={() => {
                      setDelivery("domicilio");
                      setPayment("transferencia");
                    }}
                    aria-pressed={delivery === "domicilio"}
                    className={radioClass(delivery === "domicilio")}
                  >
                    Envío a domicilio
                  </button>
                </div>
              </div>

              {delivery === "domicilio" && (
                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-800/40">
                  <div>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      Datos para coordinar el envío
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Completa estos datos para que la empresa de mensajería
                      pueda ubicarte.
                    </p>
                  </div>
                  <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                    Tarifa fija de envío: {formatMoney(HOME_DELIVERY_FEE_CENTS)}
                  </p>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Envío a domicilio: pago únicamente por transferencia.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                      Departamento *
                      <DepartmentPicker
                        value={department}
                        onChange={setDepartment}
                        inputClass={inputClass}
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                      Municipio *
                      <input
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        placeholder="Tu municipio"
                        aria-label="Municipio"
                        autoComplete="address-level2"
                        maxLength={80}
                        required
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                    Dirección exacta *
                    <input
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Calle, colonia y número de casa"
                      aria-label="Dirección exacta"
                      autoComplete="street-address"
                      maxLength={200}
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                    Referencia para ubicarte *
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej. portón negro, última casa a la izquierda"
                      aria-label="Referencia para ubicarte"
                      maxLength={180}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Forma de pago
                </span>
                <div className="flex gap-2">
                  {delivery === "retiro" && (
                    <button
                      type="button"
                      onClick={() => setPayment("efectivo")}
                      aria-pressed={payment === "efectivo"}
                      className={radioClass(payment === "efectivo")}
                    >
                      Efectivo
                    </button>
                  )}
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
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {delivery === "domicilio"
                      ? "Envía tu comprobante por WhatsApp; coordinaremos el envío al confirmar el pago."
                      : "Envía tu comprobante por WhatsApp para confirmar tu pago."}
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
