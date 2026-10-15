"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import MyOrderLink from "./MyOrderLink";
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
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [view, setView] = useViewMode("catalog-view", "grid");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const matching = initialProducts.filter((p) => {
      const matchesQuery =
        q === "" ||
        normalizeSearch(p.name).includes(q) ||
        normalizeSearch(p.category).includes(q) ||
        normalizeSearch(p.description ?? "").includes(q);
      const matchesFilter = filter === "all" ? true : p.status === filter;
      const matchesCategory =
        category === null || normalizeSearch(p.category) === category;
      return matchesQuery && matchesFilter && matchesCategory;
    });
    return sortByStatus(matching);
  }, [initialProducts, query, filter, category]);

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const p of initialProducts) {
      const raw = (p.category ?? "").trim();
      if (!raw) continue;
      const key = normalizeSearch(raw);
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { label: raw, count: 1 });
    }
    return Array.from(map, ([key, v]) => ({
      key,
      label: v.label,
      count: v.count,
    })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [initialProducts]);

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
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 shadow-sm">
              <Image
                src="/logo.png"
                alt=""
                width={146}
                height={96}
                aria-hidden="true"
                className="h-5 w-auto"
              />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                JecsitoShop
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Catalogo en linea
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
              placeholder="Buscar producto..."
              aria-label="Buscar producto"
              className="w-full rounded-2xl border border-stone-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-800 shadow-sm outline-none backdrop-blur-md transition-all duration-300 placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 gap-y-3 px-4 pb-4 sm:px-6">
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
          <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            <MyOrderLink />
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

        {categories.length > 0 && (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
            <span className="mr-1 text-xs font-medium text-stone-400 dark:text-stone-500">
              Categoria
            </span>
            {[
              { key: null as string | null, label: "Todas", count: initialProducts.length },
              ...categories,
            ].map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key ?? "all"}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300",
                    active
                      ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                      : "border-stone-200 bg-white/70 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300",
                  ].join(" ")}
                >
                  {c.label}
                  <span
                    className={[
                      "rounded-full px-1.5 text-[10px]",
                      active
                        ? "bg-white/25 text-white"
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
                    ].join(" ")}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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
              No se encontraron productos
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
          <p>JecsitoShop · {new Date().getFullYear()}</p>
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
