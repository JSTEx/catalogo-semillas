"use client";

import Image from "next/image";
import type { ProductDTO } from "@/lib/types";
import AvailabilityBadge from "./AvailabilityBadge";

interface Props {
  product: ProductDTO;
  onSelect: (product: ProductDTO) => void;
  index?: number;
}

export default function SeedCard({ product, onSelect, index = 0 }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className="group animate-fade-in-up flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white/70 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      aria-label={`Ver detalle de ${product.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute right-3 top-3">
          <AvailabilityBadge available={product.isAvailable} withPulse />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
        <h3 className="line-clamp-2 text-base font-semibold text-stone-800">
          {product.name}
        </h3>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white">
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
      </div>
    </button>
  );
}
