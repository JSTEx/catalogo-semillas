"use client";

import { useEffect, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import { statusMeta } from "@/lib/product-status";
import { formatMoney } from "@/lib/money";
import { isOrderable } from "@/lib/orders";
import { useCart } from "./cart/CartProvider";
import AvailabilityBadge from "./AvailabilityBadge";
import SeedImage from "./SeedImage";

interface Props {
  product: ProductDTO | null;
  onClose: () => void;
  onOpenCart?: () => void;
}

export default function SeedModal({ product, onClose, onOpenCart }: Props) {
  const { add, items } = useCart();
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [pointerKind, setPointerKind] = useState<"mouse" | "touch" | "pen">(
    () =>
      typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
        ? "mouse"
        : "touch",
  );

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  useEffect(() => {
    setZoom(false);
    setOrigin("50% 50%");
  }, [product]);

  if (!product) return null;

  const inCart = items.some((it) => it.product.id === product.id);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x =
      rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
    const y =
      rect.height > 0 ? ((e.clientY - rect.top) / rect.height) * 100 : 50;
    setOrigin(`${x}% ${y}%`);
    setZoom(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-md dark:border-stone-700/60 dark:bg-stone-900/85"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-stone-900 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
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

        <div className="grid gap-0 md:grid-cols-2">
          <div
            className="group relative aspect-square w-full touch-manipulation bg-stone-100 dark:bg-stone-800"
            onPointerMove={handlePointerMove}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setZoom(false);
            }}
            onPointerDown={(e) => {
              setPointerKind(e.pointerType);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (pointerKind !== "mouse") {
                setZoom((z) => !z);
                setOrigin("50% 50%");
              }
            }}
          >
            <div
              className={[
                "absolute inset-0 transition-transform duration-500 ease-out",
                zoom ? "scale-[2]" : "scale-100",
              ].join(" ")}
              style={{ transformOrigin: origin }}
            >
              <SeedImage
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                priority
              />
            </div>

            <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-stone-600 shadow-sm backdrop-blur-md dark:bg-stone-800/80 dark:text-stone-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
              </svg>
              {pointerKind === "mouse" ? "Pasa el mouse" : "Toca para ampliar"}
            </span>
          </div>

          <div className="flex max-h-[45vh] flex-col justify-between gap-6 overflow-y-auto p-6 md:max-h-none md:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge status={product.status} withPulse />
                {product.category && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    {product.category}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl dark:text-stone-100">
                {product.name}
              </h2>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {product.description || statusMeta(product.status).description}
              </p>
            </div>

            <dl className="space-y-2 border-t border-stone-200/80 pt-4 text-sm dark:border-stone-800/80">
              <div className="flex items-center justify-between">
                <dt className="text-stone-400 dark:text-stone-500">Disponibilidad</dt>
                <dd className="font-medium text-stone-700 dark:text-stone-200">
                  {statusMeta(product.status).availability}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-stone-400 dark:text-stone-500">Actualizado</dt>
                <dd className="font-medium text-stone-700 dark:text-stone-200">
                  {new Date(product.updatedAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-stone-200/80 pt-4 dark:border-stone-800/80">
              <div>
                <p className="text-xs text-stone-400 dark:text-stone-500">Precio</p>
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {product.priceCents > 0
                    ? formatMoney(product.priceCents)
                    : "Consultar"}
                </p>
              </div>
              {isOrderable(product) && (
                <button
                  type="button"
                  onClick={() => {
                    if (inCart) {
                      onOpenCart?.();
                      onClose();
                      return;
                    }
                    add(product);
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300",
                    inCart
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-brand-500 hover:bg-brand-600 hover:shadow-lg",
                  ].join(" ")}
                >
                  {inCart ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.5-1.2L21 7H5" /></svg>
                  )}
                  {inCart ? "Ver en el pedido" : "Agregar al pedido"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
