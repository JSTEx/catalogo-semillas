"use client";

import { useEffect, useState } from "react";

interface Props {
  label?: string;
}

export default function OverlayLoader({ label = "Cargando" }: Props) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 18_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/95 px-6 text-center backdrop-blur-sm dark:bg-stone-950/95"
    >
      {timedOut ? (
        <div className="max-w-sm">
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
            La carga está tardando más de lo esperado
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Puede haber un problema temporal de conexión. Intenta cargar de nuevo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="h-9 w-9 animate-spin-slow rounded-full border-2 border-stone-300 border-t-brand-600 dark:border-stone-600 dark:border-t-brand-400"
        />
      )}
    </div>
  );
}
