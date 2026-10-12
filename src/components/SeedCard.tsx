"use client";

import type { ProductDTO } from "@/lib/types";
import AvailabilityBadge from "./AvailabilityBadge";
import SeedImage from "./SeedImage";

type Variant = "grid" | "compact" | "list";

interface Props {
  product: ProductDTO;
  onSelect: (product: ProductDTO) => void;
  index?: number;
  variant?: Variant;
}

function Arrow() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white dark:bg-stone-800 dark:text-stone-400">
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
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </span>
  );
}

export default function SeedCard({
  product,
  onSelect,
  index = 0,
  variant = "grid",
}: Props) {
  const style = { animationDelay: `${Math.min(index, 12) * 90}ms` };

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={() => onSelect(product)}
        style={style}
        className="group animate-fade-in-up flex items-center gap-4 rounded-2xl border border-stone-200/70 bg-white/70 p-3 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-stone-800/70 dark:bg-stone-900/70 dark:hover:border-brand-500/40"
        aria-label={`Ver detalle de ${product.name}`}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
          <SeedImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="64px"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          {product.name}
        </h3>
        <AvailabilityBadge status={product.status} size="sm" />
        <Arrow />
      </button>
    );
  }

  const compact = variant === "compact";
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      style={style}
      className={[
        "group animate-fade-in-up flex flex-col overflow-hidden border border-stone-200/70 bg-white/70 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-stone-800/70 dark:bg-stone-900/70 dark:hover:border-brand-500/40 dark:hover:shadow-brand-500/10",
        compact ? "rounded-2xl" : "rounded-3xl",
      ].join(" ")}
      aria-label={`Ver detalle de ${product.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        <SeedImage
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes={
            compact
              ? "(max-width: 640px) 50vw, 20vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          }
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className={[
            "absolute",
            compact ? "right-2 top-2" : "right-3 top-3",
          ].join(" ")}
        >
          <AvailabilityBadge status={product.status} withPulse size="sm" />
        </div>
        {!compact && (
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-stone-900/45 px-2 py-0.5 text-[9px] font-medium leading-tight text-white/90 backdrop-blur-sm">
            Imagen ilustrativa
          </span>
        )}
      </div>

      <div
        className={[
          "flex flex-1 items-center justify-between gap-3",
          compact ? "px-3 py-2.5" : "px-4 py-4",
        ].join(" ")}
      >
        <h3
          className={[
            "line-clamp-2 font-semibold text-stone-800 dark:text-stone-100",
            compact ? "text-xs" : "text-base",
          ].join(" ")}
        >
          {product.name}
        </h3>
        {!compact && <Arrow />}
      </div>
    </button>
  );
}
