"use client";

import { useMemo, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import {
  PRODUCT_STATUSES,
  STATUS_META,
  sortByStatus,
} from "@/lib/product-status";
import type { ProductStatus } from "@/lib/product-status";
import { normalizeSearch } from "@/lib/search";
import { useViewMode } from "@/lib/use-view-mode";
import SeedCard from "./SeedCard";
import SeedModal from "./SeedModal";
import ThemeToggle from "./ThemeToggle";
import ViewToggle from "./ViewToggle";
import { CartProvider } from "./cart/CartProvider";
import CartButton from "./cart/CartButton";
import CartDrawer from "./cart/CartDrawer";
import CheckoutModal from "./cart/CheckoutModal";

type Filter = "all" | ProductStatus;

interface Props {
  initialProducts: ProductDTO[];
}

const GRID_CLASSES: Record<string, string> = {
  grid: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  compact:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  list: "flex flex-col gap-3",
};

export default function CatalogClient({ initialProducts }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [view, setView] = useViewMode("catalog-view", "grid");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const matching = initialProducts.filter((p) => {
      const matchesQuery = q === "" || normalizeSearch(p.name).includes(q);
      const matchesFilter = filter === "all" ? true : p.status === filter;
      return matchesQuery && matchesFilter;
    });
    return sortByStatus(matching);
  }, [initialProducts, query, filter]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: initialProducts.length };
    for (const s of PRODUCT_STATUSES) base[s] = 0;
    for (const p of initialProducts) base[p.status] = (base[p.status] ?? 0) + 1;
    return base;
  }, [initialProducts]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: counts.all },
    ...PRODUCT_STATUSES.map((s) => ({
      key: s,
      label: STATUS_META[s].short,
      count: counts[s] ?? 0,
    })),
  ];

  return (
    <CartProvider>
      <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 22V12" />
                <path d="M12 12c0-4 3-7 8-7 0 5-3 8-8 8Z" />
                <path d="M12 12C12 8 9 5 4 5c0 5 3 8 8 8Z" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Catalogo de Semillas
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Disponibilidad en tiempo real
              </p>
            </div>
          </div>

          <div className="relative w-full lg:max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar semilla..."
              aria-label="Buscar semilla"
              className="w-full rounded-2xl border border-stone-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-800 shadow-sm outline-none backdrop-blur-md transition-all duration-300 placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300",
                filter === f.key
                  ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                  : "border-stone-200 bg-white/70 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300",
              ].join(" ")}
            >
              {f.label}
              <span
                className={[
                  "rounded-full px-1.5 text-xs",
                  filter === f.key
                    ? "bg-white/25 text-white"
                    : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
                ].join(" ")}
              >
                {f.count}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <a
              href="/admin"
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/20"
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
                <path d="M12 5v14M5 12h14" />
              </svg>
              Productos
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {filtered.length === 0 ? (
          <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/50 py-24 text-center backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <p className="text-base font-semibold text-stone-700 dark:text-stone-200">
              No se encontraron semillas
            </p>
            <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
              Prueba con otro termino de busqueda o cambia el filtro de
              disponibilidad.
            </p>
          </div>
        ) : (
          <div className={GRID_CLASSES[view]}>
            {filtered.map((product, index) => (
              <SeedCard
                key={product.id}
                product={product}
                index={index}
                variant={view}
                onSelect={setSelected}
                onOpenCart={() => setCartOpen(true)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200/60 py-8 text-center text-xs text-stone-400 dark:border-stone-800/60 dark:text-stone-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 sm:px-6">
          <p>Catalogo de Semillas · {new Date().getFullYear()}</p>
          <p className="text-[11px] text-stone-400/80 dark:text-stone-500/80">
            Las imagenes son con fines ilustrativos.
          </p>
        </div>
      </footer>

      <SeedModal
        product={selected}
        onClose={() => setSelected(null)}
        onOpenCart={() => setCartOpen(true)}
      />

      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
    </CartProvider>
  );
}
