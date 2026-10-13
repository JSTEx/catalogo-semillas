"use client";

import { useCart } from "./CartProvider";
import SeedImage from "../SeedImage";
import { formatMoney } from "@/lib/money";
import { businessWhatsAppLink } from "@/lib/orders";

interface Props {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export default function CartDrawer({ open, onClose, onCheckout }: Props) {
  const { items, count, totalCents, setQuantity, remove, clear } = useCart();

  if (!open) return null;

  const waText = [
    "Hola! Quiero hacer este pedido:",
    ...items.map(
      (it) =>
        `- ${it.product.name} x${it.quantity} (${formatMoney(
          it.product.priceCents * it.quantity,
        )})`,
    ),
    `Total: ${formatMoney(totalCents)}`,
  ].join("\n");

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-in-right relative z-10 flex h-full w-full max-w-md flex-col border-l border-stone-200/60 bg-white/95 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/95"
        aria-label="Tu pedido"
      >
        <header className="flex items-center justify-between border-b border-stone-200/60 px-5 py-4 dark:border-stone-800/60">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Tu pedido
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {count} {count === 1 ? "articulo" : "articulos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-stone-500 dark:text-stone-400">
              Tu pedido esta vacio. Agrega productos para empezar.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((it) => (
                <li
                  key={it.product.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 p-2.5 dark:border-stone-800/70 dark:bg-stone-900/70"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                    <SeedImage
                      src={it.product.imageUrl}
                      alt={it.product.name}
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {it.product.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {formatMoney(it.product.priceCents)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(it.product.id, it.quantity - 1)
                      }
                      aria-label="Quitar uno"
                      disabled={it.quantity <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M5 12h14" /></svg>
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(
                          it.product.id,
                          Math.min(
                            it.product.stock > 0 ? it.product.stock : 99,
                            it.quantity + 1,
                          ),
                        )
                      }
                      aria-label="Agregar uno"
                      disabled={
                        it.product.stock > 0 && it.quantity >= it.product.stock
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(it.product.id)}
                    aria-label={`Quitar ${it.product.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                  </button>
                  {it.product.stock > 0 && it.quantity >= it.product.stock && (
                    <p className="basis-full text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Solo {it.product.stock}{" "}
                      {it.product.stock === 1
                        ? "unidad disponible"
                        : "unidades disponibles"}
                      . Si necesitas mas, escribenos por WhatsApp.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-stone-200/60 px-5 py-4 dark:border-stone-800/60">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Subtotal
              </span>
              <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {formatMoney(totalCents)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onCheckout}
                className="w-full rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg"
              >
                Finalizar pedido
              </button>
              <a
                href={businessWhatsAppLink(waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-all duration-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                <WhatsAppIcon />
                Pedir por WhatsApp
              </a>
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-stone-400 transition-colors hover:text-red-500 dark:text-stone-500"
              >
                Vaciar carrito
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-stone-400 dark:text-stone-500">
              Si eliges domicilio, el costo del envio se confirma al contactarte.
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}