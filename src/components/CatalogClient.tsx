"use client";

import { useEffect, useMemo, useState } from "react";
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
import { businessWhatsAppLink } from "@/lib/orders";
import SeedCard from "./SeedCard";
import SeedModal from "./SeedModal";
import ThemeToggle from "./ThemeToggle";
import ViewToggle from "./ViewToggle";
import MyOrderLink from "./MyOrderLink";
import { CartProvider, useCart } from "./cart/CartProvider";
import CartButton from "./cart/CartButton";
import SignInButton from "./auth/SignInButton";
import CartDrawer from "./cart/CartDrawer";
import CheckoutModal from "./cart/CheckoutModal";
import AdminQuickLink from "./AdminQuickLink";

type Filter = "all" | ProductStatus;

interface Props {
  initialProducts: ProductDTO[];
}

/** Sincroniza el carrito guardado con el catalogo recien cargado. */
function CartSync({ products }: { products: ProductDTO[] }) {
  const { sync, loaded } = useCart();
  useEffect(() => {
    if (loaded) sync(products);
  }, [loaded, products, sync]);
  return null;
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
      <CartSync products={initialProducts} />
      <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
              <Image
                src="/logo.png"
                alt=""
                width={720}
                height={720}
                aria-hidden="true"
                priority
                className="h-7 w-7 dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt=""
                width={720}
                height={720}
                aria-hidden="true"
                priority
                className="hidden h-7 w-7 dark:block"
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

          <div className="relative order-last w-full min-w-0 lg:order-none lg:w-auto lg:max-w-md lg:flex-1">
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

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <MyOrderLink />
            <SignInButton />
            <div className="hidden sm:block">
              <ViewToggle value={view} onChange={setView} />
            </div>
            <AdminQuickLink />
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6">
          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={[
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300",
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
          </div>

          {categories.length > 0 && (
            <label className="relative shrink-0">
              <span className="sr-only">Filtrar por categoria</span>
              <select
                value={category ?? ""}
                onChange={(e) =>
                  setCategory(e.target.value === "" ? null : e.target.value)
                }
                className="h-9 cursor-pointer appearance-none rounded-full border border-stone-200 bg-white/70 pl-4 pr-9 text-sm font-medium text-stone-600 shadow-sm outline-none backdrop-blur-md transition-all duration-300 hover:border-brand-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
              >
                <option value="">Todas las categorias</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} ({c.count})
                  </option>
                ))}
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>
          )}
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
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 sm:px-6">
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
            ¿Tienes preguntas? Contáctanos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href={businessWhatsAppLink(
                "Hola JecsitoShop, quiero hacer una consulta.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp: +503 7328 2078"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>
            <a
              href="mailto:jecsitoshop@gmail.com"
              title="jecsitoshop@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3 6 9 6 9-6" />
              </svg>
              jecsitoshop@gmail.com
            </a>
          </div>
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
