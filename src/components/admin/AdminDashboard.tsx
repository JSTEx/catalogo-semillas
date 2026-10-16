"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ExpenseDTO, OrderDTO, ProductDTO } from "@/lib/types";
import { PRODUCT_STATUSES, STATUS_META, sortByStatus } from "@/lib/product-status";
import type { ProductStatus } from "@/lib/product-status";
import { normalizeSearch } from "@/lib/search";
import { useViewMode } from "@/lib/use-view-mode";
import { formatMoney } from "@/lib/money";
import { MAX_PRODUCT_IMAGES, SUGGESTED_CATEGORIES } from "@/lib/validation";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import ThemeToggle from "@/components/ThemeToggle";
import ViewToggle from "@/components/ViewToggle";
import Loader from "@/components/Loader";
import SeedImage from "@/components/SeedImage";
import AdminOrders from "./AdminOrders";
import AdminStats from "./AdminStats";
import ImageStudio from "./ImageStudio";

interface Props {
  initialProducts: ProductDTO[];
  initialOrders: OrderDTO[];
  initialExpenses: ExpenseDTO[];
  username: string;
}

interface FormState {
  id?: string;
  name: string;
  category: string;
  description: string;
  status: ProductStatus;
  images: string[];
  priceCents: number;
  priceText: string;
  stock: number;
}

type StatusFilter = "all" | ProductStatus;
type SortKey = "status" | "name" | "recent" | "oldest";

const emptyForm: FormState = {
  name: "",
  category: "otros",
  description: "",
  status: "available",
  images: [],
  priceCents: 0,
  priceText: "",
  stock: 0,
};

function centsToText(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}

function textToCents(text: string): number {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "status", label: "Estado (recomendado)" },
  { key: "name", label: "Nombre (A-Z)" },
  { key: "recent", label: "Mas recientes" },
  { key: "oldest", label: "Mas antiguos" },
];

const GRID_CLASSES: Record<string, string> = {
  grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  compact:
    "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  list: "flex flex-col gap-2",
};

