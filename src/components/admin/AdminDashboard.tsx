"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import { PRODUCT_STATUSES, STATUS_META } from "@/lib/product-status";
import type { ProductStatus } from "@/lib/product-status";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import ThemeToggle from "@/components/ThemeToggle";
import Loader from "@/components/Loader";
import SeedImage from "@/components/SeedImage";
import ImageStudio from "./ImageStudio";

interface Props {
  initialProducts: ProductDTO[];
  username: string;
}

interface FormState {
  id?: string;
  name: string;
  status: ProductStatus;
  imageUrl: string;
}

const emptyForm: FormState = {
  name: "",
  status: "available",
  imageUrl: "",
};

export default function AdminDashboard({ initialProducts, username }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ProductDTO[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const onFileChangeRef = useRef(onFileChange);

  useEffect(() => {
    onFileChangeRef.current = onFileChange;
  });

  useEffect(() => {
    if (!form) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) onFileChangeRef.current(file);
          return;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [Boolean(form)]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, query]);

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

  async function onFileChange(file: File | undefined) {
    if (!file || !form) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await api("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url: string };
      setForm((prev) => (prev ? { ...prev, imageUrl: data.url } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      if (form.id) {
        const res = await api(`/api/products/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            status: form.status,
            imageUrl: form.imageUrl,
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
            status: form.status,
            imageUrl: form.imageUrl,
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
      setForm((prev) =>
        prev ? { ...prev, imageUrl: url } : { ...emptyForm, imageUrl: url },
      );
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
          ? { ...prev, imageUrl: url }
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
                Administracion
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">Sesion: {username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="/"
              className="hidden rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 transition-all duration-300 hover:border-brand-200 hover:text-brand-700 sm:inline-flex dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              Ver catalogo
            </a>
            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 transition-all duration-300 hover:border-red-200 hover:text-red-600 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
              placeholder="Buscar semilla..."
              aria-label="Buscar semilla"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
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
                  <h3 className="line-clamp-2 flex-1 text-base font-semibold text-stone-800 dark:text-stone-100">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between gap-2">
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

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setForm({
                            id: product.id,
                            name: product.name,
                            status: product.status,
                            imageUrl: product.imageUrl,
                          });
                        }}
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
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {form && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && !uploading && setForm(null)}
        >
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-in relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/50 bg-white/85 p-6 shadow-2xl backdrop-blur-md sm:p-8 dark:border-stone-700/60 dark:bg-stone-900/90"
          >
            <h2 className="mb-6 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {form.id ? "Editar producto" : "Nuevo producto"}
            </h2>

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
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Imagen
                </span>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800">
                    {form.imageUrl ? (
                      <SeedImage
                        src={form.imageUrl}
                        alt="Vista previa"
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-stone-400 dark:text-stone-500">
                        Sin imagen
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        onFileChange(e.target.files?.[0] ?? undefined)
                      }
                      className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:text-stone-400 dark:file:bg-brand-500/15 dark:file:text-brand-300 dark:hover:file:bg-brand-500/25"
                    />
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {uploading ? (
                        <Loader label="Subiendo..." />
                      ) : (
                        "JPG, PNG o WEBP. Maximo 3MB. Tambien puedes pegar una imagen (Ctrl+V)."
                      )}
                    </p>
                    {form.imageUrl && (
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
                        Quitar fondo
                      </button>
                    )}
                  </div>
                </div>
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
                  disabled={saving || uploading || !form.imageUrl}
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
