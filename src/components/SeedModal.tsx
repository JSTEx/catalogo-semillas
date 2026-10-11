"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { ProductDTO } from "@/lib/types";
import AvailabilityBadge from "./AvailabilityBadge";

interface Props {
  product: ProductDTO | null;
  onClose: () => void;
}

export default function SeedModal({ product, onClose }: Props) {
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

  if (!product) return null;

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
          <div className="relative aspect-square w-full bg-stone-100 dark:bg-stone-800">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
            <div className="space-y-3">
              <AvailabilityBadge
                available={product.isAvailable}
                withPulse
              />
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl dark:text-stone-100">
                {product.name}
              </h2>
              <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                {product.isAvailable
                  ? "Esta variedad esta disponible actualmente. Contactanos para reservar tu pedido."
                  : "Por el momento esta variedad no tiene existencias. Vuelve pronto o consulta otras opciones."}
              </p>
            </div>

            <dl className="space-y-2 border-t border-stone-200/80 pt-4 text-sm dark:border-stone-800/80">
              <div className="flex items-center justify-between">
                <dt className="text-stone-400 dark:text-stone-500">Disponibilidad</dt>
                <dd className="font-medium text-stone-700 dark:text-stone-200">
                  {product.isAvailable ? "En existencia" : "Sin existencias"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
