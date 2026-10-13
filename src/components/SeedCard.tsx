"use client";

import type { ProductDTO } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { isOrderable } from "@/lib/orders";
import { useCart } from "./cart/CartProvider";
import AvailabilityBadge from "./AvailabilityBadge";
import SeedImage from "./SeedImage";

type Variant = "grid" | "compact" | "list";

interface Props {
  product: ProductDTO;
  onSelect: (product: ProductDTO) => void;
  onOpenCart?: () => void;
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

function CartIcon() {
  return (
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
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.5-1.2L21 7H5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AddButton({
  product,
  withLabel = false,
  onOpenCart,
  className,
}: {
  product: ProductDTO;
  withLabel?: boolean;
  onOpenCart?: () => void;
  className?: string;
}) {
  const { items, add } = useCart();
  const inCart = items.some((it) => it.product.id === product.id);
  if (!isOrderable(product)) return null;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (inCart) {
      onOpenCart?.();
      return;
    }
    add(product);
  }

  const base = withLabel
    ? "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300 hover:shadow-md"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-300 hover:shadow-md";
  const tone = inCart
    ? "bg-emerald-500 text-white hover:bg-emerald-600"
    : "bg-brand-500 text-white hover:bg-brand-600";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Agregar ${product.name} al pedido`}
      className={[base, tone, className ?? ""].join(" ")}
    >
      {inCart ? <CheckIcon /> : <CartIcon />}
      {withLabel && <span>{inCart ? "Agregado" : "Agregar"}</span>}
    </button>
  );
}

export default function SeedCard({
  product,
  onSelect,
  onOpenCart,
  index = 0,
  variant = "grid",
}: Props) {
  const style = { animationDelay: `${Math.min(index, 12) * 90}ms` };
  const hasPrice = product.priceCents > 0;
  const price = hasPrice ? formatMoney(product.priceCents) : "Consultar";

  function keyActivate(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(product);
    }
  }

  if (variant === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(product)}
        onKeyDown={keyActivate}
        style={style}
        className="group animate-fade-in-up flex cursor-pointer items-center gap-4 rounded-2xl border border-stone-200/70 bg-white/70 p-3 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-stone-800/70 dark:bg-stone-900/70 dark:hover:border-brand-500/40"
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
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {product.name}
          </h3>
          <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
            {price}
          </p>
        </div>
        <AvailabilityBadge status={product.status} size="sm" />
        {hasPrice ? (
          <AddButton product={product} withLabel onOpenCart={onOpenCart} />
        ) : (
          <Arrow />
        )}
      </div>
    );
  }

  const compact = variant === "compact";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product)}
      onKeyDown={keyActivate}
      style={style}
      className={[
        "group animate-fade-in-up flex cursor-pointer flex-col overflow-hidden border border-stone-200/70 bg-white/70 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-stone-800/70 dark:bg-stone-900/70 dark:hover:border-brand-500/40 dark:hover:shadow-brand-500/10",
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
        {compact && (
          <div className="absolute bottom-2 right-2">
            <AddButton product={product} onOpenCart={onOpenCart} />
          </div>
        )}
      </div>

      <div
        className={[
          "flex flex-1 flex-col gap-1",
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
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span
              className={[
                "font-bold text-brand-600 dark:text-brand-400",
                compact ? "text-sm" : "text-lg",
              ].join(" ")}
            >
              {price}
            </span>
            {!compact && hasPrice && product.stock > 0 && (
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {product.stock} disponibles
              </span>
            )}
          </div>
          {!compact && (
            <AddButton product={product} withLabel onOpenCart={onOpenCart} />
          )}
        </div>
      </div>
    </div>
  );
}