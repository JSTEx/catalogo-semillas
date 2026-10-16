"use client";

import { useEffect, useRef, useState } from "react";
import Loader from "@/components/Loader";
import SeedImage from "@/components/SeedImage";

export interface StudioTarget {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  targets: StudioTarget[];
  initialTargetId?: string;
  onClose: () => void;
  onApply: (targetId: string, url: string) => Promise<void>;
}

type Busy = "upload" | "remove" | null;

export default function ImageStudio({
  open,
  targets,
  initialTargetId = "new",
  onClose,
  onApply,
}: Props) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState(initialTargetId);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSourceUrl(null);
    setResultUrl(null);
    setBusy(null);
    setError(null);
    setTargetId(initialTargetId);
  }, [open, initialTargetId]);

  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void uploadFile(file);
          return;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open]);

  async function uploadFile(file: File) {
    setError(null);
    setBusy("upload");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Error al subir la imagen");
      }
      const data = (await res.json()) as { url: string };
      setSourceUrl(data.url);
      setResultUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeBackgroundFromImage() {
    if (!sourceUrl) return;
    setError(null);
    setBusy("remove");
    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "No se pudo eliminar el fondo de la imagen",
        );
      }
      const data = (await res.json()) as { url: string };
      setResultUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al quitar el fondo");
    } finally {
      setBusy(null);
    }
  }

  const targetName =
    targets.find((t) => t.id === targetId)?.name ??
    (targetId === "new" ? "nuevo producto" : "producto seleccionado");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor de imagen"
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60" />

      <div
        className="animate-scale-in relative z-10 max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/50 bg-white/85 p-6 shadow-2xl backdrop-blur-md sm:p-8 dark:border-stone-700/60 dark:bg-stone-900/90"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Editor de imagen
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Carga una imagen, quitala el fondo y asignala a un producto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100"
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
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Imagen original
            </p>
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800">
              {sourceUrl ? (
                <SeedImage
                  src={sourceUrl}
                  alt="Imagen original"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-stone-300 dark:text-stone-600"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Sin imagen aun. Sube un archivo o pega desde el
                    portapapeles (Ctrl+V).
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
              }}
              className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:text-stone-400 dark:file:bg-brand-500/15 dark:file:text-brand-300 dark:hover:file:bg-brand-500/25"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Con fondo eliminado
            </p>
            <div className="bg-checkers relative aspect-square w-full overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
              {resultUrl ? (
                <SeedImage
                  src={resultUrl}
                  alt="Imagen sin fondo"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-stone-400 dark:text-stone-500">
                  {busy === "remove" ? (
                    <Loader label="Quitando el fondo..." />
                  ) : (
                    "El resultado aparecera aqui con transparencia."
                  )}
                </div>
              )}
            </div>
            {busy === "remove" && (
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Puede tomar unos segundos la primera vez.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4 border-t border-stone-200/80 pt-5 dark:border-stone-800/80">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="studio-target"
                className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Asignar a
              </label>
              <select
                id="studio-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={busy !== null}
                className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
              >
                <option value="new">+ Nuevo producto (formulario)</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void removeBackgroundFromImage()}
                disabled={!sourceUrl || busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 font-semibold text-brand-700 transition-all duration-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
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
                  <path d="M12 3v10" />
                  <path d="m7 8 5-5 5 5" />
                  <path d="M5 17l0 2M5 21l0 0M19 17l0 2M19 21l0 0" />
                </svg>
                {busy === "remove" ? "Procesando..." : "Quitar fondo"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (resultUrl) void onApply(targetId, resultUrl);
                }}
                disabled={!resultUrl || busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
                  <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Aplicar a {targetName}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}