export default function AdminDashboard({ initialProducts, initialOrders, initialExpenses, username }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ProductDTO[]>(initialProducts);
  const [orders, setOrders] = useState<OrderDTO[]>(initialOrders);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>(initialExpenses);
  const [tab, setTab] = useState<"products" | "orders" | "stats">("products");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("status");
  const [view, setView] = useViewMode("admin-view", "grid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onFileChangeRef = useRef(onFileChange);

  useEffect(() => {
    onFileChangeRef.current = onFileChange;
  });

  // Mantiene el panel sincronizado con los datos del servidor (tiempo real).
  useEffect(() => {
    setItems(initialProducts);
  }, [initialProducts]);
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  useEffect(() => {
    if (!form) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) onFileChangeRef.current([file]);
          return;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [form]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const list = items.filter((p) => {
      const matchesQuery = !q || normalizeSearch(p.name).includes(q);
      const matchesFilter = filter === "all" || p.status === filter;
      return matchesQuery && matchesFilter;
    });
    if (sort === "status") return sortByStatus(list);
    if (sort === "name") {
      return [...list].sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
      );
    }
    if (sort === "recent") {
      return [...list].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      );
    }
    return [...list].sort(
      (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
    );
  }, [items, query, filter, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const s of PRODUCT_STATUSES) c[s] = 0;
    for (const p of items) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [items]);

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: counts.all },
    ...PRODUCT_STATUSES.map((s) => ({
      key: s,
      label: STATUS_META[s].short,
      count: counts[s] ?? 0,
    })),
  ];

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "new").length,
    [orders],
  );

  function openEdit(product: ProductDTO) {
    setError(null);
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      status: product.status,
      images:
        product.imageUrls?.length > 0
          ? product.imageUrls
          : product.imageUrl
            ? [product.imageUrl]
            : [],
      priceCents: product.priceCents,
      priceText: centsToText(product.priceCents),
      stock: product.stock,
    });
  }

  function priceLabel(p: ProductDTO): string {
    return p.priceCents > 0 ? formatMoney(p.priceCents) : "Consultar";
  }

  function renderStatusSelect(product: ProductDTO) {
    return (
      <select
        value={product.status}
        disabled={busyId === product.id}
        onChange={(e) =>
          changeStatus(product, e.target.value as ProductStatus)
        }
        aria-label="Estado del producto"
        className="h-7 cursor-pointer rounded-full border border-stone-200 bg-white/80 pl-3 pr-7 text-xs font-medium text-stone-600 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
      >
        {PRODUCT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].short}
          </option>
        ))}
      </select>
    );
  }

  function renderActions(product: ProductDTO) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openEdit(product)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          aria-label="Editar"
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          disabled={busyId === product.id}
          onClick={() => remove(product)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
          aria-label="Eliminar"
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
        </button>
      </div>
    );
  }

  async function api(path: string, init: RequestInit) {
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(data?.error ?? "Ocurrio un error inesperado");
    }
    return res;
  }

  async function changeStatus(product: ProductDTO, status: ProductStatus) {
    if (status === product.status) return;
    setError(null);
    setBusyId(product.id);
    try {
      const res = await api(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { product: ProductDTO };
      setItems((prev) =>
        prev.map((p) => (p.id === product.id ? data.product : p)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(product: ProductDTO) {
    if (
      !window.confirm(`¿Eliminar "${product.name}"? Esta accion es permanente.`)
    ) {
      return;
    }
    setError(null);
    setBusyId(product.id);
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  async function onFileChange(files: File[]) {
    if (files.length === 0 || !form) return;
    setError(null);
    const room = MAX_PRODUCT_IMAGES - form.images.length;
    if (room <= 0) {
      setError(`Maximo ${MAX_PRODUCT_IMAGES} imagenes por producto`);
      return;
    }
    const selected = files.slice(0, room);
    if (files.length > room) {
      setError(`Solo se agregaron ${room} (maximo ${MAX_PRODUCT_IMAGES} imagenes)`);
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);
        const res = await api("/api/upload", { method: "POST", body });
        const data = (await res.json()) as { url: string };
        uploaded.push(data.url);
      }
      setForm((prev) =>
        prev
          ? {
              ...prev,
              images: [...prev.images, ...uploaded].slice(0, MAX_PRODUCT_IMAGES),
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setForm((prev) =>
      prev ? { ...prev, images: prev.images.filter((u) => u !== url) } : prev,
    );
  }

  function makeCover(index: number) {
    setForm((prev) => {
      if (!prev || index <= 0) return prev;
      const images = [...prev.images];
      const [img] = images.splice(index, 1);
      images.unshift(img);
      return { ...prev, images };
    });
  }

  function moveImage(from: number, to: number) {
    if (from === to) return;
    setForm((prev) => {
      if (!prev) return prev;
      if (from < 0 || from >= prev.images.length) return prev;
      const target = Math.max(0, Math.min(to, prev.images.length - 1));
      const images = [...prev.images];
      const [img] = images.splice(from, 1);
      images.splice(target, 0, img);
      return { ...prev, images };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    const priceCents = textToCents(form.priceText);
    try {
      if (form.id) {
        const res = await api(`/api/products/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            description: form.description,
            status: form.status,
            imageUrls: form.images,
            priceCents,
            stock: form.stock,
          }),
        });
        const data = (await res.json()) as { product: ProductDTO };
        setItems((prev) =>
          prev.map((p) => (p.id === form.id ? data.product : p)),
        );
      } else {
        const res = await api("/api/products", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            description: form.description,
            status: form.status,
            imageUrls: form.images,
            priceCents,
            stock: form.stock,
          }),
        });
        const data = (await res.json()) as { product: ProductDTO };
        setItems((prev) => [data.product, ...prev]);
      }
      setForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleStudioApply(targetId: string, url: string) {
    setError(null);
    setStudioOpen(false);
    if (targetId === "new") {
      setForm((prev) => {
        const base = prev ?? { ...emptyForm };
        const images = [url, ...base.images.filter((u) => u !== url)].slice(
          0,
          MAX_PRODUCT_IMAGES,
        );
        return { ...base, images };
      });
      return;
    }
    try {
      const res = await api(`/api/products/${targetId}`, {
        method: "PATCH",
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = (await res.json()) as { product: ProductDTO };
      setItems((prev) =>
        prev.map((p) => (p.id === data.product.id ? data.product : p)),
      );
      setForm((prev) =>
        prev && prev.id === targetId
          ? { ...prev, images: data.product.imageUrls }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aplicar la imagen");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 shadow-sm">
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
                Administracion
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">Sesion: {username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              aria-label="Ver catalogo"
              title="Ver catalogo"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-3 py-2 text-sm font-medium text-stone-600 transition-all duration-300 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
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
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="hidden sm:inline">Ver catalogo</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesion"
              title="Cerrar sesion"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-3 py-2 text-sm font-medium text-stone-600 transition-all duration-300 hover:border-red-200 hover:text-red-600 sm:px-4 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <span className="hidden sm:inline">Cerrar sesion</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pt-5 sm:px-6">
        {(
          [
            {
              key: "products",
              label: "Productos",
              badge: 0,
              icon: (
                <>
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </>
              ),
            },
            {
              key: "orders",
              label: "Pedidos",
              badge: pendingOrders,
              icon: (
                <>
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                  <path d="M8 7h8" />
                  <path d="M8 11h8" />
                  <path d="M8 15h5" />
                </>
              ),
            },
            {
              key: "stats",
              label: "Resumen",
              badge: 0,
              icon: (
                <>
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </>
              ),
            },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300",
              tab === t.key
                ? "bg-brand-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
            ].join(" ")}
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
              {t.icon}
            </svg>
            {t.label}
            {t.badge > 0 && (
              <span
                className={[
                  "rounded-full px-1.5 text-xs",
                  tab === t.key
                    ? "bg-white/25 text-white"
                    : "bg-rose-500 text-white",
                ].join(" ")}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "products" ? (
          <>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
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
              className="w-full rounded-2xl border border-stone-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-800 outline-none backdrop-blur-md transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setStudioOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700 transition-all duration-300 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
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
                <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z" />
              </svg>
              Editor de imagen
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setForm({ ...emptyForm });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5v14" />
              </svg>
              Nuevo producto
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total", value: counts.all, dot: "bg-stone-400" },
            {
              label: STATUS_META.available.short,
              value: counts.available,
              dot: STATUS_META.available.dot,
            },
            {
              label: STATUS_META.low_stock.short,
              value: counts.low_stock,
              dot: STATUS_META.low_stock.dot,
            },
            {
              label: STATUS_META.coming_soon.short,
              value: counts.coming_soon,
              dot: STATUS_META.coming_soon.dot,
            },
            {
              label: STATUS_META.out_of_stock.short,
              value: counts.out_of_stock,
              dot: STATUS_META.out_of_stock.dot,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
            >
              <span
                className={["h-2.5 w-2.5 shrink-0 rounded-full", s.dot].join(" ")}
              />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-stone-800 dark:text-stone-100">
                  {s.value}
                </p>
                <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-300",
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar productos"
              className="h-10 cursor-pointer rounded-2xl border border-stone-200 bg-white/70 pl-3 pr-8 text-sm text-stone-600 shadow-sm outline-none backdrop-blur-md focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center text-sm text-stone-500 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400">
            No hay productos para mostrar.
          </div>
        ) : (
          <div className={GRID_CLASSES[view]}>
            {filtered.map((product) =>
              view === "list" ? (
                <article
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 p-2.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md dark:border-stone-800/70 dark:bg-stone-900/70"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                    <SeedImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {product.name}
                    </p>
                    <div className="mt-1">
                      <AvailabilityBadge status={product.status} size="sm" />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {priceLabel(product)}
                      <span className="ml-2 text-xs font-normal text-stone-400 dark:text-stone-500">
                        stock: {product.stock}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {renderStatusSelect(product)}
                    {renderActions(product)}
                  </div>
                </article>
              ) : view === "compact" ? (
                <article
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/70 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md dark:border-stone-800/70 dark:bg-stone-900/70"
                >
                  <div className="relative aspect-square w-full bg-stone-100 dark:bg-stone-800">
                    <SeedImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-contain"
                    />
                    <div className="absolute right-2 top-2">
                      <AvailabilityBadge status={product.status} size="sm" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h3 className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {product.name}
                    </h3>
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {priceLabel(product)}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-1">
                      {renderStatusSelect(product)}
                      {renderActions(product)}
                    </div>
                  </div>
                </article>
              ) : (
                <article
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg dark:border-stone-800/70 dark:bg-stone-900/70"
                >
                  <div className="relative aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800">
                    <SeedImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain"
                    />
                    <div className="absolute right-3 top-3">
                      <AvailabilityBadge status={product.status} />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <span className="self-start rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {product.category}
                    </span>
                    <h3 className="line-clamp-2 flex-1 text-base font-semibold text-stone-800 dark:text-stone-100">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
                      {priceLabel(product)}
                      <span className="ml-2 text-xs font-normal text-stone-400 dark:text-stone-500">
                        stock: {product.stock}
                      </span>
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      {renderStatusSelect(product)}
                      {renderActions(product)}
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
          </>
        ) : tab === "orders" ? (
          <AdminOrders orders={orders} onOrdersChange={setOrders} />
        ) : (
          <AdminStats
            orders={orders}
            expenses={expenses}
            onExpensesChange={setExpenses}
          />
        )}
      </main>

      {form && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />
          <div
            className="animate-scale-in relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/50 bg-white/85 p-6 shadow-2xl backdrop-blur-md sm:p-8 dark:border-stone-700/60 dark:bg-stone-900/90"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {form.id ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saving || uploading}
                aria-label="Cerrar"
                title="Cerrar"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 dark:hover:bg-stone-800 dark:hover:text-stone-200"
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
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={save} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Nombre del producto
                </label>
                <input
                  id="name"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Categoria
                </label>
                <input
                  id="category"
                  list="category-options"
                  maxLength={40}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Snacks, Tecnologia, Ropa..."
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                />
                <datalist id="category-options">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Descripcion (opcional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={300}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Detalles del producto (sabor, tamano, material...)"
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                    Imagenes
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {form.images.length}/{MAX_PRODUCT_IMAGES}
                  </span>
                </div>

                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {form.images.map((url, i) => (
                      <div
                        key={url}
                        draggable={!saving && !uploading}
                        onDragStart={(e) => {
                          setDragIndex(i);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(i));
                        }}
                        onDragOver={(e) => {
                          if (dragIndex === null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (overIndex !== i) setOverIndex(i);
                        }}
                        onDragLeave={() =>
                          setOverIndex((cur) => (cur === i ? null : cur))
                        }
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
                          if (!Number.isNaN(from)) moveImage(from, i);
                          setDragIndex(null);
                          setOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setOverIndex(null);
                        }}
                        className={`group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 transition-all duration-200 dark:border-stone-700 dark:bg-stone-800 ${
                          !saving && !uploading
                            ? "cursor-grab active:cursor-grabbing"
                            : ""
                        } ${dragIndex === i ? "opacity-40" : ""} ${
                          overIndex === i &&
                          dragIndex !== null &&
                          dragIndex !== i
                            ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-white dark:ring-offset-stone-900"
                            : ""
                        }`}
                        title="Arrastra para reordenar"
                      >
                        <SeedImage
                          src={url}
                          alt={`Imagen ${i + 1}`}
                          fill
                          sizes="120px"
                          className="pointer-events-none object-contain"
                        />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                            Portada
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="absolute right-1 top-1 text-stone-400/80 drop-shadow-sm dark:text-stone-300/80"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <circle cx="9" cy="6" r="1.4" />
                            <circle cx="15" cy="6" r="1.4" />
                            <circle cx="9" cy="12" r="1.4" />
                            <circle cx="15" cy="12" r="1.4" />
                            <circle cx="9" cy="18" r="1.4" />
                            <circle cx="15" cy="18" r="1.4" />
                          </svg>
                        </span>
                        <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                          {i > 0 ? (
                            <button
                              type="button"
                              disabled={saving || uploading}
                              onClick={() => makeCover(i)}
                              title="Usar como portada"
                              className="rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-stone-600 shadow-sm backdrop-blur-md transition-colors hover:text-brand-700 disabled:opacity-50 dark:bg-stone-800/85 dark:text-stone-300 dark:hover:text-brand-300"
                            >
                              Portada
                            </button>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            disabled={saving || uploading}
                            onClick={() => removeImage(url)}
                            aria-label={`Quitar imagen ${i + 1}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-stone-500 shadow-sm backdrop-blur-md transition-colors hover:text-red-600 disabled:opacity-50 dark:bg-stone-800/85 dark:text-stone-300 dark:hover:text-red-300"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            >
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={form.images.length >= MAX_PRODUCT_IMAGES}
                  onChange={(e) =>
                    onFileChange(Array.from(e.target.files ?? []))
                  }
                  className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50 dark:text-stone-400 dark:file:bg-brand-500/15 dark:file:text-brand-300 dark:hover:file:bg-brand-500/25"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {uploading ? (
                    <Loader label="Subiendo..." />
                  ) : (
                    `Puedes subir varias imagenes a la vez (hasta ${MAX_PRODUCT_IMAGES}). JPG, PNG o WEBP, maximo 3MB. La primera es la portada. Arrastra las imagenes para reordenarlas. Tambien puedes pegar (Ctrl+V).`
                  )}
                </p>
                {form.images.length > 0 && (
                  <button
                    type="button"
                    disabled={saving || uploading}
                    onClick={() => setStudioOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-all duration-300 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z" />
                    </svg>
                    Quitar fondo (portada)
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Estado
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_STATUSES.map((s) => {
                    const active = form.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, status: s })}
                        aria-pressed={active}
                        className={[
                          "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all duration-300",
                          active
                            ? "border-brand-400 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-300"
                            : "border-stone-200 bg-white/60 text-stone-600 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            STATUS_META[s].dot,
                          ].join(" ")}
                        />
                        {STATUS_META[s].short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Precio (USD)
                  </label>
                  <input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={form.priceText}
                    onChange={(e) =>
                      setForm({ ...form, priceText: e.target.value })
                    }
                    onBlur={() => {
                      const cents = textToCents(form.priceText);
                      setForm({ ...form, priceText: centsToText(cents) });
                    }}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="stock"
                    className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Stock (unidades)
                  </label>
                  <input
                    id="stock"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                    placeholder="0"
                    className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Con precio en 0 o sin stock el producto se muestra como consulta
                y no se puede agregar al carrito.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  disabled={saving || uploading}
                  className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading || form.images.length === 0}
                  className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader label="Guardando..." className="w-full justify-center" />
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageStudio
        open={studioOpen}
        targets={items.map((p) => ({ id: p.id, name: p.name }))}
        initialTargetId={form?.id ?? "new"}
        onClose={() => setStudioOpen(false)}
        onApply={handleStudioApply}
      />
    </div>
  );
}
