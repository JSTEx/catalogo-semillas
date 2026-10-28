"use client";

import { useCart } from "./CartProvider";
import SeedImage from "../SeedImage";
import { formatMoney } from "@/lib/money";
import { useBackdropClose } from "@/lib/use-backdrop-close";

interface Props {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({ open, onClose, onCheckout }: Props) {
  const { items, count, totalCents, setQuantity, remove, clear } = useCart();
  const backdrop = useBackdropClose(onClose);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex justify-end"
      {...backdrop}
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
                  className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700/70 dark:bg-stone-900/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/70 dark:bg-stone-800 dark:ring-stone-700/70">
                      <SeedImage
                        src={it.product.imageUrl}
                        alt={it.product.name}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800 dark:text-stone-100">
                        {it.product.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                        {formatMoney(it.product.priceCents)} <span className="text-xs font-normal text-stone-500 dark:text-stone-400">c/u</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(it.product.id)}
                      aria-label={`Quitar ${it.product.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 p-1 dark:border-stone-700 dark:bg-stone-800/70">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(it.product.id, it.quantity - 1)
                        }
                        aria-label="Quitar uno"
                        disabled={it.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-white disabled:opacity-40 dark:text-stone-200 dark:hover:bg-stone-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M5 12h14" /></svg>
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-stone-900 dark:text-stone-100">
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
                        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-white disabled:opacity-40 dark:text-stone-200 dark:hover:bg-stone-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {formatMoney(it.product.priceCents * it.quantity)}
                    </p>
                  </div>
                  {it.product.stock > 0 && it.quantity >= it.product.stock && (
                    <p className="basis-full text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Alcanzaste el maximo disponible de este producto. Si
                      necesitas mas, escribenos por WhatsApp.
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
              <button
                type="button"
                onClick={clear}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
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